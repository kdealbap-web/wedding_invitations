import { useEffect, useRef, useState } from 'react'
import { p5661, logoWedding } from '../assets/images'
// Las fotos con gente salen de scripts/landing-fotos.mjs: caras desenfocadas
import fHero from '../assets/landing/hero.jpg'
import fPuerta from '../assets/landing/puerta.jpg'
import fMar from '../assets/landing/mar.jpg'
import fBoda from '../assets/landing/boda.jpg'
import fQuince from '../assets/landing/quince.jpg'
import './landing.css'

// ─── Contacto ───
// Kevin los llena. Si WHATSAPP_VENTAS está vacío, el botón apunta a mailto: con
// CORREO_VENTAS; si los dos están vacíos, baja a la sección de contacto y
// muestra «Escríbenos» sin enlace. Número en formato internacional, sin + ni espacios.
const WHATSAPP_VENTAS = '573104743755'
const CORREO_VENTAS = ''

const MENSAJE = 'Hola, quiero cotizar una invitación digital para mi evento.'
const HREF_CONTACTO = WHATSAPP_VENTAS
  ? `https://wa.me/${WHATSAPP_VENTAS}?text=${encodeURIComponent(MENSAJE)}`
  : CORREO_VENTAS
    ? `mailto:${CORREO_VENTAS}?subject=${encodeURIComponent('Cotización de invitación digital')}&body=${encodeURIComponent(MENSAJE)}`
    : '#contacto'
const HAY_CONTACTO = Boolean(WHATSAPP_VENTAS || CORREO_VENTAS)
const EXTERNO = WHATSAPP_VENTAS ? { target: '_blank', rel: 'noopener' } : {}

const TITULO = 'Invitaciones digitales personalizadas · kdealbap'
const DESCRIPCION = 'Invitaciones digitales para bodas, 15 años, cumpleaños, bautizos y grados. Un enlace personal por familia, confirmación en línea, plano de mesas y panel de invitados. Hechas en Barranquilla.'

// ─── Contenido ───
// Los nombres que rotan en el hero: la personalización, demostrada en vez de dicha
const NOMBRES = ['Familia Rojas Pérez', 'Marcela y Andrés', 'Tíos de Santa Marta', 'Abuela Carmen']

const FLUJO = [
  { k: 'Llega', t: 'Un enlace por WhatsApp', d: 'Cada familia recibe el suyo. No hay app que instalar ni registro que llenar: se abre con un toque.' },
  { k: 'Se abre', t: 'Y ya saben que es para ellos', d: 'El sobre se abre y la invitación los saluda por su nombre, con los lugares que les reservaste.' },
  { k: 'Responde', t: 'Una respuesta, sin llamadas', d: 'Marcan quiénes van. Tú lo ves al instante en tu panel, sin perseguir a nadie.' },
]

const MARGINALIA = [
  ['Quién abrió su enlace', 'Cuántas veces y cuándo. Sabes a quién llamar primero.'],
  ['Preconfirmado o confirmado', 'Lo que responde el invitado es una pista; lo que confirmas por teléfono es el número real.'],
  ['Cupos exactos', 'El total de personas que le das al catering, calculado y no adivinado.'],
  ['Mesas redondas', 'Arrastra a la gente al plano del salón y nombra un capitán por mesa.'],
  ['Excel con fórmulas vivas', 'Invitados, cupos y mesas en una hoja que se recalcula sola.'],
  ['Una invitación que se cierra sola', 'Si alguien dice que no va, su enlace deja de mostrar el evento. Si cambia de idea, se reabre.'],
]

const FILAS = [
  ['Familia Rojas Pérez', '4', 'confirmado', '5 vistas'],
  ['Marcela y Andrés', '2', 'pre', '3 vistas'],
  ['Tíos de Santa Marta', '3', 'pre', '1 vista'],
  ['Camilo Vargas', '1', 'sin', 'sin abrir'],
  ['Familia Ospino', '5', 'no', '2 vistas'],
]
const ESTADO = { confirmado: 'Confirmado', pre: 'Preconfirmado', sin: 'Sin respuesta', no: 'No asiste' }

