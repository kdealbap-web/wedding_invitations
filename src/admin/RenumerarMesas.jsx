import { useState, useMemo } from 'react'

// ─── Renumerar las mesas ───
//
// El número de una mesa es una etiqueta —«Mesa 7»— y el salón se la cambia
// cuando reacomoda el montaje: pasó dos veces en tres días. Antes eso era un
// mapeo escrito a mano en supabase/scripts/renumerar-mesas.sql; aquí se hace
// desde el panel, que es donde está quien conoce el salón.
//
// Renumerar NO mueve ninguna mesa de sitio: desde la 007 el sitio vive en
// `fila`/`col` y se arrastra en el plano. Son dos gestos distintos y esa es
// justamente la razón de la migración.
//
// Lo que sí arrastra el número es el `orden`, porque el panel, el Excel y las
// imágenes listan por ahí: renumerar sin tocar `orden` dejaría los papeles en
// la secuencia vieja. La principal va con orden 0 —no lleva número y va
// primera—; sin el 0 explícito empata con la Mesa 1 y queda segunda.

const numeroDe = m => {
  const x = (m.nombre || '').match(/^\s*Mesa\s+(\d+)\s*$/i)
  return x ? Number(x[1]) : null
}
const esPrincipal = m => /^\s*Mesa\s+(principal|de\s+los\s+novios)\s*$/i.test(m.nombre || '')

