import { lazy } from 'react'

// ─── Registro de plantillas ───
// `event.config.plantilla` elige la plantilla. Cada una es un chunk aparte que
// solo se descarga si hace falta. Para añadir una: crear su carpeta en
// src/eventos/<nombre>/ con un componente por defecto que renderice <Deck/>,
// y registrarla aquí.
export const PLANTILLAS = {
  boda: lazy(() => import('../eventos/boda/Boda.jsx')),
  xv:   lazy(() => import('../eventos/xv/Xv.jsx')),
}
