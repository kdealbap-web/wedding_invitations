import { useState, useEffect } from 'react'
import { useGuest } from '../../invitacion/GuestContext'
import Rsvp from '../../invitacion/Rsvp'
import { fechaLarga, fechaCorta, googleCalUrl, descargarIcs } from '../../invitacion/fechas'
import { useFoto } from './fotos'

// ─── Secciones de la plantilla de quinceañera (carpeta «xv») ───
// Todo el contenido sale de event.config (ver 008_multi_evento.sql): nada de
// esto lleva texto de un evento concreto, así que otro XV solo cambia su config.

const useConfig = () => {
  const { event } = useGuest()
  return { event, cfg: event?.config || {} }
}

const Orn = () => (
  <div className="div-orn"><div className="div-line" /><div className="div-dot" /><div className="div-line" /></div>
)

// Corona en trazo de oro rosa; el degradado #xv-metal se define en XDecoracion
const Corona = () => (
  <svg className="xv-corona" viewBox="0 0 64 40" aria-hidden="true">
    <path d="M6 32 4 12l14 10L32 6l14 16 14-10-2 20z" />
    <path d="M6 37h52" />
    <circle cx="4" cy="9" r="2" /><circle cx="32" cy="3.5" r="2" /><circle cx="60" cy="9" r="2" />
  </svg>
)

// ─── Decoración fija: marco, filigrana en las esquinas y destellos ───
const ESQUINA = 'M3 44V9q0-6 6-6h35M11 38V15q0-4 4-4h23M20 20q7 0 7 7 0 6-6 6-5 0-5-5 0-4 4-4'
const CHISPAS = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 37 + 11) % 97, y: (i * 53 + 7) % 93,
  s: 5 + (i * 7) % 8, d: 3.2 + (i * 13) % 40 / 10, t: ((i * 29) % 50) / 10,
}))

export function XDecoracion() {
  return (
    <div className="xv-deco" aria-hidden="true">
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="xv-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8c4a46" /><stop offset=".4" stopColor="#bd7b73" />
            <stop offset=".6" stopColor="#d79a8d" /><stop offset=".85" stopColor="#a2605a" />
            <stop offset="1" stopColor="#8c4a46" />
          </linearGradient>
        </defs>
      </svg>
      <div className="xv-marco" />
      {[0, 1, 2, 3].map(i => (
        <svg key={i} className={`xv-esq xv-esq${i}`} viewBox="0 0 48 48"><path d={ESQUINA} /></svg>
      ))}
      {CHISPAS.map((c, i) => (
        <span key={i} className="xv-chispa" style={{ left: c.x + '%', top: c.y + '%', width: c.s, height: c.s, animationDuration: c.d + 's', animationDelay: c.t + 's' }} />
      ))}
    </div>
  )
}

// ─── Hero ───
const partes = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 }
}

function useCuentaRegresiva(iso) {
  const meta = iso ? new Date(iso).getTime() : null
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    if (!meta) return
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [meta])
  return meta ? partes(meta - ahora) : null
}

