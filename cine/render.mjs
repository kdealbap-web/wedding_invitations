/**
 * Motor de render. Local, sin nube.
 *
 *   npm run cine                          # loop + segmentos, paleta escenario
 *   npm run cine -- --paleta=invitacion   # la otra paleta
 *   npm run cine -- --solo=vals           # una sola pieza
 *   npm run cine -- --fotos="D:/fotos-boda"
 *   npm run cine -- --contacto            # sólo la hoja de contactos (rápido)
 *
 * Reparto del trabajo:
 *   navegador → capas de texto (una vez por escena, en PNG con alfa)
 *   ffmpeg    → Ken Burns, grano, viñeta, light leak, crossfades y encoding
 *
 * Por eso rinde: la v1 de /pantalla capturaba cada fotograma en el navegador
 * (2m52s por 16 s). Acá el navegador se llama ~14 veces en total.
 */
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'
import { paleta } from './paleta.mjs'
import { render as renderOverlay } from './overlay.mjs'
import { normalizar, disposicion } from './fotos.mjs'
import { LOOP, SEGMENTOS, FPS_NUM, FPS_DEN, ANCHO, ALTO, FUNDIDO, seg, framesTotalesLoop, X264_FINAL, X264_TMP, GRANO } from './guion.mjs'

// Panel de la foto vertical en disposición editorial
const PANEL = { w: 640, h: 960, x: 1160, y: 60 }

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]
const FFMPEG = [
  'ffmpeg',
  join(process.env.LOCALAPPDATA || '', 'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg.exe'),
]

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
const flag = n => process.argv.includes(`--${n}`)

const NOMBRE_PALETA = arg('paleta', 'escenario')
const P = paleta(NOMBRE_PALETA)
const SOLO = arg('solo')
const DIR_FOTOS = arg('fotos', 'src/assets/img')
const SALIDA = resolve('entrega/cine', NOMBRE_PALETA)
const TMP = resolve('entrega/cine/.tmp')
const TMP_PAL = join(TMP, NOMBRE_PALETA)

function rutaOriginal(nombre) {
  if (!nombre) return null
  for (const base of [DIR_FOTOS, 'src/assets/img']) {
    const r = resolve(base, nombre)
    if (existsSync(r)) return r
  }
  return null
}

// ─── Piezas generadas ───
async function hacerLeak(destino) {
  const w = 900, h = ALTO
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${P.acc}" stop-opacity="0"/>
      <stop offset="45%"  stop-color="${P.oro}" stop-opacity="0.85"/>
      <stop offset="55%"  stop-color="${P.rubor}" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="${P.acc}" stop-opacity="0"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/></svg>`
  await sharp(Buffer.from(svg)).blur(60).png().toFile(destino)
}

async function hacerFondoFiesta(destino) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}">
    <defs><radialGradient id="g" cx="50%" cy="45%" r="75%">
      <stop offset="0%"   stop-color="${P.accDk}"/>
      <stop offset="48%"  stop-color="${P.fondoAlt}"/>
      <stop offset="100%" stop-color="${P.fondo}"/>
    </radialGradient></defs>
    <rect width="${ANCHO}" height="${ALTO}" fill="url(#g)"/></svg>`
  await sharp(Buffer.from(svg)).png().toFile(destino)
}

function anclas(origen) {
  switch (origen) {
    case 'arriba': return { x: 'iw/2-(iw/zoom/2)', y: '0' }
    case 'abajo':  return { x: 'iw/2-(iw/zoom/2)', y: 'ih-ih/zoom' }
    case 'izq':    return { x: '0',                y: 'ih/2-(ih/zoom/2)' }
    case 'der':    return { x: 'iw-iw/zoom',       y: 'ih/2-(ih/zoom/2)' }
    default:       return { x: 'iw/2-(iw/zoom/2)', y: 'ih/2-(ih/zoom/2)' }
  }
}

/**
 * Una escena → un MP4.
 * Entradas: 0 = foto ya normalizada · 1 = light leak · 2 = capa de texto
 */
