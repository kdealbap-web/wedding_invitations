/**
 * Arma la carpeta que se copia a la USB del proveedor de las pantallas LED.
 *
 *   npm run usb                        # paleta escenario
 *   npm run usb -- --paleta=invitacion
 *
 * No genera nada: recoge lo que ya produjeron `npm run pantallas`, `npm run cine`
 * y `npm run fiesta`, lo ordena en carpetas numeradas y escribe el LEEME y un
 * inventario con el peso y la duración real de cada archivo.
 *
 * Las carpetas van numeradas porque los reproductores de sala casi siempre
 * ordenan alfabéticamente y así la secuencia queda sola.
 */
import { mkdir, copyFile, writeFile, readdir, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { execFileSync } from 'node:child_process'

const arg = (n, d = null) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.slice(n.length + 3) : d
}
const PALETA = arg('paleta', 'escenario')
const DESTINO = resolve('entrega/USB_BODA_AyK')

const FFPROBE = [
  join(process.env.LOCALAPPDATA || '', 'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffprobe.exe'),
  'ffprobe',
].find(p => p === 'ffprobe' || existsSync(p))

function duracion(ruta) {
  try {
    const s = execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ruta]).toString().trim()
    return parseFloat(s)
  } catch { return null }
}

const mb = n => (n / 1048576).toFixed(1)

// ─── Qué va en cada carpeta ───
const CINE = `entrega/cine/${PALETA}`
const PLAN = [
  {
    carpeta: '01_IMAGENES_FIJAS',
    nota: 'Cartelas estáticas. Para dejar en pantalla el tiempo que haga falta.',
    origen: 'entrega/pantallas-led',
    filtro: f => f.endsWith('.png'),
  },
  {
    carpeta: '02_LOOP_RECEPCION',
    nota: 'Bucle continuo mientras entra la gente y durante la recepción. Reproducir en LOOP.',
    origen: CINE,
    filtro: f => f.startsWith('01_loop-principal'),
  },
  {
    carpeta: '03_MOMENTOS',
    nota: 'Se disparan en el momento indicado. NO en bucle: una sola pasada.',
    origen: CINE,
    filtro: f => /^0[2-6]_/.test(f) && f.endsWith('.mp4'),
  },
  {
    carpeta: '04_FIESTA',
    nota: 'Piezas dinámicas para la parte alta de la noche. Se pueden repetir.',
    origen: CINE,
    filtro: f => /^0[78]_/.test(f) && f.endsWith('.mp4'),
  },
  {
    carpeta: '05_REFERENCIA',
    nota: 'No se proyecta. Es la hoja de contactos para que ustedes vean todo de un vistazo.',
    origen: CINE,
    filtro: f => f.startsWith('00_storyboard'),
  },
]

