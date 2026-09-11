/**
 * Exporta el logo de la boda en los tamaños que piden los impresores.
 *
 *   npm run logo
 *
 * Genera, en entrega/logo/:
 *   logo-AK-1000.png    fondo transparente, 1000 px de ancho
 *   logo-AK-2000.png    idem, 2000 px  — el de uso corriente
 *   logo-AK-4000.png    idem, 4000 px  — para gran formato
 *   logo-AK-2000-blanco.png   sobre blanco, para quien no acepta transparencia
 *   logo-AK.svg         el de 4000 px embebido, con medidas reales en mm
 *
 * OJO CON LO QUE ESTO ES Y LO QUE NO ES
 *
 * El master (src/assets/img/logo_a&K.png) mide 454 × 345 px. No hay más
 * resolución que ésa en el repositorio, así que estos archivos son
 * AMPLIACIONES: Lanczos + un enfoque suave. No inventan detalle. Impresos a
 * 300 dpi el master da unos 3,8 cm; el de 4000 px se ve bien hasta el tamaño
 * de un cartel visto a distancia, pero de cerca y en grande se le notará el
 * origen.
 *
 * El .svg tampoco es un vector de verdad: es el PNG grande envuelto en SVG,
 * que es lo que se puede hacer partiendo de un raster. Sirve para colocarlo
 * en cualquier programa que pida «un SVG», y escala igual que el PNG.
 *
 * Un vector de verdad —curvas, sin resolución— sólo sale del archivo original
 * de quien diseñó el logo (.ai, .eps, .pdf o .svg). Si aparece, ese archivo
 * reemplaza a todo esto.
 */
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const LOGO   = resolve('src/assets/img/logo_a&K.png')
const SALIDA = resolve('entrega/logo')

if (!existsSync(LOGO)) {
  console.error('✗ No encontré el logo en', LOGO)
  process.exit(1)
}

await mkdir(SALIDA, { recursive: true })
const { width, height } = await sharp(LOGO).metadata()

// ─── Limpiar el contorno ───
// El master trae unos 10.000 píxeles con alfa muy bajo (1–39) desperdigados
// alrededor de las letras: invisibles sobre blanco, pero al ampliar y enfocar
// salen como motas de color, y sobre fondo oscuro se ven todas. Se borran por
// umbral. El borde de verdad —alfa 40–224, unos 2.000 píxeles— se conserva, que
// es el antialias que hace que la curva no quede escalonada.
async function sinMotas(entrada, umbral) {
  const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let borrados = 0
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0 && data[i] < umbral) { data[i] = 0; borrados++ }
  }
  return { buffer: await sharp(data, { raw: info }).png().toBuffer(), borrados }
}

const limpio = await sinMotas(LOGO, 40)
console.log(`\n  Master: ${width} × ${height} px · todo lo demás es ampliación`)
console.log(`  Contorno limpiado: ${limpio.borrados} motas de alfa bajo\n`)

/**
 * Ampliación con Lanczos y un enfoque suave —sin él queda lechoso—, y una
 * segunda pasada de limpieza: el enfoque vuelve a levantar halo en el borde.
 */
async function ampliar(w) {
  const grande = await sharp(limpio.buffer)
    .resize({ width: w, kernel: 'lanczos3' })
    .sharpen({ sigma: Math.max(0.6, w / 3000), m1: 0.3, m2: 0.7 })
    .png().toBuffer()
  return (await sinMotas(grande, 12)).buffer
}

for (const w of [1000, 2000, 4000]) {
  const f = join(SALIDA, `logo-AK-${w}.png`)
  const i = await sharp(await ampliar(w)).png({ compressionLevel: 9 }).toFile(f)
  console.log(`  ✓ logo-AK-${w}.png`.padEnd(28), `${i.width} × ${i.height}`, `· ${Math.round(i.size / 1024)} KB`)
}

// Sobre blanco: hay impresores que rechazan el alfa o lo aplanan en negro
const fb = join(SALIDA, 'logo-AK-2000-blanco.png')
await sharp(await ampliar(2000)).flatten({ background: '#ffffff' })
  .png({ compressionLevel: 9 }).toFile(fb)
console.log('  ✓ logo-AK-2000-blanco.png'.padEnd(28), '2000 × ' + Math.round(2000 * height / width))

// ─── El SVG ───
// Lleva el PNG de 4000 px embebido y las medidas en mm que le corresponden a
// 300 dpi, para que al colocarlo en InDesign o Illustrator entre al tamaño
// máximo al que se puede imprimir bien, y no a un tamaño arbitrario.
const png4000 = await sharp(await ampliar(4000)).png({ compressionLevel: 9 }).toBuffer()
const alto4000 = Math.round(4000 * height / width)
const mmAncho = (4000 / 300 * 25.4).toFixed(1)
const mmAlto  = (alto4000 / 300 * 25.4).toFixed(1)
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Angely & Kevin · 12 de septiembre de 2026
  El logo de la boda, a 4000 px embebidos. NO es un vector: es la ampliación
  del master de ${width} × ${height} px, que es toda la resolución que existe.
  A 300 dpi son ${mmAncho} × ${mmAlto} mm; más grande que eso, se nota.
-->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${mmAncho}mm" height="${mmAlto}mm"
     viewBox="0 0 4000 ${alto4000}" preserveAspectRatio="xMidYMid meet">
  <title>Angely &amp; Kevin</title>
  <image x="0" y="0" width="4000" height="${alto4000}"
         xlink:href="data:image/png;base64,${png4000.toString('base64')}"/>
</svg>
`
await writeFile(join(SALIDA, 'logo-AK.svg'), svg, 'utf8')
console.log('  ✓ logo-AK.svg'.padEnd(28), `${mmAncho} × ${mmAlto} mm a 300 dpi`)

console.log(`\n  En ${SALIDA}`)
console.log('  El .svg escala igual que el PNG: un vector de verdad sólo sale')
console.log('  del archivo original de quien diseñó el logo.\n')
