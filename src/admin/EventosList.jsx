import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ESTADOS_EVENTO, tipoEventoLbl, diasPara } from './evento'

const fmtFecha = (iso) => {
  if (!iso) return 'Sin fecha'
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota',
    })
  } catch { return '' }
}

// Pasar a cerrado o archivado apaga los links: se pide confirmación.
const CONFIRMAR = {
  cerrado:   'Los links de este evento dejarán de funcionar. ¿Cerrar el evento?',
  archivado: 'Los links de este evento dejarán de funcionar. ¿Archivar el evento?',
}

function Fila({ ev, onEstado }) {
  const e = ESTADOS_EVENTO[ev.estado] || ESTADOS_EVENTO.borrador
  const dias = diasPara(ev.fecha)
  const base = `/admin/e/${ev.slug}`
  return (
    <tr>
      <td>
        <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{ev.titulo}</div>
        <div style={{ fontSize: '.75rem', color: '#64748b', marginTop: '.15rem' }}>{ev.slug}</div>
      </td>
      <td><span className="badge badge-gray">{tipoEventoLbl(ev.tipo)}</span></td>
      <td style={{ color: '#94a3b8' }}>
        {fmtFecha(ev.fecha)}
        {dias !== null && ev.estado !== 'archivado' && <div style={{ fontSize: '.75rem', color: '#64748b' }}>{dias} días</div>}
      </td>
      <td>
        <select
          className="adm-search adm-sort" value={ev.estado} title={e.desc}
          onChange={x => onEstado(ev, x.target.value)}
        >
          {Object.entries(ESTADOS_EVENTO).map(([k, v]) => <option key={k} value={k}>{v.lbl}</option>)}
        </select>
      </td>
      <td title="Tarjetas · cupos">{ev.tarjetas} <span style={{ color: '#64748b' }}>/ {ev.cupos}</span></td>
      <td style={{ color: '#48bb78' }}>{ev.tarjetas_si}</td>
      <td style={{ color: '#f56565' }}>{ev.tarjetas_no}</td>
      <td style={{ color: '#94a3b8' }}>{ev.vistas}</td>
      <td>
        <div className="adm-actions">
          <Link className="adm-btn adm-btn-gold" to={base}>Abrir</Link>
          <Link className="adm-btn adm-btn-ghost" to={`/admin/eventos/${ev.slug}/editar`}>Editar</Link>
        </div>
      </td>
    </tr>
  )
}

function Tabla({ lista, onEstado }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>Evento</th><th>Tipo</th><th>Fecha</th><th>Estado</th>
            <th>Tarjetas / cupos</th><th>Sí</th><th>No</th><th>Vistas</th><th></th>
          </tr>
        </thead>
        <tbody>{lista.map(ev => <Fila key={ev.id} ev={ev} onEstado={onEstado} />)}</tbody>
      </table>
    </div>
  )
}

export default function EventosList({ plataforma = true }) {
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.from('event_summary').select('*').order('fecha', { ascending: false, nullsFirst: true })
    if (e) setError(e.message.includes('does not exist') ? 'Falta aplicar supabase/migrations/008_multi_evento.sql.' : e.message)
    else { setError(''); setEventos(data || []) }
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2600) }

  const cambiarEstado = async (ev, estado) => {
    if (estado === ev.estado) return
    if (CONFIRMAR[estado] && !confirm(CONFIRMAR[estado])) return
    const { error: e } = await supabase.from('events').update({ estado }).eq('id', ev.id)
    if (e) return flash(`No se pudo cambiar: ${e.message}`)
    flash(`«${ev.titulo}» pasó a ${ESTADOS_EVENTO[estado].lbl.toLowerCase()}`)
    cargar()
  }

  const vivos      = eventos.filter(e => e.estado !== 'archivado')
  const archivados = eventos.filter(e => e.estado === 'archivado')

  return (
    <div className="adm-main" style={{ padding: '2rem' }}>
      <div className="adm-page-head">
        <div>
          <h1 className="adm-page-title">Eventos</h1>
          <p className="adm-page-sub">{eventos.length} evento(s) · {archivados.length} archivado(s)</p>
        </div>
        <div className="adm-head-right">
          {plataforma && <Link className="adm-btn adm-btn-gold" to="/admin/eventos/nuevo">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo evento
          </Link>}
        </div>
      </div>

      {error && <div className="adm-alert"><span>{error}</span></div>}
      {cargando ? <p style={{ color: '#475569', padding: '2rem', textAlign: 'center' }}>Cargando…</p> : (
        <>
          {vivos.length
            ? <Tabla lista={vivos} onEstado={cambiarEstado} />
            : !error && <p style={{ color: '#475569', padding: '2rem', textAlign: 'center' }}>No hay eventos activos. Crea el primero.</p>}

          {archivados.length > 0 && (
            <details style={{ marginTop: '1.75rem' }}>
              <summary style={{ cursor: 'pointer', color: '#94a3b8', marginBottom: '.75rem' }}>
                Archivados ({archivados.length})
              </summary>
              <Tabla lista={archivados} onEstado={cambiarEstado} />
            </details>
          )}
        </>
      )}
      {toast && <div className="adm-toast">{toast}</div>}
    </div>
  )
}
