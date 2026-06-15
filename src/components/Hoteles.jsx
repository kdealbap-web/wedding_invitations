const HOTELES = [
  {
    label:  '[ Hotel El Prado ]',
    cat:    '5 ESTRELLAS · 5 MIN',
    nombre: 'Hotel El Prado',
    desc:   'Cra. 54 #70-10, Barranquilla. Icónico hotel a pasos de la recepción.',
    url:    'https://maps.google.com/?q=Hotel+El+Prado+Barranquilla',
  },
  {
    label:  '[ Entonces Boutique ]',
    cat:    'BOUTIQUE · CENTRO',
    nombre: 'Entonces Boutique Hotel',
    desc:   'Hotel boutique con diseño contemporáneo en el corazón de la ciudad.',
    url:    'https://maps.google.com/?q=Barranquilla+hotel+boutique+centro',
  },
  {
    label:  '[ Sonesta Barranquilla ]',
    cat:    'MODERNO · ZONA NORTE',
    nombre: 'Sonesta Barranquilla',
    desc:   'Amplio y moderno, zona norte. Ideal para familias y grupos.',
    url:    'https://maps.google.com/?q=Sonesta+Hotel+Barranquilla',
  },
]

export default function Hoteles() {
  return (
    <section className="section" data-od-id="hoteles">
      <div className="container">
        <p className="eyebrow reveal">Para tu Estadía</p>
        <h2 className="reveal reveal-d1" style={{ marginBottom: 'var(--gap-xl)' }}>Hoteles sugeridos</h2>
        <div className="grid-3 reveal reveal-d2">
          {HOTELES.map(h => (
            <div key={h.nombre} className="scard">
              <div className="ph-img" style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', aspectRatio: '4/3' }}>
                {h.label}
              </div>
              <div className="scard-body">
                <p className="eyebrow" style={{ fontSize: '10px', marginBottom: '6px' }}>{h.cat}</p>
                <p className="h3" style={{ fontSize: '20px' }}>{h.nombre}</p>
                <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '6px', lineHeight: '1.5' }}>{h.desc}</p>
                <a href={h.url} target="_blank" rel="noopener"
                  className="btn btn-secondary" style={{ marginTop: 'var(--gap-md)', fontSize: '13px', padding: '9px 18px' }}>
                  Ver más
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
