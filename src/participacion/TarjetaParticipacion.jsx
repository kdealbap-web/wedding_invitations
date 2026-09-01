import { useEffect } from 'react'
import { logoWedding } from '../assets/images'
import './tarjeta.css'

// Filete ornamental que separa los bloques de la tarjeta
function Rule() {
  return (
    <div className="tp-rule" aria-hidden="true">
      <span className="tp-rule-l" />
      <span className="tp-rule-d" />
      <span className="tp-rule-l" />
    </div>
  )
}

export default function TarjetaParticipacion() {
  // La invitación fija overflow:hidden en html/body (src/index.css).
  // Aquí necesitamos alto natural y scroll para ver la tarjeta completa.
  useEffect(() => {
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'auto'
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="tp-root">
      <div className="tp-bar">
        <button className="btn btn-acc btn-shimmer" onClick={() => window.print()}>
          <svg viewBox="0 0 24 24">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Imprimir o guardar PDF
        </button>
        <a className="btn btn-ghost" href="/admin">
          <svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Volver al panel
        </a>
      </div>

      <div className="tp-stage">
        <article className="tp-card">
          <img className="tp-crest" src={logoWedding} alt="" aria-hidden="true" />

          <p className="tp-verse">
            «Sobre todo, vístanse de amor,<br />que es el vínculo perfecto.»
          </p>
          <p className="tp-verse-ref">Colosenses 3:14</p>

          <Rule />

          <div className="tp-parents">
            <div>
              <p className="tp-parent-role">Padres de la novia</p>
              <p className="tp-parent-name">Estela Marys Rodriguez Trujillo</p>
              <p className="tp-parent-name">Gerson Antonio Gravini Ferrer</p>
            </div>
            <div className="tp-parents-div" aria-hidden="true" />
            <div>
              <p className="tp-parent-role">Padres del novio</p>
              <p className="tp-parent-name">Osiris Rafaela Pomarico Antequera</p>
              <p className="tp-parent-name">Fredy Alfonso De Alba Castro</p>
            </div>
          </div>

          <p className="tp-participan">
            Tienen el honor de participar el matrimonio de sus hijos
          </p>

          <div className="tp-names">
            <p className="tp-name">Angely</p>
            <p className="tp-surname">Acosta</p>
            <p className="tp-amp">&amp;</p>
            <p className="tp-name">Kevin</p>
            <p className="tp-surname">De Alba</p>
          </div>

          <div className="tp-grow" />
          <Rule />

          <p className="tp-date">Sábado 12 de Septiembre</p>
          <p className="tp-year">2026 · Barranquilla, Colombia</p>

          <div className="tp-events">
            <div>
              <p className="tp-ev-label">Ceremonia religiosa</p>
              <p className="tp-ev-place">Parroquia<br />San Luis Beltrán</p>
              <p className="tp-ev-addr">Cl. 75b #42F-73<br />Norte Centro Histórico</p>
              <p className="tp-ev-time">6:30 p.m.</p>
            </div>
            <div>
              <p className="tp-ev-label">Recepción</p>
              <p className="tp-ev-place">Casona<br />del Prado</p>
              <p className="tp-ev-addr">Calle 70 Esq. Cra 60 #60-11<br />Barrio Viejo Prado</p>
              <p className="tp-ev-time">8:30 p.m.</p>
            </div>
          </div>
        </article>
      </div>

      <p className="tp-hint">
        Tamaño real 5 × 7 pulgadas (12,7 × 17,8 cm). Al imprimir, activa
        <strong> «Gráficos de fondo»</strong> y pon los márgenes en <strong>«Ninguno»</strong>
        para que salgan el marfil y los filetes dorados. Para guardarla como PDF, elige
        <strong> «Guardar como PDF»</strong> en el destino de impresión.
      </p>
    </div>
  )
}
