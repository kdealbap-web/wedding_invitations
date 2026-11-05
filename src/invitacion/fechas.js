// ─── Fechas y calendario de un evento ───
// Todo en America/Bogota (UTC−5, sin horario de verano) y en es-CO: los
// eventos se guardan en UTC y la gente los lee en hora de Colombia.

const ZONA = 'America/Bogota'

const fmt = (iso, opts) => new Intl.DateTimeFormat('es-CO', { timeZone: ZONA, ...opts }).format(new Date(iso))

// «lunes, 28 de diciembre de 2026»
export const fechaLarga = (iso) => (iso ? fmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '')

// «28 de diciembre»
export const fechaCorta = (iso) => (iso ? fmt(iso, { day: 'numeric', month: 'long' }) : '')

// Una fecha sin hora (rsvp_limite, «2026-08-12») se lee en UTC: en Bogotá
// caería en el día anterior.
export const diaCorto = (ymd) => (ymd
  ? new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(new Date(`${ymd}T00:00:00Z`))
  : '')

// ¿Ya pasó el plazo? El límite vale hasta el final de ese día en Bogotá.
export const plazoVencido = (ymd) => {
  if (!ymd) return false
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date())  // YYYY-MM-DD
  return hoy > ymd
}

const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

const rango = (iso, horas) => {
  const ini = new Date(iso)
  return [stamp(ini), stamp(new Date(ini.getTime() + horas * 3600 * 1000))]
}

export function googleCalUrl({ titulo, iso, horas = 4, detalle = '', lugar = '' }) {
  const [a, b] = rango(iso, horas)
  const q = new URLSearchParams({ action: 'TEMPLATE', text: titulo, dates: `${a}/${b}`, details: detalle, location: lugar })
  return `https://calendar.google.com/calendar/render?${q}`
}

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')

export function descargarIcs({ titulo, iso, horas = 4, detalle = '', lugar = '', archivo = 'evento.ics' }) {
  const [a, b] = rango(iso, horas)
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//invitation.kdealbap.com//ES', 'BEGIN:VEVENT',
    `DTSTART:${a}`, `DTEND:${b}`,
    `SUMMARY:${esc(titulo)}`, `DESCRIPTION:${esc(detalle)}`, `LOCATION:${esc(lugar)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const el = document.createElement('a')
  el.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  el.download = archivo
  document.body.appendChild(el); el.click(); document.body.removeChild(el)
  setTimeout(() => URL.revokeObjectURL(el.href), 1000)
}
