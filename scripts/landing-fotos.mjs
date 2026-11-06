/**
 * Las fotos de la landing, con las caras desenfocadas.
 *
 *   node scripts/landing-fotos.mjs   → src/assets/landing/*.jpg
 *
 * La landing es pública y la ve cualquiera: no muestra caras reconocibles, ni las
 * de Angely y Kevin ni la de la quinceañera de la vista previa. Cada cara se tapa
 * con un óvalo de desenfoque de borde suave (se funde con la foto en vez de
 * parecer un parche). Las cajas van en fracciones de la foto YA ROTADA por EXIF.
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const FOTOS = [
  // nombre de salida, origen, caras [x0, y0, x1, y1]
  ['hero',    'src/assets/img/CANO5875.JPG',               [[0.49, 0.21, 0.72, 0.35]]],
  ['puerta',  'src/assets/img/CANO5810.JPG',               [[0.27, 0.35, 0.38, 0.51], [0.67, 0.34, 0.77, 0.49]]],
  ['mar',     'src/assets/img/IMG_6181.jpg',               [[0.29, 0.15, 0.50, 0.43]]],
  ['boda',    'src/assets/img/CANO5887.JPG',               [[0.41, 0.29, 0.58, 0.43]]],
  ['quince',  'src/assets/eventos/xv-mauren/mla2981.jpg',  [[0.27, 0.19, 0.46, 0.35]]],
]
const LADO = 1600

await mkdir('src/assets/landing', { recursive: true })
for (const [nombre, origen, caras] of FOTOS) {
  const base = await sharp(origen).rotate().resize(LADO, LADO, { fit: 'inside' }).toBuffer({ resolveWithObject: true })
  const { width: W, height: H } = base.info
  const borroso = await sharp(base.data).blur(Math.max(W, H) / 70).toBuffer()
  // Máscara: óvalos blancos con el borde desenfocado → solo ahí entra la versión borrosa
  const ovalos = caras.map(([x0, y0, x1, y1]) =>
    `<ellipse cx="${(x0 + x1) / 2 * W}" cy="${(y0 + y1) / 2 * H}" rx="${(x1 - x0) / 2 * W}" ry="${(y1 - y0) / 2 * H}" fill="#fff"/>`).join('')
  const borde = Math.max(W, H) / 90
  const mascara = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><filter id="f"><feGaussianBlur stdDeviation="${borde}"/></filter><g filter="url(#f)">${ovalos}</g></svg>`)
  const parche = await sharp(borroso).ensureAlpha().composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer()
  const salida = `src/assets/landing/${nombre}.jpg`
  const info = await sharp(base.data).composite([{ input: parche }]).jpeg({ quality: 80, mozjpeg: true }).toFile(salida)
  console.log(`${salida}  ${info.width}×${info.height}  ${Math.round(info.size / 1024)} kB`)
}
