import { useState } from 'react'
import { useGuest } from '../GuestContext'
import { p5825 } from '../assets/images'

export default function S10Rsvp({ onToast }) {
  const { nombre, cupos } = useGuest()
  const [attending, setAttending] = useState('si')

  const handleSubmit = (e) => {
    e.preventDefault()
    onToast('¡Confirmación recibida! Nos vemos el 12 de septiembre.')
    e.target.reset()
    setAttending('si')
  }

  return (
    <div className="rsvp-layout">
      <div className="rsvp-img-col">
        <img src={p5825} alt="Angely & Kevin" style={{ imageOrientation: 'from-image' }} />
      </div>
      <div>
        <p className="eyebrow" style={{ marginBottom: '.6rem' }}>Confirmación de asistencia</p>
        <h2 className="sec-title" style={{ marginBottom: '.3rem' }}> · <em>Confirma tu asistencia</em></h2>
        <p className="sec-subtitle" style={{ marginBottom: '.9rem' }}>
          Confirma antes del 12 de agosto · Un mes antes para organizar todo con amor
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="ff">
              <label htmlFor="rsvp-nom">Nombre completo</label>
              <input id="rsvp-nom" type="text" placeholder="Tu nombre" required />
            </div>
            <div className="ff">
              <label>¿Asistirás?</label>
              <div className="rsvp-choice">
                {[{ val: 'si', lbl: 'Con mucho gusto' }, { val: 'no', lbl: 'Lamentablemente no' }].map(o => (
                  <label
                    key={o.val}
                    className={`choice-lbl${attending === o.val ? ' selected' : ''}`}
                    onClick={() => setAttending(o.val)}
                  >
                    <span className="choice-radio" />
                    {o.lbl}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="ff">
              <label htmlFor="rsvp-cup">Asistentes</label>
              <select id="rsvp-cup" defaultValue={cupos}>
                {Array.from({ length: cupos }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'persona' : 'personas'}</option>
                ))}
              </select>
            </div>
            <div className="ff">
              <label htmlFor="rsvp-rest">Restricción alimentaria</label>
              <input id="rsvp-rest" type="text" placeholder="Ninguna" />
            </div>
          </div>
          <div className="ff">
            <label htmlFor="rsvp-song">¿Qué canción no puede faltar?</label>
            <input id="rsvp-song" type="text" placeholder="Artista · Canción" />
            <p className="rsvp-note">La añadiremos a la playlist de la noche</p>
          </div>
          <button type="submit" className="btn btn-acc btn-shimmer">Confirmar asistencia</button>
        </form>
      </div>
    </div>
  )
}
