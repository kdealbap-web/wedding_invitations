import { p5927 } from '../assets/images'

const SWATCHES_M = [
  { bg: 'oklch(30% .06 248)', title: 'Azul navy' },
  { bg: 'oklch(42% .08 248)', title: 'Azul cobalto' },
  { bg: 'oklch(40% .07 133)', title: 'Verde oliva' },
  { bg: 'oklch(18% .005 60)', title: 'Negro' },
  { bg: 'oklch(38% .06 52)',  title: 'Café oscuro' },
  { bg: 'oklch(52% .07 50)',  title: 'Café medio' },
]

const PINTEREST_URL = 'https://co.pinterest.com/search/pins/?q=traje%20boda%20hombre%20invitado%20chaleco%20y%20chaqueta%202%20opciones&rs=typed'

export default function S7DressM() {
  return (
    <>
      <h2 className="sec-title">Para <em>ellos</em></h2>
      <p className="sec-subtitle" style={{ marginBottom: '.25rem' }}>Noche elegante · Traje formal</p>
      <div className="dress-content">
        <div className="dress-photo">
          <img
            src={p5927}
            alt="Kevin"
            loading="lazy"
            style={{ imageOrientation: 'from-image' }}
          />
          <p className="dress-photo-cap">Traje con chaqueta o chaleco sin mangas</p>
        </div>
        <div className="dress-info">
          <div className="dress-rule">
            <p className="dress-rule-label">Estilo recomendado</p>
            <p className="dress-rule-txt">Traje completo con chaqueta, o pantalón con chaleco sin mangas. Corbata o pajarita obligatoria. Camisa de vestir.</p>
            <div>
              <p className="swatch-row-label" style={{ marginTop: '.65rem' }}>Colores clásicos &amp; frescos</p>
              <div className="swatches">
                {SWATCHES_M.map(s => (
                  <div key={s.title} className="swatch" style={{ background: s.bg }} title={s.title} />
                ))}
              </div>
            </div>
          </div>
          <div className="dress-rule avoid">
            <p className="dress-rule-label">Por favor evitar</p>
            <p className="dress-rule-txt">Tonos grisáceos en cualquier escala · Ropa casual o deportiva · Sin corbata o accesorio de cuello</p>
          </div>
          <a href={PINTEREST_URL} target="_blank" rel="noopener noreferrer" className="pinterest-btn">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 0C5.4 0 0 5.4 0 12c0 5.1 3.2 9.4 7.7 11.1-.1-.9-.2-2.3 0-3.4.2-.9 1.3-5.6 1.3-5.6s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.7 1.5 1.6 0 1-.6 2.5-.9 3.8-.3 1.2.5 2.2 1.7 2.2 2 0 3.5-2.1 3.5-5.2 0-2.7-2-4.6-4.8-4.6-3.3 0-5.2 2.4-5.2 5 0 .9.4 1.9.8 2.5.1.1.1.2 0 .3l-.3 1.2c0 .1-.1.2-.3.1-1.5-.7-2.5-2.9-2.5-4.6 0-3.8 2.8-7.2 8-7.2 4.2 0 7.5 3 7.5 7 0 4.2-2.6 7.5-6.2 7.5-1.2 0-2.4-.6-2.7-1.4l-.8 2.9c-.3 1.1-1 2.4-1.5 3.2.6.2 1.2.3 1.9.3C18.6 24 24 18.6 24 12S18.6 0 12 0z"/>
            </svg>
            Ver inspiración en Pinterest
          </a>
        </div>
      </div>
    </>
  )
}
