import { useState, useRef } from 'react'

const PLAYLIST = [
  '/audio/perfect.mp3',
  '/audio/all_of_me.mp3',
]

export default function AudioBtn() {
  const [playing, setPlaying] = useState(false)
  const [trackIdx, setTrackIdx] = useState(0)
  const audioRef = useRef(null)

  const play = (src) => {
    const a = audioRef.current
    if (!a) return
    a.src = src
    a.play().catch(() => {})
  }

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      play(PLAYLIST[trackIdx])
      setPlaying(true)
    }
  }

  const onEnded = () => {
    const next = (trackIdx + 1) % PLAYLIST.length
    setTrackIdx(next)
    play(PLAYLIST[next])
  }

  return (
    <>
      <audio ref={audioRef} id="bgMusic" onEnded={onEnded} preload="none" />
      <button id="audio-btn" className="visible" aria-label="Música" onClick={toggle}>
        {!playing
          ? <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          : <svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        }
      </button>
    </>
  )
}
