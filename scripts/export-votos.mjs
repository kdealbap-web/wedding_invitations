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

// ─── Los votos ───
//
// `p` va en cursiva, que es el cuerpo. `fuerte` es redonda y un punto más
// grande: lo que hay que poder encontrar de un vistazo. `lista` son las
// promesas, una por renglón. `cita` es Colosenses. `firma` cierra.
//
// El reparto en páginas es a mano y a propósito: ninguna página corta una idea
// por la mitad, y cada una termina donde se puede levantar la vista.
const VOTOS = [
  { pag: 1, tipo: 'saludo', texto: 'Angely,' },
  { pag: 1, tipo: 'p', texto: 'Antes de decirte nada a ti, quiero darle gracias a Dios. Porque yo hoy estoy aquí parado, pero el camino que me trajo hasta este altar no lo tracé yo. Gracias, Señor, por ponerla en mi vida cuando yo ni sabía lo que estaba pidiendo.' },
  { pag: 1, tipo: 'p', texto: 'Te conocí cuando yo tenía veintiún años. Éramos aprendices, no éramos nada todavía, y me acuerdo perfecto de la primera vez que te vi. Te dije que no te conocía, pero que me provocaba abrazarte. No sabía por qué. Hoy sé por qué: porque siete años después tus brazos siguen siendo el único lugar donde de verdad descanso. Tú me das calma, mi amor. Estar contigo es estar a salvo.' },
  { pag: 1, tipo: 'p', texto: 'Después vinieron las canciones. Esas que empezaron siendo dedicadas y terminaron siendo nuestras. Las miradas que nadie entendía. Los secretos que solo sabíamos los dos.' },
  { pag: 1, tipo: 'p', texto: 'Yo llegué a ti con veintiún años y con las manos vacías. No sabía amar. De verdad, no sabía. Lo único que tenía era las ganas: yo decía que estaba listo para entregar y para dar amor, aunque no tuviera ni idea de cómo se hacía. Y me puse a aprender contigo. Con detalles. Con atención. Un día y otro y otro, hasta que me diste la oportunidad. Esa oportunidad es lo más grande que me ha pasado, y no ha habido un solo día en que no la agradezca.' },

  { pag: 1, tipo: 'fuerte', texto: 'Y de ahí en adelante, lo que arriesgamos.' },
  { pag: 1, tipo: 'p', texto: 'Nuestro primer viaje juntos. Las escapadas. La pandemia, cuando estaba prohibido todo y yo igual cruzaba a verte a escondidas, porque no verte no era una opción. Los viajes que hicimos sin decirle a nadie, a otra ciudad, inventando cualquier cosa. Las veces que cogí el primer avión de la mañana nada más para estar contigo un día. Las rodadas. Los viajes. Las noches de vino. Las noches de cine. Las risas que nos dejaron sin aire. Lo que nos escondimos, lo que nos inventamos, lo que nos costó.' },
  { pag: 1, tipo: 'p', texto: 'Todo eso lo hicimos para llegar hasta aquí. Y volvería a hacerlo todo otra vez.' },
  { pag: 1, tipo: 'p', texto: 'Pero si tengo que decir de verdad qué es lo que más te agradezco, no son los viajes. Es lo que hiciste conmigo.' },
  { pag: 1, tipo: 'p', texto: 'Tú me enseñaste a cocinar. Me enseñaste a resolver. Me enseñaste a ser hombre de hogar. Me cuidaste cada vez que estuve enfermo, sin quejarte ni una vez. Me aconsejaste hasta en lo profesional, me guiaste, confiaste en mí cuando yo mismo no confiaba, y me sacaste de donde yo estaba cómodo. Porque yo estaba tranquilo en mi casa, con mi familia, en ese hogar hermoso donde crecí — y tú me empujaste a salir. A crecer. A dar el paso de construir el nuestro.' },
  { pag: 2, tipo: 'p', texto: 'Tú viste a este hombre nacer. Me conociste de veintiuno; hoy tengo veintiocho. Y todo lo que hay de más en mí — el carácter, la madurez, las ganas de responder — lo viste crecer tú y lo hiciste crecer tú. Por dentro sigo siendo el mismo niño enamorado de la primera vez. Ese no se fue. Ese sigue aquí, con las mismas ganas de hacerte feliz toda una vida.' },

  { pag: 2, tipo: 'p', texto: 'No todo fue bonito, y lo digo aquí porque es verdad. Hubo días grises. Días en que quisimos rendirnos, los dos. Días en que parecía más fácil soltar. Y no soltamos. Eso es lo que hoy nos tiene parados frente a este altar, y por eso también le doy gracias a Dios: porque en esos días Él nos sostuvo cuando nosotros ya no podíamos.' },
  { pag: 2, tipo: 'p', texto: 'Sé que hay gente que se pregunta por qué casarse tan joven. Que piensa que uno se está perdiendo la vida. Yo no me estoy perdiendo nada. Yo encontré con quién vivirla, y decidí no esperar más para empezar.' },
  { pag: 2, tipo: 'p', texto: 'Nosotros nos parecemos en muchísimo, pero somos distintos. Vemos la vida distinto, tenemos genios distintos, venimos de casas distintas. Y yo aprendí — me costó, pero aprendí — que es justo ahí donde nace la unión. No en ser iguales: en encajar.' },
  { pag: 2, tipo: 'fuerte', texto: 'Por eso hoy, delante de Dios y delante de nuestras familias, no te prometo palabras bonitas. Te prometo hechos.' },
  { pag: 2, tipo: 'lista', texto: [
    'Escucharte de verdad, aunque esté cansado.',
    'Pedirte perdón rápido y sin excusas, que es lo que más me cuesta.',
    'Cuidarte en lo pequeño, que es donde el amor se comprueba.',
    'Hacer de nuestra casa un lugar de paz, donde se ría, se ore y siempre quepa alguien más.',
    'Ser tu compañero, tu equipo y tu refugio.',
    'No soltarte nunca. Ni en los días grises.',
  ] },

  { pag: 2, tipo: 'p', texto: 'Y le pido a Dios la gracia de amarte mejor de lo que puedo solo. Porque solo no puedo, y ya lo sé. Que me enseñe a perdonar más rápido, a hablar con verdad y a tratarte siempre con ternura. Que nos dé sabiduría para saber cuándo hablar y cuándo callar, cuándo insistir y cuándo simplemente abrazar. Que nos guarde los años que vienen, los buenos y los otros.' },
  { pag: 2, tipo: 'p', texto: 'En la tarjeta que les llegó a todos ustedes escribimos una frase:' },
  { pag: 2, tipo: 'cita', texto: '«Sobre todo, vístanse de amor,<br>que es el vínculo perfecto.»' },
  { pag: 2, tipo: 'p', texto: 'La digo hoy en voz alta, porque es lo que le pido a nuestro matrimonio: que sea eso lo que nos vista cada día.' },
  { pag: 2, tipo: 'p', texto: 'Hoy no nos unimos solo tú y yo. Hoy, en el nombre de Dios, se unen oficialmente dos familias. Y todos los caminos raros, escondidos y arriesgados que tomamos eran, al final, los caminos de Él para traernos hasta este momento.' },
  { pag: 2, tipo: 'p', texto: 'Siete años, mi amor. Tantas aventuras, tantos capítulos. Y esto apenas está empezando.' },
  { pag: 2, tipo: 'fuerte', texto: 'Hoy, sabiendo todo lo que sé de ti y todo lo que sabes tú de mí, te vuelvo a escoger.' },
  { pag: 2, tipo: 'firma', texto: 'Hoy, mañana y siempre.<br>Te amo.' },
]

