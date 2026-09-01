import { StrictMode, Component, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Carga diferida a propósito: el panel es lo único que construye el cliente de
// Supabase al importarse, y si faltan las variables de entorno eso tumbaba la
// aplicación entera —incluida la tarjeta, que no usa Supabase—. Separándolos,
// un fallo de configuración solo afecta a /admin. De paso divide el bundle.
const AdminApp             = lazy(() => import('./admin/AdminApp.jsx'))
const TarjetaParticipacion = lazy(() => import('./participacion/TarjetaParticipacion.jsx'))

const centrado = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', height: '100dvh', padding: '2rem',
  textAlign: 'center', fontFamily: 'var(--fb)',
}

const Cargando = () => (
  <div style={{ ...centrado, color: 'rgba(255,255,255,.5)', fontSize: '.8rem', letterSpacing: '.1em' }}>
    Cargando…
  </div>
)

// Sin esto, cualquier error al montar deja la pantalla en negro sin explicación.
class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ ...centrado, color: 'rgba(255,255,255,.85)', gap: '.9rem' }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontWeight: 300, fontSize: '1.6rem' }}>
          No se pudo cargar esta página
        </h1>
        <p style={{ fontSize: '.85rem', lineHeight: 1.7, color: 'rgba(255,255,255,.6)', maxWidth: '34rem' }}>
          {this.state.error.message}
        </p>
      </div>
    )
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<Cargando />}>
          <Routes>
            <Route path="/admin/*"       element={<AdminApp />} />
            <Route path="/participacion" element={<TarjetaParticipacion />} />
            <Route path="/*"             element={<App />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
