/**
 * Los votos de Kevin, para llevar en el bolsillo y leer en el altar, y la
 * tarjeta que va con las flores de la mañana.
 *
 *   npm run votos
 *
 * Genera, en entrega/votos/:
 *   votos-1.png, votos-2.png   dos hojas A4 verticales a 300 dpi
 *   tarjeta-flores.png          A6 apaisada, para el ramo de la mañana
 *   COMO-IMPRIMIR.txt           las instrucciones, para no adivinar
 *
 * POR QUÉ ASÍ Y NO DE OTRA FORMA
 *
 * Dos hojas A4 sueltas, a una sola cara y A DOS COLUMNAS, y se doblan juntas en
 * tres: quedan 21 × 9,9 cm, que es exactamente lo que entra en el bolsillo
 * interno de un saco. Dos columnas y no una porque a todo el ancho el renglón
 * sale de 85 caracteres y leyendo en voz alta el ojo no lo encuentra de vuelta;
 * partido en dos son 47, que es medida de libro, y de paso la hoja se llena. No es un tríptico ni un cuadernillo a propósito: esos necesitan
 * imprimir por las dos caras y acertar el volteo, y esto se imprime mañana,
 * con prisa y sin margen para una prueba fallida.
 *
 * La letra es Cormorant Garamond EN CURSIVA, que es la cursiva de verdad de una
 * tipografía de libro: se lee de corrido. La caligráfica de la boda (Great
 * Vibes) es preciosa para dos palabras y un desastre para novecientas —de pie,
 * nervioso y con la iglesia mirando, no se lee—. Por eso sólo aparece en la
 * firma.
 *
 * El cuerpo va a 28 px de CSS ≈ 13,3 pt y la línea a 1,52: más suelto que un
 * libro, porque leer en voz alta es ir saltando de renglón y hay que poder
 * volver a encontrar el sitio.
 *
 * Lo que va en redonda (sin cursiva) es lo que tiene que saltar a la vista para
 * reencontrar el punto: las promesas, la cita y el cierre.
 */
import puppeteer from 'puppeteer-core'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { VOTOS, FLORES, estiloFlores, cuerpoFlores, bloqueVoto } from './votos-texto.mjs'

const SALIDA = resolve('entrega/votos')
const LOGO   = resolve('src/assets/img/logo_a&K.png')
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]
const FUENTES = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Great+Vibes&family=Jost:wght@300;400;500&display=swap'

const CM = 59.055
const cm = n => +(n * CM).toFixed(1)
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')


// El texto vive en votos-texto.mjs: lo comparte con el pliego de tarjetas
const PAGINAS = [...new Set(VOTOS.map(b => b.pag))].sort((a, b) => a - b)

