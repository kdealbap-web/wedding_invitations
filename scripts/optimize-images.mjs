// ──────────────────────────────────────────────────────────────
//  Optimiza las fotos de src/assets/img sin romper el diseño.
//  · Redimensiona el lado más largo a MAX_PX (mantiene proporción)
//  · Re-codifica JPEG con mozjpeg calidad Q
//  · CONSERVA la metadata EXIF (orientación) → las secciones que
//    rotan el fondo por CSS siguen viéndose igual
//  · Respalda los originales en src/assets/img/_originals/ (gitignored)
//
//  Uso:  node scripts/optimize-images.mjs
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

async function main() {
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
