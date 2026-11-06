import { useEffect, useRef, useState } from 'react'
import { p5810, p5887, e6181, logoWedding } from '../assets/images'
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

const TITULO = 'Invitaciones digitales personalizadas · kdealbap'
const DESCRIPCION = 'Invitaciones digitales para bodas, 15 años, cumpleaños, bautizos y grados. Un enlace personal por familia, confirmación en línea, plano de mesas y panel de invitados. Hechas en Barranquilla.'

// ─── Contenido ───
const FLUJO = [
  { k: 'Llega', t: 'Un enlace por WhatsApp', d: 'Cada familia recibe el suyo. No hay app que instalar ni registro que llenar: se abre con un toque.' },
  { k: 'Se abre', t: 'Y ya saben que es para ellos', d: 'El sobre se abre y la invitación los saluda por su nombre, con los lugares que les reservaste.' },
  { k: 'Responde', t: 'Una respuesta, sin llamadas', d: 'Marcan quiénes van. Tú lo ves al instante en tu panel, sin perseguir a nadie.' },
]

const MARGINALIA = [
  ['a', 'Quién abrió su enlace', 'Cuántas veces y cuándo. Sabes a quién llamar primero.'],
  ['b', 'Preconfirmado o confirmado', 'Lo que responde el invitado es una pista; lo que confirmas por teléfono es el número real.'],
  ['c', 'Cupos exactos', 'El total de personas que le das al catering, calculado y no adivinado.'],
  ['d', 'Mesas redondas', 'Arrastra a la gente al plano del salón y nombra un capitán por mesa.'],
  ['e', 'Excel con fórmulas vivas', 'Invitados, cupos y mesas en una hoja que se recalcula sola.'],
  ['f', 'Una invitación que se cierra sola', 'Si alguien dice que no va, su enlace deja de mostrar el evento. Si cambia de idea, se reabre.'],
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

// ─── Piezas pequeñas ───
function Cta({ children, ghost }) {
  const props = WHATSAPP_VENTAS ? { target: '_blank', rel: 'noopener' } : {}
  return <a className={`lnd-btn${ghost ? ' ghost' : ''}`} href={HREF_CONTACTO} {...props}>{children}<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg></a>
}

function Rev({ children, d = 0, as: Tag = 'div', className = '' }) {
  return <Tag className={`rv ${className}`} style={{ '--d': `${d}ms` }}>{children}</Tag>
}

// Sobre con sello de cera: se abre al tocarlo, al pasar el cursor o solo, una vez, al entrar en pantalla
function Sobre() {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)
  const tocado = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    let t
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !tocado.current) t = setTimeout(() => { if (!tocado.current) setAbierto(true) }, 1400)
    }, { threshold: 0.6 })
    io.observe(el)
    return () => { io.disconnect(); clearTimeout(t) }
  }, [])
  const alternar = () => { tocado.current = true; setAbierto(a => !a) }
  return (
    <div className="sb-wrap" ref={ref}>
      <button type="button" className={`sb${abierto ? ' open' : ''}`} onClick={alternar} aria-pressed={abierto} aria-label="Sobre de muestra: ábrelo para ver la invitación">
        <span className="sb-back" />
        <span className="sb-card">
          <span className="sb-k">Con mucho cariño te invitamos</span>
          <span className="sb-para">Para</span>
          <span className="sb-name">Familia Rojas Pérez</span>
          <span className="sb-rule" />
          <span className="sb-lug">Tienen <b>4 lugares</b> reservados</span>
          <span className="sb-ok">Confirmar asistencia</span>
        </span>
        <span className="sb-front" />
        <span className="sb-flap" />
        <span className="sb-seal" aria-hidden="true"><i>&amp;</i></span>
      </button>
      <p className="sb-cap"><span>{abierto ? 'Así los recibe el invitado' : 'Toca el sobre'}</span></p>
    </div>
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
  if (id === 'part') return <span className="pz pz-part"><i className="fl" /><b>Nombres</b><em>&amp;</em><u /><s>fecha · lugar</s></span>
  if (id === 'ban') return <span className="pz pz-ban"><i className="hole" /><b>Mesa</b><em>VII</em><u /><s>capitán</s></span>
  if (id === 'afi') return <span className="pz pz-afi"><b>Encuentra tu mesa</b>{[0, 1, 2, 3, 4, 5].map(i => <u key={i} />)}</span>
  return <span className="pz pz-led"><b>Bienvenidos</b><u /></span>
}

