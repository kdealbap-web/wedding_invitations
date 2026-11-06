import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useEvent } from './EventContext'
import {
  SLUG_RE, TIPOS_EVENTO, ESTADOS_EVENTO, slugify, utcALocalInput, localInputAUtc,
} from './evento'

const KEY_RE = /^[a-z0-9_-]+$/

// Pasar a cerrado o archivado apaga los links de los invitados.
const AVISO_ESTADO = 'Los links de este evento dejarán de funcionar. ¿Continuar?'

// ─── Lectura y escritura de un camino dentro del config ───
const leer = (obj, ruta) => ruta.split('.').reduce((o, k) => (o == null ? o : o[k]), obj) ?? ''

// Escribe sin tocar el resto: lo que el formulario no conoce se conserva. Un
// valor vacío borra la clave, y un objeto que se queda vacío se va con ella.
function escribir(obj, ruta, valor) {
  const claves = ruta.split('.')
  const copia = structuredClone(obj || {})
  let o = copia
  const pila = []
  for (const k of claves.slice(0, -1)) {
    if (typeof o[k] !== 'object' || o[k] === null || Array.isArray(o[k])) o[k] = {}
    pila.push([o, k]); o = o[k]
  }
  const ultima = claves[claves.length - 1]
  if (valor === '' || valor == null) delete o[ultima]; else o[ultima] = valor
  for (let i = pila.length - 1; i >= 0; i--) {
    const [padre, k] = pila[i]
    if (Object.keys(padre[k]).length === 0) delete padre[k]
  }
  return copia
}

const CAMPOS = [
  ['plantilla',            'Plantilla',               'boda · xv · …'],
  ['anfitrion',            'Anfitrión',               'Mauren Obando Mendoza'],
  ['nombre_corto',         'Nombre corto',            'Mauren'],
  ['hora_texto',           'Hora (texto)',            '7:30 p. m.'],
  ['lugar.nombre',         'Lugar · nombre',          'Hotel El Prado'],
  ['lugar.salon',          'Lugar · salón',           'Salón Magdalena'],
  ['lugar.direccion',      'Lugar · dirección',       ''],
  ['lugar.maps',           'Lugar · link de Maps',    'https://maps.app.goo.gl/…'],
  ['vestuario.etiqueta',   'Vestuario · etiqueta',    'Etiqueta de gala'],
  ['vestuario.caballeros', 'Vestuario · caballeros',  ''],
  ['vestuario.damas',      'Vestuario · damas',       ''],
  ['regalos.titulo',       'Regalos · título',        'Lluvia de sobres'],
  ['restriccion.titulo',   'Restricción · título',    'Solo jóvenes y adultos'],
]
const AREAS = [
  ['mensaje',            'Mensaje'],
  ['regalos.texto',      'Regalos · texto'],
  ['restriccion.texto',  'Restricción · texto'],
  ['cierre',             'Cierre'],
]

