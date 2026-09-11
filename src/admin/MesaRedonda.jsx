import { nombreIncompleto } from './nombres'
import EditarNombre from './EditarNombre'

// Una mesa que se arrastra viaja en un tipo MIME propio, y no en `text/plain`,
// que es por donde viajan las fichas de gente. Así cada destino reconoce lo
// suyo: el tipo se puede leer en `dragover` —el contenido no—, que es cuando
// hay que decidir si la celda acepta lo que viene encima.
export const MIME_MESA = 'application/x-mesa'
export const arrastraMesa = e => e.dataTransfer.types.includes(MIME_MESA)
export const idDeMesa     = e => e.dataTransfer.getData(MIME_MESA)

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
function medidas(capacidad, mini, nombre = '', escala = 1) {
  const s = (mini ? 30 : capacidad <= 10 ? 44 : capacidad <= 16 ? 37 : 31) * escala
  // El mínimo no es por los puestos, es para que quepa el nombre de la mesa
  // dentro del tablero: «Amigos del colegio» necesita sitio. En el plano las
  // mesas se llaman «Mesa 7», así que ahí el mínimo depende del nombre — y por
  // eso una mesa con nombre largo sale más grande también en el plano.
  const min = (mini ? (nombre.length > 12 ? 74 : 58) : 96) * escala
  // `escala` la usa la mesa a pantalla completa. Multiplica la geometría en vez
  // de aplicar un transform: así los puestos siguen cayendo donde se los toca y
  // el texto no se reescala, que es lo que se ve borroso.
  const R = Math.max(min, (s * 1.2 * capacidad) / (2 * Math.PI))
  return { s, R, caja: 2 * R + s + 14 * escala, tablero: R - s / 2 - 8 * escala }
}

export default function MesaRedonda({
  mesa, gente, sel, elegidas, sobre,
  onSentar, onLevantar, onSeleccionar,
  zona, editando, onEditar, onGuardar, onCancelar,
  onEditarMesa, onBorrar, buscarFicha, onSobre, nueva,
  onCapitan, nombreDe, mini, onAbrir,
  movible, moviendo, onMover, escala = 1,
}) {
  const { s, R, caja, tablero } = medidas(mesa.capacidad, mini, mesa.nombre || '', escala)
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
  // Con gente elegida, cada mesa es un destino: se resalta y lo dice. Es el
  // camino directo; la barra de abajo es el atajo para las que no se ven.
  const eligiendo = elegidas.length > 0
  const cabe = mesa.capacidad - gente.length

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
    // Si lo que se arrastra es parte de una selección, cae la selección entera:
    // arrastrar a uno de los cuatro y que se quede solo sorprendería.
    if (!f) return
    onSentar(elegidas.some(x => x.key === f.key) ? elegidas : [f], mesa.id)
  }

  return (
    <section
      id={`mesa-${mesa.id}`}
      className={`mr${mini ? ' mini' : ''}${pasada ? ' pasada' : lleno ? ' llena' : ''}${activa ? ' activa' : ''}${eligiendo ? ' destino' : ''}${moviendo ? ' moviendo' : ''}${escala > 1 ? ' grande' : ''}`}
      onDragOver={e => { e.preventDefault(); if (!activa) onSobre(mesa.id) }}
      // dragleave salta también al pasar por encima de un hijo; sin comprobar
      // el destino, la mesa parpadearía todo el rato
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) onSobre(null) }}
      onDrop={soltar}
      onClick={() => { if (elegidas.length) onSentar(elegidas, mesa.id) }}
    >
      <div className="mr-circulo" style={{ width: caja, height: caja }}>
        {/* El tablero: el centro de la mesa */}
        <div
          className="mr-tablero"
          style={{ width: tablero * 2, height: tablero * 2, left: caja / 2 - tablero, top: caja / 2 - tablero }}
        >
          {mini ? (
            <span className="mr-nombre est">{mesa.nombre}</span>
          ) : (
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
          )}
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
              className={`mr-puesto${sel.includes(f.key) ? ' on' : ''}${falta ? ' falta' : ''}${i >= mesa.capacidad ? ' sobra' : ''}${manda ? ' capitan' : ''}`}
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

      {/* En el plano el detalle sobra: lo que importa es dónde queda cada mesa
          y cuánto le falta. Un clic abre la vista de detalle de esa mesa. */}
      {mini && (
        <footer className="mr-mini-pie">
          {/* El asa de mover. Va aparte y no sobre la mesa entera porque la
              mesa ya responde a tres gestos —soltar gente, tocar para sentar a
              la selección, arrastrar un puesto— y un cuarto encima de todos
              sería una lotería. Arrastrarla la mueve; tocarla la deja elegida
              y el siguiente toque en una celda la lleva ahí, que es como se
              reparte en tableta. El tipo MIME propio la distingue de las
              fichas, que viajan en `text/plain`. */}
          {movible && (
            <button
              className={`mr-asa${moviendo ? ' on' : ''}`}
              draggable
              onDragStart={e => {
                e.stopPropagation()
                e.dataTransfer.setData(MIME_MESA, mesa.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onClick={e => { e.stopPropagation(); onMover(mesa) }}
              title={moviendo
                ? `${mesa.nombre} está elegida: tocá el sitio del salón donde va`
                : `Mover ${mesa.nombre} de sitio: arrastrala, o tocá aquí y después su sitio`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" />
                <polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" />
                <line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
              </svg>
            </button>
          )}
          <span className={pasada ? 'mal' : lleno ? 'ok' : ''}>{gente.length}<i>/</i>{mesa.capacidad}</span>
          {capitan && <b title={`Capitán: ${nombreDe(capitan)}`}>★ {nombreDe(capitan).split(' ')[0]}</b>}
          {!capitan && gente.length > 0 && <b className="pend" title="Esta mesa aún no tiene capitán">sin capitán</b>}
          <button
            className="mr-ver" onClick={e => { e.stopPropagation(); onAbrir(mesa) }}
            title={`Ver el detalle de ${mesa.nombre}`}
          >ver</button>
        </footer>
      )}

      {/* Quién está sentado: las iniciales solas no se leen */}
      {!mini && <ol className="mr-lista">
        {gente.length === 0 && (
          <li className="mr-vacia">
            {/* Corto a propósito: el cuántos ya lo dice la barra de abajo, que
                está fija en pantalla, y aquí se repetiría en cada mesa vacía */}
            {eligiendo ? 'Sentar aquí' : 'Sin nadie todavía'}
          </li>
        )}
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
              className={`${falta ? 'falta' : ''}${manda ? ' manda' : ''}${sel.includes(f.key) ? ' on' : ''}`}
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
      </ol>}

      {/* El control del capitán. Un <select> y no un menú inventado: dice
          quién manda hoy sin desplegarlo, se maneja con el teclado y la lista
          de candidatos se rehace sola con quien esté sentado. */}
      {!mini && hayCapitanes && (candidatos.length > 0 || capitan) && (
        <div className={`mr-capitan${aBordo ? ' puesto' : ''}${capitan && !aBordo ? ' fuera' : ''}`}>
          <label htmlFor={`cap-${mesa.id}`}>Capitán</label>
          <select
            id={`cap-${mesa.id}`} value={capitan}
            onClick={e => e.stopPropagation()}
            onChange={e => onCapitan(mesa, e.target.value)}
          >
            <option value="">Sin asignar</option>
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

      {!mini && <footer className="mr-pie">
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
      </footer>}
    </section>
  )
}
