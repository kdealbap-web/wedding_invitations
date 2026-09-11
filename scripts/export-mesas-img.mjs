/**
 * Exporta el reparto de mesas como imágenes.
 *
 *   npm run mesas-img
 *
 * Genera, en entrega/mesas/:
 *   00_plano-general.png       todas las mesas de un vistazo, con sus nombres
 *   hojas-de-trabajo/NN_*.png  una hoja por mesa para la wedding: nombres,
 *                              tarjeta de origen y capitán, tamaño carta
 *   bienvenida/NN_*.png        la hoja decorada que se pone sobre la mesa el
 *                              día de la fiesta, con la plantilla de la
 *                              tarjeta de participación
 *
 * Se dibuja en HTML y se captura con el Chrome ya instalado, igual que las
 * cartelas de las LED: así comparte tipografías y paleta con el resto de la
 * boda en vez de inventar un estilo nuevo.
 *
 * Los nombres que no sirven para una tarjeta de mesa —«Invitado 3»,
 * «Acompañante», o los que van sin apellido— salen marcados en rojo. La idea es
 * imprimir esto, ver los rojos y arreglarlos en /admin/mesas.
 */
import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer-core'
import { mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { nombreIncompleto } from '../src/admin/nombres.js'

const SALIDA = resolve('entrega/mesas')
const LOGO   = resolve('src/assets/img/logo_a&K.png')
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]

