import { useState, useRef, useEffect } from 'react'
import './sobre.css'

// ─── El sobre de apertura ───
// Pantalla completa ANTES del deck. No es un componente de interfaz: es la foto de
// un objeto de papelería sobre una mesa de terciopelo, con UNA luz que viene de
// arriba a la izquierda. Todo lo que tiene relieve —el lacre, los bordes del papel,
// las solapas, la cinta— se ilumina y hace sombra con esa misma luz.
//
// El sobre es un A7 vertical (5¼ × 7¼") visto por detrás: solapa de pico, solapas
// laterales e inferior superpuestas, forro troquelado por dentro, el nombre del
// invitado escrito a mano. Dentro va una tarjeta 5 × 7" de algodón con borde de
// barba (deckle).
//
// Al tocar el lacre: se parte en dos (la mitad de arriba se queda pegada a la
// solapa y se va con ella), la solapa gira sobre su bisagra y su sombra corre por
// el sobre, la tarjeta sale con un tirón y frena, y la cámara se acerca mientras
// la pantalla se funde al marfil de la tarjeta y de ahí al deck (~3,5 s).
// Solo se anima transform, opacity y filter.
//
// Con reduced-motion no hay inclinación ni apertura: un fundido.
//
// Es genérico: la plantilla lo configura con props y `tema` (variables --sb-*).
//   listo      → ya llegaron los datos; hasta entonces el sello no se puede tocar
//   para       → nombre del invitado (el sobrescrito, a mano)
//   monograma  → lo que lleva el lacre (15, M…)
//   linea / titulo / nombre / fecha → la presentación que trae la tarjeta
//   onAbierto  → se llama al terminar el fundido (aquí se desmonta el sobre)
// Ese toque es la primera interacción del invitado: YoutubeBtn engancha el mismo
// gesto (pointerdown/touchend en window) para arrancar la música.

// ─── Geometría (unidades del sobre: 525 × 725, la proporción del A7) ───

// Azar con semilla: el lacre y la barba de la tarjeta salen iguales en cada visita
const azar = (s) => () => {
  s = (s + 0x6D2B79F5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const n1 = (v) => v.toFixed(1)

// Curva cerrada y suave que pasa por los puntos (Catmull-Rom → Bézier)
const curva = (p) => {
  const n = p.length
  let d = `M${n1(p[0][0])} ${n1(p[0][1])}`
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n]
    d += `C${n1(b[0] + (c[0] - a[0]) / 6)} ${n1(b[1] + (c[1] - a[1]) / 6)} ${n1(c[0] - (e[0] - b[0]) / 6)} ${n1(c[1] - (e[1] - b[1]) / 6)} ${n1(c[0])} ${n1(c[1])}`
  }
  return d + 'Z'
}

// El charco de cera: un círculo que se derramó desparejo, con tres lóbulos
const CERA = (() => {
  const r = azar(15), f = [r() * 6.28, r() * 6.28, r() * 6.28]
  const lob = [0, 1, 2].map(() => [r() * 6.28, 3 + r() * 5])
  const p = []
  for (let i = 0; i < 72; i++) {
    const t = (i / 72) * Math.PI * 2
    let R = 80 * (1 + 0.028 * Math.sin(3 * t + f[0]) + 0.02 * Math.sin(5 * t + f[1]) + 0.01 * Math.sin(11 * t + f[2]))
    for (const [a, h] of lob) { const d = Math.atan2(Math.sin(t - a), Math.cos(t - a)); R += h * Math.exp((-d * d) / 0.05) }
    p.push([Math.cos(t) * R, Math.sin(t) * R])
  }
  return curva(p)
})()

