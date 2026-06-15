import { casonaSalon, logoWedding } from '../assets/images'

function VenueCard({ id, imgSrc, imgAlt, timeBadge, iconSvg, type, name, addr, arrival, btnClass, btnHref, btnLabel }) {
  return (
    <div className="venue-card venue-card-solo" id={id}>
      <div className="vc-img">
        <img src={imgSrc} alt={imgAlt} loading="lazy" />
        <div className="vc-img-ov" />
        <span className="vc-time-badge">{timeBadge}</span>
      </div>
      <div className="vc-icon-ring" style={{ background: 'rgba(10,5,2,.92)' }}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" stroke="white"
          dangerouslySetInnerHTML={{ __html: iconSvg }} />
      </div>
      <div className="vc-body">
        <p className="vc-type">{type}</p>
        <p className="vc-name">{name}</p>
        <p className="vc-addr" dangerouslySetInnerHTML={{ __html: addr }} />
        <p className="vc-arrival">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {arrival}
        </p>
        <a href={btnHref} target="_blank" rel="noopener" className={`btn ${btnClass} btn-shimmer`}>
          <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {btnLabel}
        </a>
      </div>
    </div>
  )
}

export default function S5Reception() {
  return (
    <>
      <img src={logoWedding} alt="Kevin & Angely" className="logo-boda" />
      <p className="eyebrow" style={{ marginBottom: '.75rem' }}>Cómo llegar · Recepción</p>
      <h2 className="sec-title" style={{ marginBottom: '1rem' }}>La <em>fiesta</em></h2>
      <div className="venue-grid">
        <VenueCard
          id="vc-reception"
          imgSrc={casonaSalon}
          imgAlt="Casona del Prado"
          timeBadge="8:30 PM"
          iconSvg='<path d="M8 3h8l-2 9a4 4 0 0 1-8 0L8 3z"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="6" y1="3" x2="18" y2="3"/>'
          type="Recepción & Fiesta"
          name="Casona del Prado"
          addr="Calle 70 Esq. Cra 60 #60-11, Barrio Viejo Prado<br/>Barranquilla, Colombia"
          arrival="Te esperamos a partir de las 8:15 PM"
          btnClass="btn-olive"
          btnHref="https://maps.app.goo.gl/LGt4MroYB55CimpUA"
          btnLabel="Cómo llegar"
        />
      </div>
    </>
  )
}
