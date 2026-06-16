import { useState, useRef, useEffect } from 'react'

const PLAYLIST = [
  '/audio/perfect.mp3',
  '/audio/all_of_me.mp3',
]

export default function AudioBtn() {
  // `on` = el usuario quiere sonido. Arranca en true → intenta autoplay.
  const [on, setOn] = useState(true)
  const trackIdx = useRef(0)
  const audioRef = useRef(null)

  const play = () => {
    const a = audioRef.current
    if (!a) return Promise.reject()
    if (!a.src) a.src = PLAYLIST[trackIdx.current]
    return a.play()
  }

  // Autoplay al cargar. Los navegadores bloquean el audio con sonido
  // hasta que haya una interacción, así que si falla reintentamos en
  // el primer gesto del usuario (toque, clic, tecla o scroll).
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
    </>
  )
}
