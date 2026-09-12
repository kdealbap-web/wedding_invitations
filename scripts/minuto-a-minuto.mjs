/**
 * El minuto a minuto del 12 de septiembre, con la música metida dentro.
 *
 * LAS DOS FUENTES, Y CUÁL MANDA
 *
 * El cronograma es el de la wedding planner («Minuto a minuto 12 septiembre.xlsx»)
 * y va COPIADO TAL CUAL: sus horas, sus tiempos, sus comentarios. No se corrige
 * ni se reordena nada, porque ese papel ya está en manos del salón, del catering
 * y de protocolo, y dos versiones distintas del mismo cronograma el día de la
 * boda es peor que cualquier error que pueda tener.
 *
 * La música es la lista que cerró Kevin con el DJ. Lo único que hace este módulo
 * es DECIR EN QUÉ LÍNEA DEL CRONOGRAMA SUENA CADA CANCIÓN, que es justo el dato
 * que no estaba en ninguno de los dos papeles.
 *
 * `musica: []` no es un olvido: es una línea del cronograma donde no hay canción
 * marcada. Se imprime vacía a propósito, para que se vea que se miró.
 *
 * Las once canciones de las mesas NO están aquí: viven en la base (`mesas.notas`)
 * porque las eligieron los invitados y cambian desde el panel. Se traen al
 * generar.
 */

// Quién pone la música en cada sitio. Son dos personas distintas y en dos
// lugares distintos, y confundirlas es el error caro de la noche.
export const VIOLIN = 'Enrique Sining · violín'
export const DJ     = 'DJ Farru'

