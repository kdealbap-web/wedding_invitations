import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Outlet, useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const Ctx = createContext(null)

/** El evento del panel por evento. Fuera de /admin/e/:slug no hay ninguno. */
export const useEvent = () => useContext(Ctx)

// Carga el evento por slug y lo ofrece a las rutas hijas. Quien lo necesita
// además de las rutas (la barra lateral) lo recibe por `children`.
export default function EventLayout({ children }) {
  const { slug } = useParams()
  const [evento, setEvento] = useState(undefined)
  const [error, setError]   = useState('')

  const recargar = useCallback(async () => {
    const { data, error: e } = await supabase.from('events').select('*').eq('slug', slug).maybeSingle()
    if (e) { setError(e.message); setEvento(null); return }
    setError(''); setEvento(data)
  }, [slug])

  useEffect(() => { setEvento(undefined); recargar() }, [recargar])

  if (evento === undefined) return <div className="adm-spin">Cargando…</div>
  if (!evento) return (
    <div className="adm-main" style={{ padding: '2rem' }}>
      <div className="mb-error">
        <h3>{error ? 'No se pudo abrir el evento' : 'No existe ese evento'}</h3>
        <p>{error || `No hay ningún evento con el slug «${slug}».`}</p>
        <p><Link to="/admin">← Eventos</Link></p>
      </div>
    </div>
  )

  return (
    <Ctx.Provider value={{ evento, recargar }}>
      {children ? children : <Outlet />}
    </Ctx.Provider>
  )
}
