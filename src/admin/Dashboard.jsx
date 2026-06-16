import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import GuestForm from './GuestForm'

const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')

// UTF-8 safe Base64URL encode of JSON payload { t, n, k }
function encodeInvite(token, name, type) {
  const json  = JSON.stringify({ t: token, n: name, k: type })
  const bytes = new TextEncoder().encode(json)
  const bin   = String.fromCharCode(...bytes)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function inviteUrl(row) {
  const encoded = encodeInvite(row.token, row.group_name, row.invitation_type)
  return `${APP_URL}/${encoded}`
}

function waUrl(row) {
  const url = inviteUrl(row)
  const msg = encodeURIComponent(
    `Hola ${row.group_name}! Angely & Kevin te invitan a su boda el 12 de septiembre de 2026 en Barranquilla. Aquí está tu invitación personalizada:\n${url}`
  )
  return `https://wa.me/${(row.whatsapp || '').replace(/\D/g, '')}?text=${msg}`
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

export default function Dashboard() {
  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('guest_summary')
      .select('*')
      .order('group_name')
    setRows(data || [])
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

  const filtered = rows.filter(r =>
    r.group_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.whatsapp?.includes(search)
  )

  const stats = {
    total:     rows.length,
    confirmed: rows.filter(r => r.attending === true).length,
    declined:  rows.filter(r => r.attending === false).length,
    pending:   rows.filter(r => r.attending === null).length,
    attending: rows.reduce((s, r) => s + (r.attending_count || 0), 0),
  }

  const handleEdit = async (row) => {
    const full = await loadWithMembers(row.id)
    if (full) { setEditing(full); setShowForm(true) }
  }

  const handleDelete = async (row) => {
    if (!confirm(`¿Eliminar la invitación de "${row.group_name}"?`)) return
    await supabase.from('guests').delete().eq('id', row.id)
    load()
  }

  const copyUrl = (row) => {
    navigator.clipboard.writeText(inviteUrl(row))
      .then(() => alert('URL copiada al portapapeles'))
  }

  return (
    <div className="adm-main" style={{ padding: '2rem' }}>
      {/* Stats */}
      <div className="adm-stats">
        <div className="adm-stat"><div className="adm-stat-n">{stats.total}</div><div className="adm-stat-l">Invitaciones</div></div>
        <div className="adm-stat"><div className="adm-stat-n" style={{ color: '#48bb78' }}>{stats.confirmed}</div><div className="adm-stat-l">Confirmados</div></div>
        <div className="adm-stat"><div className="adm-stat-n" style={{ color: '#fc814a' }}>{stats.declined}</div><div className="adm-stat-l">No asisten</div></div>
        <div className="adm-stat"><div className="adm-stat-n" style={{ color: '#94a3b8' }}>{stats.pending}</div><div className="adm-stat-l">Sin respuesta</div></div>
        <div className="adm-stat"><div className="adm-stat-n">{stats.attending}</div><div className="adm-stat-l">Personas asistirán</div></div>
      </div>

      {/* Header */}
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

      {/* Table */}
      <div className="adm-table-wrap">
        {loading ? (
          <p style={{ color: '#475569', padding: '2rem', textAlign: 'center' }}>Cargando…</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Nombre / Tarjeta</th>
                <th>Tipo</th>
                <th>Miembros</th>
                <th>Estado</th>
                <th>Asistirán</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id}>
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
                      {/* Edit */}
                      <button className="adm-ico" title="Editar" onClick={() => handleEdit(row)}>
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {/* Copy URL */}
                      <button className="adm-ico green" title="Copiar URL de invitación" onClick={() => copyUrl(row)}>
                        <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                      {/* WhatsApp */}
                      {row.whatsapp && (
                        <a className="adm-ico green" title="Enviar por WhatsApp" href={waUrl(row)} target="_blank" rel="noopener">
                          <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        </a>
                      )}
                      {/* Delete */}
                      <button className="adm-ico red" title="Eliminar" onClick={() => handleDelete(row)}>
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#475569', padding: '2rem' }}>
                  {search ? 'No hay resultados.' : 'Aún no hay invitados. Crea el primero.'}
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
          onSaved={() => { setShowForm(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}
