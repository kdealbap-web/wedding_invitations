import { useState, useEffect, useRef } from 'react'

const TARGET = new Date('2026-09-12T23:30:00Z')

function compute() {
  const diff = TARGET - new Date()
  if (diff <= 0) return { d: '000', h: '00', m: '00', s: '00' }
  return {
    d: String(Math.floor(diff / 86400000)).padStart(3, '0'),
    h: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0'),
    m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
    s: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'),
  }
}

function FlipNumber({ value }) {
  const ref  = useRef(null)
  const prev = useRef(value)

  useEffect(() => {
    if (!ref.current || prev.current === value) return
    prev.current = value
    ref.current.classList.add('anim')
    const t = setTimeout(() => ref.current?.classList.remove('anim'), 110)
    return () => clearTimeout(t)
  }, [value])

  return <div className="flip-num num" ref={ref}>{value}</div>
}

export default function Countdown() {
  const [time, setTime] = useState(compute)

  useEffect(() => {
    const id = setInterval(() => setTime(compute()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="section" data-od-id="countdown" style={{ background: 'var(--surface-alt)', textAlign: 'center' }}>
      <div className="container">
        <p className="eyebrow reveal">Faltan…</p>
        <div className="countdown-wrap reveal reveal-d1">
          <div className="flip-unit"><FlipNumber value={time.d} /><span className="flip-label">Días</span></div>
          <span className="flip-sep" aria-hidden="true">:</span>
          <div className="flip-unit"><FlipNumber value={time.h} /><span className="flip-label">Horas</span></div>
          <span className="flip-sep" aria-hidden="true">:</span>
          <div className="flip-unit"><FlipNumber value={time.m} /><span className="flip-label">Minutos</span></div>
          <span className="flip-sep" aria-hidden="true">:</span>
          <div className="flip-unit"><FlipNumber value={time.s} /><span className="flip-label">Segundos</span></div>
        </div>
        <p className="meta reveal reveal-d2" style={{ marginTop: 'var(--gap-xl)' }}>
          12 de Septiembre de 2026 · 6:30 PM · Barranquilla, Colombia
        </p>
      </div>
    </section>
  )
}
