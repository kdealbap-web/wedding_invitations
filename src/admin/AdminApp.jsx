import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LoginPage from './LoginPage'
import Dashboard from './Dashboard'
import MesasBoard from './MesasBoard'
import EventosList from './EventosList'
import EventForm from './EventForm'
import EventLayout, { useEvent } from './EventContext'
import './admin.css'

const IcoSalir = (
  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' }}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

// La barra del panel global (lista de eventos) y la del panel de un evento.
function Sidebar({ onSignOut }) {
  const { evento } = useEvent() || {}
  const { pathname } = useLocation()
  const base = evento ? `/admin/e/${evento.slug}` : ''
  const enMesas = Boolean(evento) && pathname.startsWith(`${base}/mesas`)
  // En el tablero de mesas la barra se reduce a un riel de iconos. El plano del
  // salón necesita el ancho —con la barra entera y el pool, el salón se comía un
  // scroll horizontal dentro de su caja— y ahí dentro no se navega a otro lado.
  return (
    <aside className={`adm-sidebar${enMesas ? ' riel' : ''}`}>
      <div className="adm-logo">{evento ? (enMesas ? (evento.config?.nombre_corto || evento.titulo).slice(0, 3) : evento.titulo) : 'Invitation'}</div>
      <nav className="adm-nav">
        {evento ? (
          <>
            <Link to="/admin" title="Eventos">
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              <span>← Eventos</span>
            </Link>
            <Link to={base} className={enMesas ? '' : 'active'} title="Invitados">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              <span>Invitados</span>
            </Link>
            <Link to={`${base}/mesas`} className={enMesas ? 'active' : ''} title="Mesas">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="4" r="1.6"/><circle cx="20" cy="12" r="1.6"/><circle cx="12" cy="20" r="1.6"/><circle cx="4" cy="12" r="1.6"/></svg>
              <span>Mesas</span>
            </Link>
            <Link to={`/admin/eventos/${evento.slug}/editar`} title="Ajustes del evento">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>Ajustes</span>
            </Link>
          </>
        ) : (
          <Link to="/admin" className="active" title="Eventos">
            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Eventos</span>
          </Link>
        )}
      </nav>
      <div className="adm-spacer" />
      <button className="adm-signout" onClick={onSignOut} title="Cerrar sesión">
        {IcoSalir}
        <span>Cerrar sesión</span>
      </button>
    </aside>
  )
}

function Shell({ onSignOut, children }) {
  return (
    <div className="adm-wrap">
      <Sidebar onSignOut={onSignOut} />
      <main style={{ flex: 1, overflowY: 'auto' }}>{children}</main>
    </div>
  )
}

// ─── Inicio del panel ───
// Por un subdominio de evento (mauren.invitation…) se entra directo a ese evento.
// Quien solo administra un evento va a él; la lista completa es de la plataforma.
// La base (010) ya filtra lo que cada quien ve: esto solo decide a dónde llevarlo.
const SUB = window.location.hostname.match(/^([a-z0-9-]+).invitation.kdealbap.com$/)?.[1] || null

function Inicio() {
  const [destino, setDestino] = useState(undefined)
  useEffect(() => {
    (async () => {
      if (SUB) {
        const { data } = await supabase.from('events').select('slug').eq('config->>subdominio', SUB).maybeSingle()
        return setDestino(data ? `/admin/e/${data.slug}` : 'sin-acceso')
      }
      // Sin la 010 la función no existe: se comporta como antes (todo visible).
      const { data: plataforma, error } = await supabase.rpc('es_admin_plataforma')
      if (error || plataforma) return setDestino({ plataforma: true })
      const { data: evs } = await supabase.from('events').select('slug')
      setDestino(evs?.length === 1 ? `/admin/e/${evs[0].slug}` : evs?.length ? { plataforma: false } : 'sin-acceso')
    })()
  }, [])
  if (destino === undefined) return <div className="adm-spin">Cargando…</div>
  if (destino === 'sin-acceso') return (
    <div className="adm-main" style={{ padding: '2rem' }}>
      <h1 className="adm-page-title">Sin acceso</h1>
      <p className="adm-page-sub">Tu cuenta no tiene eventos asignados aquí. Escríbele a quien te dio el acceso.</p>
    </div>
  )
  if (typeof destino === 'string') return <Navigate to={destino} replace />
  return <EventosList plataforma={destino.plataforma} />
}

function ProtectedLayout({ session }) {
  const navigate = useNavigate()
  if (!session) return <Navigate to="/admin/login" replace />

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <Routes>
      <Route index element={<Shell onSignOut={signOut}><Inicio /></Shell>} />
      <Route path="eventos/nuevo" element={<Shell onSignOut={signOut}><EventForm /></Shell>} />
      <Route path="eventos/:slug/editar" element={
        <EventLayout><Shell onSignOut={signOut}><EventForm /></Shell></EventLayout>
      } />
      <Route path="e/:slug/*" element={
        <EventLayout>
          <Shell onSignOut={signOut}>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="mesas" element={<MesasBoard />} />
            </Routes>
          </Shell>
        </EventLayout>
      } />
      {/* Los links viejos (/admin/mesas) caen en la lista de eventos */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default function AdminApp() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    // Override invitation-site overflow:hidden for the admin
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'auto'
    document.body.classList.add('admin-body')
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.body.classList.remove('admin-body')
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // While checking session, show nothing
  if (session === undefined) return <div className="adm-spin">Cargando…</div>

  return (
    <Routes>
      <Route
        path="login"
        element={session ? <Navigate to="/admin" replace /> : <LoginPage />}
      />
      <Route path="*" element={<ProtectedLayout session={session} />} />
    </Routes>
  )
}
