/**
 * El guion musical de la recepción: el minuto a minuto con lo que pasa en cada
 * momento, lo que hay que pedirle al DJ ahí y una propuesta de canción.
 *
 * Está aquí y no dentro de un generador porque lo usan DOS: `export-mesas-img`
 * lo imprime en hojas A4 para la cabina y `export-dj` lo vuelca a un Excel que
 * el DJ rellena. Duplicarlo era garantizar que un día se cambiara una canción
 * en uno y no en el otro.
 */

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
// Cada momento: [hora, qué es, qué pasa, qué necesita el DJ, canciones propuestas].
//
// Las horas salen del programa —ceremonia 6:30, recepción 8:30— y son
// orientativas: lo que importa es el ORDEN y qué viene después de qué. La
// columna del DJ es lo que se le pide en ese punto, que suele ser lo que se
// olvida: un micrófono, bajar el volumen, un aviso con dos minutos de antelación.
// Las dos piezas del violín viven con el resto de la ceremonia: son un dato de
// la iglesia, no del guion de la recepción. Van igualmente en la lista del DJ
// para que no haya una sola canción de la noche sin escribir.
import { MUSICA_CEREMONIA } from './ceremonia.mjs'

export const GUION = [
  ['6:30', 'Ceremonia', 'Parroquia San Luis Beltrán. Dos horas antes de la recepción. Ver la hoja «Orden de entrada».',
    'El DJ NO interviene: en la iglesia toca el violín. Va aquí para que la lista de la noche esté completa.',
    MUSICA_CEREMONIA],
  ['7:45', 'Salida y fotos', 'Arroz y burbujas en el atrio, fotos con la familia.',
    'Traslado al salón: los invitados llegan repartidos entre 8:15 y 9:00.', []],

  ['8:30', 'Apertura de puertas', 'Cóctel. La gente entra, busca su nombre en el afiche de la entrada y se sienta.',
    'Volumen BAJO: se está conversando y buscando mesa.',
    ['Perfect · Ed Sheeran (acústico)', 'All of Me · John Legend', 'Vallenato romántico de fondo']],
  ['9:00', 'Los últimos en llegar', 'Ya casi todos sentados. Los capitanes con su banderín puesto.',
    'Aviso a la pareja: faltan diez minutos. Sube medio punto el volumen.',
    ['Sigue el fondo, un poco más arriba']],
  ['9:10', 'ENTRADA DE LOS NOVIOS', 'El momento de más ruido de la noche. Todos de pie.',
    'Micrófono listo para quien los anuncia. Entrada fuerte desde el primer compás.',
    ['Volví a Nacer · Carlos Vives', 'La Tierra del Olvido · Carlos Vives', 'Marry You · Bruno Mars']],
  ['9:20', 'Primer baile', 'Angely y Kevin solos en la pista.',
    'Luz sobre la pista. Al minuto y medio se invita a los papás a entrar.',
    ['Perfect · Ed Sheeran', 'All of Me · John Legend']],
  ['9:28', 'Baile con los padres', 'Se suman los cuatro papás, y detrás el resto de la familia.',
    'Enlazar sin cortar: la canción anterior baja y ésta entra encima.',
    ['Mi Primer Amor · Diomedes Díaz', 'A mi Manera · Vicente Fernández']],
  ['9:38', 'Palabras de bienvenida', 'Hablan los novios, o quien los acompañe.',
    'MÚSICA FUERA. Dos micrófonos: uno para cada uno.', []],
  ['9:45', 'BRINDIS', '«¡Vivan Angely y Kevin!» — los once capitanes levantan su mesa.',
    'Un tema corto y arriba, y bajar en cuanto empiece el brindis.',
    ['Vivir Mi Vida · Marc Anthony', 'Celebra la Vida · Axel']],
  ['9:50', 'Cena', 'Servicio a la mesa. Es el rato largo de la noche.',
    'Fondo, sin pista. Nada que invite a levantarse todavía.',
    ['Salsa romántica y vallenato suave']],
  ['10:30', 'Ronda de mesas', 'Los novios pasan mesa por mesa con el fotógrafo.',
    'Sigue el fondo. Es el momento de preparar lo que viene.',
    ['Más de lo mismo, volumen estable']],
  ['10:40', 'Corte de la torta', 'Foto obligada, con la familia alrededor.',
    'Canción corta y alegre; termina cuando termina la foto.',
    ['Sugar · Maroon 5', 'La Vida Es Un Carnaval · Celia Cruz']],
  ['10:50', 'Aviso de pista', 'Se anuncia que se abre la pista.',
    'Micrófono al maestro de ceremonia. Último aviso antes del cambio de ritmo.', []],
  ['10:55', 'ARRANQUE DE FIESTA', 'Se abre la pista y ya no se cierra.',
    'Arrancar con lo que levanta a TODO el mundo, no con lo que levanta a algunos.',
    ['La Rebelión · Joe Arroyo', 'El Pegao · champeta', 'La Vaca y el Toro · Diomedes Díaz']],
  ['11:15', 'Hora loca', 'Entra la comparsa con los accesorios.',
    'Lo más arriba de la noche, sin bajar entre tema y tema.',
    ['Mapalé y champeta', 'Ram Pam Pam · Natti Natasha', 'Mix de merengue']],
  ['11:45', 'LAS CANCIONES DE LAS MESAS', 'Once canciones que eligieron los invitados. Ver el listado del final.',
    'REPARTIDAS, no seguidas: una cada quince o veinte minutos, entre lo demás.',
    ['Su capitán la está esperando y levanta la mesa']],
  ['12:15', 'Recena', 'Se sirve algo salado para el segundo aire.',
    'La pista NO para: se come de pie y se sigue bailando.',
    ['Lo más bailable, sin pausas']],
  ['12:45', 'Ramo y liga', 'Solteras primero, solteros después.',
    'Micrófono para llamar. Dos temas cortos, uno para cada tanda.',
    ['Single Ladies · Beyoncé', 'Sexy and I Know It · LMFAO']],
  ['1:00', 'Segunda tanda', 'Queda la gente que se queda hasta el final.',
    'Aquí se puede ir a lo que pida la pista, sin guion.',
    ['Lo que esté funcionando esa noche']],
  ['1:30', 'CIERRE', 'La última, con todos en la pista y los novios en el centro.',
    'Avisar que es la última: la gente se acerca y la foto sale sola.',
    ['L\'Amour Toujours · Gigi D\'Agostino', 'Time of My Life · Bill Medley & Jennifer Warnes']],
]

