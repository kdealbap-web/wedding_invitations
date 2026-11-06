import { useState, useEffect, useRef, useCallback } from 'react'
import { useGuest } from './GuestContext'
import ProgBar     from '../components/ProgBar'
import AudioBtn    from '../components/AudioBtn'
import YoutubeBtn  from '../components/YoutubeBtn'
import NavDots     from '../components/NavDots'
import NavArrows   from '../components/NavArrows'
import Toast       from '../components/Toast'
import AutoPlayBtn from '../components/AutoPlayBtn'

// ─── El slide-deck, sin saber de qué evento es ───
// Recibe `sections` [{ id, Component, label, bg, pos, ov, icon, panel }] y se ocupa de la
// navegación: no hay scroll de página, son secciones fijas superpuestas y solo
// una lleva `.active`. `icon` es el interior del <svg> del punto lateral.
//   bloqueado → no navega (teclado, deslizar, autoplay): p. ej. mientras el sobre
//               de apertura está abierto encima
//   panel     → pinta además la foto en un <img.sec-foto> (con `pos` como
//               object-position); la plantilla decide en su CSS cómo se ve
//   musica    → lista de pistas (opcional; sin ellas no hay botón de audio)
//   className → clase de la plantilla en #app, para sus tokens de color
//   children  → decoración extra (pétalos, destellos…)
export default function Deck({ sections, musica, className = '', bloqueado = false, children }) {
  const { tipo } = useGuest()
  const [cur, setCur]   = useState(0)
  const [exitIdx, setExitIdx] = useState(null)
  const [autoPlay, setAutoPlay] = useState(false)
  const transitioning   = useRef(false)
  const toastRef        = useRef(null)
  const touchStart      = useRef({ x: 0, y: 0 })

  const goTo = useCallback((idx) => {
    if (bloqueado || transitioning.current || idx < 0 || idx >= sections.length) return
    setCur(prev => {
      if (idx === prev) return prev
      transitioning.current = true
      setExitIdx(prev)
      setTimeout(() => {
        setExitIdx(null)
        transitioning.current = false
      }, 950)
      return idx
    })
  }, [sections.length, bloqueado])

  const goToId = useCallback((id) => {
    const idx = sections.findIndex(s => s.id === id)
    if (idx !== -1) goTo(idx)
  }, [sections, goTo])

  const showToast = useCallback((msg) => {
    toastRef.current?.show(msg)
  }, [])

  // Auto-play: avanza cada 5 s y vuelve a la 0
  useEffect(() => {
    if (!autoPlay) return
    const id = setTimeout(() => goTo((cur + 1) % sections.length), 5000)
    return () => clearTimeout(id)
  }, [autoPlay, cur, sections.length, goTo])

  // Navegación circular: el último vuelve al primero y viceversa
  const next = useCallback(() => goTo((cur + 1) % sections.length), [cur, goTo, sections.length])
  const prev = useCallback(() => goTo((cur - 1 + sections.length) % sections.length), [cur, goTo, sections.length])

  // Teclado
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input,textarea,select')) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  { e.preventDefault(); next() }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    { e.preventDefault(); prev() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  // Swipe — respeta el scroll interno de las secciones desplazables
  useEffect(() => {
    const onStart = (e) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    const onEnd = (e) => {
      const dx = touchStart.current.x - e.changedTouches[0].clientX
      const dy = touchStart.current.y - e.changedTouches[0].clientY
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 45) {
        // Si la sección activa puede hacer scroll, solo navegar en los bordes
        const c = document.querySelector('.sec.active .sec-c')
        if (c) {
          const oy = getComputedStyle(c).overflowY
          const scrollable = (oy === 'auto' || oy === 'scroll') && c.scrollHeight > c.clientHeight + 2
          if (scrollable) {
            const atTop    = c.scrollTop <= 0
            const atBottom = c.scrollTop + c.clientHeight >= c.scrollHeight - 2
            if (dy > 0 && !atBottom) return   // desplazando hacia abajo dentro del contenido
            if (dy < 0 && !atTop)    return   // desplazando hacia arriba dentro del contenido
          }
        }
        dy > 0 ? next() : prev()
      }
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend',   onEnd)
    }
  }, [next, prev])

  const pct = sections.length > 1 ? (cur / (sections.length - 1)) * 100 : 100
  const icons = Object.fromEntries(sections.map(s => [s.id, s.icon]))

  return (
    <div id="app" className={className}>
      <ProgBar pct={pct} />
      {musica?.youtube
        ? <YoutubeBtn videoId={musica.youtube} />
        : musica?.length > 0 && <AudioBtn tracks={musica} />}
      {children}
      <NavDots sections={sections} cur={cur} onGo={goTo} icons={icons} />
      <NavArrows cur={cur} total={sections.length} onPrev={prev} onNext={next} />
      <AutoPlayBtn active={autoPlay} onToggle={() => setAutoPlay(p => !p)} />

      {sections.map((sec, i) => {
        const { id, Component, bg, ov } = sec
        let cls = 'sec'
        if (i === cur)    cls += ' active'
        if (i === exitIdx) cls += ' exiting'
        return (
          <section key={id} className={cls} id={id} data-label={sec.label}>
            <div className="sec-bg" style={{ backgroundImage: `url('${bg}')`, backgroundPosition: sec.pos }} />
            {sec.panel && <img className="sec-foto" src={bg} alt="" draggable="false" decoding="async" fetchPriority={i === 0 ? 'high' : 'auto'} style={{ objectPosition: sec.pos }} />}
            <div className="sec-ov" style={{ background: ov }} />
            <div className="sec-c">
              <Component tipo={tipo} onToast={showToast} onGoTo={goToId} />
            </div>
          </section>
        )
      })}

      <Toast ref={toastRef} />
    </div>
  )
}
