import { useState, useEffect } from 'react'
import { useGuest } from '../GuestContext'
import { submitRsvp } from '../lib/api'
import { p5825, logoWedding } from '../assets/images'

export default function S10Rsvp({ onToast }) {
  const { guestId, nombre, members, loading, confirmation } = useGuest()
  const cupos = members.length
  const [attending, setAttending]     = useState(true)
  const [checked, setChecked]         = useState({})
  const [dietary, setDietary]         = useState('')
  const [song, setSong]               = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [justSent, setJustSent]       = useState(null)

  // Pre-check all members when they load
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
    dietary:   confirmation.dietary_notes || '',
    song:      confirmation.song_request || '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!guestId) { onToast('Invitación no encontrada. Pide tu link personalizado a los novios.'); return }
    setSubmitting(true)
    try {
      const memberIds = attending ? members.filter(m => checked[m.id]).map(m => m.id) : []
      await submitRsvp({ guest_id: guestId, attending, member_ids: memberIds, dietary_notes: dietary, song_request: song })
      setJustSent({ attending, memberIds, dietary, song })
      onToast(attending ? '¡Confirmación recibida! Nos vemos el 12 de septiembre.' : 'Gracias por avisarnos, los recordaremos.')
    } catch {
      onToast('Error al confirmar. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const attendingNames = confirmed
    ? members.filter(m => confirmed.memberIds.includes(m.id)).map(m => m.name)
    : []

  return (
    <div className="rsvp-layout">
      <div className="rsvp-img-col">
        <img className="rsvp-photo" src={p5825} alt="Angely & Kevin" style={{ imageOrientation: 'from-image' }} />
        <img className="rsvp-logo" src={logoWedding} alt="Angely & Kevin" />
      </div>
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
                  Ya recibimos tu confirmación. <strong>Contamos con tu presencia</strong> el 12 de septiembre. 🧡
                </p>
                <div className="rsvp-confirmed-list">
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
                  ¿Algo cambió? Escríbele a Angely &amp; Kevin para actualizar tu confirmación.
                </p>
              </>
            ) : (
              <p className="rsvp-confirmed-lead">
                Lamentamos que no puedas acompañarnos, pero te llevamos en el corazón.
                Gracias por avisarnos con cariño. 🧡
              </p>
            )}
          </div>
        ) : (
          /* ─── Aún no confirma: formulario ─── */
          <>
            <p className="eyebrow" style={{ marginBottom: '.6rem' }}>Confirmación de asistencia</p>
            <h2 className="sec-title" style={{ marginBottom: '.3rem' }}><em>Confirma tu asistencia</em></h2>
            <p className="sec-subtitle" style={{ marginBottom: '.7rem' }}>
              Confirma antes del 12 de agosto · Un mes antes para organizar todo con amor
            </p>

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

            <form onSubmit={handleSubmit}>
              {/* ¿Asistirás? */}
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

              {/* Miembros de la invitación */}
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
                disabled={submitting || loading}
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
