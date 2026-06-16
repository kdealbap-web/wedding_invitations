function addToCalendar() {
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Angely & Kevin//Boda//ES',
    'BEGIN:VEVENT',
    'DTSTART:20260912T233000Z',
    'DTEND:20260913T070000Z',
    'SUMMARY:Boda Angely & Kevin',
    'DESCRIPTION:Ceremonia 6:30 PM - Parroquia San Luis Beltrán\\nRecepción 8:30 PM - Casona del Prado',
    'LOCATION:Parroquia San Luis Beltrán\\, Barranquilla\\, Colombia',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'boda-kevin-angely.ics'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
}

export default function CtaFinal({ onVideoOpen }) {
  return (
    <section className="section" data-od-id="cta-final" style={{ textAlign: 'center', background: 'var(--surface-alt)' }}>
      <div className="container" style={{ maxWidth: '560px' }}>
        <svg aria-hidden="true" style={{ margin: '0 auto var(--gap-md)', display: 'block', width: '100px', opacity: '.5' }} viewBox="0 0 100 60" fill="none">
          <path d="M4 30 C 20 8, 38 52, 50 30 C 62 8, 80 52, 96 28" stroke="var(--olive-soft)" strokeWidth="1.5" fill="none" />
          <ellipse cx="18" cy="14" rx="8" ry="4" fill="var(--olive-soft)" transform="rotate(-22 18 14)" />
          <ellipse cx="36" cy="46" rx="8" ry="4" fill="var(--olive-soft)" transform="rotate(16 36 46)" />
          <ellipse cx="50" cy="20" rx="8" ry="4" fill="var(--olive-soft)" transform="rotate(-12 50 20)" />
          <ellipse cx="68" cy="46" rx="8" ry="4" fill="var(--olive-soft)" transform="rotate(18 68 46)" />
          <ellipse cx="85" cy="16" rx="8" ry="4" fill="var(--olive-soft)" transform="rotate(-16 85 16)" />
        </svg>

        <h2 className="reveal" style={{ fontSize: 'clamp(32px,5vw,56px)' }}>Kevin &amp; Angely</h2>
        <p className="lead reveal reveal-d1" style={{ margin: 'var(--gap-md) auto var(--gap-xl)' }}>
          12 · Septiembre · 2026 · Barranquilla, Colombia
        </p>

        <div className="row reveal reveal-d2" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 'var(--gap-sm)' }}>
          <a href="#rsvp" className="btn btn-primary">Confirma tu asistencia</a>
          <button className="btn btn-secondary" onClick={addToCalendar}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8"  y1="2" x2="8"  y2="6" />
              <line x1="3"  y1="10" x2="21" y2="10" />
            </svg>
            Agenda la boda
          </button>
          <button className="btn btn-secondary" onClick={onVideoOpen}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Video de recuerdo
          </button>
        </div>
      </div>
    </section>
  )
}
