import { useState, useRef, useEffect } from 'react'

export default function NavDots({ sections, cur, onGo, icons }) {
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef(null)

  const showNav  = () => { clearTimeout(hideTimer.current); setVisible(true) }
  const schedHide = (ms) => {
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setVisible(false), ms)
  }

  useEffect(() => {
    const zone = document.getElementById('nav-zone')
    if (!zone) return
    zone.addEventListener('mouseenter', showNav)
    zone.addEventListener('mouseleave', () => schedHide(500))
    return () => {
      zone.removeEventListener('mouseenter', showNav)
      zone.removeEventListener('mouseleave', () => schedHide(500))
    }
  }, [])

  useEffect(() => {
    const onTouch = (e) => {
      if (e.touches[0].clientX > window.innerWidth - 72) { showNav(); schedHide(2400) }
    }
    window.addEventListener('touchstart', onTouch, { passive: true })
    return () => window.removeEventListener('touchstart', onTouch)
  }, [])

  return (
    <>
      <div id="nav-zone" aria-hidden="true" />
      <nav
        id="nav-dots"
        aria-label="Secciones de la invitación"
        className={visible ? 'nav-vis' : ''}
        onMouseEnter={showNav}
        onMouseLeave={() => schedHide(600)}
      >
        {sections.map((sec, i) => (
          <button
            key={sec.id}
            className={`nd${i === cur ? ' active' : ''}`}
            aria-label={sec.label}
            onClick={() => onGo(i)}
          >
            <span className="nd-lbl">{sec.label}</span>
            <span className="nd-ico">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: icons[sec.id] || '<circle cx="12" cy="12" r="4"/>' }}
              />
            </span>
          </button>
        ))}
      </nav>
    </>
  )
}
