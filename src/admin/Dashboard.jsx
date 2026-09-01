import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import GuestForm from './GuestForm'
import CallModal from './CallModal'

const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
const WEDDING = new Date('2026-09-12T00:00:00-05:00')

// UTF-8 safe Base64URL encode of JSON payload { t, n, k }
function encodeInvite(token, name, type) {
  const json  = JSON.stringify({ t: token, n: name, k: type })
  const bytes = new TextEncoder().encode(json)
  const bin   = String.fromCharCode(...bytes)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function inviteUrl(row) {
  return `${APP_URL}/${encodeInvite(row.token, row.group_name, row.invitation_type)}`
}

// Mensaje personalizado de invitación (WhatsApp / copiar)
function buildMessage(row) {
  return (
`Hola, ${row.group_name}! ✨🧡

Con mucha ilusión te invitamos a celebrar nuestra boda. 💍 Para nosotros sería muy especial contar contigo en este día tan importante.

En el siguiente enlace encontrarás todos los detalles y la tarjeta de invitación:
${inviteUrl(row)}

Te agradeceríamos que, si es posible, nos confirmes tu asistencia antes del 12 de agosto para organizarnos con tiempo. 🗓️

Tenemos muchas ganas de que nos acompañes a celebrar este día tan especial y mágico.

Con cariño,
Angely y Kevin
#AyKBoda
Comienza la cuenta regresiva...`
  )
}

function waUrl(row) {
  return `https://wa.me/${(row.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(buildMessage(row))}`
}

// ─── Un solo eje de estado ───
// Solo la llamada confirma. Lo que el invitado responde desde su link es una
// PRECONFIRMACIÓN: sirve para saber a quién llamar primero, pero no entra en el
// número que se le pasa al catering.
const ESTADOS = {
  confirmado:    { lbl: 'Confirmado',    cls: 'badge-green', desc: 'La wedding habló con ellos y confirmaron' },
  preconfirmado: { lbl: 'Preconfirmado', cls: 'badge-blue',  desc: 'Respondió que sí desde su link · falta validar por teléfono' },
  no_asiste:     { lbl: 'No asiste',     cls: 'badge-red',   desc: 'Avisó que no puede acompañarnos' },
  no_contesta:   { lbl: 'No contesta',   cls: 'badge-amber', desc: 'Se intentó llamar y no hubo respuesta' },
  sin_respuesta: { lbl: 'Sin respuesta', cls: 'badge-gray',  desc: 'Nadie ha respondido ni contestado el teléfono' },
}

// Excluyentes y en este orden: la respuesta pesa más que el intento de llamada.
const estadoOf = (r) => {
  if (r.attending === false)                        return 'no_asiste'
  if (r.attending === true)
    return r.confirmation_source === 'admin' ? 'confirmado' : 'preconfirmado'
  if (r.contact_status === 'no_contesta')           return 'no_contesta'
  return 'sin_respuesta'
}

// Personas que aporta una tarjeta.
// Confirmada  → el dato exacto de la llamada.
// Preconfirmada → lo que el invitado marcó y, si no marcó a nadie, los cupos de
//   la tarjeta: es un número provisional, así que se cuenta el sobre completo.
const personasOf = (r) => {
  const e = estadoOf(r)
  if (e === 'confirmado')    return r.attending_count || 0
  if (e === 'preconfirmado') return (r.attending_count || 0) || (r.total_members || 0)
  return 0
}

function StatusBadge({ row }) {
  const e = ESTADOS[estadoOf(row)]
  const intentos = row.contact_attempts > 0 ? ` · ${row.contact_attempts} int.` : ''
  const quien = row.registered_by ? `\nRegistró: ${row.registered_by}` : ''
  return <span className={`badge ${e.cls}`} title={e.desc + quien}>{e.lbl}{intentos}</span>
}

function TypeBadge({ type }) {
  return type === 'completa'
    ? <span className="badge badge-gold">Completa</span>
    : <span className="badge badge-blue">Recepción</span>
}

function fmtDate(s) {
  if (!s) return ''
  try { return new Date(s).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

function ViewBadge({ count, last }) {
  const title = last ? `Última vista: ${fmtDate(last)}` : 'Aún no abierta'
  if (!count)      return <span className="badge badge-gray"  title="Aún no abierta">Sin abrir</span>
  if (count === 1) return <span className="badge badge-blue"  title={title}>1 vista</span>
  return            <span className="badge badge-green" title={title}>{count} vistas</span>
}

// Una sola fila de filtros: los cinco estados, en el orden en que se trabajan.
const FILTERS = [
  { key: 'all',           lbl: 'Todas' },
  { key: 'preconfirmado', lbl: 'Preconfirmado' },
  { key: 'sin_respuesta', lbl: 'Sin respuesta' },
  { key: 'no_contesta',   lbl: 'No contesta' },
  { key: 'confirmado',    lbl: 'Confirmado' },
  { key: 'no_asiste',     lbl: 'No asiste' },
]

// Orden de trabajo para la wedding: primero a quién llamar, al final lo cerrado.
const WORK_RANK = {
  preconfirmado: 0,   // ya dijeron que sí: la llamada es un trámite corto
  sin_respuesta: 1,
  no_contesta:   2,
  confirmado:    3,
  no_asiste:     4,
}
const workRank = (r) => WORK_RANK[estadoOf(r)]

export default function Dashboard() {
  const [rows, setRows]         = useState([])
  const [details, setDetails]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortMode, setSortMode] = useState('work')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [calling, setCalling]   = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [toast, setToast]       = useState('')
  const [live, setLive]         = useState(true)
  const toastTimer = useRef(null)

  const flash = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }, [])

  const fetchData = useCallback(async () => {
    const [{ data: gs }, { data: confs }] = await Promise.all([
      supabase.from('guest_summary').select('*').order('group_name'),
      supabase.from('confirmations').select('guest_id, attending, dietary_notes, song_request'),
    ])
    return { rows: gs || [], details: confs || [] }
  }, [])

  // Carga completa (con spinner; reinicia la selección)
  const load = useCallback(async () => {
    setLoading(true)
    const { rows: r, details: d } = await fetchData()
    setRows(r); setDetails(d); setSelected(new Set()); setLoading(false)
  }, [fetchData])

  // Actualización silenciosa (sin spinner; conserva la selección válida)
  const refresh = useCallback(async () => {
    const { rows: r, details: d } = await fetchData()
    setRows(r); setDetails(d)
    setSelected(s => {
      const ids = new Set(r.map(x => x.id))
      return new Set([...s].filter(id => ids.has(id)))
    })
  }, [fetchData])

  const loadWithMembers = useCallback(async (guestId) => {
    const { data: guest } = await supabase.from('guests').select('*, guest_members(id, name, order_num)').eq('id', guestId).single()
    if (!guest) return null
    return {
      ...guest,
      memberNames: (guest.guest_members || []).sort((a, b) => a.order_num - b.order_num).map(m => m.name)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Actualización automática: cada 15s y al volver a la pestaña.
  // Se pausa con el modal abierto o si la pestaña está oculta.
  useEffect(() => {
    if (!live) return
    const tick = () => { if (!document.hidden && !showForm && !calling) refresh() }
    const id = setInterval(tick, 15000)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [live, showForm, calling, refresh])

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = r.group_name?.toLowerCase().includes(q) || r.whatsapp?.includes(search)
    const matchStatus = statusFilter === 'all' || estadoOf(r) === statusFilter
    return matchSearch && matchStatus
  }).sort((a, b) => (
    sortMode === 'name'
      ? a.group_name.localeCompare(b.group_name, 'es')
      : workRank(a) - workRank(b) || a.group_name.localeCompare(b.group_name, 'es')
  ))

  // Cuenta tarjetas y personas por estado en una sola pasada.
  const por = { confirmado: 0, preconfirmado: 0, no_asiste: 0, no_contesta: 0, sin_respuesta: 0 }
  const gente = { confirmado: 0, preconfirmado: 0, no_contesta: 0, sin_respuesta: 0 }
  for (const r of rows) {
    const e = estadoOf(r)
    por[e]++
    if (e === 'confirmado' || e === 'preconfirmado') gente[e] += personasOf(r)
    else if (e !== 'no_asiste') gente[e] += r.total_members || 0
  }

  const stats = {
    invitations: rows.length,
    capacity:    rows.reduce((s, r) => s + (r.total_members || 0), 0),
    // El número real: solo lo validado por teléfono.
    people:      gente.confirmado,
    // Provisional: lo que respondieron por el link, todavía sin llamar.
    prePeople:   gente.preconfirmado,
    // Cupos que siguen en el aire (sin respuesta + no contesta).
    openCupos:   gente.sin_respuesta + gente.no_contesta,
    completa:    rows.filter(r => r.invitation_type === 'completa').length,
    recepcion:   rows.filter(r => r.invitation_type === 'recepcion').length,
    unopened:    rows.filter(r => !r.view_count).length,
    por,
  }
  const counts = { all: stats.invitations, ...por }
  const daysLeft = Math.max(0, Math.ceil((WEDDING.getTime() - Date.now()) / 86400000))

  // ── Detalles del RSVP (alimentación / canciones) ──
  const nameOf = (gid) => rows.find(r => r.id === gid)?.group_name || 'Invitado'
  const dietaryList = details.filter(d => (d.dietary_notes || '').trim())
  const songList    = details.filter(d => (d.song_request || '').trim())
  const copyDietary = () => navigator.clipboard.writeText(
    dietaryList.map(d => `${nameOf(d.guest_id)}: ${d.dietary_notes.trim()}`).join('\n')
  ).then(() => flash('Restricciones copiadas'))
  const copyPlaylist = () => navigator.clipboard.writeText(
    songList.map(d => `${d.song_request.trim()} — (${nameOf(d.guest_id)})`).join('\n')
  ).then(() => flash('Playlist copiada'))

  // ── Selección ──
  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id))
  const toggleSel = (id) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const toggleAll = () => setSelected(() => allSelected ? new Set() : new Set(filtered.map(r => r.id)))

  // ── Acciones masivas ──
  const bulkType = async (type) => {
    const ids = [...selected]
    const { error } = await supabase.from('guests').update({ invitation_type: type }).in('id', ids)
    if (error) return flash('Error al actualizar')
    flash(`${ids.length} cambiada(s) a ${type === 'completa' ? 'Completa' : 'Solo Recepción'}`)
    load()
  }
  const bulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selected.size} invitación(es)? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('guests').delete().in('id', [...selected])
    if (error) return flash('Error al eliminar')
    flash(`${selected.size} eliminada(s)`)
    load()
  }
  const bulkCopyMessages = () => {
    const msgs = rows.filter(r => selected.has(r.id))
      .map(r => buildMessage(r))
      .join('\n\n━━━━━━━━━━━━━━━\n\n')
    navigator.clipboard.writeText(msgs).then(() => flash(`${selected.size} mensaje(s) copiado(s)`))
  }

  // ── Acciones por fila ──
  const handleEdit = async (row) => {
    const full = await loadWithMembers(row.id)
    if (full) { setEditing(full); setShowForm(true) }
  }
  const handleDelete = async (row) => {
    if (!confirm(`¿Eliminar la invitación de "${row.group_name}"?`)) return
    await supabase.from('guests').delete().eq('id', row.id)
    flash('Invitación eliminada')
    load()
  }
  const copyUrl = (row) => navigator.clipboard.writeText(inviteUrl(row)).then(() => flash('URL copiada'))
  const copyMessage = (row) => navigator.clipboard.writeText(buildMessage(row)).then(() => flash('Mensaje copiado'))

  return (
    <div className="adm-main" style={{ padding: '2rem' }}>
      {/* Header con cuenta regresiva */}
      <div className="adm-page-head">
        <div>
          <h1 className="adm-page-title">Panel de invitados</h1>
          <p className="adm-page-sub">Angely &amp; Kevin · 12 de septiembre de 2026</p>
        </div>
        <div className="adm-head-right">
          <button
            className={`adm-live${live ? ' on' : ''}`}
            onClick={() => setLive(v => !v)}
            title={live ? 'Actualización automática activa · clic para pausar' : 'Actualización en pausa · clic para activar'}
          >
            <span className="adm-live-dot" />
            {live ? 'En vivo' : 'Pausado'}
          </button>
          <button className="adm-ico" title="Actualizar ahora" onClick={() => { refresh(); flash('Actualizado') }}>
            <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
          <div className="adm-days"><b>{daysLeft}</b> días para la boda</div>
        </div>
      </div>

      {/* Stats — el número que manda es el confirmado por teléfono */}
      <div className="adm-stats">
        <div className="adm-stat hl">
          <div className="adm-stat-n">{stats.people}<small> / {stats.capacity}</small></div>
          <div className="adm-stat-l">Personas confirmadas por teléfono</div>
          <div className="adm-stat-foot">Este es el número para el catering</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-n info">{stats.prePeople}</div>
          <div className="adm-stat-l">Preconfirmadas · {stats.por.preconfirmado} tarjetas</div>
          <div className="adm-stat-foot">Dijeron sí por el link · falta llamarlas</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-n warn">{stats.openCupos}</div>
          <div className="adm-stat-l">Cupos en el aire · {stats.por.sin_respuesta + stats.por.no_contesta} tarjetas</div>
          <div className="adm-stat-foot">
            {stats.unopened > 0 ? `${stats.unopened} sin abrir el link · quizá no se enviaron` : 'Todas abrieron su link'}
          </div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-n danger">{stats.por.no_asiste}</div>
          <div className="adm-stat-l">No asisten</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-l2">Tipo de invitación</div>
          <div className="adm-stat-types">
            <span className="badge badge-gold">Completa · {stats.completa}</span>
            <span className="badge badge-blue">Recepción · {stats.recepcion}</span>
          </div>
        </div>
      </div>

      {/* Qué sigue: la cola de llamadas */}
      {stats.por.preconfirmado > 0 && statusFilter !== 'preconfirmado' && (
        <div className="adm-alert info">
          <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <span>
            <b>{stats.por.preconfirmado}</b> tarjetas dijeron que sí por el link
            (<b>{stats.prePeople}</b> personas) y esperan la llamada para quedar confirmadas.
            Son las más fáciles: ya dijeron que van.
          </span>
          <button className="adm-btn adm-btn-ghost" onClick={() => setStatusFilter('preconfirmado')}>Empezar por estas</button>
        </div>
      )}

      {/* Filtros — un solo eje, en el orden en que se trabajan */}
      <div className="adm-chips">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`adm-chip${statusFilter === f.key ? ' on' : ''}${f.key === 'preconfirmado' && counts.preconfirmado > 0 ? ' info' : ''}${(f.key === 'sin_respuesta' || f.key === 'no_contesta') && counts[f.key] > 0 ? ' warn' : ''}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.lbl} <b>{counts[f.key]}</b>
          </button>
        ))}
      </div>

      {/* Header de acciones */}
      <div className="adm-hdr">
        <h2>Invitados</h2>
        <div className="adm-hdr-r">
          <input
            className="adm-search"
            placeholder="Buscar por nombre o WhatsApp…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="adm-search adm-sort" value={sortMode} onChange={e => setSortMode(e.target.value)}>
            <option value="work">Orden: prioridad de llamada</option>
            <option value="name">Orden: nombre</option>
          </select>
          <button className="adm-btn adm-btn-gold" onClick={() => { setEditing(null); setShowForm(true) }}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo invitado
          </button>
        </div>
      </div>

      {/* Barra de acciones masivas */}
      {selected.size > 0 && (
        <div className="adm-bulk">
          <span>{selected.size} seleccionada(s)</span>
          <div className="adm-bulk-actions">
            <span className="adm-bulk-lbl">Tipo:</span>
            <button className="adm-btn adm-btn-ghost" onClick={() => bulkType('completa')}>→ Completa</button>
            <button className="adm-btn adm-btn-ghost" onClick={() => bulkType('recepcion')}>→ Solo Recepción</button>
            <button className="adm-btn adm-btn-ghost" onClick={bulkCopyMessages}>Copiar mensajes</button>
            <button className="adm-btn adm-btn-red" onClick={bulkDelete}>Eliminar</button>
            <button className="adm-btn adm-btn-ghost" onClick={() => setSelected(new Set())}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="adm-table-wrap">
        {loading ? (
          <p style={{ color: '#475569', padding: '2rem', textAlign: 'center' }}>Cargando…</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" className="adm-check" checked={allSelected} onChange={toggleAll} aria-label="Seleccionar todo" />
                </th>
                <th>Nombre / Tarjeta</th>
                <th>Tipo</th>
                <th>Cupos</th>
                <th>Estado</th>
                <th>Personas</th>
                <th>Vistas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} className={`row-${estadoOf(row)}`}>
                  <td>
                    <input type="checkbox" className="adm-check" checked={selected.has(row.id)} onChange={() => toggleSel(row.id)} aria-label={`Seleccionar ${row.group_name}`} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{row.group_name}</div>
                    {row.whatsapp && (
                      <div style={{ fontSize: '.75rem', color: '#64748b', marginTop: '.15rem' }}>{row.whatsapp}</div>
                    )}
                  </td>
                  <td><TypeBadge type={row.invitation_type} /></td>
                  <td>
                    {row.total_members
                      ? <span style={{ color: '#94a3b8' }}>{row.total_members}</span>
                      : <span className="adm-flag" title="Tarjeta sin miembros cargados: no suma cupos ni asistentes">sin cupos</span>}
                  </td>
                  <td><StatusBadge row={row} /></td>
                  <td>
                    {(() => {
                      const e = estadoOf(row)
                      const n = personasOf(row)
                      if (e === 'confirmado')    return <b style={{ color: '#48bb78' }}>{n}</b>
                      if (e === 'preconfirmado') return <span style={{ color: '#63b3ed' }} title="Provisional: se fija en la llamada">~{n}</span>
                      return <span style={{ color: '#475569' }}>—</span>
                    })()}
                  </td>
                  <td><ViewBadge count={row.view_count ?? 0} last={row.last_viewed_at} /></td>
                  <td>
                    <div className="adm-actions">
                      <button className="adm-ico gold" title="Registrar llamada de confirmación" onClick={() => setCalling(row)}>
                        <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      </button>
                      <button className="adm-ico" title="Editar" onClick={() => handleEdit(row)}>
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="adm-ico" title="Copiar mensaje personalizado" onClick={() => copyMessage(row)}>
                        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      </button>
                      <button className="adm-ico green" title="Copiar URL de invitación" onClick={() => copyUrl(row)}>
                        <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                      {row.whatsapp && (
                        <a className="adm-ico green" title="Enviar por WhatsApp" href={waUrl(row)} target="_blank" rel="noopener">
                          <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        </a>
                      )}
                      <button className="adm-ico red" title="Eliminar" onClick={() => handleDelete(row)}>
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#475569', padding: '2rem' }}>
                  {search || statusFilter !== 'all' ? 'No hay resultados para este filtro.' : 'Aún no hay invitados. Crea el primero.'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Detalles del RSVP — alimentación y canciones */}
      <div className="adm-details">
        <div className="adm-detail-card">
          <div className="adm-detail-head">
            <h3><span className="adm-detail-ico">🍽️</span> Restricciones alimentarias <b>{dietaryList.length}</b></h3>
            {dietaryList.length > 0 && <button className="adm-btn adm-btn-ghost" onClick={copyDietary}>Copiar</button>}
          </div>
          {dietaryList.length === 0
            ? <p className="adm-detail-empty">Sin restricciones registradas todavía.</p>
            : <ul className="adm-detail-list">
                {dietaryList.map(d => (
                  <li key={d.guest_id}><b>{nameOf(d.guest_id)}:</b> {d.dietary_notes.trim()}</li>
                ))}
              </ul>}
        </div>
        <div className="adm-detail-card">
          <div className="adm-detail-head">
            <h3><span className="adm-detail-ico">🎵</span> Canciones para la playlist <b>{songList.length}</b></h3>
            {songList.length > 0 && <button className="adm-btn adm-btn-ghost" onClick={copyPlaylist}>Copiar</button>}
          </div>
          {songList.length === 0
            ? <p className="adm-detail-empty">Aún no hay canciones sugeridas.</p>
            : <ul className="adm-detail-list">
                {songList.map(d => (
                  <li key={d.guest_id}><b>{d.song_request.trim()}</b> <span>· {nameOf(d.guest_id)}</span></li>
                ))}
              </ul>}
        </div>
      </div>

      {calling && (
        <CallModal
          row={calling}
          onClose={() => setCalling(null)}
          onSaved={(msg) => { setCalling(null); flash(msg); refresh() }}
        />
      )}

      {showForm && (
        <GuestForm
          guest={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); flash('Guardado'); load() }}
        />
      )}

      {toast && <div className="adm-toast">{toast}</div>}
    </div>
  )
}
