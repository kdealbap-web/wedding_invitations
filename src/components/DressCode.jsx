export default function DressCode() {
  return (
    <section className="section" data-od-id="dress-code" style={{ textAlign: 'center' }}>
      <div className="container">
        <p className="eyebrow reveal">Vestimenta</p>
        <h2 className="reveal reveal-d1" style={{ marginBottom: 'var(--gap-2xl)' }}>Código de vestimenta</h2>
        <div className="grid-2 reveal reveal-d2" style={{ maxWidth: '680px', marginInline: 'auto' }}>

          <div className="dress-card">
            <svg className="dress-icon" viewBox="0 0 44 48" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M22 4 C 16 4 12 9 10 13 L6 44 H38 L34 13 C 32 9 28 4 22 4Z" />
              <path d="M16 4 C 16 12 28 12 28 4" />
              <circle cx="22" cy="7" r="3" />
            </svg>
            <p className="h3">Mujeres</p>
            <p style={{ color: 'var(--muted)', marginTop: '12px', fontSize: '15px', lineHeight: '1.6' }}>
              Vestido largo o cóctel elegante.<br />
              Paleta sugerida: tonos tierra, beige, blanco marfil, verde salvia.<br />
              <strong style={{ color: 'var(--fg)' }}>Sin blanco puro, por favor.</strong>
            </p>
          </div>

          <div className="dress-card">
            <svg className="dress-icon" viewBox="0 0 44 48" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <rect x="13" y="5" width="18" height="22" rx="2" />
              <path d="M13 17 H7 L5 43 H39 L37 17 H31" />
              <path d="M18 5 L16 17 M26 5 L28 17" />
              <path d="M19 11 H25" />
            </svg>
            <p className="h3">Hombres</p>
            <p style={{ color: 'var(--muted)', marginTop: '12px', fontSize: '15px', lineHeight: '1.6' }}>
              Traje formal o smoking.<br />
              Corbata o pajarita obligatoria.<br />
              <strong style={{ color: 'var(--fg)' }}>Colores: navy, gris carbón, negro.</strong>
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}
