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
import { logoWedding } from '../assets/images'
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
    document.fonts.load('300 14px Jost'),
    document.fonts.load('400 40px "Great Vibes"'),
  ])
}

/** El escudo de la boda. Si no carga, la hoja sale igual: no es un dato. */
const cargarLogo = () => new Promise(res => {
  const img = new Image()
  img.onload = () => res(img)
  img.onerror = () => res(null)
  img.src = logoWedding
})

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

  // El capitán, debajo del conteo: es a quien busca el salón esa noche, así que
  // va en la cabecera de la hoja y no perdido entre los nombres.
  const capitan = gente.find(p => p.manda)
  if (capitan) {
    x.fillStyle = ORO
    x.font = fb(12, 400)
    x.fillText(`CAPITÁN DE MESA · ${capitan.nombre.toUpperCase()}`, CARTA.w / 2, 222)
  }

  // Filete ornamental
  const y0 = capitan ? 252 : 236
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
    if (p.manda) {
      const w = Math.min(x.measureText(p.nombre).width, ancho * 0.56)
      x.fillStyle = ORO
      x.font = fb(10)
      x.fillText('CAPITÁN', M + 30 + w + (p.falta ? 22 : 12), y - 2)
    }
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

// ─── Hoja de bienvenida, una por mesa ───
//
// Ésta es la que se pone sobre la mesa el día de la fiesta, así que no es la
// hoja de trabajo: va sobre la plantilla de la tarjeta de participación
// —marfil, filete interior doble, el escudo, Cormorant y Great Vibes— porque
// es el mismo papel que ya recibieron en la mano.
//
// A diferencia de la hoja de trabajo, aquí los nombres flojos NO se marcan en
// rojo: esta hoja la leen los invitados. Los rojos se miran en la otra, que es
// la que revisa la wedding, y el LEEME dice cuántos quedan.
async function hojaBienvenida(mesa, gente, logo) {
  const { c, x } = lienzo(CARTA.w, CARTA.h)
  const cx = CARTA.w / 2

  x.fillStyle = MARFIL
  x.fillRect(0, 0, CARTA.w, CARTA.h)

  // Filete interior doble: el marco clásico de las participaciones
  x.strokeStyle = FILETE; x.lineWidth = 1.5
  x.strokeRect(30, 30, CARTA.w - 60, CARTA.h - 60)
  x.strokeStyle = 'rgba(176,140,79,.45)'; x.lineWidth = .8
  x.strokeRect(38, 38, CARTA.w - 76, CARTA.h - 76)

  x.textAlign = 'center'
  let y = 92

  if (logo) {
    const h = 104, w = logo.width * (h / logo.height)
    x.drawImage(logo, cx - w / 2, y, w, h)
    y += h + 44
  } else {
    y += 40
  }

  // El espaciado de BIENVENIDOS va con espacios y no con letterSpacing: es lo
  // que ya hace el resto del módulo y no depende de qué navegador dibuje.
  x.fillStyle = TINTA; x.font = fd(38, 300)
  x.fillText('B I E N V E N I D O S', cx, y)
  y += 36

  x.fillStyle = SUAVE; x.font = `italic ${fd(19)}`
  x.fillText('Gracias por acompañarnos en el día', cx, y); y += 26
  x.fillText('más importante de nuestras vidas', cx, y); y += 40

  // Filete ornamental, el mismo de la hoja de trabajo
  x.strokeStyle = FILETE; x.lineWidth = 1
  x.beginPath(); x.moveTo(120, y); x.lineTo(cx - 16, y); x.stroke()
  x.beginPath(); x.moveTo(cx + 16, y); x.lineTo(CARTA.w - 120, y); x.stroke()
  x.fillStyle = ORO_P
  x.save(); x.translate(cx, y); x.rotate(Math.PI / 4); x.fillRect(-4, -4, 8, 8); x.restore()
  y += 62

  x.fillStyle = TINTA; x.font = fd(54)
  x.fillText(recorta(x, mesa.nombre, CARTA.w - 200), cx, y)
  y += 46

  // Los nombres. El paso se achica cuando la mesa va llena, para que diez
  // personas quepan sin apretar el pie de la hoja.
  const paso = gente.length > 8 ? 32 : 38
  const cuerpo = gente.length > 8 ? 23 : 25
  y += 20
  if (!gente.length) {
    x.fillStyle = TENUE; x.font = `italic ${fd(21)}`
    x.fillText('Esta mesa todavía no tiene invitados asignados.', cx, y)
  }
  for (const p of gente) {
    x.fillStyle = TINTA; x.font = fd(cuerpo)
    x.fillText(recorta(x, p.nombre, CARTA.w - 220), cx, y)
    if (p.manda) {
      const w = Math.min(x.measureText(p.nombre).width, CARTA.w - 220)
      x.fillStyle = ORO_P; x.font = fb(12)
      x.fillText('★', cx + w / 2 + 16, y - 2)
    }
    y += paso
  }

  // Pie
  const yp = CARTA.h - 132
  if (gente.some(p => p.manda)) {
    x.fillStyle = TENUE; x.font = fb(10)
    x.fillText('★  capitán de mesa', cx, yp - 16)
  }
  x.strokeStyle = FILETE; x.lineWidth = 1
  x.beginPath(); x.moveTo(cx - 60, yp); x.lineTo(cx + 60, yp); x.stroke()

  x.fillStyle = ACC_P; x.font = fs(38)
  x.fillText('Angely & Kevin', cx, yp + 54)
  x.fillStyle = SUAVE; x.font = fb(11)
  x.fillText('1 2   D E   S E P T I E M B R E   D E   2 0 2 6', cx, yp + 78)
  x.fillText('C A S O N A   D E L   P R A D O   ·   B A R R A N Q U I L L A', cx, yp + 96)

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
  // Sólo cuentan las mesas con gente: una mesa vacía todavía no puede tenerlo
  const sinCap = mesas.filter(m => (porMesa.get(m.id) || []).length && !(porMesa.get(m.id) || []).some(p => p.manda)).length
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
      if (p.manda) { x.fillStyle = ORO; x.font = fb(11); x.fillText('★', cx + 28, y) }
      y += 28
    }
  })

  const yp = alto - 46
  x.strokeStyle = LINEA
  x.beginPath(); x.moveTo(M, yp); x.lineTo(1600 - M, yp); x.stroke()
  x.textAlign = 'left'; x.font = fb(12)
  x.fillStyle = faltan ? ROJO : SUAVE
  x.fillText(faltan ? `● ${faltan} nombre(s) por completar` : 'Todos los nombres completos', M, yp + 24)
  if (sinCap) {
    x.fillStyle = ORO
    x.fillText(`★ ${sinCap} mesa(s) sin capitán`, M + (faltan ? 240 : 210), yp + 24)
  }
  x.textAlign = 'right'; x.fillStyle = SUAVE
  x.fillText('Angely & Kevin · #AyKBoda', 1600 - M, yp + 24)

  return png(c)
}

