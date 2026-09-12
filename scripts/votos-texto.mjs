/**
 * El texto de los votos y el de la tarjeta de las flores.
 *
 * Están aquí y no dentro de un generador porque los usan DOS: `export-votos`
 * los maqueta en A4 para leer en el altar, y `export-mesas-img` los vuelve a
 * maquetar —más apretados— en el hueco que sobra del último pliego tabloide de
 * las tarjetas de agradecimiento. Duplicarlos era garantizar que un día se
 * corrigiera una coma en uno y no en el otro.
 *
 * Aquí sólo va el TEXTO. Cada generador pone su propia maqueta, que es distinta
 * a propósito: la de A4 se lee de pie y la del pliego se lleva en el bolsillo.
 */

// ─── Los votos ───
//
// `p` va en cursiva, que es el cuerpo. `fuerte` es redonda y un punto más
// grande: lo que hay que poder encontrar de un vistazo. `lista` son las
// promesas, una por renglón. `cita` es Colosenses. `firma` cierra.
//
// El reparto en páginas es a mano y a propósito: ninguna página corta una idea
// por la mitad, y cada una termina donde se puede levantar la vista.
export const VOTOS = [
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
export const FLORES = {
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

// ─── La maqueta de la tarjeta de flores ───
//
// Va aquí y no en el generador porque la dibujan los dos: suelta en A6 y otra
// vez, girada, en el hueco del pliego. Se emite con el selector del contenedor
// por delante para poder montarla en cualquier caja sin que sus clases choquen
// con las de la hoja que la recibe.
//
// `cm` y `esc` entran por parámetro: los dos scripts ya los tienen y no vale la
// pena repetirlos aquí.
export const estiloFlores = (sel, cm) => `
  ${sel}{width:${cm(FLORES.w)}px;height:${cm(FLORES.h)}px;background:#FDF8F1;color:#221610;
    overflow:hidden;padding:${cm(0.8)}px ${cm(0.9)}px ${cm(0.7)}px;
    display:flex;flex-direction:column;-webkit-font-smoothing:antialiased}

  /* El siete completo, no un trozo: es la única pieza gráfica de la tarjeta
     —no lleva marco, ni flores, ni escudo— y tiene que leerse como un siete. */
  ${sel} .siete{position:absolute;right:${cm(0.3)}px;bottom:${cm(-0.9)}px;
    font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;
    font-size:${cm(5.4)}px;line-height:.78;color:#9A5B45;opacity:.085;letter-spacing:-.04em}
  ${sel} > *:not(.siete){position:relative;z-index:1}

  ${sel} .cab{display:flex;align-items:baseline;gap:${cm(0.4)}px;
    font-family:Jost,system-ui,sans-serif;font-size:9px;letter-spacing:.3em;
    color:#B08C4F;padding-bottom:${cm(0.22)}px;border-bottom:1px solid #E6D8BE;
    margin-bottom:${cm(0.35)}px}
  ${sel} .cab b{font-weight:400}
  ${sel} .cab span{margin-left:auto;color:#C0B3A3;letter-spacing:.2em}

  /* Dos columnas: apaisada y a una sola, el renglón sale de 120 caracteres.
     Se balancean las dos: con column-fill auto se llena la primera y la
     segunda queda vacía, que es media tarjeta en blanco. */
  ${sel} .txt{flex:1;min-height:0;column-count:2;column-gap:${cm(0.7)}px;column-fill:balance;
    font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;
    font-size:17px;line-height:1.5}
  ${sel} .txt p{margin-bottom:${cm(0.24)}px}
  ${sel} .saludo{font-style:normal;font-weight:600;font-size:22px;color:#9A5B45;
    margin-bottom:${cm(0.22)}px !important}
  ${sel} .fuerte{font-style:normal;font-weight:500;font-size:18px;color:#7E2E1B;
    line-height:1.34;break-inside:avoid}
  ${sel} .cierre{font-style:italic;font-size:18px;color:#7E2E1B;margin-top:${cm(0.12)}px;
    break-inside:avoid}

  ${sel} .firma{display:flex;align-items:baseline;justify-content:flex-end;gap:${cm(0.4)}px;
    margin-top:${cm(0.15)}px}
  ${sel} .firma b{font-family:'Great Vibes',cursive;font-weight:400;
    font-size:26px;color:#9A5B45;line-height:1.1}
  ${sel} .firma span{font-family:Jost,system-ui,sans-serif;font-size:8px;
    letter-spacing:.24em;color:#C0B3A3}
`

export const cuerpoFlores = esc => {
  const bloques = FLORES.bloques.map(b =>
    b.tipo === 'saludo' ? `<p class="saludo">${esc(b.texto)}</p>`
    : b.tipo === 'fuerte' ? `<p class="fuerte">${esc(b.texto)}</p>`
    : b.tipo === 'cierre' ? `<p class="cierre">${esc(b.texto)}</p>`
    : `<p>${esc(b.texto)}</p>`).join('')

  return `<div class="siete">7</div>
  <div class="cab"><b>${FLORES.titulo}</b><span>${FLORES.fecha}</span></div>
  <div class="txt">${bloques}</div>
  <div class="firma"><b>Kevin</b><span>TE AMO</span></div>`
}

// ─── Los votos, bloque a bloque ───
//
// El HTML de cada bloque es el mismo en las dos maquetas; lo que cambia entre
// ellas es el CSS, que es justo lo que tiene que cambiar.
export const bloqueVoto = (b, esc) =>
    b.tipo === 'saludo' ? `<p class="saludo">${esc(b.texto)}</p>`
  : b.tipo === 'fuerte' ? `<p class="fuerte">${esc(b.texto)}</p>`
  : b.tipo === 'cita'   ? `<p class="cita">${b.texto}</p>`
  : b.tipo === 'firma'  ? `<p class="firma">${b.texto}</p>`
  : b.tipo === 'lista'  ? `<ul class="lista">${b.texto.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
  : `<p>${esc(b.texto)}</p>`