// El guion no cabe en una A4: son veinte momentos y once canciones. Se parte en
// hojas de catorce momentos —lo que llena la hoja sin apretar— y las canciones
// van al final de la última.
export const POR_HOJA_GUION = 14

// ─── La hora, en minutos ───
//
// Las horas del guion van como se leen en Colombia —«9:10», «12:15», «1:30»— y
// cruzan la medianoche a mitad de la fiesta. Para poder restar una de otra hay
// que ponerlas en la misma recta: la noche empieza a las 6:30 PM, así que de 6
// a 11 se les suman 12 horas, las 12 son las 24 y de 1 a 5 ya es de madrugada.
// Sin esto, «1:00» vendría ANTES de «12:45» y todos los bloques saldrían en
// negativo a partir de la medianoche.
export function minutosDe(hora) {
  const [h, m] = hora.split(':').map(Number)
  const h24 = h === 12 ? 24 : h >= 6 ? h + 12 : h + 24
  return h24 * 60 + m
}

// El guion ya masticado: cada momento con su número, cuánto dura su bloque
// —hasta que empieza el siguiente— y si lleva música o no.
export const momentos = () => GUION.map(([hora, momento, pasa, dj, canciones], i) => {
  const inicio = minutosDe(hora)
  const sig = GUION[i + 1] ? minutosDe(GUION[i + 1][0]) : inicio + 30
  return {
    n: i + 1, hora, momento, pasa, dj, canciones,
    inicio,
    dura: sig - inicio,
    // Un momento en mayúsculas es de los que marcan la noche; lo decidió quien
    // escribió el guion al escribirlo así, y las dos salidas lo respetan.
    clave: momento === momento.toUpperCase(),
    sinMusica: canciones.length === 0,
  }
})