const MESAS = [
  { n: 'Principal', c: 6, o: 6, x: 50, y: 18 },
  { n: 'I', c: 8, o: 8, x: 14, y: 52 },
  { n: 'II', c: 8, o: 7, x: 38, y: 52 },
  { n: 'III', c: 8, o: 5, x: 62, y: 52 },
  { n: 'IV', c: 8, o: 8, x: 86, y: 52 },
  { n: 'V', c: 8, o: 3, x: 26, y: 84 },
  { n: 'VI', c: 8, o: 0, x: 50, y: 84 },
  { n: 'VII', c: 8, o: 6, x: 74, y: 84 },
]

// Cada pieza se dibuja con su proporción real (5:7, 6:15, A4, 16:9)
const PIEZAS = [
  { id: 'part', t: 'La participación', m: '5 × 7 pulgadas', d: 'El anuncio formal, listo para la imprenta.' },
  { id: 'ban', t: 'El banderín', m: '6 × 15 cm', d: 'Cuelga del cuello de la botella, uno por capitán.' },
  { id: 'afi', t: 'El cartel de bienvenida', m: 'A4 o pendón de 75 × 175 cm', d: 'Todas las mesas en una hoja, para la entrada.' },
  { id: 'led', t: 'Las pantallas LED', m: '1920 × 1080 px', d: 'Cartelas y video para el proveedor, en una USB.' },
]

const EVENTOS = [
  ['Bodas', 'Del primer aviso a la mesa de los novios.'],
  ['15 años', 'Cupos por tarjeta y el ritmo de la quinceañera.'],
  ['Cumpleaños', 'Un enlace para cada invitado, sin grupos eternos.'],
  ['Bautizos', 'Íntimo, con la familia y los padrinos.'],
  ['Grados', 'Para celebrar con quienes te acompañaron.'],
  ['Eventos corporativos', 'Asistentes, aforo y confirmaciones al día.'],
]

const PASOS = [
  { t: 'Conversamos', d: 'Nos cuentas quién celebra, el lugar, la hora y el tono. Con tus fotos empezamos.' },
  { t: 'Diseñamos', d: 'Armamos la invitación con su paleta, su música y sus textos. Tú la revisas antes que nadie.' },
  { t: 'Entregamos los enlaces', d: 'Cada familia tiene el suyo, con su nombre y sus lugares. Tú solo los reenvías por WhatsApp.' },
  { t: 'Te acompañamos', d: 'Ves las respuestas llegar, armas las mesas y, si quieres, imprimimos lo que haga falta.' },
]

// Precios en pesos colombianos (noviembre de 2026).
const PAQUETES = [
  { n: 'Lite', l: 'Invitación personalizada', precio: '150.000', xs: [
    'Invitación digital con las fotos y los datos de tu evento',
    'Un enlace personal por familia, con su nombre',
    'Cupos asignados en cada invitación',
    'Sobre de apertura y música de fondo',
    'Ubicación, código de vestuario y agregar al calendario',
  ] },
  { n: 'Pro', l: 'Con panel de administración', precio: '250.000', dest: true, xs: [
    'Todo lo de Lite',
    'Tu propio panel para manejar a los invitados',
    'Confirmación en línea y registro de llamadas',
    'Base de datos propia: quién abrió, quién confirmó y cuántos van',
    'Envío por WhatsApp con un mensaje para cada familia',
    'Excel de invitados con fórmulas vivas',
  ] },
  { n: 'Max', l: 'Todo el diseño y la operación', precio: '400.000', xs: [
    'Todo lo de Pro',
    'Diseño a tu medida dentro de la app: colores, letras y fotos',
    'Plano del salón con mesas redondas y capitanes',
    'Evento activo y configuración general desde el panel',
    'Subdominio propio: tunombre.invitation.kdealbap.com',
    'Afiche de bienvenida y hojas de mesa listos para imprimir',
  ] },
]

const FAQ = [
  ['¿Cómo la reciben mis invitados?', 'Por WhatsApp, como un enlace. Se abre en el celular sin descargar nada y ya los saluda por su nombre.'],
  ['¿Pueden adivinar el enlace de otro invitado?', 'No. Cada enlace es opaco e individual, y no se puede deducir a partir del de otra familia.'],
  ['¿Qué pasa si alguien cambia su respuesta?', 'Se actualiza el panel. Si pasa de «sí» a «no», su enlace se cierra; si vuelve a «sí», se reabre solo.'],
  ['¿Cuánto tarda?', 'Depende del paquete y de qué tan pronto tengamos tus fotos y datos. Cuéntanos tu fecha y te decimos si llegamos.'],
  ['¿Puedo imprimir algo además de lo digital?', 'Sí. Hacemos la participación, el cartel de bienvenida y las tarjetas de puesto, listos para la imprenta.'],
]