export default function RenumerarMesas({ mesas, onCerrar, onAplicar }) {
  // Sólo se renumeran las que ya se llaman «Mesa N». Las de nombre propio
  // —«Mesa principal», «Los abuelos»— no tienen número que cambiar: se
  // enseñan igual, para que la lista sea el retrato completo del salón.
  const numeradas = useMemo(
    () => mesas.filter(m => numeroDe(m) !== null).sort((a, b) => numeroDe(a) - numeroDe(b)), [mesas])
  const otras = useMemo(() => mesas.filter(m => numeroDe(m) === null), [mesas])

  const [valores, setValores] = useState(
    () => Object.fromEntries(numeradas.map(m => [m.id, String(numeroDe(m))])))
  const [guardando, setGuardando] = useState(false)

  const poner = (id, v) => setValores(x => ({ ...x, [id]: v.replace(/[^\d]/g, '').slice(0, 2) }))

  // Numerar siguiendo el plano. Con once mesas repartidas en tres hileras,
  // teclear los once números a mano es donde se cuelan los errores; esto los
  // propone y después se corrigen los que haga falta. En los dos sentidos
  // porque la lectura del salón depende de por dónde se entra.
  const porPlano = sentido => {
    const puestas = numeradas.filter(m => m.fila && m.col)
    if (!puestas.length) return
    const ordenadas = [...puestas].sort((a, b) =>
      a.fila - b.fila || (sentido === 'izq' ? a.col - b.col : b.col - a.col))
    const sueltas = numeradas.filter(m => !(m.fila && m.col))
    setValores(v => ({
      ...v,
      ...Object.fromEntries(ordenadas.map((m, i) => [m.id, String(i + 1)])),
      // Las que no están en el plano van detrás, conservando su orden relativo
      ...Object.fromEntries(sueltas.map((m, i) => [m.id, String(ordenadas.length + i + 1)])),
    }))
  }

  const revision = useMemo(() => {
    const nums = numeradas.map(m => ({ m, n: Number(valores[m.id]) }))
    const vacios = nums.filter(x => !x.n)
    const cuenta = new Map()
    for (const x of nums) if (x.n) cuenta.set(x.n, (cuenta.get(x.n) || 0) + 1)
    const repetidos = [...cuenta.entries()].filter(([, c]) => c > 1).map(([n]) => n)
    const usados = [...cuenta.keys()].sort((a, b) => a - b)
    // Un hueco en la secuencia no impide renumerar —puede que el salón no
    // tenga esa mesa—, pero se avisa: el plano lo va a enseñar como hueco.
    const huecos = usados.length
      ? Array.from({ length: Math.max(...usados) }, (_, i) => i + 1).filter(n => !cuenta.has(n))
      : []
    const cambios = nums
      .filter(x => x.n && x.n !== numeroDe(x.m))
      .map(x => ({ id: x.m.id, antes: x.m.nombre, nombre: `Mesa ${x.n}`, orden: x.n }))
    // El `orden` se rehace para todas, cambien de número o no: es idempotente
    // y de paso corrige las que ya venían descuadradas de antes.
    const orden = nums
      .filter(x => x.n && x.n === numeroDe(x.m) && x.m.orden !== x.n)
      .map(x => ({ id: x.m.id, antes: x.m.nombre, nombre: x.m.nombre, orden: x.n }))
    const principal = otras.filter(m => esPrincipal(m) && m.orden !== 0)
      .map(m => ({ id: m.id, antes: m.nombre, nombre: m.nombre, orden: 0 }))
    return { vacios, repetidos, huecos, cambios, todos: [...cambios, ...orden, ...principal] }
  }, [valores, numeradas, otras])

  const puede = !revision.vacios.length && !revision.repetidos.length && revision.todos.length > 0

  async function aplicar() {
    setGuardando(true)
    await onAplicar(revision.todos)
    setGuardando(false)
  }

  return (
    <div className="adm-modal-bg" onClick={onCerrar}>
      <div className="adm-modal mb-renum" onClick={e => e.stopPropagation()}>
        <h3>Renumerar las mesas</h3>
        <p className="mb-renum-ayuda">
          Cambia la etiqueta de cada mesa y el orden en que salen en el Excel y en
          las hojas impresas. <b>No mueve nada de sitio</b>: el sitio se arrastra en el plano.
          Nadie se levanta de su silla ni pierde a su capitán.
        </p>

        {numeradas.some(m => m.fila && m.col) && (
          <div className="mb-renum-auto">
            <span>Numerar siguiendo el plano:</span>
            <button className="adm-btn adm-btn-ghost" onClick={() => porPlano('izq')}
                    title="Hilera por hilera, de izquierda a derecha">izquierda → derecha</button>
            <button className="adm-btn adm-btn-ghost" onClick={() => porPlano('der')}
                    title="Hilera por hilera, desde el lado de los novios">derecha → izquierda</button>
          </div>
        )}

        <ul className="mb-renum-l">
          {numeradas.map(m => {
            const n = Number(valores[m.id])
            const rep = n && revision.repetidos.includes(n)
            return (
              <li key={m.id} className={rep ? 'mal' : n && n !== numeroDe(m) ? 'cambia' : ''}>
                <span className="mb-renum-hoy">{m.nombre}</span>
                <span className="mb-renum-sitio">
                  {m.fila && m.col ? `hilera ${m.fila} · col ${m.col}` : 'sin sitio en el plano'}
                </span>
                <span className="mb-renum-flecha" aria-hidden="true">→</span>
                <span className="mb-renum-pre">Mesa</span>
                <input
                  type="text" inputMode="numeric" value={valores[m.id] ?? ''}
                  onChange={e => poner(m.id, e.target.value)}
                  aria-label={`Número nuevo de ${m.nombre}`}
                />
              </li>
            )
          })}
          {otras.map(m => (
            <li key={m.id} className="fija">
              <span className="mb-renum-hoy">{m.nombre}</span>
              <span className="mb-renum-sitio">
                {m.fila && m.col ? `hilera ${m.fila} · col ${m.col}` : 'sin sitio en el plano'}
              </span>
              <span className="mb-renum-flecha" aria-hidden="true">→</span>
              <span className="mb-renum-fija">sin número{esPrincipal(m) ? ' · va primera' : ''}</span>
            </li>
          ))}
        </ul>

        <div className="mb-renum-estado">
          {revision.repetidos.length > 0 && (
            <p className="mal">Hay dos mesas con el número {revision.repetidos.join(', ')}. El plano y las hojas no sabrían cuál es cuál.</p>
          )}
          {revision.vacios.length > 0 && (
            <p className="mal">{revision.vacios.length} mesa(s) sin número.</p>
          )}
          {revision.huecos.length > 0 && !revision.repetidos.length && (
            <p className="aviso">Queda sin usar el número {revision.huecos.join(', ')}: si el salón sí tiene esa mesa, va a faltar.</p>
          )}
          {!revision.todos.length && <p>Nada que cambiar: los números ya están así.</p>}
          {puede && (
            <p className="ok">
              {revision.cambios.length
                ? `${revision.cambios.length} mesa(s) cambian de número`
                : 'Los números se quedan igual'}
              {revision.todos.length > revision.cambios.length
                ? ` · se corrige el orden de ${revision.todos.length - revision.cambios.length} más`
                : ''}
            </p>
          )}
        </div>

        <div className="adm-modal-footer">
          <button className="adm-btn adm-btn-ghost" onClick={onCerrar}>Cancelar</button>
          <button className="adm-btn adm-btn-gold" disabled={!puede || guardando} onClick={aplicar}>
            {guardando ? 'Guardando…' : 'Renumerar'}
          </button>
        </div>
      </div>
    </div>
  )
}
