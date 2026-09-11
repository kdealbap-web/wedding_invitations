/**
 * EL VIDEO DEL FOTÓGRAFO, adaptado a la pantalla LED.
 *
 *   npm run preboda
 *   npm run preboda -- --paleta=invitacion
 *   npm run preboda -- --video="D:/otro/clip.MOV"
 *
 * A diferencia de render.mjs y fiesta.mjs, acá no se compone nada: el montaje
 * es de él y no se toca. Esto sólo resuelve los tres motivos por los que el
 * archivo tal cual NO sirve en un panel de sala:
 *
 *   1. Viene en HEVC (H.265). Muchos reproductores de LED sólo abren H.264.
 *      Se transcodifica con los mismos X264_FINAL que el resto de la USB.
 *   2. Viene vertical (1080 × 1920). El panel es 16:9. Recortarlo a sangre
 *      costaría el 68 % del encuadre —cabezas y pies fuera—, así que se usa la
 *      MISMA disposición editorial que ya usan las 17 fotos verticales: el
 *      video entero centrado, y detrás su propio desenfoque como fondo.
 *   3. Viene a 30 fps y toda la USB va a 29,97. Se conforma con el filtro fps
 *      para que el reproductor no cambie de cadencia a mitad de la noche.
 *
 * El audio se copia BIT A BIT (-c:a copy), no se recodifica, y además se deja
 * una segunda copia sin pista de audio: el LEEME promete que el sonido lo pone
 * el DJ, y quién manda esa noche se decide en el salón, no acá.
 *
 * Sin fundidos de entrada ni salida a propósito: la pieza abre y cierra donde
 * él decidió que abriera y cerrara.
 */
import { spawn, spawnSync, execFileSync } from 'node:child_process'
import { mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { paleta } from './paleta.mjs'
import { ANCHO, ALTO, FPS_NUM, FPS_DEN, X264_FINAL } from './guion.mjs'

const FFMPEG = [
  'ffmpeg',
  join(process.env.LOCALAPPDATA || '', 'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg.exe'),
]
const FFPROBE = FFMPEG.map(p => p.replace(/ffmpeg(\.exe)?$/, (_, e) => 'ffprobe' + (e || '')))

function buscar(lista, que) {
  const hallado = lista.find(p => (p.includes('/') || p.includes('\\'))
    ? existsSync(p)
    : !spawnSync(p, ['-version'], { stdio: 'ignore' }).error)
  if (!hallado) { console.error(`\n  No encontré ${que}.\n`); process.exit(1) }
  return hallado
}

function ff(bin, args, etiqueta) {
  return new Promise((res, rej) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', d => { err += d.toString() })
    p.on('close', c => c === 0 ? res() : rej(new Error(`ffmpeg falló en ${etiqueta}:\n${err.slice(-1500)}`)))
  })
}

const arg = (n, def = null) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.slice(n.length + 3) : def
}

const NOMBRE_PALETA = arg('paleta', 'escenario')
const P = paleta(NOMBRE_PALETA)
const ORIGEN = resolve(arg('video', 'src/imagenes_editadas/VIDEO_PREBODA_MOMENTOS.MOV'))
const SALIDA = resolve('entrega/cine', NOMBRE_PALETA)

const mb = n => (n / 1048576).toFixed(1)

/** Ancho, alto, duración y si trae audio. */
function sondear(bin, ruta) {
  const j = JSON.parse(execFileSync(bin, [
    '-v', 'error', '-show_streams', '-show_format', '-of', 'json', ruta,
  ]).toString())
  const v = j.streams.find(s => s.codec_type === 'video')
  if (!v) throw new Error('El archivo no tiene pista de video')
  return {
    ancho: v.width,
    alto: v.height,
    codec: v.codec_name,
    fps: v.avg_frame_rate,
    dur: parseFloat(j.format.duration),
    audio: j.streams.some(s => s.codec_type === 'audio'),
  }
}

/**
 * La cadena de filtros. Igual criterio que escena() en render.mjs: si la
 * fuente es apaisada va a sangre; si es vertical, panel centrado sobre su
 * propio desenfoque.
 *
 * El panel usa el ALTO COMPLETO. Es el máximo que da la geometría —un 9:16
 * dentro de un 16:9 no puede pasar del 31,6 % del ancho— y achicarlo más para
 * respetar la zona segura de 96 px dejaría el video en un cuarto de pantalla.
 * La zona segura existe para el TEXTO, y acá no hay texto nuestro.
 */
