function buildGCalUrl() {
  const title = encodeURIComponent('Boda Angely & Kevin')
  const desc  = encodeURIComponent('Ceremonia 6:30 PM | Parroquia San Luis Beltrán\nRecepción 8:30 PM | Casona del Prado, Barranquilla')
  const loc   = encodeURIComponent('Barranquilla, Colombia')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20260912T233000Z/20260913T060000Z&details=${desc}&location=${loc}`
}

function downloadIcs() {
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Angely & Kevin//ES','BEGIN:VEVENT',
    'DTSTART:20260912T233000Z','DTEND:20260913T060000Z',
    'SUMMARY:Boda Angely & Kevin',
    'DESCRIPTION:Ceremonia 6:30 PM / Recepción 8:30 PM | Barranquilla\\, Colombia',
    'LOCATION:Barranquilla\\, Colombia','END:VEVENT','END:VCALENDAR',
  ].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  a.download = 'boda-kevin-angely.ics'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

import { useGuest } from '../GuestContext'

export default function S4SaveDate({ onToast }) {
  const { nombre } = useGuest()
  return (
    <>
      {nombre && (
        <p className="eyebrow" style={{ marginBottom: '1.1rem', justifyContent: 'center' }}>
          {nombre}
        </p>
      )}
      <h2 className="sec-title" style={{ textAlign: 'center' }}>Sábado <em>12 de Septiembre</em></h2>
      <p className="gtf-big-year" style={{ textAlign: 'center' }}>2026 · Barranquilla, Colombia</p>
      <div className="div-orn"><div className="div-line" /><div className="div-dot" /><div className="div-line" /></div>
      <div className="gtf-events">
        <div className="gtf-ev">
          <div className="gtf-ev-ico" style={{ background: 'rgba(180,80,40,.25)', border: '1px solid rgba(220,120,60,.3)' }}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" stroke="white">
              <path d="M12 2l1 4h4l-3 3 1 4-3-2.5L9 13l1-4-3-3h4z" /><path d="M12 14v8M8 22h8" />
            </svg>
          </div>
          <div className="gtf-ev-txt">
            <p className="gtf-ev-type">Ceremonia religiosa</p>
            <p className="gtf-ev-time">6:30 PM</p>
          </div>
        </div>
        <div className="gtf-ev">
          <div className="gtf-ev-ico" style={{ background: 'rgba(60,100,40,.25)', border: '1px solid rgba(80,140,50,.3)' }}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" stroke="white">
              <path d="M8 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-1" />
              <path d="M12 10v4M10 12h4" /><path d="M8 3a2 2 0 0 1 4 0h0a2 2 0 0 1 4 0" />
            </svg>
          </div>
          <div className="gtf-ev-txt">
            <p className="gtf-ev-type">Recepción &amp; fiesta</p>
            <p className="gtf-ev-time">8:30 PM</p>
          </div>
        </div>
      </div>
      <div className="gtf-btns">
        <a href={buildGCalUrl()} target="_blank" rel="noopener" className="btn btn-gold btn-shimmer">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></svg>
          Agregar a Google Calendar
        </a>
        <button className="btn btn-ghost" onClick={() => { downloadIcs(); onToast('Archivo descargado; ábrelo para guardar en tu calendario') }}>
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Descargar .ics
        </button>
      </div>
    </>
  )
}