const PAGINAS = [...new Set(VOTOS.map(b => b.pag))].sort((a, b) => a - b)

// ─── La tarjeta de las flores ───
//
// Va con el ramo que le llega en la mañana, mientras se arregla. NO es el voto
// en pequeño: el voto es promesa y se dice en el altar; esto es memoria y
// calma, y se lee sola, en bata, con las amigas alrededor y los nervios
// encima. Por eso termina diciéndole qué NO tiene que hacer hoy.
//
// A6 APAISADA (14,8 × 10,5) —un cuarto de A4—, a dos columnas: cabe en la mano
// y en el sobre de una floristería, y no deja media tarjeta en blanco.
//
// No lleva la plantilla de la boda —ni marco doble, ni esquinas, ni escudo—: si
// llega con el mismo vestido que el resto de la papelería se lee como una pieza
// más. Va al revés: papel limpio, un siete gigante en terracota clarísima
// detrás del texto y el nombre de él escrito a mano al final. Se parece más a
// una carta que a una tarjeta, que es lo que es.
const FLORES = {
  w: 14.8, h: 10.5,
  titulo: 'SIETE AÑOS',
  fecha: '12 · IX · 2026',
  bloques: [
    { tipo: 'saludo', texto: 'Angely,' },
    { tipo: 'p', texto: 'Feliz aniversario, mi amor. Siete años. Y mira qué cosa tan bonita, que el día en que cumplimos siete sea el día en que nos casamos.' },
    { tipo: 'p', texto: 'Mientras te arreglas, acuérdate. De los dos aprendices que éramos. De que te dije que no te conocía pero me provocaba abrazarte. De los viajes que hicimos sin decirle a nadie. De cruzar la ciudad a escondidas en plena pandemia. Del primer avión de la mañana solo para pasar un día contigo. De las noches de vino y de las risas que nos dejaron sin aire. Y de los días grises, los que quisimos rendirnos y no lo hicimos. Todo eso era para llegar a hoy.' },
    { tipo: 'p', texto: 'No es la primera vez que te mando flores. Pero estas son distintas: hoy no celebramos solamente siete años. El siete, en la Biblia, es el número de la plenitud, lo que queda completo. Esto no es un aniversario más: es una etapa que se cierra entera para que empiece la que sigue.' },
    { tipo: 'fuerte', texto: 'Siete años para llegar hasta acá. Ni uno de más, ni uno de menos.' },
    { tipo: 'p', texto: 'Hoy no tienes que estar perfecta. Ya está todo hecho. Lo único que tienes que hacer hoy es ser tú, que es lo que llevo siete años admirando. Respira. Ríete con las tuyas. Déjate consentir.' },
    { tipo: 'p', texto: 'Y cuando estés lista, camina tranquila: al final del pasillo voy a estar yo, con la misma cara de bobo del primer día.' },
    { tipo: 'cierre', texto: 'Nos vemos en un rato.' },
  ],
}

