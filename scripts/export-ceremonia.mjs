/**
 * El orden de entrada a la iglesia, para imprimir.
 *
 *   npm run ceremonia
 *
 * Genera, en entrega/ceremonia/:
 *   orden-de-entrada.png   A4 vertical a 300 dpi
 *   orden-de-entrada.txt   lo mismo en texto, para mandarlo por WhatsApp
 *
 * POR QUÉ ASÍ
 *
 * No es una tabla: es EL PASILLO. Una tabla de cuatro columnas hay que leerla,
 * y esto se mira de reojo diez minutos antes de entrar, con catorce personas
 * nerviosas preguntando «¿yo con quién voy?». Así que el papel se parece a lo
 * que va a pasar: dos filas de gente a cada lado de un pasillo, el número de
 * orden en el medio y el altar arriba. Cada uno se busca a sí mismo y ve al
 * instante quién va a su lado y quién va delante.
 *
 * Va sobre la participación impresa —el mismo blanco puro, el escudo y las
 * cuatro esquinas de acuarela— igual que el afiche de la entrada del salón:
 * es papelería de la boda, no una hoja de producción. Por eso es blanco y no
 * marfil: las esquinas son JPEG sin alfa y sobre cualquier otro fondo se vería
 * el rectángulo de cada recorte.
 *
 * Las dos piezas del violín van marcadas donde empiezan, no en una esquina:
 * quien dirige la entrada necesita saber en qué momento entra la música, y ese
 * momento es una línea del pasillo.
 */
import puppeteer from 'puppeteer-core'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ENTRADA } from './ceremonia.mjs'

const SALIDA = resolve('entrega/ceremonia')
const IMG    = resolve('src/assets/img')
const LOGO   = join(IMG, 'logo_a&K.png')
const FLORES = {
  supIzq: 'flor-sup-izq.jpg', supDer: 'flor-sup-der.jpg',
  infIzq: 'flor-inf-izq.jpg', infDer: 'flor-inf-der.jpg',
}
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]
const FUENTES = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Great+Vibes&family=Jost:wght@300;400;500&display=swap'

// 59,055 px de CSS por centímetro = 150 dpi; con deviceScaleFactor 2 el archivo
// sale a 300, que es lo que pide cualquier imprenta.
const CM = 59.055
const cm = n => +(n * CM).toFixed(1)
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const dataUri = async (ruta, tipo) => existsSync(ruta)
  ? `data:${tipo};base64,${(await readFile(ruta)).toString('base64')}`
  : null

// ─── La lámina ───

