/**
 * Ingiere las fotos de un evento: aplica la rotación EXIF, las reduce a
 * 2400 px de lado largo y las deja en src/assets/eventos/<evento>/ con
 * nombres limpios (_MIL1166.JPG.jpeg → mil1166.jpg).
 *
 *   npm run fotos-evento -- --desde="XV MAUREN" --evento=xv-mauren
 *
 * Los originales NO se tocan ni entran al repo (la carpeta va gitignoreada).
 * Después hay que registrar las fotos en src/assets/eventos/<evento>/index.js.
 */
import { readdir, mkdir, stat } from 'node:fs/promises'
import { resolve, join, parse } from 'node:path'
import sharp from 'sharp'

const arg = (n) => process.argv.find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3)
const desde  = arg('desde')
const evento = arg('evento')
if (!desde || !evento) {
  console.error('Uso: node scripts/importar-fotos-evento.mjs --desde="carpeta" --evento=slug')
  process.exit(1)
}

const LADO = 2400   // 402×874 @3x con cover pide ~2600 de alto: 1800 se ampliaba ×1,45 en iPhone
const origen  = resolve(desde)
const destino = resolve('src/assets/eventos', evento)
await mkdir(destino, { recursive: true })

const archivos = (await readdir(origen)).filter(f => /\.(jpe?g)$/i.test(f)).sort()
let antes = 0, despues = 0

for (const f of archivos) {
  // «_MIL1166.JPG.jpeg» → «mil1166»
  const nombre = f.replace(/\.(jpe?g)$/i, '').replace(/\.jpe?g$/i, '').replace(/^_+/, '').toLowerCase()
  const salida = join(destino, `${nombre}.jpg`)
  const info = await sharp(join(origen, f))
    .rotate()
    .resize({ width: LADO, height: LADO, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(salida)
  antes   += (await stat(join(origen, f))).size
  despues += info.size
  console.log(`${nombre}.jpg  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} kB`)
}

console.log(`\n${archivos.length} fotos · ${(antes / 1e6).toFixed(1)} MB → ${(despues / 1e6).toFixed(1)} MB en ${destino}`)