function htmlFlores() {
  const F = FLORES
  const cuerpo = F.bloques.map(b =>
    b.tipo === 'saludo' ? `<p class="saludo">${esc(b.texto)}</p>`
    : b.tipo === 'fuerte' ? `<p class="fuerte">${esc(b.texto)}</p>`
    : b.tipo === 'cierre' ? `<p class="cierre">${esc(b.texto)}</p>`
    : `<p>${esc(b.texto)}</p>`).join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FUENTES}"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  .hoja{width:${cm(F.w)}px;height:${cm(F.h)}px;background:#FDF8F1;color:#221610;
    position:relative;overflow:hidden;padding:${cm(0.8)}px ${cm(0.9)}px ${cm(0.7)}px;
    display:flex;flex-direction:column;-webkit-font-smoothing:antialiased}

  /* El siete, enorme y clarísimo, detrás de todo. Es la única decoración: la
     tarjeta no lleva marco ni flores ni escudo a propósito. */
  /* El siete completo, no un trozo: es la única pieza gráfica de la tarjeta y
     tiene que leerse como un siete. */
  .siete{position:absolute;right:${cm(0.3)}px;bottom:${cm(-0.9)}px;
    font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;
    font-size:${cm(5.4)}px;line-height:.78;color:#9A5B45;opacity:.085;letter-spacing:-.04em}

  .hoja > *:not(.siete){position:relative;z-index:1}

  .cab{display:flex;align-items:baseline;gap:${cm(0.4)}px;
    font-family:Jost,system-ui,sans-serif;font-size:9px;letter-spacing:.3em;
    color:#B08C4F;padding-bottom:${cm(0.22)}px;border-bottom:1px solid #E6D8BE;
    margin-bottom:${cm(0.35)}px}
  .cab b{font-weight:400}
  .cab span{margin-left:auto;color:#C0B3A3;letter-spacing:.2em}

  /* Dos columnas: apaisada y a una sola, el renglón sale de 120 caracteres.
     Se balancean las dos: con column-fill auto se llena la primera y la
     segunda queda vacía, que es media tarjeta en blanco. */
  .txt{flex:1;min-height:0;column-count:2;column-gap:${cm(0.7)}px;column-fill:balance;
    font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;
    font-size:17px;line-height:1.5}
  .txt p{margin-bottom:${cm(0.24)}px}
  .saludo{font-style:normal;font-weight:600;font-size:22px;color:#9A5B45;
    margin-bottom:${cm(0.22)}px !important}
  .fuerte{font-style:normal;font-weight:500;font-size:18px;color:#7E2E1B;
    line-height:1.34;break-inside:avoid}
  .cierre{font-style:italic;font-size:18px;color:#7E2E1B;margin-top:${cm(0.12)}px;
    break-inside:avoid}

  .firma{display:flex;align-items:baseline;justify-content:flex-end;gap:${cm(0.4)}px;
    margin-top:${cm(0.15)}px}
  .firma b{font-family:'Great Vibes',cursive;font-weight:400;
    font-size:26px;color:#9A5B45;line-height:1.1}
  .firma span{font-family:Jost,system-ui,sans-serif;font-size:8px;
    letter-spacing:.24em;color:#C0B3A3}
</style></head><body><div class="hoja">
  <div class="siete">7</div>
  <div class="cab"><b>${F.titulo}</b><span>${F.fecha}</span></div>
  <div class="txt">${cuerpo}</div>
  <div class="firma"><b>Kevin</b><span>TE AMO</span></div>
</div></body></html>`
}


function bloque(b) {
  if (b.tipo === 'saludo') return `<p class="saludo">${esc(b.texto)}</p>`
  if (b.tipo === 'fuerte') return `<p class="fuerte">${esc(b.texto)}</p>`
  if (b.tipo === 'cita')   return `<p class="cita">${b.texto}</p>`
  if (b.tipo === 'firma')  return `<p class="firma">${b.texto}</p>`
  if (b.tipo === 'lista')  return `<ul class="lista">${b.texto.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
  return `<p>${esc(b.texto)}</p>`
}

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
