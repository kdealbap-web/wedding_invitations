// ─── Descargar el Excel desde el panel ───
//
// ExcelJS pesa ~900 kB y solo hace falta cuando alguien pulsa el botón, así que
// entra por import() dinámico: Vite lo deja en su propio chunk y el panel no lo
// carga hasta que se usa.
import { supabase } from '../lib/supabase'
import { construirLibro, nombreArchivo } from './excel'

/**
 * Trae los datos, arma el libro y lo descarga.
 * @param avisar  callback para ir contando qué hace (el botón lo muestra)
 */
export async function exportarExcel(avisar = () => {}) {
  avisar('Consultando…')

  const [g, m, ms, as] = await Promise.all([
    supabase.from('guest_summary').select('*'),
    supabase.from('guest_members').select('id, guest_id, name, order_num'),
    supabase.from('mesas').select('*').order('orden'),
    supabase.from('asientos').select('*'),
  ])

  if (g.error) throw new Error(g.error.message)
  if (m.error) throw new Error(m.error.message)
  // Las mesas son opcionales: puede que 005_mesas.sql aún no esté aplicada
  const conMesas = !ms.error && !as.error

  const datos = {
    rows: (g.data || []).slice().sort((a, b) => (a.group_name || '').localeCompare(b.group_name || '', 'es')),
    miembros: m.data || [],
    mesas: conMesas ? (ms.data || []) : [],
    asientos: conMesas ? (as.data || []) : [],
  }

  avisar('Armando el libro…')
  const { default: ExcelJS } = await import('exceljs')
  const { wb } = construirLibro(datos, ExcelJS)

  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo()
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Sin esto el blob se queda en memoria toda la sesión
  setTimeout(() => URL.revokeObjectURL(url), 4000)

  return {
    tarjetas: datos.rows.length,
    personas: datos.miembros.length,
    mesas: datos.mesas.length,
    conMesas,
  }
}
