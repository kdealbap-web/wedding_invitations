// ─── Reparto de mesas en imágenes, desde el navegador ───
//
// El script `scripts/export-mesas-img.mjs` hace lo mismo con Chrome headless.
// Aquí no hay navegador que gobernar, así que las hojas se dibujan en un
// <canvas> y se empaquetan en un ZIP: el navegador no deja descargar doce
// archivos sueltos sin que el usuario apruebe cada uno.
//
// Comparte con el script la paleta, las tipografías y el criterio de qué
// nombre está incompleto; lo que cambia es la herramienta de dibujo.
import { supabase } from '../lib/supabase'
import { logoWedding, florSupIzq, florSupDer, florInfDer, florInfIzq } from '../assets/images'
import { nombreIncompleto } from './nombres'

const TINTA  = '#2A1D14'
const SUAVE  = '#8A7866'
const TENUE  = '#C0B3A3'
const LINEA  = '#EFE7DC'
const BORDE  = '#E3D9CB'
const ORO    = '#C8A96E'
const ROJO   = '#B00020'

// 2x para que al imprimir en papel no se vea pixelado
const ESCALA = 2
const CARTA  = { w: 816, h: 1056 }

// El marfil de la tarjeta de participación (--p-bg en tarjeta.css, que va en
// oklch). Aquí va en hex porque el canvas lo pinta en más navegadores que
// oklch(), y porque el resto de esta paleta ya estaba en hex.
const MARFIL = '#FBF5EA'
const FILETE = '#D8C9AE'
const ORO_P  = '#B08C4F'   // --p-gold: dorado que sí se lee sobre marfil
const ACC_P  = '#9A5B45'   // --p-acc: la misma terracota del sitio

const fd = (px, peso = 400) => `${peso} ${px}px "Cormorant Garamond", Georgia, serif`
const fb = (px, peso = 300) => `${peso} ${px}px Jost, system-ui, sans-serif`
const fs = px => `400 ${px}px "Great Vibes", cursive`

/** Las tipografías tienen que estar listas o el canvas dibuja con la de repuesto. */
async function esperarFuentes() {
  await document.fonts.ready
  await Promise.all([
    document.fonts.load('400 64px "Cormorant Garamond"'),
    document.fonts.load('600 44px "Cormorant Garamond"'),
    document.fonts.load('600 62px "Cormorant Garamond"'),
    document.fonts.load('300 14px Jost'),
    document.fonts.load('400 40px "Great Vibes"'),
  ])
}

/** Una imagen del afiche. Si no carga, se dibuja sin ella: no es un dato. */
const cargarImagen = src => new Promise(res => {
  const img = new Image()
  img.onload = () => res(img)
  img.onerror = () => res(null)
  img.src = src
})

/** El escudo y las cuatro esquinas florales, en paralelo. */
async function cargarArte() {
  const [logo, si, sd, id, ii] = await Promise.all(
    [logoWedding, florSupIzq, florSupDer, florInfDer, florInfIzq].map(cargarImagen))
  return { logo, si, sd, id, ii }
}

function lienzo(w, h) {
  const c = document.createElement('canvas')
  c.width = w * ESCALA
  c.height = h * ESCALA
  const x = c.getContext('2d')
  x.scale(ESCALA, ESCALA)
  x.fillStyle = '#fff'
  x.fillRect(0, 0, w, h)
  x.textBaseline = 'alphabetic'
  return { c, x }
}

const png = c => new Promise(res => c.toBlob(b => res(b), 'image/png'))

// La mesa de los novios no entra en NINGUNA imagen: en el afiche porque ellos no
// van a buscarse en el atril, y en las hojas porque el salón ya sabe dónde los
// sienta. Sigue en la base y en el Excel —el catering los cobra, así que cuentan
// para el total—; lo que no hace falta es imprimirla.
const esPrincipal = m => /^\s*Mesa\s+(principal|de\s+los\s+novios)\s*$/i.test(m.nombre || '')
const paraImprimir = mesas => mesas.filter(m => !esPrincipal(m))

/** Recorta con puntos suspensivos si no cabe. */
function recorta(x, texto, ancho) {
  if (x.measureText(texto).width <= ancho) return texto
  let s = texto
  while (s.length > 1 && x.measureText(s + '…').width > ancho) s = s.slice(0, -1)
  return s + '…'
}

