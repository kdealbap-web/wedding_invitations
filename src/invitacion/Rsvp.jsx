import { useState, useEffect } from 'react'
import { useGuest } from './GuestContext'
import { submitRsvp } from '../lib/api'
import { fechaLarga, diaCorto, plazoVencido } from './fechas'

// ─── RSVP genérico ───
// Sirve a cualquier evento: lee miembros, confirmación, vista previa y plazo
// del contexto. Usa las clases .rsvp-* de index.css, que toman sus colores de
// los tokens (--acc, --gold) de la plantilla que lo envuelva.
//   foto → imagen de la columna lateral (opcional)
export default function Rsvp({ onToast, foto }) {
  const { guestId, nombre, members, cupos: cuposTarjeta, loading, confirmation, event, preview } = useGuest()
  const cupos = members.length || cuposTarjeta
  // Sin personas cargadas solo hay un número de cupos: se pregunta cuántos vienen
  const porNumero = members.length === 0 && cuposTarjeta > 0
  const [cuantos, setCuantos] = useState(() => Math.min(Math.max(confirmation?.attending_total || cuposTarjeta, 1), cuposTarjeta || 1))
  const [attending, setAttending]     = useState(true)
  const [checked, setChecked]         = useState({})
  const [dietary, setDietary]         = useState('')
  const [song, setSong]               = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [justSent, setJustSent]       = useState(null)

  const anfitrion = event?.config?.nombre_corto || event?.config?.anfitrion || event?.titulo || ''
  const fecha     = fechaLarga(event?.fecha)
  const limite    = event?.rsvp_limite
  const vencido   = plazoVencido(limite)

  // Motivo por el que el formulario no se puede enviar (null = se puede)
  const bloqueo = preview
    ? 'Vista previa · el evento aún no está publicado, por ahora no se pueden enviar respuestas.'
    : vencido ? `El plazo para confirmar terminó el ${diaCorto(limite)}. Escríbele directamente a ${anfitrion}.` : null

  // Marca a todos los miembros al cargarlos
  useEffect(() => {
    if (members.length) {
      setChecked(Object.fromEntries(members.map(m => [m.id, true])))
    }
  }, [members])

  const toggle = (id) => setChecked(p => ({ ...p, [id]: !p[id] }))

  // Confirmación a mostrar: la recién enviada en esta sesión o la que ya existe en la BD
  const confirmed = justSent || (confirmation && {
    attending: confirmation.attending,
    memberIds: confirmation.attending_member_ids || [],
    total:     confirmation.attending_total || null,
    dietary:   confirmation.dietary_notes || '',
    song:      confirmation.song_request || '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (bloqueo) { onToast(bloqueo); return }
    if (!guestId) { onToast('Invitación no encontrada. Pide tu link personalizado.'); return }

    if (porNumero) {
      setSubmitting(true)
      try {
        await submitRsvp({ guest_id: guestId, attending, attending_total: attending ? cuantos : null, dietary_notes: dietary, song_request: song })
        setJustSent({ attending, memberIds: [], total: attending ? cuantos : null, dietary, song })
        onToast(attending ? '¡Confirmación recibida! Gracias por acompañarnos.' : 'Gracias por avisarnos, te llevamos en el corazón.')
      } catch (err) {
        onToast(err.message === 'preview' ? 'Vista previa: el evento aún no está publicado.'
          : err.message === 'event_closed' ? 'Este evento ya no recibe respuestas.'
          : 'Error al confirmar. Intenta de nuevo.')
      } finally {
        setSubmitting(false)
      }
      return
    }

    const memberIds = attending ? members.filter(m => checked[m.id]).map(m => m.id) : []

    // Confirmar «sí asisto» sin marcar a nadie dejaría la tarjeta como confirmada
    // con 0 personas, y el panel perdería esos cupos.
    if (attending && members.length > 0 && memberIds.length === 0) {
      onToast('Marca al menos una persona que asistirá.')
      return
    }

    setSubmitting(true)
    try {
      await submitRsvp({ guest_id: guestId, attending, member_ids: memberIds, dietary_notes: dietary, song_request: song })
      setJustSent({ attending, memberIds, dietary, song })
      onToast(attending ? '¡Confirmación recibida! Gracias por acompañarnos.' : 'Gracias por avisarnos, te llevamos en el corazón.')
    } catch (err) {
      onToast(err.message === 'preview' ? 'Vista previa: el evento aún no está publicado.'
        : err.message === 'event_closed' ? 'Este evento ya no recibe respuestas.'
        : 'Error al confirmar. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const attendingNames = confirmed
    ? members.filter(m => confirmed.memberIds.includes(m.id)).map(m => m.name)
    : []

  return (
    <div className="rsvp-layout" style={foto ? undefined : { gridTemplateColumns: '1fr', maxWidth: 640, margin: '0 auto' }}>
      {foto && (
        <div className="rsvp-img-col">
          <img className="rsvp-photo" src={foto} alt={anfitrion} style={{ imageOrientation: 'from-image' }} />
        </div>
      )}
      <div>
        {confirmed ? (
          /* ─── Ya confirmó: vista de solo lectura ─── */
          <div className="rsvp-confirmed">
            <div className={`rsvp-confirmed-badge${confirmed.attending ? '' : ' soft'}`}>
              {confirmed.attending
                ? <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>
                : <svg viewBox="0 0 24 24"><path d="M12 21s-8-4.5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6.5-8 11-8 11z"/></svg>}
            </div>
            <p className="eyebrow" style={{ justifyContent: 'center', marginBottom: '.5rem' }}>
              {confirmed.attending ? 'Asistencia confirmada' : 'Respuesta registrada'}
            </p>
            <h2 className="sec-title" style={{ textAlign: 'center', marginBottom: '.5rem' }}>
              {confirmed.attending
                ? <>¡Gracias, <em>{nombre || 'familia'}</em>!</>
                : <>Gracias por <em>avisarnos</em></>}
            </h2>

            {confirmed.attending ? (
              <>
                <p className="rsvp-confirmed-lead">
                  Ya recibimos tu confirmación. <strong>Contamos con tu presencia</strong>{fecha && <> el {fecha}</>}.
                </p>
                <div className="rsvp-confirmed-list">
                  {attendingNames.length === 0 && confirmed.total > 0 && (
                    <div className="rcr">
                      <span className="rcr-label">Asistentes</span>
                      <span className="rcr-value">{confirmed.total} {confirmed.total === 1 ? 'persona' : 'personas'}</span>
                    </div>
                  )}
                  {attendingNames.length > 0 && (
                    <div className="rcr">
                      <span className="rcr-label">Asistentes · {attendingNames.length}</span>
                      <span className="rcr-value">{attendingNames.join(' · ')}</span>
                    </div>
                  )}
                  {confirmed.dietary?.trim() && (
                    <div className="rcr">
                      <span className="rcr-label">Restricción alimentaria</span>
                      <span className="rcr-value">{confirmed.dietary.trim()}</span>
                    </div>
                  )}
                  {confirmed.song?.trim() && (
                    <div className="rcr">
                      <span className="rcr-label">Tu canción para la fiesta</span>
                      <span className="rcr-value">♪ {confirmed.song.trim()}</span>
                    </div>
                  )}
                </div>
                <p className="rsvp-confirmed-foot">
                  ¿Algo cambió? Escríbele a {anfitrion} para actualizar tu confirmación.
                </p>
              </>
            ) : (
              <p className="rsvp-confirmed-lead">
                Lamentamos que no puedas acompañarnos, pero te llevamos en el corazón.
                Gracias por avisarnos con cariño.
              </p>
            )}
          </div>
        ) : (
          /* ─── Aún no confirma: formulario ─── */
          <>
            <p className="eyebrow" style={{ marginBottom: '.6rem' }}>Confirmación de asistencia</p>
            <h2 className="sec-title" style={{ marginBottom: '.3rem' }}><em>Confirma tu asistencia</em></h2>
            {limite && (
              <p className="sec-subtitle" style={{ marginBottom: '.7rem' }}>
                Confirma antes del {diaCorto(limite)}
              </p>
            )}

            {nombre && (
              <div className="rsvp-who">
                <div className="rsvp-who-l">
                  <span className="rsvp-who-label">Invitación para</span>
                  <span className="rsvp-who-name">{nombre}</span>
                </div>
                {cupos > 0 && (
                  <div className="rsvp-who-cupos">
                    <b>{cupos}</b>
                    <span>{cupos === 1 ? 'cupo' : 'cupos'}</span>
                  </div>
                )}
              </div>
            )}

            {bloqueo && <p className="rsvp-note" style={{ marginBottom: '.9rem', fontSize: '.85rem' }}>{bloqueo}</p>}

            <form onSubmit={handleSubmit}>
              <div className="ff" style={{ marginBottom: '1rem' }}>
                <label>¿Asistirás?</label>
                <div className="rsvp-choice">
                  {[{ val: true, lbl: 'Con mucho gusto' }, { val: false, lbl: 'Lamentablemente no' }].map(o => (
                    <label
                      key={String(o.val)}
                      className={`choice-lbl${attending === o.val ? ' selected' : ''}`}
                      onClick={() => setAttending(o.val)}
                    >
                      <span className="choice-radio" />
                      {o.lbl}
                    </label>
                  ))}
                </div>
              </div>

              {attending && members.length > 0 && (
                <div className="ff" style={{ marginBottom: '1rem' }}>
                  <label>¿Quiénes asistirán?</label>
                  <div className="rsvp-members">
                    {members.map(m => (
                      <label key={m.id} className={`member-chk${checked[m.id] ? ' checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={!!checked[m.id]}
                          onChange={() => toggle(m.id)}
                        />
                        <span className="member-check-icon">{checked[m.id] ? '✓' : ''}</span>
                        {m.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {attending && porNumero && (
                <div className="ff" style={{ marginBottom: '1rem' }}>
                  <label id="rsvp-cuantos-l">¿Cuántos asistirán?</label>
                  <div className="rsvp-contador" role="group" aria-labelledby="rsvp-cuantos-l">
                    <button type="button" aria-label="Una persona menos" disabled={cuantos <= 1} onClick={() => setCuantos(n => Math.max(1, n - 1))}>−</button>
                    <output aria-live="polite"><b>{cuantos}</b><span>de {cuposTarjeta} {cuposTarjeta === 1 ? 'cupo' : 'cupos'}</span></output>
                    <button type="button" aria-label="Una persona más" disabled={cuantos >= cuposTarjeta} onClick={() => setCuantos(n => Math.min(cuposTarjeta, n + 1))}>+</button>
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="ff">
                  <label htmlFor="rsvp-rest">Restricción alimentaria</label>
                  <input
                    id="rsvp-rest" type="text"
                    value={dietary} onChange={e => setDietary(e.target.value)}
                    placeholder="Ninguna"
                  />
                </div>
                <div className="ff">
                  <label htmlFor="rsvp-song">¿Qué canción no puede faltar?</label>
                  <input
                    id="rsvp-song" type="text"
                    value={song} onChange={e => setSong(e.target.value)}
                    placeholder="Artista · Canción"
                  />
                  <p className="rsvp-note">La añadiremos a la playlist de la noche</p>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-acc btn-shimmer"
                disabled={submitting || loading || Boolean(bloqueo)}
              >
                {submitting ? 'Confirmando…' : 'Confirmar asistencia'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
