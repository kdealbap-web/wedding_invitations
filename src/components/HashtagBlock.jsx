import { useRef } from 'react'

export default function HashtagBlock() {
  const btnRef = useRef(null)

  function copyHashtag() {
    if (!navigator.clipboard) return
    navigator.clipboard.writeText('#Kevin&Angely').then(() => {
      if (!btnRef.current) return
      btnRef.current.textContent = '¡Copiado!'
      setTimeout(() => { if (btnRef.current) btnRef.current.textContent = 'Copiar hashtag' }, 2000)
    })
  }

  return (
    <section className="section" data-od-id="hashtag" style={{ background: 'var(--surface-alt)' }}>
      <div className="container">
        <div className="hashtag-block reveal">
          <p className="meta" style={{ color: 'color-mix(in oklch,var(--bg) 55%,transparent)', marginBottom: 'var(--gap-md)', letterSpacing: '.14em' }}>
            COMPARTE EL MOMENTO
          </p>
          <p className="hashtag-text">
            #Kevin<span style={{ color: 'var(--accent)' }}>&amp;</span>Angely
          </p>
          <p className="hashtag-sub">
            Usa este hashtag en Instagram para que podamos ver todos los momentos que capturas.
          </p>
          <button
            ref={btnRef}
            className="btn btn-dark"
            style={{ margin: 'var(--gap-lg) auto 0', display: 'inline-flex' }}
            onClick={copyHashtag}
          >
            Copiar hashtag
          </button>
        </div>
      </div>
    </section>
  )
}