// ─── Una hoja por mesa ───
async function hojaMesa(mesa, gente, cuando) {
  const { c, x } = lienzo(CARTA.w, CARTA.h)
  const M = 76
  const ancho = CARTA.w - M * 2

  x.textAlign = 'center'
  x.fillStyle = SUAVE
  x.font = fb(12)
  x.fillText('A N G E L Y   &   K E V I N   ·   1 2 · I X · 2 0 2 6', CARTA.w / 2, 96)

  x.fillStyle = TINTA
  x.font = fd(64)
  x.fillText(recorta(x, mesa.nombre, ancho), CARTA.w / 2, 172)

  x.fillStyle = SUAVE
  x.font = fb(13)
  x.fillText(`${gente.length} de ${mesa.capacidad} puestos`, CARTA.w / 2, 200)

  // Filete ornamental
  const y0 = 236
  x.strokeStyle = BORDE
  x.lineWidth = 1
  x.beginPath(); x.moveTo(M, y0); x.lineTo(CARTA.w / 2 - 16, y0); x.stroke()
  x.beginPath(); x.moveTo(CARTA.w / 2 + 16, y0); x.lineTo(CARTA.w - M, y0); x.stroke()
  x.fillStyle = ORO
  x.save(); x.translate(CARTA.w / 2, y0); x.rotate(Math.PI / 4)
  x.fillRect(-4, -4, 8, 8); x.restore()

  let y = y0 + 52
  if (!gente.length) {
    x.fillStyle = TENUE
    x.font = `italic ${fb(15)}`
    x.fillText('Esta mesa todavía no tiene a nadie asignado.', CARTA.w / 2, y + 40)
  }

  for (const [i, p] of gente.entries()) {
    x.textAlign = 'left'
    x.fillStyle = TENUE
    x.font = fb(12)
    x.fillText(String(i + 1), M, y)

    x.fillStyle = p.falta ? ROJO : TINTA
    x.font = fd(26)
    x.fillText(recorta(x, p.nombre, ancho * 0.56), M + 30, y + 2)
    if (p.falta) {
      const w = Math.min(x.measureText(p.nombre).width, ancho * 0.56)
      x.beginPath(); x.arc(M + 30 + w + 10, y - 5, 3.5, 0, Math.PI * 2); x.fill()
    }

    x.textAlign = 'right'
    x.fillStyle = '#A2917F'
    x.font = fb(11.5)
    x.fillText(recorta(x, p.tarjeta, ancho * 0.36), CARTA.w - M, y)

    y += 20
    x.strokeStyle = '#F2EBE1'
    x.beginPath(); x.moveTo(M, y); x.lineTo(CARTA.w - M, y); x.stroke()
    y += 24
  }

  // Pie
  const yp = CARTA.h - 84
  x.strokeStyle = BORDE
  x.beginPath(); x.moveTo(M, yp); x.lineTo(CARTA.w - M, yp); x.stroke()
  x.fillStyle = '#A2917F'
  x.font = fb(11)
  x.textAlign = 'left'
  x.fillText('Casona del Prado · Barranquilla', M, yp + 22)
  x.textAlign = 'right'
  x.fillText(cuando, CARTA.w - M, yp + 22)

  return png(c)
}

// ─── El afiche de bienvenida ───
//
// UNA sola lámina con todas las mesas, la que se monta en la entrada del salón.
// Antes era una hoja por mesa y no servía: el invitado que llega no sabe cuál
// es la suya, que es justo lo que viene a averiguar.
//
// Va sobre la participación: el mismo blanco, el mismo escudo y las cuatro
// esquinas de acuarela recortadas de ella. Es el papel que los invitados ya
// recibieron en la mano, así que se reconoce antes de leerlo.
//
// Espejo de htmlAfiche() en scripts/export-mesas-img.mjs — misma composición,
// otra herramienta de dibujo. Si cambias una, cambia la otra.
//
// Los nombres flojos NO salen en rojo: esta lámina la leen los invitados. Los
// rojos se miran en las hojas de trabajo, que son las que revisa la wedding.
// Proporción A4 vertical (1 : √2): el afiche se manda a imprimir a un pliego con
// esas proporciones, así que la lámina las respeta desde el origen en vez de
// crecer con el contenido y que el impresor la recorte o la deje con franjas.
const AFICHE = {
  w: 2200,
  margen: 230,
  cabecera: 700,   // del borde al primer título de mesa
  pie: 260,        // lo que se reserva abajo para la firma
  linea: 57,       // alto de renglón de cada nombre
  titulo: 94,      // alto del título de mesa con su filete
}
AFICHE.h = Math.round(AFICHE.w * Math.SQRT2)

