import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LoginPage from './LoginPage'
import Dashboard from './Dashboard'
import MesasBoard from './MesasBoard'
import './admin.css'

function Sidebar({ onSignOut }) {
  const { pathname } = useLocation()
  const enMesas = pathname.startsWith('/admin/mesas')
  // En el tablero de mesas la barra se reduce a un riel de iconos. El plano del
  // salón necesita el ancho —con la barra entera y el pool, el salón se comía un
  // scroll horizontal dentro de su caja— y ahí dentro no se navega a otro lado.
  return (
    <aside className={`adm-sidebar${enMesas ? ' riel' : ''}`}>
      <div className="adm-logo">{enMesas ? 'A&K' : <>Angely &amp; Kevin · 2026</>}</div>
      <nav className="adm-nav">
        <a href="/admin" className={enMesas ? '' : 'active'} title="Invitados">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          <span>Invitados</span>
        </a>
        <a href="/admin/mesas" className={enMesas ? 'active' : ''} title="Mesas">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="4" r="1.6"/><circle cx="20" cy="12" r="1.6"/><circle cx="12" cy="20" r="1.6"/><circle cx="4" cy="12" r="1.6"/></svg>
          <span>Mesas</span>
        </a>
      </nav>
      <div className="adm-spacer" />
      <button className="adm-signout" onClick={onSignOut} title="Cerrar sesión">
        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' }}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span>Cerrar sesión</span>
      </button>
    </aside>
  )
}

function ProtectedLayout({ session }) {
  const navigate = useNavigate()
  if (!session) return <Navigate to="/admin/login" replace />

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div className="adm-wrap">
      <Sidebar onSignOut={signOut} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="mesas" element={<MesasBoard />} />
        </Routes>
      </main>
    </div>
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
