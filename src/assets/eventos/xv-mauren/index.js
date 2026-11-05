// Fotos de Mauren, ingeridas con
//   npm run fotos-evento -- --desde="XV MAUREN" --evento=xv-mauren
// La plantilla XV encuentra este manifiesto por el slug del evento (carpeta =
// slug). `fondos` asigna una foto a cada sección por su id; las que no estén
// caen en `fotos`, en orden.
//
// CÓMO ELEGIR LA FOTO DE UN SLIDE: cambia el nombre de la foto en su línea de
// `fondos` (p. ej. `x4: { src: mla3064, ... }` → `src: mla2330`) y copia el
// `pos` que figura en la tabla de abajo para esa foto. Nada más.
//
// `pos` es el background-position del recorte en MÓVIL (la foto va a sangre con
// cover). Con 390×844 de pantalla una vertical 2:3 enseña ~69 % del ancho, y una
// horizontal 3:2 solo ~31 %: por eso lo que importa es el primer valor (x), que
// deja la cara al centro de lo que se ve; el segundo (y) solo cuenta en tabletas.
// En ESCRITORIO (≥ 1024 px) la foto sale entera en un panel, así que `pos` no
// se usa ahí y no hay nada que recortar.
//
// Las tarjetas de contenido se asientan abajo en el móvil: la cara conviene que
// quede arriba (y < 35 %) o, si es horizontal, que el slide sea de contenido corto.
//
//  foto     formato  qué hay                                           pos
//  mil1166  H 3:2    primer plano con el pastel rosa; cara al centro    '50% 40%'
//  mil1250  V 2:3    en cuclillas con el pastel, estudio blanco        '86% 20%'
//  mil1320  V 2:3    escalera roja, el periódico le tapa la cara       '58% 30%'
//  mil1445  V 2:3    corona, barandal del hotel, mira a cámara         '59% 45%'
//  mil1473  V 2:3    de espaldas con corona, mira hacia atrás          '0% 28%'
//  mil2149  V 2:3    cuerpo entero con corona, de noche entre palmeras '31% 20%'
//  mla2322  V 2:3    sentada en banqueta gris, figura pequeña          '17% 28%'
//  mla2330  V 2:3    banqueta, vestido de lentejuelas, cara grande     '0% 22%'
//  mla2397  V 2:3    con el periódico «Reserva la fecha» abierto       '39% 27%'
//  mla2457  V 2:3    globos oro rosa y champán, cara a media altura    '33% 53%'
//  mla2500  V 2:3    foco de luz oscuro, globos, pastel (la más oscura)'33% 45%'
//  mla2554  V 2:3    vestido negro, globos negros en forma de perro    '32% 22%'
//  mla2600  V 2:3    vestido negro, gafas, globos negros               '10% 17%'
//  mla2981  V 2:3    corona, pastel rosa, globos al fondo (la luminosa)'7% 22%'
//  mla3064  V 2:3    de espaldas por el pasillo del hotel, corona      '0% 24%'
//  mla3567  H 3:2    el espejo: ella reflejada, pelo en primer plano   '10% 40%'
//  mla3641  H 3:2    balcón al atardecer, ella al centro, farol a la der. '49% 33%'
//
// Sin usar hoy (alternativas): mil1166, mil2149, mla2500, mla2600, mla3567.
// mil1320 (el cartel «Reserva la fecha») va sola en el último slide, x11.
import mil1166 from './mil1166.jpg'
import mil1250 from './mil1250.jpg'
import mil1320 from './mil1320.jpg'
import mil1445 from './mil1445.jpg'
import mil1473 from './mil1473.jpg'
import mil2149 from './mil2149.jpg'
import mla2322 from './mla2322.jpg'
import mla2330 from './mla2330.jpg'
import mla2397 from './mla2397.jpg'
import mla2457 from './mla2457.jpg'
import mla2500 from './mla2500.jpg'
import mla2554 from './mla2554.jpg'
import mla2600 from './mla2600.jpg'
import mla2981 from './mla2981.jpg'
import mla3064 from './mla3064.jpg'
import mla3567 from './mla3567.jpg'
import mla3641 from './mla3641.jpg'

const fotos = [
  mil2149, mil1445, mla2981, mla3567, mla3064, mla2500, mil1473, mil1166, mil1320, mla3641,
  mil1250, mla2322, mla2330, mla2397, mla2457, mla2554, mla2600,
]

export default {
  fotos,
  fondos: {
    x1:  { src: mla2981, pos: '7% 22%'  },   // hero: la más luminosa, corona y pastel
    x2:  { src: mla2330, pos: '0% 22%'  },   // mensaje
    x3:  { src: mil1473, pos: '0% 28%'  },   // tu invitación: la corona, el hotel
    x4:  { src: mil1250, pos: '86% 20%' },   // detalles: la tarjeta es alta y tapa media foto; cara arriba (y 13-23 %)
    x5:  { src: mla3064, pos: '0% 24%'  },   // vestuario: el vestido y el pasillo del salón
    x6:  { src: mla2322, pos: '17% 28%' },   // tonos (alternativa con globos: mla2457)
    x7:  { src: mla2554, pos: '32% 22%' },   // aviso
    x8:  { src: mla2397, pos: '39% 27%' },   // lluvia de sobres
    x9:  { src: mla2457, pos: '33% 53%' },   // RSVP (de fondo; la lateral es «retrato»): globos oro rosa
    x10: { src: mla3641, pos: '49% 33%' },   // cierre: el balcón al atardecer
    x11: { src: mil1320, pos: '50% 50%' },   // «Guarda la fecha»: SOLA, al final y entera (sin recorte, sin tarjeta)
  },
  // Para el panel lateral del hero y del RSVP
  retrato: mil1445,
}
