import { useContext } from 'react'
import { GuestContext } from '../App'

export default function InfoImportante() {
  const guest = useContext(GuestContext)

  return (
    <section className="section" data-od-id="info-importante" style={{ background: 'var(--surface-alt)' }}>
      <div className="container" style={{ maxWidth: '780px' }}>
        <p className="eyebrow reveal">Con Amor y Claridad</p>
        <h2 className="reveal reveal-d1" style={{ marginBottom: 'var(--gap-xl)' }}>Información importante</h2>
        <div className="stack reveal reveal-d2" style={{ gap: 'var(--gap-lg)' }}>
          <div className="info-notice">
            <p className="notice-title">Evento exclusivo para adultos</p>
            <p style={{ color: 'var(--muted)', lineHeight: '1.7' }}>
              Con todo el cariño del mundo, les pedimos que este día tan especial lo celebremos
              solo en compañía de adultos. Agradecemos su comprensión y nos aseguraremos
              de que disfruten de una noche perfecta e inolvidable.
            </p>
          </div>
          <div className="info-notice">
            <p className="notice-title">
              Tu lugar reservado —&nbsp;
              <span className="num" style={{ color: 'var(--accent)' }}>{guest.cupos}</span>
              &nbsp;cupo(s)
            </p>
            <p style={{ color: 'var(--muted)', lineHeight: '1.7' }}>
              Hemos reservado con mucho cariño{' '}
              <strong className="num">{guest.cupos}</strong> lugar(es) para ti,{' '}
              <strong>{guest.nombre}</strong>.
              Te pedimos respetar el cupo asignado para garantizar la comodidad y calidez de nuestra celebración.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
