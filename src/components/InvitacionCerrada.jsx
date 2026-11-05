import { logoWedding } from '../assets/images'
import { fechaLarga } from '../invitacion/fechas'

// ─── Invitación cerrada ───
// Se muestra en lugar del slide-deck cuando la respuesta registrada es "no
// asiste". Reemplaza la invitación completa: la Edge Function get-invitation ya
// no devuelve los datos del evento, así que acá no hay nada que ocultar. Solo
// trae { titulo, tipo, slug } del evento.
//
// El tono importa: esta persona nos hizo el favor de avisar. No es un error ni
// un bloqueo, es un cierre amable — con la puerta abierta por si cambian de
// planes, que es lo único que puede reabrirla.
//
// Sirve a cualquier evento. El escudo y el hashtag son de la boda, y salen
// solo en ella.

// Vacío A PROPÓSITO: quien recibió invitación tiene el teléfono de quien lo
// invita, así que no hace falta publicar un número acá. Sin valor, la pantalla
// muestra el texto sin enlace, que es el comportamiento definitivo.
// Si algún día se quiere el botón de WhatsApp: solo dígitos, con indicativo
// (ej: '573001234567').
const CONTACTO_WA = ''

export default function InvitacionCerrada({ nombre, event }) {
  const esBoda  = event?.tipo === 'boda'
  const titulo  = event?.titulo || 'el evento'
  const fecha   = fechaLarga(event?.fecha)
  const anfi    = esBoda ? 'Angely & Kevin' : 'quien te invitó'

  const waHref = CONTACTO_WA
    ? `https://wa.me/${CONTACTO_WA}?text=${encodeURIComponent(`Hola! Les escribo por la invitación (${titulo}): mis planes cambiaron y sí podría acompañarlos.`)}`
    : null

  return (
    <div className="cerrada">
      <div className="cerrada-c">
        {esBoda && <img className="cerrada-logo" src={logoWedding} alt="Angely &amp; Kevin" />}

        <p className="cerrada-eyebrow">Gracias por avisarnos</p>

        <h1 className="cerrada-title">
          {nombre ? <>Hasta pronto, <em>{nombre}</em></> : <>Hasta <em>pronto</em></>}
        </h1>

        <p className="cerrada-text">
          Nos contaste que no podrás acompañarnos en «{titulo}»{fecha ? ` (${fecha})` : ''}, así que cerramos
          tu invitación para no seguir insistiendo. Lamentamos que no puedas estar,
          pero te llevamos en el corazón.
        </p>

        <div className="cerrada-back">
          <p className="cerrada-back-t">¿Cambiaron tus planes?</p>
          {waHref ? (
            <>
              <p className="cerrada-back-s">Escríbenos y la reabrimos con mucho gusto.</p>
              <a className="cerrada-btn" href={waHref} target="_blank" rel="noopener">
                <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                Escribir a {anfi}
              </a>
            </>
          ) : (
            <p className="cerrada-back-s">
              Escríbele a {anfi} y reabrimos tu invitación con mucho gusto.
            </p>
          )}
        </div>

        {esBoda && <p className="cerrada-hash">#AyKBoda</p>}
      </div>
    </div>
  )
}