const quieto = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ─── Piezas pequeñas ───
const Flecha = () => <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>

function Cta({ children, alt }) {
  return <a className={`k-btn${alt ? ' alt' : ''}`} href={HREF_CONTACTO} {...EXTERNO}><span>{children}</span><Flecha /></a>
}

// ─── Vista previa de cada plantilla ───
// Un teléfono por plantilla con su portada, en su propia tipografía y paleta.
// Nombres, fechas y lugares son de ejemplo: no son de ningún cliente.
const PLANTILLAS = [
  { id: 'boda', tipo: 'Boda', foto: fBoda, pos: '50% 50%', eyebrow: 'Nos casamos', nombre: 'Laura & Andrés', fecha: 'Sábado · 14 · III · 2027', hora: 'Ceremonia 5:00 p. m. · Recepción 7:30 p. m.',
    cd: [128, 6, 42], puntos: ['Ceremonia y recepción, cada invitado ve la suya', 'Mesas redondas con el nombre de cada uno', 'Cupos por familia y confirmación en un toque'] },
  { id: 'quince', tipo: '15 años', foto: fQuince, pos: '35% 20%', eyebrow: 'Te invito a celebrar', titulo: 'Mis 15 años', nombre: 'Valentina', fecha: 'Sábado · 19 · VI · 2027', hora: '8:00 p. m. · Salón Los Almendros',
    cd: [224, 11, 7], puntos: ['Un sobre con lacre que se abre al tocarlo', 'Tonos reservados y código de vestuario', 'Su canción sonando desde el primer toque'] },
]
const hrefPlantilla = (tipo) => WHATSAPP_VENTAS
  ? `https://wa.me/${WHATSAPP_VENTAS}?text=${encodeURIComponent(`Hola, me gustó la plantilla de ${tipo} y quiero cotizar mi invitación.`)}`
  : HREF_CONTACTO

function Plantillas() {
  return (
    <section className="k-pl" id="plantillas">
      <div className="k-wrap">
        <Rev className="pl-h">
          <h2>Elige cómo se abre <span>tu invitación.</span></h2>
          <p className="k-lead">Cada plantilla tiene su paleta, su letra y su forma de entrar. Después la vestimos con tus fotos, tus textos y tu música.</p>
        </Rev>
        <ul className="pl-g">
          {PLANTILLAS.map((p, n) => (
            <Rev as="li" key={p.id} d={n * 120} className={`pl-i pl-${p.id}`}>
              <div className="pl-tel" aria-hidden="true">
                <img src={p.foto} alt="" loading="lazy" style={{ objectPosition: p.pos }} />
                <div className="pl-pant">
                  <p className="pl-eb">{p.eyebrow}</p>
                  {p.titulo && <p className="pl-ti">{p.titulo}</p>}
                  <p className="pl-no">{p.nombre}</p>
                  <p className="pl-fe">{p.fecha}</p>
                  <p className="pl-ho">{p.hora}</p>
                  <div className="pl-cd">{p.cd.map((v, j) => <span key={j}><b>{v}</b>{['días', 'horas', 'min'][j]}</span>)}</div>
                  <span className="pl-bt">Confirmar asistencia</span>
                </div>
              </div>
              <div className="pl-tx">
                <p className="pl-tipo">{p.tipo}</p>
                <ul>{p.puntos.map(t => <li key={t}>{t}</li>)}</ul>
                <a className="pl-lk" href={hrefPlantilla(p.tipo)} {...EXTERNO}>Quiero esta plantilla <Flecha /></a>
              </div>
            </Rev>
          ))}
        </ul>
        <p className="pl-nota">Nombres, fechas y lugares de ejemplo.</p>
      </div>
    </section>
  )
}

function Rev({ children, d = 0, as: Tag = 'div', className = '' }) {
  return <Tag className={`rv ${className}`} style={{ '--d': `${d}ms` }}>{children}</Tag>
}

