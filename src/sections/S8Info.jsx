import { useGuest } from '../GuestContext'

const CARDS = [
  {
    svg: '<circle cx="8" cy="7" r="3"/><path d="M3 20c0-3.3 2.2-6 5-6"/><circle cx="16" cy="7" r="3"/><path d="M21 20c0-3.3-2.2-6-5-6"/><path d="M8 14c1.3.3 2.7.5 4 .5 1.3 0 2.7-.2 4-.5"/>',
    title: 'Solo adultos, sin niños',
    txt: 'Celebramos en un ambiente exclusivo para adultos. Gracias por comprender y acompañarnos en este día tan especial.',
  },
  {
    svg: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    titleDynamic: true,
  },
]

export default function S8Info() {
  const { nombre, cupos } = useGuest()
  return (
    <>
      <h2 className="sec-title">Detalles <em>que importan</em></h2>
      <div className="info-grid">
        {CARDS.map((c, i) => (
          <div key={i} className="info-card">
            <div className="info-ico">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round"
                dangerouslySetInnerHTML={{ __html: c.svg }} />
            </div>
            {c.titleDynamic
              ? <p className="info-title">Tu lugar: <span>{cupos}</span> cupo(s)</p>
              : <p className="info-title">{c.title}</p>
            }
            {c.titleDynamic
              ? <p className="info-txt">Reservamos <strong>{cupos}</strong> lugar(es) para ti, <strong>{nombre}</strong>. Invitación personal e intransferible.</p>
              : <p className="info-txt">{c.txt}</p>
            }
          </div>
        ))}
      </div>
    </>
  )
}