// Borde de barba de la tarjeta (500 × 700): fibras que se comen el canto, irregular
const BARBA = (() => {
  const r = azar(7), p = []
  const lado = (x0, y0, x1, y1, nx, ny) => {
    const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 3.2)
    let o = 1.5
    for (let i = 0; i < n; i++) {
      const t = i / n
      o = o * 0.55 + r() * 4.2 * 0.45 + (r() < 0.06 ? r() * 2.5 : 0)
      p.push([x0 + (x1 - x0) * t + nx * o, y0 + (y1 - y0) * t + ny * o])
    }
  }
  lado(0, 0, 500, 0, 0, 1); lado(500, 0, 500, 700, -1, 0); lado(500, 700, 0, 700, 0, -1); lado(0, 700, 0, 0, 1, 0)
  return 'M' + p.map((q) => `${n1(q[0])} ${n1(q[1])}`).join('L') + 'Z'
})()

// Solapa de pico (525 × 319): por fuera apunta abajo; la cara de dentro se dibuja
// apuntando arriba porque es como queda vista cuando la solapa está abierta.
const SOLAPA    = 'M0 0H525L279 299Q262.5 319 246 299Z'
const SOLAPA_IN = 'M0 319H525L279 20Q262.5 0 246 20Z'
const FORRO     = 'M15 319L248 36Q262.5 18 277 36L510 319Z'
// Cuerpo (el dorso: solapas laterales e inferior). Arriba queda la garganta: la V
// entre las dos solapas laterales por donde, con la solapa abierta, se ve la
// tarjeta dentro del sobre.
const CUERPO    = 'M0 4H58Q178 92 262.5 232Q347 92 467 4H525V716Q525 725 516 725H9Q0 725 0 716Z'
const BORDE_INF = 'M0 336Q150 268 262.5 232Q375 268 525 336'
const LADO_I    = 'M0 0H58Q178 92 262.5 232Q150 268 0 336Z'
const LADO_D    = 'M525 0H467Q347 92 262.5 232Q375 268 525 336Z'
const CANTO_I   = 'M58 4Q178 92 262.5 232'
const CANTO_D   = 'M467 4Q347 92 262.5 232'

// ─── El lacre en relieve ───
// Se dibuja un mapa de alturas en grises (charco .70, labio del cuño .82, fondo del
// cuño .50, monograma .66) y se ilumina con la misma luz de la escena: difusa +
// especular, azimut 225° (arriba a la izquierda), elevación 46°.
//
// Se ilumina UNA vez, en un canvas, y las dos piezas son esa imagen. Con un filtro
// SVG vivo (feDiffuseLighting) el navegador volvía a calcular la luz cada vez que
// rasterizaba la pieza, y la que va pegada a la solapa se rasteriza de nuevo al
// empezar el giro en 3D: en el móvil eran ~350 ms congelados a mitad de apertura.
// <Lacre> (el filtro SVG) queda solo como respaldo si el canvas falla.
const PX = 2                                   // píxeles del lienzo por unidad del lacre
const LUZ = [-0.491, -0.491, 0.719]           // hacia la luz: azimut 225°, elevación 46°
const MEDIO = (() => { const h = [LUZ[0], LUZ[1], LUZ[2] + 1], m = Math.hypot(...h); return h.map((v) => v / m) })()
const rgb = (hex, def) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec((hex || '').trim()); return m ? m.slice(1).map((v) => parseInt(v, 16) / 255) : def }
const LACRES = new Map()

