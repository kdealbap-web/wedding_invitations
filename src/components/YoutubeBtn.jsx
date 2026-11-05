import { useState, useRef, useEffect } from 'react'

// ─── Música desde YouTube ───
// Reproductor oculto de 1×1 con la IFrame API. Los navegadores bloquean el
// audio con sonido hasta que haya un gesto, así que arranca en la primera
// interacción (toque, clic, tecla). Si la API no carga (bloqueador de anuncios,
// sin red), no se monta ningún botón y no hay errores.
let apiLista = null
const cargarApi = () => {
  if (apiLista) return apiLista
  apiLista = new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT)
    const previa = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { previa?.(); resolve(window.YT) }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.onerror = () => { apiLista = null; reject(new Error('yt')) }
    document.head.appendChild(s)
    setTimeout(() => reject(new Error('yt')), 8000)
  })
  return apiLista
}

export default function YoutubeBtn({ videoId }) {
  const [listo, setListo] = useState(false)
  const [on, setOn] = useState(true)       // el invitado quiere sonido
  const [sonando, setSonando] = useState(false)
  const player = useRef(null)
  const host = useRef(null)
  const onRef = useRef(true)

  useEffect(() => {
    let vivo = true
    cargarApi().then(YT => {
      if (!vivo || !host.current) return
      player.current = new YT.Player(host.current, {
        width: 1, height: 1, videoId,
        playerVars: { loop: 1, playlist: videoId, playsinline: 1, controls: 0, disablekb: 1, fs: 0, rel: 0 },
        events: {
          onReady: () => vivo && setListo(true),
          onStateChange: e => vivo && setSonando(e.data === 1),
          onError: () => vivo && setListo(false),
        },
      })
    }).catch(() => {})
    return () => { vivo = false; try { player.current?.destroy() } catch { /* nada */ } }
  }, [videoId])

  // Si el primer toque (p. ej. el sello del sobre) llegó antes de que el
  // reproductor estuviera listo, se recuerda: ya hay activación del usuario y
  // al estar listo puede sonar sin esperar a otro gesto.
  const gesto = useRef(false)
  useEffect(() => {
    const evs = ['pointerdown', 'keydown', 'touchend']
    const marca = () => { gesto.current = true }
    evs.forEach(e => window.addEventListener(e, marca, { once: true }))
    return () => evs.forEach(e => window.removeEventListener(e, marca))
  }, [])

  // Primer gesto del invitado → empieza
  useEffect(() => {
    if (!listo) return
    if (gesto.current) { if (onRef.current) try { player.current.playVideo() } catch { /* nada */ } return }
    const evs = ['pointerdown', 'keydown', 'touchend']
    const start = (e) => {
      if (e.target.closest?.('#audio-btn')) return   // ese toque ya es pausa/play
      cleanup()
      if (onRef.current) try { player.current.playVideo() } catch { /* nada */ }
    }
    const cleanup = () => evs.forEach(e => window.removeEventListener(e, start))
    evs.forEach(e => window.addEventListener(e, start))
    return cleanup
  }, [listo])

  const toggle = (e) => {
    e.stopPropagation()
    try {
      if (on) { player.current.pauseVideo() } else { player.current.playVideo() }
    } catch { /* nada */ }
    onRef.current = !on
    setOn(!on)
  }

  return (
    <>
      <div style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none', left: 0, bottom: 0, overflow: 'hidden' }} aria-hidden="true"><div ref={host} /></div>
      {listo && <button
        id="audio-btn"
        className={`visible${on && sonando ? ' playing' : ''}`}
        aria-label={on ? 'Pausar música' : 'Reproducir música'}
        title={on ? 'Pausar música' : 'Reproducir música'}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
          {!on && <line x1="2" y1="2" x2="22" y2="22" />}
        </svg>
      </button>}
    </>
  )
}
