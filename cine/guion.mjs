/**
 * EL GUION — fuente de verdad de toda la producción.
 *
 * Cada escena describe: cuántos fotogramas dura, qué foto usa, cómo se mueve la
 * cámara y qué dice la capa de texto. El renderizador no decide nada creativo;
 * todo lo que se ve sale de este archivo.
 *
 * Fotogramas, no segundos: a 29.97 fps (30000/1001) los segundos redondos no
 * caen en fotograma entero — 15 s serían 449.55 fotogramas. Trabajando en
 * fotogramas el bucle cierra exacto y no hay medio cuadro de deriva.
 */

export const FPS_NUM = 30000
export const FPS_DEN = 1001
export const FPS = FPS_NUM / FPS_DEN        // 29.97002997…
export const ANCHO = 1920
export const ALTO = 1080

/** Fotogramas → segundos, para los rótulos del storyboard. */
export const seg = f => (f * FPS_DEN / FPS_NUM)

/** Duración del crossfade entre escenas, en fotogramas (1 s). */
export const FUNDIDO = 30

/**
 * Parámetros de codificación.
 *
 * El grano de película es ruido aleatorio y x264 no lo puede comprimir: con
 * CRF 14 los segmentos salían a 86–104 Mbps (150-186 MB por 15 s) y el loop a
 * 452 MB. Muchos reproductores de LED no pasan de 20–40 Mbps y se atascan.
 * CRF 20 con techo de 20 Mbps se ve igual en un panel y pesa una quinta parte.
 *
 * `profile high` + `level 4.1` y un keyframe cada 2 s son por compatibilidad:
 * es lo que abren sin protestar los reproductores de sala.
 */
export const X264_FINAL = [
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
  '-maxrate', '20M', '-bufsize', '40M',
  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1',
  '-g', '60', '-movflags', '+faststart',
]

/** Para los clips intermedios, que se vuelven a codificar al encadenarlos. */
export const X264_TMP = [
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p',
]

/** Intensidad del grano. Más alto encarece muchísimo el bitrate. */
export const GRANO = 4

// ══════════════════════════════════════════════════════════════════
//  LOOP PRINCIPAL — «La casa abierta»
//  Se proyecta en bucle mientras entra la gente y durante la recepción.
//  Abre y cierra sobre negro, así el punto de bucle es invisible.
// ══════════════════════════════════════════════════════════════════
export const LOOP = {
  id: 'loop-principal',
  titulo: 'La casa abierta',
  proposito: 'Bucle de bienvenida y recepción',
  escenas: [
    {
      id: 'apertura', frames: 330, foto: 'CANO5810.JPG',
      plano: 'Plano general — la pareja en el portón, el centro libre para la marca',
      camara: { zoom: [1.00, 1.12], origen: 'centro' },
      efecto: 'Entra desde negro. El logo se revela con un latido dorado.',
      capa: {
        tipo: 'marca',
        script: 'Bienvenidos a nuestra boda',
        nombreA: 'Angely', nombreB: 'Kevin',
      },
    },
    {
      id: 'fecha', frames: 240, foto: 'CANO5698.JPG',
      plano: 'Plano medio, contraluz',
      camara: { zoom: [1.14, 1.02], origen: 'centro' },
      efecto: 'Retroceso lento: la imagen se abre mientras entra la fecha.',
      capa: {
        tipo: 'titulo',
        kicker: 'Sábado',
        titulo: '12 de septiembre',
        nota: '2026 · Barranquilla',
      },
    },
    {
      id: 'bienvenida', frames: 240, foto: 'IMG_6175.jpg',
      plano: 'Plano entero — el beso frente a la buganvilla',
      camara: { zoom: [1.02, 1.13], origen: 'arriba' },
      efecto: 'Ascenso suave.',
      capa: { tipo: 'script', texto: 'Bienvenidos', nota: 'Gracias por estar aquí esta noche' },
    },
    {
      id: 'historia-1', frames: 270, foto: 'CANO5722.JPG',
      plano: 'Plano medio corto',
      camara: { zoom: [1.12, 1.00], origen: 'izq' },
      efecto: 'Deriva lateral, como un recuerdo que se acerca.',
      capa: { tipo: 'titulo', kicker: 'Lo que nos trajo hasta acá', titulo: 'Nuestra historia', nota: null },
    },
    {
      id: 'cartagena', frames: 240, foto: 'IMG_5746.jpg',
      plano: 'Plano general — calle colonial, la cúpula al fondo',
      camara: { zoom: [1.00, 1.10], origen: 'abajo' },
      efecto: 'Ascenso lento: la calle se abre hacia la cúpula.',
      capa: { tipo: 'titulo', kicker: 'Antes de este día', titulo: 'Cartagena', nota: null },
    },
    {
      id: 'historia-2', frames: 240, foto: 'IMG_6181.jpg',
      plano: 'Plano general apaisado — el atardecer en el agua',
      camara: { zoom: [1.00, 1.10], origen: 'der' },
      efecto: 'Sin texto: la foto respira sola. Da aire antes del verso, y es la única\n      escena donde una apaisada con la pareja centrada no compite con nada.',
      capa: null,
    },
    {
      id: 'atardecer', frames: 240, foto: 'IMG_6177.jpg',
      plano: 'Contraluz de atardecer en el agua',
      camara: { zoom: [1.12, 1.00], origen: 'centro' },
      efecto: 'Retroceso: se abre hacia el sol del fondo.',
      capa: { tipo: 'script', texto: 'Y todo nos trajo hasta hoy', nota: null },
    },
    {
      id: 'verso', frames: 300, foto: 'CANO5887.JPG',
      plano: 'Plano general oscuro',
      camara: { zoom: [1.10, 1.00], origen: 'centro' },
      efecto: 'Cierre lento hacia el centro.',
      capa: {
        tipo: 'verso',
        texto: '«El amor es paciente, es bondadoso…\ntodo lo soporta, todo lo espera.»',
        ref: '1 Corintios 13:4-7',
      },
    },
    {
      id: 'hashtag', frames: 270, foto: 'IMG_6174.jpg',
      plano: 'Retrato de los dos, a cámara',
      camara: { zoom: [1.03, 1.13], origen: 'centro' },
      efecto: 'Acercamiento sostenido.',
      capa: {
        tipo: 'grande',
        kicker: 'Comparte la noche con nosotros',
        texto: '#AyKBoda',
        nota: 'Sube tus fotos y videos con el hashtag',
      },
    },
    {
      id: 'lugar', frames: 240, foto: 'CANO5807.JPG',
      plano: 'Plano general',
      camara: { zoom: [1.12, 1.02], origen: 'abajo' },
      efecto: 'Descenso.',
      capa: { tipo: 'titulo', kicker: 'La fiesta', titulo: 'Casona del Prado', nota: 'Barranquilla' },
    },
    {
      id: 'gracias', frames: 330, foto: 'CANO5927.JPG',
      plano: 'Plano medio, atardecer',
      camara: { zoom: [1.00, 1.12], origen: 'centro' },
      efecto: 'Funde a negro para cerrar el bucle sin costura.',
      capa: {
        tipo: 'marca',
        script: 'Gracias por acompañarnos',
        nombreA: 'Angely', nombreB: 'Kevin',
        firma: true,
      },
    },
  ],
}

