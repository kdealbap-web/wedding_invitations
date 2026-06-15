function ParentsIllustration() {
  return (
    <div className="parents-illus">
      <svg viewBox="0 0 380 158" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="pi-bg" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="rgba(255,195,80,0.16)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <linearGradient id="pi-m" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,215,130,0.80)" />
            <stop offset="100%" stopColor="rgba(190,150,60,0.58)" />
          </linearGradient>
          <linearGradient id="pi-f" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,200,145,0.75)" />
            <stop offset="100%" stopColor="rgba(200,155,80,0.52)" />
          </linearGradient>
        </defs>
        <ellipse cx="190" cy="79" rx="185" ry="74" fill="url(#pi-bg)" />
        {/* Groom parents — left */}
        <circle cx="62" cy="36" r="16" fill="url(#pi-m)" />
        <path d="M46 54Q62 45 78 54L81 128 43 128Z" fill="url(#pi-m)" />
        <path d="M58 54L62 66L66 54" fill="rgba(0,0,0,.14)" />
        <circle cx="102" cy="36" r="16" fill="url(#pi-f)" />
        <path d="M80 54Q102 45 124 54L136 128 68 128Z" fill="url(#pi-f)" />
        {/* Center rings */}
        <circle cx="174" cy="70" r="22" fill="none" stroke="rgba(255,195,80,.88)" strokeWidth="2.5" />
        <circle cx="206" cy="70" r="22" fill="none" stroke="rgba(255,195,80,.88)" strokeWidth="2.5" />
        <circle cx="190" cy="113" r="2.5" fill="rgba(255,195,80,.45)" />
        <circle cx="183" cy="120" r="1.8" fill="rgba(255,195,80,.30)" />
        <circle cx="197" cy="120" r="1.8" fill="rgba(255,195,80,.30)" />
        {/* Connector lines */}
        <line x1="136" y1="70" x2="150" y2="70" stroke="rgba(255,195,80,.32)" strokeWidth="1" />
        <line x1="230" y1="70" x2="244" y2="70" stroke="rgba(255,195,80,.32)" strokeWidth="1" />
        {/* Bride parents — right */}
        <circle cx="278" cy="36" r="16" fill="url(#pi-f)" />
        <path d="M256 54Q278 45 300 54L312 128 244 128Z" fill="url(#pi-f)" />
        <circle cx="318" cy="36" r="16" fill="url(#pi-m)" />
        <path d="M302 54Q318 45 334 54L337 128 299 128Z" fill="url(#pi-m)" />
        <path d="M314 54L318 66L322 54" fill="rgba(0,0,0,.14)" />
      </svg>
    </div>
  )
}

export default function S11Parents() {
  return (
    <>
      <h2 className="sec-title" style={{ textAlign: 'center', marginBottom: '.2rem' }}>
        Con la <em>bendición</em> de
      </h2>
      <p style={{ fontFamily: 'var(--fs)', fontSize: 'clamp(1.5rem,3.2vw,2.2rem)', color: 'rgba(255,255,255,.82)', marginBottom: '.8rem', lineHeight: '1.1' }}>
        nuestros padres
      </p>
      <ParentsIllustration />
      <div className="parents-grid">
        <div className="parent-col">
          <p className="parent-role">Padres de la novia</p>
          <p className="parent-name">Sra. Estela Marys Rodriguez Trujillo</p>
          <div className="parent-and-line"><em>y</em></div>
          <p className="parent-name">Sr. Gerson Antonio Gravini Ferrer</p>
        </div>
        <div className="parent-col">
          <p className="parent-role">Padres del novio</p>
          <p className="parent-name">Sra. Osiris Rafaela Pomarico Antequera</p>
          <div className="parent-and-line"><em>y</em></div>
          <p className="parent-name">Sr. Fredy Alfonso De Alba Castro</p>
        </div>


      </div>
      <p style={{ fontFamily: 'var(--fd)', fontStyle: 'italic', fontSize: 'clamp(.82rem,1.5vw,.95rem)', color: 'rgba(255,255,255,.48)', marginTop: '.8rem', maxWidth: '420px', lineHeight: '1.72', textAlign: 'center' }}>
        "Con nuestro amor y bendición, celebramos la unión de nuestros hijos."
      </p>
    </>
  )
}
