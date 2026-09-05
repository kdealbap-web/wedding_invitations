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

const fd = (px, peso = 400) => `${peso} ${px}px "Cormorant Garamond", Georgia, serif`
const fb = (px, peso = 300) => `${peso} ${px}px Jost, system-ui, sans-serif`

/** Las tipografías tienen que estar listas o el canvas dibuja con la de repuesto. */
async function esperarFuentes() {
  await document.fonts.ready
  await Promise.all([
    document.fonts.load('400 64px "Cormorant Garamond"'),
    document.fonts.load('300 14px Jost'),
  ])
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
      return { nombre, tarjeta: grupoDe.get(a.guest_id) || '', falta: !a.member_id || !!nombreIncompleto(nombre) }
    }).sort((p, q) => p.tarjeta.localeCompare(q.tarjeta, 'es') || p.nombre.localeCompare(q.nombre, 'es')),
  ]))

  avisar('Dibujando…')
  await esperarFuentes()
  const cuando = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })

  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  zip.file('00_plano-general.png', await plano(ms.data, porMesa, cuando))
  for (const [i, m] of ms.data.entries()) {
    zip.file(`${String(i + 1).padStart(2, '0')}_${slug(m.nombre)}.png`,
      await hojaMesa(m, porMesa.get(m.id), cuando))
  }

  const faltan = [...porMesa.values()].flat().filter(p => p.falta).length
  zip.file('LEEME.txt',
`REPARTO DE MESAS — Angely & Kevin
Sábado 12 de septiembre de 2026 · Casona del Prado, Barranquilla
Generado el ${cuando}

  00_plano-general.png   Todas las mesas de un vistazo.
  NN_<mesa>.png          Una hoja por mesa, proporción carta, para imprimir.

  Mesas ...... ${ms.data.length}
  Sentados ... ${[...porMesa.values()].reduce((s, g) => s + g.length, 0)}
  Por completar ... ${faltan} nombre(s), marcados en rojo con un punto.

Los nombres en rojo no sirven para una tarjeta de mesa: son genéricos
(«Invitado 3», «Acompañante») o les falta el apellido. Se arreglan en
/admin/mesas, con doble clic sobre la ficha.
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
