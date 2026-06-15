import { useRef } from 'react'

export default function EnvelopeIntro({ onOpen }) {
  const introRef = useRef(null)
  const btnRef   = useRef(null)

  function handleOpen() {
    btnRef.current?.classList.add('opening')
    const audio = document.getElementById('wedding-audio')
    if (audio?.querySelectorAll('source').length) audio.play().catch(() => {})
    setTimeout(() => {
      introRef.current?.classList.add('out')
      setTimeout(() => {
        if (introRef.current) introRef.current.style.display = 'none'
        onOpen()
      }, 700)
    }, 550)
  }

  return (
    <div
      ref={introRef}
      id="intro"
      role="dialog"
      aria-label="Introducción — Invitación de boda"
    >
      <svg className="olive-branch" width="220" height="52" viewBox="0 0 220 52" fill="none" aria-hidden="true">
        <path d="M10 26 C 45 6, 80 46, 110 26 C 140 6, 175 46, 210 24" stroke="var(--olive-soft)" strokeWidth="1.4" fill="none" />
        <ellipse cx="42"  cy="12" rx="10" ry="5" fill="var(--olive-soft)" opacity=".75" transform="rotate(-22 42 12)" />
        <ellipse cx="72"  cy="40" rx="10" ry="5" fill="var(--olive-soft)" opacity=".75" transform="rotate(16 72 40)" />
        <ellipse cx="110" cy="16" rx="10" ry="5" fill="var(--olive-soft)" opacity=".75" transform="rotate(-12 110 16)" />
        <ellipse cx="148" cy="40" rx="10" ry="5" fill="var(--olive-soft)" opacity=".75" transform="rotate(18 148 40)" />
        <ellipse cx="185" cy="14" rx="10" ry="5" fill="var(--olive-soft)" opacity=".75" transform="rotate(-18 185 14)" />
      </svg>

      <p className="i-monogram">K &amp; A</p>

      <p className="i-tagline">
        Este sueño no estaría completo sin ti.<br />
        Haz clic en el sobre y acompáñanos<br />en nuestra historia de amor.
      </p>

      <button
        ref={btnRef}
        className="env-btn"
        onClick={handleOpen}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleOpen() }}
        aria-label="Abrir invitación"
      >
        <svg className="env-svg" viewBox="0 0 280 176" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="38" width="276" height="136" rx="8" fill="var(--surface-alt)" stroke="var(--border)" strokeWidth="1.5" />
          <path d="M2 174 L140 106 L278 174" stroke="var(--border)" strokeWidth="1" />
          <path d="M2 38 L98 96"   stroke="var(--border)" strokeWidth="1" opacity=".6" />
          <path d="M278 38 L182 96" stroke="var(--border)" strokeWidth="1" opacity=".6" />
          <circle cx="140" cy="107" r="20" fill="var(--accent)" opacity=".92" />
          <text
            x="140" y="113"
            textAnchor="middle"
            fill="var(--surface)"
            fontFamily="'Cormorant Garamond',Georgia,serif"
            fontSize="13"
            letterSpacing="1.5"
            fontWeight="400"
          >K&amp;A</text>
          <path
            className="env-flap"
            d="M2 38 L140 106 L278 38 Q274 1 140 1 Q6 1 2 38Z"
            fill="var(--accent)"
            fillOpacity=".12"
            stroke="var(--border)"
            strokeWidth="1.5"
          />
        </svg>
        <span className="i-hint">Haz clic para abrir</span>
      </button>

      <audio id="wedding-audio" loop preload="none" />
    </div>
  )
}
