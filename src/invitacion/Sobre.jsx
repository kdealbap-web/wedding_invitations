import { useState, useRef, useEffect } from 'react'
import './sobre.css'

// ─── El sobre de apertura ───
// Pantalla completa ANTES del deck, como una caja de papelería de lujo: un sobre
// claro bajo un foco sobre terciopelo oscuro. Al tocar el sello se agrieta con un
// destello, la solapa se abre en 3D con sombra, la carta sube girando y suelta una
// ráfaga de partículas, y la cámara «entra» en la carta hasta llenar la pantalla;
// entonces se desvanece y queda el deck (~3,4 s). Solo transform y opacidad.
//
// Reacciona al cursor y, en el móvil, al giroscopio (deviceorientation; en iOS el
// permiso se pide con el mismo toque del sello). Sin movimiento (reduced-motion):
// ni inclinación, ni partículas, ni apertura animada: un fundido.
//
// Es genérico: la plantilla lo configura con props y `tema` (variables --sb-*).
//   listo      → ya llegaron los datos; hasta entonces el sello no se puede tocar
//   para       → nombre del invitado; numero → su número de invitación (A-01)
//   monograma  → lo que lleva el sello (M, 15…)
//   linea / titulo / nombre / fecha → la presentación que trae la carta
//   onAbierto  → se llama al terminar el fundido (aquí se desmonta el sobre)
// Ese toque es la primera interacción del invitado: YoutubeBtn engancha el mismo
// gesto (pointerdown/touchend en window) para arrancar la música.

// Azar determinista: el mismo sobre en cada visita
const frac = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x) }

const PETALOS = Array.from({ length: 9 }, (_, i) => ({
  x: 4 + frac(i, 1) * 92, s: 13 + frac(i, 2) * 14, d: 12 + frac(i, 3) * 9, t: -frac(i, 4) * 20, w: 30 + frac(i, 5) * 60,
}))
const BRILLOS = Array.from({ length: 18 }, (_, i) => ({
  x: frac(i, 6) * 100, y: frac(i, 7) * 100, s: 4 + frac(i, 8) * 7, d: 2.6 + frac(i, 9) * 3.4, t: -frac(i, 10) * 6,
}))
const RAFAGA = Array.from({ length: 34 }, (_, i) => {
  const a = (i / 34) * Math.PI * 2 + frac(i, 11) * 0.6
  const r = 140 + frac(i, 12) * 300
  return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.7 - 50, s: 7 + frac(i, 13) * 11, t: frac(i, 14) * 0.2 }
})

const ESQUINA = 'M3 44V9q0-6 6-6h35M11 38V15q0-4 4-4h23M20 20q7 0 7 7 0 6-6 6-5 0-5-5 0-4 4-4'

