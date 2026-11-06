import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { manifiestoDe, urlFoto } from '../eventos/xv/fotos'

// ─── Fotos de cada diapositiva ───
// El admin del evento sube su foto; va a R2 por el Worker (worker/index.js) y en
// el config queda { fotos: { x10: { key, pos } } }. La diapositiva sin foto subida
// sigue con la del manifiesto. Tocar la miniatura elige qué punto queda al centro
// del recorte en el celular (la foto va a sangre con cover).
const API = import.meta.env.DEV ? 'https://invitation.kdealbap.com' : ''
const LADO = 2000

// Una foto de celular pesa 5-10 MB: se reduce antes de subir. <img> ya aplica la
// rotación EXIF al dibujar, y Safari abre HEIC.
function reducir(file) {
  return new Promise((ok, mal) => {
    const img = new Image()
    const src = URL.createObjectURL(file)
    img.onload = () => {
      const k = Math.min(1, LADO / Math.max(img.naturalWidth, img.naturalHeight))
      const c = document.createElement('canvas')
      c.width = Math.round(img.naturalWidth * k)
      c.height = Math.round(img.naturalHeight * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(src)
      c.toBlob(b => b ? ok(b) : mal(new Error('No se pudo procesar la foto')), 'image/jpeg', 0.82)
    }
    img.onerror = () => { URL.revokeObjectURL(src); mal(new Error('Ese archivo no es una foto que el navegador pueda abrir')) }
    img.src = src
  })
}

export async function borrarFoto(eventoId, key) {
  const { data: { session } } = await supabase.auth.getSession()
  await fetch(`${API}/api/fotos?evento=${eventoId}&key=${encodeURIComponent(key)}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${session?.access_token}` },
  }).catch(() => {})
}

export default function FotosEvento({ evento, fotos = {}, onChange }) {
  const man = manifiestoDe(evento.slug)
  const diapos = Object.keys(man?.fondos || {}).sort((a, b) => a.slice(1) - b.slice(1))
  const [subiendo, setSubiendo] = useState(null)
  const [error, setError] = useState('')
  const input = useRef(null)
  const destino = useRef(null)

  const poner = (id, valor) => {
    const n = { ...fotos }
    if (valor) n[id] = valor; else delete n[id]
    onChange(Object.keys(n).length ? n : null)
  }

  const elegir = (id) => { destino.current = id; setError(''); input.current.click() }

  const subir = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const id = destino.current
    if (!file || !id) return
    setSubiendo(id)
    try {
      const blob = await reducir(file)
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(`${API}/api/fotos?evento=${evento.id}&diapo=${id}`, {
        method: 'PUT', body: blob,
        headers: { 'Content-Type': 'image/jpeg', Authorization: `Bearer ${session?.access_token}` },
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.key) throw new Error(j.error || `No se pudo subir (${r.status})`)
      // Si reemplaza una subida que aún no se guardó, esa ya no la usa nadie
      const previa = fotos[id]?.key
      if (previa && previa !== evento.config?.fotos?.[id]?.key) borrarFoto(evento.id, previa)
      poner(id, { key: j.key, pos: '50% 30%' })
    } catch (err) { setError(err.message) }
    setSubiendo(null)
  }

  const enfocar = (id, e) => {
    if (!fotos[id]) return
    const b = e.currentTarget.getBoundingClientRect()
    const pct = (v) => Math.round(Math.min(100, Math.max(0, v * 100)))
    poner(id, { ...fotos[id], pos: `${pct((e.clientX - b.left) / b.width)}% ${pct((e.clientY - b.top) / b.height)}%` })
  }

  if (!diapos.length) return null
  return (
    <>
      <h3 style={{ margin: '1.5rem 0 .4rem', color: '#e2e8f0', fontSize: '1rem' }}>Fotos de la invitación</h3>
      <p style={{ fontSize: '.78rem', color: '#64748b', marginBottom: '.75rem' }}>
        «Cambiar» sube una foto tuya. Después toca la cara en la miniatura: ese punto queda al centro en el celular.
        Los cambios se publican al pulsar «Guardar cambios».
      </p>
      {error && <p className="adm-err" style={{ marginBottom: '.75rem' }}>{error}</p>}
      <input ref={input} type="file" accept="image/*" hidden onChange={subir} />
      <div className="adm-fotos">
        {diapos.map(id => {
          const sub = fotos[id]
          const src = sub?.key ? urlFoto(sub.key) : man.fondos[id].src
          const [x, y] = (sub?.pos || '50% 50%').split(' ')
          return (
            <div key={id} className="adm-foto">
              <div className={`adm-foto-img${sub ? ' tocable' : ''}`} onClick={e => enfocar(id, e)}>
                <img src={src} alt="" loading="lazy" />
                {sub && <span className="adm-foto-punto" style={{ left: x, top: y }} />}
                {subiendo === id && <span className="adm-foto-cargando">Subiendo…</span>}
              </div>
              <div className="adm-foto-pie">
                <span>Diapositiva {id.slice(1)}{sub ? ' · tuya' : ''}</span>
                <button type="button" className="adm-btn adm-btn-ghost" disabled={!!subiendo} onClick={() => elegir(id)}>Cambiar</button>
                {sub && <button type="button" className="adm-btn adm-btn-ghost" disabled={!!subiendo} onClick={() => poner(id, null)} title="Volver a la foto original">↺</button>}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
