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

// La pieza y la hoja donde se imprime. La hoja es más grande a propósito: el
// margen blanco es de donde se agarra para cortar, y ahí van las marcas —fuera
// de la pieza, porque si se imprimieran encima se quedarían ahí para siempre.
// Confeti repetible: el mismo nombre de mesa da siempre el mismo reparto, así
// que regenerar no cambia lo que ya se mandó a imprimir.
function confeti(semilla, n, W, H) {
  let x = 0
  for (let i = 0; i < semilla.length; i++) x = (x * 31 + semilla.charCodeAt(i)) >>> 0
  const azar = () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296)
  const piezas = []
  for (let i = 0; i < n; i++) {
    const w = 3 + azar() * 5
    piezas.push(`<i style="left:${(azar() * W).toFixed(1)}px;top:${(azar() * H).toFixed(1)}px;
      width:${w.toFixed(1)}px;height:${(w * (0.3 + azar() * 0.5)).toFixed(1)}px;
      transform:rotate(${(azar() * 180).toFixed(0)}deg);opacity:${(0.18 + azar() * 0.4).toFixed(2)}"></i>`)
  }
  return piezas.join('')
}

const BANDERIN = {
  w: 6, h: 15,            // la pieza, la medida que pidió la wedding
  doblez: 3,              // se dobla aquí y este trozo queda detrás del cuello
  punta: 3.2,             // desde aquí abajo, el triángulo
  agujero: 2.4,           // Ø del agujero del cuello de la botella
}

// El pliego: TABLOIDE VERTICAL, cuatro columnas por dos filas = ocho banderines.
//
//   ancho  4 × 6 + 3 calles de 0,85 + 0,7 de margen a cada lado = 27,94 exactos
//   alto   2 × 15 + 3,2 arriba para las marcas + 3,5 de calle = 36,7 de 43,18
//
// En A4 sólo entrarían tres —dos filas de 15 cm son 30 y el A4 mide 29,7—, así
// que once capitanes serían cuatro hojas contra dos. Por eso aquí sólo hay un
// pliego: si algún día hace falta A4, es añadir una entrada a este objeto.
const PLIEGOS_BAN = {
  tabloide: {
    archivo: 'tabloide', w: 27.94, h: 43.18,
    margen: 0.7, calle: 0.85, arriba: 3.2, calleV: 3.5, cols: 4, filas: 2,
  },
}

// ─── El agujero del cuello ───
//
// Va CENTRADO EN LA LÍNEA DEL DOBLEZ, mitad arriba y mitad abajo: al doblar, las
// dos mitades se superponen y queda un agujero redondo que pasa por las dos
// capas. Es como se hace un collarín de botella, y es lo que hace que el doblez
// sirva para algo.
//
// Ø 2,4 cm es para el CUELLO, no para el cuerpo de la botella: la botella mide
// 8,5 cm de diámetro, pero el banderín entra por arriba y se apoya en el hombro.
// En una pieza de 6 cm de ancho, 2,4 deja 1,8 cm de papel a cada lado, que es lo
// que aguanta el peso sin rasgarse.

/** Una pieza: el banderín más sus marcas, colocado en (x0, y0) del pliego. */
function piezaBanderin(mesa, nombreLargo, arte, x0cm, y0cm) {
  const B = BANDERIN
  const capitan = nombreCorto(nombreLargo)
  const cancion = (mesa.notas || '').trim()
  const numero = (mesa.nombre || '').replace(/^\s*mesa\s*/i, '').trim()

  const x0 = cm(x0cm), y0 = cm(y0cm)
  const pw = cm(B.w), ph = cm(B.h)
  const yDoblez = y0 + cm(B.doblez)
  const yPunta = y0 + cm(B.h - B.punta)
  const cxPieza = x0 + pw / 2
  const r = cm(B.agujero / 2)
  const contorno = `${x0},${y0} ${x0 + pw},${y0} ${x0 + pw},${yPunta} ${cxPieza},${y0 + ph} ${x0},${yPunta}`

  return {
    html: `<div class="ban" style="left:${x0}px;top:${y0}px;width:${pw}px;height:${ph}px">
      <div class="conf">${confeti(mesa.nombre + capitan, 30, pw, ph)}</div>
      <div class="doblez"></div>
      <div class="cuerpo">
        ${arte.logo ? `<img class="crest" src="${arte.logo}" alt="">` : ''}
        <p class="quien"><small>QUERIDO</small>
          <b style="font-size:${capitan.length > 18 ? 17 : 21}px">${esc(capitan.toUpperCase())}</b></p>
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
          <span style="font-size:${cancion.length > 26 ? 12 : 15}px">${cancion ? esc(cancion.toUpperCase()) : ''}</span>
        </div>

        <div class="firma"><i></i><span>ANGELY &amp; KEVIN · 12 · IX · 2026</span></div>
      </div>
    </div>`,

    marcas: `
      <polygon points="${contorno}" fill="none" stroke="#8A7866" stroke-width="1" stroke-dasharray="7 6"/>
      <circle cx="${cxPieza}" cy="${yDoblez}" r="${r}" fill="none" stroke="#8A7866"
              stroke-width="1" stroke-dasharray="7 6"/>
      <line x1="${x0}" y1="${yDoblez}" x2="${x0 + pw}" y2="${yDoblez}"
            stroke="#C0B3A3" stroke-width="1" stroke-dasharray="3 5"/>
      <text class="chico" x="${cxPieza}" y="${y0 - 9}" text-anchor="middle">${esc(capitan.toUpperCase())} · ${esc(mesa.nombre.toUpperCase())}</text>`,
  }
}

