const LUGARES = [
  {
    label:  '[ Bocas de Ceniza ]',
    nombre: 'Bocas de Ceniza',
    desc:   'Donde el río Magdalena abraza el Mar Caribe. Un paisaje único en el mundo.',
  },
  {
    label:  '[ Puerto Colombia ]',
    nombre: 'Puerto Colombia',
    desc:   'Pintoresco pueblo costero con playa, gastronomía caribeña y el muelle histórico.',
  },
  {
    label:  '[ Centro Histórico ]',
    nombre: 'Centro Histórico',
    desc:   'Murales del Carnaval, el paseo Bolívar y la arquitectura republicana barranquillera.',
  },
]

export default function Turismo() {
  return (
    <section className="section" data-od-id="turismo" style={{ background: 'var(--surface-alt)' }}>
      <div className="container">
        <p className="eyebrow reveal">Aprovecha el Viaje</p>
        <h2 className="reveal reveal-d1" style={{ marginBottom: 'var(--gap-xl)' }}>Barranquilla te espera</h2>
        <div className="grid-3 reveal reveal-d2">
          {LUGARES.map(l => (
            <div key={l.nombre} className="scard">
              <div className="ph-img" style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', aspectRatio: '4/3' }}>
                {l.label}
              </div>
              <div className="scard-body">
                <p className="h3" style={{ fontSize: '20px' }}>{l.nombre}</p>
                <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '6px', lineHeight: '1.5' }}>{l.desc}</p>
                <button className="btn btn-secondary" style={{ marginTop: 'var(--gap-md)', fontSize: '13px', padding: '9px 18px' }}>
                  Ver más
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