function htmlFlores() {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  .hoja{position:relative}
  ${estiloFlores('.hoja', cm)}
</style></head><body><div class="hoja">${cuerpoFlores(esc)}</div></body></html>`
}

const bloque = b => bloqueVoto(b, esc)

function htmlPagina(pag, total, logo) {
  const cuerpo = VOTOS.filter(b => b.pag === pag).map(bloque).join('')
  const primera = pag === PAGINAS[0]

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  .hoja{width:${cm(21)}px;height:${cm(29.7)}px;background:#FBF5EA;color:#221610;
    padding:${cm(1.3)}px ${cm(1.3)}px ${cm(1)}px;position:relative;
    display:flex;flex-direction:column;-webkit-font-smoothing:antialiased}
  /* Filete interior, el mismo marco de la participación, pegado al borde */
  .marco{position:absolute;inset:${cm(0.55)}px;border:1px solid #E0CFAE;pointer-events:none}

  .cab{display:flex;align-items:center;gap:${cm(0.5)}px;padding-bottom:${cm(0.35)}px;
    border-bottom:1px solid #E6D8BE;margin-bottom:${cm(0.45)}px}
  .cab img{height:${cm(1)}px;width:auto}
  .cab p{font-family:Jost,system-ui,sans-serif;font-size:11px;letter-spacing:.3em;
    color:#A2917F}

  /* DOS COLUMNAS: es lo que llena la hoja sin estirar el renglón. Una sola
     columna a todo el ancho serían 85 caracteres y leyendo en voz alta el ojo
     no encuentra el renglón de vuelta; así son 47, que es medida de libro. */
  .txt{flex:1;min-height:0;column-count:2;column-gap:${cm(0.9)}px;column-fill:balance;
    font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;
    font-weight:400;font-size:28px;line-height:1.52;text-align:left}
  .txt p{margin-bottom:${cm(0.3)}px}
  .saludo{font-style:normal;font-weight:600;font-size:33px;letter-spacing:.02em;
    color:#9A5B45;margin-bottom:${cm(0.35)}px !important}
  /* En redonda y un punto más grande: es lo que hay que reencontrar de un
     vistazo cuando uno levanta la vista para mirarla. */
  /* En redonda: los puntos de reenganche al levantar la vista. El break-inside
     evita que una promesa quede partida entre dos columnas. */
  .fuerte{font-style:normal;font-weight:500;font-size:29px;color:#7E2E1B;
    line-height:1.38;break-inside:avoid}
  .lista{list-style:none;font-style:normal;font-size:26px;line-height:1.34;
    margin-bottom:${cm(0.3)}px}
  .lista li{padding-left:${cm(0.5)}px;position:relative;margin-bottom:${cm(0.18)}px;
    break-inside:avoid}
  .lista li::before{content:'·';position:absolute;left:${cm(0.18)}px;color:#B08C4F;
    font-size:26px;line-height:1.15}
  .cita{font-style:normal;font-size:29px;line-height:1.32;text-align:center;
    color:#9A5B45;padding:${cm(0.2)}px 0;margin-bottom:${cm(0.3)}px !important;
    break-inside:avoid}
  .firma{font-style:normal;text-align:center;font-size:30px;line-height:1.36;
    color:#7E2E1B;margin-top:${cm(0.4)}px;break-inside:avoid}

  .pie{display:flex;align-items:baseline;justify-content:space-between;
    font-family:Jost,system-ui,sans-serif;font-size:10px;letter-spacing:.2em;
    color:#C0B3A3;padding-top:${cm(0.3)}px}

  /* Marcas de doblez: los dos tercios del alto. Se doblan las tres hojas juntas
     y quedan 21 × 9,9 cm, que es lo que entra en el bolsillo del saco. */
  .dob{position:absolute;left:0;width:${cm(0.35)}px;height:1px;background:#D8C9AE}
  .dob.d{left:auto;right:0}
</style></head><body><div class="hoja">
  <div class="marco"></div>
  <span class="dob" style="top:${cm(9.9)}px"></span>
  <span class="dob d" style="top:${cm(9.9)}px"></span>
  <span class="dob" style="top:${cm(19.8)}px"></span>
  <span class="dob d" style="top:${cm(19.8)}px"></span>

  ${primera ? `<div class="cab">
    ${logo ? `<img src="${logo}" alt="">` : ''}
    <p>MIS VOTOS · ANGELY &amp; KEVIN</p>
  </div>` : ''}

  <div class="txt">${cuerpo}</div>

  <div class="pie">
    <span>ANGELY &amp; KEVIN</span>
    <span>${pag} DE ${total}</span>
    <span>12 · IX · 2026</span>
  </div>
</div></body></html>`
}

// ─── Generar ───
const nav = process.env.CHROME_PATH || CHROME.find(x => existsSync(x))
if (!nav) { console.error('✗ No encontré Chrome ni Edge'); process.exit(1) }

await mkdir(SALIDA, { recursive: true })
const logo = existsSync(LOGO)
  ? `data:image/png;base64,${(await readFile(LOGO)).toString('base64')}`
  : null

const browser = await puppeteer.launch({
  executablePath: nav, headless: 'shell',
  args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--disable-lcd-text'],
})
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 1200, deviceScaleFactor: 2 })

  for (const p of PAGINAS) {
    await page.setContent(htmlPagina(p, PAGINAS.length, logo), { waitUntil: 'load', timeout: 60000 })
    await page.evaluate(() => document.fonts.ready)
    // Si el texto se sale de la hoja hay que repartirlo distinto: la caja tiene
    // alto fijo, así que un desborde no se ve en el PNG. Se avisa por consola.
    // El texto que no cabe se sale por la derecha (una columna de más) o por
    // abajo, según cómo caiga el reparto: se miran las dos.
    const sobra = await page.evaluate(() => {
      const t = document.querySelector('.txt')
      return Math.round(Math.max(0, t.scrollWidth - t.clientWidth, t.scrollHeight - t.clientHeight))
    })
    const hoja = await page.$('.hoja')
    await hoja.screenshot({ path: join(SALIDA, `votos-${p}.png`), type: 'png' })
    console.log(`  ✓ votos-${p}.png`.padEnd(24), sobra ? `⚠ SE DESBORDA ${sobra} px` : 'entra completo')
  }

  await page.setContent(htmlFlores(), { waitUntil: 'load', timeout: 60000 })
  await page.evaluate(() => document.fonts.ready)
  // Se mide dónde termina LA FIRMA contra el borde interior de la tarjeta. Ni
  // scrollHeight de .hoja —que cuenta el siete del fondo, que sobresale a
  // propósito— ni el de .txt, que con flex:1 nunca se declara desbordado.
  const sobraF = await page.evaluate(() => {
    const t = document.querySelector('.txt')
    const h = document.querySelector('.hoja').getBoundingClientRect()
    const f = document.querySelector('.firma').getBoundingClientRect()
    // Por ancho (el texto que no cabe se sale de la segunda columna) y por alto
    // (la firma empujada fuera de la tarjeta).
    return Math.round(Math.max(0, t.scrollWidth - t.clientWidth, f.bottom - h.bottom))
  })
  const caja = await page.$('.hoja')
  await caja.screenshot({ path: join(SALIDA, 'tarjeta-flores.png'), type: 'png' })
  console.log('  ✓ tarjeta-flores.png'.padEnd(24), sobraF ? `⚠ SE DESBORDA ${sobraF} px` : `${FLORES.w} × ${FLORES.h} cm`)
} finally {
  await browser.close()
}