export const PROGRAMA = [
  { ini: '8:00 a. m.', fin: '9:00 a. m.', dur: '1:00', bloque: 'preparativos',
    que: 'Llegada del equipo, revisión del salón, montaje floral, mobiliario, sonido e iluminación.',
    nota: 'Wedding planner y proveedores.', musica: [] },
  { ini: '9:00 a. m.', fin: '12:30 p. m.', dur: '3:30', bloque: 'preparativos',
    que: 'Maquillaje y peinado de la novia. Preparación del vestido, accesorios y detalles.',
    nota: 'Coordinar maquilladora, fotógrafo y familiares.', musica: [] },
  { ini: '3:30 p. m.', fin: '4:00 p. m.', dur: '0:30', bloque: 'preparativos',
    que: 'Llegada del fotógrafo y videógrafo. Fotos de detalles: anillos, vestido, ramo e invitaciones.',
    nota: 'Verificar cronograma.', musica: [] },
  { ini: '4:00 p. m.', fin: '4:15 p. m.', dur: '0:15', bloque: 'preparativos',
    que: 'Vestido de la novia y retoques finales.', nota: 'Wedding planner.', musica: [] },
  { ini: '4:15 p. m.', fin: '4:30 p. m.', dur: '0:15', bloque: 'preparativos',
    que: 'Sesión de fotos individual de la novia.', nota: 'Fotógrafo.', musica: [] },
  { ini: '4:30 p. m.', fin: '5:30 p. m.', dur: '1:00', bloque: 'preparativos',
    que: 'Sesión de fotos de los novios.', nota: 'Fotógrafo y protocolo.', musica: [] },
  { ini: '5:30 p. m.', fin: '6:30 p. m.', dur: '1:00', bloque: 'preparativos',
    que: 'Llegada de damas, caballeros y familiares. Fotos grupales.',
    nota: 'Coordinar orden de ingreso.', musica: [] },
  { ini: '6:30 p. m.', fin: '6:50 p. m.', dur: '0:20', bloque: 'preparativos',
    que: 'Salida hacia la iglesia.', nota: 'Confirmar transporte (madrina).', musica: [] },

  { ini: '6:50 p. m.', fin: '7:00 p. m.', dur: '0:20', bloque: 'iglesia',
    que: 'Llegada de invitados y ubicación.', nota: 'Protocolo.', musica: [] },
  { ini: '7:00 p. m.', fin: '7:40 p. m.', dur: '0:40', bloque: 'iglesia', clave: true,
    que: 'Ceremonia e ingreso de la novia.',
    nota: 'Música y tiempos. Volcanes 2 · Dinastía.',
    musica: [
      { momento: 'Entrada de la corte y del novio', cancion: 'A Thousand Years', artista: 'Christina Perri',
        quien: VIOLIN, nota: 'Ver la hoja «Orden de entrada»: once entradas, en ese orden.' },
      { momento: 'Entrada de la novia', cancion: 'Marcha Nupcial', quien: VIOLIN },
    ] },
  { ini: '7:40 p. m.', fin: '8:00 p. m.', dur: '0:20', bloque: 'iglesia',
    que: 'Salida de los novios y traslado a la casona. Protocolo verifica que en el plato base estén: almendras, recordatorio, tabla de queso y tarjeta de agradecimiento.',
    nota: 'Transporte madrina.',
    musica: [{ momento: 'Salida de los novios', cancion: 'Perfect', quien: VIOLIN }] },

  { ini: '8:00 p. m.', fin: '8:30 p. m.', dur: '0:30', bloque: 'recepcion',
    que: 'Cóctel de bienvenida. Salón Casona del Prado.',
    nota: 'Coordinar catering. Protocolo avisa que llegan invitados y se debe servir el cóctel.',
    musica: [{ momento: 'Fondo del cóctel', cancion: 'Sin canción marcada · a criterio del DJ',
      quien: DJ, suave: true, nota: 'Volumen bajo: se está conversando y buscando mesa en el afiche de la entrada.' }] },
  { ini: '8:30 p. m.', fin: '8:45 p. m.', dur: '0:15', bloque: 'recepcion', clave: true,
    que: 'Entrada oficial de los novios.',
    nota: 'DJ. Efectos sparkulas · Dinastía.',
    musica: [
      { momento: 'Entrada de caballeros', cancion: 'UEFA Champions League Song', quien: DJ },
      { momento: 'Entrada de damas', cancion: 'Crazy in Love', artista: 'Beyoncé', quien: DJ },
      { momento: 'ENTRADA DE LOS NOVIOS', cancion: 'Jamaica', artista: 'Bam Bam remix', quien: DJ,
        nota: 'Alguien tiene que hablar: pedir que suban las servilletas y se pongan de pie.' },
    ] },
  { ini: '8:45 p. m.', fin: '9:00 p. m.', dur: '0:15', bloque: 'recepcion',
    que: 'Brindis.',
    nota: 'Micrófono listo (producción). Champaña lista por meseros; debe servirse en cuanto entren los invitados. Fotos con los padres.',
    musica: [] },
  { ini: '9:00 p. m.', fin: '9:10 p. m.', dur: '0:10', bloque: 'recepcion', clave: true,
    que: 'Baile principal de los novios y vals con padres y familiares.',
    nota: 'Humo bajo (Dinastía). Música por el DJ. Protocolo tiene listas las botellas de los capitanes con sus bandas.',
    musica: [
      { momento: 'Baile principal', cancion: 'Perfect', artista: 'Ed Sheeran', quien: DJ,
        nota: 'Humo bajo y luces enfocadas sobre la pista.' },
      { momento: 'Vals con padres y familiares', cancion: 'Danubio Azul', quien: DJ },
    ] },
  { ini: '9:10 p. m.', fin: '9:20 p. m.', dur: '0:10', bloque: 'recepcion', clave: true,
    que: 'Licor: entrega de las botellas a los capitanes.',
    nota: 'Botellas con volcanes y banda. Tener encendedor.',
    musica: [{ momento: 'Entrega de capitanes', cancion: 'Stereo Love', artista: 'original mix', quien: DJ,
      nota: 'La dinámica la dirige el novio. EL DJ TIENE QUE TENER LISTAS LAS ONCE PISTAS DE LAS MESAS y ponerlas EN DESORDEN — están en la última hoja.' }] },
  { ini: '9:20 p. m.', fin: '9:30 p. m.', dur: '0:10', bloque: 'recepcion',
    que: 'Fotos con los invitados en la pista. Pasan al buffet.',
    nota: 'El buffet debe estar listo: después de cada foto pasan a servirse. Protocolo tiene la mini torta que mandaron hacer los novios.',
    musica: [] },
  { ini: '9:30 p. m.', fin: '10:00 p. m.', dur: '0:30', bloque: 'recepcion',
    que: 'Cena.', nota: 'Supervisar servicio.', musica: [] },
  { ini: '10:00 p. m.', fin: '10:20 p. m.', dur: '0:20', bloque: 'recepcion', clave: true,
    que: 'Lanzamiento del ramo y de la liga.',
    nota: 'Anuncio por personal de ceremonia o por el DJ.',
    musica: [
      { momento: 'Ramo · para las SOLTERAS', cancion: 'Tropicoqueta', artista: 'Karol G', quien: DJ },
      { momento: 'Liga · para los SOLTEROS', cancion: 'Temperature', artista: 'Sean Paul', quien: DJ },
    ] },
  { ini: '10:20 p. m.', fin: '11:00 p. m.', dur: '0:40', bloque: 'recepcion', clave: true,
    que: 'Música y pista abierta.', nota: 'Por el DJ.',
    musica: [{ momento: 'LAS ONCE CANCIONES DE LAS MESAS', cancion: 'Ver la última hoja', quien: DJ,
      nota: 'En desorden, repartidas. Cuando suena la suya, esa mesa es la que responde y su capitán la levanta.' }] },
  { ini: '11:00 p. m.', fin: '12:00 a. m.', dur: '1:00', bloque: 'recepcion',
    que: 'Snack de medianoche: colombianita de pollo.',
    nota: 'Entrega de accesorios para la hora loca.', musica: [] },
  { ini: '12:00 a. m.', fin: '12:30 a. m.', dur: '0:30', bloque: 'horaloca', clave: true,
    que: 'Llegada de la PAPAYERA & MILLO «La Máscara». Hora loca. Después, dos snacks de butifarra de yuca.',
    nota: 'Música por el DJ entre acto y acto.',
    musica: [
      { momento: 'Hora loca · acto 1', cancion: 'Papayera & Millo «La Máscara»', quien: 'Grupo en vivo',
        nota: 'Traen su propio repertorio. El DJ baja y les deja la pista.' },
      { momento: 'Hora loca · acto 2', cancion: 'DJ Bendecido · Turbo Show', quien: 'Show contratado',
        nota: 'Va enseguida de la papayera, sin dejar caer la pista.' },
    ] },
  { ini: '1:00 a. m.', fin: '1:10 a. m.', dur: '—', bloque: 'horaloca',
    que: '1.ª picada de la casona.', nota: 'Meseros.', ojo: true, musica: [] },
  { ini: '12:00 a. m.', fin: '12:30 a. m.', dur: '0:30', bloque: 'horaloca',
    que: '2.ª picada de la casona.', nota: 'Meseros.', ojo: true, musica: [] },
  { ini: '12:30 a. m.', fin: '2:00 a. m.', dur: '1:30', bloque: 'cierre', clave: true,
    que: 'Despedida y cierre.', nota: 'Entrega de pertenencias.',
    musica: [{ momento: 'Cierre', cancion: 'A criterio del DJ · la última con todos en la pista', quien: DJ, suave: true,
      nota: 'Avisar que es la última: la gente se acerca y la foto sale sola.' }] },
]

// La wedding dejó las dos picadas cruzadas en el tiempo y sin ordenar. Se
// imprime tal cual —es su cronograma— con una marca, porque el día de la boda
// alguien va a leer esa línea y va a dudar.
export const AVISO_PICADAS =
  'Las dos picadas están señaladas: en el cronograma de la wedding la 1.ª va a la 1:00 a. m. y la 2.ª a las 12:00 a. m., ' +
  'que se cruza con la hora loca. Confirmar con ella cuál va primero.'
