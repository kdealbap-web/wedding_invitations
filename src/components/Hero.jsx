import { useEffect, useRef, useContext } from 'react'
import { GuestContext } from '../App'

export default function Hero() {
  const leavesRef = useRef(null)
  const guest     = useContext(GuestContext)

  useEffect(() => {
    const c = leavesRef.current
    if (!c) return
    for (let i = 0; i < 14; i++) {
      const leaf = document.createElement('div')
      leaf.className = 'leaf'
      const sz  = 12 + Math.random() * 16
      const dur = 6  + Math.random() * 10
      const del = Math.random() * 8
      leaf.innerHTML = '<svg viewBox="0 0 20 30" fill="none"><ellipse cx="10" cy="15" rx="6" ry="11" fill="var(--olive-soft)" opacity=".65"/><line x1="10" y1="3" x2="10" y2="27" stroke="var(--accent-olive)" stroke-width=".8"/></svg>'
      leaf.style.cssText = `width:${sz}px;left:${Math.random() * 100}%;animation-duration:${dur}s;animation-delay:${del}s`
      c.appendChild(leaf)
    }
    return () => { c.innerHTML = '' }
  }, [])

  return (
    <section className="section hero-wedding" data-od-id="hero">
      <div
        ref={leavesRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
        aria-hidden="true"
      />

      {/* Decorative olive branch */}
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', bottom: '40px', right: '4vw', width: 'clamp(100px,16vw,180px)', opacity: '.3' }}
        viewBox="0 0 180 110"
        fill="none"
      >
        <path d="M8 55 C 35 16, 66 94, 90 55 C 114 16, 145 94, 172 50" stroke="var(--accent-olive)" strokeWidth="2" fill="none" />
        <ellipse cx="28"  cy="28" rx="11" ry="5.5" fill="var(--olive-soft)" transform="rotate(-24 28 28)" />
        <ellipse cx="58"  cy="78" rx="11" ry="5.5" fill="var(--olive-soft)" transform="rotate(18 58 78)" />
        <ellipse cx="90"  cy="34" rx="11" ry="5.5" fill="var(--olive-soft)" transform="rotate(-14 90 34)" />
        <ellipse cx="126" cy="76" rx="11" ry="5.5" fill="var(--olive-soft)" transform="rotate(20 126 76)" />
        <ellipse cx="158" cy="30" rx="11" ry="5.5" fill="var(--olive-soft)" transform="rotate(-18 158 30)" />
      </svg>

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <p className="hero-saludo reveal">
          Querido/a <strong>{guest.nombre}</strong>
        </p>
        <h1 className="hero-title reveal reveal-d1">Nos Casamos</h1>
        <p className="hero-names reveal reveal-d2">Kevin &amp; Angely</p>
        <p className="hero-date reveal reveal-d3">
          12 · Septiembre · 2026 &nbsp;·&nbsp; 6:30 PM · Barranquilla
        </p>
        <p className="hero-verse reveal reveal-d3">
          "El amor es paciente, es bondadoso… todo lo soporta,<br />
          todo lo espera, todo lo aguanta."
          <cite>— 1 Corintios 13:4,7</cite>
        </p>
      </div>
    </section>
  )
}
