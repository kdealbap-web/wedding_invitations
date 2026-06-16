// ──────────────────────────────────────────────────────────────
//  Genera el set de favicons desde el logo de la boda.
//  El monograma va centrado sobre el fondo oscuro de la marca
//  (#120b04) para que el dorado resalte en cualquier navegador.
//
//  Uso:  node scripts/generate-favicons.mjs
// ──────────────────────────────────────────────────────────────
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const LOGO = path.resolve('src/assets/img/logo_a&K.png')
const OUT  = path.resolve('public')
const BG   = { r: 0x12, g: 0x0b, b: 0x04, alpha: 1 } // #120b04

async function icon(size, pad) {
  const inner = Math.round(size * (1 - pad * 2))
  const logo = await sharp(LOGO)
    .resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'center' }])
    .png().toBuffer()
}

async function write(name, buf) { await writeFile(path.join(OUT, name), buf); console.log('  ✓', name, `(${buf.length} B)`) }

const targets = [
  ['favicon-16x16.png',   16, 0.06],
  ['favicon-32x32.png',   32, 0.08],
  ['apple-touch-icon.png',180, 0.14],
  ['icon-192.png',        192, 0.14],
  ['icon-512.png',        512, 0.16],
]

for (const [name, size, pad] of targets) {
  await write(name, await icon(size, pad))
}

// favicon.ico multi-tamaño (16/32/48)
const ico = await pngToIco([await icon(16, 0.06), await icon(32, 0.08), await icon(48, 0.10)])
await write('favicon.ico', ico)

console.log('\nFavicons generados en public/')