async function escena(bin, e, disp, rutaFoto, rutaOverlay, rutaLeak, destino, { fadeIn, fadeOut, esFinal = false }) {
  const F = e.frames
  const dur = seg(F)
  const [z0, z1] = e.camara.zoom
  const { x, y } = anclas(e.camara.origen)
  const z = `${z0}+(${z1}-${z0})*on/${Math.max(1, F - 1)}`
  const fps = `${FPS_NUM}/${FPS_DEN}`
  const filtros = []

  if (disp === 'editorial') {
    // Foto vertical: fondo desenfocado de ella misma + panel nítido a la derecha.
    // Recortarla a 16:9 costaría el 63 % del alto — cabezas o pies fuera.
    filtros.push(
      `[0:v]split=2[pa][pb]`,
      `[pa]scale=${ANCHO}:${ALTO}:force_original_aspect_ratio=increase,crop=${ANCHO}:${ALTO},` +
        `boxblur=40:2,eq=brightness=-0.18:saturation=0.70[bg]`,
      `[pb]scale=1280:1920:force_original_aspect_ratio=increase,crop=1280:1920,` +
        `zoompan=z='${z}':x='${x}':y='${y}':d=${F}:s=${PANEL.w}x${PANEL.h}:fps=${fps},` +
        `drawbox=x=0:y=0:w=iw:h=ih:color=${P.oro}@0.40:t=2[panel]`,
      // El texto va DEBAJO del panel, si no el velo ensuciaría la foto
      `[bg][2:v]overlay=0:0:format=auto[conTexto]`,
      `[conTexto][panel]overlay=${PANEL.x}:${PANEL.y}:format=auto[comp]`,
    )
  } else {
    // Foto apaisada (o degradado de fiesta): a sangre, texto centrado encima
    filtros.push(
      `[0:v]crop=iw:iw*9/16,scale=3840:2160,` +
        `zoompan=z='${z}':x='${x}':y='${y}':d=${F}:s=${ANCHO}x${ALTO}:fps=${fps}[bg]`,
      `[bg][2:v]overlay=0:0:format=auto[comp]`,
    )
  }

  // Acabado común: light leak barriendo, viñeta y grano de película
  filtros.push(
    `[1:v]format=rgba,colorchannelmixer=aa=0.18[leak]`,
    `[comp][leak]overlay=x='-w+(W+w)*mod(t/14\\,1)':y=0:format=auto[lit]`,
    `[lit]vignette=PI/5,noise=alls=${GRANO}:allf=t+u,format=yuv420p[grano]`,
  )

  let ultima = 'grano'
  const fades = []
  if (fadeIn) fades.push('fade=t=in:st=0:d=1')
  if (fadeOut) fades.push(`fade=t=out:st=${(dur - 1).toFixed(4)}:d=1`)
  if (fades.length) { filtros.push(`[grano]${fades.join(',')}[fin]`); ultima = 'fin' }

  await ff(bin, [
    '-y',
    '-i', rutaFoto,
    '-loop', '1', '-i', rutaLeak,
    '-loop', '1', '-i', rutaOverlay,
    '-filter_complex', filtros.join(';'),
    '-map', `[${ultima}]`,
    '-frames:v', String(F),
    '-r', fps,
    ...(esFinal ? X264_FINAL : X264_TMP),
    destino,
  ], e.id)
}

async function encadenar(bin, clips, destino) {
  const d = seg(FUNDIDO)
  const entradas = clips.flatMap(c => ['-i', c])
  const filtros = []
  let previa = '0:v'
  let acumulado = 0

  for (let i = 1; i < clips.length; i++) {
    acumulado += seg(LOOP.escenas[i - 1].frames) - d
    const salida = i === clips.length - 1 ? 'out' : `v${i}`
    filtros.push(`[${previa}][${i}:v]xfade=transition=fade:duration=${d.toFixed(4)}:offset=${acumulado.toFixed(4)}[${salida}]`)
    previa = salida
  }

  await ff(bin, [
    '-y', ...entradas,
    '-filter_complex', filtros.join(';'),
    '-map', '[out]',
    '-r', `${FPS_NUM}/${FPS_DEN}`,
    ...X264_FINAL,
    destino,
  ], 'crossfades')
}

/** Hoja de contactos: todas las escenas de un vistazo, sin renderizar video. */
async function hojaContactos(piezas, destino) {
  const cols = 3, cw = 640, ch = 360
  const filas = Math.ceil(piezas.length / cols)
  const capas = []

  for (const [i, pz] of piezas.entries()) {
    let base
    if (pz.disp === 'editorial') {
      const fondo = await sharp(pz.foto.ruta).resize(cw, ch, { fit: 'cover' })
        .blur(14).modulate({ brightness: .8, saturation: .7 }).toBuffer()
      const k = ch / ALTO
      const panel = await sharp(pz.foto.ruta)
        .resize(Math.round(PANEL.w * k), Math.round(PANEL.h * k), { fit: 'cover' }).toBuffer()
      base = await sharp(fondo).composite([
        { input: panel, left: Math.round(PANEL.x * k), top: Math.round(PANEL.y * k) },
      ]).png().toBuffer()
    } else if (pz.foto) {
      base = await sharp(pz.foto.ruta).resize(cw, ch, { fit: 'cover' }).modulate({ brightness: .85 }).toBuffer()
    } else {
      base = await sharp({ create: { width: cw, height: ch, channels: 4, background: P.fondoAlt } }).png().toBuffer()
    }
    const capa = await sharp(pz.png).resize(cw, ch, { fit: 'fill' }).toBuffer()
    capas.push({
      input: await sharp(base).composite([{ input: capa }]).png().toBuffer(),
      left: (i % cols) * cw, top: Math.floor(i / cols) * ch,
    })
  }

  await sharp({ create: { width: cols * cw, height: filas * ch, channels: 4, background: P.fondo } })
    .composite(capas).png().toFile(destino)
}

