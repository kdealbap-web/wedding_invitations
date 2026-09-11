/**
 * Exporta el reparto de mesas como imágenes.
 *
 *   npm run mesas-img
 *
 * Genera, en entrega/mesas/:
 *   bienvenida.png             el afiche de la entrada: todas las mesas con sus
 *                              invitados, sobre la plantilla de la participación
 *   bienvenida-pendon-75x175.png   el mismo, en pendón de 75 × 175 cm
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
// Los dos formatos del afiche. Las medidas van en px de CSS y se capturan al
// doble, así que el archivo sale al doble de estos números.
//
//   a4      · pliego A4 vertical (1 : √2), tres columnas. El de mano y atril.
//   pendon  · 75 × 175 cm a 150 dpi, dos columnas. El roll-up de la entrada.
//
// Por qué cambia el número de columnas: en el pendón manda el alto —seis filas
// de hasta ocho nombres— y en la A4 manda el ancho. Con tres columnas en el
// pendón los nombres no caben de ancho; con dos en la A4 no caben de alto.
const FORMATOS = {
  a4: {
    archivo: 'bienvenida.png', cols: 3,
    w: 2200, h: Math.round(2200 * Math.SQRT2),
    pad: '120px 230px 86px', margen: 230,
    logo: 175, bien: 92, verso: 30, guia: 15,
    titulo: 62, nombre: 44, nombreLargo: 36, linea: 1.3, largoDesde: 26,
    hueco: '16px 46px', firma: 58, pieAncho: 560,
    flores: [300, 390, 350, 425],
    medida: 'A4 vertical · 21 × 29,7 cm',
  },
  pendon: {
    // 75 cm a 150 dpi son 4429 px; se capturan al doble de 2214,5 px de CSS.
    archivo: 'bienvenida-pendon-75x175.png', cols: 2,
    w: 2214.5, h: 5167,
    pad: '190px', margen: 190,   // 6,4 cm parejos por los cuatro lados
    logo: 280, bien: 132, verso: 44, guia: 22,
    titulo: 78, nombre: 50, nombreLargo: 40, linea: 1.3, largoDesde: 30,
    hueco: '26px 70px', firma: 84, pieAncho: 900,
    flores: [400, 520, 470, 560],
    medida: '75 × 175 cm a 150 dpi · roll-up',
  },
}

function htmlAfiche(mesas, porMesa, arte, F) {
  const bloques = mesas.map(m => {
    const gente = porMesa.get(m.id) || []
    const nombres = gente.length
      // Un nombre muy largo partido en dos renglones descuadra la columna y se
      // lee peor que el mismo nombre un punto más chico. Sólo hay uno o dos así.
      ? gente.map(p => `<li${p.nombre.length > F.largoDesde ? ' class="largo"' : ''}>${esc(p.nombre)}</li>`).join('')
      : '<li class="vacia">—</li>'
    return `<section class="m"><h2>${esc(m.nombre)}</h2><ul>${nombres}</ul></section>`
  }).join('')

  const flor = (k, cls, i) => arte[k]
    ? `<img class="fl ${cls}" style="width:${F.flores[i]}px" src="${arte[k]}" alt="">` : ''

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>${ESTILO}
  /* Blanco puro, como la participación: las esquinas florales vienen de ella
     recortadas sobre blanco, así que cualquier otro fondo dejaría ver el
     rectángulo de cada recorte. */
  .hoja{width:${F.w}px;height:${F.h}px;background:#fff;padding:${F.pad};position:relative;
    display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden}
  .fl{position:absolute;z-index:0}
  .fl-si{top:0;left:0}
  .fl-sd{top:0;right:0}
  .fl-id{bottom:0;right:0}
  .fl-ii{bottom:0;left:0}
  .hoja > *:not(.fl){position:relative;z-index:1}

  .crest{width:auto;height:${F.logo}px;margin-bottom:${Math.round(F.logo * 0.2)}px}
  .bien{font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:${F.bien}px;
    letter-spacing:.28em;text-indent:.28em;color:#2A1D14;line-height:1}
  .verso{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:${F.verso}px;
    color:#8A7866;line-height:1.45;margin-top:20px}
  .rule{display:flex;align-items:center;gap:20px;margin:30px 0 10px;width:${F.pieAncho * 0.82}px}
  .rule i{flex:1;height:1px;background:#D8C9AE}
  .rule b{color:#B08C4F;font-size:${Math.round(F.guia)}px}
  .guia{font-size:${F.guia}px;letter-spacing:.28em;text-transform:uppercase;color:#A2917F}

  /* El bloque de mesas ocupa lo que sobra y reparte sus filas: la lámina tiene
     alto fijo y el contenido no siempre lo llena. */
  .mesas{flex:1;width:100%;display:grid;grid-template-columns:repeat(${F.cols},1fr);
    gap:${F.hueco};align-content:space-evenly;padding:26px 0 8px}
  .m h2{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:${F.titulo}px;
    color:#9A5B45;padding-bottom:12px;margin-bottom:16px;border-bottom:2px solid #E3D9CB}
  .m ul{list-style:none}
  .m li{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:${F.nombre}px;
    line-height:${F.linea};color:#2A1D14}
  .m li.largo{font-size:${F.nombreLargo}px;line-height:${(F.linea * F.nombre / F.nombreLargo).toFixed(2)}}
  .m li.vacia{color:#C0B3A3;font-weight:400}

  .pie{padding-top:28px;border-top:1px solid #D8C9AE;width:${F.pieAncho}px}
  .pie .ayk{font-family:'Great Vibes',cursive;font-size:${F.firma}px;color:#9A5B45;line-height:1.1;
    white-space:nowrap}
  .pie .cuando{font-size:${Math.round(F.guia * 1.05)}px;letter-spacing:.22em;color:#8A7866;margin-top:16px}
</style></head><body><div class="hoja">
  ${flor('si', 'fl-si', 0)}${flor('sd', 'fl-sd', 1)}${flor('id', 'fl-id', 2)}${flor('ii', 'fl-ii', 3)}
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


// ─── El nombre, corto ───
//
// En las piezas que se entregan en mano se usa PRIMER NOMBRE + PRIMER APELLIDO:
// «Fredy Alfonso De Alba Castro» es como lo escribe la base, no como se le
// habla. Sólo se acorta cuando hay cuatro unidades o más —dos nombres y dos
// apellidos—; con tres no se puede saber si es «nombre + dos apellidos» o «dos
// nombres + un apellido», y adivinar mal es peor que dejarlo largo.
//
// Las partículas van pegadas a lo que siguen, o «De Alba» se partiría en dos.
//
// NO se usa en el afiche ni en las hojas de trabajo, y es a propósito: ahí el
// nombre sirve para que alguien se encuentre entre 84. Acortado, «Fredy Alfonso
// De Alba Castro» pasa a «Fredy De Alba», que es OTRO invitado de la Mesa 6.
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do',
  'dos', 'van', 'von', 'di', 'du', 'san', 'santa', 'mac', 'mc'])

function unidadesDe(nombre) {
  const u = [], buf = []
  for (const w of (nombre || '').trim().split(/\s+/).filter(Boolean)) {
    buf.push(w)
    if (!PARTICULAS.has(w.toLowerCase())) { u.push(buf.join(' ')); buf.length = 0 }
  }
  if (buf.length) u.push(buf.join(' '))
  return u
}

const nombreCorto = n => {
  const u = unidadesDe(n)
  return u.length >= 4 ? `${u[0]} ${u[2]}` : (n || '').trim()
}

// ─── El banderín del capitán ───
//
// Cuelga del cuello, así que no es una hoja: es una tira de 9 × 20 cm con los
// primeros 4 cm de doblez y la punta abajo. El área de diseño son 9 × 16 cm.
//
//   px de CSS = cm × CM, y se captura al doble → 300 dpi en el archivo.
//
// Nada de flores y nada de letra chica: esto se lee de lejos, de noche y con la
// fiesta encima. Todo en mayúscula, sobre el terracota de la boda con confeti
// dorado. El texto es el que escribieron los novios.
const CM = 59.055            // px de CSS por centímetro, a 150; al doble = 300 dpi
const cm = n => +(n * CM).toFixed(1)

const BANDERIN = { w: 9, h: 20, doblez: 4, punta: 4.5 }

// Confeti repetible: el mismo nombre de mesa da siempre el mismo reparto, así
// que regenerar no cambia lo que ya se mandó a imprimir.
function confeti(semilla, n, W, H) {
  let x = 0
  for (let i = 0; i < semilla.length; i++) x = (x * 31 + semilla.charCodeAt(i)) >>> 0
  const azar = () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296)
  const piezas = []
  for (let i = 0; i < n; i++) {
    const w = 4 + azar() * 7
    piezas.push(`<i style="left:${(azar() * W).toFixed(1)}px;top:${(azar() * H).toFixed(1)}px;
      width:${w.toFixed(1)}px;height:${(w * (0.3 + azar() * 0.5)).toFixed(1)}px;
      transform:rotate(${(azar() * 180).toFixed(0)}deg);opacity:${(0.18 + azar() * 0.4).toFixed(2)}"></i>`)
  }
  return piezas.join('')
}

function htmlBanderin(mesa, nombreLargo, arte) {
  const B = BANDERIN
  const capitan = nombreCorto(nombreLargo)
  const cancion = (mesa.notas || '').trim()
  const numero = (mesa.nombre || '').replace(/^\s*mesa\s*/i, '').trim()
  // La punta empieza aquí; el clip-path la recorta desde este alto.
  const hastaPunta = ((B.h - B.punta) / B.h * 100).toFixed(2)

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>${ESTILO}
  .hoja{width:${cm(B.w)}px;height:${cm(B.h)}px;position:relative;background:#fff}
  /* El banderín: terracota de la boda, con la punta recortada abajo. Fuera de
     la figura queda blanco, que es por donde corta el impresor. */
  .ban{position:absolute;inset:0;color:#FFF3E4;text-align:center;
    background:linear-gradient(163deg,#7E2E1B 0%,#A8442A 48%,#8B3620 100%);
    clip-path:polygon(0 0,100% 0,100% ${hastaPunta}%,50% 100%,0 ${hastaPunta}%);
    display:flex;flex-direction:column;align-items:center;overflow:hidden}
  /* Confeti dorado: el fondo fiestero, sin flores */
  .conf{position:absolute;inset:0;pointer-events:none}
  .conf i{position:absolute;display:block;background:#F2D79B;border-radius:1px}
  .ban > *:not(.conf){position:relative;z-index:1;width:100%}

  /* Los 4 cm que se doblan sobre el cuello: van detrás, así que sólo el sello */
  .doblez{height:${cm(B.doblez)}px;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:6px;
    border-bottom:2px dashed rgba(255,243,228,.38)}
  .doblez img{height:${cm(1.5)}px;width:auto;filter:brightness(1.45) saturate(.6)}
  .doblez span{font-size:11px;letter-spacing:.3em;color:rgba(255,243,228,.5)}

  .cuerpo{flex:1;display:flex;flex-direction:column;align-items:center;
    padding:${cm(0.55)}px ${cm(0.62)}px 0}
  .quien{margin-top:${cm(0.5)}px}
  .quien small{display:block;font-size:17px;font-weight:400;letter-spacing:.3em;color:#F2D79B}
  .quien b{display:block;font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;
    font-size:${capitan.length > 18 ? 34 : 40}px;letter-spacing:.02em;line-height:1.12;margin-top:5px}

  .cargo{font-size:16px;letter-spacing:.26em;color:rgba(255,243,228,.85);margin-top:${cm(0.42)}px}
  /* «MESA» y el número en el mismo renglón: el número manda y la palabra lo
     acompaña, que es como se lee de lejos. */
  .num{display:flex;align-items:baseline;justify-content:center;gap:10px;margin-top:4px}
  .num small{font-family:Jost,system-ui,sans-serif;font-size:22px;font-weight:400;
    letter-spacing:.24em;color:#F2D79B}
  .num span{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;
    font-size:${cm(1.45)}px;line-height:.9;color:#FFF3E4}

  .por{font-size:18.5px;font-weight:300;line-height:1.45;letter-spacing:.04em;
    margin-top:${cm(0.46)}px;color:rgba(255,243,228,.94)}
  .lema{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:35px;
    letter-spacing:.04em;color:#F2D79B;margin-top:${cm(0.34)}px;line-height:1.12}

  .der{margin-top:${cm(0.42)}px;display:flex;flex-direction:column;gap:${cm(0.28)}px;width:100%}
  .der p{font-size:18px;font-weight:400;line-height:1.4;letter-spacing:.05em;
    padding:${cm(0.24)}px ${cm(0.2)}px;border:1px solid rgba(242,215,155,.45);border-radius:6px;
    background:rgba(255,243,228,.07)}
  .der b{display:block;font-size:13.5px;letter-spacing:.24em;color:#F2D79B;margin-bottom:5px}

  .cancion{margin-top:${cm(0.42)}px;width:100%}
  .cancion b{display:block;font-size:13.5px;letter-spacing:.24em;color:#F2D79B;margin-bottom:5px}
  .cancion span{display:block;font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;
    font-size:${cancion.length > 26 ? 23 : 28}px;line-height:1.2;color:#FFF3E4}
  .cancion.vacia span{border-bottom:1px solid rgba(242,215,155,.5);min-height:26px}

  /* La firma baja hasta donde empieza la punta: con más aire, el triángulo
     quedaba vacío y el banderín se veía cortado a la mitad. */
  .firma{margin-top:auto;padding-bottom:${cm(B.punta * 0.62)}px}
  .firma i{display:block;width:${cm(2.2)}px;height:1px;background:rgba(242,215,155,.5);
    margin:0 auto ${cm(0.26)}px}
  .firma span{font-size:13px;letter-spacing:.24em;color:rgba(255,243,228,.72)}
  /* Un rombo dentro de la punta, para que el triángulo no quede mudo */
  .firma u{display:block;width:11px;height:11px;background:#F2D79B;opacity:.75;
    transform:rotate(45deg);margin:${cm(0.75)}px auto 0}
</style></head><body><div class="hoja"><div class="ban">
  <div class="conf">${confeti(mesa.nombre + capitan, 46, cm(B.w), cm(B.h))}</div>

  <div class="doblez">
    ${arte.logo ? `<img src="${arte.logo}" alt="">` : ''}
    <span>A &amp; K</span>
  </div>

  <div class="cuerpo">
    <p class="quien"><small>QUERIDO</small><b>${esc(capitan.toUpperCase())}</b></p>
    <p class="cargo">ERES EL CAPITÁN DE LA</p>
    <p class="num"><small>MESA</small><span>${esc(numero.toUpperCase())}</span></p>

    <p class="por">FUISTE ELEGIDO POR TU HISTORIAL DE SIEMPRE ANIMAR A LAS PERSONAS DE TU ALREDEDOR</p>
    <p class="lema">HAZ LO TUYO<br>Y COMANDA</p>

    <div class="der">
      <p><b>TIENES DERECHO A</b>QUE NO QUEDE UN VASO VACÍO EN LA MESA</p>
      <p><b>Y EL DEBER DE</b>QUE ESTA SEA LA MESA MÁS ANIMADA, POR ESCÁNDALO</p>
    </div>

    <div class="cancion${cancion ? '' : ' vacia'}">
      <b>LA CANCIÓN DE TU MESA</b>
      <span>${cancion ? esc(cancion.toUpperCase()) : ''}</span>
    </div>

    <div class="firma"><i></i><span>ANGELY &amp; KEVIN · 12 · IX · 2026</span><u></u></div>
  </div>
</div></div></body></html>`
}

// ─── Las tarjetas de agradecimiento ───
//
// Una por SOBRE invitado —no por capitán—, cuadrada de 8 × 8 cm, de a seis en
// una hoja A4 a 300 dpi con línea de corte. Son 49 sobres, así que salen nueve
// hojas; se imprimen, se recortan y se dejan una en cada sitio.
//
// Sobre marfil y no sobre el terracota del banderín, por dos razones: el
// banderín es fiesta y esto es lo otro —se lee despacio, al final de la noche o
// al día siguiente—, y 49 tarjetas a sangre en terracota son una barbaridad de
// tinta para algo que se imprime en casa.
//
// El texto trata de usted plural o de tú según cuántos vengan en el sobre: a una
// familia se le habla distinto que a alguien que viene solo.
const GRACIAS = { lado: 8, cols: 2, filas: 3 }

const TEXTO_GRACIAS = {
  plural: 'Que estén aquí no es un detalle: es la razón por la que este día se siente ' +
          'completo. Gracias por el cariño de siempre. Nos lo llevamos para toda la vida.',
  singular: 'Que estés aquí no es un detalle: es la razón por la que este día se siente ' +
            'completo. Gracias por el cariño de siempre. Nos lo llevamos para toda la vida.',
}

// ─── La lista del DJ ───
//
// Una hoja con la canción de cada mesa, su capitán y cuánta gente la va a
// corear. Se imprime y se le entrega al DJ, así que va sobre blanco, en cuerpo
// grande y sin adornos: se lee en una cabina a oscuras y de reojo.
//
// Sale además en .txt, que es lo que se manda por WhatsApp y lo que el DJ pega
// en su lista de reproducción sin volver a teclearlo.
function htmlCanciones(filas, arte) {
  const cuerpo = filas.map((f, i) => `
    <tr${f.cancion ? '' : ' class="sin"'}>
      <td class="n">${esc(f.numero)}</td>
      <td class="c">${f.cancion ? esc(f.cancion.toUpperCase()) : 'SIN CANCIÓN ANOTADA'}</td>
      <td class="cap">${esc(f.capitan || '—')}<small>${f.gente} personas</small></td>
    </tr>`).join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>${ESTILO}
  .hoja{width:${cm(21)}px;height:${cm(29.7)}px;background:#fff;padding:${cm(1.5)}px ${cm(1.4)}px;
    display:flex;flex-direction:column}
  .top{display:flex;align-items:center;gap:16px;border-bottom:2px solid #C8A96E;
    padding-bottom:14px;margin-bottom:6px}
  .top img{height:${cm(1.5)}px;width:auto}
  .top h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:34px;
    line-height:1.05;color:#2A1D14}
  .top p{font-size:12px;letter-spacing:.2em;color:#8A7866;margin-top:3px}
  .top .der{margin-left:auto;text-align:right;font-size:12px;color:#8A7866;line-height:1.7}

  table{width:100%;border-collapse:collapse;margin-top:10px}
  tr{border-bottom:1px solid #EFE7DC}
  td{padding:13px 6px;vertical-align:middle}
  .n{width:${cm(2.1)}px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;
    font-size:30px;color:#9A5B45;white-space:nowrap}
  .c{font-family:Jost,system-ui,sans-serif;font-weight:500;font-size:19px;letter-spacing:.03em;
    color:#2A1D14;line-height:1.25}
  .cap{width:${cm(4.6)}px;text-align:right;font-size:13px;color:#6B5B4B;line-height:1.3}
  .cap small{display:block;font-size:10.5px;letter-spacing:.1em;color:#A2917F;margin-top:2px}
  tr.sin .c{color:#B00020}

  .nota{margin-top:auto;border-top:1px solid #EFE7DC;padding-top:14px;font-size:13px;
    line-height:1.6;color:#6B5B4B}
  .nota b{color:#2A1D14}
</style></head><body><div class="hoja">
  <div class="top">
    ${arte.logo ? `<img src="${arte.logo}" alt="">` : ''}
    <div>
      <h1>Canciones por mesa</h1>
      <p>PARA EL DJ</p>
    </div>
    <div class="der">
      <div>Angely &amp; Kevin</div>
      <div>12 de septiembre de 2026</div>
      <div>Casona del Prado</div>
    </div>
  </div>

  <table>${cuerpo}</table>

  <p class="nota">
    Cada mesa eligió su canción y su capitán la está esperando. <b>Cuando suene, esa mesa
    es la que responde</b>: la idea es soltarlas repartidas a lo largo de la noche, no
    seguidas. Al lado de cada capitán va cuánta gente hay en esa mesa.
  </p>
</div></body></html>`
}

function htmlAgradecimientos(lote, arte, hoja, total) {
  const G = GRACIAS
  const tarjetas = lote.map(t => {
    // «Familia Gravini Rodriguez Trujillo» y «Jorge Longa» no entran igual
    const n = t.nombre.length
    const cuerpo = n > 28 ? 19 : n > 22 ? 22 : n > 15 ? 26 : 30
    return `<div class="t">
      <div class="marco"></div>
      <div class="in">
        ${arte.logo ? `<img src="${arte.logo}" alt="">` : ''}
        <p class="g">GRACIAS</p>
        <p class="n" style="font-size:${cuerpo}px">${esc(t.nombre)}</p>
        <div class="rule"><i></i><b>&#9670;</b><i></i></div>
        <p class="msg">${esc(t.personas > 1 ? TEXTO_GRACIAS.plural : TEXTO_GRACIAS.singular)}</p>
        <p class="ayk">Angely &amp; Kevin</p>
        <p class="fecha">12 · IX · 2026</p>
      </div>
    </div>`
  }).join('')

  // Los huecos que sobran en la última hoja se dejan vacíos, con su marca de
  // corte: así las seis posiciones caen siempre en el mismo sitio del pliego.
  const vacias = Array.from({ length: G.cols * G.filas - lote.length },
    () => '<div class="t vacia"></div>').join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>${ESTILO}
  .hoja{width:${cm(21)}px;height:${cm(29.7)}px;background:#fff;padding:${cm(1.6)}px ${cm(2.2)}px;
    display:flex;flex-direction:column}
  .rejilla{display:grid;grid-template-columns:repeat(${G.cols},${cm(G.lado)}px);
    grid-auto-rows:${cm(G.lado)}px;gap:${cm(0.4)}px;justify-content:center;align-content:start}
  .t{position:relative;background:#FBF5EA;outline:1px dashed #D9C7A8;overflow:hidden}
  .t.vacia{background:none}
  /* Filete interior doble, el mismo marco de la participación */
  .marco{position:absolute;inset:${cm(0.42)}px;border:1px solid #E0CFAE;pointer-events:none}
  .marco::after{content:'';position:absolute;inset:3px;border:.6px solid rgba(176,140,79,.4)}

  .in{position:relative;z-index:1;height:100%;display:flex;flex-direction:column;
    align-items:center;justify-content:center;text-align:center;padding:${cm(0.85)}px}
  .in img{height:${cm(1.25)}px;width:auto}
  .g{font-size:12px;letter-spacing:.36em;color:#B08C4F;margin-top:9px}
  .n{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;line-height:1.12;
    color:#9A5B45;margin-top:6px}
  .rule{display:flex;align-items:center;gap:9px;width:62%;margin:9px 0 8px}
  .rule i{flex:1;height:1px;background:#E0CFAE}
  .rule b{color:#B08C4F;font-size:8px}
  .msg{font-family:'Cormorant Garamond',Georgia,serif;font-size:15.5px;line-height:1.45;
    color:#2A1D14}
  .ayk{font-family:'Great Vibes',cursive;font-size:24px;color:#9A5B45;margin-top:10px;line-height:1.1}
  .fecha{font-size:9px;letter-spacing:.26em;color:#A2917F;margin-top:3px}

  .pie{margin-top:auto;text-align:center;font-size:11px;letter-spacing:.18em;color:#B9AC9C}
</style></head><body><div class="hoja">
  <div class="rejilla">${tarjetas}${vacias}</div>
  <p class="pie">ANGELY &amp; KEVIN · TARJETAS DE AGRADECIMIENTO · HOJA ${hoja} DE ${total} · CORTAR POR LA LÍNEA</p>
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
    for (const F of Object.values(FORMATOS)) {
      // El pendón mide 5167 px de CSS de alto: la ventana se abre más ancha para
      // que quepa el elemento entero, que es lo que se captura.
      await page.setViewport({ width: Math.ceil(F.w) + 80, height: 1400, deviceScaleFactor: 2 })
      await captura(htmlAfiche(imprimibles, porMesa, arte, F), join(SALIDA, F.archivo))
      console.log(`  ✓ ${F.archivo}`.padEnd(40), F.medida)
    }
    await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 2 })

    await mkdir(join(SALIDA, 'hojas-de-trabajo'), { recursive: true })
    for (const [i, m] of imprimibles.entries()) {
      const nombre = `${String(i + 1).padStart(2, '0')}_${slug(m.nombre)}.png`
      await captura(htmlMesa(m, porMesa.get(m.id), cuando), join(SALIDA, 'hojas-de-trabajo', nombre))
      console.log(`  ✓ ${nombre}`)
    }

    // Un banderín por capitán elegido. Las mesas sin capitán no sacan ninguno:
    // uno con el nombre en blanco no se puede entregar.
    const conCapitan = imprimibles.filter(m => m.capitan_id && nombreDe.get(m.capitan_id))
    if (conCapitan.length) {
      await mkdir(join(SALIDA, 'capitanes'), { recursive: true })
      for (const [i, m] of conCapitan.entries()) {
        const quien = nombreDe.get(m.capitan_id)
        const nombre = `${String(i + 1).padStart(2, '0')}_${slug(nombreCorto(quien))}.png`
        await captura(htmlBanderin(m, quien, arte), join(SALIDA, 'capitanes', nombre))
        console.log(`  ✓ capitanes/${nombre}`)
      }

    } else {
      console.log('  · Sin capitanes elegidos todavía: no se generó ningún banderín.')
    }
    const sinCancion = conCapitan.filter(m => !(m.notas || '').trim()).length

    // ─── La lista del DJ ───
    const canciones = imprimibles.map(m => ({
      numero: m.nombre,
      cancion: (m.notas || '').trim(),
      capitan: m.capitan_id ? nombreCorto(nombreDe.get(m.capitan_id) || '') : '',
      gente: (porMesa.get(m.id) || []).length,
    }))
    await mkdir(join(SALIDA, 'dj'), { recursive: true })
    await captura(htmlCanciones(canciones, arte), join(SALIDA, 'dj', 'canciones-por-mesa.png'))
    const sinCancion2 = canciones.filter(c => !c.cancion).length
    console.log('  ✓ dj/canciones-por-mesa.png'.padEnd(40),
      sinCancion2 ? `ojo: ${sinCancion2} sin canción` : 'las ' + canciones.length + ' con canción')

    // El mismo dato en texto: es lo que se manda por WhatsApp y lo que el DJ
    // pega en su lista sin volver a teclearlo.
    await writeFile(join(SALIDA, 'dj', 'canciones-por-mesa.txt'),
`CANCIONES POR MESA — Angely & Kevin
Sábado 12 de septiembre de 2026 · Casona del Prado

Cada mesa eligió su canción y su capitán la está esperando. Cuando suene,
esa mesa es la que responde. Mejor repartidas a lo largo de la noche.

${canciones.map(c =>
  `${c.numero.padEnd(9)}  ${(c.cancion || '— SIN CANCIÓN ANOTADA —').padEnd(38)}  ${c.capitan} (${c.gente} personas)`
).join('\n')}
`, 'utf8')
    console.log('  ✓ dj/canciones-por-mesa.txt')

    // ─── Agradecimiento: una por SOBRE, no por capitán ───
    // Van ordenadas por mesa y después por nombre, que es como se reparten esa
    // noche: de a mesa. Un sobre repartido entre dos mesas lleva una sola y va
    // con la primera.
    const ordenMesa = new Map(ms.data.map(m => [m.id, m.orden ?? 0]))
    const sobres = new Map()
    for (const a of as.data) {
      const s = sobres.get(a.guest_id) || { personas: 0, mesa: Infinity }
      s.personas++
      s.mesa = Math.min(s.mesa, ordenMesa.get(a.mesa_id) ?? 0)
      sobres.set(a.guest_id, s)
    }
    const gracias = [...sobres.entries()]
      .map(([id, s]) => ({ ...s, nombre: grupoDe.get(id) || '' }))
      .filter(t => t.nombre)
      .sort((a, b) => a.mesa - b.mesa || a.nombre.localeCompare(b.nombre, 'es'))

    await mkdir(join(SALIDA, 'agradecimiento'), { recursive: true })
    const porHoja = GRACIAS.cols * GRACIAS.filas
    const hojas = Math.ceil(gracias.length / porHoja)
    for (let h = 0; h < hojas; h++) {
      const lote = gracias.slice(h * porHoja, (h + 1) * porHoja)
      const nombre = `hoja-${String(h + 1).padStart(2, '0')}.png`
      await captura(htmlAgradecimientos(lote, arte, h + 1, hojas), join(SALIDA, 'agradecimiento', nombre))
      console.log(`  ✓ agradecimiento/${nombre}`.padEnd(40), `${lote.length} sobre(s)`)
    }

    const faltan = [...porMesa.values()].flat().filter(p => p.falta).length
    const sentados = [...porMesa.values()].reduce((s, g) => s + g.length, 0)
    await writeFile(join(SALIDA, 'LEEME.txt'),
`REPARTO DE MESAS — Angely & Kevin
Sábado 12 de septiembre de 2026 · Casona del Prado, Barranquilla
Generado el ${cuando}

  capitanes/NN_*.png         EL BANDERÍN de cada capitán, para colgar del cuello:
                             9 × 20 cm a 300 dpi. Los primeros 4 cm son el
                             doblez —van marcados con la línea de puntos— y
                             abajo termina en punta. Se imprime y se recorta por
                             la figura; lo blanco de alrededor es el descarte.
                             La canción sale de la columna «notas» de la mesa.
  dj/canciones-por-mesa.png  LA LISTA DEL DJ: la canción de cada mesa, su
  dj/canciones-por-mesa.txt  capitán y cuánta gente la va a corear. La misma en
                             hoja para imprimir y en texto para mandarla.
  agradecimiento/hoja-NN.png Una tarjeta de agradecimiento POR SOBRE INVITADO
                             —no por capitán—, cuadrada de 8 × 8 cm, de a seis
                             en una hoja A4 a 300 dpi. Se cortan por la línea de
                             puntos. Van ordenadas por mesa, que es como se
                             reparten: de a mesa.
  bienvenida-pendon-75x175.png
                             EL MISMO AFICHE EN PENDÓN: 75 × 175 cm exactos a
                             150 dpi (4430 × 10334 px), a dos columnas, con
                             6,4 cm de margen limpio por los cuatro lados.
                             OJO SI ES ROLL-UP: la base suele tragarse los
                             últimos 10-15 cm y el riel los primeros 3. Este
                             archivo es la lámina completa de 175 cm; si el
                             impresor necesita área de seguridad aparte,
                             pedile la medida VISIBLE y se regenera.
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

    console.log(`\n  ${imprimibles.length + conCapitan.length + 3} imágenes en ${SALIDA}`)
    if (faltan) console.warn(`  Ojo: ${faltan} nombre(s) por completar, marcados en rojo.\n`)
    else console.log('  Todos los nombres completos.\n')
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error('\n  Falló:', e.message, '\n'); process.exit(1) })
