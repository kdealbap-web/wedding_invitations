import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <div className="adm-login-wrap">
      <div className="adm-login-card">
        <p className="adm-login-logo">Angely &amp; Kevin · Wedding</p>
        <h1>Administración</h1>
        <p>Panel de invitados · 12 Sep 2026</p>
        {error && <p className="adm-err">{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="adm-ff">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@ejemplo.com"
              required
              autoFocus
            />
          </div>
          <div className="adm-ff" style={{ marginBottom: '1.5rem' }}>
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="adm-btn adm-btn-gold"
            style={{ width: '100%', justifyContent: 'center', padding: '.75rem' }}
            disabled={loading}
          >
            {loading ? 'Entrando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