// ══════════════════════════════════════════════════════════════════
async function main() {
  const navegador = process.env.CHROME_PATH || buscar(CHROME, 'Chrome ni Edge')
  const ffmpegBin = process.env.FFMPEG_PATH || buscar(FFMPEG, 'ffmpeg')

  await mkdir(SALIDA, { recursive: true })
  await mkdir(TMP_PAL, { recursive: true })

  console.log(`\n  Paleta ...... ${P.nombre} (${P.acc})`)
  console.log(`  Fotos ....... ${DIR_FOTOS}`)
  console.log(`  Salida ...... ${SALIDA}\n`)

  const rutaLeak = join(TMP_PAL, 'leak.png')
  const rutaFondo = join(TMP_PAL, 'fondo-fiesta.png')
  await hacerLeak(rutaLeak)
  await hacerFondoFiesta(rutaFondo)

  const browser = await puppeteer.launch({
    executablePath: navegador, headless: 'shell',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--disable-lcd-text'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: ANCHO, height: ALTO, deviceScaleFactor: 1 })

    // ── 1. Normalizar fotos y decidir disposición ──
    const todas = [
      ...LOOP.escenas.map(e => ({ ...e, grupo: 'loop' })),
      ...SEGMENTOS.map(s => ({ ...s, grupo: 'seg' })),
    ]
    const piezas = []
    console.log('  Escenas:')
    for (const e of todas) {
      const orig = rutaOriginal(e.foto)
      const foto = orig ? await normalizar(orig, join(TMP, 'fotos')) : null
      const disp = disposicion(foto)
      const png = join(TMP_PAL, `ov_${e.grupo}_${e.id}.png`)
      await writeFile(png, await renderOverlay(page, e.capa, P, disp))
      piezas.push({ id: e.id, grupo: e.grupo, png, foto, disp, escena: e })
      console.log(`    · ${e.id.padEnd(12)} ${disp.padEnd(10)} ${foto ? `${foto.ancho}x${foto.alto}` : 'degradado'}`)
    }

    // ── 2. Hoja de contactos ──
    const hoja = join(SALIDA, `00_storyboard_${NOMBRE_PALETA}.png`)
    await hojaContactos(piezas, hoja)
    console.log(`\n  ✓ ${basename(hoja)}`)
    if (flag('contacto')) return

    const fuente = pz => pz.foto ? pz.foto.ruta : rutaFondo

    // ── 3. Loop principal ──
    if (!SOLO || SOLO === 'loop') {
      console.log('\n  Loop principal:')
      const clips = []
      for (const [i, e] of LOOP.escenas.entries()) {
        const pz = piezas.find(p => p.grupo === 'loop' && p.id === e.id)
        const dst = join(TMP_PAL, `loop_${String(i).padStart(2, '0')}_${e.id}.mp4`)
        await escena(ffmpegBin, e, pz.disp, fuente(pz), pz.png, rutaLeak, dst, {
          fadeIn: i === 0, fadeOut: i === LOOP.escenas.length - 1,
        })
        clips.push(dst)
        console.log(`    ✓ ${e.id}`)
      }
      const destino = join(SALIDA, `01_loop-principal_${NOMBRE_PALETA}.mp4`)
      await encadenar(ffmpegBin, clips, destino)
      console.log(`  ✓ ${basename(destino)}  (${seg(framesTotalesLoop()).toFixed(2)} s)`)
    }

    // ── 4. Segmentos ──
    const segs = SEGMENTOS.filter(s => !SOLO || SOLO === s.id || SOLO === 'segmentos')
    if (segs.length && SOLO !== 'loop') {
      console.log('\n  Segmentos:')
      for (const s of segs) {
        const pz = piezas.find(p => p.grupo === 'seg' && p.id === s.id)
        const n = SEGMENTOS.indexOf(s) + 2
        const dst = join(SALIDA, `${String(n).padStart(2, '0')}_${s.id}_${NOMBRE_PALETA}.mp4`)
        await escena(ffmpegBin, s, pz.disp, fuente(pz), pz.png, rutaLeak, dst, { fadeIn: true, fadeOut: true, esFinal: true })
        console.log(`    ✓ ${basename(dst)}  (${seg(s.frames).toFixed(2)} s)`)
      }
    }

    console.log(`\n  Todo en ${SALIDA}\n`)
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error('\n  Falló:', e.message, '\n'); process.exit(1) })