// ══════════════════════════════════════════════════════════════════
//  SEGMENTOS CORTOS — interludios de la fiesta (15 s cada uno)
//  Se disparan en el momento; no van en bucle continuo.
// ══════════════════════════════════════════════════════════════════
export const SEGMENTOS = [
  {
    id: 'vals', titulo: 'El primer baile', frames: 450, foto: 'IMG_6176.jpg',
    plano: 'Plano entero — frente con frente, de la mano', camara: { zoom: [1.00, 1.14], origen: 'centro' },
    efecto: 'Acercamiento continuo, sin cortes.',
    capa: { tipo: 'titulo', kicker: 'Y que suene la música', titulo: 'El primer baile', nota: 'Angely & Kevin' },
  },
  {
    id: 'brindis', titulo: 'Un brindis', frames: 450, foto: 'CANO5722.JPG',
    plano: 'Plano medio corto', camara: { zoom: [1.12, 1.00], origen: 'centro' },
    efecto: 'Retroceso: se abre la escena al levantar la copa.',
    capa: { tipo: 'titulo', kicker: 'Levantemos la copa', titulo: 'Un brindis', nota: 'Por los novios · por esta noche' },
  },
  {
    id: 'torta', titulo: 'El corte de la torta', frames: 450, foto: 'IMG_6178.jpg',
    plano: 'Muro ocre a contraluz, hora dorada', camara: { zoom: [1.02, 1.12], origen: 'arriba' },
    efecto: 'Ascenso suave.',
    capa: { tipo: 'titulo', kicker: 'El momento más dulce', titulo: 'El corte de la torta', nota: 'Acompáñanos alrededor de la mesa' },
  },
  {
    id: 'ramo', titulo: 'El lanzamiento del ramo', frames: 450, foto: 'IMG_6179.jpg',
    plano: 'Contraluz de atardecer, de pie en el agua', camara: { zoom: [1.10, 1.00], origen: 'der' },
    efecto: 'Deriva lateral y cierre.',
    capa: { tipo: 'titulo', kicker: 'Que la suerte decida', titulo: 'El lanzamiento del ramo', nota: 'Solteras a la pista' },
  },
  {
    id: 'horaloca', titulo: '¡Hora loca!', frames: 450, foto: null,
    plano: 'Sin foto — degradado de fiesta',
    camara: { zoom: [1.00, 1.00], origen: 'centro' },
    efecto: 'Pulso de luz y grano más marcado. La única pieza que rompe el tono.',
    capa: { tipo: 'fiesta', kicker: 'Que empiece el desorden', texto: '¡Hora loca!', nota: 'Todos a la pista · sin excusas' },
  },
]

/** Duración final del loop una vez encadenados los crossfades. */
export function framesTotalesLoop() {
  const suma = LOOP.escenas.reduce((t, e) => t + e.frames, 0)
  return suma - (LOOP.escenas.length - 1) * FUNDIDO
}
