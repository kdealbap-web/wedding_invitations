import { useMemo, useState } from 'react'
import { useGuest } from '../../invitacion/GuestContext'
import Deck from '../../invitacion/Deck'
import Sobre from '../../invitacion/Sobre'
import { fechaCorta } from '../../invitacion/fechas'
import { manifiestoDe } from './fotos'
import {
  XHero, XMensaje, XExclusiva, XDetalles, XVestuario, XTonos,
  XRestriccion, XRegalos, XRsvp, XCierre, XGuarda, XDecoracion,
} from './secciones'
import './xv.css'

// ─── Plantilla «xv» ───
// Quinceañera. Todo el contenido sale de event.config; las fotos, del
// manifiesto del evento (src/assets/eventos/<slug>/index.js). Las secciones
// opcionales (vestuario, tonos, restricción, regalos) solo aparecen si el
// evento trae esa clave en su config.

// Velos claros y cálidos: suavizan la foto sin oscurecerla. Lo que da contraste
// al texto no es el velo sino la tarjeta de marfil de .sec-c (ver xv.css).
const OV_CLARO  = 'linear-gradient(170deg,rgba(255,248,242,.28),rgba(250,228,228,.34))'
const OV_HERO   = 'linear-gradient(to bottom,rgba(255,248,242,.06) 0%,rgba(255,240,235,.14) 55%,rgba(247,222,224,.4) 100%)'
const OV_SOLA   = 'linear-gradient(170deg,rgba(255,248,242,.15),rgba(247,226,226,.25))'
const OV_FORM   = 'linear-gradient(170deg,rgba(255,248,242,.55),rgba(247,226,226,.6))'

// Interior del <svg> de cada punto lateral (trazo, viewBox 24)
const ICONOS = {
  x1:  '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',                                                                    // corona
  x2:  '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',                                          // mensaje
  x3:  '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 7v10" stroke-dasharray="2 2"/>', // boleto
  x4:  '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',               // lugar
  x5:  '<path d="M9 3h6l-1 6 5 12H5l5-12z"/>',                                                                        // vestido
  x6:  '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.3"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="15.5" cy="10" r="1.3"/><path d="M12 21a3 3 0 0 1 0-6h2"/>', // paleta
  x7:  '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6v.2"/>',                                    // aviso
  x8:  '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"/><path d="M12 8C10 4 6 4 7 6.5 7.7 8 10.5 8 12 8zM12 8c2-4 6-4 5-1.5-.7 1.5-3.5 1.5-5 1.5z"/>', // regalo
  x9:  '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',                                                  // confirmar
  x10: '<path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>',                            // estrella
  x11: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M9 16l2 2 4-4"/>', // calendario
}

// Colores del sobre de apertura (variables de invitacion/sobre.css)
const TEMA_SOBRE = {
  '--sb-v1': '#5c2748', '--sb-v2': '#3a1530', '--sb-v3': '#1a0817',     // terciopelo ciruela
  '--sb-papel': '#f2dfd6', '--sb-papel-2': '#e8cfc4',                    // algodón rubor
  '--sb-carta': '#fcf7f1',                                               // tarjeta marfil
  '--sb-forro': '#d9a3a4', '--sb-forro-2': '#fbefe9',                    // forro palo rosa
  '--sb-cera': '#eba39a', '--sb-cera-luz': '#fff0e7',                    // lacre oro rosa
  '--sb-cinta': '#c98f90', '--sb-cinta-2': '#a1676c',                    // cinta de seda
  '--sb-tinta': '#43202f', '--sb-tinta-2': '#7b4c58',
  '--sb-script': "'Parisienne',cursive", '--sb-disp': "'Playfair Display',Georgia,serif",
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
  { id: 'x11', Component: XGuarda,      label: 'Guarda la fecha' },   // siempre la última, con la foto sola
]

export default function Xv() {
  const { event, nombre } = useGuest()
  const [abierto, setAbierto] = useState(false)
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
        panel: s.id !== 'x9',   // el RSVP ya trae su propia foto lateral
        ov: s.id === 'x1' ? OV_HERO : s.id === 'x9' ? OV_FORM : s.id === 'x11' ? OV_SOLA : OV_CLARO,
      }
    })
  }, [cfg, man])

  return (
    <>
      <Deck sections={sections} musica={cfg.musica} className="tpl-xv" bloqueado={!abierto}><XDecoracion /></Deck>
      {!abierto && (
        <Sobre
          listo para={nombre} monograma="15" tema={TEMA_SOBRE}
          linea="Te invito a celebrar" titulo={cfg.titulo || event?.titulo}
          nombre={cfg.nombre_corto || cfg.anfitrion}
          fecha={event?.fecha ? `${fechaCorta(event.fecha)} · ${new Date(event.fecha).getFullYear()}` : ''}
          onAbierto={() => setAbierto(true)}
        />
      )}
    </>
  )
}
