// ──────────────────────────────────────────────────────────────
//  Importa la lista de invitados de un cliente (Excel) a un evento.
//
//  Uso:
//    node scripts/importar-invitados.mjs --evento=xv-mauren --archivo="XV MAUREN/INVITADOS XV.xlsx"
//    node scripts/importar-invitados.mjs --evento=xv-mauren --archivo="..." --aplicar
//    node scripts/importar-invitados.mjs --evento=xv-mauren --archivo="..." --aplicar --reemplazar
//
//  Sin --aplicar NO toca la base: solo imprime el resumen (dry-run).
//  Con --aplicar inserta todo en una transacción. Si el evento ya tiene
//  tarjetas, aborta salvo que se pase --reemplazar (que las borra antes).
//
//  Para otro evento o otro Excel, cambia BLOQUES (o pásale otro --archivo).
//  Credenciales: las mismas que run-migration.mjs (.env.secrets +
//  supabase/.temp/pooler-url). Solo hacen falta con --aplicar.
// ──────────────────────────────────────────────────────────────
import ExcelJS from 'exceljs'
import pg from 'pg'
import { nanoid } from 'nanoid'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { normalizarNombre } from '../src/admin/nombres.js'

// ─── Mapeo del Excel → tipos de invitación ───
// id: columna del número de fila (solo informativo) · col: nombre de la tarjeta
// cupos: número de personas · tipo: key de events.invitation_types
// Ojo: en «INVITADOS XV.xlsx» el número va en A/H, el nombre en B/I y los cupos en C/J.
const BLOQUES = [
  { id: 'A', col: 'B', cupos: 'C', tipo: 'adultos' },
  { id: 'H', col: 'I', cupos: 'J', tipo: 'jovenes' },
]
const HOJA = 'Hoja1'
const FILA_INICIO = 2 // fila 1 = cabeceras

// ─── Argumentos ───
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)
const EVENTO = args.evento
const ARCHIVO = args.archivo
const APLICAR = args.aplicar === true
const REEMPLAZAR = args.reemplazar === true

if (!EVENTO || !ARCHIVO || EVENTO === true || ARCHIVO === true) {
  console.error('Uso: node scripts/importar-invitados.mjs --evento=<slug> --archivo="<ruta.xlsx>" [--aplicar] [--reemplazar]')
  process.exit(1)
}

// ─── Lectura de celdas ───
// Las fórmulas llegan como { formula, result }; los textos enriquecidos como { richText }.
function textoDe(v) {
  if (v == null) return ''
  if (typeof v === 'object') {
    if ('result' in v) return textoDe(v.result)
    if ('richText' in v) return v.richText.map((t) => t.text).join('')
    if ('text' in v) return String(v.text)
    if (v instanceof Date) return ''
  }
  return String(v)
}

// Cupos: número o texto con espacios («  3 », «2 »). Devuelve entero > 0 o null.
function cuposDe(v) {
  const raw = (typeof v === 'object' && v && 'result' in v) ? v.result : v
  if (typeof raw === 'number') return Number.isInteger(raw) && raw > 0 ? raw : null
  const s = textoDe(raw).replace(/\s+/g, '')
  if (!/^\d+$/.test(s)) return null
  const n = Number(s)
  return n > 0 ? n : null
}

// Nombre de la tarjeta a formato legible: «FAMILIA OBANDO» → «Familia Obando».
const nombreDe = (v) => normalizarNombre(textoDe(v).trim())

// ─── Leer el Excel ───
async function leer(archivo) {
  if (!existsSync(archivo)) throw new Error(`No existe el archivo: ${archivo}`)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(archivo)
  const ws = wb.getWorksheet(HOJA)
  if (!ws) throw new Error(`El libro no tiene la hoja "${HOJA}"`)

  const bloques = []
  for (const b of BLOQUES) {
    const filas = []
    const invalidas = []
    for (let r = FILA_INICIO; ; r++) {
      const nombre = nombreDe(ws.getCell(`${b.col}${r}`).value)
      if (!nombre) break // un bloque termina en la primera fila sin nombre
      const cupos = cuposDe(ws.getCell(`${b.cupos}${r}`).value)
      const id = textoDe(ws.getCell(`${b.id}${r}`).value).trim()
      if (cupos == null) invalidas.push({ fila: r, valor: textoDe(ws.getCell(`${b.cupos}${r}`).value) })
      filas.push({ fila: r, id, nombre, cupos, tipo: b.tipo })
    }
    bloques.push({ ...b, filas, invalidas })
  }
  return bloques
}