await writeFile(join(SALIDA, 'COMO-IMPRIMIR.txt'),
`LOS VOTOS — Angely & Kevin
Para llevar en el bolsillo del saco

  ${PAGINAS.length} hojas · A4 vertical · 300 dpi

CÓMO IMPRIMIRLO

  1. Papel A4 normal. Si tienes papel un poco más grueso (120 g), mejor:
     no se transparenta y no tiembla tanto en la mano.

  2. En el diálogo de impresión:
       · Tamaño ........ A4
       · Escala ........ 100 %   (NO "ajustar a la página": encoge el texto)
       · Orientación ... vertical
       · Caras ......... UNA SOLA CARA
       · Color ......... sí, a color (el marfil y el dorado son parte de esto)
       · Márgenes ...... ninguno / mínimos

  3. Imprime las ${PAGINAS.length} hojas en orden. Compruébalo: abajo de cada una
     dice "1 DE ${PAGINAS.length}", "2 DE ${PAGINAS.length}"...

CÓMO DOBLARLO

  Pon las ${PAGINAS.length} hojas una encima de otra, en orden, y dóblalas JUNTAS en
  tres, como una carta. Las marquitas doradas de los bordes te dicen dónde
  va cada doblez.

  Queda un paquete de 21 × 9,9 cm: entra en el bolsillo interno del saco y
  se abre de un solo movimiento.

LA TARJETA DE LAS FLORES

  tarjeta-flores.png — A6 apaisada (14,8 × 10,5 cm), o sea un cuarto de A4.
  Va con el ramo que le llega en la mañana, mientras se arregla. Imprímela en
  A4 al 100 % y recórtala por el borde del color: de una hoja salen cuatro.

  No lleva el marco ni las flores de la papelería de la boda, y es a propósito:
  si llega vestida igual que todo lo demás, se lee como una pieza más. Ésta
  tiene que leerse como una carta.

SI PREFIERES NO GASTAR OTRA HOJA

  La última hoja del pliego de tarjetas de agradecimiento
  —entrega/mesas/agradecimiento/tabloide-11.png— lleva estas dos piezas
  metidas en el hueco que sobraba: los votos enteros en UNA sola pieza de
  26,5 × 22,9 cm que se dobla en cruz y queda de 13,2 × 11,4 cm, y la tarjeta
  de las flores impresa de canto arriba a la derecha.

  Es el MISMO TEXTO, sin quitar una palabra; lo único que cambia es el tamaño
  de la letra: 10,5 pt allá contra 13,3 pt aquí. Si vas a leer de pie en el
  altar, imprime éstas. Si lo que quieres es llevarlo encima por si acaso y no
  gastar papel de más, con esa hoja del pliego te alcanza.

ANTES DE GUARDARLO

  Léelo una vez en voz alta, de pie. No para aprendértelo: para saber dónde
  respirar y para que mañana la voz ya conozca el camino.

  Lo que está en letra derecha —no inclinada— es lo que puedes encontrar de
  un vistazo cuando levantes la mirada para verla. Está puesto ahí a propósito.

  Son unos 6 minutos leídos despacio. Si el padre pide menos, se puede saltar
  el párrafo que empieza con "Sé que hay gente que se pregunta" y el que
  empieza con "Nosotros nos parecemos en muchísimo", y quedan 5.
`, 'utf8')
console.log('  ✓ COMO-IMPRIMIR.txt')
console.log(`\n  En ${SALIDA}\n`)
