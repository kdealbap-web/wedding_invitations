import { useState, useEffect } from 'react'
import { useGuest } from '../GuestContext'
import { submitRsvp } from '../lib/api'
import { p5825, logoWedding } from '../assets/images'

export default function S10Rsvp({ onToast }) {
  const { guestId, nombre, members, loading } = useGuest()
  const cupos = members.length
  const [attending, setAttending]     = useState(true)
  const [checked, setChecked]         = useState({})
  const [dietary, setDietary]         = useState('')
  const [song, setSong]               = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState(false)

  // Pre-check all members when they load
  useEffect(() => {
    if (members.length) {
      setChecked(Object.fromEntries(members.map(m => [m.id, true])))
    }
  }, [members])

  const toggle = (id) => setChecked(p => ({ ...p, [id]: !p[id] }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!guestId) { onToast('Invitación no encontrada. Pide tu link personalizado a los novios.'); return }
    setSubmitting(true)
    try {
      const memberIds = attending ? members.filter(m => checked[m.id]).map(m => m.id) : []
      await submitRsvp({ guest_id: guestId, attending, member_ids: memberIds, dietary_notes: dietary, song_request: song })
      setDone(true)
      onToast(attending ? '¡Confirmación recibida! Nos vemos el 12 de septiembre.' : 'Gracias por avisarnos, los recordaremos.')
    } catch {
      onToast('Error al confirmar. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rsvp-layout">
      <div className="rsvp-img-col">
        <img className="rsvp-photo" src={p5825} alt="Angely & Kevin" style={{ imageOrientation: 'from-image' }} />
        <img className="rsvp-logo" src={logoWedding} alt="Angely & Kevin" />
      </div>
      <div>
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

        {done ? (
          <p style={{ fontFamily: 'var(--fd)', fontStyle: 'italic', fontSize: 'clamp(1rem,2vw,1.2rem)', color: 'var(--gold)', textAlign: 'center', padding: '2rem 0' }}>
            {attending ? '¡Gracias! Con todo nuestro amor los esperamos.' : 'Los llevaremos siempre en nuestros corazones.'}
          </p>
        ) : (
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
        )}
      </div>
    </div>
  )
}
