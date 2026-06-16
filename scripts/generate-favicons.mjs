// ──────────────────────────────────────────────────────────────
//  Genera el set de favicons desde el logo de la boda.
//  - Pestañas (favicon.ico / 16 / 32): fondo TRANSPARENTE (solo el
//    monograma; sin recuadro negro en la pestaña).
//  - Íconos de inicio (apple-touch-icon / Android): fondo BLANCO, porque
//    iOS rellena la transparencia con negro en la pantalla de inicio.
//
//  Uso:  node scripts/generate-favicons.mjs
// ──────────────────────────────────────────────────────────────
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const LOGO  = path.resolve('src/assets/img/logo_a&K.png')
const OUT   = path.resolve('public')
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 }         // transparente
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }   // blanco (tiles iOS/Android)

async function icon(size, pad, bg = CLEAR) {
  const inner = Math.round(size * (1 - pad * 2))
  const logo = await sharp(LOGO)
    .resize({ width: inner, height: inner, fit: 'contain', background: CLEAR })
    .png().toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: 'center' }])
    .png().toBuffer()
}

async function write(name, buf) { await writeFile(path.join(OUT, name), buf); console.log('  ✓', name, `(${buf.length} B)`) }

const targets = [
  ['favicon-16x16.png',   16,  0.04, CLEAR],
  ['favicon-32x32.png',   32,  0.06, CLEAR],
  ['apple-touch-icon.png',180, 0.16, WHITE],
  ['icon-192.png',        192, 0.16, WHITE],
  ['icon-512.png',        512, 0.18, WHITE],
]

for (const [name, size, pad, bg] of targets) {
  await write(name, await icon(size, pad, bg))
}

// favicon.ico multi-tamaño (16/32/48) — transparente
const ico = await pngToIco([await icon(16, 0.04), await icon(32, 0.06), await icon(48, 0.08)])
await write('favicon.ico', ico)

console.log('\nFavicons generados en public/')
