import { createContext, useContext, useMemo } from 'react'

export const GuestContext = createContext({ nombre: 'Invitado Especial', cupos: 2, tipo: 'completa' })

const GUESTS = {
  'familia-rodriguez': { nombre: 'Familia Rodríguez', cupos: 4 },
  'juan-carlos':       { nombre: 'Juan Carlos',       cupos: 2 },
  'maria-lucia':       { nombre: 'María Lucía',        cupos: 1 },
}

export function GuestProvider({ children }) {
  const guest = useMemo(() => {
    const p    = new URLSearchParams(window.location.search)
    const slug = (p.get('invitado') || '').toLowerCase()
    const tipo = (p.get('tipo') || 'completa').toLowerCase()
    return { ...(GUESTS[slug] || { nombre: 'Invitado Especial', cupos: 2 }), tipo }
  }, [])

  return <GuestContext.Provider value={guest}>{children}</GuestContext.Provider>
}

export const useGuest = () => useContext(GuestContext)
