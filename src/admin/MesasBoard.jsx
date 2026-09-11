import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import { estadoOf, personasOf, ESTADOS } from './cupos'
import { nombreIncompleto, MOTIVO, normalizarNombre } from './nombres'
import { exportarExcel } from './descargar'
import { exportarImagenes } from './imagenes'
import MesaRedonda, { colorDe, arrastraMesa, idDeMesa } from './MesaRedonda'
import EditarNombre from './EditarNombre'
import RenumerarMesas from './RenumerarMesas'

// ─── Quién se sienta ───
// Se siembra a la PERSONA, no a la tarjeta: una familia puede repartirse entre
// dos mesas y eso pasa siempre con los niños.
//
// Hay tarjetas sin `guest_members` cargados. Existen y ocupan sitio aunque no
// sepamos los nombres, así que aportan «plazas sin nombre»: tantas como cupos
// le reconoce personasOf() a la tarjeta.
function armarGrupos(rows, miembrosPorTarjeta, incluir) {
  return rows
    .filter(r => incluir.includes(estadoOf(r)))
    .map(r => {
      const personas = (miembrosPorTarjeta[r.id] || [])
        .slice()
        .sort((a, b) => a.order_num - b.order_num)
      const cupos = personasOf(r)
      return {
        guest_id: r.id,
        nombre: r.group_name,
        estado: estadoOf(r),
        cupos,
        personas,
        // Cuando la tarjeta no tiene nombres, sus cupos viajan como plazas anónimas
        sinNombre: Math.max(0, cupos - personas.length),
        // Confirmó MENOS gente de la que tiene cargada: sobran fichas con nombre y
        // se podría sentar a quien no viene. No se puede saber a cuál, así que se
        // marcan todas las de la tarjeta y decide ella.
        parcial: cupos < personas.length,
        deMas: Math.max(0, personas.length - cupos),
      }
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

const idAnon = (guestId, i) => `anon:${guestId}:${i}`

// ─── El plano del salón ───
// Las mesas no van en un flujo automático que las apila en filas: van donde
// están de verdad en el salón. Puesto así el salón entero cabe en pantalla, que
// es lo que hacía imposible arrastrar a alguien hasta la última mesa.
//
// El sitio de cada mesa vive en la base (`mesas.fila` y `mesas.col`, migración
// 007) y se arrastra desde aquí. Antes salía del NOMBRE contra una cuadrícula
// escrita en el código, y eso ataba dos cosas que no van juntas: para mover una
// mesa había que renumerarla, y cada cambio del salón —hubo dos en tres días—
// era un cambio de código más una permutación en SQL. Ahora el número es lo que
// siempre fue, una etiqueta, y mover y renumerar son dos gestos distintos.
const HILERAS = 3    // el salón no pasa de tres hileras
const COL_MIN = 6    // ancho mínimo de la cuadrícula: el salón se ve entero

// Un mueble se dibuja para poder ubicarse, pero no vive en `mesas`: no tiene
// invitados, ni capitán, ni puestos, y no cuenta para nada. Una fila en la base
// lo metería en el Excel, en los avisos y en las hojas que se imprimen como una
// mesa vacía a la que le falta gente. Tampoco es un hueco: ahí no falta nada.
// Por eso su sitio sí se queda escrito aquí.
const MUEBLES = [{ rotulo: 'Mesa de Postres', fila: 1, col: 5 }]

// La de los novios responde a los dos nombres: el salón la llama «Mesa de los
// Novios» y en la base es «Mesa principal» desde que se creó. Aceptando ambos,
// el plano de respaldo queda bien se la renombre o no.
const NOVIOS = ['mesa de los novios', 'mesa principal']

// El salón tal como estaba dibujado antes de la 007. Es el respaldo para
// cuando esa migración todavía no se aplicó: se pinta igual que siempre, pero
// sin poder mover nada. La semilla de la 007 escribe estas mismas posiciones.
const PLANO = [
  [11, 8, 5,    2, null, 'novios'],
  [10, 7, 3, null, null,     null],
  [ 9, 6, 4,    1, null,     null],
]

/** «Mesa 7» → 7. Cualquier otro nombre no tiene número. */
const numeroDe = m => {
  const x = (m.nombre || '').match(/^\s*Mesa\s+(\d+)\s*$/i)
  return x ? Number(x[1]) : null
}

const esNovios = m => NOVIOS.includes((m.nombre || '').trim().toLowerCase())

/** Una celda del salón: o lleva mesa, o lleva un mueble, o está libre. */
const celdaLibre = (fila, col) => {
  const mu = MUEBLES.find(x => x.fila === fila && x.col === col)
  return mu ? { fila, col, mueble: mu.rotulo } : { fila, col, mesa: null }
}

// El plano de verdad: el que sale de `fila`/`col`. Siempre sobra una columna
// —y una hilera, hasta la tercera— para poder soltar una mesa en sitio nuevo
// sin tener que hacerle hueco antes.
function planoGuardado(mesas) {
  const puestas = [], sueltas = [], repetidas = []
  const ocupada = new Map()
  for (const m of mesas) {
    // Fuera de las tres hileras del salón no hay dónde pintarla, así que baja a
    // «sin sitio» en vez de desaparecer: de ahí se arrastra de vuelta adentro.
    if (!m.fila || !m.col || m.fila > HILERAS) { sueltas.push(m); continue }
    const k = `${m.fila}:${m.col}`
    // Dos mesas en la misma celda es posible: la base no lo impide a propósito
    // (un UNIQUE rompería el intercambio, que son dos UPDATE). La segunda no
    // se pierde —se manda abajo con las sueltas— y el tablero lo avisa.
    if (ocupada.has(k)) { repetidas.push(m); sueltas.push(m); continue }
    ocupada.set(k, m)
    puestas.push(m)
  }

  const columnas = Math.max(COL_MIN, ...puestas.map(m => m.col), ...MUEBLES.map(x => x.col)) + 1
  const filas = Math.min(HILERAS, Math.max(1, ...puestas.map(m => m.fila)) + 1)
  const hileras = Array.from({ length: filas }, (_, r) =>
    Array.from({ length: columnas }, (_, c) => {
      const celda = celdaLibre(r + 1, c + 1)
      return celda.mueble ? celda : { ...celda, mesa: ocupada.get(`${r + 1}:${c + 1}`) || null }
    }))

  return { hileras, columnas, sueltas, repetidas, movible: true }
}

// El respaldo, mientras la 007 no esté aplicada: la posición se deduce del
// nombre, como hasta el 10·IX·2026, y no se puede mover nada.
function planoPorNumero(mesas) {
  const porNumero = new Map()
  for (const m of mesas) { const n = numeroDe(m); if (n !== null && !porNumero.has(n)) porNumero.set(n, m) }
  const novios = mesas.find(esNovios)

  const colocadas = new Set()
  const hileras = PLANO.map((fila, r) => fila.map((c, i) => {
    const celda = celdaLibre(r + 1, i + 1)
    if (celda.mueble || c === null) return celda
    const m = c === 'novios' ? novios : porNumero.get(c)
    if (m) colocadas.add(m.id)
    // Una celda numerada sin mesa sí se enseña como hueco: un salón al que le
    // falta la 11 no es un salón de diez mesas.
    return { ...celda, mesa: m || null, rotulo: c === 'novios' ? 'Novios' : `Mesa ${c}` }
  }))

  // Las que no tienen sitio en la cuadrícula no se pierden: van debajo.
  return {
    hileras, columnas: PLANO[0].length, repetidas: [],
    sueltas: mesas.filter(m => !colocadas.has(m.id)), movible: false,
  }
}

// `fila in m` distingue «la columna no existe» —007 sin aplicar, PostgREST ni
// siquiera devuelve la clave— de «existe y está vacía». Mismo truco que con
// `capitan_id` y la 006.
const armarPlano = mesas =>
  mesas.some(m => 'fila' in m) ? planoGuardado(mesas) : planoPorNumero(mesas)

/** El motivo por el que una ficha está marcada, ya sea plaza anónima o nombre flojo. */
const motivoDe = ficha => ficha.anon ? 'vacio' : nombreIncompleto(ficha.nombre)

// ─── Ficha arrastrable ───
// En el pool la acción principal es sentar a alguien, así que el clic simple
// selecciona. Para editar están el ✎ y el doble clic; la vía descubrible es el
// ✎, que en las fichas marcadas se ve siempre.
function Ficha({ ficha, seleccionada, onSeleccionar, onQuitar, compacta, editando, onEditar, onGuardar, onCancelar }) {
  const falta = motivoDe(ficha)

  if (editando) {
    return (
      <EditarNombre
        ficha={ficha} compacto
        onGuardar={(v, o) => onGuardar(ficha, v, o)}
        onCancelar={onCancelar}
      />
    )
  }

  const titulo = [
    ficha.anon ? `Plaza sin nombre de ${ficha.grupo}` : `${ficha.nombre} · ${ficha.grupo}`,
    falta ? MOTIVO[falta] : null,
    ficha.parcial ? `OJO: esta tarjeta confirmó ${ficha.cupos} de ${ficha.total} personas.` : null,
    'Doble clic o ✎ para editar el nombre',
  ].filter(Boolean).join('\n')

  return (
    <div
      className={`mb-ficha${seleccionada ? ' on' : ''}${ficha.anon ? ' anon' : ''}${ficha.parcial ? ' parcial' : ''}${falta ? ' falta' : ''}${compacta ? ' mini' : ''}`}
      draggable
      tabIndex={0}
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', ficha.key)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => onSeleccionar(ficha)}
      onDoubleClick={e => { e.stopPropagation(); onEditar(ficha) }}
      // F2 es el atajo de «renombrar» de toda la vida; Enter también, porque
      // desde el teclado no hay doble clic que valga.
      onKeyDown={e => {
        if (e.key === 'F2' || e.key === 'Enter') { e.preventDefault(); onEditar(ficha) }
      }}
      title={titulo}
    >
      <span className="mb-ficha-n">{ficha.nombre}</span>
      {!compacta && <span className="mb-ficha-g">{ficha.grupo}</span>}
      <button
        className="mb-ficha-e"
        onClick={e => { e.stopPropagation(); onEditar(ficha) }}
        title="Editar el nombre" aria-label={`Editar el nombre de ${ficha.nombre}`}
      >✎</button>
      {onQuitar && (
        <button
          className="mb-ficha-x"
          onClick={e => { e.stopPropagation(); onQuitar(ficha) }}
          title="Quitar de la mesa"
          aria-label="Quitar de la mesa"
        >×</button>
      )}
    </div>
  )
}

// ─── La cola de nombres por completar ───
// Es la lista que hay que dejar vacía antes de mandar a imprimir. Se agrupa por
// tarjeta porque quién es «Invitado 3» se deduce del sobre y de dónde está
// sentado, no del nombre; por eso cada fila dice las dos cosas.
//
// Un clic abre la fila. El doble clic sigue existiendo en el pool y en las
// mesas, pero aquí no: nadie descubre un doble clic, y esta es la pantalla
// hecha para esta tarea.
function ColaNombres({ cola, total, editando, onEditar, onGuardar, onCancelar, mesaDe }) {
  return (
    <details className="mbn" open>
      <summary className="mbn-hdr">
        <div>
          <h3>Nombres por completar</h3>
          <p>Así están hoy en la base, y así saldrían impresos en las tarjetas de mesa y en el Excel.</p>
        </div>
        <div className="mbn-hdr-r">
          <b>{total}</b>
          <button
            className="adm-btn adm-btn-gold"
            onClick={e => { e.preventDefault(); e.stopPropagation(); onEditar(cola[0].fichas[0]) }}
          >
            Completar uno por uno
          </button>
        </div>
      </summary>

      <div className="mbn-lista">
        {cola.map(g => (
          <div className="mbn-grupo" key={g.guest_id}>
            <h4>
              <i style={{ '--fam': colorDe(g.guest_id) }} />
              {g.grupo}
              <span>{g.fichas.length}</span>
            </h4>
            <ul>
              {g.fichas.map(f => {
                const mesa = mesaDe(f.key)
                return (
                  <li key={f.key} className={editando?.key === f.key ? 'abierta' : ''}>
                    {editando?.key === f.key ? (
                      <EditarNombre
                        ficha={f} haySiguiente={editando.haySiguiente}
                        onGuardar={(v, o) => onGuardar(f, v, { ...o, zona: 'cola' })}
                        onCancelar={onCancelar}
                      />
                    ) : (
                      <button className="mbn-fila" onClick={() => onEditar(f)}>
                        <span className="mbn-actual">{f.nombre}</span>
                        <span className="mbn-motivo">{MOTIVO[motivoDe(f)]}</span>
                        <span className="mbn-donde">{mesa ? mesa.nombre : 'sin mesa'}</span>
                        <span className="mbn-lapiz" aria-hidden="true">✎</span>
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <p className="mbn-pie">
        Al ponerle nombre a una <b>plaza sin nombre</b> se crea la persona de verdad
        en su tarjeta, y si ya estaba sentada conserva la mesa.
      </p>
    </details>
  )
}

export default function MesasBoard() {
  const [rows, setRows]         = useState([])
  const [miembros, setMiembros] = useState({})
  const [mesas, setMesas]       = useState([])
  const [asientos, setAsientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState('')
  // Claves de las fichas seleccionadas. Es un conjunto y no una sola ficha
  // porque la unidad de trabajo real es la FAMILIA: sentarlas de a una era el
  // cuello de botella con 78 personas por ubicar.
  const [sel, setSel]           = useState([])
  const [busca, setBusca]       = useState('')
  const [incluir, setIncluir]   = useState(['confirmado', 'preconfirmado'])
  const [aviso, setAviso]       = useState('')
  const [exportando, setExportando] = useState('')
  // Qué ficha se está editando Y EN QUÉ ZONA. La zona no es un adorno: la misma
  // persona aparece en la cola y otra vez en el pool o en su mesa, y sin ella se
  // abrirían dos editores a la vez. Ver el comentario de EditarNombre.jsx.
  const [editando, setEditando]     = useState(null)   // { key, zona, haySiguiente }
  const [imagenes, setImagenes]     = useState('')
  const [sobre, setSobre]           = useState(null)  // mesa bajo el puntero al arrastrar
  const [nueva, setNueva]           = useState(null)  // mesa recién creada, para nombrarla
  // Mesa elegida para mover de sitio, por el camino del clic: el arrastre es
  // incómodo en tableta y el salón entero se reacomoda desde ahí.
  const [moviendo, setMoviendo]     = useState(null)
  const [renumerar, setRenumerar]   = useState(false)
  // «plano» reparte; «detalle» revisa. Se arranca en plano porque mientras
  // queda gente por sentar lo que importa es alcanzar todas las mesas.
  const [vista, setVista]           = useState('plano')

  const flash = m => { setAviso(m); setTimeout(() => setAviso(''), 3200) }

  const cargar = useCallback(async () => {
    setError('')
    const [g, m, ms, as] = await Promise.all([
      supabase.from('guest_summary').select('*'),
      supabase.from('guest_members').select('id, guest_id, name, order_num'),
      supabase.from('mesas').select('*').order('orden').order('nombre'),
      supabase.from('asientos').select('*'),
    ])
    const fallo = [g, m, ms, as].find(r => r.error)
    if (fallo) {
      setError(fallo.error.message.includes('does not exist')
        ? 'Faltan las tablas de mesas. Aplica supabase/migrations/005_mesas.sql en el SQL Editor de Supabase.'
        : fallo.error.message)
      setCargando(false)
      return
    }
    setRows(g.data || [])
    setMiembros((m.data || []).reduce((acc, x) => {
      (acc[x.guest_id] ||= []).push(x); return acc
    }, {}))
    setMesas(ms.data || [])
    setAsientos(as.data || [])
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const plano = useMemo(() => armarPlano(mesas), [mesas])

  const grupos = useMemo(
    () => armarGrupos(rows, miembros, incluir),
    [rows, miembros, incluir],
  )

  // Todas las fichas posibles, con y sin nombre
  const todasLasFichas = useMemo(() => {
    const out = []
    for (const gr of grupos) {
      for (const p of gr.personas) {
        out.push({ key: p.id, member_id: p.id, guest_id: gr.guest_id, nombre: p.name, grupo: gr.nombre, anon: false, parcial: gr.parcial, cupos: gr.cupos, total: gr.personas.length })
      }
      for (let i = 0; i < gr.sinNombre; i++) {
        out.push({
          key: idAnon(gr.guest_id, i), member_id: null, guest_id: gr.guest_id, indice: i,
          nombre: `Plaza ${i + 1}`, grupo: gr.nombre, anon: true,
        })
      }
    }
    return out
  }, [grupos])

  // Dónde está sentada cada ficha
  const asientoDe = useMemo(() => {
    const map = new Map()
    for (const a of asientos) {
      map.set(a.member_id ? a.member_id : idAnon(a.guest_id, a.orden), a)
    }
    return map
  }, [asientos])

  const sinMesa = todasLasFichas.filter(f => !asientoDe.has(f.key))

  // Fichas cuyo nombre no sirve para imprimir una tarjeta de mesa, estén
  // sentadas o no. Es la lista que hay que dejar vacía antes de la boda: en el
  // pool no bastaría, porque a la gente ya sentada no se la vería.
  const porCompletar = useMemo(
    () => todasLasFichas.filter(f => motivoDe(f)),
    [todasLasFichas],
  )

  // La misma lista agrupada por sobre: quién es «Invitado 3» se deduce de la
  // familia y de dónde está sentado.
  const cola = useMemo(() => {
    const porGrupo = new Map()
    for (const f of porCompletar) {
      if (!porGrupo.has(f.guest_id)) porGrupo.set(f.guest_id, { guest_id: f.guest_id, grupo: f.grupo, fichas: [] })
      porGrupo.get(f.guest_id).fichas.push(f)
    }
    return [...porGrupo.values()]
  }, [porCompletar])

  const mesaDe = key => {
    const a = asientoDe.get(key)
    return a && mesas.find(m => m.id === a.mesa_id)
  }

  const elegidas = useMemo(() => todasLasFichas.filter(f => sel.includes(f.key)), [todasLasFichas, sel])
  const limpiarSel = useCallback(() => setSel([]), [])
  const alternar = useCallback(ficha => setSel(v =>
    v.includes(ficha.key) ? v.filter(k => k !== ficha.key) : [...v, ficha.key]), [])
  // La cabecera de cada tarjeta selecciona o suelta a la familia entera
  const alternarGrupo = useCallback(fichas => setSel(v => {
    const claves = fichas.map(f => f.key)
    return claves.every(k => v.includes(k))
      ? v.filter(k => !claves.includes(k))
      : [...new Set([...v, ...claves])]
  }), [])

  const nombreDe = useCallback(
    memberId => Object.values(miembros).flat().find(x => x.id === memberId)?.name || '',
    [miembros],
  )

  const q = busca.trim().toLowerCase()
  const sinMesaFiltrada = q
    ? sinMesa.filter(f => f.nombre.toLowerCase().includes(q) || f.grupo.toLowerCase().includes(q))
    : sinMesa

  // Agrupado por sobre: así se ve de una que «los Pomarico son 4» y se pueden
  // mandar juntos a una mesa, que es como se reparte de verdad.
  const poolPorTarjeta = useMemo(() => {
    const m = new Map()
    for (const f of sinMesaFiltrada) {
      if (!m.has(f.guest_id)) m.set(f.guest_id, { guest_id: f.guest_id, grupo: f.grupo, fichas: [] })
      m.get(f.guest_id).fichas.push(f)
    }
    return [...m.values()]
  }, [sinMesaFiltrada])

  // Sitio libre por mesa, para la barra de destino
  const libresDe = mesaId => {
    const m = mesas.find(x => x.id === mesaId)
    return m ? m.capacidad - asientos.filter(a => a.mesa_id === mesaId).length : 0
  }

  const fichasDeMesa = mesaId => asientos
    .filter(a => a.mesa_id === mesaId)
    .map(a => {
      const key = a.member_id ? a.member_id : idAnon(a.guest_id, a.orden)
      return todasLasFichas.find(f => f.key === key)
        // Sentada pero ya no elegible (cambió de estado): se muestra igual, marcada
        || { key, member_id: a.member_id, guest_id: a.guest_id, nombre: a.etiqueta || 'Sin nombre', grupo: '—', anon: !a.member_id, huerfana: true }
    })

  // ─── Escribir ───
  const filaAsiento = (ficha, mesaId) => ({
    mesa_id: mesaId,
    guest_id: ficha.guest_id,
    member_id: ficha.member_id,
    etiqueta: ficha.anon ? `${ficha.grupo} · plaza ${(ficha.indice ?? 0) + 1}` : null,
    orden: ficha.anon ? (ficha.indice ?? 0) : 0,
  })

  /**
   * Sienta a varias de un golpe. Las nuevas van en un solo INSERT; las que ya
   * tenían mesa se actualizan una a una porque cada asiento es una fila distinta.
   *
   * NO se valida la capacidad, igual que en el resto del tablero: pasarse
   * mientras se reacomoda es normal y la mesa se marca en rojo. Ver 005_mesas.sql.
   */
  async function sentar(fichas, mesaId) {
    const lista = Array.isArray(fichas) ? fichas : [fichas]
    const nuevas = [], mudanzas = []
    for (const f of lista) {
      const previo = asientoDe.get(f.key)
      if (previo?.mesa_id === mesaId) continue
      previo ? mudanzas.push({ id: previo.id, fila: filaAsiento(f, mesaId) }) : nuevas.push(filaAsiento(f, mesaId))
    }
    if (!nuevas.length && !mudanzas.length) return setSel([])

    if (nuevas.length) {
      const { error: e } = await supabase.from('asientos').insert(nuevas)
      if (e) return flash(`No se pudo sentar: ${e.message}`)
    }
    for (const m of mudanzas) {
      const { error: e } = await supabase.from('asientos').update(m.fila).eq('id', m.id)
      if (e) return flash(`No se pudo mover: ${e.message}`)
    }
    await cargar()
    setSel([])
    const n = nuevas.length + mudanzas.length
    const mesa = mesas.find(x => x.id === mesaId)
    flash(n === 1
      ? `${lista[0].nombre} → ${mesa?.nombre || 'la mesa'}`
      : `${n} personas → ${mesa?.nombre || 'la mesa'}`)
  }

  // ─── Editar el nombre ───
  // Abrir el editor cancela la selección: si no, la barra de «toca una mesa para
  // sentarlo» se queda abajo y el clic con el que se cierra el editor sienta a
  // esa persona en la mesa que se haya tocado.
  const abrirEditor = useCallback((ficha, zona = 'cola') => {
    setSel([])
    const i = porCompletar.findIndex(f => f.key === ficha.key)
    setEditando({ key: ficha.key, zona, haySiguiente: zona === 'cola' && i >= 0 && i < porCompletar.length - 1 })
  }, [porCompletar])

  const cerrarEditor = useCallback(() => setEditando(null), [])
  const editandoEs = (ficha, zona) => editando?.key === ficha.key && editando.zona === zona

  /**
   * La siguiente ficha de la cola, para que Enter avance sin volver a buscar.
   *
   * `corrio` avisa de que se acaba de crear una persona a partir de una plaza
   * anónima: las plazas siguientes de ESA misma tarjeta bajan un índice —hay una
   * plaza menos— y con él cambia su clave.
   */
  function siguienteDeLaCola(ficha, corrio) {
    const i = porCompletar.findIndex(f => f.key === ficha.key)
    const s = i >= 0 ? porCompletar[i + 1] : null
    if (!s) return null
    const key = (corrio && s.anon && s.guest_id === ficha.guest_id)
      ? idAnon(s.guest_id, s.indice - 1)
      : s.key
    return { key, zona: 'cola', haySiguiente: i + 2 < porCompletar.length }
  }

  function avisarGuardado(nombre, ficha) {
    const falta = nombreIncompleto(nombre)
    const quedan = porCompletar.filter(f => f.key !== ficha.key).length + (falta ? 1 : 0)
    if (falta)   return flash(`Guardado: ${nombre} · ${MOTIVO[falta].toLowerCase()}`)
    if (!quedan) return flash('Listo: no queda ningún nombre por completar.')
    flash(`Guardado: ${nombre} · quedan ${quedan}`)
  }

  /**
   * Para una persona ya cargada es un UPDATE. Para una «plaza sin nombre» hay
   * que CREARLA: se inserta en guest_members y, si estaba sentada, el asiento
   * pasa a apuntar a la persona real en vez de a la etiqueta.
   */
  async function guardarNombre(ficha, valor, { zona = 'cola', seguir = false } = {}) {
    const nombre = normalizarNombre(valor)
    // Sin cambios: se cierra sin escribir nada y sin avisar de nada.
    const nada = !nombre || (!ficha.anon && nombre === ficha.nombre)
    const crea = !nada && !ficha.member_id
    setEditando(seguir && zona === 'cola' ? siguienteDeLaCola(ficha, crea) : null)
    if (nada) return

    if (ficha.member_id) {
      // Optimista: el nombre cambia en el tablero antes del ida y vuelta, para
      // que Enter encadene sin esperar a las cuatro consultas de cargar().
      setMiembros(prev => ({
        ...prev,
        [ficha.guest_id]: (prev[ficha.guest_id] || [])
          .map(x => x.id === ficha.member_id ? { ...x, name: nombre } : x),
      }))
      const { error: e } = await supabase.from('guest_members').update({ name: nombre }).eq('id', ficha.member_id)
      if (e) { await cargar(); return flash(`No se pudo guardar: ${e.message}`) }
    } else {
      const orden = (miembros[ficha.guest_id] || []).reduce((m, x) => Math.max(m, x.order_num || 0), 0) + 1
      const { data, error: e } = await supabase.from('guest_members')
        .insert({ guest_id: ficha.guest_id, name: nombre, order_num: orden })
        .select('id').single()
      if (e) return flash(`No se pudo crear la persona: ${e.message}`)

      const a = asientoDe.get(ficha.key)
      if (a) await supabase.from('asientos')
        .update({ member_id: data.id, etiqueta: null, orden: 0 }).eq('id', a.id)

      // Las plazas anónimas de esta tarjeta se numeran 0…n-1 y el asiento guarda
      // ese índice en `orden`. Al convertir la plaza k en persona quedan n-1
      // plazas, así que las posteriores hay que correrlas una posición: si no,
      // el asiento de la plaza k+1 deja de casar con ninguna ficha, aparece como
      // huérfano en su mesa y su sitio reaparece a la vez en «Sin mesa».
      const posteriores = asientos.filter(x =>
        x.guest_id === ficha.guest_id && !x.member_id && x.orden > (ficha.indice ?? 0))
      for (const x of posteriores) {
        await supabase.from('asientos')
          .update({ orden: x.orden - 1, etiqueta: `${ficha.grupo} · plaza ${x.orden}` })
          .eq('id', x.id)
      }
      await cargar()
    }
    avisarGuardado(nombre, ficha)
  }

  // ─── Capitán de la mesa ───
  // Se guarda la PERSONA, no el asiento: mover a alguien de mesa borra su
  // asiento y crea otro, así que un capitán atado al asiento se perdería en
  // cada arrastre. Ver 006_capitan_mesa.sql.
  async function asignarCapitan(mesa, memberId) {
    const { error: e } = await supabase.from('mesas')
      .update({ capitan_id: memberId || null }).eq('id', mesa.id)
    if (e) return flash(e.message.includes('capitan_id')
      ? 'Falta aplicar supabase/migrations/006_capitan_mesa.sql en el SQL Editor de Supabase.'
      : `No se pudo asignar: ${e.message}`)
    await cargar()
    flash(memberId
      ? `${nombreDe(memberId)} es capitán de «${mesa.nombre}»`
      : `«${mesa.nombre}» se quedó sin capitán`)
  }

  async function levantar(ficha) {
    const a = asientoDe.get(ficha.key)
    if (!a) return
    const { error: e } = await supabase.from('asientos').delete().eq('id', a.id)
    if (e) return flash(`No se pudo quitar: ${e.message}`)
    await cargar()
  }

  // ─── Arrastrar hasta una mesa que está mil píxeles más abajo ───
  // HTML5 drag no desplaza la página por su cuenta: al llegar al borde el
  // arrastre se queda ahí y hay que soltar, bajar y volver a empezar. Esto
  // acompaña el puntero mientras se arrastra cerca de los bordes.
  useEffect(() => {
    const ZONA = 120, PASO = 22
    const alArrastrar = e => {
      const alto = window.innerHeight
      const y = e.clientY
      let d = 0
      if (y < ZONA) d = -PASO * (1 - y / ZONA)
      else if (y > alto - ZONA) d = PASO * (1 - (alto - y) / ZONA)
      if (!d) return
      // El contenedor con scroll es .adm-main cuando tiene alto propio; si no,
      // el que se mueve es el documento.
      const main = document.querySelector('.adm-main')
      const caja = main && main.scrollHeight > main.clientHeight ? main : document.scrollingElement
      caja?.scrollBy(0, d)
    }
    document.addEventListener('dragover', alArrastrar)
    return () => document.removeEventListener('dragover', alArrastrar)
  }, [])

  // Esc suelta lo que esté elegido —gente o mesa—: es la salida esperada y
  // evita sentar, o mover una mesa, sin querer.
  useEffect(() => {
    if (!sel.length && !moviendo) return
    const alPulsar = e => { if (e.key === 'Escape') { setSel([]); setMoviendo(null) } }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [sel.length, moviendo])

  // ─── Renumerar ───
  // Se escribe por `id`, nunca buscando por nombre, y por eso una permutación
  // con ciclos (la 6 pasa a 2 y la 2 a 6) no se pisa a sí misma. El mismo
  // cuidado que obliga al UPDATE único en supabase/scripts/renumerar-mesas.sql,
  // donde el mapeo se escribía a mano.
  async function aplicarRenumeracion(cambios) {
    for (const c of cambios) {
      const { error: e } = await supabase.from('mesas')
        .update({ nombre: c.nombre, orden: c.orden }).eq('id', c.id)
      if (e) return flash(e.message)
    }
    setRenumerar(false)
    await cargar()
    flash(`Renumeradas ${cambios.length} mesa(s) · regenerá el Excel y las imágenes`)
  }

  // ─── Mover una mesa de sitio ───
  // Escribe `fila`/`col` por id. Si la celda ya tiene mesa, las dos se
  // intercambian el sitio: es lo que uno espera al soltar una encima de otra, y
  // evita dejar dos en la misma celda —la base no lo impide a propósito, así
  // que lo cuida el panel—. `fila` en null saca la mesa del plano sin borrarla.
  async function moverMesa(mesaId, fila, col) {
    const yo = mesas.find(m => m.id === mesaId)
    if (!yo) return
    setMoviendo(null)
    if ((yo.fila ?? null) === fila && (yo.col ?? null) === col) return
    const ocupa = fila && mesas.find(m => m.fila === fila && m.col === col && m.id !== mesaId)
    const cambios = [{ id: mesaId, fila, col }]
    if (ocupa) cambios.push({ id: ocupa.id, fila: yo.fila ?? null, col: yo.col ?? null })
    for (const c of cambios) {
      const { error: e } = await supabase.from('mesas').update({ fila: c.fila, col: c.col }).eq('id', c.id)
      if (e) return flash(e.message.includes('column') ? 'Falta aplicar 007_plano_mesas.sql' : e.message)
    }
    await cargar()
    flash(ocupa
      ? `${yo.nombre} y ${ocupa.nombre} intercambiaron sitio`
      : fila ? `${yo.nombre} → hilera ${fila}, columna ${col}` : `${yo.nombre} salió del plano`)
  }

  // La mesa de los novios va aparte y no lleva número: la numeración corriente
  // empieza en «Mesa 1» después de ella. Se toma del número más alto que ya
  // exista y no de cuántas mesas hay, para no repetir si se borró una del medio.
  function siguienteNumero() {
    const usados = mesas
      .map(m => (m.nombre || '').match(/^\s*Mesa\s+(\d+)\s*$/i))
      .filter(Boolean).map(x => Number(x[1]))
    return usados.length ? Math.max(...usados) + 1 : 1
  }

  async function nuevaMesa() {
    const { data, error: e } = await supabase.from('mesas')
      .insert({ nombre: `Mesa ${siguienteNumero()}`, capacidad: 8, orden: mesas.length + 1 })
      .select('id').single()
    if (e) return flash(e.message)
    await cargar()
    // Se abre el nombre seleccionado para escribir encima: el «Mesa 3» es solo
    // un marcador de posición, no el nombre que va a llevar.
    setNueva(data.id)
    setTimeout(() => setNueva(null), 1500)
  }

  async function editarMesa(m, campos) {
    const { error: e } = await supabase.from('mesas').update(campos).eq('id', m.id)
    if (e) return flash(e.message)
    await cargar()
  }

  async function borrarMesa(m) {
    const ocupados = asientos.filter(a => a.mesa_id === m.id).length
    if (ocupados && !confirm(`«${m.nombre}» tiene ${ocupados} persona(s) sentada(s). Se quedarán sin mesa. ¿Borrar?`)) return
    const { error: e } = await supabase.from('mesas').delete().eq('id', m.id)
    if (e) return flash(e.message)
    await cargar()
  }

  // ─── Reparto sugerido ───
  // Mantiene junta cada tarjeta: es lo primero que la gente nota y lo que más
  // molesta si se rompe. Va de la familia más grande a la más pequeña y la
  // coloca en la mesa donde quepa más ajustada, que es lo que menos huecos deja.
  async function sugerir() {
    const libres = new Map(mesas.map(m => [m.id, m.capacidad - asientos.filter(a => a.mesa_id === m.id).length]))
    const porGrupo = new Map()
    for (const f of sinMesa) {
      if (!porGrupo.has(f.guest_id)) porGrupo.set(f.guest_id, [])
      porGrupo.get(f.guest_id).push(f)
    }
    const bloques = [...porGrupo.values()].sort((a, b) => b.length - a.length)

    const nuevos = []
    const sinSitio = []
    for (const bloque of bloques) {
      const cabe = [...libres.entries()]
        .filter(([, n]) => n >= bloque.length)
        .sort((a, b) => a[1] - b[1])[0]        // la más ajustada
      if (!cabe) { sinSitio.push(bloque); continue }
      const [mesaId] = cabe
      libres.set(mesaId, libres.get(mesaId) - bloque.length)
      for (const f of bloque) {
        nuevos.push({
          mesa_id: mesaId, guest_id: f.guest_id, member_id: f.member_id,
          etiqueta: f.anon ? `${f.grupo} · plaza ${(f.indice ?? 0) + 1}` : null,
          orden: f.anon ? (f.indice ?? 0) : 0,
        })
      }
    }
    if (!nuevos.length) return flash('No hay sitio libre para nadie más.')
    const { error: e } = await supabase.from('asientos').insert(nuevos)
    if (e) return flash(e.message)
    await cargar()
    flash(sinSitio.length
      ? `Sentadas ${nuevos.length}. ${sinSitio.length} tarjeta(s) no cupieron enteras.`
      : `Sentadas ${nuevos.length} personas.`)
  }

  // ─── Revisión de cupos ───
  const revision = useMemo(() => {
    const elegibles = rows.filter(r => incluir.includes(estadoOf(r)))
    const sinNombres = elegibles.filter(r => !(miembros[r.id] || []).length)
    const sentadas = asientos.length
    const totalCupos = elegibles.reduce((s, r) => s + personasOf(r), 0)
    const sobrepasadas = mesas.filter(m => asientos.filter(a => a.mesa_id === m.id).length > m.capacidad)
    const capacidadMesas = mesas.reduce((s, m) => s + m.capacidad, 0)
    // Fichas con nombre que sobran: tarjetas que confirmaron menos gente de la
    // que tienen cargada. Se pueden sentar por error.
    const deMas = grupos.reduce((s, g) => s + (g.deMas || 0), 0)
    // Capitanes. Sólo cuentan las mesas que tienen a alguien sentado: una mesa
    // vacía todavía no puede tener capitán y no debería salir como pendiente.
    const hayCapitanes = mesas.some(m => 'capitan_id' in m)
    const conGente = mesas.filter(m => asientos.some(a => a.mesa_id === m.id))
    // Vale como capitán quien está sentado EN ESA mesa. Un capitán al que se
    // movió de sitio no cuenta: si contara, el tablero diría «todas con capitán»
    // mientras avisa de que uno está fuera, y las dos fichas se contradirían.
    const mandaAqui = m => m.capitan_id && asientos.some(a => a.mesa_id === m.id && a.member_id === m.capitan_id)
    const sinCapitan = conGente.filter(m => !mandaAqui(m))
    const capitanFuera = mesas.filter(m => m.capitan_id && !mandaAqui(m))
    return { sinNombres, sentadas, totalCupos, sobrepasadas, capacidadMesas, deMas,
      faltan: totalCupos - sentadas, hayCapitanes, conGente, sinCapitan, capitanFuera }
  }, [rows, miembros, asientos, mesas, incluir, grupos])

  // Una mesa del plano. Comparte MesaRedonda para que el círculo se dibuje en
  // un solo sitio; `mini` le quita la lista, el capitán y el pie.
  const mesaMini = m => (
    <MesaRedonda
      key={m.id}
      mini mesa={m} gente={fichasDeMesa(m.id)}
      sel={sel} elegidas={elegidas} sobre={sobre}
      onSentar={sentar} onLevantar={levantar} onSeleccionar={alternar}
      zona={`mesa:${m.id}`} editando={editando}
      onEditar={x => abrirEditor(x, `mesa:${m.id}`)}
      onGuardar={(x, v, o) => guardarNombre(x, v, { ...o, zona: `mesa:${m.id}` })}
      onCancelar={cerrarEditor}
      onEditarMesa={editarMesa} onBorrar={borrarMesa}
      buscarFicha={k => todasLasFichas.find(x => x.key === k)}
      onSobre={setSobre} onCapitan={asignarCapitan} nombreDe={nombreDe}
      // Elegir una mesa para moverla suelta la selección de gente: con las dos
      // vivas, un clic en una mesa querría decir dos cosas a la vez.
      movible={plano.movible} moviendo={moviendo === m.id}
      onMover={() => { setSel([]); setMoviendo(v => v === m.id ? null : m.id) }}
      onAbrir={() => { setVista('detalle'); setTimeout(() => {
        document.getElementById(`mesa-${m.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 40) }}
    />
  )

  // Una celda del salón. Con la 007 aplicada, TODA celda es destino: se suelta
  // una mesa encima —o se toca, si venía elegida con el asa— y ahí se queda. La
  // celda ocupada también acepta: las dos mesas intercambian sitio.
  const celdaPlano = celda => {
    const { fila, col } = celda
    const k = `${fila}:${col}`
    if (celda.mueble) return <div key={k} className="mb-mueble">{celda.mueble}</div>

    // Sin la 007 el plano se mira pero no se toca: la posición sale del nombre.
    if (!plano.movible) {
      if (celda.mesa) return mesaMini(celda.mesa)
      if (celda.rotulo) return <div key={k} className="mb-hueco">{celda.rotulo}</div>
      return <div key={k} className="mb-nada" aria-hidden="true" />
    }

    const eligiendo = moviendo && moviendo !== celda.mesa?.id
    const queViene = eligiendo ? mesas.find(m => m.id === moviendo)?.nombre : ''
    return (
      <div
        key={k}
        className={`mb-celda${celda.mesa ? ' con' : ''}${eligiendo ? ' destino' : ''}`}
        onDragOver={e => { if (arrastraMesa(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
        onDrop={e => {
          const id = idDeMesa(e)
          if (!id) return
          e.preventDefault()
          e.stopPropagation()
          moverMesa(id, fila, col)
        }}
        onClick={() => { if (eligiendo) moverMesa(moviendo, fila, col) }}
        title={eligiendo
          ? celda.mesa
            ? `Intercambiar ${queViene} con ${celda.mesa.nombre}`
            : `Traer ${queViene} aquí · hilera ${fila}, columna ${col}`
          : undefined}
      >
        {celda.mesa
          ? mesaMini(celda.mesa)
          : <span className="mb-celda-sitio" aria-hidden="true">{fila}·{col}</span>}
      </div>
    )
  }

  if (cargando) return <div className="adm-main"><p style={{ color: '#64748b' }}>Cargando…</p></div>

  if (error) return (
    <div className="adm-main">
      <div className="mb-error">
        <h3>No se pudo abrir el tablero</h3>
        <p>{error}</p>
      </div>
    </div>
  )

  return (
    <div className={`adm-main mb-root${elegidas.length ? ' con-destino' : ''}`}>
      <div className="adm-hdr">
        <h2>Mesas del salón</h2>
        <div className="adm-hdr-r">
          <input
            className="adm-search" placeholder="Buscar persona o familia…"
            value={busca} onChange={e => setBusca(e.target.value)}
          />
          <button className="adm-btn adm-btn-ghost" onClick={sugerir} title="Reparte a quien falte manteniendo cada familia junta">
            Sugerir reparto
          </button>
          <button
            className="adm-btn adm-btn-ghost" disabled={!!exportando}
            title="Descarga el .xlsx con las mesas y los cupos, con fórmulas vivas"
            onClick={async () => {
              try {
                const r = await exportarExcel(setExportando)
                flash(`Excel listo · ${r.tarjetas} tarjetas · ${r.mesas} mesas`)
              } catch (e) { flash(`No se pudo exportar: ${e.message}`) }
              finally { setExportando('') }
            }}
          >{exportando || 'Exportar Excel'}</button>
          <button
            className="adm-btn adm-btn-gold" disabled={!!imagenes}
            title="Descarga un ZIP con el plano del salón y una hoja por mesa, listas para imprimir"
            onClick={async () => {
              try {
                const r = await exportarImagenes(setImagenes)
                flash(r.faltan
                  ? `Imágenes listas · ${r.mesas} mesas · ojo: ${r.faltan} nombres por completar`
                  : `Imágenes listas · ${r.mesas} mesas`)
              } catch (e) { flash(`No se pudo exportar: ${e.message}`) }
              finally { setImagenes('') }
            }}
          >{imagenes || 'Exportar imágenes'}</button>
          {mesas.length > 0 && (
            <button className="adm-btn adm-btn-ghost" onClick={() => setRenumerar(true)}
                    title="Cambiar el número de las mesas y el orden en que salen en el Excel y las hojas">
              Renumerar
            </button>
          )}
          <button className="adm-btn adm-btn-gold" onClick={nuevaMesa}>+ Mesa</button>
        </div>
      </div>

      {/* ── Revisión de cupos ── */}
      <div className="mb-revision">
        <div className="mb-rev-item">
          <b>{revision.totalCupos}</b><span>cupos a sentar</span>
        </div>
        <div className="mb-rev-item">
          <b>{revision.sentadas}</b><span>sentados</span>
        </div>
        <div className={`mb-rev-item${revision.faltan > 0 ? ' warn' : ''}`}>
          <b>{revision.faltan}</b><span>sin mesa</span>
        </div>
        <div className={`mb-rev-item${revision.capacidadMesas < revision.totalCupos ? ' warn' : ''}`}>
          <b>{revision.capacidadMesas}</b><span>puestos en {mesas.length} mesas</span>
        </div>
        {revision.sinNombres.length > 0 && (
          <div className="mb-rev-item warn" title={revision.sinNombres.map(r => r.group_name).join('\n')}>
            <b>{revision.sinNombres.length}</b><span>tarjetas sin nombres cargados</span>
          </div>
        )}
        {revision.deMas > 0 && (
          <div className="mb-rev-item warn" title="Hay tarjetas que confirmaron menos personas de las que tienen cargadas. Sus fichas van marcadas: sienta solo a quienes vienen.">
            <b>{revision.deMas}</b><span>fichas de más</span>
          </div>
        )}
        {revision.hayCapitanes && revision.conGente.length > 0 && (
          <div className={`mb-rev-item${revision.sinCapitan.length ? ' warn' : ''}`}
               title={revision.sinCapitan.length
                 ? `Sin capitán:\n${revision.sinCapitan.map(m => m.nombre).join('\n')}`
                 : 'Todas las mesas con gente tienen capitán'}>
            <b>{revision.conGente.length - revision.sinCapitan.length}<i>/</i>{revision.conGente.length}</b>
            <span>mesas con capitán</span>
          </div>
        )}
        {revision.capitanFuera.length > 0 && (
          <div className="mb-rev-item warn"
               title={`El capitán ya no está sentado en su mesa:\n${revision.capitanFuera.map(m => m.nombre).join('\n')}`}>
            <b>{revision.capitanFuera.length}</b><span>capitanes fuera de su mesa</span>
          </div>
        )}
        {revision.sobrepasadas.length > 0 && (
          <div className="mb-rev-item bad">
            <b>{revision.sobrepasadas.length}</b><span>mesas pasadas de capacidad</span>
          </div>
        )}
      </div>

      {porCompletar.length > 0 && (
        <ColaNombres
          cola={cola} total={porCompletar.length}
          editando={editando?.zona === 'cola' ? editando : null}
          onEditar={f => abrirEditor(f, 'cola')}
          onGuardar={guardarNombre}
          onCancelar={cerrarEditor}
          mesaDe={mesaDe}
        />
      )}

      <div className="mb-filtros">
        <span>Vista:</span>
        <button className={`mb-chip${vista === 'plano' ? ' on' : ''}`} onClick={() => setVista('plano')}
                title="Las mesas donde están en el salón, todas en pantalla">Plano del salón</button>
        <button className={`mb-chip${vista === 'detalle' ? ' on' : ''}`} onClick={() => setVista('detalle')}
                title="Cada mesa con sus nombres, su capitán y sus puestos">Detalle</button>
        <span className="mb-filtros-sep" />
        <span>Sentar a:</span>
        {['confirmado', 'preconfirmado', 'sin_respuesta', 'no_contesta'].map(k => (
          <button
            key={k}
            className={`mb-chip${incluir.includes(k) ? ' on' : ''}`}
            onClick={() => setIncluir(v => v.includes(k) ? v.filter(x => x !== k) : [...v, k])}
          >{ESTADOS[k].lbl}</button>
        ))}
      </div>

      <div className="mb-grid">
        {/* ── Sin mesa ── */}
        <aside
          className="mb-pool"
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            const f = todasLasFichas.find(x => x.key === e.dataTransfer.getData('text/plain'))
            if (f) levantar(f)
          }}
        >
          <h3>Sin mesa <span>{sinMesaFiltrada.length}</span></h3>
          {sinMesaFiltrada.length === 0 && (
            <p className="mb-vacio">{busca ? 'Nadie con ese nombre está sin mesa.' : 'Todos ubicados.'}</p>
          )}
          <div className="mb-pool-list">
            {poolPorTarjeta.map(g => {
              const todas = g.fichas.every(f => sel.includes(f.key))
              return (
                <div className="mb-sobre" key={g.guest_id}>
                  {/* La cabecera manda a la familia entera: un clic la elige toda */}
                  <button
                    className={`mb-sobre-h${todas ? ' on' : ''}`}
                    onClick={() => alternarGrupo(g.fichas)}
                    title={todas
                      ? `Soltar a las ${g.fichas.length} personas de esta tarjeta`
                      : `Elegir a las ${g.fichas.length} personas de esta tarjeta`}
                  >
                    <i style={{ '--fam': colorDe(g.guest_id) }} />
                    <span>{g.grupo}</span>
                    <b>{g.fichas.length}</b>
                  </button>
                  {g.fichas.map(f => (
                    <Ficha
                      key={f.key} ficha={f} compacta
                      seleccionada={sel.includes(f.key)} onSeleccionar={alternar}
                      editando={editandoEs(f, 'pool')}
                      onEditar={x => abrirEditor(x, 'pool')}
                      onGuardar={(x, v, o) => guardarNombre(x, v, { ...o, zona: 'pool' })}
                      onCancelar={cerrarEditor}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </aside>

        {/* ── Mesas ── */}
        <div className="mb-mesas">
          {mesas.length === 0 && (
            <div className="mb-sin-mesas">
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="17" />
                <circle cx="32" cy="9"  r="4" /><circle cx="48" cy="16" r="4" />
                <circle cx="55" cy="32" r="4" /><circle cx="48" cy="48" r="4" />
                <circle cx="32" cy="55" r="4" /><circle cx="16" cy="48" r="4" />
                <circle cx="9"  cy="32" r="4" /><circle cx="16" cy="16" r="4" />
              </svg>
              <h3>El salón está vacío</h3>
              <p>
                Crea las mesas como las quieras: ponles el nombre que van a llevar
                («Los abuelos», «Amigos del colegio») y los puestos que tenga cada una.
              </p>
              <button className="adm-btn adm-btn-gold" onClick={nuevaMesa}>Crear la primera mesa</button>
            </div>
          )}
          {vista === 'detalle' && mesas.map(m => (
            <MesaRedonda
              key={m.id}
              mesa={m}
              gente={fichasDeMesa(m.id)}
              sel={sel}
              elegidas={elegidas}
              sobre={sobre}
              onSentar={sentar}
              onLevantar={levantar}
              onSeleccionar={alternar}
              zona={`mesa:${m.id}`}
              editando={editando}
              onEditar={x => abrirEditor(x, `mesa:${m.id}`)}
              onGuardar={(x, v, o) => guardarNombre(x, v, { ...o, zona: `mesa:${m.id}` })}
              onCancelar={cerrarEditor}
              onEditarMesa={editarMesa}
              onBorrar={borrarMesa}
              buscarFicha={k => todasLasFichas.find(x => x.key === k)}
              onSobre={setSobre}
              nueva={nueva === m.id}
              onCapitan={asignarCapitan}
              nombreDe={nombreDe}
            />
          ))}

          {/* ── El plano ──
              El salón, no una lista: cada mesa donde está de verdad. El sitio
              sale de `fila`/`col` y se arrastra —o se toca el asa y después la
              celda, que es como se trabaja en tableta—. */}
          {vista === 'plano' && mesas.length > 0 && (
            <div className={`mb-salon${moviendo ? ' moviendo' : ''}`}>
              {plano.movible && (
                <p className="mb-salon-ayuda">
                  {moviendo
                    ? <><b>{mesas.find(m => m.id === moviendo)?.nombre}</b> elegida · tocá el sitio del salón donde va, o Esc para dejarla donde está</>
                    : <>Arrastrá una mesa por su asa <span className="mb-asa-ej" aria-hidden="true">✥</span> para moverla de sitio, o tocá el asa y después la celda. Si soltás encima de otra mesa, las dos intercambian sitio.</>}
                </p>
              )}
              <div className="mb-salon-plano">
                <span className="mb-borde" aria-hidden="true">parte superior</span>
                <div className="mb-hileras">
                  {plano.hileras.map((fila, r) => (
                    <Fragment key={r}>
                      {r > 0 && <div className="mb-pasillo"><span>pasillo</span></div>}
                      <div className="mb-hilera"
                           style={{ gridTemplateColumns: `repeat(${plano.columnas}, minmax(0, 1fr))` }}>
                        {fila.map(celda => celdaPlano(celda))}
                      </div>
                    </Fragment>
                  ))}
                </div>
                <span className="mb-borde" aria-hidden="true">parte inferior</span>
              </div>

              {/* Fuera del plano: mesas todavía sin sitio. No se pierden, y de
                  aquí se arrastran adentro. Soltar una mesa aquí la saca del
                  salón sin borrarla, que es como se deshace una colocación. */}
              {(plano.sueltas.length > 0 || moviendo) && (
                <div
                  className={`mb-salon-cab otras${moviendo ? ' destino' : ''}`}
                  onDragOver={e => { if (arrastraMesa(e)) e.preventDefault() }}
                  onDrop={e => { const id = idDeMesa(e); if (id) { e.preventDefault(); moverMesa(id, null, null) } }}
                  onClick={() => { if (moviendo) moverMesa(moviendo, null, null) }}
                >
                  <span className="mb-fuera-t">Sin sitio en el plano</span>
                  {plano.sueltas.map(mesaMini)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {renumerar && (
        <RenumerarMesas
          mesas={mesas}
          onCerrar={() => setRenumerar(false)}
          onAplicar={aplicarRenumeracion}
        />
      )}

      {/* ── A qué mesa ──
          Las mesas vienen a la selección en vez de obligar a arrastrar mil
          píxeles hacia abajo hasta una que ni se ve. Cada botón dice cuánto
          sitio le queda, así se elige sin ir a mirar. */}
      {elegidas.length > 0 && (
        <div className="mb-destino">
          <div className="mb-destino-t">
            <b>{elegidas.length}</b>
            <span>
              {elegidas.length === 1 ? elegidas[0].nombre : 'personas elegidas'}
              {' · '}¿a qué mesa?
            </span>
            <button className="mb-destino-x" onClick={limpiarSel} title="Soltar la selección (Esc)">
              Cancelar
            </button>
          </div>
          <div className="mb-destino-l">
            {mesas.map(m => {
              const libres = libresDe(m.id)
              return (
                <button
                  key={m.id}
                  className={`mb-destino-m${libres <= 0 ? ' llena' : libres < elegidas.length ? ' justa' : ''}`}
                  onClick={() => sentar(elegidas, m.id)}
                  title={libres >= elegidas.length
                    ? `Sentar aquí · quedan ${libres} puestos`
                    : `Aquí solo quedan ${libres} puestos para ${elegidas.length} personas — se puede, la mesa quedará marcada`}
                >
                  <span>{m.nombre}</span>
                  <i>{libres > 0 ? `${libres} libre${libres === 1 ? '' : 's'}` : 'llena'}</i>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {aviso && <div className="mb-toast">{aviso}</div>}
    </div>
  )
}
