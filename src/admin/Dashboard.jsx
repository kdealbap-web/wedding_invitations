import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import GuestForm from './GuestForm'

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

function StatusBadge({ attending }) {
  if (attending === true)  return <span className="badge badge-green">Confirmado</span>
  if (attending === false) return <span className="badge badge-red">No asiste</span>
  return <span className="badge badge-gray">Pendiente</span>
}

function TypeBadge({ type }) {
  return type === 'completa'
    ? <span className="badge badge-gold">Completa</span>
    : <span className="badge badge-blue">Recepción</span>
}

const FILTERS = [
  { key: 'all',       lbl: 'Todas' },
  { key: 'confirmed', lbl: 'Confirmadas' },
  { key: 'pending',   lbl: 'Sin confirmar' },
  { key: 'declined',  lbl: 'No asisten' },
]

export default function Dashboard() {
  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [toast, setToast]       = useState('')
  const toastTimer = useRef(null)

  const flash = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('guest_summary').select('*').order('group_name')
    setRows(data || [])
    setSelected(new Set())
    setLoading(false)
  }, [])

  const loadWithMembers = useCallback(async (guestId) => {
    const { data: guest } = await supabase.from('guests').select('*, guest_members(id, name, order_num)').eq('id', guestId).single()
    if (!guest) return null
    return {
      ...guest,
      memberNames: (guest.guest_members || []).sort((a, b) => a.order_num - b.order_num).map(m => m.name)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const isPending = (r) => r.attending !== true && r.attending !== false

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = r.group_name?.toLowerCase().includes(q) || r.whatsapp?.includes(search)
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'confirmed' && r.attending === true) ||
      (statusFilter === 'declined'  && r.attending === false) ||
      (statusFilter === 'pending'   && isPending(r))
    return matchSearch && matchStatus
  })

  const stats = {
    invitations: rows.length,
    confirmed:   rows.filter(r => r.attending === true).length,
    declined:    rows.filter(r => r.attending === false).length,
    pending:     rows.filter(isPending).length,
    capacity:    rows.reduce((s, r) => s + (r.total_members || 0), 0),
    people:      rows.reduce((s, r) => s + (r.attending === true ? (r.attending_count || 0) : 0), 0),
    pendingCupos:rows.reduce((s, r) => s + (isPending(r) ? (r.total_members || 0) : 0), 0),
    completa:    rows.filter(r => r.invitation_type === 'completa').length,
    recepcion:   rows.filter(r => r.invitation_type === 'recepcion').length,
  }
  const counts = { all: stats.invitations, confirmed: stats.confirmed, pending: stats.pending, declined: stats.declined }
  const daysLeft = Math.max(0, Math.ceil((WEDDING.getTime() - Date.now()) / 86400000))

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
        <div className="adm-days"><b>{daysLeft}</b> días para la boda</div>
      </div>

      {/* Stats */}
      <div className="adm-stats">
        <div className="adm-stat hl">
          <div className="adm-stat-n">{stats.people}<small> / {stats.capacity}</small></div>
          <div className="adm-stat-l">Personas confirmadas · de {stats.capacity} cupos</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-n">{stats.confirmed}<small> / {stats.invitations}</small></div>
          <div className="adm-stat-l">Invitaciones confirmadas</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-n warn">{stats.pending}</div>
          <div className="adm-stat-l">Sin confirmar · {stats.pendingCupos} cupos</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-n danger">{stats.declined}</div>
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

      {/* Alerta de pendientes */}
      {stats.pending > 0 && statusFilter !== 'pending' && (
        <div className="adm-alert">
          <svg viewBox="0 0 24 24"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
          <span><b>{stats.pending}</b> invitación(es) aún sin confirmar — <b>{stats.pendingCupos}</b> cupos por definir.</span>
          <button className="adm-btn adm-btn-ghost" onClick={() => setStatusFilter('pending')}>Ver pendientes</button>
        </div>
      )}

      {/* Filtros */}
      <div className="adm-chips">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`adm-chip${statusFilter === f.key ? ' on' : ''}${f.key === 'pending' && counts.pending > 0 ? ' warn' : ''}`}
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
            <span className="adm-bulk-lbl">Cambiar tipo:</span>
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
                <th>Asistirán</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} className={isPending(row) ? 'row-pending' : ''}>
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
                  <td><span style={{ color: '#94a3b8' }}>{row.total_members ?? 0}</span></td>
                  <td><StatusBadge attending={row.attending} /></td>
                  <td><span style={{ color: '#94a3b8' }}>{row.attending ? (row.attending_count ?? 0) : '—'}</span></td>
                  <td>
                    <div className="adm-actions">
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
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#475569', padding: '2rem' }}>
                  {search || statusFilter !== 'all' ? 'No hay resultados para este filtro.' : 'Aún no hay invitados. Crea el primero.'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

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
