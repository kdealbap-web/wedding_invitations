import { useEffect, useState } from 'react'
import { p5651, p5810, p5887, e6181, logoWedding } from '../assets/images'
import './landing.css'

// ─── Contacto ───
// Kevin los llena. Si WHATSAPP_VENTAS está vacío, el botón apunta a mailto: con
// CORREO_VENTAS; si los dos están vacíos, baja a la sección de contacto y
// muestra «Escríbenos» sin enlace. Número en formato internacional, sin + ni espacios.
const WHATSAPP_VENTAS = ''
const CORREO_VENTAS = ''

const MENSAJE = 'Hola, quiero cotizar una invitación digital para mi evento.'
const HREF_CONTACTO = WHATSAPP_VENTAS
  ? `https://wa.me/${WHATSAPP_VENTAS}?text=${encodeURIComponent(MENSAJE)}`
  : CORREO_VENTAS
    ? `mailto:${CORREO_VENTAS}?subject=${encodeURIComponent('Cotización de invitación digital')}&body=${encodeURIComponent(MENSAJE)}`
    : '#contacto'
const HAY_CONTACTO = Boolean(WHATSAPP_VENTAS || CORREO_VENTAS)

const PASOS = [
  { t: 'Contamos tu historia', d: 'Nos cuentas quién es el festejado, el lugar, la hora y el tono. Con eso y tus fotos armamos la invitación.' },
  { t: 'Recibes los enlaces', d: 'Cada familia tiene el suyo, con su nombre y sus lugares asignados. Tú solo los reenvías por WhatsApp.' },
  { t: 'Controlas las respuestas', d: 'Ves quién abrió su enlace, quién ya respondió y cuántos serán. Sin perseguir a nadie en mensajes sueltos.' },
]

const SLIDES = [
  { k: 'Para', v: 'Familia Pérez', s: 'Tienen 4 lugares reservados' },
  { k: 'Faltan', v: '37 días', s: 'Cuenta regresiva en vivo' },
  { k: 'Dónde', v: 'Casona del Prado', s: 'Mapa y cómo llegar' },
  { k: 'Confirma', v: 'Un toque', s: 'Tu respuesta llega al organizador' },
]

const PANEL = [
  { t: 'Quién abrió el enlace', d: 'Cuántas veces y cuándo. Sabes a quién llamar primero.' },
  { t: 'Pre-confirmado o confirmado', d: 'Lo que responde el invitado es una pista; lo que confirmas por teléfono es el número real.' },
  { t: 'Cupos exactos', d: 'El total de personas que le das al catering, calculado y no adivinado.' },
  { t: 'Plano de mesas', d: 'Arrastra a la gente a mesas redondas, mueve el salón y asigna un capitán por mesa.' },
  { t: 'Excel con fórmulas vivas', d: 'Invitados, cupos y mesas en una hoja que se recalcula sola cuando cambias algo.' },
  { t: 'Se cierra sola', d: 'Si alguien dice que no va, su enlace deja de mostrar el evento. Si cambia de opinión, se reabre.' },
]

const EVENTOS = ['Bodas', 'Quinceañeras', 'Cumpleaños', 'Bautizos', 'Grados', 'Eventos corporativos']

const PAQUETES = [
  { n: 'Esencial', l: 'Para reuniones íntimas', xs: ['Invitación digital con la historia y los datos del evento', 'Un enlace personal por familia', 'Confirmación en línea', 'Panel con vistas y cupos'] },
  { n: 'Completa', l: 'Para la mayoría de eventos', dest: true, xs: ['Todo lo de Esencial', 'Plano de mesas y capitanes', 'Excel de invitados con fórmulas vivas', 'Participación impresa y cartel de bienvenida', 'Tarjetas de puesto'] },
  { n: 'Premium', l: 'Para una noche de cine', xs: ['Todo lo de Completa', 'Video y cartelas para las pantallas LED', 'Minuto a minuto con la música para el DJ', 'Piezas impresas a medida'] },
]

