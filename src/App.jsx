import { useState, useEffect, useRef, useCallback } from 'react'
import { GuestProvider, useGuest } from './GuestContext'
import { p5810, p5722, p5651, p5787, p5887, p5783, p5927, p5807, p5824, p5842, p5762, p5860 } from './assets/images'
import ProgBar     from './components/ProgBar'
import AudioBtn    from './components/AudioBtn'
import NavDots     from './components/NavDots'
import NavArrows   from './components/NavArrows'
import PetalRain   from './components/PetalRain'
import Toast       from './components/Toast'
import AutoPlayBtn from './components/AutoPlayBtn'
import S1Hero      from './sections/S1Hero'
import S2Gallery   from './sections/S2Gallery'
import S3Historia  from './sections/S3Historia'
import S4SaveDate  from './sections/S4SaveDate'
import S5Ceremony  from './sections/S5Ceremony'
import S5Reception from './sections/S5Reception'
import S6DressF    from './sections/S6DressF'
import S7DressM    from './sections/S7DressM'
import S8Info      from './sections/S8Info'
import S9Gifts     from './sections/S9Gifts'
import S10Rsvp     from './sections/S10Rsvp'
import S11Parents  from './sections/S11Parents'
import S12Final    from './sections/S12Final'

const ALL_SECTIONS = [
  { id: 's1',  Component: S1Hero,     label: 'Inicio',
    bg: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=80&auto=format&fit=crop',
    ov: 'linear-gradient(to bottom,rgba(0,0,0,.18) 0%,rgba(0,0,0,.03) 45%,rgba(0,0,0,.40) 100%)' },
  { id: 's11', Component: S11Parents, label: 'Nuestros padres',
    bg: p5824,
    ov: 'linear-gradient(to bottom,rgba(0,0,0,.52),rgba(0,0,0,.62))' },
  { id: 's2',  Component: S2Gallery,  label: 'Nuestra galería',
    bg: p5810,
    ov: 'linear-gradient(160deg,rgba(8,4,1,.52),rgba(12,6,2,.58))' },
  { id: 's3',  Component: S3Historia, label: 'Nuestra historia',
    bg: p5722,
    ov: 'linear-gradient(130deg,rgba(8,4,1,.48) 0%,rgba(8,4,1,.34) 100%)' },
  { id: 's4',  Component: S4SaveDate, label: 'Guarda la fecha',
    bg: p5807,
    ov: 'linear-gradient(to bottom,rgba(0,0,0,.18),rgba(0,0,0,.38))' },
  { id: 's5',  Component: S5Ceremony,  label: 'Ceremonia',
    bg: p5651,
    ov: 'rgba(5,3,1,.38)' },
  { id: 's5b', Component: S5Reception, label: 'Recepción',
    bg: p5762,
    ov: 'linear-gradient(160deg,rgba(6,3,1,.38),rgba(12,6,2,.42))' },
  { id: 's6',  Component: S6DressF,   label: 'Ellas · Vestimenta',
    bg: p5783,
    ov: 'linear-gradient(140deg,rgba(8,4,1,.40),rgba(12,6,2,.48))' },
  { id: 's7',  Component: S7DressM,   label: 'Ellos · Vestimenta',
    bg: p5927,
    ov: 'linear-gradient(140deg,rgba(6,4,2,.40),rgba(10,6,3,.48))' },
  { id: 's8',  Component: S8Info,     label: 'Solo adultos',
    bg: p5860,
    ov: 'linear-gradient(150deg,rgba(8,4,1,.50),rgba(14,7,3,.56))' },
  { id: 's9',  Component: S9Gifts,    label: 'Regalos',
    bg: p5787,
    ov: 'linear-gradient(160deg,rgba(10,6,2,.52),rgba(18,10,3,.56))' },
  { id: 's10', Component: S10Rsvp,    label: 'Confirma tu asistencia',
    bg: p5842,
    ov: 'linear-gradient(160deg,rgba(8,4,1,.38),rgba(16,8,3,.45))' },
  { id: 's12', Component: S12Final,   label: 'Cierre',
    bg: p5887,
    ov: 'linear-gradient(to bottom,rgba(0,0,0,.22),rgba(0,0,0,.06) 40%,rgba(0,0,0,.52))' },
]

