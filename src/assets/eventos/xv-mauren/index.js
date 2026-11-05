// Fotos de Mauren, ingeridas con
//   npm run fotos-evento -- --desde="XV MAUREN" --evento=xv-mauren
// La plantilla XV encuentra este manifiesto por el slug del evento (carpeta =
// slug). `fondos` asigna una foto a cada sección por su id; las que no estén
// caen en `fotos`, en orden. `pos` es el background-position del recorte.
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
    x1:  { src: mil2149, pos: '50% 20%' },   // corona de noche, entre las palmeras
    x2:  { src: mil1445, pos: '50% 25%' },
    x3:  { src: mla2981, pos: '50% 30%' },
    x4:  { src: mla3567, pos: '50% 50%' },   // el espejo
    x5:  { src: mla3064, pos: '50% 40%' },   // el pasillo
    x6:  { src: mla2500, pos: '50% 30%' },   // los globos, en los tonos de la fiesta
    x7:  { src: mil1473, pos: '50% 30%' },
    x8:  { src: mil1166, pos: '50% 40%' },
    x9:  { src: mil1320, pos: '50% 25%' },
    x10: { src: mla3641, pos: '50% 60%' },   // el balcón al atardecer
  },
  // Para el panel lateral del hero y del RSVP
  retrato: mil1445,
}
