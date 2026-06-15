const PHOTOS = [
  { cls: 'portrait', label: '[ Foto 1 · 3:4 ]' },
  { ratio: '4/3',    label: '[ Foto 2 · 4:3 ]' },
  { cls: 'square',   label: '[ Foto 3 · 1:1 ]' },
  { ratio: '4/3',    label: '[ Foto 4 · 4:3 ]' },
  { cls: 'portrait', label: '[ Foto 5 · 3:4 ]' },
  { cls: 'square',   label: '[ Foto 6 · 1:1 ]' },
]

export default function Galeria({ onLightbox }) {
  return (
    <section className="section" data-od-id="galeria" style={{ background: 'var(--surface-alt)' }}>
      <div className="container">
        <p className="eyebrow reveal">Nuestro Amor</p>
        <h2 className="reveal reveal-d1" style={{ marginBottom: 'var(--gap-xl)' }}>La galería</h2>
        <div className="masonry reveal reveal-d2">
          {PHOTOS.map((p, i) => (
            <div
              key={i}
              className="masonry-item"
              onClick={e => {
                const img = e.currentTarget.querySelector('img')
                if (img) onLightbox(img.src)
              }}
            >
              <div
                className={`ph-img${p.cls ? ` ${p.cls}` : ''}`}
                style={p.ratio ? { aspectRatio: p.ratio } : undefined}
              >
                {p.label}
              </div>
            </div>
          ))}
        </div>
        <p className="meta reveal" style={{ marginTop: 'var(--gap-md)', textAlign: 'center' }}>
          Reemplaza los placeholders con: &lt;img src="URL" alt="descripción"&gt; dentro de cada .masonry-item
        </p>
      </div>
    </section>
  )
}