const NAV_ICONS = {
  s1:  '<path d="M5 3a2 2 0 0 0 0 4h14a2 2 0 0 0 0-4M5 7v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7"/><path d="M10 11h4"/>',
  s2:  '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  s3:  '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  s4:  '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/>',
  s5:  '<line x1="12" y1="2" x2="12" y2="22"/><line x1="5" y1="8" x2="19" y2="8"/>',
  s5b: '<path d="M8 3h8l-2 9a4 4 0 0 1-8 0L8 3z"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/>',
  s6:  '<path d="M12 2c-2 0-4 1-4 4v1l-3 14h14l-3-14V6c0-3-2-4-4-4z"/>',
  s7:  '<path d="M12 2L8 6l4 2 4-2-4-4z"/><path d="M8 6l-4 1v14h16V7l-4-1"/><line x1="12" y1="8" x2="12" y2="20"/>',
  s8:  '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r=".5" fill="white"/>',
  s9:  '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M9 8V6a2 2 0 0 1 4 0v2m0 0a2 2 0 0 1 4 0v2"/><line x1="12" y1="8" x2="12" y2="21"/><line x1="3" y1="13" x2="21" y2="13"/>',
  s10: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/>',
  s11: '<circle cx="9" cy="7" r="4"/><circle cx="17" cy="7" r="4"/><path d="M2 21v-2a7 7 0 0 1 7-7"/><path d="M22 21v-2a7 7 0 0 0-7-7"/>',
  s12: '<path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>',
}

function AppInner() {
  const { tipo }        = useGuest()
  const [cur, setCur]   = useState(0)
  const [exitIdx, setExitIdx] = useState(null)
  const [autoPlay, setAutoPlay] = useState(false)
  const transitioning   = useRef(false)
  const toastRef        = useRef(null)
  const touchStart      = useRef({ x: 0, y: 0 })

  const sections = ALL_SECTIONS.filter(s => {
    if (tipo === 'recepcion' && (s.id === 's4' || s.id === 's5')) return false
    return true
  })

  const goTo = useCallback((idx) => {
    if (transitioning.current || idx < 0 || idx >= sections.length) return
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
  }, [sections.length])

  const goToId = useCallback((id) => {
    const idx = sections.findIndex(s => s.id === id)
    if (idx !== -1) goTo(idx)
  }, [sections, goTo])

  const showToast = useCallback((msg) => {
    toastRef.current?.show(msg)
  }, [])

  // Auto-play: advances every 5s, loops back to slide 0
  useEffect(() => {
    if (!autoPlay) return
    const id = setTimeout(() => goTo((cur + 1) % sections.length), 5000)
    return () => clearTimeout(id)
  }, [autoPlay, cur, sections.length, goTo])

  // Navegación circular (loop): el último vuelve al primero y viceversa
  const next = useCallback(() => goTo((cur + 1) % sections.length), [cur, goTo, sections.length])
  const prev = useCallback(() => goTo((cur - 1 + sections.length) % sections.length), [cur, goTo, sections.length])

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
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

  return (
    <div id="app">
      <ProgBar pct={pct} />
      <AudioBtn />
      <PetalRain />
      <NavDots sections={sections} cur={cur} onGo={goTo} icons={NAV_ICONS} />
      <NavArrows cur={cur} total={sections.length} onPrev={prev} onNext={next} />
      <AutoPlayBtn active={autoPlay} onToggle={() => setAutoPlay(p => !p)} />

      {sections.map((sec, i) => {
        const { id, Component, bg, ov } = sec
        let cls = 'sec'
        if (i === cur)    cls += ' active'
        if (i === exitIdx) cls += ' exiting'
        return (
          <section key={id} className={cls} id={id} data-label={sec.label}>
            <div className="sec-bg" style={{ backgroundImage: `url('${bg}')` }} />
            <div className="sec-ov" style={{ background: ov }} />
            <div className="sec-c">
              <Component
                tipo={tipo}
                onToast={showToast}
                onGoTo={goToId}
              />
            </div>
          </section>
        )
      })}

      <Toast ref={toastRef} />
    </div>
  )
}

export default function App() {
  return (
    <GuestProvider>
      <AppInner />
    </GuestProvider>
  )
}
