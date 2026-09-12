/**
 * El minuto a minuto con la música dentro, en PDF.
 *
 *   npm run minuto
 *
 * Genera entrega/dj/minuto-a-minuto-y-canciones.pdf — A4 HORIZONTAL, para que
 * en la misma línea quepan la hora, lo que pasa, la canción y quién la pone.
 * En vertical la columna de música salía de tres palabras por renglón y había
 * que leerla en diagonal.
 *
 * POR QUÉ UN SOLO PAPEL Y NO DOS
 *
 * Había dos documentos que hablaban de la misma noche sin mirarse: el minuto a
 * minuto de la wedding —horas, catering, protocolo— y la lista de canciones que
 * cerró Kevin con el DJ. El dato que faltaba no estaba en ninguno de los dos:
 * EN QUÉ LÍNEA DEL CRONOGRAMA SUENA CADA CANCIÓN. Eso es todo lo que hace este
 * PDF, y por eso la música va como una columna más de la tabla de la wedding y
 * no como un anexo al final: un anexo obliga a cruzar dos papeles a la una de
 * la mañana.
 *
 * El cronograma va copiado TAL CUAL, con sus horas y sus comentarios. Ese papel
 * ya está en manos del salón y de protocolo, y dos versiones distintas del mismo
 * cronograma el día de la boda es peor que cualquier error que pueda tener.
 *
 * La última hoja son las once canciones de las mesas, que se traen de la base:
 * las eligieron los invitados y el DJ tiene que tenerlas cargadas antes de las
 * 9:10, cuando se entregan las botellas.
 */
import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer-core'
import { mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { PROGRAMA, AVISO_PICADAS, DJ, VIOLIN } from './minuto-a-minuto.mjs'

const SALIDA = resolve('entrega/dj')
const LOGO   = resolve('src/assets/img/logo_a&K.png')
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]
const FUENTES = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap'

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ─── Datos de la base: las once de las mesas ───

async function env() {
  if (!existsSync('.env')) throw new Error('No hay .env con las credenciales de Supabase')
  const t = await readFile('.env', 'utf8')
  const g = k => (t.match(new RegExp(`^${k}=(.+)$`, 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '')
  const url = g('VITE_SUPABASE_URL')
  const key = g('SUPABASE_SERVICE_ROLE_KEY') || g('VITE_SUPABASE_ANON_KEY')
  if (!url || !key) throw new Error('Faltan VITE_SUPABASE_URL o la clave en .env')
  return { url, key }
}

const esPrincipal = m => /^\s*Mesa\s+(principal|de\s+los\s+novios)\s*$/i.test(m.nombre || '')
const ROMANOS = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
const romano = n => { let r = ''; for (const [v, l] of ROMANOS) while (n >= v) { r += l; n -= v } return r }

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do',
  'dos', 'van', 'von', 'di', 'du', 'san', 'santa', 'mac', 'mc'])
const nombreCorto = n => {
  const u = [], buf = []
  for (const w of (n || '').trim().split(/\s+/).filter(Boolean)) {
    buf.push(w)
    if (!PARTICULAS.has(w.toLowerCase())) { u.push(buf.join(' ')); buf.length = 0 }
  }
  if (buf.length) u.push(buf.join(' '))
  return u.length >= 4 ? `${u[0]} ${u[2]}` : (n || '').trim()
}

// ─── El documento ───

const BLOQUES = {
  preparativos: { rotulo: 'Preparativos', color: '#8A7866' },
  iglesia:      { rotulo: 'Iglesia · San Luis Beltrán', color: '#B08C4F' },
  recepcion:    { rotulo: 'Recepción · Casona del Prado', color: '#9A5B45' },
  horaloca:     { rotulo: 'Hora loca', color: '#7E2E1B' },
  cierre:       { rotulo: 'Cierre', color: '#6B5B4B' },
}

// El rótulo del momento y quién pone la canción van en la MISMA línea, uno a
// cada lado. En renglones separados eran dos líneas por canción y con dieciséis
// canciones eso es media hoja de más.
function pista(m) {
  return `<div class="pista ${m.suave ? 'suave' : ''}">
    <div class="enc"><b>${esc(m.momento)}</b><span class="quien">${esc(m.quien)}</span></div>
    <p>${esc(m.cancion)}${m.artista ? ` <i>· ${esc(m.artista)}</i>` : ''}</p>
    ${m.nota ? `<span class="pnota">${esc(m.nota)}</span>` : ''}
  </div>`
}

