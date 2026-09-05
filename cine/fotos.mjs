/**
 * Normalización de fotos.
 *
 * EL PROBLEMA: 17 de las 20 fotos del repo llevan orientación EXIF 8 («girar
 * 90° a la izquierda al mostrar»). El navegador la aplica —por eso la v1 de
 * /pantalla se veía bien— pero sharp y ffmpeg NO. Alimentar ffmpeg con los
 * originales produce video con la gente acostada.
 *
 * LA CONSECUENCIA: al aplicar el EXIF, esas 17 fotos resultan VERTICALES
 * (1467 × 2200). Metidas a sangre en 16:9 habría que recortar el 63 % del alto,
 * o sea cabezas o pies fuera de cuadro. Por eso existen dos disposiciones:
 *
 *   pleno     — foto apaisada a sangre, texto centrado encima (3 fotos)
 *   editorial — foto vertical entera en un panel, fondo desenfocado de la misma
 *               foto, y el texto al lado (17 fotos)
 *
 * Este módulo escribe copias ya rotadas en una carpeta de trabajo, y de paso
 * dice de qué tipo es cada una.
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, basename, extname } from 'node:path'

const cache = new Map()

/**
 * Devuelve { ruta, ancho, alto, vertical } de la foto ya sin EXIF pendiente.
 * La copia normalizada se escribe una sola vez por ejecución.
 */
export async function normalizar(origen, dirTrabajo) {
  if (cache.has(origen)) return cache.get(origen)

  await mkdir(dirTrabajo, { recursive: true })
  const destino = join(dirTrabajo, basename(origen, extname(origen)) + '.png')

  let info
  if (existsSync(destino)) {
    const m = await sharp(destino).metadata()
    info = { width: m.width, height: m.height }
  } else {
    // .rotate() sin argumentos aplica la orientación EXIF y la borra
    const r = await sharp(origen).rotate().png({ compressionLevel: 6 }).toBuffer({ resolveWithObject: true })
    await sharp(r.data).toFile(destino)
    info = r.info
  }

  const dato = {
    ruta: destino,
    ancho: info.width,
    alto: info.height,
    vertical: info.height > info.width,
  }
  cache.set(origen, dato)
  return dato
}

/** La disposición que le corresponde a una foto por su forma. */
export function disposicion(foto) {
  if (!foto) return 'fondo'          // sin foto: degradado (hora loca)
  return foto.vertical ? 'editorial' : 'pleno'
}
