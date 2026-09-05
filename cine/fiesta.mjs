/**
 * PIEZAS DE FIESTA — dinámicas, de corte rápido.
 *
 *   npm run fiesta
 *   npm run fiesta -- --paleta=invitacion
 *   npm run fiesta -- --solo=rafaga
 *   npm run fiesta -- --fotos="D:/fotos-boda"
 *
 * Contrapunto del loop elegante: acá no hay Ken Burns lento sino cortes secos
 * sobre rejilla rítmica, mosaico que se arma solo y golpes de luz en cada corte.
 *
 * Técnica distinta a la de render.mjs, y a propósito: aquí `sharp` compone cada
 * estado como una imagen completa y ffmpeg sólo las secuencia y les da el
 * acabado. Sin `zoompan` a 4K, así que rinde en segundos en vez de minutos —
 * que es lo que hace viable probar variantes de montaje.
 */
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'
import { paleta } from './paleta.mjs'
import { render as renderOverlay } from './overlay.mjs'
import { normalizar } from './fotos.mjs'
import { FPS_NUM, FPS_DEN, ANCHO, ALTO, seg, X264_FINAL, GRANO } from './guion.mjs'

// ─── Rejilla rítmica ───
// 18 fotogramas por corte = 0,6006 s ≈ 100 golpes por minuto. Es el tempo de
// buena parte de lo que suena en una hora loca, así que los cortes caen cerca
// del pulso de casi cualquier cosa que ponga el DJ.
const CORTE = 18
const CELDA = 15   // fotogramas entre celda y celda del mosaico

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
  const h = lista.find(p => (p.includes('/') || p.includes('\\'))
    ? existsSync(p) : !spawnSync(p, ['-version'], { stdio: 'ignore' }).error)
  if (!h) { console.error(`\n  No encontré ${que}.\n`); process.exit(1) }
  return h
}
function ff(bin, args, etiqueta) {
  return new Promise((res, rej) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', d => { err += d.toString() })
    p.on('close', c => c === 0 ? res() : rej(new Error(`ffmpeg falló en ${etiqueta}:\n${err.slice(-1200)}`)))
  })
}

const arg = (n, d = null) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.slice(n.length + 3) : d
}
const NOMBRE_PALETA = arg('paleta', 'escenario')
const P = paleta(NOMBRE_PALETA)
const SOLO = arg('solo')
const DIR_FOTOS = arg('fotos', 'src/assets/img')
const SALIDA = resolve('entrega/cine', NOMBRE_PALETA)
const TMP = resolve('entrega/cine/.tmp')
const TMP_F = join(TMP, `fiesta-${NOMBRE_PALETA}`)

/** Todas las fotos disponibles, ya normalizadas de EXIF. */
async function inventario() {
  const dirs = [DIR_FOTOS, 'src/assets/img']
  const vistos = new Set()
  const fotos = []
  for (const d of dirs) {
    if (!existsSync(resolve(d))) continue
    for (const f of (await readdir(resolve(d))).sort()) {
      if (!/\.(jpe?g|png)$/i.test(f)) continue
      if (/logo|iglesia|casona/i.test(f)) continue     // no son de la pareja
      if (vistos.has(f)) continue
      vistos.add(f)
      fotos.push(await normalizar(resolve(d, f), join(TMP, 'fotos')))
    }
  }
  return fotos
}

/**
 * Un cuadro de 1920×1080 con la foto entera y su propio desenfoque detrás.
 * La mayoría de las fotos son verticales; recortarlas a 16:9 costaría el 63 %
 * del alto, así que se muestran completas y el fondo lo pone ella misma.
 */
