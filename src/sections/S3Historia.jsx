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
            Una mirada <em>que lo cambió todo.</em>
          </h2>
          <p>Todo comenzó con una mirada que lo cambió todo. Desde entonces, hemos construido un amor verdadero que se demuestra en cada momento y lugar, que se alimenta de risas compartidas y se fortalece mientras caminamos de la mano de Dios. ¡Bienvenidos a nuestro feliz "para siempre"!</p>
        </div>
      </div>
    </>
  )
}
