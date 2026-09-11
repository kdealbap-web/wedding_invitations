// ──────────────────────────────────────────────────────────────
//  Optimiza las fotos de src/assets/img sin romper el diseño.
//  · Redimensiona el lado más largo a MAX_PX (mantiene proporción)
//  · Re-codifica JPEG con mozjpeg calidad Q
//  · CONSERVA la metadata EXIF (orientación) → las secciones que
//    rotan el fondo por CSS siguen viéndose igual
//  · Respalda los originales en src/assets/img/_originals/ (gitignored)
//
//  Con --desde=<dir> hace lo contrario: INGIERE fotos de fuera del repo
//  (los masters del fotógrafo, de 4480 × 6720 y 10-16 MB cada una) y las
//  deja en src/assets/img ya a MAX_PX, que es el tamaño con el que trabaja
//  todo lo demás. De paso limpia el «.JPG.jpeg» que dejan las descargas.
//  Ingiere y termina: no vuelve a pasar por las que ya estaban, porque
//  recomprimir dos veces sí degrada.
//
//  Uso:  node scripts/optimize-images.mjs
//        node scripts/optimize-images.mjs --desde=src/imagenes_editadas
// ──────────────────────────────────────────────────────────────
import sharp from 'sharp'
import { readdir, mkdir, copyFile, stat, rename } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const IMG_DIR  = path.resolve('src/assets/img')
const BACKUP   = path.join(IMG_DIR, '_originals')
const MAX_PX   = 2200          // lado más largo
const Q        = 80            // calidad JPEG (mozjpeg)
const MIN_KB   = 400           // solo tocar archivos por encima de esto

sharp.cache(false)

const isJpeg = (f) => /\.jpe?g$/i.test(f)

const DESDE = (process.argv.find(a => a.startsWith('--desde=')) || '').slice(8)

/** IMG_5746.JPG.jpeg → IMG_5746.jpg */
const limpiarNombre = (f) => f.replace(/(\.(jpe?g|png))+$/i, '') + '.jpg'

/**
 * Trae fotos de fuera del repo a src/assets/img, ya reducidas a MAX_PX.
 * No respalda en _originals: el master se queda donde está, que para eso
 * es el master. No pisa lo que ya exista.
 */
async function ingerir(dir) {
  const origen = path.resolve(dir)
  if (!existsSync(origen)) { console.error(`\n  No existe ${dir}\n`); process.exit(1) }

  const files = (await readdir(origen)).filter(isJpeg)
  if (!files.length) { console.log(`\n  Sin JPEG en ${dir}\n`); return }

  console.log(`\n  Ingiriendo de ${dir} → src/assets/img\n`)
  let nuevas = 0, existian = 0

  for (const file of files) {
    const destino = path.join(IMG_DIR, limpiarNombre(file))
    if (existsSync(destino)) { existian++; console.log(`  · ${path.basename(destino).padEnd(20)} ya estaba`); continue }

    const src = path.join(origen, file)
    const { size } = await stat(src)
    await sharp(src)
      .resize({ width: MAX_PX, height: MAX_PX, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: Q, mozjpeg: true })
      .withMetadata()                       // conserva orientación EXIF
      .toFile(destino)

    const ns = (await stat(destino)).size
    const m = await sharp(destino).metadata()
    nuevas++
    console.log(`  ✓ ${path.basename(destino).padEnd(20)} ${(size/1048576).toFixed(1)}MB → ${(ns/1048576).toFixed(2)}MB  ${m.width}×${m.height}`)
  }

  console.log(`\n  ${nuevas} nuevas · ${existian} que ya estaban`)
  if (nuevas) console.log('  Falta registrarlas en src/assets/images.js si las va a usar la SPA.\n')
}

async function main() {
  if (DESDE) return ingerir(DESDE)

  if (!existsSync(BACKUP)) await mkdir(BACKUP, { recursive: true })

  const files = (await readdir(IMG_DIR)).filter(isJpeg)
  let before = 0, after = 0, done = 0, skipped = 0

  for (const file of files) {
    const src = path.join(IMG_DIR, file)
    const { size } = await stat(src)
    before += size

    if (size / 1024 < MIN_KB) { after += size; skipped++; continue }

    // Respaldo (solo si no existe ya)
    const bak = path.join(BACKUP, file)
    if (!existsSync(bak)) await copyFile(src, bak)

    const tmp = src + '.tmp'
    await sharp(bak)
      .resize({ width: MAX_PX, height: MAX_PX, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: Q, mozjpeg: true })
      .withMetadata()                       // conserva orientación EXIF
      .toFile(tmp)

    await rename(tmp, src)
    const ns = (await stat(src)).size
    after += ns
    done++
    console.log(`  ✓ ${file.padEnd(20)} ${(size/1048576).toFixed(1)}MB → ${(ns/1048576).toFixed(2)}MB`)
  }

  console.log('\n──────────────────────────────────────────')
  console.log(`  Optimizadas: ${done} · sin tocar: ${skipped}`)
  console.log(`  Total: ${(before/1048576).toFixed(1)}MB → ${(after/1048576).toFixed(1)}MB`)
  console.log(`  Originales respaldados en: src/assets/img/_originals/`)
}

main().catch(e => { console.error(e); process.exit(1) })
