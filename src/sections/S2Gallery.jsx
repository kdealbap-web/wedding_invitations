import { p5847, p5698, p5759, p5714, p5875, p5661 } from '../assets/images'

const PHOTOS = [
  { src: p5847, alt: 'Angely y Kevin', span: true },
  { src: p5698, alt: 'Angely y Kevin' },
  { src: p5759, alt: 'Angely y Kevin' },
  { src: p5714, alt: 'Angely y Kevin' },
  { src: p5875, alt: 'Angely y Kevin' },
  { src: p5661, alt: 'El anillo de compromiso' },
]

export default function S2Gallery() {
  return (
    <>
      <p className="eyebrow" style={{ marginBottom: '.5rem', textAlign: 'center' }}>Preboda · Cartagena, Colombia</p>
      <div className="gallery-grid">
        {PHOTOS.map((p, i) => (
          <div key={i} className={`gallery-item${p.span ? ' gi-span' : ''}`}>
            <img src={p.src} alt={p.alt} loading={i < 2 ? 'eager' : 'lazy'} />
          </div>
        ))}
      </div>
    </>
  )
}
