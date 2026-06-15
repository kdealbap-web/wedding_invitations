export default function S9Gifts() {
  return (
    <>
      <h2 className="sec-title" style={{ textAlign: 'center' }}>Lluvia <em>de sobres</em></h2>
      <div className="regalo-card">
        <div className="regalo-icon">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" stroke="oklch(78% .12 78)">
            <rect x="3" y="8" width="18" height="14" rx="2"/>
            <path d="M16 8V6a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            <line x1="12" y1="8" x2="12" y2="22"/>
            <line x1="3"  y1="13" x2="21" y2="13"/>
          </svg>
        </div>
        <p className="regalo-txt">
          Lo más valioso para nosotros es tenerte presente en este día tan especial.
          Si deseas obsequiarnos, recibiremos con mucho cariño tu lluvia de sobres durante la celebración.
        </p>
        <p style={{ fontFamily: 'var(--fb)', fontSize: '.68rem', letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', margin: '1.25rem 0 .4rem' }}>
          Para tu comodidad también puedes transferir a
        </p>
        <div className="regalo-nu">
          <svg viewBox="0 0 28 28" className="nu-logo" aria-label="Nubank">
            <rect width="28" height="28" rx="7" fill="#820AD1"/>
            <path d="M7 21V7l10 11.5V7h4v14l-10-11.5V21z" fill="white"/>
          </svg>
          Nu · Nubank Colombia
        </div>
        <p className="regalo-key-label">Llave BRE-B Banco Nu</p>
        <p className="regalo-key">@KDP680</p>
        <p className="regalo-min">Valor mínimo sugerido: $100.000 COP</p>
      </div>
      <p style={{ fontFamily: 'var(--fd)', fontStyle: 'italic', fontSize: 'clamp(.82rem,1.5vw,.95rem)', color: 'rgba(255,255,255,.4)', maxWidth: '380px', textAlign: 'center', lineHeight: '1.7' }}>
        Tu presencia ya es el regalo más grande que podemos recibir.
      </p>
    </>
  )
}
