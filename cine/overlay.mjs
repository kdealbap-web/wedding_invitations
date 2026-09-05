/**
 * Renderiza las capas de texto como PNG de 1920 × 1080 con transparencia.
 *
 * Por qué el navegador y no ffmpeg: `drawtext` de ffmpeg no sabe de Cormorant
 * Garamond ni de Great Vibes, no hace kerning decente ni interletrado amplio, y
 * el resultado no se parecería a la invitación. El navegador compone el texto
 * exactamente igual que el sitio; ffmpeg sólo lo superpone.
 *
 * Se renderiza UNA vez por escena (no por fotograma), así que es cuestión de
 * segundos. Todo el movimiento lo pone ffmpeg después.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { FUENTES } from './paleta.mjs'
import { ANCHO, ALTO } from './guion.mjs'

const MARGEN = 96   // zona segura: los paneles LED recortan el borde

let logoCache = null
async function logoDataUri() {
  if (!logoCache) {
    const b = await readFile(resolve('src/assets/img/logo_a&K.png'))
    logoCache = `data:image/png;base64,${b.toString('base64')}`
  }
  return logoCache
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const brs = s => esc(s).replace(/\n/g, '<br />')

// ─── Ornamentos ───
const filete = p => `
  <div class="ov-rule">
    <span></span>
    <svg viewBox="0 0 12 12" width="12" height="12"><path d="M6 0 12 6 6 12 0 6Z" fill="${p.oro}"/></svg>
    <span></span>
  </div>`

const anillos = p => `
  <svg class="ov-rings" viewBox="0 0 52 18"><circle cx="15" cy="9" r="7"/><circle cx="37" cy="9" r="7"/></svg>`

/** Construye el cuerpo del overlay según el tipo de capa. */
async function cuerpo(capa, p) {
  if (!capa) return ''
  const logo = await logoDataUri()

  switch (capa.tipo) {
    case 'marca':
      return `
        <img class="ov-logo" src="${logo}" alt="" />
        <p class="ov-script">${esc(capa.script)}</p>
        <h1 class="ov-nombre">${esc(capa.nombreA)}</h1>
        <p class="ov-amp">&amp;</p>
        <h1 class="ov-nombre ov-nombre-it">${esc(capa.nombreB)}</h1>
        ${capa.firma ? '' : anillos(p)}`

    case 'titulo':
      return `
        <p class="ov-kicker">${esc(capa.kicker)}</p>
        <h1 class="ov-titulo">${esc(capa.titulo)}</h1>
        ${filete(p)}
        ${capa.nota ? `<p class="ov-nota">${brs(capa.nota)}</p>` : ''}`

    case 'script':
      return `
        <p class="ov-script ov-script-xl">${esc(capa.texto)}</p>
        ${filete(p)}
        ${capa.nota ? `<p class="ov-nota">${brs(capa.nota)}</p>` : ''}`

    case 'verso':
      return `
        <img class="ov-crest" src="${logo}" alt="" />
        <p class="ov-verso">${brs(capa.texto)}</p>
        <p class="ov-ref">${esc(capa.ref)}</p>`

    case 'grande':
      return `
        <p class="ov-kicker">${esc(capa.kicker)}</p>
        <h1 class="ov-grande">${esc(capa.texto)}</h1>
        ${filete(p)}
        ${capa.nota ? `<p class="ov-nota">${brs(capa.nota)}</p>` : ''}`

    // Banda horizontal contenida. Sobre una rejilla de fotos, el velo radial de
    // 'grande' lava todas las celdas; esta sólo oscurece la franja del rótulo.
    case 'banda':
      return `
        <div class="ov-banda">
          <p class="ov-kicker">${esc(capa.kicker)}</p>
          <h1 class="ov-grande">${esc(capa.texto)}</h1>
          ${capa.nota ? `<p class="ov-nota">${brs(capa.nota)}</p>` : ''}
        </div>`

    case 'fiesta':
      return `
        <p class="ov-kicker ov-kicker-fiesta">${esc(capa.kicker)}</p>
        <h1 class="ov-fiesta">${esc(capa.texto)}</h1>
        <p class="ov-nota">${brs(capa.nota)}</p>`

    default:
      throw new Error(`Tipo de capa desconocido: ${capa.tipo}`)
  }
}

