// ─── Cupos y estado: una sola fuente de verdad ───
//
// Vivía dentro de Dashboard.jsx. Se extrajo cuando el tablero de mesas y el
// export a Excel necesitaron exactamente los mismos números: si esto se
// duplica, tarde o temprano el panel y el Excel dicen cosas distintas y nadie
// sabe cuál creer.
//
// Solo la llamada confirma. Lo que el invitado responde desde su link es una
// PRECONFIRMACIÓN: sirve para saber a quién llamar primero, pero no entra en el
// número que se le pasa al catering.

export const ESTADOS = {
  confirmado:    { lbl: 'Confirmado',    cls: 'badge-green', desc: 'La wedding habló con ellos y confirmaron' },
  preconfirmado: { lbl: 'Preconfirmado', cls: 'badge-blue',  desc: 'Respondió que sí desde su link · falta validar por teléfono' },
  no_asiste:     { lbl: 'No asiste',     cls: 'badge-red',   desc: 'Avisó que no puede acompañarnos · su link quedó cerrado' },
  no_contesta:   { lbl: 'No contesta',   cls: 'badge-amber', desc: 'Se intentó llamar y no hubo respuesta' },
  sin_respuesta: { lbl: 'Sin respuesta', cls: 'badge-gray',  desc: 'Nadie ha respondido ni contestado el teléfono' },
}

/** Excluyentes y en este orden: la respuesta pesa más que el intento de llamada. */
export const estadoOf = (r) => {
  if (r.attending === false)              return 'no_asiste'
  if (r.attending === true)
    return r.confirmation_source === 'admin' ? 'confirmado' : 'preconfirmado'
  if (r.contact_status === 'no_contesta') return 'no_contesta'
  return 'sin_respuesta'
}

/**
 * Personas que aporta una tarjeta.
 *
 * Confirmada    → el dato exacto tecleado en la llamada.
 * Preconfirmada → lo que el invitado marcó y, si no marcó a nadie, los cupos
 *   completos de la tarjeta. Es provisional, así que se cuenta el sobre entero
 *   en vez de descartarlo: las 24 confirmaciones viejas que entraron por el link
 *   sin `confirmation_members` valdrían 0 si no.
 *
 * NO leas `attending_count` directo para totales — para eso está esta función.
 */
export const personasOf = (r) => {
  const e = estadoOf(r)
  if (e === 'confirmado')    return r.attending_count || 0
  if (e === 'preconfirmado') return (r.attending_count || 0) || (r.total_members || 0)
  return 0
}

/**
 * Cupos que la tarjeta todavía tiene en el aire, para las que no han respondido.
 * Es `total_members`, y por eso una tarjeta sin nombres cargados vale 0: no hay
 * de dónde sacar el número. Esas tarjetas hay que completarlas a mano.
 */
export const cuposAbiertosOf = (r) => {
  const e = estadoOf(r)
  return (e === 'sin_respuesta' || e === 'no_contesta') ? (r.total_members || 0) : 0
}