const slug = s => (s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Genera el ZIP con el plano y una hoja por mesa, y lo descarga. */
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
  const logo = await cargarLogo()
  zip.file('00_plano-general.png', await plano(ms.data, porMesa, cuando))
  // Dos juegos, en dos carpetas: se mandan a imprimir por separado y en
  // papeles distintos. Mezclados en la raíz había que ir eligiendo archivo
  // por archivo cuál era cuál.
  for (const [i, m] of ms.data.entries()) {
    const n = `${String(i + 1).padStart(2, '0')}_${slug(m.nombre)}.png`
    zip.file(`hojas-de-trabajo/${n}`, await hojaMesa(m, porMesa.get(m.id), cuando))
    zip.file(`bienvenida/${n}`, await hojaBienvenida(m, porMesa.get(m.id), logo))
  }

  const faltan = [...porMesa.values()].flat().filter(p => p.falta).length
  zip.file('LEEME.txt',
`REPARTO DE MESAS — Angely & Kevin
Sábado 12 de septiembre de 2026 · Casona del Prado, Barranquilla
Generado el ${cuando}

  00_plano-general.png       Todas las mesas de un vistazo.
  hojas-de-trabajo/NN_*.png  Una hoja por mesa para la wedding y el salón:
                             nombres, tarjeta de la que viene cada uno y el
                             capitán. Marca en rojo lo que falta por arreglar.
  bienvenida/NN_*.png        La hoja que se pone SOBRE la mesa el día de la
                             fiesta: el escudo, BIENVENIDOS y los nombres,
                             sobre la misma plantilla de la participación.
                             Ésta no marca nada en rojo — la leen los invitados.

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