function html(arte) {
  const filas = ENTRADA.map((e, i) => {
    // La línea de debajo: lo que comparten los dos. El TIPO sólo se escribe
    // cuando dice algo —quien entra solo, y la entrada de la novia—: poner
    // «PAREJA» once veces debajo de once parejas es ruido. Una entrada sin nada
    // que compartir no lleva línea, y la fila queda más apretada, que es lo que
    // hay que hacer con once filas en un A4.
    const comun = [(!e.der || e.novia) && e.tipo !== 'Pareja' ? e.tipo : '', e.rol]
      .filter(Boolean).join(' · ')

    return `<div class="fila ${e.novia ? 'novia' : ''} ${e.der ? '' : 'sola'}">
      ${e.musica ? `<p class="musica"><i>&#9834;</i>${esc(e.musica)}</p>` : ''}
      <div class="gente">
        <div class="lado izq">
          <b>${esc(e.izq)}</b>
          ${e.rolIzq ? `<span>${esc(e.rolIzq)}</span>` : ''}
        </div>
        <div class="pasillo"><u>${i + 1}</u></div>

        ${e.der ? `<div class="lado der">
          <b>${esc(e.der)}</b>
          ${e.rolDer ? `<span>${esc(e.rolDer)}</span>` : ''}
        </div>` : ''}
      </div>
      ${comun ? `<p class="comun">${esc(comun)}</p>` : ''}
      ${e.letrero ? `<p class="letrero">&laquo;${esc(e.letrero)}&raquo;</p>` : ''}
    </div>`
  }).join('')

  const flor = (clase, src) => src ? `<img class="flor ${clase}" src="${src}" alt="">` : ''

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  .hoja{width:${cm(21)}px;height:${cm(29.7)}px;background:#fff;color:#2A1D14;
    position:relative;overflow:hidden;padding:${cm(1.25)}px ${cm(1.5)}px ${cm(1.1)}px;
    display:flex;flex-direction:column;font-family:Jost,system-ui,sans-serif;
    -webkit-font-smoothing:antialiased}

  /* Las esquinas de la participación. Van en JPEG y sin alfa, por eso la hoja
     es blanco puro: sobre otro fondo se vería el rectángulo del recorte.
     Más chicas y más claras que en el afiche, y no por gusto: aquí hay veintidós
     nombres y a tamaño de participación las acuarelas se comían «Estela Marys
     Rodríguez» y «María Fernanda De Alba». Sobre blanco puro, bajar la opacidad
     las aclara sin ensuciarlas: es el mismo truco que usa la acuarela de verdad. */
  .flor{position:absolute;width:${cm(5.4)}px;height:auto;z-index:0;opacity:.55}
  .flor.si{top:0;left:0}
  .flor.sd{top:0;right:0}
  /* Las de abajo, algo más chicas todavía: comparten borde con el pie, y el pie
     es la única línea de la hoja que hay que poder leer siempre. */
  .flor.ii{bottom:0;left:0;width:${cm(4.8)}px}
  .flor.id{bottom:0;right:0;width:${cm(4.8)}px}
  .hoja > *:not(.flor){position:relative;z-index:1}

  .cab{text-align:center;flex-shrink:0}
  .cab img{height:${cm(1.9)}px;width:auto}
  .cab h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;
    font-size:52px;letter-spacing:.06em;line-height:1.05;margin-top:${cm(0.28)}px;
    color:#2A1D14}
  .cab p{margin-top:${cm(0.2)}px}
  .cab .sub{font-size:12.5px;letter-spacing:.24em;color:#8A7866}
  .cab .rule{display:flex;align-items:center;gap:${cm(0.35)}px;
    margin:${cm(0.4)}px auto 0;width:62%}
  .cab .rule i{flex:1;height:1px;background:#E0CFAE}
  .cab .rule b{color:#B08C4F;font-size:10px}

  /* El pasillo: una línea que baja por el medio de la hoja y en la que se
     apoyan los números. No es adorno, es el eje por el que se lee. */
  .lista{flex:1;min-height:0;display:flex;flex-direction:column;
    justify-content:space-between;padding-top:${cm(0.3)}px;position:relative}
  .lista::before{content:'';position:absolute;left:50%;top:0;bottom:${cm(0.2)}px;
    width:1px;margin-left:-.5px;background:repeating-linear-gradient(
      to bottom,#E0CFAE 0,#E0CFAE 5px,transparent 5px,transparent 11px)}

  .fila{position:relative}
  .gente{display:grid;grid-template-columns:1fr ${cm(2.2)}px 1fr;align-items:center}
  .lado b{display:block;font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;
    font-size:31px;line-height:1.12;color:#2A1D14}
  .lado span{display:block;font-size:10px;letter-spacing:.2em;text-transform:uppercase;
    color:#A2917F;margin-top:3px}
  .izq{text-align:right;padding-right:${cm(0.42)}px}
  .der{text-align:left;padding-left:${cm(0.42)}px}

  /* Quien entra solo entra POR EL MEDIO, así que su fila se centra sobre el
     pasillo en vez de dejar media hoja en blanco con un guion. */
  .fila.sola .gente{grid-template-columns:1fr auto ${cm(2.2)}px 1fr}
  .fila.sola .izq{grid-column:2}
  .fila.sola .pasillo{grid-column:3}

  /* El número, sobre un disco blanco: tapa la línea del pasillo justo donde
     va, y por eso el pasillo se dibuja detrás y no encima. */
  .pasillo u{display:flex;align-items:center;justify-content:center;
    width:${cm(1.02)}px;height:${cm(1.02)}px;margin:0 auto;border-radius:50%;
    background:#fff;border:1px solid #E0CFAE;text-decoration:none;
    font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:21px;
    font-variant-numeric:lining-nums;color:#9A5B45;line-height:1}

  .comun{text-align:center;font-size:10.5px;letter-spacing:.22em;
    text-transform:uppercase;color:#B08C4F;margin-top:${cm(0.16)}px}
  .letrero{text-align:center;font-family:'Great Vibes',cursive;font-size:27px;
    color:#9A5B45;line-height:1.2;margin-top:${cm(0.06)}px}

  /* Dónde entra el violín. Va en el pasillo y no en una esquina: quien dirige
     la entrada necesita saber en qué línea empieza la música. */
  .musica{display:flex;align-items:center;justify-content:center;gap:${cm(0.3)}px;
    font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#7E2E1B;
    background:#fff;width:fit-content;margin:0 auto ${cm(0.24)}px;
    padding:${cm(0.14)}px ${cm(0.5)}px;border:1px solid #E6D8BE;border-radius:${cm(0.5)}px}
  .musica i{font-style:normal;font-size:15px;color:#B08C4F}

  /* La novia cierra: su línea pesa más que las otras diez juntas */
  .fila.novia{margin-top:${cm(0.25)}px}
  .fila.novia .lado b{font-size:39px;color:#7E2E1B}
  .fila.novia .pasillo u{background:#9A5B45;border-color:#9A5B45;color:#fff}
  .fila.novia .comun{color:#7E2E1B;font-weight:500}

  .pie{flex-shrink:0;display:flex;align-items:baseline;justify-content:space-between;
    border-top:1px solid #E6D8BE;padding-top:${cm(0.3)}px;margin-top:${cm(0.3)}px;
    font-size:10px;letter-spacing:.18em;color:#8A7866}
  .pie b{font-weight:500;color:#6B5B4B}
</style></head><body><div class="hoja">
  ${flor('si', arte.supIzq)}${flor('sd', arte.supDer)}
  ${flor('ii', arte.infIzq)}${flor('id', arte.infDer)}

  <div class="cab">
    ${arte.logo ? `<img src="${arte.logo}" alt="">` : ''}
    <h1>Orden de entrada</h1>
    <p class="sub">PARROQUIA SAN LUIS BELTRÁN &middot; BARRANQUILLA</p>
    <p class="sub">SÁBADO 12 DE SEPTIEMBRE DE 2026 &middot; 6:30 P.M.</p>
    <div class="rule"><i></i><b>&#9670;</b><i></i></div>
  </div>

  <div class="lista">${filas}</div>

  <div class="pie">
    <span><b>SE ENTRA EN ESTE ORDEN</b>, de arriba abajo</span>
    <span>ANGELY &amp; KEVIN &middot; 12 &middot; IX &middot; 2026</span>
  </div>
</div></body></html>`
}

// ─── El mismo dato en texto ───
//
// Es lo que se manda al grupo de WhatsApp. Catorce personas no van a abrir un
// PNG de cinco megas en el celular para buscar su nombre.
const texto = () => `ORDEN DE ENTRADA A LA IGLESIA — Angely & Kevin
Parroquia San Luis Beltrán · sábado 12 de septiembre de 2026 · 6:30 p.m.

Se entra en este orden. A la izquierda del pasillo ellas, a la derecha ellos.

${ENTRADA.map((e, i) => {
  const cabeza = `${String(i + 1).padStart(2, ' ')}. ${e.izq}${e.rolIzq ? ` (${e.rolIzq})` : ''}` +
    (e.der ? `  ·  ${e.der}${e.rolDer ? ` (${e.rolDer})` : ''}` : '  ·  entra solo')
  const detalle = [e.rol, e.letrero ? `letrero: «${e.letrero}»` : '']
    .filter(Boolean).map(t => `\n      ${t}`).join('')
  const mus = e.musica ? `\n      ♪ ${e.musica}` : ''
  return cabeza + detalle + mus
}).join('\n')}

La música la lleva el violín, no el DJ.
`

// ─── Generar ───

async function main() {
  const nav = process.env.CHROME_PATH || CHROME.find(x => existsSync(x))
  if (!nav) throw new Error('No encontré Chrome ni Edge')

  const arte = { logo: await dataUri(LOGO, 'image/png') }
  for (const [k, f] of Object.entries(FLORES)) arte[k] = await dataUri(join(IMG, f), 'image/jpeg')

  await mkdir(SALIDA, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: nav, headless: 'shell',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--disable-lcd-text'],
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: Math.ceil(cm(21)) + 60, height: 1400, deviceScaleFactor: 2 })
    await page.setContent(html(arte), { waitUntil: 'load', timeout: 60000 })
    await page.evaluate(() => document.fonts.ready)
    // La hoja tiene alto fijo: once filas que no quepan no se ven en el PNG, se
    // salen por abajo en silencio. Se mide la lista, que es lo que crece.
    const sobra = await page.evaluate(() => {
      const l = document.querySelector('.lista')
      return Math.round(Math.max(0, l.scrollHeight - l.clientHeight))
    })
    await (await page.$('.hoja')).screenshot({ path: join(SALIDA, 'orden-de-entrada.png'), type: 'png' })
    console.log('  ✓ orden-de-entrada.png'.padEnd(30),
      sobra ? `⚠ SE DESBORDA ${sobra} px` : `${ENTRADA.length} entradas · A4 vertical`)
  } finally {
    await browser.close()
  }

  await writeFile(join(SALIDA, 'orden-de-entrada.txt'), texto(), 'utf8')
  console.log('  ✓ orden-de-entrada.txt'.padEnd(30), 'para mandar por WhatsApp')
  console.log(`\n  En ${SALIDA}\n`)
}

main().catch(e => { console.error('✗', e.message); process.exitCode = 1 })
