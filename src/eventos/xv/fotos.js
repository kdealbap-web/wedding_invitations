import { useGuest } from '../../invitacion/GuestContext'

// ─── Fotos por evento ───
// Cada XV trae su manifiesto en src/assets/eventos/<slug>/index.js (ver el de
// xv-mauren). Se encuentra por el slug del evento: el siguiente XV solo añade
// su carpeta, sin tocar la plantilla. Los manifiestos solo exportan URLs; el
// navegador baja únicamente las fotos que se pintan.
const MANIFIESTOS = import.meta.glob('../../assets/eventos/*/index.js', { eager: true, import: 'default' })

// Fotos subidas desde el panel (config.fotos → R2, servidas por el Worker en /fotos/).
// En desarrollo Vite no tiene el Worker: se piden a producción.
const BASE_FOTOS = import.meta.env.DEV ? 'https://invitation.kdealbap.com' : ''
export const urlFoto = (key) => `${BASE_FOTOS}/fotos/${key}` 
export const manifiestoDe = (slug) => MANIFIESTOS[`../../assets/eventos/${slug}/index.js`] || null

// Foto suelta del manifiesto del evento actual (p. ej. «retrato»), o null
export function useFoto(clave) {
  const { event } = useGuest()
  return manifiestoDe(event?.slug)?.[clave] || null
}