const FAQ = [
  ['¿Cómo la reciben mis invitados?', 'Por WhatsApp, como un enlace. Se abre en el celular sin descargar nada y ya los saluda por su nombre.'],
  ['¿Pueden adivinar el enlace de otro invitado?', 'No. Cada enlace es opaco e individual, y no se puede deducir a partir del de otra familia.'],
  ['¿Qué pasa si alguien cambia su respuesta?', 'Se actualiza el panel. Si pasa de «sí» a «no», su enlace se cierra; si vuelve a «sí», se reabre solo.'],
  ['¿Cuánto tarda?', 'Depende del paquete y de qué tan pronto tengamos tus fotos y datos. Cuéntanos tu fecha y te decimos si llegamos.'],
  ['¿Puedo imprimir algo además de lo digital?', 'Sí. Hacemos la participación, el cartel de bienvenida y las tarjetas de puesto, listos para la imprenta.'],
]

function Cta({ children, ghost }) {
  const props = WHATSAPP_VENTAS ? { target: '_blank', rel: 'noopener' } : {}
  return <a className={`lnd-btn${ghost ? ' ghost' : ''}`} href={HREF_CONTACTO} {...props}>{children}</a>
}

function Marco() {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setI(n => (n + 1) % SLIDES.length), 3200)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="lnd-phone" aria-label="Vista previa de una invitación en el celular">
      <div className="lnd-notch" />
      <div className="lnd-screen">
        <img src={p5651} alt="" />
        <div className="lnd-shade" />
        {SLIDES.map((s, n) => (
          <div key={s.k} className={`lnd-slide${n === i ? ' on' : ''}`} aria-hidden={n !== i}>
            <span className="lnd-sk">{s.k}</span>
            <span className="lnd-sv">{s.v}</span>
            <span className="lnd-ss">{s.s}</span>
          </div>
        ))}
        <div className="lnd-dots">{SLIDES.map((s, n) => <i key={s.k} className={n === i ? 'on' : ''} />)}</div>
      </div>
    </div>
  )
}