export default function Sobre({ listo = false, para, numero, monograma = '15', linea, titulo, nombre, fecha, tema, onAbierto }) {
  const [fase, setFase] = useState('cerrado')   // cerrado → abre → crece → sale
  const raiz  = useRef(null)
  const mundo = useRef(null)
  const carta = useRef(null)
  const faseRef = useRef('cerrado')
  const plazos = useRef([])
  useEffect(() => () => plazos.current.forEach(clearTimeout), [])
  const luego = (fn, ms) => { plazos.current.push(setTimeout(fn, ms)) }
  const cambia = (f) => { faseRef.current = f; setFase(f) }

  // Mientras el sobre está abierto el deck no debe moverse con el teclado: eso lo
  // bloquea la plantilla con <Deck bloqueado>; aquí solo se evita el scroll de las flechas.
  useEffect(() => {
    const k = (e) => { if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  // Inclinación: cursor en escritorio, giroscopio en el móvil. Suavizada con rAF y
  // solo escribe un transform.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0
    const lim = (v) => Math.max(-1, Math.min(1, v))
    const mueve = (e) => { tx = (e.clientX / window.innerWidth - 0.5) * 2; ty = (e.clientY / window.innerHeight - 0.5) * 2 }
    const gira = (e) => { if (e.gamma != null && e.beta != null) { tx = lim(e.gamma / 22); ty = lim((e.beta - 50) / 22) } }
    const paso = () => {
      const quieto = faseRef.current === 'crece' || faseRef.current === 'sale'
      cx += ((quieto ? 0 : tx) - cx) * 0.07
      cy += ((quieto ? 0 : ty) - cy) * 0.07
      if (mundo.current) mundo.current.style.transform = `rotateY(${(cx * 11).toFixed(2)}deg) rotateX(${(-cy * 8).toFixed(2)}deg)`
      raf = requestAnimationFrame(paso)
    }
    window.addEventListener('pointermove', mueve)
    window.addEventListener('deviceorientation', gira)
    raf = requestAnimationFrame(paso)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', mueve); window.removeEventListener('deviceorientation', gira) }
  }, [])

  const abrir = () => {
    if (!listo || fase !== 'cerrado') return
    // iOS exige pedir el permiso del giroscopio dentro de un gesto
    try { window.DeviceOrientationEvent?.requestPermission?.().catch(() => {}) } catch { /* nada */ }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cambia('sale')
      luego(() => onAbierto?.(), 450)
      return
    }
    cambia('abre')
    // Con la carta ya fuera se mide dónde quedó y cuánto hay que moverla y
    // agrandarla para que cubra la pantalla
    luego(() => {
      const r = carta.current?.getBoundingClientRect()
      if (r && raiz.current) {
        const s = raiz.current.style
        s.setProperty('--dx', `${window.innerWidth / 2 - (r.left + r.width / 2)}px`)
        s.setProperty('--dy', `${window.innerHeight / 2 - (r.top + r.height / 2)}px`)
        s.setProperty('--k', String(Math.max(window.innerWidth / r.width, window.innerHeight / r.height) * 1.08))
      }
      cambia('crece')
    }, 2200)
    luego(() => cambia('sale'), 2800)
    luego(() => onAbierto?.(), 3450)
  }

  const cls = ['sobre-root', fase !== 'cerrado' && 'is-abre', (fase === 'crece' || fase === 'sale') && 'is-crece', fase === 'sale' && 'is-sale'].filter(Boolean).join(' ')
  const sello = <><span className="s-cera" /><span className="s-mono">{monograma}</span></>
  const esquina = (c) => <svg className={`s-orn ${c}`} viewBox="0 0 48 48" aria-hidden="true"><path d={ESQUINA} /></svg>

  return (
    <div ref={raiz} className={cls} style={tema} role="dialog" aria-label="Tu invitación">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id="sb-foil" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a8625c" /><stop offset=".3" stopColor="#f0c9ba" /><stop offset=".5" stopColor="#fff0e6" />
            <stop offset=".72" stopColor="#d99a8c" /><stop offset="1" stopColor="#9c5650" />
          </linearGradient>
        </defs>
      </svg>

      <div className="s-haz" aria-hidden="true" />
      <div className="s-ambiente" aria-hidden="true">
        {PETALOS.map((p, i) => <i key={i} className="s-petalo" style={{ left: p.x + '%', width: p.s, height: p.s * 1.25, animationDuration: p.d + 's', animationDelay: p.t + 's', '--w': p.w + 'px' }} />)}
        {BRILLOS.map((b, i) => <i key={i} className="s-brillo-a" style={{ left: b.x + '%', top: b.y + '%', width: b.s, height: b.s, animationDuration: b.d + 's', animationDelay: b.t + 's' }} />)}
      </div>

      <div className="s-escena">
        <div className="s-mundo" ref={mundo}>
          <div className="s-flota">
            <div className="s-sobre">
              <div className="s-fondo" />
              <div className="s-proy" />

              <div className="s-carta" ref={carta} aria-hidden={fase === 'cerrado'}>
                <div className="s-carta-in">
                  <svg className="s-corona" viewBox="0 0 64 40" aria-hidden="true">
                    <path d="M6 32 4 12l14 10L32 6l14 16 14-10-2 20z" /><path d="M6 37h52" />
                    <circle cx="4" cy="9" r="2" /><circle cx="32" cy="3.5" r="2" /><circle cx="60" cy="9" r="2" />
                  </svg>
                  {linea && <p className="s-c-linea">{linea}</p>}
                  {titulo && <p className="s-c-titulo">{titulo}</p>}
                  {nombre && <p className="s-c-nombre">{nombre}</p>}
                  {fecha && <p className="s-c-fecha">{fecha}</p>}
                </div>
              </div>

              <div className="s-frente">
                <svg className="s-pliegue" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <polyline points="0,100 50,50 100,100" vectorEffect="non-scaling-stroke" />
                  <polyline points="0,0 50,50 100,0" vectorEffect="non-scaling-stroke" className="s-borde" />
                </svg>
              </div>
              {esquina('s-orn-i')}{esquina('s-orn-d')}
              <div className="s-para">
                <span className="s-para-t"><i />Para<i /></span>
                <b className={para ? '' : 'espera'}>{para || ' '}</b>
                {numero && <em>Invitación N.º {numero}</em>}
              </div>

              <div className="s-solapa" aria-hidden="true">
                <i className="s-sol-fuera"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="0,0 50,100 100,0" vectorEffect="non-scaling-stroke" /></svg></i>
                <i className="s-sol-dentro"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="0,0 50,100 100,0" vectorEffect="non-scaling-stroke" /></svg></i>
              </div>

              <span className="s-destello" aria-hidden="true" />
              <button type="button" className={`s-sello${listo ? ' listo' : ''}`} onClick={abrir} disabled={!listo || fase !== 'cerrado'} aria-label={listo ? 'Abrir la invitación' : 'Preparando tu invitación'}>
                <span className="s-mitad s-izq" aria-hidden="true">{sello}</span>
                <span className="s-mitad s-der" aria-hidden="true">{sello}</span>
              </button>

              <div className="s-rafaga" aria-hidden="true">
                {RAFAGA.map((r, i) => <i key={i} style={{ '--x': r.x + 'px', '--y': r.y + 'px', width: r.s, height: r.s, '--t': r.t + 's' }} />)}
              </div>
            </div>
            <div className="s-suelo" aria-hidden="true" />
          </div>
        </div>
        <p className="s-pista" role="status">{fase !== 'cerrado' ? ' ' : listo ? 'Toca el sello para abrir' : 'Preparando tu invitación…'}</p>
      </div>
    </div>
  )
}
