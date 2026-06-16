function ParentsIllustration() {
  // Ramas de laurel a cada lado (se reflejan con transform)
  const laurel = (
    <g stroke="url(#po-gold)" strokeWidth="1.4" fill="none" strokeLinecap="round">
      <path d="M0 0 C 26 -4 50 -2 70 8" />
      {[8, 20, 32, 44, 56].map((x, i) => (
        <path key={i} d={`M${x} ${2 - i * 0.6} q 7 -9 16 -5 q -5 9 -16 5`} fill="url(#po-leaf)" stroke="none" />
      ))}
    </g>
  )
  return (
    <div className="parents-illus">
      <svg viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="po-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,222,150,.95)" />
            <stop offset="100%" stopColor="rgba(196,150,70,.7)" />
          </linearGradient>
          <radialGradient id="po-leaf" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(255,215,130,.5)" />
            <stop offset="100%" stopColor="rgba(196,150,70,.28)" />
          </radialGradient>
        </defs>
        {/* Anillos entrelazados */}
        <circle cx="128" cy="52" r="24" fill="none" stroke="url(#po-gold)" strokeWidth="2.4" />
        <circle cx="152" cy="52" r="24" fill="none" stroke="url(#po-gold)" strokeWidth="2.4" />
        {/* Destellos */}
        <path d="M118 34 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="rgba(255,230,160,.9)" />
        {/* Laureles */}
        <g transform="translate(96 64)">{laurel}</g>
        <g transform="translate(184 64) scale(-1 1)">{laurel}</g>
        {/* Línea + corazón inferior */}
        <path d="M120 100 h40" stroke="url(#po-gold)" strokeWidth="1" opacity=".5" />
        <path d="M140 96 c-3 -4 -9 -2 -9 3 c0 4 9 9 9 9 c0 0 9 -5 9 -9 c0 -5 -6 -7 -9 -3z" fill="rgba(255,215,130,.55)" />
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
