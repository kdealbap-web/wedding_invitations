import { useState, useRef, useEffect } from 'react'

const PLAYLIST = [
  '/audio/perfect.mp3',
  '/audio/all_of_me.mp3',
]

export default function AudioBtn() {
  // `on` = el usuario quiere sonido (arranca en true → intenta autoplay)
  // `started` = el audio realmente está sonando
  const [on, setOn] = useState(true)
  const [started, setStarted] = useState(false)
  const trackIdx = useRef(0)
  const audioRef = useRef(null)

  const play = () => {
    const a = audioRef.current
    if (!a) return Promise.reject()
    if (!a.src) a.src = PLAYLIST[trackIdx.current]
    return a.play().then(() => setStarted(true))
  }

  // Autoplay al cargar. Los navegadores (sobre todo móviles) bloquean el
  // audio con sonido hasta que haya una interacción; si falla, reintentamos
  // en el primer gesto del usuario (toque, clic, tecla o scroll).
  useEffect(() => {
    let removed = false
    const start = () => { play().catch(() => {}); cleanup() }
    const cleanup = () => {
      if (removed) return
      removed = true
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      window.removeEventListener('touchstart', start)
      window.removeEventListener('wheel', start)
    }

    play().catch(() => {
      window.addEventListener('pointerdown', start)
      window.addEventListener('keydown', start)
      window.addEventListener('touchstart', start)
      window.addEventListener('wheel', start, { passive: true })
    })

    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (on) {
      a.pause()
      setOn(false)
      setStarted(false)
    } else {
      play().catch(() => {})
      setOn(true)
    }
  }

  const onEnded = () => {
    trackIdx.current = (trackIdx.current + 1) % PLAYLIST.length
    const a = audioRef.current
    if (!a) return
    a.src = PLAYLIST[trackIdx.current]
    a.play().catch(() => {})
  }

  // El aviso aparece cuando queremos música pero aún no ha empezado
  const showHint = on && !started

  return (
    <>
      <audio ref={audioRef} id="bgMusic" onEnded={onEnded} preload="auto" />
      <button
        id="audio-btn"
        className={`visible${on ? ' playing' : ''}`}
        aria-label={on ? 'Silenciar música' : 'Activar música'}
        title={on ? 'Silenciar música' : 'Activar música'}
        onClick={toggle}
      >
        {/* Nota musical */}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
          {/* línea de "silenciado" cuando está apagada */}
          {!on && <line x1="2" y1="2" x2="22" y2="22" />}
        </svg>
      </button>
      {showHint && (
        <button className="audio-hint" onClick={() => { play().catch(() => {}); setOn(true) }}>
          <span className="audio-hint-dot" aria-hidden="true" />
          Toca para escuchar la música
        </button>
      )}
    </>
  )
}