/** HTML completo de un overlay. Fondo transparente salvo el velo de legibilidad. */
export async function html(capa, p, disposicion = 'pleno') {
  const dentro = await cuerpo(capa, p)
  const editorial = disposicion === 'editorial'

  // El velo va DENTRO del overlay: así ffmpeg oscurece el fondo y pone el texto
  // en una sola pasada de composición.
  //
  // En editorial el degradado es horizontal: oscurece la mitad del texto y deja
  // limpia la derecha, donde después se pega el panel con la foto vertical.
  const banda = capa?.tipo === 'banda'

  const velo = banda
    ? 'transparent'   // la banda pone su propio fondo; el resto de la rejilla se ve
    : editorial
      ? `linear-gradient(90deg, rgba(10,5,3,.90) 0%, rgba(10,5,3,.84) 42%, rgba(10,5,3,.55) 68%, rgba(10,5,3,.30) 100%)`
      : capa
        ? `radial-gradient(72% 64% at 50% 50%, rgba(10,5,3,.42) 0%, rgba(10,5,3,.72) 68%, rgba(10,5,3,.88) 100%)`
        : `radial-gradient(76% 68% at 50% 50%, rgba(10,5,3,0) 0%, rgba(10,5,3,.30) 72%, rgba(10,5,3,.62) 100%)`

  // En editorial el texto se confina a la izquierda y se alinea a bandera
  const caja = editorial
    ? `left:${MARGEN}px;right:${ANCHO - 1100}px;top:${MARGEN}px;bottom:${MARGEN}px;align-items:flex-start;text-align:left`
    : `inset:${MARGEN}px;align-items:center;text-align:center`

  return `<!doctype html><html><head><meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${FUENTES.href}" rel="stylesheet" />
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${ANCHO}px;height:${ALTO}px;background:transparent;overflow:hidden;
    -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
  #ov{position:relative;width:${ANCHO}px;height:${ALTO}px;background:${velo};color:${p.texto};
    font-family:${FUENTES.base}}
  #in{position:absolute;display:flex;flex-direction:column;justify-content:center;${caja}}
  #in>*{flex-shrink:0}

  .ov-logo{width:290px;height:auto;margin-bottom:14px;filter:drop-shadow(0 6px 34px rgba(0,0,0,.75))}
  .ov-crest{width:180px;height:auto;margin-bottom:34px;filter:drop-shadow(0 5px 26px rgba(0,0,0,.7))}

  .ov-script{font-family:${FUENTES.script};font-size:60px;line-height:1.2;color:${p.texto};margin-bottom:10px}
  .ov-script-xl{font-size:132px;margin-bottom:6px;color:${p.rubor}}
  .ov-nombre{font-family:${FUENTES.display};font-weight:300;font-size:168px;line-height:.86;letter-spacing:-.03em;color:${p.texto}}
  .ov-nombre-it{font-style:italic;color:${p.rubor}}
  .ov-amp{font-family:${FUENTES.script};font-size:96px;line-height:1.35;color:${p.oro};margin:2px 0}
  .ov-rings{width:104px;height:36px;margin:22px 0 4px;fill:none;stroke:${p.textoSoft};stroke-width:1.5}

  .ov-kicker{font-size:32px;letter-spacing:.36em;text-transform:uppercase;color:${p.oro};font-weight:300;margin-bottom:22px}
  .ov-kicker-fiesta{color:${p.arena};letter-spacing:.42em}
  .ov-titulo{font-family:${FUENTES.display};font-weight:300;font-size:142px;line-height:1.02;letter-spacing:-.02em;max-width:1560px}
  .ov-grande{font-family:${FUENTES.display};font-weight:400;font-size:210px;line-height:1;letter-spacing:-.02em;color:${p.rubor};
    text-shadow:0 0 70px ${p.accDk}}
  .ov-nota{font-size:38px;line-height:1.65;letter-spacing:.13em;font-weight:300;color:${p.textoSoft};margin-top:6px}
  .ov-verso{font-family:${FUENTES.display};font-weight:300;font-style:italic;font-size:82px;line-height:1.45;max-width:1600px}
  .ov-ref{font-size:26px;letter-spacing:.3em;text-transform:uppercase;color:${p.textoSoft};margin-top:34px}

  /* Banda: franja a todo el ancho, con desvanecido arriba y abajo para que
     no corte en seco contra las celdas del mosaico */
  .ov-banda{width:${ANCHO}px;padding:44px 0 52px;text-align:center;
    background:linear-gradient(180deg,
      rgba(10,5,3,0) 0%, rgba(10,5,3,.80) 22%, rgba(10,5,3,.90) 50%,
      rgba(10,5,3,.80) 78%, rgba(10,5,3,0) 100%)}
  .ov-banda .ov-kicker{margin-bottom:10px}
  .ov-banda .ov-grande{font-size:168px}
  .ov-banda .ov-nota{margin-top:10px}

  .ov-rule{display:flex;align-items:center;gap:20px;margin:34px 0}
  .ov-rule span{width:200px;height:1px;background:linear-gradient(90deg,transparent,${p.textoSoft},transparent)}

  .ov-fiesta{font-family:${FUENTES.base};font-weight:500;font-size:224px;line-height:1;letter-spacing:-.02em;text-transform:uppercase;
    background:linear-gradient(180deg, ${p.arena} 0%, ${p.oro} 42%, ${p.acc} 100%);
    -webkit-background-clip:text;background-clip:text;color:transparent;
    filter:drop-shadow(0 10px 44px ${p.accDk})}
  ${editorial ? `
  .ov-logo{width:210px}
  .ov-crest{width:140px;margin-bottom:26px}
  .ov-script{font-size:46px}
  .ov-script-xl{font-size:92px}
  .ov-nombre{font-size:116px}
  .ov-amp{font-size:66px}
  .ov-kicker{font-size:24px;letter-spacing:.30em;margin-bottom:16px}
  .ov-titulo{font-size:96px;max-width:1004px}
  .ov-grande{font-size:132px}
  .ov-nota{font-size:28px}
  .ov-verso{font-size:56px;max-width:1004px}
  .ov-ref{font-size:20px;margin-top:26px}
  .ov-rule{margin:26px 0}
  .ov-rule span{width:130px}
  .ov-rings{margin:16px 0 4px}
  ` : ''}
</style></head><body><div id="ov"><div id="in">${dentro}</div></div></body></html>`
}

/** Renderiza el overlay de una escena a PNG con alfa. Devuelve el Buffer. */
export async function render(page, capa, p, disposicion = 'pleno') {
  // 'load' y no 'networkidle0': las conexiones a Google Fonts quedan abiertas y
  // la red nunca llega a estar ociosa, así que networkidle0 agota el tiempo.
  // La garantía real de que las fuentes están listas es document.fonts.ready.
  await page.setContent(await html(capa, p, disposicion), { waitUntil: 'load', timeout: 60000 })
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map(i => i.complete ? null : new Promise(r => { i.onload = r; i.onerror = r })))
  })
  return page.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: ANCHO, height: ALTO } })
}
