import { useState, useContext } from 'react'
import { GuestContext } from '../App'

function Toast() {
  return (
    <div id="rsvp-toast">
      <p className="toast-title">¡Gracias! Tu confirmación fue recibida.</p>
      <p style={{ color: 'var(--muted)', marginTop: '6px', fontSize: '14px' }}>
        Nos vemos el 12 de septiembre. ¡Será una noche inolvidable!
      </p>
    </div>
  )
}

export default function RsvpSection() {
  const guest = useContext(GuestContext)
  const [tab,          setTab]          = useState('pre')
  const [donePre,      setDonePre]      = useState(false)
  const [doneFinal,    setDoneFinal]    = useState(false)

  const cuposOpts = Array.from({ length: guest.cupos }, (_, i) => (
    <option key={i + 1} value={i + 1}>{i + 1} persona{i > 0 ? 's' : ''}</option>
  ))

  return (
    <section className="section" data-od-id="rsvp" id="rsvp">
      <div className="container" style={{ maxWidth: '660px' }}>
        <p className="eyebrow reveal">¿Nos Acompañas?</p>
        <h2 className="reveal reveal-d1" style={{ marginBottom: 'var(--gap-sm)' }}>
          Confirma tu asistencia
        </h2>
        <p className="lead reveal reveal-d2" style={{ marginBottom: 'var(--gap-xl)' }}>
          Cupos reservados para <strong>{guest.nombre}</strong>:&nbsp;
          <span className="num" style={{ color: 'var(--accent)' }}>{guest.cupos}</span>
        </p>

        <div className="rsvp-tabs reveal reveal-d3" role="tablist">
          <button
            className={`rsvp-tab${tab === 'pre' ? ' active' : ''}`}
            onClick={() => setTab('pre')}
            role="tab"
            aria-selected={tab === 'pre'}
          >
            Preconfirmar ahora
          </button>
          <button
            className={`rsvp-tab${tab === 'final' ? ' active' : ''}`}
            onClick={() => setTab('final')}
            role="tab"
            aria-selected={tab === 'final'}
          >
            Confirmación final
          </button>
        </div>

        {/* Panel pre-confirmación */}
        <div className={`rsvp-panel${tab === 'pre' ? ' active' : ''}`}>
          {donePre ? <Toast /> : (
            <form className="stack card" style={{ gap: 'var(--gap-lg)' }}
              onSubmit={e => { e.preventDefault(); setDonePre(true) }}>
              <div className="field">
                <label>Nombre completo</label>
                <input className="input" type="text" placeholder="Tu nombre completo" required />
              </div>
              <div className="field">
                <label>¿Asistirás a la boda?</label>
                <select className="input fselect" required>
                  <option value="">Selecciona una opción…</option>
                  <option value="yes">Sí, confirmo mi asistencia con alegría</option>
                  <option value="no">Lamentablemente no podré asistir</option>
                </select>
              </div>
              <div className="field">
                <label>Número de personas (máx. {guest.cupos})</label>
                <select className="input fselect" defaultValue={guest.cupos}>{cuposOpts}</select>
              </div>
              <div className="field">
                <label>Restricciones alimentarias</label>
                <input className="input" type="text" placeholder="Ej: vegetariano, alérgico a mariscos…" />
              </div>
              <button type="submit" className="btn btn-primary">Preconfirmar mi asistencia</button>
            </form>
          )}
        </div>

        {/* Panel confirmación final */}
        <div className={`rsvp-panel${tab === 'final' ? ' active' : ''}`}>
          {doneFinal ? <Toast /> : (
            <form className="stack card" style={{ gap: 'var(--gap-lg)' }}
              onSubmit={e => { e.preventDefault(); setDoneFinal(true) }}>
              <div className="field">
                <label>Nombre completo</label>
                <input className="input" type="text" placeholder="Tu nombre completo" required />
              </div>
              <div className="field">
                <label>Confirmo asistencia para</label>
                <select className="input fselect" defaultValue={guest.cupos}>{cuposOpts}</select>
              </div>
              <div className="field">
                <label>Una canción que no puede faltar</label>
                <input className="input" type="text" placeholder="Artista — Nombre de la canción" />
              </div>
              <div className="field">
                <label>Mensaje para los novios</label>
                <textarea className="textarea" placeholder="Un deseo, un recuerdo, unas palabras de amor…" />
              </div>
              <button type="submit" className="btn btn-primary">Confirmar asistencia definitiva</button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
