/**
 * Las dos paletas en comparación.
 *
 * Se eligen con --paleta=escenario | invitacion (por defecto: escenario).
 *
 * ESCENARIO nace del prompt de producción: terracota más clara y luminosa,
 * pensada para un panel emisivo, donde el terracota oscuro de la invitación
 * pierde presencia. Sigue la misma lógica por la que `tarjeta.css` deriva una
 * paleta marfil propia: el soporte manda.
 *
 * INVITACION son los tokens tal cual de src/index.css, convertidos de oklch()
 * a HEX porque ffmpeg no entiende oklch.
 */

export const PALETAS = {
  escenario: {
    id: 'escenario',
    nombre: 'Escenario (LED)',
    fondo:      '#1A0F0A',   // tinta cálida, casi negra
    fondoAlt:   '#2A170F',   // para degradados
    acc:        '#E07A5F',   // terracota principal
    accDk:      '#C76D4F',   // terracota profunda
    rubor:      '#F2C4B3',   // rosado suave
    arena:      '#E8D9C5',   // beige arena
    oro:        '#C9A66B',   // dorado mate
    oliva:      '#7A8471',   // verde oliva apagado
    texto:      '#F7EEE6',   // blanco cálido, no puro
    textoSoft:  'rgba(247,238,230,.72)',
  },

  invitacion: {
    id: 'invitacion',
    nombre: 'Invitación (sitio)',
    fondo:      '#120B04',
    fondoAlt:   '#24160C',
    acc:        '#924E33',   // --acc  oklch(50% .10 42)
    accDk:      '#622A0F',   // --acc-dk
    rubor:      '#EEA285',   // el terracota claro del hero
    arena:      '#E1D3BE',
    oro:        '#E1AD57',   // --gold oklch(78% .12 78)
    oliva:      '#6D8356',   // --olsft
    texto:      '#FFFFFF',
    textoSoft:  'rgba(255,255,255,.72)',
  },
}

export function paleta(nombre = 'escenario') {
  const p = PALETAS[nombre]
  if (!p) throw new Error(`Paleta desconocida: "${nombre}". Opciones: ${Object.keys(PALETAS).join(', ')}`)
  return p
}

// ─── Tipografía ───
// Las mismas tres del sitio. Se cargan desde Google Fonts al renderizar los
// overlays, igual que en index.html.
export const FUENTES = {
  display: "'Cormorant Garamond', Georgia, serif",   // --fd  títulos
  base:    "'Jost', system-ui, sans-serif",          // --fb  texto
  script:  "'Great Vibes', cursive",                 // --fs  caligráfica
  href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Great+Vibes&family=Jost:wght@200;300;400;500&display=swap',
}
