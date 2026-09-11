// ──────────────────────────────────────────────────────────────
//  Aplica la renumeración de las mesas del salón.
//
//    node supabase/scripts/renumerar-mesas.mjs            # ensayo en seco
//    node supabase/scripts/renumerar-mesas.mjs --aplicar  # escribe
//
//  El camino corriente para renumerar es el panel: /admin/mesas → «Renumerar».
//  Esto es el mismo cambio que el PASO 2 de renumerar-mesas.sql, para un
//  cambio masivo preparado de antemano o para cuando no hay panel ni password
//  a mano: acá alcanza con la service key del .env. El mapeo NO se copia —se
//  lee de ese .sql—, así que sigue habiendo un solo sitio donde editarlo.
//
//  Renumerar NO mueve ninguna mesa de sitio: desde la 007 el sitio vive en
//  `fila`/`col` y se arrastra en el plano del panel.
//
//  Actualiza cada mesa por su `id`, así que el problema de los ciclos (6→2
//  y 2→6 a la vez) no se plantea: ninguna fila se busca por el nombre que
//  otra acaba de cambiar. Por eso acá no hace falta el UPDATE único.
//
//  Nadie se levanta de su silla: `asientos` apunta a `mesas.id` y
//  `capitan_id` a `guest_members`. Cambian la etiqueta y el orden, nada más.
// ──────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const SQL      = 'supabase/scripts/renumerar-mesas.sql'
const RESPALDO = resolve('entrega/renumeracion')
const aplicar  = process.argv.includes('--aplicar')

// ─── El mapeo y el plano, leídos del .sql ───
const sql = await readFile(SQL, 'utf8')

// El bloque del PASO 2, hasta su `;`: el comentario que va después menciona
// números que no son pares del mapeo.
const bloque = sql.slice(sql.indexOf('INSERT INTO renumeracion'))
const mapeo = new Map([...bloque.slice(0, bloque.indexOf(';')).matchAll(/\(\s*(\d+)\s*,\s*(\d+)\s*\)/g)]
  .map(m => [Number(m[1]), Number(m[2])]))
if (!mapeo.size) { console.error(`✗ No encontré el mapeo en ${SQL}`); process.exit(1) }

// El sitio de cada mesa sale de la vista (007), no de una copia del plano: se
// enseña en el reporte para poder mirar el salón mientras se renumera, pero el
// cambio no lo toca. Vacío = esa mesa todavía no está puesta en el plano.
const sitio = m => (m.fila && m.col) ? `h${m.fila}c${m.col}` : '—'