// ─── Resumen (dry-run y antes de aplicar) ───
function resumen(bloques) {
  let tarjetas = 0
  let cupos = 0
  console.log(`\nArchivo: ${ARCHIVO} · hoja ${HOJA}`)
  for (const b of bloques) {
    const ok = b.filas.filter((f) => f.cupos != null)
    const sum = ok.reduce((s, f) => s + f.cupos, 0)
    tarjetas += b.filas.length
    cupos += sum
    console.log(`\nBloque «${b.tipo}» (columnas ${b.col}/${b.cupos})`)
    console.log(`  tarjetas: ${b.filas.length} · cupos: ${sum}`)
    if (b.invalidas.length) {
      console.log(`  ⚠ ${b.invalidas.length} fila(s) con cupos no válidos:`)
      for (const x of b.invalidas) console.log(`    fila ${x.fila}: valor «${x.valor}»`)
    }
    console.log('  primeras 3 filas (sin nombres):')
    for (const f of b.filas.slice(0, 3)) {
      console.log(`    fila ${f.fila} · id ${f.id || '-'} · cupos ${f.cupos ?? '?'}`)
    }
  }
  console.log(`\nTOTAL: ${tarjetas} tarjetas · ${cupos} cupos`)
  return { tarjetas, cupos }
}

