/**
 * Exporta las cartelas de /pantalla como MP4 de 1920 × 1080 en bucle,
 * para la misma USB que se le entrega al proveedor de las LED.
 *
 *   npm run videos                 # todas las cartelas
 *   npm run videos -- bienvenida hashtag
 *
 * Los fotogramas NO se capturan en tiempo real: se recorre la línea de tiempo
 * de las animaciones con la Web Animations API fijando `currentTime` fotograma
 * a fotograma. Así el resultado es determinista (no depende de lo cargada que
 * esté la máquina) y el bucle cierra exacto — los keyframes de pantalla.css
 * empiezan y terminan en la misma posición, y la duración del video es un
 * múltiplo del ciclo.
 *
 * Salida: entrega/pantallas-led/video/NN_id.mp4
 */
import { createServer } from 'vite'
import puppeteer from 'puppeteer-core'
import { spawn, spawnSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ANCHO = 1920
const ALTO = 1080
const FPS = 30
// 16 s = mínimo común múltiplo de los ciclos de pantalla.css (drift 16 s,
// latido y filete 8 s). Si la duración no es múltiplo de TODOS, el bucle da
// un salto visible al reiniciar.
const CICLO = 16
const VUELTAS = 1
const PUERTO = 5200
const SALIDA = resolve('entrega/pantallas-led/video')

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]

// winget deja ffmpeg aquí y sólo actualiza el PATH de las shells nuevas
const FFMPEG = [
  'ffmpeg',
  join(process.env.LOCALAPPDATA || '', 'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg.exe'),
]

function buscar(lista, que) {
  // 'ffmpeg' a secas sólo vale si de verdad responde: winget avisa que el PATH
  // nuevo no llega a las shells ya abiertas, y ahí un existsSync no sirve.
  const hallado = lista.find(p => p.includes('/') || p.includes('\\')
    ? existsSync(p)
    : !spawnSync(p, ['-version'], { stdio: 'ignore' }).error)
  if (!hallado) {
    console.error(`\n  No encontré ${que}.\n`)
    process.exit(1)
  }
  return hallado
}

/** Codifica una secuencia de PNG que le llegan por stdin a un MP4 en bucle. */
function abrirFfmpeg(bin, destino) {
  const ff = spawn(bin, [
    '-y',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '16',              // prácticamente sin pérdida visible en LED
    '-pix_fmt', 'yuv420p',     // sin esto muchos reproductores de LED no abren el archivo
    '-movflags', '+faststart',
    destino,
  ], { stdio: ['pipe', 'ignore', 'pipe'] })

  let err = ''
  ff.stderr.on('data', d => { err += d.toString() })
  const fin = new Promise((res, rej) => {
    ff.on('close', code => code === 0 ? res() : rej(new Error(`ffmpeg salió con ${code}:\n${err.slice(-800)}`)))
  })
  return { ff, fin }
}

async function main() {
  const pedidas = process.argv.slice(2).filter(a => !a.startsWith('-'))
  const navegador = process.env.CHROME_PATH || buscar(CHROME, 'Chrome ni Edge')
  const ffmpegBin = process.env.FFMPEG_PATH || buscar(FFMPEG, 'ffmpeg')

  const server = await createServer({ server: { port: PUERTO, strictPort: true }, logLevel: 'error' })
  await server.listen()
  const base = `http://localhost:${PUERTO}/pantalla`

  const browser = await puppeteer.launch({
    executablePath: navegador,
    headless: 'shell',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--disable-lcd-text', '--font-render-hinting=none'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: ANCHO, height: ALTO, deviceScaleFactor: 1 })

    await page.goto(`${base}?export=1`, { waitUntil: 'networkidle0' })
    const todas = await page.evaluate(() => window.__CARTELAS)
    const ids = pedidas.length ? todas.filter(id => pedidas.includes(id)) : todas
    if (!ids.length) throw new Error(`Ninguna cartela coincide. Disponibles: ${todas.join(', ')}`)

    await mkdir(SALIDA, { recursive: true })
    const total = CICLO * VUELTAS * FPS

    for (const id of ids) {
      const n = todas.indexOf(id) + 1
      const destino = join(SALIDA, `${String(n).padStart(2, '0')}_${id}.mp4`)

      await page.goto(`${base}?export=1&anim=1&c=${id}`, { waitUntil: 'networkidle0' })
      await page.evaluate(async () => {
        await document.fonts.ready
        await Promise.all([...document.images].map(img => (img.complete && img.naturalWidth > 0)
          ? null
          : new Promise(res => { img.onload = res; img.onerror = res })))
        // Congelar el reloj de las animaciones: a partir de acá las movemos a mano
        document.getAnimations().forEach(a => a.pause())
      })

      const caja = await page.$('#pl-card')
      const { ff, fin } = abrirFfmpeg(ffmpegBin, destino)

      process.stdout.write(`  ${String(n).padStart(2, '0')}_${id}.mp4 `)
      for (let f = 0; f < total; f++) {
        const t = (f / FPS) * 1000
        await page.evaluate(ms => { document.getAnimations().forEach(a => { a.currentTime = ms }) }, t)
        // optimizeForSpeed salta la compresión fina del PNG: da igual, el
        // fotograma se va por una tubería a ffmpeg y no se guarda en disco.
        const png = await caja.screenshot({ type: 'png', optimizeForSpeed: true, captureBeyondViewport: false })
        if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r))
        if (f % 30 === 0) process.stdout.write('.')
      }
      ff.stdin.end()
      await fin
      console.log(` ✓ ${total} fotogramas`)
    }

    console.log(`\n  ${ids.length} video(s) en ${SALIDA}\n`)
  } finally {
    await browser.close()
    await server.close()
  }
}

main().catch(err => {
  console.error('\n  Falló la exportación de video:', err.message, '\n')
  process.exit(1)
})
