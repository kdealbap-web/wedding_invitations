/**
 * Export de invitados, cupos y mesas a Excel — desde la línea de comandos.
 *
 *   npm run export                 # lee de Supabase (necesita .env)
 *   npm run export -- --demo       # datos de ejemplo, para ver el formato sin base
 *
 * El libro lo arma `src/admin/excel.js`, EL MISMO que usa el botón «Exportar
 * Excel» del panel. Este script solo trae los datos y escribe el archivo: así
 * el Excel que baja Angely desde el navegador y el que sale por consola son
 * idénticos, y no hay dos formatos que mantener.
 *
 * Salida: entrega/invitados/
 */
import ExcelJS from 'exceljs'
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { construirLibro } from '../src/admin/excel.js'
import { ESTADOS, estadoOf } from '../src/admin/cupos.js'

const DEMO = process.argv.includes('--demo')
const SALIDA = resolve('entrega/invitados')
const LBL = Object.fromEntries(Object.entries(ESTADOS).map(([k, v]) => [k, v.lbl]))

// ─── Credenciales ───
async function env() {
  if (!existsSync('.env')) throw new Error(
    'No hay .env. Créalo con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY,\n' +
    '  o prueba el formato con:  npm run export -- --demo')
  const txt = await readFile('.env', 'utf8')
  const get = k => (txt.match(new RegExp(`^${k}=(.+)$`, 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '')
  const url = get('VITE_SUPABASE_URL')
  const key = get('SUPABASE_SERVICE_ROLE_KEY') || get('VITE_SUPABASE_ANON_KEY')
  if (!url || !key) throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
  return { url, key }
}

async function traerDeSupabase() {
  const { url, key } = await env()
  const sb = createClient(url, key)
  const [g, m, ms, as] = await Promise.all([
    sb.from('guest_summary').select('*'),
    sb.from('guest_members').select('id, guest_id, name, order_num'),
    sb.from('mesas').select('*').order('orden'),
    sb.from('asientos').select('*'),
  ])
  if (g.error) throw new Error(`guest_summary: ${g.error.message}`)
  if (m.error) throw new Error(`guest_members: ${m.error.message}`)
  const conMesas = !ms.error && !as.error
  if (!conMesas) console.warn('  (sin tablas de mesas — exporto solo invitados)\n')
  return {
    rows: (g.data || []).slice().sort((a, b) => (a.group_name || '').localeCompare(b.group_name || '', 'es')),
    miembros: m.data || [],
    mesas: conMesas ? (ms.data || []) : [],
    asientos: conMesas ? (as.data || []) : [],
  }
}

function datosDemo() {
  return {
    rows: [
      { id: 'a', group_name: 'Familia Rodríguez Trujillo', invitation_type: 'completa',  whatsapp: '573001112233', attending: true,  confirmation_source: 'admin', attending_count: 4, total_members: 4, contact_status: 'contactado',  view_count: 3 },
      { id: 'b', group_name: 'Familia Gravini Ferrer',     invitation_type: 'completa',  whatsapp: '573002223344', attending: true,  confirmation_source: 'guest', attending_count: 0, total_members: 3, contact_status: 'pendiente',   view_count: 2 },
      { id: 'c', group_name: 'Carlos De Alba',             invitation_type: 'recepcion', whatsapp: '573003334455', attending: null,  confirmation_source: null,    attending_count: 0, total_members: 2, contact_status: 'no_contesta', view_count: 1 },
      { id: 'd', group_name: 'Marta Pérez',                invitation_type: 'recepcion', whatsapp: '573004445566', attending: false, confirmation_source: 'admin', attending_count: 0, total_members: 2, contact_status: 'contactado',  view_count: 1 },
      { id: 'e', group_name: 'Tíos de Barranquilla',       invitation_type: 'completa',  whatsapp: '573005556677', attending: null,  confirmation_source: null,    attending_count: 0, total_members: 0, contact_status: 'pendiente',   view_count: 0 },
    ],
    miembros: [
      { id: 'a1', guest_id: 'a', name: 'Estela Marys Rodríguez', order_num: 1 },
      { id: 'a2', guest_id: 'a', name: 'Gerson Antonio Gravini', order_num: 2 },
      { id: 'a3', guest_id: 'a', name: 'Laura Gravini',          order_num: 3 },
      { id: 'a4', guest_id: 'a', name: 'Samuel Gravini',         order_num: 4 },
      { id: 'b1', guest_id: 'b', name: 'Rosa Ferrer',            order_num: 1 },
      { id: 'b2', guest_id: 'b', name: 'Luis Gravini',           order_num: 2 },
      { id: 'b3', guest_id: 'b', name: 'Ana Gravini',            order_num: 3 },
      { id: 'c1', guest_id: 'c', name: 'Carlos De Alba',         order_num: 1 },
      { id: 'c2', guest_id: 'c', name: 'Invitado de Carlos',     order_num: 2 },
      { id: 'd1', guest_id: 'd', name: 'Marta Pérez',            order_num: 1 },
      { id: 'd2', guest_id: 'd', name: 'Acompañante',            order_num: 2 },
    ],
    mesas: [
      { id: 'm1', nombre: 'Mesa principal', capacidad: 8, orden: 1 },
      { id: 'm2', nombre: 'Mesa 2',         capacidad: 8, orden: 2 },
    ],
    asientos: [
      { id: 's1', mesa_id: 'm1', guest_id: 'a', member_id: 'a1', etiqueta: null, orden: 0 },
      { id: 's2', mesa_id: 'm1', guest_id: 'a', member_id: 'a2', etiqueta: null, orden: 0 },
    ],
  }
}

// CSV plano, con los valores tal cual y sin fórmulas: para quien no abra Excel
const csv = filas => filas.map(f => f.map(v => {
  const s = v == null ? '' : String(v)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}).join(';')).join('\n')

async function main() {
  console.log(DEMO ? '\n  Modo demo: datos de ejemplo\n' : '\n  Leyendo de Supabase…\n')
  const datos = DEMO ? datosDemo() : await traerDeSupabase()

  await mkdir(SALIDA, { recursive: true })
  const { wb, filasPersona } = construirLibro(datos, ExcelJS)

  const xlsx = join(SALIDA, DEMO ? 'invitados-DEMO.xlsx' : 'invitados-y-mesas.xlsx')
  await wb.xlsx.writeFile(xlsx)

  await writeFile(join(SALIDA, 'tarjetas.csv'), csv([
    ['Tarjeta', 'Tipo', 'Estado', 'Cupos', 'Confirmados', 'WhatsApp'],
    ...datos.rows.map(r => [r.group_name, r.invitation_type, LBL[estadoOf(r)], r.total_members || 0, r.attending_count || 0, r.whatsapp || '']),
  ]), 'utf8')
  await writeFile(join(SALIDA, 'personas.csv'),
    csv([['Persona', 'Tarjeta', 'Estado tarjeta', 'Mesa'], ...filasPersona]), 'utf8')

  console.log(`  ✓ ${xlsx}`)
  console.log('  ✓ tarjetas.csv · personas.csv')
  console.log(`\n  ${datos.rows.length} tarjetas · ${filasPersona.length} personas · ${datos.mesas.length} mesas\n`)
}

main().catch(e => { console.error('\n  Falló:', e.message, '\n'); process.exit(1) })