export default function EventForm() {
  const navigate = useNavigate()
  const { evento } = useEvent() || {}
  const esNuevo = !evento

  const [titulo, setTitulo]   = useState(evento?.titulo || '')
  const [slug, setSlug]       = useState(evento?.slug || '')
  const [slugTocado, setSlugTocado] = useState(!esNuevo)
  const [tipo, setTipo]       = useState(evento?.tipo || 'otro')
  const [fecha, setFecha]     = useState(utcALocalInput(evento?.fecha))
  const [estado, setEstado]   = useState(evento?.estado || 'borrador')
  const [limite, setLimite]   = useState(evento?.rsvp_limite || '')
  const [tipos, setTipos]     = useState(
    (evento?.invitation_types || [{ key: 'general', label: 'General' }]).map(t => ({ ...t, auto: false })))
  const [cfg, setCfg]         = useState(evento?.config || {})
  const [json, setJson]       = useState(JSON.stringify(evento?.config || {}, null, 2))
  const [jsonErr, setJsonErr] = useState('')
  const [enUso, setEnUso]     = useState({})   // { clave: tarjetas que la usan }
  const [error, setError]     = useState('')
  const [guardando, setGuardando] = useState(false)
  // El admin de un evento (no de la plataforma) solo edita textos: lo demás lo bloquea la 011.
  const [bloq, setBloq]       = useState(false)
  useEffect(() => {
    if (esNuevo) return
    supabase.rpc('es_admin_plataforma').then(({ data, error }) => setBloq(!error && data === false))
  }, [esNuevo])

  // Cuántas tarjetas usa cada tipo: quitar uno en uso las deja huérfanas.
  useEffect(() => {
    if (esNuevo) return
    supabase.from('guests').select('invitation_type').eq('event_id', evento.id).then(({ data }) => {
      const m = {}
      for (const g of data || []) m[g.invitation_type] = (m[g.invitation_type] || 0) + 1
      setEnUso(m)
    })
  }, [esNuevo, evento?.id])

  const cambiarTitulo = (v) => {
    setTitulo(v)
    if (!slugTocado) setSlug(slugify(v))
  }

  const campo = (ruta, v) => {
    const n = escribir(cfg, ruta, v)
    setCfg(n); setJson(JSON.stringify(n, null, 2)); setJsonErr('')
  }

  const cambiarJson = (txt) => {
    setJson(txt)
    try {
      const o = JSON.parse(txt)
      if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('Debe ser un objeto { … }')
      setCfg(o); setJsonErr('')
    } catch (e) { setJsonErr(`JSON inválido: ${e.message}`) }
  }

  const setTipoFila = (i, patch) => setTipos(ts => ts.map((t, j) => j === i ? { ...t, ...patch } : t))
  const quitarTipo = (i) => {
    const t = tipos[i]
    if (enUso[t.key] && !confirm(`${enUso[t.key]} tarjeta(s) usan «${t.key}». Si lo quitas quedarán con un tipo que ya no existe. ¿Quitarlo?`)) return
    setTipos(ts => ts.filter((_, j) => j !== i))
  }
  const cambiarEtiqueta = (i, t, v) => setTipoFila(i, {
    label: v,
    ...(t.auto || !t.key ? { key: slugify(v).replace(/-/g, '_'), auto: true } : {}),
  })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    if (!titulo.trim()) return setError('Falta el título.')
    if (!SLUG_RE.test(slug)) return setError('El slug solo admite minúsculas, números y guiones (ej. xv-mauren).')
    if (jsonErr) return setError('Corrige el JSON avanzado antes de guardar.')
    const lista = tipos.map(t => ({ key: t.key.trim(), label: t.label.trim() }))
    if (!lista.length) return setError('Debe haber al menos un tipo de invitación.')
    if (lista.some(t => !KEY_RE.test(t.key) || !t.label)) return setError('Cada tipo necesita clave (minúsculas, números, - o _) y nombre.')
    if (new Set(lista.map(t => t.key)).size !== lista.length) return setError('Hay claves de tipo repetidas.')

    const huerfanos = Object.entries(enUso).filter(([k, n]) => n > 0 && !lista.some(t => t.key === k))
    if (huerfanos.length && !confirm(
      `Quitaste tipos que usan tarjetas: ${huerfanos.map(([k, n]) => `${k} (${n})`).join(', ')}. Quedarán con un tipo que ya no existe. ¿Guardar igual?`)) return
    if (estado !== evento?.estado && (estado === 'cerrado' || estado === 'archivado') && !confirm(AVISO_ESTADO)) return

    setGuardando(true)
    const fila = {
      slug, tipo, titulo: titulo.trim(), estado,
      fecha: localInputAUtc(fecha),
      rsvp_limite: limite || null,
      invitation_types: lista,
      config: cfg,
    }
    // .select() porque un UPDATE que RLS no deja pasar no da error: toca 0 filas y
    // el panel volvía a la lista como si hubiera guardado.
    const { data, error: err } = esNuevo
      ? await supabase.from('events').insert(fila).select('id')
      : await supabase.from('events').update(fila).eq('id', evento.id).select('id')
    setGuardando(false)
    if (err) return setError(err.code === '23505' ? `Ya existe un evento con el slug «${slug}».` : err.message)
    if (!data?.length) return setError('No se guardó: tu cuenta no tiene permiso para editar este evento.')
    navigate('/admin')
  }

  return (
    <div className="adm-main" style={{ padding: '2rem', maxWidth: 860 }}>
      <div className="adm-page-head">
        <div>
          <h1 className="adm-page-title">{esNuevo ? 'Nuevo evento' : 'Ajustes del evento'}</h1>
          <p className="adm-page-sub">{esNuevo ? 'Se crea en borrador salvo que elijas otro estado' : evento.titulo}</p>
        </div>
        <div className="adm-head-right"><Link className="adm-btn adm-btn-ghost" to="/admin">← Eventos</Link></div>
      </div>

      {error && <p className="adm-err" style={{ marginBottom: '1rem' }}>{error}</p>}

      <form onSubmit={guardar}>
        <div className="adm-ff-row">
          <div className="adm-ff">
            <label>Título</label>
            <input value={titulo} onChange={e => cambiarTitulo(e.target.value)} placeholder="Mis 15 años · Mauren" required autoFocus />
          </div>
          <div className="adm-ff">
            <label>Slug (URL del panel)</label>
            <input
              value={slug} placeholder="xv-mauren" disabled={bloq}
              onChange={e => { setSlugTocado(true); setSlug(e.target.value) }}
              style={slug && !SLUG_RE.test(slug) ? { borderColor: '#f56565' } : undefined}
            />
          </div>
        </div>

        <div className="adm-ff-row">
          <div className="adm-ff">
            <label>Tipo de evento</label>
            <select value={tipo} disabled={bloq} onChange={e => setTipo(e.target.value)}>
              {TIPOS_EVENTO.map(t => <option key={t.key} value={t.key}>{t.lbl}</option>)}
            </select>
          </div>
          <div className="adm-ff">
            <label>Estado</label>
            <select value={estado} disabled={bloq} onChange={e => setEstado(e.target.value)}>
              {Object.entries(ESTADOS_EVENTO).map(([k, v]) => <option key={k} value={k}>{v.lbl} — {v.desc}</option>)}
            </select>
          </div>
        </div>

        <div className="adm-ff-row">
          <div className="adm-ff">
            <label>Fecha y hora (hora de Colombia)</label>
            <input type="datetime-local" value={fecha} disabled={bloq} onChange={e => setFecha(e.target.value)} />
          </div>
          <div className="adm-ff">
            <label>Límite para confirmar (RSVP)</label>
            <input type="date" value={limite} onChange={e => setLimite(e.target.value)} />
          </div>
        </div>

        <div className="adm-ff">
          <label>Tipos de invitación (el primero es el de defecto)</label>
          <fieldset className="adm-members" disabled={bloq} style={{ border: 0, padding: 0, margin: 0 }}>
            {tipos.map((t, i) => (
              <div key={i} className="adm-member-row">
                <input value={t.label} placeholder="Nombre (Adultos)" onChange={e => cambiarEtiqueta(i, t, e.target.value)} />
                <input
                  value={t.key} placeholder="clave" style={{ maxWidth: 160 }}
                  onChange={e => setTipoFila(i, { key: e.target.value, auto: false })}
                />
                {enUso[t.key] > 0 && <span className="badge badge-gray" title="Tarjetas que usan este tipo">{enUso[t.key]} en uso</span>}
                {tipos.length > 1 && (
                  <button type="button" className="adm-ico red" title="Quitar" onClick={() => quitarTipo(i)}>
                    <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="adm-add-member" onClick={() => setTipos(ts => [...ts, { key: '', label: '', auto: true }])}>+ Agregar tipo</button>
          </fieldset>
        </div>

        <h3 style={{ margin: '1.5rem 0 .75rem', color: '#e2e8f0', fontSize: '1rem' }}>Contenido de la invitación</h3>
        <div className="adm-ff-row">
          {CAMPOS.map(([ruta, lbl, ph]) => (
            <div className="adm-ff" key={ruta}>
              <label>{lbl}</label>
              <input value={leer(cfg, ruta)} placeholder={ph} disabled={bloq && ruta === 'plantilla'} onChange={e => campo(ruta, e.target.value)} />
            </div>
          ))}
        </div>
        {AREAS.map(([ruta, lbl]) => (
          <div className="adm-ff" key={ruta}>
            <label>{lbl}</label>
            <textarea value={leer(cfg, ruta)} onChange={e => campo(ruta, e.target.value)} />
          </div>
        ))}

        <details style={{ marginBottom: '1rem' }}>
          <summary style={{ cursor: 'pointer', color: '#94a3b8', marginBottom: '.5rem' }}>Avanzado (JSON)</summary>
          <p style={{ fontSize: '.78rem', color: '#64748b', marginBottom: '.5rem' }}>
            El config completo. Lo que el formulario no conoce (tonos reservados, hashtag…) se conserva al guardar.
          </p>
          <div className="adm-ff">
            <textarea
              value={json} onChange={e => cambiarJson(e.target.value)} spellCheck={false}
              style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '.8rem', minHeight: 260, ...(jsonErr ? { borderColor: '#f56565' } : {}) }}
            />
            {jsonErr && <p className="adm-err" style={{ marginTop: '.4rem' }}>{jsonErr}</p>}
          </div>
        </details>

        <div className="adm-modal-footer">
          <Link className="adm-btn adm-btn-ghost" to="/admin">Cancelar</Link>
          <button type="submit" className="adm-btn adm-btn-gold" disabled={guardando}>
            {guardando ? 'Guardando…' : (esNuevo ? 'Crear evento' : 'Guardar cambios')}
          </button>
        </div>
      </form>
    </div>
  )
}