async function cuadro(foto) {
  // Las tres apaisadas van a sangre: rompen el ritmo de los paneles verticales
  // y le dan variedad al montaje, que es de lo que vive una ráfaga.
  if (!foto.vertical) {
    return sharp(foto.ruta).resize(ANCHO, ALTO, { fit: 'cover' })
      .modulate({ brightness: 0.94, saturation: 1.12 }).png().toBuffer()
  }

  // Fondo: el desenfoque de la propia foto, oscuro pero CON su color. Bajarle
  // la saturación lo volvía gris, y gris no es fiesta.
  const fondo = await sharp(foto.ruta)
    .resize(ANCHO, ALTO, { fit: 'cover' })
    .blur(45).modulate({ brightness: 0.34, saturation: 1.35 })
    .toBuffer()

  // Tinte terracota en soft-light: amarra el fondo a la paleta sea cual sea la foto
  const tinte = await sharp({
    create: { width: ANCHO, height: ALTO, channels: 4, background: { ...hexRgb(P.acc), alpha: 0.30 } },
  }).png().toBuffer()

  const alto = ALTO - 72
  const ancho = Math.round(alto * foto.ancho / foto.alto)
  const frente = await sharp(foto.ruta)
    .resize(ancho - 8, alto - 8, { fit: 'cover' })
    .extend({ top: 4, bottom: 4, left: 4, right: 4, background: P.arena })   // filete claro
    .toBuffer()

  return sharp(fondo)
    .composite([
      { input: tinte, blend: 'soft-light' },
      { input: frente, left: Math.round((ANCHO - ancho) / 2), top: 36 },
    ]).png().toBuffer()
}

/** '#E07A5F' → { r, g, b } */
function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** Estado k del mosaico: las primeras k celdas de la rejilla, llenas. */
async function estadoMosaico(fotos, k, cols, filas) {
  const cw = Math.floor(ANCHO / cols), ch = Math.floor(ALTO / filas)
  const capas = []
  for (let i = 0; i < k; i++) {
    const cell = await sharp(fotos[i % fotos.length].ruta)
      .resize(cw - 6, ch - 6, { fit: 'cover', position: 'top' })   // 'top' favorece las caras
      .modulate({ brightness: 0.92 })
      .toBuffer()
    capas.push({ input: cell, left: (i % cols) * cw + 3, top: Math.floor(i / cols) * ch + 3 })
  }
  return sharp({ create: { width: ANCHO, height: ALTO, channels: 4, background: P.fondo } })
    .composite(capas).png().toBuffer()
}

/** Lista para el demuxer concat, con duraciones exactas en fotogramas. */
async function listaConcat(entradas, destino) {
  const lineas = []
  for (const { ruta, frames } of entradas) {
    lineas.push(`file '${ruta.replace(/\\/g, '/')}'`)
    lineas.push(`duration ${seg(frames).toFixed(6)}`)
  }
  // El demuxer ignora la duración del último; se repite la entrada para fijarla
  lineas.push(`file '${entradas.at(-1).ruta.replace(/\\/g, '/')}'`)
  await writeFile(destino, lineas.join('\n'), 'utf8')
}

/**
 * Acabado común: golpe de luz en cada corte, grano, viñeta y el rótulo.
 * El golpe usa eq con eval=frame — una subida de brillo que decae en ~0,1 s
 * justo al empezar cada celda del ritmo. Es lo que hace que el corte se sienta.
 */
async function acabar(bin, listaTxt, overlayPng, apareceEn, totalFrames, destino) {
  const fps = `${FPS_NUM}/${FPS_DEN}`
  const periodo = seg(CORTE).toFixed(6)
  const filtros = [
    `[0:v]fps=${fps},` +
      `eq=brightness='0.13*max(0\\,1-mod(t\\,${periodo})*10)':eval=frame,` +
      `vignette=PI/5,noise=alls=${GRANO + 1}:allf=t+u[base]`,
    `[1:v]format=rgba,fade=t=in:st=${apareceEn.toFixed(3)}:d=0.45:alpha=1[ov]`,
    `[base][ov]overlay=0:0:format=auto[fin]`,
  ]
  await ff(bin, [
    '-y',
    '-f', 'concat', '-safe', '0', '-i', listaTxt,
    '-loop', '1', '-i', overlayPng,
    '-filter_complex', filtros.join(';'),
    '-map', '[fin]',
    '-frames:v', String(totalFrames),
    '-r', fps, '-fps_mode', 'cfr',
    ...X264_FINAL,
    destino,
  ], basename(destino))
}