async function aficheBienvenida(mesas, porMesa, arte) {
  const A = AFICHE
  const cols = mesas.length <= 4 ? 2 : 3
  const filas = []
  for (let i = 0; i < mesas.length; i += cols) filas.push(mesas.slice(i, i + cols))
  // Cada fila mide lo que su mesa más llena: así las columnas no se desalinean.
  const altoFila = f => A.titulo + Math.max(1, ...f.map(m => (porMesa.get(m.id) || []).length)) * A.linea

  const { c, x } = lienzo(A.w, A.h)
  const cx = A.w / 2
  x.fillStyle = '#fff'
  x.fillRect(0, 0, A.w, A.h)

  // Las cuatro esquinas, ancladas a los bordes. Vienen recortadas sobre blanco
  // puro, así que se pegan opacas: sobre un fondo de otro color se les vería el
  // rectángulo.
  const flor = (img, ancho, dx, dy) => {
    if (!img) return
    const h = img.height * (ancho / img.width)
    x.drawImage(img, dx === 0 ? 0 : A.w - ancho, dy === 0 ? 0 : A.h - h, ancho, h)
  }
  flor(arte.si, 300, 0, 0)
  flor(arte.sd, 390, 1, 0)
  flor(arte.id, 350, 1, 1)
  flor(arte.ii, 425, 0, 1)

  x.textAlign = 'center'
  let y = 120
  if (arte.logo) {
    const h = 175, w = arte.logo.width * (h / arte.logo.height)
    x.drawImage(arte.logo, cx - w / 2, y, w, h)
  }
  y += 175 + 106

  x.fillStyle = TINTA; x.font = fd(92, 400)
  x.fillText('B I E N V E N I D O S', cx, y)
  y += 74

  x.fillStyle = SUAVE; x.font = `italic ${fd(30)}`
  x.fillText('Gracias por acompañarnos en el día más importante de nuestras vidas.', cx, y); y += 50
  x.fillText('Guardamos un sitio para cada uno de ustedes.', cx, y); y += 66

  x.strokeStyle = FILETE; x.lineWidth = 1
  x.beginPath(); x.moveTo(cx - 230, y); x.lineTo(cx - 20, y); x.stroke()
  x.beginPath(); x.moveTo(cx + 20, y); x.lineTo(cx + 230, y); x.stroke()
  x.fillStyle = ORO_P
  x.save(); x.translate(cx, y); x.rotate(Math.PI / 4); x.fillRect(-6, -6, 12, 12); x.restore()
  y += 44

  x.fillStyle = '#A2917F'; x.font = fb(15)
  x.fillText('B U S C A   T U   N O M B R E', cx, y)

  // Las mesas. La lámina tiene alto fijo y el contenido no siempre lo llena, así
  // que lo que sobra se reparte entre las filas en vez de quedar todo al final.
  const util = A.w - A.margen * 2
  const hueco = 46
  const ancho = (util - hueco * (cols - 1)) / cols
  const alto = filas.reduce((t, f) => t + altoFila(f), 0)
  const aire = Math.max(24, (A.h - A.cabecera - A.pie - alto) / Math.max(1, filas.length))
  let fy = A.cabecera + aire / 2
  for (const fila of filas) {
    fila.forEach((m, i) => {
      const mx = A.margen + i * (ancho + hueco) + ancho / 2
      x.fillStyle = ACC_P; x.font = fd(62, 600)
      x.fillText(recorta(x, m.nombre, ancho), mx, fy)
      x.strokeStyle = BORDE; x.lineWidth = 2
      x.beginPath(); x.moveTo(mx - ancho / 2, fy + 24); x.lineTo(mx + ancho / 2, fy + 24); x.stroke()
      x.lineWidth = 1

      const gente = porMesa.get(m.id) || []
      gente.forEach((p, k) => {
        // Un nombre muy largo baja un punto antes que recortarse: en un afiche
        // de mesas, «Osiris Rafaela Pomarico…» no dice a quién sentaron.
        x.font = fd(44, 600)
        if (x.measureText(p.nombre).width > ancho) x.font = fd(36, 600)
        x.fillStyle = TINTA
        x.fillText(recorta(x, p.nombre, ancho), mx, fy + A.titulo + k * A.linea)
      })
      if (!gente.length) {
        x.fillStyle = TENUE
        x.fillText('—', mx, fy + A.titulo)
      }
    })
    fy += altoFila(fila) + aire
  }

  // El pie, sobre el suelo de la lámina y no pegado a la última fila
  const yp = A.h - A.pie + 70
  x.strokeStyle = FILETE
  x.beginPath(); x.moveTo(cx - 280, yp); x.lineTo(cx + 280, yp); x.stroke()
  x.fillStyle = ACC_P; x.font = fs(58)
  x.fillText('Angely & Kevin', cx, yp + 82)
  x.fillStyle = SUAVE; x.font = fb(16)
  x.fillText('1 2   D E   S E P T I E M B R E   D E   2 0 2 6   ·   C A S O N A   D E L   P R A D O', cx, yp + 126)

  return png(c)
}

