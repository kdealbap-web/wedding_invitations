import { logoWedding } from '../assets/images'

export default function S8Info() {
  return (
    <>
      <img src={logoWedding} alt="Angely & Kevin" className="logo-boda" style={{ marginBottom: '.4rem' }} />
      <p className="eyebrow" style={{ marginBottom: '.7rem', justifyContent: 'center' }}>Un detalle importante</p>
      <h2 className="sec-title" style={{ textAlign: 'center' }}>Solo <em>adultos</em></h2>
      <div className="adults-card">
        <div className="adults-ico">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="7" r="3" /><path d="M3 20c0-3.3 2.2-6 5-6" />
            <circle cx="16" cy="7" r="3" /><path d="M21 20c0-3.3-2.2-6-5-6" />
          </svg>
        </div>
        <p className="adults-txt">
          Con mucho cariño hemos pensado una celebración en un ambiente
          <em> exclusivo para adultos</em>. Agradecemos de corazón que
          comprendas y nos acompañes a disfrutar de esta noche tan especial.
        </p>
      </div>
      <p className="adults-foot">Gracias por ser parte de nuestro día · Angely &amp; Kevin</p>
    </>
  )
}