// ─── Conexión (igual que run-migration.mjs) ───
async function conectar() {
  if (!existsSync('.env.secrets') || !existsSync('supabase/.temp/pooler-url')) {
    throw new Error('Faltan .env.secrets (SUPABASE_DB_PASSWORD) o supabase/.temp/pooler-url. Sin ellos no se puede --aplicar.')
  }
  const secrets = await readFile('.env.secrets', 'utf8')
  const password = secrets.match(/SUPABASE_DB_PASSWORD=(.+)/)?.[1].trim()
  if (!password) throw new Error('.env.secrets no tiene SUPABASE_DB_PASSWORD')
  const u = new URL((await readFile('supabase/.temp/pooler-url', 'utf8')).trim())
  const client = new pg.Client({
    host: u.hostname,
    port: Number(u.port),
    user: decodeURIComponent(u.username),
    password,
    database: u.pathname.replace(/^\//, '') || 'postgres',
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  return client
}

// ─── Aplicar en una sola transacción ───
async function aplicar(bloques) {
  const filas = bloques.flatMap((b) => b.filas.map((f) => ({ ...f })))
  const malas = filas.filter((f) => f.cupos == null)
  if (malas.length) throw new Error(`Hay ${malas.length} fila(s) con cupos no válidos; corrígelas en el Excel antes de aplicar.`)

  const client = await conectar()
  try {
    await client.query('BEGIN')

    const ev = await client.query('SELECT id, titulo, invitation_types FROM events WHERE slug = $1', [EVENTO])
    if (!ev.rows.length) throw new Error(`No existe el evento «${EVENTO}». Créalo primero (migración 008 o el panel).`)
    const { id: eventId, titulo, invitation_types: tipos } = ev.rows[0]
    const keys = tipos.map((t) => t.key)
    for (const b of bloques) {
      if (!keys.includes(b.tipo)) throw new Error(`El evento no tiene el tipo «${b.tipo}» (tiene: ${keys.join(', ')}).`)
    }

    const { rows: [{ n }] } = await client.query('SELECT count(*)::int AS n FROM guests WHERE event_id = $1', [eventId])
    if (n > 0) {
      if (!REEMPLAZAR) throw new Error(`El evento «${EVENTO}» ya tiene ${n} tarjetas. Usa --reemplazar para borrarlas y recargar.`)
      console.warn(`\n⚠ --reemplazar: se BORRARÁN ${n} tarjetas de «${titulo}» (con sus miembros, confirmaciones, mesas y vistas).`)
      await client.query('DELETE FROM guests WHERE event_id = $1', [eventId])
    }

    let cupos = 0
    for (const f of filas) {
      const { rows: [g] } = await client.query(
        'INSERT INTO guests (event_id, token, name, invitation_type, notes) VALUES ($1, $2, $3, $4, NULL) RETURNING id',
        [eventId, nanoid(22), f.nombre, f.tipo]
      )
      // El Excel no trae nombres de las personas: cada cupo queda como «Invitado N»,
      // que nombres.js marca como genérico para completar a mano.
      for (let i = 1; i <= f.cupos; i++) {
        await client.query(
          'INSERT INTO guest_members (guest_id, name, order_num) VALUES ($1, $2, $3)',
          [g.id, `Invitado ${i}`, i]
        )
      }
      cupos += f.cupos
    }

    await client.query('COMMIT')
    console.log(`\n✓ Importadas ${filas.length} tarjetas y ${cupos} cupos en «${titulo}» (${EVENTO}).`)
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    await client.end()
  }
}

// ─── --sql: lo mismo que --aplicar, como SQL para pegar en el SQL Editor ───
// Para cuando no hay .env.secrets en la máquina. Mismas guardas que aplicar():
// el bloque DO aborta entero si el evento no existe, si un tipo no vale o si
// el evento ya tiene tarjetas. El archivo lleva nombres reales: no va al repo.
async function escribirSql(bloques, ruta) {
  const filas = bloques.flatMap((b) => b.filas)
  if (filas.some((f) => f.cupos == null)) throw new Error('Hay filas con cupos no válidos; corrígelas en el Excel.')
  const q = (s) => `'${String(s).replace(/'/g, "''")}'`
  const tipos = [...new Set(bloques.map((b) => b.tipo))]
  const inserts = filas.map((f) =>
    `  INSERT INTO guests (event_id, token, name, invitation_type) VALUES (ev, ${q(nanoid(22))}, ${q(f.nombre)}, ${q(f.tipo)}) RETURNING id INTO g;\n` +
    `  INSERT INTO guest_members (guest_id, name, order_num) SELECT g, 'Invitado ' || i, i FROM generate_series(1, ${f.cupos}) i;`
  ).join('\n')
  const sql = `-- Importación de invitados · evento ${EVENTO} · ${filas.length} tarjetas
DO $$
DECLARE ev UUID; g UUID;
BEGIN
  SELECT id INTO ev FROM events WHERE slug = ${q(EVENTO)};
  IF ev IS NULL THEN RAISE EXCEPTION 'No existe el evento ${EVENTO}'; END IF;
  IF EXISTS (SELECT 1 FROM guests WHERE event_id = ev) THEN
    RAISE EXCEPTION 'El evento ${EVENTO} ya tiene tarjetas; no se importa dos veces';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY[${tipos.map(q).join(', ')}]) t
             WHERE t NOT IN (SELECT x->>'key' FROM events e, jsonb_array_elements(e.invitation_types) x WHERE e.id = ev)) THEN
    RAISE EXCEPTION 'Algún tipo de invitación no existe en el evento';
  END IF;
${inserts}
END $$;
`
  const { writeFile } = await import('node:fs/promises')
  await writeFile(ruta, sql, 'utf8')
  console.log(`\n✓ SQL escrito en ${ruta} — pégalo en el SQL Editor de Supabase.`)
}

// ─── Main ───
try {
  const bloques = await leer(ARCHIVO)
  resumen(bloques)
  if (typeof args.sql === 'string') {
    await escribirSql(bloques, args.sql)
  } else if (!APLICAR) {
    console.log('\n(dry-run: no se ha escrito nada. Añade --aplicar para insertar.)')
  } else {
    await aplicar(bloques)
  }
} catch (e) {
  console.error(`\n✗ ${e.message}`)
  process.exitCode = 1
}
