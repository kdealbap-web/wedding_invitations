import { nombreIncompleto } from './nombres'
import EditarNombre from './EditarNombre'

// ─── Color por tarjeta ───
// Cada familia recibe un color estable, sacado de su id. Sirve para ver de un
// vistazo si una familia quedó partida entre dos mesas, que es lo que más
// molesta cuando se descubre el día de la boda.
// Doce tonos apagados que funcionan sobre el fondo oscuro del panel.
const COLORES = [
  '#C8A96E', '#D08C60', '#B07156', '#8FA37E', '#7A9E9F', '#9B8AA6',
  '#C9836F', '#A8996E', '#89A06B', '#7E93B8', '#B98A99', '#A2795C',
]
export function colorDe(guestId) {
  let h = 0
  for (let i = 0; i < guestId.length; i++) h = (h * 31 + guestId.charCodeAt(i)) >>> 0
  return COLORES[h % COLORES.length]
}

/** «María José Ospina» → «MO». Lo que cabe dentro de un puesto. */
function iniciales(nombre) {
  const p = (nombre || '').trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '·'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

/**
 * Geometría de la mesa. Los puestos se reparten por la circunferencia, así que
 * el radio crece con la capacidad para que no se encimen.
 */
function medidas(capacidad) {
  const s = capacidad <= 10 ? 44 : capacidad <= 16 ? 37 : 31
  // El mínimo de 96 no es por los puestos, es para que quepa el nombre de la
  // mesa dentro del tablero: «Amigos del colegio» necesita sitio.
  const R = Math.max(96, (s * 1.2 * capacidad) / (2 * Math.PI))
  return { s, R, caja: 2 * R + s + 14, tablero: R - s / 2 - 8 }
}

export default function MesaRedonda({
  mesa, gente, sel, sobre,
  onSentar, onLevantar, onSeleccionar,
  zona, editando, onEditar, onGuardar, onCancelar,
  onEditarMesa, onBorrar, buscarFicha, onSobre, nueva,
  onCapitan, nombreDe,
}) {
  const { s, R, caja, tablero } = medidas(mesa.capacidad)
  const lleno = gente.length >= mesa.capacidad
  const pasada = gente.length > mesa.capacidad
  const activa = sobre === mesa.id

  // ─── Capitán ───
  // Sólo puede serlo alguien con nombre: a una «plaza sin nombre» no hay a
  // quién avisarle. La lista de candidatos sale de quién está sentado AHORA,
  // así que se rehace sola cada vez que alguien entra o sale de la mesa.
  //
  // `capitan_id in mesa` distingue «la columna no existe» (006 sin aplicar,
  // PostgREST ni siquiera devuelve la clave) de «existe y está vacía».
  const hayCapitanes = 'capitan_id' in mesa
  const capitan   = mesa.capitan_id || ''
  const candidatos = gente.filter(f => f.member_id)
  const aBordo    = candidatos.some(f => f.member_id === capitan)

  // Un puesto por plaza de la mesa; los que sobran quedan vacíos.
  // Si se pasa de capacidad, los de más se pintan igual pero en rojo.
  const puestos = Array.from({ length: Math.max(mesa.capacidad, gente.length) }, (_, i) => gente[i] || null)

  const soltar = e => {
    e.preventDefault()
    onSobre(null)
    const f = buscarFicha(e.dataTransfer.getData('text/plain'))
    if (f) onSentar(f, mesa.id)
  }

  return (
    <section
      className={`mr${pasada ? ' pasada' : lleno ? ' llena' : ''}${activa ? ' activa' : ''}`}
      onDragOver={e => { e.preventDefault(); if (!activa) onSobre(mesa.id) }}
      // dragleave salta también al pasar por encima de un hijo; sin comprobar
      // el destino, la mesa parpadearía todo el rato
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) onSobre(null) }}
      onDrop={soltar}
      onClick={() => { if (sel) onSentar(sel, mesa.id) }}
    >
      <div className="mr-circulo" style={{ width: caja, height: caja }}>
        {/* El tablero: el centro de la mesa */}
        <div
          className="mr-tablero"
          style={{ width: tablero * 2, height: tablero * 2, left: caja / 2 - tablero, top: caja / 2 - tablero }}
        >
          <input
            className="mr-nombre" defaultValue={mesa.nombre}
            // Recién creada: se abre lista para escribir, así no se queda en «Mesa 3»
            autoFocus={nueva}
            onFocus={e => nueva && e.target.select()}
            onClick={e => e.stopPropagation()}
            onBlur={e => {
              const v = e.target.value.trim()
              if (v && v !== mesa.nombre) onEditarMesa(mesa, { nombre: v })
              else e.target.value = mesa.nombre
            }}
          />
          <span className="mr-cuenta">{gente.length}<i>/</i>{mesa.capacidad}</span>
        </div>

        {/* Los puestos, repartidos por la circunferencia */}
        {puestos.map((f, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(puestos.length, 1)
          const est = {
            width: s, height: s,
            left: caja / 2 + R * Math.cos(a) - s / 2,
            top: caja / 2 + R * Math.sin(a) - s / 2,
          }
          if (!f) {
            return <div key={`v${i}`} className="mr-puesto vacio" style={est} title="Puesto libre" />
          }
          const falta = f.anon || nombreIncompleto(f.nombre)
          const manda = !!capitan && f.member_id === capitan
          return (
            <div
              key={f.key}
              className={`mr-puesto${sel?.key === f.key ? ' on' : ''}${falta ? ' falta' : ''}${i >= mesa.capacidad ? ' sobra' : ''}${manda ? ' capitan' : ''}`}
              style={{ ...est, '--fam': colorDe(f.guest_id) }}
              draggable
              tabIndex={0}
              onDragStart={e => {
                e.dataTransfer.setData('text/plain', f.key)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onClick={e => { e.stopPropagation(); onSeleccionar(f) }}
              onDoubleClick={e => { e.stopPropagation(); onEditar(f) }}
              onKeyDown={e => {
                if (e.key === 'F2' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onEditar(f) }
              }}
              title={`${f.nombre}\n${f.grupo}${manda ? '\nCapitán de esta mesa' : ''}${falta ? '\nNombre por completar' : ''}\nDoble clic o F2 para editar · arrastra para mover`}
            >
              <span>{iniciales(f.nombre)}</span>
              {manda && <i className="mr-galon" aria-hidden="true">★</i>}
              <button
                className="mr-quitar"
                onClick={e => { e.stopPropagation(); onLevantar(f) }}
                title="Quitar de la mesa" aria-label="Quitar de la mesa"
              >×</button>
            </div>
          )
        })}
      </div>

      {/* Quién está sentado: las iniciales solas no se leen */}
      <ol className="mr-lista">
        {gente.length === 0 && <li className="mr-vacia">Arrastra personas al círculo</li>}
        {gente.map(f => {
          const falta = f.anon || nombreIncompleto(f.nombre)
          const manda = !!capitan && f.member_id === capitan
          // La zona en la comparación no es de adorno: la misma persona se
          // pinta también en la cola de «por completar» y en «Sin mesa», y dos
          // editores abiertos a la vez se cierran solos. Ver EditarNombre.jsx.
          return editando?.key === f.key && editando.zona === zona ? (
            <li key={f.key} className="mr-editando">
              <EditarNombre
                ficha={f} compacto
                onGuardar={(v, o) => onGuardar(f, v, o)}
                onCancelar={onCancelar}
              />
            </li>
          ) : (
            <li
              key={f.key}
              className={`${falta ? 'falta' : ''}${manda ? ' manda' : ''}`}
              style={{ '--fam': colorDe(f.guest_id) }}
              onClick={e => { e.stopPropagation(); onSeleccionar(f) }}
              onDoubleClick={e => { e.stopPropagation(); onEditar(f) }}
              title={`${f.grupo}${manda ? ' · capitán de la mesa' : ''}${falta ? ' · nombre por completar' : ''}\nDoble clic para editar`}
            >
              <i className="mr-punto" />
              {manda && <i className="mr-estrella" aria-label="Capitán de la mesa">★</i>}
              {f.nombre}
              <button
                className="mr-editar"
                onClick={e => { e.stopPropagation(); onEditar(f) }}
                title="Editar el nombre" aria-label={`Editar el nombre de ${f.nombre}`}
              >✎</button>
            </li>
          )
        })}
      </ol>

      {/* El control del capitán. Un <select> y no un menú inventado: dice
          quién manda hoy sin desplegarlo, se maneja con el teclado y la lista
          de candidatos se rehace sola con quien esté sentado. */}
      {hayCapitanes && (
        <div className={`mr-capitan${aBordo ? ' puesto' : ''}${capitan && !aBordo ? ' fuera' : ''}`}>
          <label htmlFor={`cap-${mesa.id}`}>Capitán</label>
          <select
            id={`cap-${mesa.id}`} value={capitan}
            disabled={!candidatos.length}
            onClick={e => e.stopPropagation()}
            onChange={e => onCapitan(mesa, e.target.value)}
          >
            <option value="">{candidatos.length ? 'Sin asignar' : 'Sienta a alguien primero'}</option>
            {/* El capitán que ya no está sentado aquí: se muestra igual, o el
                <select> se quedaría en blanco y parecería que no hay ninguno. */}
            {capitan && !aBordo && (
              <option value={capitan}>{nombreDe(capitan) || 'Capitán'} — ya no está en esta mesa</option>
            )}
            {candidatos.map(f => (
              <option key={f.member_id} value={f.member_id}>{f.nombre}</option>
            ))}
          </select>
        </div>
      )}

      <footer className="mr-pie">
        <input
          className="mr-cap" type="number" min="1" max="30" defaultValue={mesa.capacidad}
          title="Puestos de esta mesa"
          onClick={e => e.stopPropagation()}
          onBlur={e => {
            const n = parseInt(e.target.value, 10)
            if (n >= 1 && n <= 30 && n !== mesa.capacidad) onEditarMesa(mesa, { capacidad: n })
            else e.target.value = mesa.capacidad
          }}
        />
        <span>puestos</span>
        <button className="mr-borrar" onClick={e => { e.stopPropagation(); onBorrar(mesa) }} title="Borrar esta mesa">
          Borrar
        </button>
      </footer>
    </section>
  )
}