// ─── Plano general ───
async function plano(mesas, porMesa, cuando) {
  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(mesas.length))))
  const filas = Math.ceil(mesas.length / cols)
  const M = 56, GAP = 20, CAB = 150
  const cw = (1600 - M * 2 - GAP * (cols - 1)) / cols
  const ch = 46 + 8 * 28 + 26
  const alto = CAB + filas * (ch + GAP) + 76

  const { c, x } = lienzo(1600, alto)

  x.textAlign = 'left'
  x.fillStyle = SUAVE; x.font = fb(13)
  x.fillText('R E P A R T O   D E   M E S A S', M, 62)
  x.fillStyle = TINTA; x.font = fd(44)
  x.fillText('Angely & Kevin', M, 112)

  const sentados = [...porMesa.values()].reduce((s, g) => s + g.length, 0)
  const faltan = [...porMesa.values()].flat().filter(p => p.falta).length
  x.textAlign = 'right'; x.fillStyle = SUAVE; x.font = fb(13)
  x.fillText(`${mesas.length} mesas · ${sentados} personas sentadas`, 1600 - M, 62)
  x.fillText('12 de septiembre de 2026 · Casona del Prado', 1600 - M, 84)
  x.fillText(`Generado el ${cuando}`, 1600 - M, 106)

  x.strokeStyle = ORO; x.lineWidth = 2
  x.beginPath(); x.moveTo(M, CAB - 22); x.lineTo(1600 - M, CAB - 22); x.stroke()
  x.lineWidth = 1

  mesas.forEach((m, i) => {
    const gente = porMesa.get(m.id) || []
    const cx = M + (i % cols) * (cw + GAP)
    const cy = CAB + Math.floor(i / cols) * (ch + GAP)

    x.strokeStyle = gente.length >= m.capacidad ? ORO : BORDE
    x.beginPath(); x.roundRect(cx, cy, cw, ch, 10); x.stroke()

    x.textAlign = 'left'; x.fillStyle = TINTA; x.font = fd(22, 500)
    x.fillText(recorta(x, m.nombre, cw - 90), cx + 18, cy + 30)
    x.textAlign = 'right'; x.fillStyle = SUAVE; x.font = fb(12)
    x.fillText(`${gente.length}/${m.capacidad}`, cx + cw - 18, cy + 30)

    x.strokeStyle = LINEA
    x.beginPath(); x.moveTo(cx + 18, cy + 42); x.lineTo(cx + cw - 18, cy + 42); x.stroke()

    let y = cy + 66
    if (!gente.length) {
      x.textAlign = 'left'; x.fillStyle = '#B9AC9C'; x.font = `italic ${fb(14)}`
      x.fillText('— sin asignar —', cx + 18, y)
    }
    for (const [n, p] of gente.entries()) {
      x.textAlign = 'left'
      x.fillStyle = TENUE; x.font = fb(11)
      x.fillText(String(n + 1), cx + 18, y)
      x.fillStyle = p.falta ? ROJO : TINTA; x.font = fb(14.5)
      x.fillText(recorta(x, p.nombre, cw - 60), cx + 40, y)
      y += 28
    }
  })

  const yp = alto - 46
  x.strokeStyle = LINEA
  x.beginPath(); x.moveTo(M, yp); x.lineTo(1600 - M, yp); x.stroke()
  x.textAlign = 'left'; x.font = fb(12)
  x.fillStyle = faltan ? ROJO : SUAVE
  x.fillText(faltan ? `● ${faltan} nombre(s) por completar` : 'Todos los nombres completos', M, yp + 24)
  x.textAlign = 'right'; x.fillStyle = SUAVE
  x.fillText('Angely & Kevin · #AyKBoda', 1600 - M, yp + 24)

  return png(c)
}