function html(mesas, arte) {
  let bloqueActual = null
  const filas = PROGRAMA.map((f, i) => {
    const cabecera = f.bloque !== bloqueActual
      ? (bloqueActual = f.bloque, `<tr class="banda"><td colspan="5" style="--c:${BLOQUES[f.bloque].color}">${esc(BLOQUES[f.bloque].rotulo)}</td></tr>`)
      : ''
    // Las ocho líneas de la mañana no llevan música y no son para el DJ, pero
    // son de la wedding y no se quitan: se aprietan.
    return cabecera + `<tr class="${f.clave ? 'clave' : ''} ${f.bloque === 'preparativos' ? 'tenue' : ''}">
      <td class="hora"><b>${esc(f.ini)}</b><span>&rarr; ${esc(f.fin)}${f.dur === '—' ? '' : ` · ${esc(f.dur)}`}</span></td>
      <td class="que">${esc(f.que)}${f.ojo ? '<em class="ojo">ojo · ver la nota del pie</em>' : ''}</td>
      <td class="mus">${f.musica.length ? f.musica.map(pista).join('') : '<span class="nada">—</span>'}</td>
      <td class="nota">${esc(f.nota)}</td>
    </tr>`
  }).join('')

  const mesasHtml = mesas.map(m => `<div class="mesa ${m.cancion ? '' : 'falta'}">
    <b>${esc(m.romano)}</b>
    <div>
      <p>${esc(m.cancion || 'SIN CANCIÓN ANOTADA')}</p>
      <span>${esc(m.nombre)} · capitán ${esc(m.capitan || '—')} · ${m.personas} personas</span>
    </div>
  </div>`).join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>
  @page{size:A4 landscape;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Jost,system-ui,sans-serif;color:#2A1D14;-webkit-print-color-adjust:exact;
    print-color-adjust:exact;-webkit-font-smoothing:antialiased}

  /* Márgenes cortos a propósito: esto se lee apoyado en una consola, no se
     encuaderna. Lo que sobra de papel no ayuda a nadie. */
  .hoja{padding:0.5cm 0.6cm 0.4cm}
  .hoja + .hoja{break-before:page}

  .top{display:flex;align-items:center;gap:0.4cm;border-bottom:2px solid #C8A96E;
    padding-bottom:4px;margin-bottom:5px}
  .top img{height:0.92cm;width:auto}
  .top h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:15pt;
    line-height:1}
  .top h1 span{display:block;font-family:Jost,sans-serif;font-size:7pt;font-weight:400;
    letter-spacing:.22em;color:#8A7866;margin-top:3px}
  .top .der{margin-left:auto;text-align:right;font-size:7.5pt;line-height:1.5;color:#6B5B4B}
  .top .der b{color:#9A5B45}

  table{width:100%;border-collapse:collapse;table-layout:fixed}
  thead th{background:#2A1D14;color:#F6EFE4;font-size:6.8pt;font-weight:500;
    letter-spacing:.18em;text-transform:uppercase;text-align:left;padding:4px 6px}
  /* El thead se repite solo en la segunda página: es lo único que hace Chrome
     por su cuenta y es justo lo que hace falta aquí. */
  thead{display:table-header-group}
  tr{break-inside:avoid}
  td{border-bottom:1px solid #EFE7DC;padding:3px 6px;vertical-align:top;font-size:7.7pt;
    line-height:1.28}
  tr.tenue td{padding:1.5px 6px;font-size:7.2pt}
  tr.tenue .hora b{font-size:9pt}

  col.c1{width:2.4cm} col.c2{width:8.6cm} col.c3{width:9.6cm} col.c4{width:7.9cm}

  /* La banda de bloque: dice dónde está pasando esto, que es lo primero que se
     busca cuando se abre el papel a mitad de la noche. */
  tr.banda td{background:var(--c);color:#fff;font-size:6.6pt;font-weight:600;
    letter-spacing:.24em;text-transform:uppercase;padding:2px 6px;border:0}

  .hora b{display:block;font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;
    font-size:10.5pt;line-height:1.05;color:#2A1D14;white-space:nowrap}
  /* El fin y la duración detrás de la hora de inicio, en el mismo renglón: el
     bloque de tres líneas era lo que marcaba el alto de casi todas las filas, y
     lo que se busca en este papel es la hora de inicio. */
  .hora span{display:block;font-size:6.6pt;color:#A2917F;white-space:nowrap;margin-top:1px}

  .que{color:#2A1D14}
  .ojo{display:block;font-style:normal;font-size:6.5pt;letter-spacing:.12em;
    text-transform:uppercase;color:#B00020;margin-top:3px}
  .nota{font-size:7pt;line-height:1.34;color:#6B5B4B}

  /* La columna que no existía en ninguno de los dos papeles */
  .mus{background:#FDF8F1}
  tr.clave .mus{background:#FBF0E2}
  .pista + .pista{margin-top:4px;padding-top:4px;border-top:1px dotted #E0CFAE}
  .enc{display:flex;align-items:baseline;gap:6px}
  .enc b{flex:1}
  .pista b{font-size:6.4pt;font-weight:600;letter-spacing:.14em;
    text-transform:uppercase;color:#B08C4F;line-height:1.2}
  .pista p{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:10.5pt;
    line-height:1.08;color:#7E2E1B;margin:1px 0 0}
  .pista p i{font-style:normal;font-weight:400;font-size:9pt;color:#9A5B45}
  .pista.suave p{font-family:Jost,sans-serif;font-size:8pt;font-weight:400;color:#8A7866}
  .quien{flex-shrink:0;font-size:6.2pt;letter-spacing:.1em;text-transform:uppercase;
    background:#fff;border:1px solid #E0CFAE;border-radius:9px;padding:0 5px;color:#8A7866;
    white-space:nowrap}
  .pnota{display:block;font-size:6.8pt;line-height:1.3;color:#6B5B4B;margin-top:2px}
  .nada{color:#D9CFC2}

  .pie{display:flex;gap:0.4cm;align-items:flex-start;margin-top:5px;font-size:6.7pt;
    line-height:1.36;color:#6B5B4B}
  .pie .av{flex:1;background:#FFF6E5;border-left:3px solid #C8A96E;padding:3px 6px}
  .pie .av b{color:#B00020}

  /* ── La hoja de las mesas ── */
  .mesas{columns:3;column-gap:0.6cm}
  .mesa{break-inside:avoid;display:flex;gap:0.3cm;align-items:baseline;
    border-bottom:1px solid #EFE7DC;padding:6px 0}
  .mesa b{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:15pt;
    color:#9A5B45;min-width:1.05cm;line-height:1}
  .mesa p{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:12pt;
    line-height:1.16;color:#2A1D14}
  .mesa span{display:block;font-size:6.8pt;letter-spacing:.06em;color:#A2917F;margin-top:2px}
  .mesa.falta p{color:#B00020}

  .cajas{display:grid;grid-template-columns:1fr 1fr;gap:0.5cm;margin-top:8px}
  .caja{border:1px solid #E0CFAE;background:#FDF8F1;padding:7px 9px}
  .caja h3{font-size:7pt;font-weight:600;letter-spacing:.22em;text-transform:uppercase;
    color:#9A5B45;margin-bottom:4px}
  .caja p{font-size:7.8pt;line-height:1.45;color:#3A2A1E}
  .caja p + p{margin-top:4px}
  .caja b{color:#7E2E1B}
</style></head><body>

<div class="hoja">
  <div class="top">
    ${arte.logo ? `<img src="${arte.logo}" alt="">` : ''}
    <h1>Minuto a minuto &amp; música<span>ANGELY &amp; KEVIN · SÁBADO 12 DE SEPTIEMBRE DE 2026</span></h1>
    <div class="der">
      <div>Iglesia <b>San Luis Beltrán</b> · 7:00 p. m.</div>
      <div>Recepción <b>Casona del Prado</b> · 8:00 p. m.</div>
      <div>Violín <b>${esc(VIOLIN.split(' · ')[0])}</b> · Música <b>${esc(DJ)}</b></div>
    </div>
  </div>

  <table>
    <colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"></colgroup>
    <thead><tr>
      <th>Hora</th><th>Qué pasa</th><th>Qué suena</th><th>Quién lo hace · nota</th>
    </tr></thead>
    <tbody>${filas}</tbody>
  </table>

  <div class="pie">
    <div class="av"><b>OJO.</b> ${esc(AVISO_PICADAS)}</div>
    <div class="av">El cronograma es el de la wedding planner, copiado tal cual. Lo añadido es la
      columna <b>«Qué suena»</b>: dice en qué línea va cada canción de la lista que cerraron los novios con el DJ.</div>
  </div>
</div>

<div class="hoja">
  <div class="top">
    ${arte.logo ? `<img src="${arte.logo}" alt="">` : ''}
    <h1>Las canciones de las mesas<span>LAS ELIGIERON LOS INVITADOS · EL DJ LAS TIENE QUE TENER CARGADAS ANTES DE LAS 9:10 P. M.</span></h1>
    <div class="der"><div><b>${mesas.length}</b> pistas</div><div>Se ponen <b>en desorden</b></div></div>
  </div>

  <div class="mesas">${mesasHtml}</div>

  <div class="cajas">
    <div class="caja">
      <h3>Cómo funciona la dinámica</h3>
      <p>A las <b>9:10 p. m.</b> se entregan las botellas a los once capitanes. La dinámica <b>la dirige el novio</b>.</p>
      <p>Desde ahí y durante toda la noche el DJ va soltando estas once pistas <b>en desorden y repartidas</b>, no seguidas. Cuando suena la suya, <b>esa mesa es la que responde</b> y su capitán la levanta.</p>
      <p>El romano grande es el número de la mesa: es el mismo que va impreso en la tarjeta de cada puesto y en el banderín del capitán.</p>
    </div>
    <div class="caja">
      <h3>Lo que no pone el DJ</h3>
      <p><b>En la iglesia toca el violín</b> — ${esc(VIOLIN)}. Son tres piezas: A Thousand Years en la entrada de la corte y del novio, la Marcha Nupcial para la novia y Perfect a la salida.</p>
      <p><b>La hora loca la traen ellos.</b> Papayera &amp; Millo «La Máscara» a las 12:00, y enseguida el Turbo Show de DJ Bendecido. Cada uno con su repertorio; el DJ les deja la pista y vuelve a entrar entre acto y acto.</p>
    </div>
  </div>
</div>

</body></html>`
}

// ─── Generar ───

async function main() {
  const nav = process.env.CHROME_PATH || CHROME.find(x => existsSync(x))
  if (!nav) throw new Error('No encontré Chrome ni Edge')

  const { url, key } = await env()
  const sb = createClient(url, key)
  const [ms, as, mem] = await Promise.all([
    sb.from('mesas').select('*').order('orden'),
    sb.from('asientos').select('mesa_id'),
    sb.from('guest_members').select('id, name'),
  ])
  for (const r of [ms, as, mem]) if (r.error) throw new Error(r.error.message)

  const nombreDe = new Map(mem.data.map(m => [m.id, m.name]))
  const cuantos = as.data.reduce((a, x) => a.set(x.mesa_id, (a.get(x.mesa_id) || 0) + 1), new Map())
  const mesas = ms.data.filter(m => !esPrincipal(m)).map(m => ({
    nombre: m.nombre,
    romano: romano(+(String(m.nombre).match(/\d+/) || [0])[0]),
    cancion: (m.notas || '').trim(),
    capitan: m.capitan_id ? nombreCorto(nombreDe.get(m.capitan_id) || '') : '',
    personas: cuantos.get(m.id) || 0,
  }))

  const arte = { logo: existsSync(LOGO) ? `data:image/png;base64,${(await readFile(LOGO)).toString('base64')}` : null }

  await mkdir(SALIDA, { recursive: true })
  const destino = join(SALIDA, 'minuto-a-minuto-y-canciones.pdf')
  const browser = await puppeteer.launch({
    executablePath: nav, headless: 'shell',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html(mesas, arte), { waitUntil: 'load', timeout: 60000 })
    await page.evaluate(() => document.fonts.ready)
    await page.pdf({ path: destino, format: 'A4', landscape: true, printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true })

    // Y las mismas hojas en PNG. No es un capricho: el PDF se imprime, pero lo
    // que de verdad viaja el día de la boda es una foto por WhatsApp al DJ y a
    // protocolo, y un PDF en un celular se abre con otra aplicación.
    await page.setViewport({ width: 1123, height: 900, deviceScaleFactor: 2 })
    const hojas = await page.$$('.hoja')
    for (let i = 0; i < hojas.length; i++) {
      await hojas[i].screenshot({ path: join(SALIDA, `minuto-${i + 1}.png`), type: 'png' })
      console.log(`  ✓ dj/minuto-${i + 1}.png`.padEnd(44), i ? 'las once de las mesas' : 'el minuto a minuto')
    }
  } finally {
    await browser.close()
  }

  const conMusica = PROGRAMA.filter(f => f.musica.length).length
  const pistas = PROGRAMA.reduce((a, f) => a + f.musica.length, 0)
  const sinCancion = mesas.filter(m => !m.cancion).length
  console.log('  ✓ dj/minuto-a-minuto-y-canciones.pdf'.padEnd(44),
    `${PROGRAMA.length} momentos · ${conMusica} con música · ${pistas} pistas + ${mesas.length} de las mesas` +
    (sinCancion ? ` · ojo: ${sinCancion} mesa(s) sin canción` : ''))
  console.log(`\n  En ${SALIDA}\n`)
}

main().catch(e => { console.error('✗', e.message); process.exitCode = 1 })