// El nombre del hero: cambia de familia cada pocos segundos. Todos se apilan en la
// misma celda de la retícula, así que el bloque mide lo que el más largo y no salta.
function Nombre() {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (quieto()) return
    const t = setInterval(() => setI(n => (n + 1) % NOMBRES.length), 2900)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="h-name" aria-hidden="true">
      {NOMBRES.map((n, k) => <span key={n} className={k === i ? 'on' : k === (i + NOMBRES.length - 1) % NOMBRES.length ? 'out' : ''}>{n}.</span>)}
    </span>
  )
}

// ─── Momento firma: el recorrido dentro de un teléfono en 3D ───
// La sección mide tres pantallas; el teléfono queda fijo (sticky) y el scroll
// decide el paso. --p (0→1) gira el teléfono de forma continua.
function Pantalla({ paso }) {
  return (
    <div className="ph-scr">
      <div className={`scr scr-wa${paso === 0 ? ' on' : ''}`}>
        <div className="wa-top"><i />Ana · Boda Rojas<small>en línea</small></div>
        <div className="wa-chat">
          <p className="wa-in">¡Hola, familia! Ya tenemos fecha</p>
          <div className="wa-in wa-card">
            <span className="wa-prev"><b>Para</b><em>Familia Rojas Pérez</em></span>
            <span className="wa-txt">Los esperamos. Abre tu invitación aquí</span>
            <u>invitation.kdealbap.com/eyJ0Ijoi…</u>
          </div>
          <p className="wa-time">7:42 p. m.</p>
        </div>
      </div>
      <div className={`scr scr-sb${paso === 1 ? ' on' : ''}`}>
        <div className="sb">
          <span className="sb-back" />
          <span className="sb-card">
            <span className="sb-k">Con mucho cariño</span>
            <span className="sb-para">Para</span>
            <span className="sb-name">Familia Rojas Pérez</span>
            <span className="sb-lug">Tienen <b>4 lugares</b> reservados</span>
          </span>
          <span className="sb-front" />
          <span className="sb-flap" />
          <span className="sb-seal"><i>&amp;</i></span>
        </div>
      </div>
      <div className={`scr scr-rs${paso === 2 ? ' on' : ''}`}>
        <p className="rs-h">¿Quiénes van?</p>
        <ul>
          {['Marcela', 'Andrés', 'Sofía', 'Tomás'].map((n, k) => <li key={n} className={k < 3 ? 'si' : ''} style={{ '--k': k }}><i />{n}</li>)}
        </ul>
        <span className="rs-b">Confirmar · 3 de 4</span>
        <span className="rs-ok">Respuesta enviada</span>
      </div>
    </div>
  )
}