function filtros(src) {
  const fps = `${FPS_NUM}/${FPS_DEN}`

  if (src.ancho / src.alto >= ANCHO / ALTO) {
    return [
      `[0:v]scale=${ANCHO}:${ALTO}:force_original_aspect_ratio=increase,` +
        `crop=${ANCHO}:${ALTO},fps=${fps},format=yuv420p[out]`,
    ].join(';')
  }

  // Ancho del panel, par: x264 con yuv420p no admite dimensiones impares
  const pw = Math.round(ALTO * src.ancho / src.alto / 2) * 2
  const px = Math.round((ANCHO - pw) / 2)

  return [
    `[0:v]split=2[fondo][frente]`,
    // Fondo: el desenfoque del propio video, desaturado y empujado hacia el
    // terracota. El VELO no es cosmético: la sesión se grabó a pleno día y sin
    // él quedan 1920×1080 de gris claro. En un LED, que es emisivo, eso
    // encandila. Mismo criterio (y misma opacidad) que el `dim` de las cartelas.
    `[fondo]scale=${ANCHO}:${ALTO}:force_original_aspect_ratio=increase,crop=${ANCHO}:${ALTO},` +
      `boxblur=40:2,eq=brightness=-0.12:saturation=0.55,` +
      `colorbalance=rs=0.12:gs=-0.02:bs=-0.08,` +
      `drawbox=x=0:y=0:w=${ANCHO}:h=${ALTO}:color=${P.fondo}@0.62:t=fill,` +
      `vignette=PI/5[bg]`,
    `[frente]scale=${pw}:${ALTO}[fg]`,
    `[bg][fg]overlay=${px}:0[comp]`,
    // Filete dorado, el mismo de los paneles de foto. La imagen del fotógrafo
    // queda intacta: velo y viñeta van sobre el fondo, nunca sobre el panel.
    `[comp]drawbox=x=${px}:y=0:w=${pw}:h=${ALTO}:color=${P.oro}@0.40:t=2,` +
      `fps=${fps},format=yuv420p[out]`,
  ].join(';')
}

async function main() {
  const bin = process.env.FFMPEG_PATH || buscar(FFMPEG, 'ffmpeg')
  const probe = process.env.FFPROBE_PATH || buscar(FFPROBE, 'ffprobe')

  if (!existsSync(ORIGEN)) {
    console.error(`\n  No encontré el video: ${ORIGEN}`)
    console.error('  Es un master del fotógrafo y src/imagenes_editadas/ está gitignoreado.')
    console.error('  Pásalo con --video="ruta/al/archivo.MOV"\n')
    process.exit(1)
  }

  await mkdir(SALIDA, { recursive: true })
  const src = sondear(probe, ORIGEN)
  const conAudio = join(SALIDA, `09_preboda_${NOMBRE_PALETA}.mp4`)
  const sinAudio = join(SALIDA, `09_preboda-sin-audio_${NOMBRE_PALETA}.mp4`)

  console.log(`\n  Paleta ...... ${P.nombre}`)
  console.log(`  Origen ...... ${src.ancho}×${src.alto} · ${src.codec} · ${src.fps} fps · ${src.dur.toFixed(2)} s · ${mb((await stat(ORIGEN)).size)} MB`)
  console.log(`  Disposición . ${src.ancho / src.alto >= ANCHO / ALTO ? 'a sangre' : 'panel editorial'}`)
  console.log(`  Salida ...... ${SALIDA}\n`)

  console.log('  Transcodificando… (unos minutos, son 1080p con desenfoque)')
  await ff(bin, [
    '-y', '-i', ORIGEN,
    '-filter_complex', filtros(src),
    '-map', '[out]',
    ...(src.audio ? ['-map', '0:a:0', '-c:a', 'copy'] : ['-an']),
    '-r', `${FPS_NUM}/${FPS_DEN}`,
    ...X264_FINAL,
    conAudio,
  ], 'preboda')
  console.log(`  ✓ ${conAudio.split(/[\\/]/).pop().padEnd(38)} ${mb((await stat(conAudio)).size).padStart(7)} MB`)

  if (src.audio) {
    // Remux, no recodificación: sale gratis
    await ff(bin, ['-y', '-i', conAudio, '-c:v', 'copy', '-an', sinAudio], 'preboda sin audio')
    console.log(`  ✓ ${sinAudio.split(/[\\/]/).pop().padEnd(38)} ${mb((await stat(sinAudio)).size).padStart(7)} MB`)
  }

  console.log('\n  Listo. Recógelo con npm run usb.\n')
}

main().catch(e => { console.error('\n  Falló:', e.message, '\n'); process.exit(1) })
