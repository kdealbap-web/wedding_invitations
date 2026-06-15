import { useGuest } from '../GuestContext'
import { logoWedding } from '../assets/images'

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

export default function S12Final({ onGoTo }) {
  const { nombre } = useGuest()
  return (
    <>
      <img src={logoWedding} alt="Angely & Kevin" className="logo-boda" style={{ maxWidth: 'clamp(120px,18vw,200px)', marginBottom: '1rem' }} />
      <h1 className="hero-k">Angely</h1>
      <p className="hero-amp">&amp;</p>
      <h1 className="hero-a">Kevin</h1>
      <p className="final-date">12 de Septiembre de 2026 · Barranquilla, Colombia</p>
      <p style={{ fontFamily: 'var(--fd)', fontStyle: 'italic', fontSize: 'clamp(.9rem,1.8vw,1.05rem)', color: 'rgba(255,255,255,.5)', maxWidth: '380px', textAlign: 'center', lineHeight: '1.7' }}>
        "Con todo nuestro amor, los esperamos para vivir este sueño juntos."
      </p>
      {nombre && (
        <p style={{ fontFamily: 'var(--fd)', fontStyle: 'italic', fontSize: 'clamp(.88rem,1.7vw,1.05rem)', color: 'var(--gold)', opacity: '.88', marginTop: '.3rem' }}>
          Para ti, {nombre}
        </p>
      )}
      <div className="final-btns">
        <button className="btn btn-acc btn-shimmer" onClick={() => onGoTo('s10')}>
          <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Confirmar asistencia
        </button>
        <button className="btn btn-ghost" onClick={downloadIcs}>
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Guardar fecha
        </button>
      </div>
      <p className="final-foot">Barranquilla, Colombia · 2026</p>
    </>
  )
}
