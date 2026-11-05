// ─── Lo que todo el panel necesita saber de un evento ───
//
// Sin imports de Supabase a propósito: lo cargan también los scripts de Node
// (`scripts/export-*.mjs`), que traen su propio cliente. Por eso las consultas
// reciben el cliente por parámetro y los imports de otros módulos llevan `.js`.

export const SLUG_BODA = 'boda-angely-kevin'
export const esBoda = ev => ev?.slug === SLUG_BODA

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const TIPOS_EVENTO = [
  { key: 'boda',        lbl: 'Boda' },
  { key: 'xv',          lbl: '15 años' },
  { key: 'cumpleanos',  lbl: 'Cumpleaños' },
  { key: 'bautizo',     lbl: 'Bautizo' },
  { key: 'grado',       lbl: 'Grado' },
  { key: 'corporativo', lbl: 'Corporativo' },
  { key: 'otro',        lbl: 'Otro' },
]
export const tipoEventoLbl = k => TIPOS_EVENTO.find(t => t.key === k)?.lbl || k

// Qué pasa con los links de cada estado (lo aplica get-invitation)
export const ESTADOS_EVENTO = {
  borrador:  { lbl: 'Borrador',  cls: 'badge-gray',  desc: 'El link abre en vista previa; no se acepta el RSVP' },
  activo:    { lbl: 'Activo',    cls: 'badge-green', desc: 'Los links funcionan y se puede confirmar' },
  cerrado:   { lbl: 'Cerrado',   cls: 'badge-gold',  desc: 'Los links muestran que el evento ya no recibe respuestas' },
  archivado: { lbl: 'Archivado', cls: 'badge-blue',  desc: 'El evento ya pasó; los links están inactivos' },
}
export const linksInactivos = ev => ev?.estado === 'cerrado' || ev?.estado === 'archivado'

/** «Mis 15 años · Mauren» → «mis-15-anos-mauren» */
export const slugify = s => (s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** Etiqueta de un tipo de invitación según la lista del evento. */
export const tipoLabel = (ev, key) =>
  (ev?.invitation_types || []).find(t => t.key === key)?.label || key

export function diasPara(fecha) {
  if (!fecha) return null
  return Math.max(0, Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000))
}

// ─── datetime-local ⇄ UTC, siempre en hora de Colombia (UTC−5, sin horario de verano) ───
const BOGOTA = 5 * 3600000
export function utcALocalInput(iso) {
  if (!iso) return ''
  return new Date(new Date(iso).getTime() - BOGOTA).toISOString().slice(0, 16)
}
export function localInputAUtc(v) {
  if (!v) return null
  return new Date(new Date(`${v}:00Z`).getTime() + BOGOTA).toISOString()
}

/** Un evento a texto de archivo: el slug ya es seguro para nombres de archivo. */
export const sufijoArchivo = ev => ev?.slug || 'evento'

// ─── Consultas filtradas por evento ───
// guest_members y asientos no llevan event_id: se filtran por el join con su
// padre (`!inner` + eq sobre la tabla embebida) y luego se quita la clave
// embebida para que las filas queden como siempre.
const sinClave = (res, clave) => res.error ? res : {
  ...res, data: (res.data || []).map(({ [clave]: _, ...r }) => r),
}

export async function miembrosDe(sb, eventId, cols = 'id, guest_id, name, order_num') {
  return sinClave(
    await sb.from('guest_members').select(`${cols}, guests!inner(event_id)`).eq('guests.event_id', eventId),
    'guests')
}

export async function asientosDe(sb, eventId, cols = '*') {
  return sinClave(
    await sb.from('asientos').select(`${cols}, mesas!inner(event_id)`).eq('mesas.event_id', eventId),
    'mesas')
}
