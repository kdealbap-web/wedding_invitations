export default function Musica() {
  return (
    <section className="section" data-od-id="musica" style={{ textAlign: 'center' }}>
      <div className="container" style={{ maxWidth: '640px' }}>
        <p className="eyebrow reveal">Pon tu Canción</p>
        <h2 className="reveal reveal-d1" style={{ marginBottom: 'var(--gap-md)' }}>Música colaborativa</h2>
        <p className="lead reveal reveal-d2" style={{ margin: '0 auto var(--gap-xl)' }}>
          Ayúdanos a crear la banda sonora perfecta de nuestra boda.
          ¡Agrega la canción que no puede faltar!
        </p>
        <a href="#" className="btn btn-primary reveal reveal-d3" style={{ margin: '0 auto' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6"  cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          Lista de música colaborativa
        </a>
      </div>
    </section>
  )
}
