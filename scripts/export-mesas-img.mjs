/**
 * Exporta el reparto de mesas como imágenes.
 *
 *   npm run mesas-img
 *
 * Genera, en entrega/mesas/:
 *   bienvenida.png             el afiche de la entrada: todas las mesas con sus
 *                              invitados, sobre la plantilla de la participación
 *   capitanes/NN_*.png         una tarjeta por capitán con su encargo
 *   00_plano-general.png       todas las mesas de un vistazo, con sus nombres
 *   hojas-de-trabajo/NN_*.png  una hoja por mesa para la wedding: nombres,
 *                              tarjeta de origen y capitán, tamaño carta
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
// El escudo y las cuatro esquinas de acuarela, recortadas de la participación.
// Ver «El afiche de bienvenida» en CLAUDE.md.
const ARTE = [
  ['logo', resolve('src/assets/img/logo_a&K.png'), 'image/png'],
  ['si',   resolve('src/assets/img/flor-sup-izq.jpg'), 'image/jpeg'],
  ['sd',   resolve('src/assets/img/flor-sup-der.jpg'), 'image/jpeg'],
  ['id',   resolve('src/assets/img/flor-inf-der.jpg'), 'image/jpeg'],
  ['ii',   resolve('src/assets/img/flor-inf-izq.jpg'), 'image/jpeg'],
]
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]

const FUENTES = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Great+Vibes&family=Jost:wght@300;400;500&display=swap'
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// La mesa de los novios no entra en NINGUNA imagen: en el afiche porque ellos
// no van a buscarse en el atril, y en las hojas porque el salón ya sabe dónde
// sientan a los novios. Sigue en la base y en el Excel —el catering los cobra,
// así que cuentan para el total—; lo que no hace falta es imprimirla.
const esPrincipal = m => /^\s*Mesa\s+(principal|de\s+los\s+novios)\s*$/i.test(m.nombre || '')
const paraImprimir = mesas => mesas.filter(m => !esPrincipal(m))
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
          <span class="nom ${p.falta ? 'falta' : ''}">${esc(p.nombre)}</span>
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
  <div class="rule"><i></i><b>&#9670;</b><i></i></div>
  <ol>${filas}</ol>
  <div class="pie"><span>Casona del Prado · Barranquilla</span><span>${cuando}</span></div>
</div></body></html>`
}

// ─── El afiche de bienvenida ───
//
// UNA sola lámina con todas las mesas, la que se pone en la entrada del salón.
// Antes era una hoja por mesa y no servía: el invitado que llega no sabe cuál
// es la suya, que es justo lo que viene a averiguar.
//
// Va sobre la participación: el mismo blanco, las mismas cuatro esquinas de
// acuarela recortadas de ella y el mismo escudo. Es el papel que ya recibieron
// en la mano, y por eso se reconoce antes de leerlo.
//
// Los nombres flojos NO salen en rojo: esta lámina la leen los invitados. Los
// rojos se miran en las hojas de trabajo.
function htmlAfiche(mesas, porMesa, arte) {
  // Proporción A4 vertical (1 : √2). El afiche se manda a imprimir a un pliego
  // con esas proporciones, así que la lámina las respeta desde el origen en vez
  // de crecer con el contenido y que el impresor la recorte o la deje con
  // franjas. Tres columnas y el alto fijo: con once mesas sobran cuatro huecos
  // y el reparto los reparte solo.
  const A4 = { w: 2200, h: Math.round(2200 * Math.SQRT2) }
  const cols = mesas.length <= 4 ? 2 : 3

  const bloques = mesas.map(m => {
    const gente = porMesa.get(m.id) || []
    const nombres = gente.length
      ? gente.map(p => `<li>${esc(p.nombre)}</li>`).join('')
      : '<li class="vacia">—</li>'
    return `<section class="m"><h2>${esc(m.nombre)}</h2><ul>${nombres}</ul></section>`
  }).join('')

  const flor = (k, cls) => arte[k] ? `<img class="fl ${cls}" src="${arte[k]}" alt="">` : ''

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>${ESTILO}
  /* Blanco puro, como la participación: las esquinas florales vienen de ella
     recortadas sobre blanco, así que cualquier otro fondo dejaría ver el
     rectángulo de cada recorte. */
  .hoja{width:${A4.w}px;height:${A4.h}px;background:#fff;padding:120px 230px 86px;position:relative;
    display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden}
  .fl{position:absolute;z-index:0}
  .fl-si{top:0;left:0;width:300px}
  .fl-sd{top:0;right:0;width:390px}
  .fl-id{bottom:0;right:0;width:350px}
  .fl-ii{bottom:0;left:0;width:425px}
  .hoja > *:not(.fl){position:relative;z-index:1}

  .crest{width:auto;height:210px;margin-bottom:44px}
  .bien{font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:92px;
    letter-spacing:.28em;text-indent:.3em;color:#2A1D14;line-height:1}
  .verso{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:34px;
    color:#8A7866;line-height:1.5;margin-top:24px}
  .rule{display:flex;align-items:center;gap:20px;margin:40px 0 12px;width:460px}
  .rule i{flex:1;height:1px;background:#D8C9AE}
  .rule b{color:#B08C4F;font-size:15px}
  .guia{font-size:15px;letter-spacing:.28em;text-transform:uppercase;color:#A2917F}

  /* El bloque de mesas ocupa lo que sobra y reparte sus filas: la lámina tiene
     alto fijo y el contenido no siempre lo llena. */
  .mesas{flex:1;width:100%;display:grid;grid-template-columns:repeat(${cols},1fr);
    gap:20px 46px;align-content:space-evenly;padding:34px 0 10px}
  .m h2{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:54px;
    color:#9A5B45;padding-bottom:12px;margin-bottom:18px;border-bottom:1.5px solid #E3D9CB}
  .m ul{list-style:none}
  .m li{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:34px;
    line-height:1.42;color:#2A1D14}
  .m li.vacia{color:#C0B3A3;font-weight:400}

  .pie{padding-top:28px;border-top:1px solid #D8C9AE;width:560px}
  .pie .ayk{font-family:'Great Vibes',cursive;font-size:58px;color:#9A5B45;line-height:1.1;
    white-space:nowrap}
  .pie .cuando{font-size:16px;letter-spacing:.22em;color:#8A7866;margin-top:16px}
</style></head><body><div class="hoja">
  ${flor('si', 'fl-si')}${flor('sd', 'fl-sd')}${flor('id', 'fl-id')}${flor('ii', 'fl-ii')}
  ${arte.logo ? `<img class="crest" src="${arte.logo}" alt="">` : ''}
  <p class="bien">BIENVENIDOS</p>
  <p class="verso">Gracias por acompañarnos en el día más importante de nuestras vidas.<br>
    Guardamos un sitio para cada uno de ustedes.</p>
  <div class="rule"><i></i><b>&#9670;</b><i></i></div>
  <p class="guia">Busca tu nombre</p>
  <div class="mesas">${bloques}</div>
  <div class="pie">
    <p class="ayk">Angely &amp; Kevin</p>
    <p class="cuando">12 DE SEPTIEMBRE DE 2026 · CASONA DEL PRADO</p>
  </div>
</div></body></html>`
}

// ─── La tarjeta del capitán ───
//
// Una por capitán, para imprimir y entregar. No es un papel de trabajo: es el
// encargo, escrito por los novios, así que va sobre la misma participación que
// el afiche —blanco, escudo, esquinas de acuarela— y el texto es de ellos.
//
// La canción de cada mesa sale de `mesas.notas`, que estaba sin usar. Si está
// vacía, la tarjeta deja el renglón en blanco para escribirla a mano: es mejor
// que inventar una o que esconder el encargo.
// Iconos de línea, uno por encargo. Dibujados aquí y no traídos de una
// librería: son seis, y el resto del proyecto también los lleva inline.
const ICONOS = {
  cinta:   '<circle cx="12" cy="8" r="6"/><path d="M8.2 13.6 7 22l5-2.8L17 22l-1.2-8.4"/>',
  baile:   '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  botella: '<path d="M10 2h4v4l2 3v13H8V9l2-3V2z"/><line x1="8" y1="13" x2="16" y2="13"/>',
  cancion: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.2"/><path d="M12 3v3M12 18v3"/>',
  brindis: '<path d="M5 3h6l-1 7a2 2 0 0 1-4 0L5 3z"/><path d="M13 3h6l-1 7a2 2 0 0 1-4 0l-1-7z"/><line x1="8" y1="12" x2="8" y2="21"/><line x1="16" y1="12" x2="16" y2="21"/><line x1="5" y1="21" x2="11" y2="21"/><line x1="13" y1="21" x2="19" y2="21"/>',
  foto:    '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="4"/>',
}
const icono = k => `<i class="ic"><svg viewBox="0 0 24 24">${ICONOS[k]}</svg></i>`

// ─── La tarjeta del capitán ───
//
// Una por capitán, para imprimir y entregar. No es un papel de trabajo: es el
// encargo, escrito por los novios, así que va sobre la misma participación que
// el afiche —blanco, escudo, esquinas de acuarela— y el texto es de ellos.
//
// Lleva icono por encargo y el nombre sobre un realce de color: la primera
// versión era un folio de texto corrido y se leía como un reglamento, que es
// justo lo contrario de lo que dice.
//
// La canción de cada mesa sale de `mesas.notas`. Si está vacía, la tarjeta deja
// el renglón rotulado para escribirla a mano: es mejor que inventar una o que
// esconder el encargo.
function htmlCapitan(mesa, capitan, arte) {
  const cancion = (mesa.notas || '').trim()

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>${ESTILO}
  .hoja{width:816px;height:1056px;padding:46px 62px 34px;background:#fff;position:relative;
    display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden}
  .fl{position:absolute;z-index:0}
  .fl-si{top:0;left:0;width:120px}
  .fl-sd{top:0;right:0;width:150px}
  .fl-id{bottom:0;right:0;width:140px}
  .fl-ii{bottom:0;left:0;width:165px}
  .hoja > *:not(.fl){position:relative;z-index:1}

  .crest{height:62px;width:auto}
  .ayk{font-family:'Great Vibes',cursive;font-size:36px;color:#9A5B45;line-height:1.1;margin-top:8px}
  /* El cargo, en una banda: es el título del papel y antes se perdía */
  .cargo{display:inline-flex;align-items:center;gap:12px;margin-top:14px;
    font-size:11px;letter-spacing:.32em;color:#B08C4F}
  .cargo i{display:block;width:44px;height:1px;background:#D8C9AE}
  .quien{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:44px;
    color:#2A1D14;margin-top:12px;line-height:1.1}
  .mesa{display:inline-block;margin-top:10px;padding:5px 18px;border-radius:999px;
    background:#FBF3E8;border:1px solid #EADFC9;
    font-size:12px;letter-spacing:.24em;color:#9A5B45}

  .intro{font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;line-height:1.55;
    color:#2A1D14;margin-top:22px;max-width:600px}
  .intro em{font-style:italic;color:#9A5B45}

  .lista-t{display:flex;align-items:center;gap:12px;width:100%;margin:20px 0 14px;
    font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#B08C4F;white-space:nowrap}
  .lista-t i{flex:1;height:1px;background:#EADFC9}

  ol{list-style:none;width:100%;text-align:left}
  ol li{display:flex;gap:14px;align-items:flex-start;margin-bottom:13px}
  .ic{flex-shrink:0;width:34px;height:34px;border-radius:50%;background:#FBF3E8;
    border:1px solid #EADFC9;display:flex;align-items:center;justify-content:center}
  .ic svg{width:17px;height:17px;fill:none;stroke:#B08C4F;stroke-width:1.6;
    stroke-linecap:round;stroke-linejoin:round}
  ol b{display:block;font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;
    font-size:17.5px;color:#2A1D14;line-height:1.3}
  ol span{display:block;font-size:12.5px;line-height:1.5;color:#6B5B4B;margin-top:3px}

  /* La canción, en su propio realce: es el único dato de la tarjeta que cambia
     de mesa a mesa y el que el capitán va a buscar. */
  .cancion{display:flex;align-items:center;gap:10px;margin:7px 0 5px;padding:9px 14px;
    background:#FBF3E8;border-left:3px solid #C8A96E;border-radius:0 8px 8px 0}
  .cancion svg{width:15px;height:15px;flex-shrink:0;fill:none;stroke:#9A5B45;stroke-width:1.6;
    stroke-linecap:round;stroke-linejoin:round}
  .cancion em{font-family:'Cormorant Garamond',Georgia,serif;font-style:normal;font-weight:600;
    font-size:18px;color:#9A5B45;letter-spacing:.01em}
  .cancion.vacia em{font-family:Jost,system-ui,sans-serif;font-weight:300;font-size:10.5px;
    letter-spacing:.14em;text-transform:uppercase;color:#C0B3A3;
    border-bottom:1px solid #D8C9AE;padding-bottom:8px;flex:1}

  .cierre{font-family:'Great Vibes',cursive;font-size:30px;color:#9A5B45;margin-top:6px}
  .pie{font-size:10.5px;letter-spacing:.18em;color:#A2917F;padding-top:12px;margin-top:8px;
    border-top:1px solid #D8C9AE;width:440px;white-space:nowrap}
</style></head><body><div class="hoja">
  ${arte.si ? `<img class="fl fl-si" src="${arte.si}" alt="">` : ''}
  ${arte.sd ? `<img class="fl fl-sd" src="${arte.sd}" alt="">` : ''}
  ${arte.id ? `<img class="fl fl-id" src="${arte.id}" alt="">` : ''}
  ${arte.ii ? `<img class="fl fl-ii" src="${arte.ii}" alt="">` : ''}
  ${arte.logo ? `<img class="crest" src="${arte.logo}" alt="">` : ''}
  <p class="ayk">Angely &amp; Kevin</p>
  <p class="cargo"><i></i>CAPITÁN DE MESA<i></i></p>
  <p class="quien">${esc(capitan)}</p>
  <p class="mesa">${esc(mesa.nombre.toUpperCase())}</p>

  <p class="intro">
    Esto es más un <em>«te conocemos y sabemos que contigo la cosa prende»</em> que una
    obligación. Por eso te elegimos como Capitán de Mesa en nuestro día. No es un cargo
    serio, es un <em>«tú eres de los que hace que la fiesta funcione»</em>.
  </p>

  <p class="lista-t"><i></i>Sin presión, con toda la confianza<i></i></p>

  <ol>
    <li>${icono('cinta')}<div>
      <b>Ponte la cinta de capitán y siéntete el jefe de la mesa.</b>
      <span>Como en el fútbol: el capitán da el ejemplo, pero también disfruta.</span>
    </div></li>
    <li>${icono('baile')}<div>
      <b>Anima a tu mesa a bailar.</b>
      <span>Cuando suene la música, tú das el primer paso. Si ves a alguien tímido, invítalo,
      jálalo a la pista, pero sin obligar: que sea por buena energía.</span>
    </div></li>
    <li>${icono('botella')}<div>
      <b>Ayuda a que las botellas circulen.</b>
      <span>Sirve, comparte, brinda. Y si al final sobra un poco… tú sabes que eso no se
      desperdicia.</span>
    </div></li>
    <li>${icono('cancion')}<div>
      <b>La canción de tu mesa.</b>
      <p class="cancion${cancion ? '' : ' vacia'}">
        <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        <em>${cancion ? esc(cancion) : 'escribe aquí la canción de la mesa'}</em>
      </p>
      <span>Cuando el DJ la suelte, nos haría mucha ilusión ver a tu mesa reaccionar como si
      fuera su himno: gritos, palmas, baile, lo que salga de forma natural.</span>
    </div></li>
    <li>${icono('brindis')}<div>
      <b>Brindis cuando digan «¡Vivan Angely y Kevin!»</b>
      <span>Copas arriba en tu mesa y un brindis rápido. Después, si hay música, a seguir
      disfrutando en la pista.</span>
    </div></li>
    <li>${icono('foto')}<div>
      <b>Si puedes, guarda una foto o un video.</b>
      <span>Nos encantaría después ver cómo tu mesa bailó, cómo te pusiste la cinta y cómo
      disfrutaron.</span>
    </div></li>
  </ol>

  <p class="cierre">¡Nos vemos en la pista!</p>
  <p class="pie">12 DE SEPTIEMBRE DE 2026 · CASONA DEL PRADO</p>
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
  // El escudo y las cuatro esquinas florales viajan como data URI: setContent no
  // tiene una URL base contra la que resolver una ruta de disco, así que un
  // file:// dentro de ese about:blank no carga. Lo que falte, se avisa y el
  // afiche sale sin ello.
  const arte = {}
  for (const [k, f, mime] of ARTE) {
    if (existsSync(f)) arte[k] = `data:${mime};base64,${(await readFile(f)).toString('base64')}`
    else console.warn('  Ojo: no encontré', f)
  }

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

    await captura(htmlPlano(paraImprimir(ms.data), porMesa, cuando), join(SALIDA, '00_plano-general.png'))
    console.log('  ✓ 00_plano-general.png')

    // El afiche es UNO solo y con todas las mesas: el invitado que llega no sabe
    // cuál es la suya. Va aparte de las hojas de trabajo, que son otro papel y
    // se mandan a imprimir por separado.
    const imprimibles = paraImprimir(ms.data)
    await captura(htmlAfiche(imprimibles, porMesa, arte), join(SALIDA, 'bienvenida.png'))
    console.log('  ✓ bienvenida.png')

    await mkdir(join(SALIDA, 'hojas-de-trabajo'), { recursive: true })
    for (const [i, m] of imprimibles.entries()) {
      const nombre = `${String(i + 1).padStart(2, '0')}_${slug(m.nombre)}.png`
      await captura(htmlMesa(m, porMesa.get(m.id), cuando), join(SALIDA, 'hojas-de-trabajo', nombre))
      console.log(`  ✓ ${nombre}`)
    }

    // Una tarjeta por capitán elegido. Las mesas sin capitán no sacan tarjeta:
    // una con el nombre en blanco no se puede entregar.
    const conCapitan = imprimibles.filter(m => m.capitan_id && nombreDe.get(m.capitan_id))
    if (conCapitan.length) {
      await mkdir(join(SALIDA, 'capitanes'), { recursive: true })
      for (const [i, m] of conCapitan.entries()) {
        const quien = nombreDe.get(m.capitan_id)
        const nombre = `${String(i + 1).padStart(2, '0')}_${slug(quien)}.png`
        await captura(htmlCapitan(m, quien, arte), join(SALIDA, 'capitanes', nombre))
        console.log(`  ✓ capitanes/${nombre}`)
      }
    } else {
      console.log('  · Sin capitanes elegidos todavía: no se generó ninguna tarjeta.')
    }
    const sinCancion = conCapitan.filter(m => !(m.notas || '').trim()).length

    const faltan = [...porMesa.values()].flat().filter(p => p.falta).length
    const sentados = [...porMesa.values()].reduce((s, g) => s + g.length, 0)
    await writeFile(join(SALIDA, 'LEEME.txt'),
`REPARTO DE MESAS — Angely & Kevin
Sábado 12 de septiembre de 2026 · Casona del Prado, Barranquilla
Generado el ${cuando}

  capitanes/NN_*.png         Una tarjeta por capitán, para imprimir y entregar:
                             su nombre, su mesa y el encargo. La canción de cada
                             mesa sale de la columna «notas» de esa mesa; si está
                             vacía, la tarjeta deja el renglón para escribirla.
  bienvenida.png             EL AFICHE DE LA ENTRADA: todas las mesas con sus
                             invitados, sobre la participación —el escudo, las
                             esquinas de acuarela y el mismo blanco—. Es la
                             lámina grande que se monta en el atril. No marca
                             nada en rojo: la leen los invitados.
  00_plano-general.png       Todas las mesas de un vistazo, para la wedding.
  hojas-de-trabajo/NN_*.png  Una hoja por mesa para la wedding y el salón:
                             los nombres y de qué tarjeta viene cada uno. Marca
                             en rojo lo que falta por arreglar.

  Mesas ...... ${imprimibles.length} (sin contar la de los novios)
  Capitanes .. ${conCapitan.length}${sinCancion ? `, ${sinCancion} sin canción anotada` : ''}
  Sentados ... ${sentados}
  Por completar ... ${faltan} nombre(s), marcados en rojo con un punto.

Los nombres en rojo no sirven para una tarjeta de mesa: son genéricos
(«Invitado 3», «Acompañante») o les falta el apellido. Se arreglan en
/admin/mesas, con doble clic sobre la ficha.
`, 'utf8')

    console.log(`\n  ${imprimibles.length + conCapitan.length + 2} imágenes en ${SALIDA}`)
    if (faltan) console.warn(`  Ojo: ${faltan} nombre(s) por completar, marcados en rojo.\n`)
    else console.log('  Todos los nombres completos.\n')
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error('\n  Falló:', e.message, '\n'); process.exit(1) })
