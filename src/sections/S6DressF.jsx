import { p5783, logoWedding } from '../assets/images'

const SWATCHES_F = [
  { bg: 'oklch(72% .1 75)',   title: 'Ocre' },
  { bg: 'oklch(82% .06 78)',  title: 'Champagne' },
  { bg: 'oklch(76% .06 68)',  title: 'Arena dorada' },
  { bg: 'oklch(68% .08 55)',  title: 'Canela' },
  { bg: 'oklch(58% .07 130)', title: 'Verde oliva' },
  { bg: 'oklch(65% .05 150)', title: 'Salvia' },
  { bg: 'oklch(80% .05 330)', title: 'Rosa empolvado' },
  { bg: 'oklch(62% .08 245)', title: 'Azul suave' },
]

const PINTEREST_URL = 'https://co.pinterest.com/search/pins/?q=vestido%20de%20gala%20invitadas%20de%20boda&rs=typed'

export default function S6DressF() {
  return (
    <>
      <img className="dress-top-logo" src={logoWedding} alt="Angely & Kevin" />
      <p className="eyebrow" style={{ marginBottom: '.6rem' }}>Código de vestimenta</p>
      <h2 className="sec-title">Para <em>ellas</em></h2>
      <p className="sec-subtitle" style={{ marginBottom: '.25rem' }}>Noche elegante · Etiqueta formal</p>
      <div className="dress-content">
        <div className="dress-photo">
          <img
            src={p5783}
            alt="Angely"
            loading="lazy"
            style={{ imageOrientation: 'from-image' }}
          />
          <p className="dress-photo-cap">Vestido largo o cóctel elegante</p>
        </div>
        <div className="dress-info">
          <div className="dress-rule">
            <p className="dress-rule-label">Tonos recomendados</p>
            <p className="dress-rule-txt">Tonos cálidos, neutros y tierra. Colores vibrantes y pasteles apagados son bienvenidos.</p>
            <div>
              <p className="swatch-row-label" style={{ marginTop: '.65rem' }}>Tonos sugeridos</p>
              <div className="swatches">
                {SWATCHES_F.map(s => (
                  <div key={s.title} className="swatch" style={{ background: s.bg }} title={s.title} />
                ))}
              </div>
            </div>
          </div>
          <div className="dress-rule avoid">
            <p className="dress-rule-label">Por favor evitar</p>
            <p className="dress-rule-txt">Blanco, crema o tonos similares al de la novia · Rojo · Negro · Terracota · Plateado o metálicos</p>
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
