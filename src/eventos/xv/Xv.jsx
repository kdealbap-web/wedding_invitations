import { useMemo } from 'react'
import { useGuest } from '../../invitacion/GuestContext'
import Deck from '../../invitacion/Deck'
import { manifiestoDe } from './fotos'
import {
  XHero, XMensaje, XExclusiva, XDetalles, XVestuario, XTonos,
  XRestriccion, XRegalos, XRsvp, XCierre,
} from './secciones'
import './xv.css'

// ─── Plantilla «xv» ───
// Quinceañera. Todo el contenido sale de event.config; las fotos, del
// manifiesto del evento (src/assets/eventos/<slug>/index.js). Las secciones
// opcionales (vestuario, tonos, restricción, regalos) solo aparecen si el
// evento trae esa clave en su config.

const OV_OSCURO = 'linear-gradient(160deg,rgba(24,12,10,.72),rgba(18,9,8,.82))'
// Hero y cierre dejan ver más la foto; el texto va centrado y con sombra
const OV_FOTO = 'linear-gradient(to bottom,rgba(20,10,8,.45) 0%,rgba(20,10,8,.35) 45%,rgba(20,10,8,.8) 100%)'

const ICONOS = {
  x1:  '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
  x2:  '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  x3:  '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="11" r="3"/><path d="M6 20c0-3 3-5 6-5s6 2 6 5"/>',
  x4:  '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/>',
  x5:  '<path d="M12 2c-2 0-4 1-4 4v1l-3 14h14l-3-14V6c0-3-2-4-4-4z"/>',
  x6:  '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.3"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="15.5" cy="10" r="1.3"/><path d="M12 21a3 3 0 0 1 0-6h2"/>',
  x7:  '<circle cx="9" cy="7" r="4"/><circle cx="17" cy="7" r="4"/><path d="M2 21v-2a7 7 0 0 1 7-7"/><path d="M22 21v-2a7 7 0 0 0-7-7"/>',
  x8:  '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  x9:  '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/>',
  x10: '<path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>',
}

// id, componente, etiqueta, ¿aparece? (según config)
const SECCIONES = [
  { id: 'x1',  Component: XHero,        label: 'Inicio' },
  { id: 'x2',  Component: XMensaje,     label: 'Mensaje' },
  { id: 'x3',  Component: XExclusiva,   label: 'Tu invitación' },
  { id: 'x4',  Component: XDetalles,    label: 'Detalles' },
  { id: 'x5',  Component: XVestuario,   label: 'Vestuario',        si: c => c.vestuario },
  { id: 'x6',  Component: XTonos,       label: 'Tonos reservados', si: c => c.tonos_reservados?.colores?.length },
  { id: 'x7',  Component: XRestriccion, label: 'Aviso',            si: c => c.restriccion },
  { id: 'x8',  Component: XRegalos,     label: 'Lluvia de sobres', si: c => c.regalos },
  { id: 'x9',  Component: XRsvp,        label: 'Confirma tu asistencia' },
  { id: 'x10', Component: XCierre,      label: 'Cierre' },
]

export default function Xv() {
  const { event } = useGuest()
  const cfg = event?.config || {}
  const man = manifiestoDe(event?.slug)

  const sections = useMemo(() => {
    const fotos = man?.fotos || []
    return SECCIONES.filter(s => !s.si || s.si(cfg)).map((s, i) => {
      const f = man?.fondos?.[s.id]
      return {
        id: s.id, Component: s.Component, label: s.label, icon: ICONOS[s.id],
        bg: f?.src || fotos[i % Math.max(fotos.length, 1)] || '',
        pos: f?.pos,
        ov: s.id === 'x1' || s.id === 'x10' ? OV_FOTO : OV_OSCURO,
      }
    })
  }, [cfg, man])

  return <Deck sections={sections} musica={cfg.musica} className="tpl-xv" />
}
