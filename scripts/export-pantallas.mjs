/**
 * Exporta las cartelas de /pantalla como PNG de 1920 × 1080 exactos,
 * listos para copiar a la USB que se le entrega al proveedor de las LED.
 *
 * Levanta el servidor de Vite en memoria y captura cada cartela con el Chrome
 * (o Edge) que ya está instalado — por eso la dependencia es `puppeteer-core`
 * y no `puppeteer`: no descarga un navegador de 150 MB.
 *
 *   npm run pantallas
 *
 * Salida: entrega/pantallas-led/NN_id.png + LEEME.txt para el proveedor.
 */
import { createServer } from 'vite'
import puppeteer from 'puppeteer-core'
import { mkdir, writeFile, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ANCHO = 1920
const ALTO = 1080
const PUERTO = 5199
const SALIDA = resolve('entrega/pantallas-led')

// ─── Localizar el navegador ───
const CANDIDATOS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]

function buscarNavegador() {
  const encontrado = CANDIDATOS.find(p => existsSync(p))
  if (!encontrado) {
    console.error('\n  No encontré Chrome ni Edge en las rutas habituales.')
    console.error('  Pasá la ruta a mano:  CHROME_PATH="C:/ruta/chrome.exe" npm run pantallas\n')
    process.exit(1)
  }
  return encontrado
}

// ─── Espera a que la cartela esté realmente pintada ───
// Sin esto se capturan cartelas sin las tipografías de Google Fonts (caen al
// fallback Georgia/system-ui) o con la foto de fondo a medio cargar.
async function esperarPintado(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    const imgs = [...document.images]
    await Promise.all(imgs.map(img => (img.complete && img.naturalWidth > 0)
      ? null
      : new Promise(res => { img.onload = res; img.onerror = res })))
  })
  // Un frame extra para que el navegador componga los degradados y sombras
  await new Promise(r => setTimeout(r, 250))
}

const LEEME = `CARTELAS PARA PANTALLAS LED — Boda Angely & Kevin
Sábado 12 de septiembre de 2026 · Casona del Prado, Barranquilla

ESPECIFICACIÓN
  Formato .......... PNG sin compresión con pérdida
  Resolución ....... 1920 x 1080 px (16:9, Full HD)
  Espacio de color . sRGB
  Zona segura ...... el texto vive dentro de un margen de 96 px por lado,
                     así que un recorte leve del panel no corta nada.

ORDEN SUGERIDO Y DURACIÓN
  Las cartelas van numeradas en el nombre del archivo. Sugerencia de uso:

  01 bienvenida ..... en bucle mientras entra la gente (8-10 s por vuelta)
  02 hashtag ........ intercalada durante toda la noche, cada 15-20 min
  08 verso .......... ambiente durante la cena
  03 brindis ........ al momento del brindis
  04 vals ........... al primer baile
  05 torta .......... al corte de la torta
  06 ramo ........... al lanzamiento del ramo
  07 horaloca ....... al arrancar la hora loca
  09 gracias ........ al cierre de la noche

NOTAS
  - Fondo oscuro a propósito: en un LED, que es emisivo, el negro se ve
    elegante y no encandila a los invitados. Por favor NO subir el brillo
    ni aplicar filtros o realces automáticos.
  - No reencuadrar ni estirar: las imágenes ya están a la resolución nativa.
  - Si el reproductor no acepta PNG, convertir a JPG con calidad 95 o más.

Contacto: los novios.
`

async function main() {
  const navegador = process.env.CHROME_PATH || buscarNavegador()
  console.log(`\n  Navegador: ${navegador}`)

  const server = await createServer({ server: { port: PUERTO, strictPort: true }, logLevel: 'error' })
  await server.listen()
  const base = `http://localhost:${PUERTO}/pantalla`
  console.log(`  Servidor:  ${base}\n`)

  const browser = await puppeteer.launch({
    executablePath: navegador,
    headless: 'shell',
    // --disable-lcd-text fuerza antialiasing en escala de grises: el subpíxel de
    // LCD hornea franjas rojas y azules en los bordes de las letras, y en un panel
    // LED eso se ve como suciedad de color alrededor del texto.
    args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--disable-lcd-text', '--font-render-hinting=none'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: ANCHO, height: ALTO, deviceScaleFactor: 1 })

    // La lista de cartelas vive en el componente (window.__CARTELAS): una sola
    // fuente de verdad para el orden y los ids.
    await page.goto(`${base}?export=1`, { waitUntil: 'networkidle0' })
    const ids = await page.evaluate(() => window.__CARTELAS)
    if (!ids?.length) throw new Error('No pude leer window.__CARTELAS desde /pantalla')

    // Carpeta limpia: si se renombra o quita una cartela, no queda un PNG viejo
    // colándose en la USB.
    // Sólo archivos: el subdirectorio video/ lo maneja export-videos.mjs, y un
    // rm sin recursive sobre un directorio revienta.
    if (existsSync(SALIDA)) {
      for (const e of await readdir(SALIDA, { withFileTypes: true })) {
        if (e.isFile()) await rm(join(SALIDA, e.name), { force: true })
      }
    }
    await mkdir(SALIDA, { recursive: true })
    const avisos = []

    for (const [n, id] of ids.entries()) {
      const nombre = `${String(n + 1).padStart(2, '0')}_${id}.png`
      await page.goto(`${base}?export=1&c=${id}`, { waitUntil: 'networkidle0' })
      await esperarPintado(page)

      // Aviso de desborde: el contenido debe caber en la zona segura. Si no cabe,
      // el bloque se sale por arriba y por abajo y el panel LED lo recorta.
      const desborde = await page.evaluate(() => {
        const inner = document.querySelector('.pl-inner')
        const alto = [...inner.children].reduce((t, el) => {
          const cs = getComputedStyle(el)
          return t + el.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom)
        }, 0)
        return { alto: Math.round(alto), util: inner.clientHeight }
      })
      if (desborde.alto > desborde.util) {
        avisos.push(`${id}: el contenido mide ${desborde.alto} px y la zona segura sólo ${desborde.util} px`)
      }

      const caja = await page.$('#pl-card')
      if (!caja) throw new Error(`No encontré #pl-card para la cartela "${id}"`)
      await caja.screenshot({ path: join(SALIDA, nombre), type: 'png' })
      console.log(`  ✓ ${nombre}`)
    }

    await writeFile(join(SALIDA, 'LEEME.txt'), LEEME, 'utf8')
    console.log(`  ✓ LEEME.txt\n`)
    console.log(`  ${ids.length} cartelas en ${SALIDA}\n`)

    if (avisos.length) {
      console.warn('  Ojo — estas cartelas se salen de la zona segura:')
      for (const a of avisos) console.warn(`    ! ${a}`)
      console.warn('')
    }
  } finally {
    await browser.close()
    await server.close()
  }
}

main().catch(err => {
  console.error('\n  Falló la exportación:', err.message, '\n')
  process.exit(1)
})
