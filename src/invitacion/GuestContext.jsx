import { createContext, useContext, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getInvitation } from '../lib/api'

const DEFAULT = {
  guestId:  null,
  nombre:   null,
  tipo:     null,
  members:  [],
  confirmation: null,
  revoked:  false,
  inactive: false,
  event:    null,
  preview:  false,
  loading:  true,
  error:    null,
}

export const GuestContext = createContext(DEFAULT)

// ─── Provider ───
// El link es /i/:token — un token opaco. Ya no viaja el nombre en la URL, así
// que mientras responde la red no hay nada que pintar: de eso se encarga el
// loader de InvitacionApp.
export function GuestProvider({ children }) {
  const { token } = useParams()
  const [guest, setGuest] = useState(DEFAULT)

  useEffect(() => {
    let vivo = true
    setGuest(DEFAULT)
    getInvitation(token)
      .then(data => {
        if (!vivo) return
        if (data.inactive) {
          setGuest({ ...DEFAULT, inactive: true, event: data.event, loading: false })
          return
        }
        setGuest({
          guestId: data.id,
          nombre:  data.name,
          tipo:    data.invitation_type || null,
          members: data.members || [],
          confirmation: data.confirmation || null,
          revoked: Boolean(data.revoked),
          inactive: false,
          event:   data.event || null,
          preview: Boolean(data.event?.preview),
          loading: false,
          error:   null,
        })
      })
      .catch(() => { if (vivo) setGuest({ ...DEFAULT, loading: false, error: 'not_found' }) })
    return () => { vivo = false }
  }, [token])

  return <GuestContext.Provider value={guest}>{children}</GuestContext.Provider>
}

export const useGuest = () => useContext(GuestContext)
