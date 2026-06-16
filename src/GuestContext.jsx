import { createContext, useContext, useState, useEffect } from 'react'
import { getInvitation } from './lib/api'

const DEFAULT = {
  guestId: null,
  nombre:  null,
  tipo:    'completa',
  members: [],
  loading: true,
  error:   null,
}

export const GuestContext = createContext(DEFAULT)

// Decode Base64URL path payload: { t: token, n: name, k: type }
function decodePath(path) {
  try {
    const b64 = path.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4)
    // UTF-8 aware decode
    const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0))
    const text  = new TextDecoder('utf-8').decode(bytes)
    const obj   = JSON.parse(text)
    if (obj.t && obj.n && obj.k) return obj
  } catch { /* invalid payload */ }
  return null
}

export function GuestProvider({ children }) {
  const [guest, setGuest] = useState(DEFAULT)

  useEffect(() => {
    // URL path: /eyJ0Ijoixxx...  (Base64URL-encoded JSON payload)
    const rawPath = window.location.pathname.replace(/^\//, '').split('/')[0]

    // Legacy support: ?t=TOKEN query param
    const legacyToken = new URLSearchParams(window.location.search).get('t')

    if (!rawPath && !legacyToken) {
      setGuest({ ...DEFAULT, loading: false })
      return
    }

    const payload = rawPath ? decodePath(rawPath) : null

    if (payload) {
      // Show name immediately from URL payload; then fetch members from DB
      setGuest({ guestId: null, nombre: payload.n, tipo: payload.k, members: [], loading: true, error: null })
      getInvitation(payload.t)
        .then(data => setGuest({
          guestId: data.id,
          nombre:  data.name,
          tipo:    data.invitation_type,
          members: data.members,
          loading: false,
          error:   null,
        }))
        .catch(() => setGuest(p => ({ ...p, loading: false, error: 'not_found' })))
    } else if (legacyToken) {
      getInvitation(legacyToken)
        .then(data => setGuest({
          guestId: data.id,
          nombre:  data.name,
          tipo:    data.invitation_type,
          members: data.members,
          loading: false,
          error:   null,
        }))
        .catch(() => setGuest({ ...DEFAULT, loading: false, error: 'not_found' }))
    } else {
      setGuest({ ...DEFAULT, loading: false })
    }
  }, [])

  return <GuestContext.Provider value={guest}>{children}</GuestContext.Provider>
}

export const useGuest = () => useContext(GuestContext)
