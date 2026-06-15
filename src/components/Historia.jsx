export default function Historia() {
  return (
    <section className="section" data-od-id="historia">
      <div className="container grid-1-2" style={{ alignItems: 'center', gap: 'var(--gap-2xl)' }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--gap-lg)' }}>
          <svg
            className="olive-branch reveal"
            style={{ width: 'clamp(140px,22vw,240px)' }}
            viewBox="0 0 240 300"
            fill="none"
            aria-hidden="true"
          >
            <path className="o-path" d="M120 10 C 90 60, 50 100, 80 150 C 110 200, 70 240, 90 290"
              stroke="var(--accent-olive)" strokeWidth="2" fill="none" />
            <ellipse cx="78" cy="60"  rx="22" ry="11" fill="var(--olive-soft)" opacity=".8" transform="rotate(-30 78 60)" />
            <ellipse cx="60" cy="100" rx="22" ry="11" fill="var(--olive-soft)" opacity=".8" transform="rotate(20 60 100)" />
            <ellipse cx="90" cy="140" rx="22" ry="11" fill="var(--olive-soft)" opacity=".8" transform="rotate(-15 90 140)" />
            <ellipse cx="66" cy="180" rx="22" ry="11" fill="var(--olive-soft)" opacity=".8" transform="rotate(22 66 180)" />
            <ellipse cx="88" cy="225" rx="22" ry="11" fill="var(--olive-soft)" opacity=".8" transform="rotate(-10 88 225)" />
            <ellipse cx="72" cy="262" rx="22" ry="11" fill="var(--olive-soft)" opacity=".8" transform="rotate(18 72 262)" />
          </svg>
          <div style={{ textAlign: 'center' }}>
            <p className="eyebrow reveal" style={{ marginBottom: '8px' }}>Nuestra Historia</p>
            <p className="italic-serif reveal reveal-d1" style={{ fontSize: 'clamp(28px,4vw,40px)', color: 'var(--accent)' }}>
              Kevin &amp; Angely
            </p>
          </div>
        </div>

        <div className="stack reveal reveal-d1" style={{ gap: 'var(--gap-lg)' }}>
          <p className="story-body">
            Lo que comenzó como una mirada que cruzó el salón se convirtió en conversaciones
            que duraban hasta que el amanecer los sorprendía. Angely & Kevin descubrieron
            que en el otro habitaba exactamente aquello que el corazón llevaba tanto tiempo buscando.
          </p>
          <p className="story-body">
            A lo largo de estos años construyeron un amor que no se declara, se demuestra —
            con paciencia en los días difíciles, con risas en los sencillos,
            y con la certeza de que cada camino cobra más sentido cuando se recorre de la mano.
          </p>
          <blockquote className="story-quote">
            "No es que los astros nos pusieron juntos;<br />
            es que elegimos, cada día, estar el uno para el otro."
          </blockquote>
          <p className="meta" style={{ marginTop: '-8px', paddingLeft: 'var(--gap-md)' }}>
            — Reemplaza con tu historia real aquí
          </p>
        </div>
      </div>
    </section>
  )
}