export function XHero() {
  const { event, cfg } = useConfig()
  const cd = useCuentaRegresiva(event?.fecha)
  const nombre = cfg.nombre_corto || cfg.anfitrion
  return (
    <>
      <Corona />
      <p className="xv-eyebrow">Te invito a celebrar</p>
      <h1 className="xv-titulo">{(cfg.titulo || event?.titulo || '').split(/(d+)/).map((t, i) => (i % 2 ? <span key={i} className="xv-num">{t}</span> : t))}</h1>
      <p className="xv-nombre">{nombre}</p>
      {cfg.anfitrion && cfg.anfitrion !== nombre && <p className="xv-apellido">{cfg.anfitrion}</p>}
      <Orn />
      {event?.fecha && (
        <p className="xv-fecha">{fechaLarga(event.fecha)}{cfg.hora_texto ? ` · ${cfg.hora_texto}` : ''}</p>
      )}
      {cd && (
        <div className="xv-cd" aria-label="Cuenta regresiva">
          {[['d', 'días'], ['h', 'horas'], ['m', 'min'], ['s', 'seg']].map(([k, l]) => (
            <div key={k} className="xv-cd-i">
              <b>{String(cd[k]).padStart(2, '0')}</b>
              <span>{l}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Mensaje ───
export function XMensaje() {
  const { cfg } = useConfig()
  return (
    <>
      <p className="xv-eyebrow">Un mensaje para ti</p>
      <Orn />
      <blockquote className="xv-cita">{cfg.mensaje}</blockquote>
    </>
  )
}

// ─── Invitación exclusiva ───
export function XExclusiva() {
  const { nombre, members, cupos } = useGuest()
  const n = cupos || members.length
  return (
    <>
      <p className="xv-eyebrow">Invitación exclusiva</p>
      <p className="xv-invitado">{nombre}</p>
      {n > 0 && (
        <div className="xv-cupos">
          <b>{n}</b>
          <span>{n === 1 ? 'Persona' : 'Personas'}</span>
        </div>
      )}
      {members.length > 0 && (
        <ul className="xv-miembros">
          {members.map(m => <li key={m.id}>{m.name}</li>)}
        </ul>
      )}
    </>
  )
}

// ─── Detalles ───
export function XDetalles({ onToast }) {
  const { event, cfg } = useConfig()
  const l = cfg.lugar || {}
  const dir = [l.nombre, l.salon, l.direccion].filter(Boolean).join(', ')
  const cal = {
    titulo: event?.titulo || '', iso: event?.fecha, horas: 4, lugar: dir,
    detalle: [cfg.hora_texto && `Hora: ${cfg.hora_texto}`, l.salon && `${l.nombre} · ${l.salon}`].filter(Boolean).join('\n'),
  }
  return (
    <>
      <p className="xv-eyebrow">Los detalles</p>
      <Orn />
      <div className="xv-detalles">
        <div className="xv-det">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <p className="xv-det-r">Fecha</p>
          <p className="xv-det-t">{fechaLarga(event?.fecha)}</p>
          {cfg.hora_texto && <p className="xv-det-h">{cfg.hora_texto}</p>}
        </div>
        <div className="xv-det">
          <svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
          <p className="xv-det-r">Lugar</p>
          <p className="xv-det-t">{l.nombre}</p>
          {l.salon && <p className="xv-det-s">{l.salon}</p>}
          {l.direccion && <p className="xv-det-d">{l.direccion}</p>}
        </div>
      </div>
      <div className="xv-botones">
        {l.maps && (
          <a className="btn btn-acc" href={l.maps} target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>
            Cómo llegar
          </a>
        )}
        {event?.fecha && (
          <>
            <a className="btn btn-ghost" href={googleCalUrl(cal)} target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M12 14v4M10 16h4"/></svg>
              Google Calendar
            </a>
            <button type="button" className="btn btn-ghost" onClick={() => { descargarIcs({ ...cal, archivo: `${event.slug}.ics` }); onToast?.('Evento descargado') }}>
              <svg viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>
              Añadir al calendario
            </button>
          </>
        )}
      </div>
      {event?.fecha && <p className="xv-nota">{fechaCorta(event.fecha)} · añádelo para no olvidarlo</p>}
    </>
  )
}

// ─── Código de vestuario ───
export function XVestuario() {
  const { cfg } = useConfig()
  const v = cfg.vestuario || {}
  return (
    <>
      <p className="xv-eyebrow">Código de vestuario</p>
      <h2 className="sec-title" style={{ textAlign: 'center' }}>{v.etiqueta}</h2>
      <Orn />
      <div className="xv-detalles">
        {v.caballeros && (
          <div className="xv-det">
            <svg viewBox="0 0 24 24"><path d="M12 2L8 6l4 2 4-2-4-4z"/><path d="M8 6l-4 1v14h16V7l-4-1"/><line x1="12" y1="8" x2="12" y2="20"/></svg>
            <p className="xv-det-s">Caballeros</p>
            <p className="xv-det-t">{v.caballeros}</p>
          </div>
        )}
        {v.damas && (
          <div className="xv-det">
            <svg viewBox="0 0 24 24"><path d="M12 2c-2 0-4 1-4 4v1l-3 14h14l-3-14V6c0-3-2-4-4-4z"/></svg>
            <p className="xv-det-s">Damas</p>
            <p className="xv-det-t">{v.damas}</p>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Tonos reservados ───
export function XTonos() {
  const { cfg } = useConfig()
  const t = cfg.tonos_reservados || {}
  return (
    <>
      <h2 className="sec-title" style={{ textAlign: 'center' }}>Tonos reservados</h2>
      <Orn />
      <div className="xv-tonos">
        {(t.colores || []).map(c => (
          <div key={c.hex} className="xv-tono">
            <span className="xv-tono-c" style={{ background: c.hex }} />
            <span className="xv-tono-n">{c.nombre}</span>
            <span className="xv-tono-h">{c.hex}</span>
          </div>
        ))}
      </div>
      {t.nota && <p className="xv-texto">{t.nota}</p>}
    </>
  )
}

// ─── Solo jóvenes y adultos ───
export function XRestriccion() {
  const { cfg } = useConfig()
  const r = cfg.restriccion || {}
  return (
    <>
      <p className="xv-eyebrow">Un detalle importante</p>
      <h2 className="sec-title" style={{ textAlign: 'center' }}>{r.titulo}</h2>
      <Orn />
      <div className="xv-tarjeta">
        <svg viewBox="0 0 24 24"><circle cx="8" cy="7" r="3"/><path d="M3 20c0-3.3 2.2-6 5-6"/><circle cx="16" cy="7" r="3"/><path d="M21 20c0-3.3-2.2-6-5-6"/></svg>
        <p>{r.texto}</p>
      </div>
    </>
  )
}

// ─── Lluvia de sobres ───
export function XRegalos() {
  const { cfg } = useConfig()
  const r = cfg.regalos || {}
  return (
    <>
      <p className="xv-eyebrow">Un detalle</p>
      <h2 className="sec-title" style={{ textAlign: 'center' }}>{r.titulo}</h2>
      <Orn />
      <div className="xv-tarjeta">
        <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
        <p>{r.texto}</p>
      </div>
    </>
  )
}

// ─── RSVP ───
export function XRsvp({ onToast }) {
  const foto = useFoto('retrato')
  return <Rsvp onToast={onToast} foto={foto} />
}

// ─── Guarda la fecha: solo la foto, entera ───
// El texto va en la imagen misma; aquí solo un pie discreto.
export function XGuarda() {
  return <p className="xv-guarda">Guarda la fecha</p>
}

// ─── Cierre ───
export function XCierre() {
  const { event, cfg } = useConfig()
  return (
    <>
      <p className="xv-eyebrow">Gracias</p>
      <p className="xv-cierre">{cfg.cierre}</p>
      <Orn />
      <div className="xv-mono"><span>{(cfg.nombre_corto || cfg.anfitrion || '').trim()[0]}</span></div>
      <p className="xv-apellido">{event?.fecha ? fechaLarga(event.fecha) : ''}</p>
    </>
  )
}