export default function Landing() {
  useEffect(() => {
    const prev = document.title
    document.title = 'Invitaciones digitales personalizadas · kdealbap'
    // index.css fija overflow:hidden en html/body (y #app fixed) para el slide-deck; aquí la página scrollea
    const els = [document.documentElement, document.body, document.getElementById('app')].filter(Boolean)
    const guardado = els.map(e => [e.style.overflow, e.style.height, e.style.position])
    els.forEach(e => { e.style.overflow = 'visible'; e.style.height = 'auto' })
    const app = document.getElementById('app')
    if (app) app.style.position = 'static'
    return () => {
      document.title = prev
      els.forEach((e, n) => { e.style.overflow = guardado[n][0]; e.style.height = guardado[n][1]; e.style.position = guardado[n][2] })
    }
  }, [])

  return (
    <div className="lnd">
      <header className="lnd-hero">
        <div className="lnd-wrap lnd-hero-grid">
          <div>
            <p className="lnd-eyebrow">kdealbap · invitation</p>
            <h1>La invitación que tus invitados <em>van a guardar</em>.</h1>
            <p className="lnd-lead">Un enlace personal para cada familia, con su nombre y sus lugares. Tú ves quién respondió y cuántos serán, sin perseguir a nadie.</p>
            <div className="lnd-row">
              <Cta>Cotiza tu evento</Cta>
              <a className="lnd-link" href="#historia">Ver el caso real</a>
            </div>
          </div>
          <Marco />
        </div>
      </header>

      <section className="lnd-sec">
        <div className="lnd-wrap">
          <h2>Así funciona</h2>
          <ol className="lnd-pasos">
            {PASOS.map((p, n) => (
              <li key={p.t}><span className="lnd-n">{n + 1}</span><h3>{p.t}</h3><p>{p.d}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lnd-sec alt">
        <div className="lnd-wrap lnd-dos">
          <div>
            <h2>Lo que ve tu invitado</h2>
            <p className="lnd-lead">Se abre en el celular como una historia: fotos, cuenta regresiva, el lugar con su mapa, agregar al calendario, código de vestimenta, colores reservados, mesa de regalos y música. Cada pantalla, un toque.</p>
            <p className="lnd-nota">Sin app, sin registro. Solo el enlace que le llegó por WhatsApp.</p>
          </div>
          <ul className="lnd-chips">
            {['Su nombre y sus lugares', 'Cuenta regresiva', 'Mapa del lugar', 'Agregar al calendario', 'Código de vestimenta', 'Colores reservados', 'Regalos', 'Música'].map(c => <li key={c}>{c}</li>)}
          </ul>
        </div>
      </section>

      <section className="lnd-sec">
        <div className="lnd-wrap">
          <h2>Lo que controlas tú</h2>
          <p className="lnd-lead">Un panel privado para saber el número exacto antes de que lo pida el catering.</p>
          <div className="lnd-grid">
            {PANEL.map(p => <article key={p.t}><h3>{p.t}</h3><p>{p.d}</p></article>)}
          </div>
        </div>
      </section>

      <section className="lnd-sec alt">
        <div className="lnd-wrap lnd-center">
          <h2>Para cualquier celebración</h2>
          <ul className="lnd-eventos">{EVENTOS.map(e => <li key={e}>{e}</li>)}</ul>
        </div>
      </section>

      <section className="lnd-sec" id="historia">
        <div className="lnd-wrap">
          <p className="lnd-eyebrow lnd-center">Caso real</p>
          <h2 className="lnd-script">La boda que lo empezó todo</h2>
          <p className="lnd-lead lnd-center">Angely y Kevin hicieron esta invitación para su boda del 12 de septiembre de 2026. Los invitados la vieron, les encantó y empezaron a pedirla para sus propios eventos.</p>
          <div className="lnd-fotos">
            <img src={p5810} alt="Angely y Kevin" loading="lazy" />
            <img src={p5887} alt="Angely y Kevin en su sesión" loading="lazy" />
            <img src={e6181} alt="Retrato de la pareja" loading="lazy" />
          </div>
          <img className="lnd-sello" src={logoWedding} alt="Monograma A&K" loading="lazy" />
        </div>
      </section>

      <section className="lnd-sec alt">
        <div className="lnd-wrap">
          <h2>Paquetes</h2>
          <p className="lnd-lead">Referencias para orientarte. Cada evento se cotiza a su medida.</p>
          <div className="lnd-paquetes">
            {PAQUETES.map(p => (
              <article key={p.n} className={p.dest ? 'dest' : ''}>
                <h3>{p.n}</h3>
                <p className="lnd-pl">{p.l}</p>
                <ul>{p.xs.map(x => <li key={x}>{x}</li>)}</ul>
              </article>
            ))}
          </div>
          <div className="lnd-center lnd-gap"><Cta>Cotiza tu evento</Cta></div>
        </div>
      </section>

      <section className="lnd-sec">
        <div className="lnd-wrap lnd-faq">
          <h2>Preguntas frecuentes</h2>
          {FAQ.map(([q, a]) => (
            <details key={q}><summary>{q}</summary><p>{a}</p></details>
          ))}
        </div>
      </section>

      <section className="lnd-sec final" id="contacto">
        <div className="lnd-wrap lnd-center">
          <h2 className="lnd-script">Cuéntanos de tu evento</h2>
          <p className="lnd-lead">Fecha, lugar y cuántos invitados. Con eso te decimos qué paquete te conviene.</p>
          {HAY_CONTACTO ? <Cta>Cotiza tu evento</Cta> : <p className="lnd-escribenos">Escríbenos</p>}
        </div>
      </section>

      <footer className="lnd-foot">kdealbap · invitation</footer>
    </div>
  )
}
