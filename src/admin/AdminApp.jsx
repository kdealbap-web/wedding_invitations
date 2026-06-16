import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LoginPage from './LoginPage'
import Dashboard from './Dashboard'
import './admin.css'

function Sidebar({ onSignOut }) {
  return (
    <aside className="adm-sidebar">
      <div className="adm-logo">Angely &amp; Kevin · 2026</div>
      <nav className="adm-nav">
        <a href="/admin" className="active">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          Invitados
        </a>
      </nav>
      <div className="adm-spacer" />
      <button className="adm-signout" onClick={onSignOut}>
        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' }}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Cerrar sesión
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