const LEEME = inventario => `CONTENIDO PARA PANTALLAS LED
Boda de Angely & Kevin — sábado 12 de septiembre de 2026
Casona del Prado, Barranquilla

═══════════════════════════════════════════════════════════════
ESPECIFICACIÓN TÉCNICA
═══════════════════════════════════════════════════════════════

  Resolución ....... 1920 x 1080 px (16:9, Full HD)
  Video ............ MP4 · H.264 · perfil high · nivel 4.1
  Fotogramas ....... 29,97 fps (30000/1001)
  Color ............ yuv420p · sRGB
  Audio ............ ninguno (el sonido lo pone el DJ)
  Imágenes ......... PNG sin pérdida, misma resolución

  Zona segura ...... todo el texto vive dentro de un margen de 96 px
                     por lado, así que un recorte leve no corta nada.

═══════════════════════════════════════════════════════════════
CÓMO SE USA CADA CARPETA
═══════════════════════════════════════════════════════════════

  01_IMAGENES_FIJAS   Cartelas estáticas. Se dejan en pantalla el tiempo
                      que haga falta. Sugerencia: 8-10 s cada una.

  02_LOOP_RECEPCION   UN SOLO ARCHIVO, en bucle continuo, desde que abre
                      el salón hasta que empieza la fiesta. Dura 74 s y
                      abre y cierra en negro, así que el punto de bucle
                      no se nota.

  03_MOMENTOS         Se disparan en vivo cuando ocurre cada cosa.
                      Una sola pasada, NO en bucle:
                        02_vals ...... al primer baile
                        03_brindis ... al brindis
                        04_torta ..... al corte de la torta
                        05_ramo ...... al lanzamiento del ramo
                        06_horaloca .. al arrancar la hora loca

  04_FIESTA           Piezas de corte rápido para la parte alta de la
                      noche. Se pueden repetir e intercalar libremente.

  05_REFERENCIA       NO SE PROYECTA. Es la hoja de contactos con todas
                      las escenas, para consulta de los novios.

═══════════════════════════════════════════════════════════════
IMPORTANTE — POR FAVOR LEER
═══════════════════════════════════════════════════════════════

  · El fondo oscuro es deliberado. En un LED, que es emisivo, el negro
    se ve elegante y no encandila a los invitados.
    NO subir el brillo. NO aplicar realce ni corrección automática.

  · No reencuadrar ni estirar: todo está ya a resolución nativa.

  · Si el reproductor no acepta PNG, convertir a JPG con calidad 95
    o superior. No recomprimir los MP4.

═══════════════════════════════════════════════════════════════
INVENTARIO
═══════════════════════════════════════════════════════════════

${inventario}

Ante cualquier duda, contactar a los novios.
`

async function main() {
  // Carpeta limpia: si se regenera con otra paleta, no quedan restos de la anterior
  if (existsSync(DESTINO)) await rm(DESTINO, { recursive: true, force: true })
  await mkdir(DESTINO, { recursive: true })

  console.log(`\n  Paleta ..... ${PALETA}`)
  console.log(`  Destino .... ${DESTINO}\n`)

  const lineas = []
  let totalBytes = 0, totalArchivos = 0
  const faltantes = []

  for (const p of PLAN) {
    const origen = resolve(p.origen)
    if (!existsSync(origen)) { faltantes.push(`${p.origen} (no existe)`); continue }

    const archivos = (await readdir(origen)).filter(p.filtro).sort()
    if (!archivos.length) { faltantes.push(`${p.carpeta}: sin archivos en ${p.origen}`); continue }

    await mkdir(join(DESTINO, p.carpeta), { recursive: true })
    lineas.push(`  ${p.carpeta}`)
    lineas.push(`    ${p.nota}`)

    for (const a of archivos) {
      const src = join(origen, a)
      // Se quita el sufijo de paleta: al proveedor no le dice nada
      const limpio = a.replace(new RegExp(`_${PALETA}(?=\\.[a-z0-9]+$)`), '')
      await copyFile(src, join(DESTINO, p.carpeta, limpio))

      const { size } = await stat(src)
      totalBytes += size; totalArchivos++
      const d = a.endsWith('.mp4') ? duracion(src) : null
      lineas.push(`      ${limpio.padEnd(30)} ${mb(size).padStart(7)} MB${d ? `  ${d.toFixed(2)} s` : ''}`)
    }
    lineas.push('')
  }

  await writeFile(join(DESTINO, 'LEEME.txt'), LEEME(lineas.join('\n')), 'utf8')

  console.log(lineas.join('\n'))
  console.log(`  ${totalArchivos} archivos · ${mb(totalBytes)} MB en total\n`)

  if (faltantes.length) {
    console.warn('  Falta material — genéralo antes de copiar a la USB:')
    for (const f of faltantes) console.warn(`    ! ${f}`)
    console.warn('    npm run pantallas · npm run cine · npm run fiesta\n')
  }
}

main().catch(e => { console.error('\n  Falló:', e.message, '\n'); process.exit(1) })