async function pintaLacre(mono, cera, brillo) {
  const clave = `${mono}|${cera}|${brillo}`
  if (LACRES.has(clave)) return LACRES.get(clave)
  const fuente = "700 52px 'Playfair Display'"
  await Promise.race([document.fonts?.load(fuente), new Promise((r) => setTimeout(r, 1500))]).catch(() => {})
  const N = 220 * PX
  const lienzo = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c }

  // 1 · el mapa de alturas
  const ca = lienzo(), g = ca.getContext('2d')
  g.translate(N / 2, N / 2); g.scale(PX, PX)
  g.fillStyle = '#b3b3b3'; g.fill(new Path2D(CERA))
  g.beginPath(); g.arc(0, 0, 58, 0, 7); g.lineWidth = 9; g.strokeStyle = '#d1d1d1'; g.stroke()
  g.beginPath(); g.arc(0, 0, 54, 0, 7); g.fillStyle = '#808080'; g.fill()
  g.beginPath(); g.arc(0, 0, 47, 0, 7); g.lineWidth = 1.8; g.strokeStyle = '#9c9c9c'; g.stroke()
  g.font = `700 52px 'Playfair Display',Georgia,serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ababab'
  g.fillText(mono, 0, 4)
  const src = g.getImageData(0, 0, N, N).data
  const alfa = new Float32Array(N * N)
  let h = new Float32Array(N * N)
  for (let i = 0; i < N * N; i++) { const a = src[i * 4 + 3] / 255; alfa[i] = a; h[i] = (src[i * 4] / 255) * a }

  // 2 · suavizado (tres pasadas de caja ≈ gaussiana de 1,7 unidades) y ondulación de la cera
  const caja = (v, r) => {
    const o = new Float32Array(N * N)
    for (let y = 0; y < N; y++) { let s = 0; for (let x = -r; x <= r; x++) s += v[y * N + Math.min(N - 1, Math.max(0, x))]
      for (let x = 0; x < N; x++) { o[y * N + x] = s / (2 * r + 1); s += v[y * N + Math.min(N - 1, x + r + 1)] - v[y * N + Math.max(0, x - r)] } }
    const p = new Float32Array(N * N)
    for (let x = 0; x < N; x++) { let s = 0; for (let y = -r; y <= r; y++) s += o[Math.min(N - 1, Math.max(0, y)) * N + x]
      for (let y = 0; y < N; y++) { p[y * N + x] = s / (2 * r + 1); s += o[Math.min(N - 1, y + r + 1) * N + x] - o[Math.max(0, y - r) * N + x] } }
    return p
  }
  for (let k = 0; k < 3; k++) h = caja(h, 3)
  const r = azar(3), M = 12, red = Array.from({ length: (M + 1) * (M + 1) }, () => r())
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const fx = (x / N) * M, fy = (y / N) * M, ix = fx | 0, iy = fy | 0, ux = fx - ix, uy = fy - iy, tx = ux * ux * (3 - 2 * ux), ty = uy * uy * (3 - 2 * uy)
    const v = red[iy * (M + 1) + ix] * (1 - tx) * (1 - ty) + red[iy * (M + 1) + ix + 1] * tx * (1 - ty) + red[(iy + 1) * (M + 1) + ix] * (1 - tx) * ty + red[(iy + 1) * (M + 1) + ix + 1] * tx * ty
    h[y * N + x] += v * 0.022 * alfa[y * N + x]
  }

  // 3 · la luz: normal por diferencias centrales, difusa + especular (Phong, como el filtro SVG)
  const [cr, cg, cb] = rgb(cera, [0.92, 0.64, 0.6]), [br, bg, bb] = rgb(brillo, [1, 0.94, 0.9])
  const cb2 = lienzo(), g2 = cb2.getContext('2d'), im = g2.createImageData(N, N), d = im.data
  const S = 9                                   // pendiente del relieve (a ojo, contra el filtro SVG)
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const i = y * N + x
    if (!alfa[i]) continue
    const nx = -S * (h[i + 1] - h[i - 1]), ny = -S * (h[i + N] - h[i - N]), m = Math.hypot(nx, ny, 1)
    const dif = Math.max(0, (nx * LUZ[0] + ny * LUZ[1] + LUZ[2]) / m)
    const esp = 0.75 * Math.pow(Math.max(0, (nx * MEDIO[0] + ny * MEDIO[1] + MEDIO[2]) / m), 18) * 0.85
    d[i * 4] = Math.min(255, (cr * dif + br * esp) * 255)
    d[i * 4 + 1] = Math.min(255, (cg * dif + bg * esp) * 255)
    d[i * 4 + 2] = Math.min(255, (cb * dif + bb * esp) * 255)
    d[i * 4 + 3] = alfa[i] * 255
  }
  g2.putImageData(im, 0, 0)

  // 4 · sombras: la larga hacia abajo a la derecha y la de contacto
  const cf = lienzo(), g3 = cf.getContext('2d')
  g3.shadowColor = 'rgba(42,10,24,.42)'; g3.shadowBlur = 10 * PX; g3.shadowOffsetX = 6 * PX; g3.shadowOffsetY = 9 * PX
  g3.drawImage(cb2, 0, 0)
  g3.shadowColor = 'rgba(42,10,24,.36)'; g3.shadowBlur = 2.6 * PX; g3.shadowOffsetX = 1.2 * PX; g3.shadowOffsetY = 2 * PX
  g3.drawImage(cb2, 0, 0)
  const url = cf.toDataURL()
  LACRES.set(clave, url)
  return url
}

function Lacre({ mono }) {
  return (
    <svg viewBox="-110 -110 220 220" aria-hidden="true">
      <g filter="url(#sb-f-cera)">
        <path d={CERA} fill="#b3b3b3" />
        <circle r="58" fill="none" stroke="#d1d1d1" strokeWidth="9" />
        <circle r="54" fill="#808080" />
        <circle r="47" fill="none" stroke="#9c9c9c" strokeWidth="1.8" />
        <text y="3" textAnchor="middle" dominantBaseline="central" fontSize="52" fontWeight="700" fontFamily="'Playfair Display',Georgia,serif" fill="#ababab" style={{ fontVariantNumeric: 'lining-nums' }}>{mono}</text>
      </g>
    </svg>
  )
}

// Grano y fieltro del algodón, pintados UNA vez en un canvas y usados como imagen.
// Con feTurbulence el ruido se recalculaba cada vez que la solapa o la tarjeta se
// volvían a rasterizar al girar, y en el móvil la solapa daba un tirón al arrancar.
let RUIDO = null
const ruido = () => {
  if (RUIDO) return RUIDO
  const lienzo = (n, pinta) => { const c = document.createElement('canvas'); c.width = c.height = n; pinta(c.getContext('2d'), n); return c }
  const r = azar(5)
  const motas = (g, n, k) => {
    const im = g.createImageData(n, n)
    for (let i = 0; i < im.data.length; i += 4) { im.data[i] = im.data[i + 1] = im.data[i + 2] = 128 + (r() + r() + r() - 1.5) * k; im.data[i + 3] = 255 }
    g.putImageData(im, 0, 0)
  }
  const grano = lienzo(160, (g, n) => motas(g, n, 70))
  // Fieltro: unas pocas motas ampliadas con suavizado. Se amplía un mosaico de 3 × 3
  // y se queda el del centro, para que el suavizado cruce el borde y no se note la costura.
  const semilla = lienzo(14, (g, n) => motas(g, n, 110))
  const mosaico = lienzo(42, (g) => { for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) g.drawImage(semilla, x * 14, y * 14) })
  const fieltro = lienzo(420, (g, n) => { g.imageSmoothingQuality = 'high'; g.drawImage(mosaico, -n, -n, n * 3, n * 3) })
  RUIDO = { grano: grano.toDataURL(), fieltro: fieltro.toDataURL() }
  return RUIDO
}

// Capas de papel: color, fieltro del algodón, grano y la caída de la luz
const Papel = ({ d, color = 'var(--sb-papel)', luz = 'url(#sb-luz)' }) => (
  <>
    <path d={d} style={{ fill: color }} />
    <path d={d} fill="url(#sb-fieltro)" className="s-mezcla" opacity=".16" />
    <path d={d} fill="url(#sb-grano)" className="s-mezcla" opacity=".7" />
    <path d={d} fill={luz} />
  </>
)

// ─── El tamaño del sobrescrito ───
// El sobre mide lo mismo para «Ana» que para «Sr. Francisco Obando y Sra.», así
// que lo que se ajusta es la letra. Devuelve el cuerpo en unidades --u (1 % del
// ancho del sobre). Se calcula y no se mide: medir obliga a esperar a que cargue
// Parisienne, y el nombre aparecería primero grande y después encogido.
//   · Ancho útil: 80u (el sobrescrito va de 13 % a 7 %).
//   · Parisienne gasta ~0,42 em por letra (medido con «Familia Figueroa Salcedo»).
//   · Hasta 2 renglones: la palabra más larga tiene que caber entera en uno, y el
//     nombre completo en dos (a 1,7 y no 2, porque los cortes nunca caen parejos).
//   · Entre 5,6u (se sigue leyendo a 375 px) y 9.4u (el tope que deja aire al lacre).
const ANCHO_U = 80, EM_LETRA = 0.42
export function tallaPara(nombre = '') {
  const t = nombre.trim()
  if (!t) return 9.4
  const palabra = Math.max(...t.split(/\s+/).map(p => p.length))
  const porPalabra = ANCHO_U / (palabra * EM_LETRA)
  const porTotal = (ANCHO_U * 1.7) / (t.length * EM_LETRA)
  return Math.max(5.6, Math.min(9.4, porPalabra, porTotal))
}

export default function Sobre({ listo = false, para, monograma = '15', linea, titulo, nombre, fecha, tema, onAbierto }) {
  const [fase, setFase] = useState('cerrado')   // cerrado → abre → crece → sale
  const [rz] = useState(ruido)
  const [lacreUrl, setLacreUrl] = useState(null)   // null: pintándose · '' : falló, va el filtro SVG
  const raiz   = useRef(null)
  const mundo  = useRef(null)
  const sombra = useRef(null)
  const carta  = useRef(null)
  const sobre  = useRef(null)
  const faseRef = useRef('cerrado')
  const plazos  = useRef([])
  useEffect(() => () => plazos.current.forEach(clearTimeout), [])

  // El lacre se ilumina con los colores del tema, así que se pinta ya montado
  useEffect(() => {
    let vivo = true
    const css = getComputedStyle(raiz.current)
    pintaLacre(monograma, css.getPropertyValue('--sb-cera'), css.getPropertyValue('--sb-cera-luz'))
      .then((u) => { if (vivo) setLacreUrl(u) })
      .catch(() => { if (vivo) setLacreUrl('') })
    return () => { vivo = false }
  }, [monograma])
  const luego  = (fn, ms) => { plazos.current.push(setTimeout(fn, ms)) }
  const cambia = (f) => { faseRef.current = f; setFase(f) }

  // Mientras el sobre está abierto el deck no debe moverse con el teclado: eso lo
  // bloquea la plantilla con <Deck bloqueado>; aquí solo se evita el scroll de las flechas.
  useEffect(() => {
    const k = (e) => { if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  // Inclinación mínima con el cursor o el giroscopio: el papel se levanta un
  // pelo de la mesa y su sombra se corre al lado contrario. Pocos grados: un
  // objeto apoyado no baila. Al abrirse vuelve a quedar plano.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0
    const lim = (v) => Math.max(-1, Math.min(1, v))
    const mueve = (e) => { tx = (e.clientX / window.innerWidth - 0.5) * 2; ty = (e.clientY / window.innerHeight - 0.5) * 2 }
    const gira = (e) => { if (e.gamma != null && e.beta != null) { tx = lim(e.gamma / 25); ty = lim((e.beta - 45) / 25) } }
    const paso = () => {
      const quieto = faseRef.current !== 'cerrado'
      cx += ((quieto ? 0 : tx) - cx) * 0.06
      cy += ((quieto ? 0 : ty) - cy) * 0.06
      if (mundo.current) mundo.current.style.transform = `rotateY(${(cx * 3.2).toFixed(2)}deg) rotateX(${(-cy * 2.4).toFixed(2)}deg)`
      if (sombra.current) sombra.current.style.transform = `translate(${(-cx * 5).toFixed(1)}px,${(-cy * 4).toFixed(1)}px)`
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
    // Con la tarjeta ya fuera, se mide el centro de lo que asoma (de su borde de
    // arriba a la boca del sobre) para que la cámara se acerque justo ahí.
    luego(() => {
      const c = carta.current?.getBoundingClientRect(), s = sobre.current?.getBoundingClientRect()
      if (c && s && raiz.current) {
        const st = raiz.current.style
        st.setProperty('--dx', `${(window.innerWidth / 2 - (c.left + c.width / 2)).toFixed(1)}px`)
        st.setProperty('--dy', `${(window.innerHeight / 2 - (c.top + s.top) / 2).toFixed(1)}px`)
      }
      cambia('crece')
    }, 2250)
    luego(() => cambia('sale'), 2950)
    luego(() => onAbierto?.(), 3500)
  }

  const cls = ['sobre-root', fase !== 'cerrado' && 'is-abre', (fase === 'crece' || fase === 'sale') && 'is-crece', fase === 'sale' && 'is-sale'].filter(Boolean).join(' ')
  const lacre = lacreUrl ? <img src={lacreUrl} alt="" draggable="false" /> : lacreUrl === '' ? <Lacre mono={monograma} /> : null

  return (
    <div ref={raiz} className={cls} style={{ ...tema, '--sb-ruido-g': `url(${rz.grano})`, '--sb-ruido-f': `url(${rz.fieltro})` }} role="dialog" aria-label="Tu invitación">
      <svg className="s-defs" width="0" height="0" aria-hidden="true">
        <defs>
          {/* Grano fino y fieltro del papel de algodón: ruido gris que se mezcla en soft-light */}
          <pattern id="sb-grano" width="160" height="160" patternUnits="userSpaceOnUse"><image href={rz.grano} width="160" height="160" /></pattern>
          <pattern id="sb-fieltro" width="420" height="420" patternUnits="userSpaceOnUse"><image href={rz.fieltro} width="420" height="420" /></pattern>

          {/* Forro troquelado: enrejado fino con florecitas, impreso en marfil sobre palo rosa */}
          <pattern id="sb-forro" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 .4H20M.4 0V20" fill="none" strokeWidth=".7" style={{ stroke: 'var(--sb-forro-2)' }} opacity=".55" />
            <g style={{ fill: 'var(--sb-forro-2)' }} opacity=".8">
              <circle cx="10" cy="7.6" r="1.25" /><circle cx="10" cy="12.4" r="1.25" /><circle cx="7.6" cy="10" r="1.25" /><circle cx="12.4" cy="10" r="1.25" />
            </g>
            <circle cx="10" cy="10" r=".9" fill="#c8877c" />
          </pattern>

          {/* La luz: entra por arriba a la izquierda y cae hacia abajo a la derecha */}
          <linearGradient id="sb-luz" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".2" /><stop offset=".5" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#3b0f22" stopOpacity=".16" />
          </linearGradient>
          <linearGradient id="sb-canto" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".8" /><stop offset=".5" stopColor="#fff" stopOpacity=".25" />
            <stop offset="1" stopColor="#5a2234" stopOpacity=".35" />
          </linearGradient>
          <linearGradient id="sb-foil" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9c5a52" /><stop offset=".35" stopColor="#d9a191" /><stop offset=".5" stopColor="#f6d9cc" />
            <stop offset=".68" stopColor="#c08074" /><stop offset="1" stopColor="#8e4f49" />
          </linearGradient>
          {/* Seda: el brillo corre a lo largo de la cinta, más oscura en los cantos */}
          <linearGradient id="sb-seda" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--sb-cinta-2)' }} /><stop offset=".32" style={{ stopColor: 'var(--sb-cinta)' }} />
            <stop offset=".45" stopColor="#f3d3cf" /><stop offset=".62" style={{ stopColor: 'var(--sb-cinta)' }} />
            <stop offset="1" style={{ stopColor: 'var(--sb-cinta-2)' }} />
          </linearGradient>

          <filter id="sb-f-sombra" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.5" /></filter>
          <filter id="sb-f-proy" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14" /></filter>
          <filter id="sb-f-ao" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="2.4" /></filter>
          <filter id="sb-f-cinta" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.6" /><feOffset dx="2.5" dy="4" result="o" />
            <feFlood floodColor="#2a0a18" floodOpacity=".4" /><feComposite in2="o" operator="in" result="s" />
            <feMerge><feMergeNode in="s" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* El lacre: el mapa de alturas se ilumina con luz difusa + especular (azimut 225°:
              arriba a la izquierda) y proyecta su sombra larga y la de contacto. */}
          <filter id="sb-f-cera" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="h0" />
            <feGaussianBlur in="h0" stdDeviation="1.7" result="h1" />
            <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="3" result="t" />
            <feColorMatrix in="t" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .07 0 0 0 0" result="tn" />
            <feComposite in="h1" in2="tn" operator="arithmetic" k2="1" k3="1" result="h" />
            <feDiffuseLighting in="h" surfaceScale="10" diffuseConstant="1" result="dif" style={{ lightingColor: 'var(--sb-cera)' }}>
              <feDistantLight azimuth="225" elevation="46" />
            </feDiffuseLighting>
            <feSpecularLighting in="h" surfaceScale="10" specularConstant=".75" specularExponent="18" result="spe" style={{ lightingColor: 'var(--sb-cera-luz)' }}>
              <feDistantLight azimuth="225" elevation="46" />
            </feSpecularLighting>
            <feComposite in="dif" in2="spe" operator="arithmetic" k2="1" k3=".85" result="lit0" />
            <feComposite in="lit0" in2="SourceAlpha" operator="in" result="lit" />
            <feGaussianBlur in="SourceAlpha" stdDeviation="5" /><feOffset dx="6" dy="9" result="o1" />
            <feFlood floodColor="#2a0a18" floodOpacity=".42" /><feComposite in2="o1" operator="in" result="s1" />
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.3" /><feOffset dx="1.2" dy="2" result="o2" />
            <feFlood floodColor="#2a0a18" floodOpacity=".36" /><feComposite in2="o2" operator="in" result="s2" />
            <feMerge><feMergeNode in="s1" /><feMergeNode in="s2" /><feMergeNode in="lit" /></feMerge>
          </filter>
        </defs>
      </svg>

      <div className="s-camara">
        <div className="s-mesa" aria-hidden="true" />

        <div className="s-escena">
          <div className="s-sombra" ref={sombra} aria-hidden="true" />
          <div className="s-mundo" ref={mundo}>
            <div className="s-sobre" ref={sobre}>
              {/* El interior que se ve por la garganta: el forro, en penumbra */}
              <div className="s-dentro" aria-hidden="true" />

              <div className="s-solapa" aria-hidden="true">
                <div className="s-sol-fuera">
                  <svg viewBox="0 0 525 319" overflow="visible">
                    <path className="s-sol-sombra" d={SOLAPA} transform="translate(3 5)" filter="url(#sb-f-sombra)" />
                    <Papel d={SOLAPA} />
                    <path d="M0 .6L246 299" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.1" />
                    <path d="M525 .6L279 299" fill="none" stroke="#5a2234" strokeOpacity=".22" strokeWidth="1.1" />
                  </svg>
                  <div className="s-pieza s-pieza-a">{lacre}</div>
                </div>
                <div className="s-sol-dentro">
                  <svg viewBox="0 0 525 319" overflow="visible">
                    <path className="s-sol-sombra-in" d={SOLAPA_IN} transform="translate(4 6)" filter="url(#sb-f-sombra)" />
                    <Papel d={SOLAPA_IN} color="var(--sb-papel-2)" />
                    <path d={FORRO} style={{ fill: 'var(--sb-forro)' }} />
                    <path d={FORRO} fill="url(#sb-forro)" />
                    <path d={FORRO} fill="url(#sb-grano)" className="s-mezcla" opacity=".35" />
                    <path d={FORRO} fill="url(#sb-luz)" />
                  </svg>
                </div>
              </div>

              <div className="s-carta" ref={carta} aria-hidden={fase === 'cerrado'}>
                <svg className="s-carta-fondo" viewBox="0 0 500 700" preserveAspectRatio="none" overflow="visible" aria-hidden="true">
                  <path className="s-carta-sombra" d={BARBA} transform="translate(5 9)" filter="url(#sb-f-sombra)" />
                  <Papel d={BARBA} color="var(--sb-carta)" />
                  <rect x="24" y="24" width="452" height="652" fill="none" stroke="url(#sb-foil)" strokeWidth="1.3" />
                </svg>
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

              {/* Dentro del bolsillo hay menos luz: lo que asoma por la garganta va en penumbra */}
              <div className="s-penumbra" aria-hidden="true" />

              <svg className="s-cuerpo" viewBox="0 0 525 725" aria-hidden="true">
                <defs><clipPath id="sb-c-cuerpo"><path d={CUERPO} /></clipPath></defs>
                <g clipPath="url(#sb-c-cuerpo)">
                  <rect width="525" height="725" style={{ fill: 'var(--sb-papel)' }} />
                  {/* Cada solapa está a un ángulo distinto de la luz: la izquierda la recibe, la derecha no */}
                  <path d={LADO_I} fill="#fff" opacity=".1" />
                  <path d={LADO_D} fill="#4a1a2c" opacity=".07" />
                  {/* Oclusión al pie del canto de la solapa inferior, y el canto que brilla */}
                  <path d={BORDE_INF} fill="none" stroke="#4a1a2c" strokeOpacity=".28" strokeWidth="5" transform="translate(0 -3)" filter="url(#sb-f-ao)" />
                  <path d={BORDE_INF} fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="1.1" />
                  <rect width="525" height="725" fill="url(#sb-fieltro)" className="s-mezcla" opacity=".16" />
                  <rect width="525" height="725" fill="url(#sb-grano)" className="s-mezcla" opacity=".7" />
                  <rect width="525" height="725" fill="url(#sb-luz)" />
                </g>
                <path d={CUERPO} fill="none" stroke="url(#sb-canto)" strokeWidth="1.3" />
                {/* Los cantos de la garganta: el izquierdo da la espalda a la luz y echa
                    sombra dentro del sobre; el derecho la recibe y brilla */}
                <path d={CANTO_I} fill="none" stroke="#2a0a18" strokeOpacity=".35" strokeWidth="6" transform="translate(4 5)" filter="url(#sb-f-ao)" />
                <path d={CANTO_I} fill="none" stroke="#5a2234" strokeOpacity=".25" strokeWidth="1" />
                <path d={CANTO_D} fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="1.1" />
              </svg>

              <div className="s-cinta" aria-hidden="true">
                <svg viewBox="-150 -150 300 300">
                  <g filter="url(#sb-f-cinta)">
                    <path transform="rotate(131)" d="M0 -12.5Q70 -14 136 -12L122 .5 137 13Q70 11.5 0 12.5Z" fill="url(#sb-seda)" />
                    <path transform="rotate(54)" d="M0 -12.5Q70 -11 128 -13L115 0 129 12Q70 14 0 12.5Z" fill="url(#sb-seda)" />
                  </g>
                </svg>
              </div>

              {/* La sombra que la solapa, al levantarse, echa sobre el sobre */}
              <svg className="s-proy" viewBox="0 0 525 319" overflow="visible" aria-hidden="true"><path d={SOLAPA} transform="translate(10 0)" filter="url(#sb-f-proy)" /></svg>

              <div className="s-sobrescrito" style={{ '--talla': tallaPara(para) }}>
                {para && <span className="s-para-t">Para</span>}
                <b className={para ? '' : 'espera'}>{para || ' '}</b>
              </div>

              <div className="s-pieza s-pieza-b" aria-hidden="true">{lacre}</div>
              <button type="button" className={`s-toque${listo ? ' listo' : ''}`} onClick={abrir} disabled={!listo || fase !== 'cerrado'} aria-label={listo ? 'Abrir la invitación' : 'Preparando tu invitación'} />
            </div>
          </div>
          <p className="s-pista" role="status">{fase !== 'cerrado' ? ' ' : listo ? 'Toca el sello para abrir' : 'Preparando tu invitación…'}</p>
        </div>
      </div>
      <div className="s-velo" aria-hidden="true" />
    </div>
  )
}
