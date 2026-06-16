const PIN_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const items = [
  { hora: '6:30 PM · Ceremonia', titulo: 'Parroquia San Luis Beltrán',
    dir: 'Cl. 75b #42F-73, Nte. Centro Histórico, Barranquilla',
    url: 'https://maps.google.com/?q=Parroquia+San+Luis+Beltr%C3%A1n+Barranquilla+Colombia', key: true },
  { hora: '8:30 PM · Recepción', titulo: 'Casona del Prado',
    dir: 'Calle 70 Esq. Cra 60 #60-11, Barrio Viejo Prado',
    url: 'https://maps.google.com/?q=Casona+del+Prado+Calle+70+Barranquilla+Colombia' },
  { hora: '9:00 PM · Cena',     titulo: 'Cena de Gala',        dir: 'Salón principal' },
  { hora: '10:30 PM · Brindis', titulo: 'Palabras & Brindis' },
  { hora: '11:00 PM · Pastel',  titulo: 'Corte de torta' },
  { hora: '11:30 PM · Fiesta',  titulo: '¡A bailar!',
    dir: 'Pista de baile abierta hasta el amanecer', key: true },
]

export default function Itinerario() {
  return (
    <section className="section" data-od-id="itinerario" style={{ background: 'var(--surface-alt)' }}>
      <div className="container">
        <div style={{ marginBottom: 'var(--gap-2xl)' }}>
          <p className="eyebrow reveal">El Gran Día</p>
          <h2 className="reveal reveal-d1">Itinerario</h2>
        </div>

        <div className="grid-1-2" style={{ gap: 'var(--gap-2xl)' }}>
          <div className="timeline reveal">
            {items.map((item, i) => (
              <div key={i} className={`tl-item${item.key ? ' key' : ''}`}>
                <p className="tl-hora">{item.hora}</p>
                <p className="tl-titulo">{item.titulo}</p>
                {item.dir && <p className="tl-dir">{item.dir}</p>}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener"
                    className="btn btn-secondary" style={{ fontSize: '12px', padding: '8px 16px' }}>
                    {PIN_ICON} Cómo llegar
                  </a>
                )}
              </div>
            ))}
          </div>

          <div className="stack reveal reveal-d1" style={{ gap: 'var(--gap-lg)' }}>
            <div className="card">
              <p className="eyebrow" style={{ marginBottom: 'var(--gap-sm)' }}>Ceremonia</p>
              <p className="h3">Parroquia San Luis Beltrán</p>
              <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '8px' }}>
                Cl. 75b #42F-73<br />Nte. Centro Histórico, Barranquilla
              </p>
              <p className="meta" style={{ marginTop: '12px' }}>6:30 PM en punto · Puerta principal</p>
            </div>
            <div className="card">
              <p className="eyebrow" style={{ marginBottom: 'var(--gap-sm)' }}>Recepción</p>
              <p className="h3">Casona del Prado</p>
              <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '8px' }}>
                Calle 70 Esq. Cra 60 #60-11<br />Barrio Viejo Prado, Barranquilla
              </p>
              <p className="meta" style={{ marginTop: '12px' }}>8:30 PM · Hasta el amanecer</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