/** Un pliego tabloide con hasta ocho banderines. */
function htmlBanderines(lote, arte, J) {
  const B = BANDERIN
  const piezas = lote.map((t, i) => piezaBanderin(
    t.mesa, t.capitan, arte,
    J.margen + (i % J.cols) * (B.w + J.calle),
    J.arriba + Math.floor(i / J.cols) * (B.h + J.calleV)))

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>${ESTILO}
  .hoja{width:${cm(J.w)}px;height:${cm(J.h)}px;position:relative;background:#fff}

  /* La pieza: terracota de la boda, con la punta recortada abajo y el agujero
     del cuello vaciado. El vaciado se hace con una máscara, no con un borde
     pintado: lo que se ve blanco ahí es el papel que se quita. */
  .ban{position:absolute;color:#FFF3E4;text-align:center;
    background:linear-gradient(163deg,#7E2E1B 0%,#A8442A 48%,#8B3620 100%);
    clip-path:polygon(0 0,100% 0,100% ${((B.h - B.punta) / B.h * 100).toFixed(2)}%,50% 100%,0 ${((B.h - B.punta) / B.h * 100).toFixed(2)}%);
    -webkit-mask:radial-gradient(circle ${cm(B.agujero / 2)}px at 50% ${cm(B.doblez)}px,transparent 99%,#000 100%);
    mask:radial-gradient(circle ${cm(B.agujero / 2)}px at 50% ${cm(B.doblez)}px,transparent 99%,#000 100%);
    display:flex;flex-direction:column;align-items:center;overflow:hidden}
  .conf{position:absolute;inset:0;pointer-events:none}
  .conf i{position:absolute;display:block;background:#F2D79B;border-radius:1px}
  .ban > *:not(.conf){position:relative;z-index:1;width:100%}

  .doblez{height:${cm(B.doblez)}px;flex-shrink:0}
  /* El contenido arranca bajo el agujero y TERMINA ANTES DE LA PUNTA: los lados
     del triángulo se comen el texto que baje de ahí. Entra 0,8 cm, donde todavía
     mide casi 5 cm de ancho, y ni un milímetro más. */
  .cuerpo{flex:1;display:flex;flex-direction:column;align-items:center;
    padding:${cm(B.agujero / 2 + 0.26)}px ${cm(0.42)}px ${cm(B.punta - 0.8)}px}
  /* El escudo va aquí y no en el doblez: esa franja se dobla hacia atrás y el
     logo quedaría de espaldas. */
  .crest{height:${cm(0.62)}px;width:auto;margin-bottom:5px;filter:brightness(1.4) saturate(.55)}

  .quien small{display:block;font-size:9.5px;font-weight:400;letter-spacing:.28em;color:#F2D79B}
  .quien b{display:block;font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;
    letter-spacing:.01em;line-height:1.08;margin-top:2px}

  .cargo{font-size:8.5px;letter-spacing:.22em;color:rgba(255,243,228,.85);margin-top:${cm(0.17)}px}
  .num{display:flex;align-items:baseline;justify-content:center;gap:6px;margin-top:2px}
  .num small{font-family:Jost,system-ui,sans-serif;font-size:11px;font-weight:400;
    letter-spacing:.22em;color:#F2D79B}
  .num span{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;
    font-size:${cm(0.72)}px;line-height:.9;color:#FFF3E4}

  .por{font-size:9.5px;font-weight:300;line-height:1.36;letter-spacing:.02em;
    margin-top:${cm(0.18)}px;color:rgba(255,243,228,.94)}
  .lema{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:17px;
    letter-spacing:.03em;color:#F2D79B;margin-top:${cm(0.15)}px;line-height:1.08}

  .der{margin-top:${cm(0.18)}px;display:flex;flex-direction:column;gap:${cm(0.11)}px;width:100%}
  .der p{font-size:9px;font-weight:400;line-height:1.3;letter-spacing:.02em;
    padding:${cm(0.1)}px ${cm(0.1)}px;border:1px solid rgba(242,215,155,.45);border-radius:4px;
    background:rgba(255,243,228,.07)}
  .der b{display:block;font-size:7.5px;letter-spacing:.2em;color:#F2D79B;margin-bottom:2px}

  .cancion{margin-top:${cm(0.17)}px;width:100%}
  .cancion b{display:block;font-size:7.5px;letter-spacing:.2em;color:#F2D79B;margin-bottom:2px}
  .cancion span{display:block;font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;
    line-height:1.14;color:#FFF3E4}
  .cancion.vacia span{border-bottom:1px solid rgba(242,215,155,.5);min-height:16px}

  .firma{margin-top:auto}
  .firma i{display:block;width:${cm(1.4)}px;height:1px;background:rgba(242,215,155,.5);
    margin:${cm(0.15)}px auto ${cm(0.11)}px}
  .firma span{font-size:7.5px;letter-spacing:.18em;color:rgba(255,243,228,.72)}

  /* Las marcas van en una capa aparte y SIEMPRE fuera de las piezas: lo que se
     imprima encima se queda ahí para siempre. */
  .marcas{position:absolute;inset:0;pointer-events:none}
  .marcas text{font-family:Jost,system-ui,sans-serif;fill:#8A7866}
  .marcas text.tit{font-size:13px;letter-spacing:.12em}
  .marcas text.chico{font-size:9px;letter-spacing:.08em;fill:#A2917F}
</style></head><body><div class="hoja">
  ${piezas.map(p => p.html).join('')}
  <svg class="marcas" viewBox="0 0 ${cm(J.w)} ${cm(J.h)}">
    <text class="tit" x="${cm(J.margen)}" y="${cm(1.1)}">CORTAR POR LA LÍNEA DE PUNTOS</text>
    <text class="chico" x="${cm(J.w - J.margen)}" y="${cm(1.1)}" text-anchor="end">ANGELY &amp; KEVIN · BANDERINES DE CAPITÁN · 6 × 15 cm</text>
    <text class="chico" x="${cm(J.margen)}" y="${cm(1.7)}">EL AGUJERO (Ø 2,4) VA CENTRADO EN EL DOBLEZ · LA FRANJA DE ARRIBA SE DOBLA HACIA ATRÁS Y EL AGUJERO QUEDA REDONDO</text>
    ${piezas.map(p => p.marcas).join('')}
  </svg>
</div></body></html>`
}

// «Mesa 7» → «VII». La wedding ubica las tarjetas por el romano: en la mesa se
// ve de lejos y no se confunde con el número de la tarjeta ni con el del cupo.
const ROMANOS = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
function romano(n) {
  let r = ''
  for (const [v, letra] of ROMANOS) while (n >= v) { r += letra; n -= v }
  return r
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
// 6,5 cm y no 8: con tres columnas de 6,5 la hoja se llena (19,5 de 21), y con
// dos de 8 quedaban 4,4 cm de blanco a los lados y hacían falta nueve hojas para
// lo que ahora entra en cinco.
const GRACIAS = { lado: 6.5 }

// Los mismos pliegos que los banderines, con la cuenta hecha para 6,5 cm:
//   A4        3 × 6,5 = 19,5 de 21   · 4 filas = 26 de 29,7  → 12 por hoja
//   Tabloide  6 × 6,5 = 39 de 43,18  · 4 filas = 26 de 27,94 → 24 por hoja
const PLIEGOS_GRACIAS = {
  a4:       { archivo: 'a4',       w: 21,    h: 29.7,  cols: 3, filas: 4, pad: '1.5px 0.6' },
  tabloide: { archivo: 'tabloide', w: 43.18, h: 27.94, cols: 6, filas: 4, pad: '0.9px 2.0' },
}

const TEXTO_GRACIAS = {
  plural: 'Que estén aquí no es un detalle: es la razón por la que este día se siente ' +
          'completo. Gracias por el cariño de siempre. Nos lo llevamos para toda la vida.',
  singular: 'Que estés aquí no es un detalle: es la razón por la que este día se siente ' +
            'completo. Gracias por el cariño de siempre. Nos lo llevamos para toda la vida.',
}

// ─── El guion musical ───
//
// Los momentos de la recepción con una propuesta de canción para cada uno. Es
// UNA PROPUESTA, no el repertorio: el DJ conoce su pista y los novios su gusto.
// Sale impresa marcada como tal, con renglón en blanco para escribir el cambio.
//
// Las horas salen del programa de la boda —ceremonia 6:30, recepción 8:30— y son
// orientativas: lo que importa es el ORDEN, que es lo que el DJ necesita saber.
//
// Está aquí y no en la base porque es criterio, no dato: si mañana la pareja
// cambia una canción, se cambia esta lista y se vuelve a generar.
const GUION = [
  ['8:30', 'Llegada de invitados', 'Cóctel, la gente entra y busca su mesa',
    ['Perfect · Ed Sheeran (acústico)', 'All of Me · John Legend', 'Vallenato romántico de fondo, volumen bajo']],
  ['9:10', 'Entrada de los novios', 'El momento de más ruido de la noche',
    ['Volví a Nacer · Carlos Vives', 'La Tierra del Olvido · Carlos Vives', 'Marry You · Bruno Mars']],
  ['9:20', 'Primer baile', 'Angely y Kevin solos en la pista',
    ['Perfect · Ed Sheeran', 'All of Me · John Legend']],
  ['9:30', 'Baile con los padres', 'Se suman los papás de los dos',
    ['Mi Primer Amor · Diomedes Díaz', 'Hijo de Tigre · vallenato clásico', 'A mi Manera · Vicente Fernández']],
  ['9:40', 'Brindis', 'Copas arriba · «¡Vivan Angely y Kevin!»',
    ['Vivir Mi Vida · Marc Anthony', 'Celebra la Vida · Axel']],
  ['9:50', 'Cena', 'Fondo, sin competir con las conversaciones',
    ['Salsa romántica y vallenato suave', 'Nada de pista todavía']],
  ['10:40', 'Corte de la torta', 'Foto obligada, canción corta y alegre',
    ['Sugar · Maroon 5', 'La Vida Es Un Carnaval · Celia Cruz']],
  ['10:55', 'Arranque de fiesta', 'Se abre la pista y no se cierra más',
    ['La Rebelión · Joe Arroyo', 'El Pegao · champeta', 'La Vaca y el Toro · Diomedes Díaz']],
  ['11:15', 'Hora loca', 'Con los accesorios y la comparsa',
    ['Mapalé y champeta', 'Ram Pam Pam · Natti Natasha', 'Mix de merengue']],
  ['11:45', 'LAS CANCIONES DE LAS MESAS', 'Ver el listado de abajo · REPARTIDAS, no seguidas',
    ['Una cada 15 o 20 minutos', 'El capitán de esa mesa la está esperando']],
  ['12:45', 'Ramo y liga', 'Solteras primero, solteros después',
    ['Single Ladies · Beyoncé', 'Sexy and I Know It · LMFAO']],
  ['1:30', 'Cierre', 'La última, con todos en la pista',
    ['L\'Amour Toujours · Gigi D\'Agostino', 'Time of My Life · Bill Medley & Jennifer Warnes']],
]

function htmlGuion(canciones, arte) {
  const momentos = GUION.map(([hora, que, nota, temas]) => `
    <tr>
      <td class="h">${hora}</td>
      <td class="q"><b>${esc(que)}</b><span>${esc(nota)}</span></td>
      <td class="t">${temas.map(x => `<em>${esc(x)}</em>`).join('')}<i class="linea"></i></td>
    </tr>`).join('')

  const mesas = canciones.map((c, i) => `
    <li><b>${i + 1}</b><span>${esc(c.numero)}</span>
      <em class="${c.cancion ? '' : 'sin'}">${esc(c.cancion || 'SIN CANCIÓN ANOTADA')}</em>
      <u>${esc(c.capitan || '—')} · ${c.gente} pers.</u></li>`).join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>${ESTILO}
  .hoja{width:${cm(21)}px;height:${cm(29.7)}px;background:#fff;padding:${cm(1.2)}px ${cm(1.2)}px;
    display:flex;flex-direction:column}
  .top{display:flex;align-items:center;gap:14px;border-bottom:2px solid #C8A96E;padding-bottom:11px}
  .top img{height:${cm(1.25)}px;width:auto}
  .top h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:29px;
    line-height:1.05;color:#2A1D14}
  .top p{font-size:10.5px;letter-spacing:.2em;color:#8A7866;margin-top:2px}
  .top .der{margin-left:auto;text-align:right;font-size:10.5px;color:#8A7866;line-height:1.65}

  .aviso{font-size:11.5px;line-height:1.5;color:#6B5B4B;margin:10px 0 4px;
    background:#FBF3E8;border-left:3px solid #C8A96E;padding:7px 10px}
  .aviso b{color:#2A1D14}

  table{width:100%;border-collapse:collapse}
  tr{border-bottom:1px solid #EFE7DC}
  td{padding:7px 5px;vertical-align:top}
  .h{width:${cm(1.5)}px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;
    font-size:17px;color:#9A5B45;white-space:nowrap}
  .q{width:${cm(5.4)}px}
  .q b{display:block;font-size:12.5px;font-weight:500;letter-spacing:.04em;color:#2A1D14}
  .q span{display:block;font-size:10px;color:#A2917F;line-height:1.35;margin-top:1px}
  .t em{display:block;font-style:normal;font-size:11.5px;line-height:1.45;color:#6B5B4B}
  .t .linea{display:block;border-bottom:1px dotted #D8C9AE;height:11px;margin-top:2px}

  h2{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:21px;
    color:#9A5B45;margin:14px 0 6px;padding-bottom:4px;border-bottom:1px solid #E3D9CB}
  ol{list-style:none}
  ol li{display:flex;align-items:baseline;gap:8px;font-size:11.5px;line-height:1.75;
    border-bottom:1px solid #F6F0E7}
  ol b{min-width:15px;text-align:right;color:#B08C4F;font-weight:500}
  ol span{min-width:${cm(1.7)}px;color:#8A7866}
  ol em{flex:1;font-style:normal;font-weight:500;color:#2A1D14;letter-spacing:.02em}
  ol em.sin{color:#B00020}
  ol u{text-decoration:none;font-size:10px;color:#A2917F;white-space:nowrap}

  .nota{margin-top:auto;border-top:1px solid #EFE7DC;padding-top:10px;font-size:11px;
    line-height:1.55;color:#6B5B4B}
</style></head><body><div class="hoja">
  <div class="top">
    ${arte.logo ? `<img src="${arte.logo}" alt="">` : ''}
    <div>
      <h1>Guion musical</h1>
      <p>PARA EL DJ · RECEPCIÓN</p>
    </div>
    <div class="der">
      <div>Angely &amp; Kevin</div>
      <div>Sábado 12 de septiembre de 2026</div>
      <div>Casona del Prado · Barranquilla</div>
    </div>
  </div>

  <p class="aviso"><b>Las canciones de los momentos son una propuesta</b>, no el repertorio:
  cámbialas por lo que funcione en la pista. Lo que sí está cerrado es el ORDEN de los
  momentos y las once canciones de las mesas, que las eligieron los invitados.
  El renglón punteado es para escribir el cambio.</p>

  <table>${momentos}</table>

  <h2>Las canciones de las mesas</h2>
  <ol>${mesas}</ol>

  <p class="nota">
    Cada mesa eligió su canción y su capitán la está esperando. <b>Cuando suene, esa mesa
    es la que responde</b>: van repartidas a lo largo de la noche, una cada quince o veinte
    minutos, no seguidas. Al lado va cuánta gente hay en esa mesa.
  </p>
</div></body></html>`
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

// ─── Dónde va cada tarjeta de agradecimiento ───
//
// La hoja que se le entrega a la wedding: qué sobre va en qué mesa, en el mismo
// orden en que las tarjetas salen del pliego. Sin esto, 49 tarjetas cortadas son
// un montón de papeles sueltos y hay que ir adivinando.
//
// Lleva casilla para ir marcando: se reparte de pie, de mesa en mesa.
function htmlReparto(gracias, arte) {
  // Las tarjetas salen numeradas en el mismo orden en que se cortan del pliego
  const porMesa = new Map()
  gracias.forEach((t, i) => {
    const k = t.mesaNombre || '—'
    if (!porMesa.has(k)) porMesa.set(k, [])
    porMesa.get(k).push({ ...t, n: i + 1 })
  })

  const bloques = [...porMesa.entries()].map(([mesa, lista]) => `
    <section class="m">
      <h2>${esc(mesa)}<span>${esc(lista[0].romano)} · ${lista.length} tarjeta${lista.length === 1 ? '' : 's'}</span></h2>
      <ul>${lista.map(t => `
        <li><i class="box"></i><b>${t.n}</b><span>${esc(t.nombre)}</span>
        <em>${esc(t.tarjeta)}</em></li>`).join('')}</ul>
    </section>`).join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>${ESTILO}
  .hoja{width:${cm(21)}px;height:${cm(29.7)}px;background:#fff;padding:${cm(1.3)}px ${cm(1.2)}px;
    display:flex;flex-direction:column}
  .top{display:flex;align-items:center;gap:14px;border-bottom:2px solid #C8A96E;
    padding-bottom:12px}
  .top img{height:${cm(1.3)}px;width:auto}
  .top h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:30px;
    line-height:1.05;color:#2A1D14}
  .top p{font-size:11px;letter-spacing:.2em;color:#8A7866;margin-top:3px}
  .top .der{margin-left:auto;text-align:right;font-size:11px;color:#8A7866;line-height:1.7}

  .cols{columns:2;column-gap:${cm(1)}px;margin-top:14px}
  .m{break-inside:avoid;margin-bottom:11px}
  .m h2{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:21px;
    color:#9A5B45;border-bottom:1px solid #E3D9CB;padding-bottom:4px;margin-bottom:5px;
    display:flex;align-items:baseline;justify-content:space-between}
  .m h2 span{font-family:Jost,system-ui,sans-serif;font-size:10px;letter-spacing:.12em;color:#A2917F}
  .m ul{list-style:none}
  .m li{display:flex;align-items:baseline;gap:7px;font-size:12.5px;line-height:1.55;
    color:#2A1D14}
  .box{width:11px;height:11px;border:1px solid #C0B3A3;border-radius:2px;flex-shrink:0;
    transform:translateY(1px)}
  .m li b{font-weight:500;color:#B08C4F;font-size:11px;min-width:16px;text-align:right}
  .m li span{flex:1;min-width:0}
  .m li em{font-style:normal;font-size:10.5px;color:#A2917F;white-space:nowrap}

  .nota{margin-top:auto;border-top:1px solid #EFE7DC;padding-top:12px;font-size:12px;
    line-height:1.6;color:#6B5B4B}
  .nota b{color:#2A1D14}
</style></head><body><div class="hoja">
  <div class="top">
    ${arte.logo ? `<img src="${arte.logo}" alt="">` : ''}
    <div>
      <h1>Dónde va cada tarjeta</h1>
      <p>TARJETAS DE AGRADECIMIENTO · UNA POR PUESTO · PARA LA WEDDING</p>
    </div>
    <div class="der">
      <div><b>${gracias.length}</b> tarjetas · ${porMesa.size} mesas · una por puesto</div>
      <div>Angely &amp; Kevin · 12 · IX · 2026</div>
    </div>
  </div>

  <div class="cols">${bloques}</div>

  <p class="nota">
    <b>El número es el orden en que salen del pliego</b>, leyendo cada hoja de izquierda a
    derecha y de arriba abajo: si se cortan sin desordenarlas, la pila queda en este
    mismo orden y se reparte de corrido, mesa por mesa. <b>Una tarjeta por puesto</b>, y
    cada una lleva impreso el romano de su mesa y el nombre de quien se sienta ahí.
  </p>
</div></body></html>`
}

function htmlAgradecimientos(lote, arte, hoja, total, J) {
  const G = GRACIAS
  const tarjetas = lote.map(t => `<div class="t">
      <div class="marco"></div>
      <div class="in">
        ${arte.logo ? `<img src="${arte.logo}" alt="">` : ''}
        <p class="g">GRACIAS</p>
        <div class="rule"><i></i><b>&#9670;</b><i></i></div>
        <p class="msg">${esc(TEXTO_GRACIAS.singular)}</p>
        <p class="ayk">Angely &amp; Kevin</p>
        <p class="ubic"><b>${esc(t.romano)}</b><span>${esc(t.nombre)}</span></p>
      </div>
    </div>`).join('')

  // Los huecos que sobran en la última hoja se dejan vacíos, con su marca de
  // corte: así las seis posiciones caen siempre en el mismo sitio del pliego.
  const vacias = Array.from({ length: J.cols * J.filas - lote.length },
    () => '<div class="t vacia"></div>').join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>${ESTILO}
  .hoja{width:${cm(J.w)}px;height:${cm(J.h)}px;background:#fff;
    padding:${cm(J.w > 30 ? 0.9 : 1.5)}px ${cm(J.w > 30 ? 2 : 0.6)}px;
    display:flex;flex-direction:column}
  .rejilla{display:grid;grid-template-columns:repeat(${J.cols},${cm(G.lado)}px);
    grid-auto-rows:${cm(G.lado)}px;gap:${cm(0.3)}px;justify-content:center;align-content:start}
  .t{position:relative;background:#FBF5EA;outline:1px dashed #D9C7A8;overflow:hidden}
  .t.vacia{background:none}
  /* Filete interior doble, el mismo marco de la participación */
  .marco{position:absolute;inset:${cm(0.34)}px;border:1px solid #E0CFAE;pointer-events:none}
  .marco::after{content:'';position:absolute;inset:3px;border:.6px solid rgba(176,140,79,.4)}

  .in{position:relative;z-index:1;height:100%;display:flex;flex-direction:column;
    align-items:center;justify-content:center;text-align:center;padding:${cm(0.68)}px}
  .in img{height:${cm(0.95)}px;width:auto}
  .g{font-size:10.5px;letter-spacing:.34em;color:#B08C4F;margin-top:7px}
  .n{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;line-height:1.12;
    color:#9A5B45;margin-top:6px}
  .rule{display:flex;align-items:center;gap:7px;width:60%;margin:7px 0 6px}
  .rule i{flex:1;height:1px;background:#E0CFAE}
  .rule b{color:#B08C4F;font-size:8px}
  .msg{font-family:'Cormorant Garamond',Georgia,serif;font-size:12.5px;line-height:1.4;
    color:#2A1D14}
  .ayk{font-family:'Great Vibes',cursive;font-size:19px;color:#9A5B45;margin-top:8px;line-height:1.1}
  /* El pie es lo que usa la wedding para ubicarla: el romano de la mesa manda y
     el nombre del invitado va pequeño, que es como se busca en el puesto. */
  .ubic{display:flex;align-items:baseline;justify-content:center;gap:7px;margin-top:9px;
    padding-top:7px;border-top:1px solid #E0CFAE;width:78%}
  .ubic b{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:16px;
    color:#9A5B45;letter-spacing:.04em;line-height:1}
  .ubic span{font-size:8.5px;letter-spacing:.08em;color:#8A7866;text-align:left;line-height:1.25}

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
      const conQuien = conCapitan.map(m => ({ mesa: m, capitan: nombreDe.get(m.capitan_id) }))
      // Los dos pliegos, con los mismos banderines: se imprime UNO de los dos,
      // el que acepte la imprenta. El tabloide gasta la mitad de papel.
      for (const J of Object.values(PLIEGOS_BAN)) {
        await page.setViewport({ width: Math.ceil(cm(J.w)) + 80, height: 1400, deviceScaleFactor: 2 })
        const porHoja = J.cols * J.filas
        const hojas = Math.ceil(conQuien.length / porHoja)
        for (let h = 0; h < hojas; h++) {
          const lote = conQuien.slice(h * porHoja, (h + 1) * porHoja)
          const nombre = `${J.archivo}-${String(h + 1).padStart(2, '0')}.png`
          await captura(htmlBanderines(lote, arte, J), join(SALIDA, 'capitanes', nombre))
          console.log(`  ✓ capitanes/${nombre}`.padEnd(40),
            lote.map(t => nombreCorto(t.capitan)).join(' · '))
        }
      }
      await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 2 })

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

    await captura(htmlGuion(canciones, arte), join(SALIDA, 'dj', 'guion-musical.png'))
    console.log('  ✓ dj/guion-musical.png'.padEnd(40), `${GUION.length} momentos`)

    await writeFile(join(SALIDA, 'dj', 'guion-musical.txt'),
`GUION MUSICAL — Angely & Kevin
Sábado 12 de septiembre de 2026 · Casona del Prado, Barranquilla

Las canciones de los momentos son una PROPUESTA, no el repertorio. Lo que sí
está cerrado es el orden de los momentos y las once canciones de las mesas.

${GUION.map(([hora, que, nota, temas]) =>
  `${hora.padStart(5)}  ${que.toUpperCase()}\n         ${nota}\n` +
  temas.map(t => `         · ${t}`).join('\n')).join('\n\n')}


LAS CANCIONES DE LAS MESAS  —  repartidas, no seguidas

${canciones.map((c, i) =>
  `${String(i + 1).padStart(3)}.  ${c.numero.padEnd(9)} ${(c.cancion || '— SIN CANCIÓN —').padEnd(38)} ${c.capitan} (${c.gente} pers.)`
).join('\n')}
`, 'utf8')
    console.log('  ✓ dj/guion-musical.txt')

    // ─── Agradecimiento: una por SOBRE, no por capitán ───
    // Van ordenadas por mesa y después por nombre, que es como se reparten esa
    // noche: de a mesa. Un sobre repartido entre dos mesas lleva una sola y va
    // con la primera.
    // UNA TARJETA POR CUPO, no por sobre: la wedding las ubica en cada puesto, así
    // que hacen falta tantas como personas sentadas. Sin la mesa de los novios,
    // que no se imprime, son 82.
    const imprimiblesId = new Set(imprimibles.map(m => m.id))
    const mesaDe = new Map(ms.data.map(m => [m.id, m]))
    const gracias = as.data
      .filter(a => imprimiblesId.has(a.mesa_id))
      .map(a => {
        const m = mesaDe.get(a.mesa_id)
        const n = Number((m.nombre || '').replace(/[^0-9]/g, '')) || 0
        return {
          nombre: a.member_id ? (nombreDe.get(a.member_id) || '') : (a.etiqueta || ''),
          tarjeta: grupoDe.get(a.guest_id) || '',
          mesa: m.orden ?? 0,
          mesaNombre: m.nombre || '',
          romano: n ? romano(n) : '·',
        }
      })
      .filter(t => t.nombre)
      .sort((a, b) => a.mesa - b.mesa || a.nombre.localeCompare(b.nombre, 'es'))

    await mkdir(join(SALIDA, 'agradecimiento'), { recursive: true })
    for (const J of Object.values(PLIEGOS_GRACIAS)) {
      await page.setViewport({ width: Math.ceil(cm(J.w)) + 80, height: 1400, deviceScaleFactor: 2 })
      const porHoja = J.cols * J.filas
      const hojas = Math.ceil(gracias.length / porHoja)
      for (let h = 0; h < hojas; h++) {
        const lote = gracias.slice(h * porHoja, (h + 1) * porHoja)
        const nombre = `${J.archivo}-${String(h + 1).padStart(2, '0')}.png`
        await captura(htmlAgradecimientos(lote, arte, h + 1, hojas, J), join(SALIDA, 'agradecimiento', nombre))
        console.log(`  ✓ agradecimiento/${nombre}`.padEnd(40), `${lote.length} sobre(s)`)
      }
    }
    await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 2 })

    await captura(htmlReparto(gracias, arte), join(SALIDA, 'agradecimiento', 'reparto.png'))
    console.log('  ✓ agradecimiento/reparto.png'.padEnd(40), 'dónde va cada tarjeta')

    await writeFile(join(SALIDA, 'agradecimiento', 'reparto.txt'),
`DÓNDE VA CADA TARJETA DE AGRADECIMIENTO — Angely & Kevin
Sábado 12 de septiembre de 2026 · Casona del Prado

${gracias.length} tarjetas · UNA POR PUESTO. Cada una lleva el romano de su mesa.
El número es el orden en que salen del pliego, leyendo cada hoja de izquierda a
derecha y de arriba abajo.

${[...new Map(gracias.reduce((acc, t, i) => {
  const k = t.mesaNombre || '—'
  acc.set(k, [...(acc.get(k) || []), { ...t, n: i + 1 }])
  return acc
}, new Map()))].map(([mesa, lista]) =>
  `${mesa.toUpperCase()}  (${lista.length})\n` +
  lista.map(t => `  [ ] ${String(t.n).padStart(3)}  ${t.romano.padEnd(5)} ${t.nombre.padEnd(32)} ${t.tarjeta}`).join('\n')
).join('\n\n')}
`, 'utf8')
    console.log('  ✓ agradecimiento/reparto.txt')

    const faltan = [...porMesa.values()].flat().filter(p => p.falta).length
    const sentados = [...porMesa.values()].reduce((s, g) => s + g.length, 0)
    await writeFile(join(SALIDA, 'LEEME.txt'),
`REPARTO DE MESAS — Angely & Kevin
Sábado 12 de septiembre de 2026 · Casona del Prado, Barranquilla
Generado el ${cuando}

  capitanes/a4-NN.png        LOS BANDERINES de los capitanes, para colgar del
  capitanes/tabloide-NN.png  cuello de la botella. LOS MISMOS EN DOS PLIEGOS:
                             de a DOS por A4 (seis hojas) o de a CUATRO por
                             tabloide (tres hojas). Se imprime uno de los dos.
                             Cada pieza mide
                             9,4 × 22 cm. Los primeros 4,4 cm son el
                             doblez —van marcados con la línea de puntos— y
                             abajo termina en punta. Se imprime y se recorta por
                             la figura; lo blanco de alrededor es el descarte.
                             La canción sale de la columna «notas» de la mesa.
  dj/guion-musical.png       EL GUION DE LA NOCHE: los momentos de la recepción
  dj/guion-musical.txt       en orden, con una PROPUESTA de canción para cada
                             uno y renglón para escribir el cambio, y al final
                             las once canciones de las mesas numeradas.
  dj/canciones-por-mesa.png  LA LISTA DEL DJ: la canción de cada mesa, su
  dj/canciones-por-mesa.txt  capitán y cuánta gente la va a corear. La misma en
                             hoja para imprimir y en texto para mandarla.
  agradecimiento/reparto.png DÓNDE VA CADA TARJETA: el listado por mesa, con
  agradecimiento/reparto.txt casilla para ir marcando. El número es el orden en
                             que salen del pliego, así que si se cortan sin
                             desordenarlas la pila se reparte de corrido.
  agradecimiento/a4-NN.png   Una tarjeta de agradecimiento POR PUESTO —82 en
  agradecimiento/tabloide-NN.png  total—, cuadrada de 6,5 × 6,5 cm, con el
                             romano de su mesa y el nombre de quien se sienta.
                             También en dos pliegos: DOCE por A4 (cinco hojas) o
                             VEINTICUATRO por tabloide (tres hojas). Se cortan por la línea de
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