const slug = s => (s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Genera el ZIP con el afiche, el plano y una hoja por mesa, y lo descarga. */
export async function exportarImagenes(avisar = () => {}) {
  avisar('Consultando…')
  const [ms, as, mem, gs] = await Promise.all([
    supabase.from('mesas').select('*').order('orden'),
    supabase.from('asientos').select('*'),
    supabase.from('guest_members').select('id, name'),
    supabase.from('guest_summary').select('id, group_name'),
  ])
  for (const r of [ms, as, mem, gs]) if (r.error) throw new Error(r.error.message)
  if (!ms.data.length) throw new Error('No hay mesas creadas todavía')

  const nombreDe = new Map(mem.data.map(m => [m.id, m.name]))
  const grupoDe = new Map(gs.data.map(g => [g.id, g.group_name]))
  const porMesa = new Map(ms.data.map(m => [
    m.id,
    as.data.filter(a => a.mesa_id === m.id).map(a => {
      const nombre = a.member_id ? (nombreDe.get(a.member_id) || '') : (a.etiqueta || 'Sin nombre')
      return {
        nombre, tarjeta: grupoDe.get(a.guest_id) || '',
        falta: !a.member_id || !!nombreIncompleto(nombre),
        manda: !!a.member_id && a.member_id === m.capitan_id,
      }
    }).sort((p, q) => p.tarjeta.localeCompare(q.tarjeta, 'es') || p.nombre.localeCompare(q.nombre, 'es')),
  ]))

  avisar('Dibujando…')
  await esperarFuentes()
  const cuando = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })

  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  // El afiche es UNO y lleva todas las mesas: el invitado que llega no sabe
  // cuál es la suya. Las hojas de trabajo son otro papel y van en su carpeta.
  const imprimibles = paraImprimir(ms.data)
  zip.file('bienvenida.png', await aficheBienvenida(imprimibles, porMesa, await cargarArte()))
  zip.file('00_plano-general.png', await plano(imprimibles, porMesa, cuando))
  for (const [i, m] of imprimibles.entries()) {
    const n = `${String(i + 1).padStart(2, '0')}_${slug(m.nombre)}.png`
    zip.file(`hojas-de-trabajo/${n}`, await hojaMesa(m, porMesa.get(m.id), cuando))
  }

  const faltan = [...porMesa.values()].flat().filter(p => p.falta).length
  zip.file('LEEME.txt',
`REPARTO DE MESAS — Angely & Kevin
Sábado 12 de septiembre de 2026 · Casona del Prado, Barranquilla
Generado el ${cuando}

  bienvenida.png             EL AFICHE DE LA ENTRADA: todas las mesas con sus
                             invitados, sobre la participación —el escudo, las
                             esquinas de acuarela y el mismo blanco—. Es la
                             lámina grande que se monta en el atril. No marca
                             nada en rojo: la leen los invitados.
  00_plano-general.png       Todas las mesas de un vistazo, para la wedding.
  hojas-de-trabajo/NN_*.png  Una hoja por mesa para la wedding y el salón:
                             nombres, de qué tarjeta viene cada uno y el
                             capitán. Marca en rojo lo que falta por arreglar.

  Mesas ...... ${ms.data.length}
  Sentados ... ${[...porMesa.values()].reduce((s, g) => s + g.length, 0)}
  Por completar ... ${faltan} nombre(s), marcados en rojo con un punto.

Los nombres en rojo no sirven para una tarjeta de mesa: son genéricos
(«Invitado 3», «Acompañante») o les falta el apellido. Se arreglan en
/admin/mesas, en la lista «Nombres por completar»: un clic abre cada uno
y Enter guarda y pasa al siguiente.
`)

  avisar('Comprimiendo…')
  const blob = await zip.generateAsync({ type: 'blob' })
  const d = new Date(), p = n => String(n).padStart(2, '0')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mesas_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.zip`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)

  return { mesas: ms.data.length, sentados: as.data.length, faltan }
}
