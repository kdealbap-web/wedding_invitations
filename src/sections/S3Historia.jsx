import { p5841 } from '../assets/images'

export default function S3Historia() {
  return (
    <>
      <p className="eyebrow" style={{ marginBottom: '1rem' }}>Nuestra Historia</p>
      <div className="story-grid">
        <div className="story-img-wrap">
          <img
            src={p5841}
            alt="Angely y Kevin"
            loading="eager"
            style={{ imageOrientation: 'from-image' }}
          />
          <p className="story-img-cap">Angely &amp; Kevin · Barranquilla, Colombia</p>
        </div>
        <div className="story-txt">
          <h2 className="sec-title" style={{ marginBottom: '.75rem' }}>
            Una mirada <em>que lo cambió todo</em>
          </h2>
          <p>Lo que comenzó como una mirada que cruzó el salón se convirtió en conversaciones que duraban hasta que el amanecer los sorprendía. Angely & Kevin descubrieron que en el otro habitaba exactamente aquello que el corazón llevaba tanto tiempo buscando.</p>
          <p>A lo largo de estos años construyeron un amor que no se declara, se demuestra: paciencia en los días difíciles, risas en los sencillos, y la certeza de que cada camino cobra más sentido cuando se recorre de la mano.</p>
        </div>
      </div>
    </>
  )
}