function Recorrido() {
  const ref = useRef(null)
  const pin = useRef(null)
  const [paso, setPaso] = useState(0)
  const [libre, setLibre] = useState(false)

  useEffect(() => {
    if (quieto()) { setLibre(true); setPaso(1); return }
    let raf = 0
    const mover = () => {
      raf = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const total = r.height - window.innerHeight
      const p = Math.min(1, Math.max(0, -r.top / (total || 1)))
      pin.current?.style.setProperty('--p', p.toFixed(4))
      setPaso(Math.min(2, Math.floor(p * 3.05)))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(mover) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    mover()
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [])

  return (
    <section className={`k-rec${libre ? ' libre' : ''}`} id="recorrido" ref={ref} aria-label="Cómo la vive el invitado">
      <div className="rec-pin" ref={pin}>
        <div className="k-wrap rec-g">
          <div className="rec-t">
            <h2>Así la vive <span>quien la recibe.</span></h2>
            <ol className="rec-steps">
              {FLUJO.map((f, n) => (
                <li key={f.k} className={n === paso ? 'on' : n < paso ? 'past' : ''}>
                  <span className="rs-k">{f.k}</span>
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </li>
              ))}
            </ol>
            <div className="rec-bar" aria-hidden="true"><i /></div>
          </div>
          <div className="rec-stage" aria-hidden="true">
            <div className="ph">
              <div className="ph-body"><Pantalla paso={paso} /><span className="ph-notch" /></div>
              <span className="ph-chip c1">4 lugares</span>
              <span className="ph-chip c2">Abierta · 5 vistas</span>
            </div>
            <span className="ph-shadow" />
          </div>
        </div>
      </div>
    </section>
  )
}

function MesaSvg({ m }) {
  const r = 8.8
  const seats = Array.from({ length: m.c }, (_, i) => {
    const a = (i / m.c) * Math.PI * 2 - Math.PI / 2
    return <circle key={i} cx={m.x + Math.cos(a) * r} cy={m.y + Math.sin(a) * r} r="2" className={i < m.o ? 'ocu' : 'lib'} />
  })
  return (
    <g>
      <circle cx={m.x} cy={m.y} r="5.4" className={`tab${m.o === m.c ? ' llena' : ''}`} />
      <text x={m.x} y={m.y + 1.3} textAnchor="middle" className="tx">{m.n === 'Principal' ? 'P' : m.n}</text>
      {seats}
    </g>
  )
}

function Panel() {
  return (
    <figure className="pn" aria-label="Ejemplo del panel de invitados">
      <div className="pn-bar"><i /><i /><i /><span>panel · invitados</span></div>
      <div className="pn-body">
        <div className="pn-stats">
          <div><b>31</b><span>confirmados</span></div>
          <div><b>9</b><span>preconfirmados</span></div>
          <div><b>8</b><span>sin respuesta</span></div>
          <div className="tot"><b>83</b><span>personas</span></div>
        </div>
        <ul className="pn-list">
          {FILAS.map(([n, c, e, v]) => (
            <li key={n}>
              <span className="nm">{n}</span>
              <span className="cu">{c} {c === '1' ? 'lugar' : 'lugares'}</span>
              <span className={`st ${e}`}>{ESTADO[e]}</span>
              <span className="vi">{v}</span>
            </li>
          ))}
        </ul>
        <div className="pn-plan">
          <div className="pn-plan-h"><span>Plano del salón</span><span>arrastra y suelta</span></div>
          <svg viewBox="0 0 100 100" role="img" aria-label="Plano con mesas redondas, algunas llenas y otras con lugares libres">
            {MESAS.map(m => <MesaSvg key={m.n} m={m} />)}
          </svg>
        </div>
      </div>
      <figcaption>Vista de ejemplo, con datos inventados.</figcaption>
    </figure>
  )
}

function Pieza({ id }) {
  if (id === 'part') return <span className="pz pz-part"><b>Nombres</b><em>&amp;</em><u /><s>fecha · lugar</s></span>
  if (id === 'ban') return <span className="pz pz-ban"><i className="hole" /><b>Mesa</b><em>VII</em><s>capitán</s></span>
  if (id === 'afi') return <span className="pz pz-afi"><b>Encuentra tu mesa</b><span>{[0, 1, 2, 3, 4, 5].map(i => <u key={i} />)}</span></span>
  return <span className="pz pz-led"><b>Bienvenidos</b><u /></span>
}

export default function Landing() {
  const raiz = useRef(null)
  const [flota, setFlota] = useState(false)

  useEffect(() => {
    const prev = document.title
    document.title = TITULO
    const metas = [['name', 'description', DESCRIPCION], ['property', 'og:title', TITULO], ['property', 'og:description', DESCRIPCION], ['property', 'og:type', 'website']]
    const creadas = []
    const previos = []
    metas.forEach(([attr, k, v]) => {
      let m = document.head.querySelector(`meta[${attr}="${k}"]`)
      if (m) previos.push([m, m.getAttribute('content')])
      else { m = document.createElement('meta'); m.setAttribute(attr, k); document.head.appendChild(m); creadas.push(m) }
      m.setAttribute('content', v)
    })
    // index.css fija overflow:hidden en html/body (y #app fixed) para el slide-deck; aquí la página scrollea
    const els = [document.documentElement, document.body, document.getElementById('app')].filter(Boolean)
    const guardado = els.map(e => [e.style.overflow, e.style.height, e.style.position])
    els.forEach(e => { e.style.overflow = 'visible'; e.style.height = 'auto' })
    const app = document.getElementById('app')
    if (app) app.style.position = 'static'
    const fondo = document.body.style.background
    document.body.style.background = '#2A0A17'
    return () => {
      document.title = prev
      creadas.forEach(m => m.remove())
      previos.forEach(([m, c]) => m.setAttribute('content', c))
      els.forEach((e, n) => { e.style.overflow = guardado[n][0]; e.style.height = guardado[n][1]; e.style.position = guardado[n][2] })
      document.body.style.background = fondo
    }
  }, [])

  // Revelado al entrar en pantalla (apagado con prefers-reduced-motion) y el botón
  // flotante de WhatsApp: aparece al dejar atrás el hero y se va al llegar al cierre
  useEffect(() => {
    const root = raiz.current
    if (!root || !('IntersectionObserver' in window)) return
    const hero = root.querySelector('.k-hero')
    const fin = root.querySelector('.k-fin')
    const vis = new Map()
    const io2 = new IntersectionObserver(es => {
      es.forEach(e => vis.set(e.target, e.isIntersecting))
      setFlota(!vis.get(hero) && !vis.get(fin))
    }, { threshold: 0 })
    if (hero) io2.observe(hero)
    if (fin) io2.observe(fin)
    if (quieto()) return () => io2.disconnect()
    root.classList.add('js')
    const rvs = root.querySelectorAll('.rv')
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    rvs.forEach(e => io.observe(e))
    return () => { io.disconnect(); io2.disconnect(); root.classList.remove('js') }
  }, [])

  return (
    <div className="lnd" ref={raiz}>
      <nav className="k-nav">
        <div className="k-wrap k-nav-in">
          <a className="k-mk" href="#top" aria-label="kdealbap · invitation"><b>kdealbap</b><span>invitation</span></a>
          <a className="k-nav-a" href={HREF_CONTACTO} {...EXTERNO}>Cotizar</a>
        </div>
      </nav>

      <header className="k-hero" id="top">
        <div className="k-wrap h-g">
          <h1 className="h-t">
            <span className="sr">Invitaciones digitales con el nombre de cada invitado</span>
            <span className="h-para" aria-hidden="true">Para</span>
            <Nombre />
          </h1>
          <figure className="h-ph">
            <img src={fHero} alt="Angely y Kevin al atardecer, en su sesión de preboda" fetchPriority="high" />
            <figcaption>Angely &amp; Kevin · 12·IX·2026</figcaption>
          </figure>
          <div className="h-b">
            <p className="h-lead">Invitaciones digitales con el nombre de cada familia. Llegan por WhatsApp, se abren como un sobre y se responden con un toque.</p>
            <div className="h-row">
              <Cta>Cotiza tu evento</Cta>
              <a className="k-lk" href="#historia">Ver la boda que lo empezó</a>
            </div>
          </div>
        </div>
        <p className="k-wrap h-f">Bodas <i /> 15 años <i /> Cumpleaños <i /> Bautizos <i /> Grados <i /> Corporativos <span>Hechas en Barranquilla</span></p>
      </header>

      <Recorrido />

      <section className="k-pan" id="panel">
        <div className="k-wrap pan-g">
          <Rev className="pan-t">
            <h2>El número exacto, <span>antes de que lo pida el catering.</span></h2>
            <p className="k-lead">Un panel privado donde cada invitación tiene un estado, cada tarjeta unos cupos y cada persona un lugar en el salón.</p>
          </Rev>
          <Rev className="pan-f" d={120}><Panel /></Rev>
          <ul className="pan-l">
            {MARGINALIA.map(([t, d], n) => (
              <Rev as="li" key={t} d={n * 60}><h3>{t}</h3><p>{d}</p></Rev>
            ))}
          </ul>
        </div>
      </section>

      <section className="k-his" id="historia">
        <div className="k-wrap his-g">
          <p className="his-date" aria-hidden="true">12·IX<span>·26</span></p>
          <Rev className="his-t">
            <h2>La boda que lo empezó todo.</h2>
            <p className="k-lead">Angely y Kevin la hicieron para su matrimonio del 12 de septiembre de 2026. Los invitados la abrieron, les encantó y empezaron a pedirla para sus propios eventos.</p>
            <ul className="his-n">
              <li><b>48</b><span>invitaciones</span></li>
              <li><b>83</b><span>personas</span></li>
              <li><b>11</b><span>mesas redondas</span></li>
            </ul>
          </Rev>
          <div className="his-f">
            <figure className="hf hf1"><img src={fPuerta} alt="Angely y Kevin frente a una puerta colonial" loading="lazy" /><span className="his-seal"><img src={logoWedding} alt="Monograma A&K" loading="lazy" /></span></figure>
            <figure className="hf hf2"><img src={p5661} alt="El anillo de compromiso" loading="lazy" /></figure>
            <figure className="hf hf3"><img src={fMar} alt="Angely y Kevin en el mar al atardecer" loading="lazy" /><figcaption>La sesión de preboda</figcaption></figure>
          </div>
        </div>
      </section>

      <Plantillas />

      <section className="k-pz" id="piezas">
        <div className="k-wrap">
          <Rev className="pz-h">
            <h2>Y también en papel.</h2>
            <p className="k-lead">Con la misma identidad de la invitación, preparamos lo que se imprime o se proyecta el día del evento.</p>
          </Rev>
          <ul className="pz-g">
            {PIEZAS.map((p, n) => (
              <Rev as="li" key={p.id} d={n * 80} className={`pz-i pz-i-${p.id}`}>
                <div className="pz-box"><Pieza id={p.id} /></div>
                <h3>{p.t}</h3>
                <p className="pz-m">{p.m}</p>
                <p>{p.d}</p>
              </Rev>
            ))}
          </ul>
        </div>
      </section>

      <section className="k-ev" id="eventos">
        <div className="k-wrap">
          <h2 className="ev-h">Para lo que celebres</h2>
          <ul className="ev-l">
            {EVENTOS.map(([e, d], n) => (
              <Rev as="li" key={e} d={n * 50}><span className="ev-n">{e}</span><span className="ev-d">{d}</span></Rev>
            ))}
          </ul>
        </div>
      </section>

      <section className="k-pr" id="proceso">
        <div className="k-wrap">
          <Rev><h2 className="pr-h">De la primera conversación <span>al último invitado sentado.</span></h2></Rev>
          <ol className="pr-l">
            {PASOS.map((p, n) => (
              <Rev as="li" key={p.t} d={n * 90}><span className="pr-n">{n + 1}</span><h3>{p.t}</h3><p>{p.d}</p></Rev>
            ))}
          </ol>
        </div>
      </section>

      <section className="k-paq" id="paquetes">
        <div className="k-wrap">
          <Rev className="paq-h">
            <h2>¿Solo la invitación, <span>o la noche entera?</span></h2>
            <p className="k-lead">Precios en pesos colombianos, por evento. Video para pantallas y piezas impresas a medida se cotizan aparte.</p>
          </Rev>
          <div className="paq-g">
            {PAQUETES.map((p, n) => (
              <Rev as="article" key={p.n} d={n * 100} className={`paq${p.dest ? ' dest' : ''}`}>
                {p.dest && <span className="paq-s">Recomendado</span>}
                <h3>{p.n}</h3>
                <p className="paq-l">{p.l}</p>
                <p className="paq-p"><span className="cur">$</span>{p.precio}<small>COP</small></p>
                <ul>{p.xs.map(x => <li key={x}>{x}</li>)}</ul>
                <a className="paq-a" href={HREF_CONTACTO} {...EXTERNO}>Cotizar {p.n}<Flecha /></a>
              </Rev>
            ))}
          </div>
        </div>
      </section>

      <section className="k-faq">
        <div className="k-wrap faq-g">
          <Rev><h2>Preguntas, con respuesta corta.</h2></Rev>
          <Rev className="faq-l" d={100}>
            {FAQ.map(([q, a]) => (
              <details key={q}><summary>{q}<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg></summary><p>{a}</p></details>
            ))}
          </Rev>
        </div>
      </section>

      <section className="k-fin" id="contacto">
        <div className="k-wrap fin-g">
          <h2>Cuéntanos de tu evento.</h2>
          <div className="fin-b">
            <p>Fecha, lugar y cuántos invitados. Con eso te decimos qué paquete te conviene.</p>
            {HAY_CONTACTO ? <Cta alt>Cotiza tu evento</Cta> : <p className="fin-e">Escríbenos</p>}
          </div>
        </div>
      </section>

      <footer className="k-ft">
        <div className="k-wrap ft-in">
          <span className="k-mk"><b>kdealbap</b><span>invitation</span></span>
          <span>Hecho a mano en Barranquilla, Colombia</span>
          <a href="#top">Volver arriba</a>
        </div>
      </footer>

      {HAY_CONTACTO && (
        <a className={`k-float${flota ? ' on' : ''}`} href={HREF_CONTACTO} {...EXTERNO} tabIndex={flota ? 0 : -1} aria-hidden={!flota}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
          {WHATSAPP_VENTAS ? 'Cotiza por WhatsApp' : 'Cotiza tu evento'}
        </a>
      )}
    </div>
  )
}
