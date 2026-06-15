import { useEffect, useRef } from 'react'
import L from 'leaflet'

function makePin(color) {
  return L.divIcon({
    html: `<div style="width:22px;height:22px;background:${color};border:2.5px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 10px rgba(0,0,0,.3)"></div>`,
    iconSize: [22, 22], iconAnchor: [11, 22], popupAnchor: [0, -26], className: '',
  })
}

export default function MapaSection({ show }) {
  const divRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!show || mapRef.current) return

    const map = L.map(divRef.current, { scrollWheelZoom: false }).setView([10.9828, -74.7970], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    L.marker([10.9855, -74.7940], { icon: makePin('#9C5B3F') }).addTo(map)
      .bindPopup(
        '<strong style="font-family:Georgia,serif">Parroquia San Luis Beltrán</strong>' +
        '<br><span style="color:#666;font-size:13px">Cl. 75b #42F-73 · Ceremonia 6:30 PM</span>' +
        '<br><br><a href="https://maps.google.com/?q=Parroquia+San+Luis+Beltr%C3%A1n+Barranquilla" target="_blank" style="display:inline-block;margin-top:8px;padding:5px 14px;border-radius:999px;font-size:13px;color:white;background:#9C5B3F">Abrir en Maps</a>'
      )

    L.marker([10.9796, -74.8095], { icon: makePin('#4F5D3A') }).addTo(map)
      .bindPopup(
        '<strong style="font-family:Georgia,serif">Casona del Prado</strong>' +
        '<br><span style="color:#666;font-size:13px">Calle 70 Esq. Cra 60 · Recepción 8:00 PM</span>' +
        '<br><br><a href="https://maps.google.com/?q=Casona+del+Prado+Calle+70+Barranquilla" target="_blank" style="display:inline-block;margin-top:8px;padding:5px 14px;border-radius:999px;font-size:13px;color:white;background:#4F5D3A">Abrir en Maps</a>'
      )

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [show])

  return (
    <section className="section" data-od-id="mapa">
      <div className="container">
        <p className="eyebrow reveal">¿Cómo llegar?</p>
        <h2 className="reveal reveal-d1" style={{ marginBottom: 'var(--gap-lg)' }}>Ubicaciones</h2>
        <div
          ref={divRef}
          id="map"
          className="reveal reveal-d2"
        />
        <div className="grid-2 reveal" style={{ marginTop: 'var(--gap-lg)' }}>
          <div className="row" style={{ gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: '5px' }} />
            <div>
              <p style={{ fontWeight: 500 }}>Parroquia San Luis Beltrán</p>
              <p className="meta">Cl. 75b #42F-73 · Centro Histórico</p>
            </div>
          </div>
          <div className="row" style={{ gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-olive)', flexShrink: 0, marginTop: '5px' }} />
            <div>
              <p style={{ fontWeight: 500 }}>Casona del Prado</p>
              <p className="meta">Calle 70 Esq. Cra 60 #60-11 · Viejo Prado</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
