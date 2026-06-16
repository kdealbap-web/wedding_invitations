import { useState, useEffect } from 'react'
import { useGuest } from '../GuestContext'
import { logoWedding } from '../assets/images'

const TARGET = new Date('2026-09-12T23:30:00Z')
function pad(n) { return String(n).padStart(2, '0') }
function compute() {
  const diff = Math.max(0, TARGET - Date.now()), ts = Math.floor(diff / 1000)
  return { d: pad(Math.floor(ts / 86400)), h: pad(Math.floor(ts / 3600) % 24), m: pad(Math.floor(ts / 60) % 60), s: pad(ts % 60) }
}

export default function S1Hero() {
  const { nombre, members } = useGuest()
  const cupos = members.length
  const [cd, setCd] = useState(compute)
  useEffect(() => {
    const id = setInterval(() => setCd(compute()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <img src={logoWedding} alt="Kevin & Angely" className="logo-boda" style={{ marginBottom: '.2rem' }} />
      <p className="hero-nuestraboda">Nuestra Boda</p>
      {nombre && (
        <div className="hero-invite">
          <span className="hero-invite-para">Esta invitación es para</span>
          <span className="hero-invite-name">{nombre}</span>
{/*           {cupos > 0 && (
            <span className="hero-invite-cupos" title={cupos === 1 ? '1 cupo' : `${cupos} cupos`}>
              <b className="hero-cupos-n">{cupos}</b>
            </span>
          )} */}
        </div>
      )}
      <h1 className="hero-k">Angely</h1>
      <p className="hero-amp">&amp;</p>
      <h1 className="hero-a">Kevin</h1>
      <div style={{ margin: '.3rem 0', opacity: '.5' }} aria-hidden="true">
        <svg viewBox="0 0 52 18" width="52" height="18" fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="1.5">
          <circle cx="15" cy="9" r="7" /><circle cx="37" cy="9" r="7" />
        </svg>
      </div>
      <p className="hero-date">12 de Septiembre · 2026</p>
      <div className="hero-cd">
        <span className="hero-cd-unit"><span className="hero-cd-n">{cd.d}</span><span className="hero-cd-l">días</span></span>
        <span className="hero-cd-sep">·</span>
        <span className="hero-cd-unit"><span className="hero-cd-n">{cd.h}</span><span className="hero-cd-l">hrs</span></span>
        <span className="hero-cd-sep">·</span>
        <span className="hero-cd-unit"><span className="hero-cd-n">{cd.m}</span><span className="hero-cd-l">min</span></span>
        <span className="hero-cd-sep">·</span>
        <span className="hero-cd-unit"><span className="hero-cd-n">{cd.s}</span><span className="hero-cd-l">seg</span></span>
      </div>
      <p className="hero-verse">
        "El amor es paciente, es bondadoso… todo lo soporta, todo lo espera."
        <cite style={{ fontSize: '.8em', opacity: '.65', marginTop: '.3rem', display: 'block' }}>1 Corintios 13:4-7</cite>
      </p>
      {/* <div className="hero-scroll" aria-hidden="true">
        <span>Desliza</span>
        <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
      </div> */}
    </>
  )
}