const FUENTES = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Great+Vibes&family=Jost:wght@300;400;500&display=swap'
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const slug = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function env() {
  if (!existsSync('.env')) throw new Error('No hay .env con las credenciales de Supabase')
  const t = await readFile('.env', 'utf8')
  const g = k => (t.match(new RegExp(`^${k}=(.+)$`, 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '')
  const url = g('VITE_SUPABASE_URL')
  const key = g('SUPABASE_SERVICE_ROLE_KEY') || g('VITE_SUPABASE_ANON_KEY')
  if (!url || !key) throw new Error('Faltan VITE_SUPABASE_URL o la clave en .env')
  return { url, key }
}

const ESTILO = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#fff;color:#2A1D14;font-family:'Jost',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  .falta{color:#B00020}
  .falta::after{content:' ●';font-size:.6em;vertical-align:middle}
`

// ─── Plano general ───
function htmlPlano(mesas, porMesa, cuando) {
  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(mesas.length))))
  const tarjetas = mesas.map(m => {
    const gente = porMesa.get(m.id) || []
    const filas = gente.length
      ? gente.map(p => `<li class="${p.falta ? 'falta' : ''}">${esc(p.nombre)}</li>`).join('')
      : '<li class="vacia">— sin asignar —</li>'
    const lleno = gente.length >= m.capacidad
    return `
      <article class="mesa ${lleno ? 'llena' : ''}">
        <header>
          <h2>${esc(m.nombre)}</h2>
          <span>${gente.length}/${m.capacidad}</span>
        </header>
        <ol>${filas}</ol>
      </article>`
  }).join('')

  const total = [...porMesa.values()].reduce((s, g) => s + g.length, 0)
  const faltan = [...porMesa.values()].flat().filter(p => p.falta).length

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>${ESTILO}
  .hoja{width:1600px;padding:56px 56px 64px}
  .top{display:flex;align-items:flex-end;justify-content:space-between;
    border-bottom:2px solid #C8A96E;padding-bottom:18px;margin-bottom:32px}
  h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:44px;letter-spacing:-.01em}
  .top .sub{font-size:13px;color:#8A7866;letter-spacing:.14em;text-transform:uppercase}
  .top .meta{text-align:right;font-size:13px;color:#8A7866;line-height:1.8}
  .top .meta b{color:#2A1D14;font-weight:500}
  .grid{display:grid;grid-template-columns:repeat(${cols},1fr);gap:20px}
  .mesa{border:1px solid #E3D9CB;border-radius:10px;padding:16px 18px;break-inside:avoid}
  .mesa.llena{border-color:#C8A96E}
  .mesa header{display:flex;align-items:baseline;justify-content:space-between;
    border-bottom:1px solid #EFE7DC;padding-bottom:8px;margin-bottom:10px}
  .mesa h2{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:22px}
  .mesa header span{font-size:12px;color:#8A7866;font-variant-numeric:tabular-nums}
  .mesa ol{list-style:none;counter-reset:n}
  .mesa li{counter-increment:n;font-size:14.5px;line-height:1.95;padding-left:22px;position:relative}
  .mesa li::before{content:counter(n);position:absolute;left:0;color:#C0B3A3;font-size:11px;top:4px}
  .mesa li.vacia{color:#B9AC9C;font-style:italic;padding-left:0}
  .mesa li.vacia::before{content:''}
  .pie{margin-top:30px;padding-top:14px;border-top:1px solid #EFE7DC;
    font-size:12px;color:#8A7866;display:flex;justify-content:space-between}
  .pie .rojo{color:#B00020}
</style></head><body><div class="hoja">
  <div class="top">
    <div>
      <p class="sub">Reparto de mesas</p>
      <h1>Angely &amp; Kevin</h1>
    </div>
    <div class="meta">
      <div><b>${mesas.length}</b> mesas · <b>${total}</b> personas sentadas</div>
      <div>12 de septiembre de 2026 · Casona del Prado</div>
      <div>Generado el ${cuando}</div>
    </div>
  </div>
  <div class="grid">${tarjetas}</div>
  <div class="pie">
    <span>${faltan ? `<span class="rojo">● ${faltan} nombre(s) por completar</span>` : 'Todos los nombres completos'}</span>
    <span>Angely &amp; Kevin · #AyKBoda</span>
  </div>
</div></body></html>`
}

// ─── Hoja individual, tamaño carta ───
function htmlMesa(mesa, gente, cuando) {
  const filas = gente.length
    ? gente.map((p, i) => `
        <li>
          <span class="n">${i + 1}</span>
          <span class="nom ${p.falta ? 'falta' : ''}">${esc(p.nombre)}${p.manda ? '<b class="cap-m">CAPITÁN</b>' : ''}</span>
          <span class="tar">${esc(p.tarjeta)}</span>
        </li>`).join('')
    : '<li class="vacia">Esta mesa todavía no tiene a nadie asignado.</li>'

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>${ESTILO}
  .hoja{width:816px;min-height:1056px;padding:84px 76px;display:flex;flex-direction:column}
  .sub{font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:#8A7866;text-align:center}
  h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:64px;
    text-align:center;margin:10px 0 6px;letter-spacing:-.02em}
  .cap{text-align:center;font-size:13px;color:#8A7866;letter-spacing:.1em}
  .capitan{text-align:center;font-size:12px;color:#C8A96E;letter-spacing:.14em;margin-top:6px}
  .cap-m{font-family:Jost,system-ui,sans-serif;font-size:10px;font-weight:400;
    color:#C8A96E;letter-spacing:.12em;margin-left:10px;vertical-align:middle}
  .rule{display:flex;align-items:center;gap:14px;margin:30px 0 26px}
  .rule i{flex:1;height:1px;background:#E3D9CB}
  .rule b{color:#C8A96E;font-size:12px}
  ol{list-style:none;flex:1}
  li{display:flex;align-items:baseline;gap:14px;padding:11px 0;border-bottom:1px solid #F2EBE1}
  li .n{width:24px;color:#C0B3A3;font-size:12px;font-variant-numeric:tabular-nums;flex-shrink:0}
  li .nom{font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;font-weight:400;flex:1}
  li .tar{font-size:11.5px;color:#A2917F;text-align:right;max-width:38%}
  li.vacia{color:#B9AC9C;font-style:italic;border:none;justify-content:center;padding:40px 0}
  .pie{margin-top:26px;padding-top:14px;border-top:1px solid #E3D9CB;
    display:flex;justify-content:space-between;font-size:11px;color:#A2917F}
</style></head><body><div class="hoja">
  <p class="sub">Angely &amp; Kevin · 12 · IX · 2026</p>
  <h1>${esc(mesa.nombre)}</h1>
  <p class="cap">${gente.length} de ${mesa.capacidad} puestos</p>
  ${gente.find(p => p.manda) ? `<p class="capitan">CAPITÁN DE MESA · ${esc(gente.find(p => p.manda).nombre.toUpperCase())}</p>` : ''}
  <div class="rule"><i></i><b>&#9670;</b><i></i></div>
  <ol>${filas}</ol>
  <div class="pie"><span>Casona del Prado · Barranquilla</span><span>${cuando}</span></div>
</div></body></html>`
}

// ─── Hoja de bienvenida, una por mesa ───
//
// La que se pone SOBRE la mesa el día de la fiesta. Va sobre la plantilla de la
// tarjeta de participación —marfil, filete interior doble, el escudo, Cormorant
// y Great Vibes— porque es el mismo papel que los invitados ya recibieron.
//
// Aquí los nombres flojos NO salen en rojo: esta hoja la leen ellos. Los rojos
// se miran en la hoja de trabajo, que es la que revisa la wedding.
function htmlBienvenida(mesa, gente, logo) {
  const nombres = gente.length
    ? gente.map(p => `<li>${esc(p.nombre)}${p.manda ? '<i title="Capitán de mesa">&#9733;</i>' : ''}</li>`).join('')
    : '<li class="vacia">Esta mesa todavía no tiene invitados asignados.</li>'
  const apretada = gente.length > 8

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>${ESTILO}
  /* La paleta clara de tarjeta.css. Va en hex y no en oklch() para no depender
     de la versión del Chrome que capture. */
  .hoja{width:816px;height:1056px;padding:92px 76px 64px;background:#FBF5EA;
    display:flex;flex-direction:column;align-items:center;text-align:center;position:relative}
  /* Filete interior doble: el marco clásico de las participaciones */
  .hoja::before{content:'';position:absolute;inset:30px;border:1.5px solid #D8C9AE}
  .hoja::after{content:'';position:absolute;inset:38px;border:.8px solid rgba(176,140,79,.45)}
  .crest{height:104px;width:auto;margin-bottom:34px}
  .bien{font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;font-size:38px;
    letter-spacing:.3em;text-indent:.3em;color:#2A1D14}
  .verso{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:19px;
    color:#8A7866;line-height:1.5;margin-top:14px}
  .rule{display:flex;align-items:center;gap:14px;margin:34px 0 30px;width:70%}
  .rule i{flex:1;height:1px;background:#D8C9AE}
  .rule b{color:#B08C4F;font-size:11px}
  h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:54px;
    letter-spacing:-.01em;color:#2A1D14}
  ol{list-style:none;margin-top:26px;flex:1}
  ol li{font-family:'Cormorant Garamond',Georgia,serif;font-size:${apretada ? 23 : 25}px;
    line-height:${apretada ? 1.42 : 1.56};color:#2A1D14}
  ol li i{color:#B08C4F;font-size:.6em;font-style:normal;vertical-align:middle;margin-left:8px}
  ol li.vacia{color:#C0B3A3;font-style:italic;font-size:21px}
  .nota{font-size:10px;color:#C0B3A3;letter-spacing:.1em;margin-bottom:10px}
  /* Ancha para que «Angely & Kevin» quepa en un renglón: partida en dos deja
     de leerse como una firma. */
  .firma{border-top:1px solid #D8C9AE;padding-top:20px;width:300px}
  .firma .ayk{font-family:'Great Vibes',cursive;font-size:38px;color:#9A5B45;
    line-height:1.1;white-space:nowrap}
  .firma .cuando{font-size:11px;letter-spacing:.2em;color:#8A7866;margin-top:10px;white-space:nowrap}
</style></head><body><div class="hoja">
  ${logo ? `<img class="crest" src="${logo}" alt="">` : ''}
  <p class="bien">BIENVENIDOS</p>
  <p class="verso">Gracias por acompañarnos en el día<br>más importante de nuestras vidas</p>
  <div class="rule"><i></i><b>&#9670;</b><i></i></div>
  <h1>${esc(mesa.nombre)}</h1>
  <ol>${nombres}</ol>
  ${gente.some(p => p.manda) ? '<p class="nota">&#9733;&nbsp; capitán de mesa</p>' : ''}
  <div class="firma">
    <p class="ayk">Angely &amp; Kevin</p>
    <p class="cuando">12 · IX · 2026</p>
  </div>
</div></body></html>`
}

async function main() {
  const nav = process.env.CHROME_PATH || CHROME.find(p => existsSync(p))
  if (!nav) throw new Error('No encontré Chrome ni Edge')

  const { url, key } = await env()
  const sb = createClient(url, key)
  const [ms, as, mem, gs] = await Promise.all([
    sb.from('mesas').select('*').order('orden'),
    sb.from('asientos').select('*'),
    sb.from('guest_members').select('id, name'),
    sb.from('guest_summary').select('id, group_name'),
  ])
  for (const r of [ms, as, mem, gs]) if (r.error) throw new Error(r.error.message)
  if (!ms.data.length) throw new Error('No hay mesas creadas todavía')

  const nombreDe = new Map(mem.data.map(m => [m.id, m.name]))
  const grupoDe = new Map(gs.data.map(g => [g.id, g.group_name]))

  const porMesa = new Map()
  for (const m of ms.data) {
    const gente = as.data
      .filter(a => a.mesa_id === m.id)
      .map(a => {
        const nombre = a.member_id ? (nombreDe.get(a.member_id) || '') : (a.etiqueta || 'Sin nombre')
        return {
          nombre,
          tarjeta: grupoDe.get(a.guest_id) || '',
          falta: !a.member_id || !!nombreIncompleto(nombre),
          // Quien manda en la mesa esa noche. Una «plaza sin nombre» no puede
          // serlo: no hay a quién avisarle.
          manda: !!a.member_id && a.member_id === m.capitan_id,
        }
      })
      .sort((x, y) => x.tarjeta.localeCompare(y.tarjeta, 'es') || x.nombre.localeCompare(y.nombre, 'es'))
    porMesa.set(m.id, gente)
  }

  // Carpeta limpia: si se renombra una mesa, no queda el PNG viejo
  if (existsSync(SALIDA)) {
    for (const f of await readdir(SALIDA)) await rm(join(SALIDA, f), { force: true, recursive: true })
  }
  await mkdir(SALIDA, { recursive: true })

  const cuando = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  // El escudo viaja como data URI: setContent no tiene una URL base contra la
  // que resolver una ruta de disco, así que un file:// dentro de ese about:blank
  // no carga. Si falta el archivo, la hoja sale sin él y se avisa.
  let logo = null
  if (existsSync(LOGO)) logo = `data:image/png;base64,${(await readFile(LOGO)).toString('base64')}`
  else console.warn('  Ojo: no encontré el escudo en', LOGO)

  const browser = await puppeteer.launch({
    executablePath: nav, headless: 'shell',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--disable-lcd-text'],
  })

  try {
    const page = await browser.newPage()
    // deviceScaleFactor 2: al imprimir en papel, 1x se ve pixelado
    await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 2 })

    const captura = async (html, destino) => {
      await page.setContent(html, { waitUntil: 'load', timeout: 60000 })
      await page.evaluate(() => document.fonts.ready)
      const caja = await page.$('.hoja')
      await caja.screenshot({ path: destino, type: 'png' })
    }

    await captura(htmlPlano(ms.data, porMesa, cuando), join(SALIDA, '00_plano-general.png'))
    console.log('  ✓ 00_plano-general.png')

    // Dos juegos en dos carpetas: se mandan a imprimir por separado y en
    // papeles distintos. Mezclados en la raíz había que ir eligiendo archivo
    // por archivo cuál era cuál.
    await mkdir(join(SALIDA, 'hojas-de-trabajo'), { recursive: true })
    await mkdir(join(SALIDA, 'bienvenida'), { recursive: true })
    for (const [i, m] of ms.data.entries()) {
      const nombre = `${String(i + 1).padStart(2, '0')}_${slug(m.nombre)}.png`
      await captura(htmlMesa(m, porMesa.get(m.id), cuando), join(SALIDA, 'hojas-de-trabajo', nombre))
      await captura(htmlBienvenida(m, porMesa.get(m.id), logo), join(SALIDA, 'bienvenida', nombre))
      console.log(`  ✓ ${nombre}`)
    }

    const faltan = [...porMesa.values()].flat().filter(p => p.falta).length
    const sentados = [...porMesa.values()].reduce((s, g) => s + g.length, 0)
    await writeFile(join(SALIDA, 'LEEME.txt'),
`REPARTO DE MESAS — Angely & Kevin
Sábado 12 de septiembre de 2026 · Casona del Prado, Barranquilla
Generado el ${cuando}

  00_plano-general.png       Todas las mesas de un vistazo.
  hojas-de-trabajo/NN_*.png  Una hoja por mesa para la wedding y el salón:
                             nombres, de qué tarjeta viene cada uno y el
                             capitán. Marca en rojo lo que falta por arreglar.
  bienvenida/NN_*.png        La que se pone SOBRE la mesa el día de la fiesta:
                             el escudo, BIENVENIDOS y los nombres, sobre la
                             misma plantilla de la participación. Ésta no marca
                             nada en rojo — la leen los invitados.

  Mesas ...... ${ms.data.length}
  Sentados ... ${sentados}
  Por completar ... ${faltan} nombre(s), marcados en rojo con un punto.

Los nombres en rojo no sirven para una tarjeta de mesa: son genéricos
(«Invitado 3», «Acompañante») o les falta el apellido. Se arreglan en
/admin/mesas, con doble clic sobre la ficha.
`, 'utf8')

    console.log(`\n  ${ms.data.length * 2 + 1} imágenes en ${SALIDA}`)
    if (faltan) console.warn(`  Ojo: ${faltan} nombre(s) por completar, marcados en rojo.\n`)
    else console.log('  Todos los nombres completos.\n')
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error('\n  Falló:', e.message, '\n'); process.exit(1) })
