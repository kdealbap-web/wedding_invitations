import { Suspense, useEffect } from 'react'
import { GuestProvider, useGuest } from './GuestContext'
import { PLANTILLAS } from './plantillas'
import { Cargador, NoEncontrada, NoActiva, EventoFinalizado } from './Estado'
import InvitacionCerrada from '../components/InvitacionCerrada'

// ─── La invitación: /i/:token ───
// Decide qué se ve según lo que responda get-invitation: cargando, link que no
// existe, evento terminado, invitado que dijo que no, o la plantilla del evento.
function Inner() {
  const { loading, error, inactive, revoked, nombre, event, preview } = useGuest()

  useEffect(() => {
    if (event?.titulo && !revoked) document.title = event.titulo
  }, [event, revoked])

  if (loading)  return <Cargador />
  if (error)    return <NoEncontrada />
  if (inactive) return <EventoFinalizado titulo={event?.titulo} />

  // Avisaron que no asisten: la invitación queda cerrada y el deck no se monta.
  if (revoked)  return <InvitacionCerrada nombre={nombre} event={event} />

  const Plantilla = PLANTILLAS[event?.config?.plantilla]
  if (!Plantilla) return <NoActiva />

  return (
    <>
      {preview && <div className="preview-banner">Vista previa · el evento aún no está publicado</div>}
      <Suspense fallback={<Cargador />}>
        <Plantilla />
      </Suspense>
    </>
  )
}

export default function InvitacionApp() {
  return (
    <GuestProvider>
      <Inner />
    </GuestProvider>
  )
}