// ─── La base ───
if (!existsSync('.env')) { console.error('✗ No hay .env con las credenciales de Supabase'); process.exit(1) }
const env = await readFile('.env', 'utf8')
const g = k => (env.match(new RegExp(`^${k}=(.+)$`, 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '')
const key = g('SUPABASE_SERVICE_ROLE_KEY')
if (!g('VITE_SUPABASE_URL') || !key) { console.error('✗ Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env'); process.exit(1) }
const db = createClient(g('VITE_SUPABASE_URL'), key, { auth: { persistSession: false } })

const numeroDe    = s => { const x = /^\s*Mesa\s+(\d+)\s*$/.exec(s || ''); return x ? Number(x[1]) : null }
const esPrincipal = s => /^\s*Mesa\s+principal\s*$/i.test(s || '')

// El cliente de Supabase deja handles vivos y `process.exit()` con uno abierto
// dispara una aserción de libuv en Windows. De acá en adelante se sale
// devolviendo de main() y marcando `exitCode`, nunca cortando el proceso.
await main()

async function main() {
  const { data: mesas, error } = await db.from('mesa_summary').select('*').order('orden')
  if (error) { console.error('✗ No pude leer mesa_summary:', error.message); process.exitCode = 1; return }

  // ─── Verificaciones (las mismas del PASO 2) ───
  const hoy = new Set(mesas.map(m => numeroDe(m.nombre)).filter(n => n !== null))
  const graves = [], notas = []
  const faltan = [...mapeo.keys()].filter(n => !hoy.has(n))
  if (faltan.length) graves.push(`No existe ninguna «Mesa N» con estos números: ${faltan.join(', ')}`)
  // Un destino sobre una mesa que NO se mueve dejaría dos mesas con el mismo
  // nombre, y el plano —que saca la posición del nombre— las pinta encima.
  const choca = [...mapeo].filter(([, n]) => hoy.has(n) && !mapeo.has(n))
  if (choca.length) graves.push(`El destino ya lo ocupa una mesa que no se mueve (${choca.map(([v, n]) => `${v}→${n}`).join(', ')}). Agregala al mapeo.`)
  const destinos = [...mapeo.values()]
  if (new Set(destinos).size !== destinos.length) graves.push('Hay dos mesas mandadas al mismo número')
  const fuera = [...hoy].filter(n => !mapeo.has(n))
  if (fuera.length) notas.push(`Mesa ${fuera.join(', ')} está numerada y fuera del mapeo: se queda donde está`)

  if (graves.length) { for (const a of graves) console.error('  ✗', a); process.exitCode = 1; return }

  // ─── Qué queda ───
  const destino = m => {
    const n = numeroDe(m.nombre)
    // La principal no lleva número y va primera. Sin el 0 explícito empata con
    // la Mesa 1, y el desempate por nombre la deja segunda.
    if (n === null) return { nombre: m.nombre, orden: esPrincipal(m.nombre) ? 0 : m.orden }
    const nuevo = mapeo.get(n) ?? n   // fuera del mapeo se queda igual, pero se corrige `orden`
    return { nombre: `Mesa ${nuevo}`, orden: nuevo }
  }

  console.log(`\n  ${aplicar ? 'Renumerando' : 'Ensayo en seco'} · ${mesas.length} mesas · ${mapeo.size} pares en el mapeo\n`)
  console.log('  hoy              →  queda            sitio   orden    cap  ocup   capitán')
  console.log('  ' + '─'.repeat(94))
  const cambios = []
  for (const m of [...mesas].sort((a, b) => (numeroDe(a.nombre) ?? -1) - (numeroDe(b.nombre) ?? -1))) {
    const d = destino(m)
    if (d.nombre !== m.nombre || d.orden !== m.orden) cambios.push({ m, d })
    const exceso = m.ocupados > m.capacidad ? ` ⚠+${m.ocupados - m.capacidad}` : ''
    console.log(
      '  ' + String(m.nombre).padEnd(16),
      '→ ' + String(d.nombre).padEnd(16),
      sitio(m).padEnd(7),
      String(`${m.orden}→${d.orden}`).padEnd(8),
      String(m.capacidad).padStart(3),
      String(m.ocupados).padStart(5) + exceso.padEnd(4),
      ' ' + (m.capitan ?? '— sin capitán —'))
  }
  for (const n of notas) console.log('\n  ·', n)

  if (!cambios.length) return console.log('\n  ✓ Ya está todo en su sitio: no hay nada que cambiar.\n')

  if (!aplicar)
    return console.log(`\n  ${cambios.length} mesa(s) se mueven. Para escribirlo:  node supabase/scripts/renumerar-mesas.mjs --aplicar\n`)

  // ─── El cambio ───
  // El respaldo se escribe ANTES de tocar nada: con él se vuelve atrás. Va a
  // entrega/, que está gitignoreada, porque lleva el reparto real.
  await mkdir(RESPALDO, { recursive: true })
  const sello = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const archivo = resolve(RESPALDO, `antes-${sello}.json`)
  await writeFile(archivo, JSON.stringify(mesas.map(({ id, nombre, orden }) => ({ id, nombre, orden })), null, 2))
  console.log(`\n  Respaldo del estado anterior → ${archivo}`)

  for (const { m, d } of cambios) {
    const { error } = await db.from('mesas').update({ nombre: d.nombre, orden: d.orden }).eq('id', m.id)
    if (error) { console.error(`  ✗ ${m.nombre}: ${error.message}`); process.exitCode = 1; return }
    console.log(`  ✓ ${m.nombre} → ${d.nombre} (orden ${d.orden})`)
  }

  // ─── El reporte ───
  const { data: fin } = await db.from('mesa_summary').select('*').order('orden')
  console.log('\n  Como quedó el salón:\n')
  console.log('  orden  mesa             sitio   cap  ocup   capitán')
  console.log('  ' + '─'.repeat(78))
  for (const m of fin)
    console.log(
      '  ' + String(m.orden).padStart(5),
      ' ' + String(m.nombre).padEnd(16),
      sitio(m).padEnd(7),
      String(m.capacidad).padStart(3),
      String(m.ocupados).padStart(5) + (m.ocupados > m.capacidad ? ` ⚠+${m.ocupados - m.capacidad}` : ''),
      ' ' + (m.capitan ?? '— sin capitán —'))

  // Lo que hay que mirar antes de mandar a imprimir. Mismos avisos que el PASO 3.c.
  const pendientes = []
  for (const m of fin.filter((m, k) => fin.findIndex(x => x.nombre === m.nombre) !== k))
    pendientes.push(`Nombre repetido: «${m.nombre}» — el plano las pinta encima`)
  const nums = fin.map(m => numeroDe(m.nombre)).filter(n => n !== null)
  for (let n = 1; n <= Math.max(0, ...nums); n++)
    if (!nums.includes(n)) pendientes.push(`No existe la Mesa ${n}: el plano va a enseñar el hueco`)
  for (const m of fin) {
    if (m.ocupados > m.capacidad) pendientes.push(`«${m.nombre}» pasada de capacidad: ${m.ocupados} sentados en ${m.capacidad} puestos`)
    if (!m.capitan_id && m.ocupados > 0) pendientes.push(`«${m.nombre}» tiene ${m.ocupados} sentados y sigue sin capitán`)
  }
  console.log(pendientes.length ? '\n  Avisos:' : '\n  ✓ Sin avisos.')
  for (const p of pendientes) console.log('   ·', p)
  console.log('\n  Ahora hay que regenerar lo que se lleva al salón:  npm run export-todo\n')
}