export default function Landing() {
  const raiz = useRef(null)

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
    return () => {
      document.title = prev
      creadas.forEach(m => m.remove())
      previos.forEach(([m, c]) => m.setAttribute('content', c))
      els.forEach((e, n) => { e.style.overflow = guardado[n][0]; e.style.height = guardado[n][1]; e.style.position = guardado[n][2] })
    }
  }, [])

  // Revelado al entrar en pantalla + paralaje leve (ambos apagados con prefers-reduced-motion)
  useEffect(() => {
    const root = raiz.current
    if (!root) return
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rvs = root.querySelectorAll('.rv')
    if (quieto || !('IntersectionObserver' in window)) { rvs.forEach(e => e.classList.add('in')); return }
    root.classList.add('js')
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    rvs.forEach(e => io.observe(e))
    const pars = [...root.querySelectorAll('[data-par]')]
    let raf = 0
    const mover = () => {
      raf = 0
      const h = window.innerHeight
      pars.forEach(e => {
        const r = e.getBoundingClientRect()
        if (r.bottom < -100 || r.top > h + 100) return
        e.style.setProperty('--py', `${((r.top + r.height / 2 - h / 2) * Number(e.dataset.par)).toFixed(1)}px`)
      })
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(mover) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    mover()
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); root.classList.remove('js') }
  }, [])

  return (
    <div className="lnd" ref={raiz}>
      <nav className="nv">
        <div className="lnd-wrap nv-in">
          <a className="nv-mk" href="#top" aria-label="kdealbap · invitation"><span>k</span>dealbap<em> · invitation</em></a>
          <a className="nv-a" href={HREF_CONTACTO} {...(WHATSAPP_VENTAS ? { target: '_blank', rel: 'noopener' } : {})}>Cotizar</a>
        </div>
      </nav>

      <header className="lhero" id="top">
        <div className="lnd-wrap lhero-g">
          <div className="lhero-t">
            <p className="ey rv in">Invitaciones digitales · Barranquilla</p>
            <h1 className="rv in" style={{ '--d': '120ms' }}>Que abrir tu invitación se sienta como <em>recibir una carta.</em></h1>
            <p className="lead rv in" style={{ '--d': '260ms' }}>Un enlace personal para cada familia, con su nombre y sus lugares. Llega por WhatsApp, se abre como un sobre y responde con un toque.</p>
            <div className="row rv in" style={{ '--d': '380ms' }}>
              <Cta>Cotiza tu evento</Cta>
              <a className="lk" href="#historia">Ver el caso real</a>
            </div>
          </div>
          <div className="lhero-s rv in" style={{ '--d': '300ms' }}><Sobre /></div>
        </div>
        <p className="lhero-f lnd-wrap">Para bodas, 15 años, cumpleaños, bautizos, grados y eventos corporativos.</p>
      </header>

      <section className="lsec" id="flujo">
        <div className="lnd-wrap">
          <Rev className="lsec-h"><p className="ey">El recorrido</p><h2>De un mensaje de WhatsApp a <em>una respuesta.</em></h2></Rev>
          <ol className="flujo">
            {FLUJO.map((f, n) => (
              <Rev as="li" key={f.k} d={n * 120} className="fl">
                <div className="fl-art" aria-hidden="true">
                  {n === 0 && <div className="wa"><span className="wa-who">Ana · hoy</span><span className="wa-b">Los esperamos. Abre tu invitación aquí<br /><u>invitation.kdealbap.com/eyJ0Ijoi…</u></span></div>}
                  {n === 1 && <div className="hi"><span>Hola,</span><b>Familia Rojas</b><i /></div>}
                  {n === 2 && <div className="rs"><span>¿Quiénes van?</span><p><i className="on" />Marcela<br /><i className="on" />Andrés<br /><i className="on" />Sofía<br /><i />Tomás</p><span className="rs-b">3 de 4</span></div>}
                </div>
                <p className="fl-k">{f.k}</p>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </Rev>
            ))}
          </ol>
        </div>
      </section>

      <section className="lsec tint" id="panel">
        <div className="lnd-wrap panel-g">
          <Rev className="panel-t">
            <p className="ey">Lo que controla el organizador</p>
            <h2>El número exacto, <em>antes de que lo pida el catering.</em></h2>
            <p className="lead">Un panel privado donde cada invitación tiene un estado, cada tarjeta unos cupos y cada persona un lugar en el salón.</p>
            <dl className="marg">
              {MARGINALIA.map(([k, t, d]) => (
                <div key={k}><dt><span>{k}</span>{t}</dt><dd>{d}</dd></div>
              ))}
            </dl>
          </Rev>
          <Rev className="panel-f" d={160}><div data-par="-0.05" className="par"><Panel /></div></Rev>
        </div>
      </section>

      <section className="lsec" id="historia">
        <div className="lnd-wrap hist">
          <Rev className="hist-t">
            <p className="ey">Caso real</p>
            <h2>La boda que <em>lo empezó todo.</em></h2>
            <p className="lead">Angely y Kevin la hicieron para su matrimonio del 12 de septiembre de 2026. Los invitados la abrieron, les encantó y empezaron a pedirla para sus propios eventos.</p>
            <ul className="cifras">
              <li><b>48</b><span>invitaciones</span></li>
              <li><b>83</b><span>personas</span></li>
              <li><b>11</b><span>mesas redondas</span></li>
            </ul>
            <img className="sello" src={logoWedding} alt="Monograma A&K" loading="lazy" />
          </Rev>
          <div className="hist-f">
            <figure className="ph ph1" data-par="0.06"><img src={p5810} alt="Angely y Kevin" loading="lazy" /><figcaption>Angely &amp; Kevin</figcaption></figure>
            <figure className="ph ph2" data-par="-0.08"><img src={e6181} alt="Retrato de la pareja" loading="lazy" /></figure>
            <figure className="ph ph3" data-par="0.03"><img src={p5887} alt="Angely y Kevin en su sesión" loading="lazy" /><figcaption>La sesión de preboda</figcaption></figure>
          </div>
        </div>
      </section>

      <section className="lsec tint" id="piezas">
        <div className="lnd-wrap">
          <Rev className="lsec-h"><p className="ey">Más allá de la pantalla</p><h2>Lo digital se <em>puede tocar.</em></h2><p className="lead">Con la misma identidad de la invitación, preparamos lo que se imprime o se proyecta el día del evento.</p></Rev>
          <ul className="piezas">
            {PIEZAS.map((p, n) => (
              <Rev as="li" key={p.id} d={n * 90}>
                <div className="pz-box"><Pieza id={p.id} /></div>
                <h3>{p.t}</h3>
                <p className="med">{p.m}</p>
                <p>{p.d}</p>
              </Rev>
            ))}
          </ul>
        </div>
      </section>

      <section className="lsec" id="eventos">
        <div className="lnd-wrap">
          <Rev className="lsec-h"><p className="ey">Para cada celebración</p><h2>Una invitación <em>a la medida.</em></h2></Rev>
          <ul className="evs">
            {EVENTOS.map(([e, d], n) => (
              <Rev as="li" key={e} d={n * 60}><span className="ev-n">{e}</span><span className="ev-d">{d}</span></Rev>
            ))}
          </ul>
        </div>
      </section>

      <section className="lsec tint" id="proceso">
        <div className="lnd-wrap proc">
          <Rev className="proc-t"><p className="ey">Cómo se hace</p><h2>Cuatro pasos, <em>sin enredos.</em></h2></Rev>
          <ol className="pasos">
            {PASOS.map((p, n) => (
              <Rev as="li" key={p.t} d={n * 90}><span className="pn-num">{n + 1}</span><div><h3>{p.t}</h3><p>{p.d}</p></div></Rev>
            ))}
          </ol>
        </div>
      </section>

      <section className="lsec" id="paquetes">
        <div className="lnd-wrap">
          <Rev className="lsec-h"><p className="ey">Paquetes</p><h2>Tres maneras de <em>empezar.</em></h2><p className="lead">Precios en pesos colombianos, por evento. Video para pantallas y piezas impresas a medida se cotizan aparte.</p></Rev>
          <div className="paqs">
            {PAQUETES.map((p, n) => (
              <Rev as="article" key={p.n} d={n * 100} className={`paq${p.dest ? ' dest' : ''}`}>
                {p.dest && <span className="paq-s" aria-hidden="true"><i>&amp;</i></span>}
                <h3>{p.n}</h3>
                <p className="paq-l">{p.l}</p>
                <p className="paq-p"><span>$</span>{p.precio}<small>COP</small></p>
                <ul>{p.xs.map(x => <li key={x}>{x}</li>)}</ul>
              </Rev>
            ))}
          </div>
        </div>
      </section>

      <section className="lsec tint">
        <div className="lnd-wrap faq">
          <Rev className="faq-t"><p className="ey">Preguntas</p><h2>Lo que <em>suelen preguntar.</em></h2></Rev>
          <Rev className="faq-l" d={100}>
            {FAQ.map(([q, a]) => (
              <details key={q}><summary>{q}<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg></summary><p>{a}</p></details>
            ))}
          </Rev>
        </div>
      </section>

      <section className="fin" id="contacto">
        <div className="lnd-wrap">
          <Rev>
            <p className="ey">Escríbenos</p>
            <h2>Cuéntanos de <em>tu evento.</em></h2>
            <p className="lead">Fecha, lugar y cuántos invitados. Con eso te decimos qué paquete te conviene.</p>
            {HAY_CONTACTO ? <Cta>Cotiza tu evento</Cta> : <p className="escr">Escríbenos</p>}
          </Rev>
        </div>
      </section>

      <footer className="ft">
        <div className="lnd-wrap ft-in">
          <span className="nv-mk"><span>k</span>dealbap<em> · invitation</em></span>
          <span>Hecho a mano en Barranquilla, Colombia</span>
          <a href="#top">Volver arriba</a>
        </div>
      </footer>
    </div>
  )
}