// ══════════════════════════════════════════════════════════════════
async function main() {
  const navegador = process.env.CHROME_PATH || buscar(CHROME, 'Chrome ni Edge')
  const ffmpegBin = process.env.FFMPEG_PATH || buscar(FFMPEG, 'ffmpeg')
  await mkdir(SALIDA, { recursive: true })
  await mkdir(TMP_F, { recursive: true })

  console.log(`\n  Paleta ...... ${P.nombre}`)
  console.log(`  Fotos ....... ${DIR_FOTOS}`)

  const fotos = await inventario()
  console.log(`  Inventario .. ${fotos.length} fotos de la pareja\n`)
  if (!fotos.length) throw new Error('No encontré fotos')

  const browser = await puppeteer.launch({
    executablePath: navegador, headless: 'shell',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--disable-lcd-text'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: ANCHO, height: ALTO, deviceScaleFactor: 1 })

    // ─── MOSAICO ───
    if (!SOLO || SOLO === 'mosaico') {
      const cols = 4, filas = 3, celdas = cols * filas
      const entradas = []
      for (let k = 1; k <= celdas; k++) {
        const ruta = join(TMP_F, `mos_${String(k).padStart(2, '0')}.png`)
        await writeFile(ruta, await estadoMosaico(fotos, k, cols, filas))
        // Las 11 primeras duran una celda; la última sostiene el resto
        entradas.push({ ruta, frames: k < celdas ? CELDA : 450 - CELDA * (celdas - 1) })
      }
      const lista = join(TMP_F, 'mosaico.txt')
      await listaConcat(entradas, lista)

      const ov = join(TMP_F, 'ov_mosaico.png')
      await writeFile(ov, await renderOverlay(page, {
        tipo: 'banda', kicker: 'Comparte la noche con nosotros',
        texto: '#AyKBoda', nota: 'Sube tus fotos y videos con el hashtag',
      }, P, 'pleno'))

      const dst = join(SALIDA, `07_mosaico_${NOMBRE_PALETA}.mp4`)
      await acabar(ffmpegBin, lista, ov, seg(CELDA * celdas), 450, dst)
      console.log(`  ✓ ${basename(dst)}   ${celdas} celdas · 15,02 s`)
    }

    // ─── RÁFAGA ───
    if (!SOLO || SOLO === 'rafaga') {
      const cortes = 20
      const entradas = []
      for (let i = 0; i < cortes; i++) {
        const ruta = join(TMP_F, `raf_${String(i).padStart(2, '0')}.png`)
        await writeFile(ruta, await cuadro(fotos[i % fotos.length]))
        entradas.push({ ruta, frames: CORTE })
      }
      // Cierre: la última foto muy desenfocada, para que el rótulo pese
      const cierre = join(TMP_F, 'raf_cierre.png')
      await writeFile(cierre, await sharp(fotos[0].ruta)
        .resize(ANCHO, ALTO, { fit: 'cover' })
        .blur(50).modulate({ brightness: 0.42 }).png().toBuffer())
      entradas.push({ ruta: cierre, frames: 450 - CORTE * cortes })

      const lista = join(TMP_F, 'rafaga.txt')
      await listaConcat(entradas, lista)

      const ov = join(TMP_F, 'ov_rafaga.png')
      await writeFile(ov, await renderOverlay(page, {
        tipo: 'fiesta', kicker: 'Que empiece el desorden',
        texto: '¡A la pista!', nota: 'Angely & Kevin · #AyKBoda',
      }, P, 'pleno'))

      const dst = join(SALIDA, `08_rafaga_${NOMBRE_PALETA}.mp4`)
      await acabar(ffmpegBin, lista, ov, seg(CORTE * cortes), 450, dst)
      console.log(`  ✓ ${basename(dst)}    ${cortes} cortes · 15,02 s`)
    }

    console.log(`\n  En ${SALIDA}\n`)
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error('\n  Falló:', e.message, '\n'); process.exit(1) })
