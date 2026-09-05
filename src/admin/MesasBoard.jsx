import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { estadoOf, personasOf, ESTADOS } from './cupos'
import { nombreIncompleto, MOTIVO, normalizarNombre } from './nombres'
import { exportarExcel } from './descargar'
import { exportarImagenes } from './imagenes'

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

// ─── Ficha arrastrable y editable ───
// Doble clic sobre el nombre lo edita en el sitio. Es la forma más directa de
// arreglar los «Invitado 3» sin salir del tablero, que es justo donde se ven.
function Ficha({ ficha, seleccionada, onSeleccionar, onQuitar, compacta, editando, onEditar, onGuardar, onCancelar }) {
  const falta = ficha.anon ? null : nombreIncompleto(ficha.nombre)

  if (editando) {
    return (
      <form
        className="mb-ficha editando"
        onSubmit={e => { e.preventDefault(); onGuardar(ficha, e.target.elements.n.value) }}
      >
        <input
          name="n" autoFocus defaultValue={ficha.anon ? '' : ficha.nombre}
          placeholder={ficha.anon ? `Nombre para esta plaza de ${ficha.grupo}` : 'Nombre y apellido'}
          onKeyDown={e => { if (e.key === 'Escape') onCancelar() }}
          onBlur={e => onGuardar(ficha, e.target.value)}
        />
      </form>
    )
  }

  const titulo = [
    ficha.anon ? `Plaza sin nombre de ${ficha.grupo}` : `${ficha.nombre} · ${ficha.grupo}`,
    falta ? MOTIVO[falta] : null,
    ficha.parcial ? `OJO: esta tarjeta confirmó ${ficha.cupos} de ${ficha.total} personas.` : null,
    'Doble clic para editar el nombre',
  ].filter(Boolean).join('\n')

  return (
    <div
      className={`mb-ficha${seleccionada ? ' on' : ''}${ficha.anon ? ' anon' : ''}${ficha.parcial ? ' parcial' : ''}${falta || ficha.anon ? ' falta' : ''}${compacta ? ' mini' : ''}`}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', ficha.key)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => onSeleccionar(ficha)}
      onDoubleClick={e => { e.stopPropagation(); onEditar(ficha) }}
      title={titulo}
    >
      <span className="mb-ficha-n">{ficha.nombre}</span>
      {!compacta && <span className="mb-ficha-g">{ficha.grupo}</span>}
      <button
        className="mb-ficha-e"
        onClick={e => { e.stopPropagation(); onEditar(ficha) }}
        title="Editar el nombre" aria-label="Editar el nombre"
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

export default function MesasBoard() {
  const [rows, setRows]         = useState([])
  const [miembros, setMiembros] = useState({})
  const [mesas, setMesas]       = useState([])
  const [asientos, setAsientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState('')
  const [sel, setSel]           = useState(null)   // ficha seleccionada (modo clic)
  const [busca, setBusca]       = useState('')
  const [incluir, setIncluir]   = useState(['confirmado', 'preconfirmado'])
  const [aviso, setAviso]       = useState('')
  const [exportando, setExportando] = useState('')
  const [editando, setEditando]     = useState(null)   // key de la ficha en edición
  const [imagenes, setImagenes]     = useState('')

  const flash = m => { setAviso(m); setTimeout(() => setAviso(''), 2200) }

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
    () => todasLasFichas.filter(f => f.anon || nombreIncompleto(f.nombre)),
    [todasLasFichas],
  )
  const q = busca.trim().toLowerCase()
  const sinMesaFiltrada = q
    ? sinMesa.filter(f => f.nombre.toLowerCase().includes(q) || f.grupo.toLowerCase().includes(q))
    : sinMesa

  const fichasDeMesa = mesaId => asientos
    .filter(a => a.mesa_id === mesaId)
    .map(a => {
      const key = a.member_id ? a.member_id : idAnon(a.guest_id, a.orden)
      return todasLasFichas.find(f => f.key === key)
        // Sentada pero ya no elegible (cambió de estado): se muestra igual, marcada
        || { key, member_id: a.member_id, guest_id: a.guest_id, nombre: a.etiqueta || 'Sin nombre', grupo: '—', anon: !a.member_id, huerfana: true }
    })

  // ─── Escribir ───
  async function sentar(ficha, mesaId) {
    const previo = asientoDe.get(ficha.key)
    if (previo?.mesa_id === mesaId) return
    const fila = {
      mesa_id: mesaId,
      guest_id: ficha.guest_id,
      member_id: ficha.member_id,
      etiqueta: ficha.anon ? `${ficha.grupo} · plaza ${(ficha.indice ?? 0) + 1}` : null,
      orden: ficha.anon ? (ficha.indice ?? 0) : 0,
    }
    const { error: e } = previo
      ? await supabase.from('asientos').update(fila).eq('id', previo.id)
      : await supabase.from('asientos').insert(fila)
    if (e) return flash(`No se pudo sentar: ${e.message}`)
    await cargar()
    setSel(null)
  }

  // ─── Editar el nombre ───
  // Para una persona ya cargada es un UPDATE. Para una «plaza sin nombre» hay
  // que CREARLA: se inserta en guest_members y, si estaba sentada, el asiento
  // pasa a apuntar a la persona real en vez de a la etiqueta.
  async function guardarNombre(ficha, valor) {
    const nombre = normalizarNombre(valor)
    setEditando(null)
    if (!nombre || (!ficha.anon && nombre === ficha.nombre)) return

    if (ficha.member_id) {
      const { error: e } = await supabase.from('guest_members').update({ name: nombre }).eq('id', ficha.member_id)
      if (e) return flash(`No se pudo guardar: ${e.message}`)
    } else {
      const orden = (miembros[ficha.guest_id] || []).reduce((m, x) => Math.max(m, x.order_num || 0), 0) + 1
      const { data, error: e } = await supabase.from('guest_members')
        .insert({ guest_id: ficha.guest_id, name: nombre, order_num: orden })
        .select('id').single()
      if (e) return flash(`No se pudo crear la persona: ${e.message}`)
      const a = asientoDe.get(ficha.key)
      if (a) await supabase.from('asientos')
        .update({ member_id: data.id, etiqueta: null, orden: 0 }).eq('id', a.id)
    }
    await cargar()
    flash(`Guardado: ${nombre}`)
  }

  async function levantar(ficha) {
    const a = asientoDe.get(ficha.key)
    if (!a) return
    const { error: e } = await supabase.from('asientos').delete().eq('id', a.id)
    if (e) return flash(`No se pudo quitar: ${e.message}`)
    await cargar()
  }

  async function nuevaMesa() {
    const n = mesas.length + 1
    const { error: e } = await supabase.from('mesas').insert({ nombre: `Mesa ${n}`, capacidad: 8, orden: n })
    if (e) return flash(e.message)
    await cargar()
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
    return { sinNombres, sentadas, totalCupos, sobrepasadas, capacidadMesas, deMas, faltan: totalCupos - sentadas }
  }, [rows, miembros, asientos, mesas, incluir, grupos])

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
    <div className="adm-main mb-root">
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
        {revision.sobrepasadas.length > 0 && (
          <div className="mb-rev-item bad">
            <b>{revision.sobrepasadas.length}</b><span>mesas pasadas de capacidad</span>
          </div>
        )}
      </div>

      {revision.sinNombres.length > 0 && (
        <p className="mb-nota">
          Las tarjetas sin nombres cargados aparecen como <b>plazas sin nombre</b>: ocupan
          sitio igual, pero conviene cargarles los nombres en Invitados para poder ubicarlas bien.
        </p>
      )}

      {porCompletar.length > 0 && (
        <details className="mb-faltan" open>
          <summary>
            <b>{porCompletar.length}</b> nombres por completar
            <span> — doble clic o ✎ para editarlos aquí mismo</span>
          </summary>
          <div className="mb-faltan-list">
            {porCompletar.map(f => (
              <Ficha
                key={f.key} ficha={f}
                seleccionada={sel?.key === f.key} onSeleccionar={setSel}
                editando={editando === f.key}
                onEditar={x => setEditando(x.key)}
                onGuardar={guardarNombre}
                onCancelar={() => setEditando(null)}
              />
            ))}
          </div>
          <p className="mb-faltan-pie">
            Al ponerle nombre a una <b>plaza sin nombre</b> se crea la persona de verdad
            en su tarjeta, y si ya estaba sentada conserva la mesa.
          </p>
        </details>
      )}

      <div className="mb-filtros">
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
          {sinMesaFiltrada.length === 0 && <p className="mb-vacio">Todos ubicados.</p>}
          <div className="mb-pool-list">
            {sinMesaFiltrada.map(f => (
              <Ficha
                key={f.key} ficha={f}
                seleccionada={sel?.key === f.key} onSeleccionar={setSel}
                editando={editando === f.key}
                onEditar={x => setEditando(x.key)}
                onGuardar={guardarNombre}
                onCancelar={() => setEditando(null)}
              />
            ))}
          </div>
        </aside>

        {/* ── Mesas ── */}
        <div className="mb-mesas">
          {mesas.length === 0 && (
            <p className="mb-vacio">Todavía no hay mesas. Crea la primera con «+ Mesa».</p>
          )}
          {mesas.map(m => {
            const dentro = fichasDeMesa(m.id)
            const lleno = dentro.length >= m.capacidad
            const pasada = dentro.length > m.capacidad
            return (
              <section
                key={m.id}
                className={`mb-mesa${pasada ? ' pasada' : lleno ? ' llena' : ''}`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const f = todasLasFichas.find(x => x.key === e.dataTransfer.getData('text/plain'))
                  if (f) sentar(f, m.id)
                }}
                onClick={() => { if (sel) sentar(sel, m.id) }}
              >
                <header>
                  <input
                    className="mb-mesa-nombre" defaultValue={m.nombre}
                    onBlur={e => e.target.value.trim() && e.target.value !== m.nombre && editarMesa(m, { nombre: e.target.value.trim() })}
                  />
                  <span className="mb-cuenta">{dentro.length}/{m.capacidad}</span>
                  <input
                    className="mb-mesa-cap" type="number" min="1" max="30" defaultValue={m.capacidad}
                    title="Capacidad"
                    onBlur={e => {
                      const n = parseInt(e.target.value, 10)
                      if (n >= 1 && n <= 30 && n !== m.capacidad) editarMesa(m, { capacidad: n })
                    }}
                  />
                  <button className="mb-mesa-x" onClick={() => borrarMesa(m)} title="Borrar mesa">×</button>
                </header>
                <div className="mb-mesa-body">
                  {dentro.length === 0 && <p className="mb-vacio-mesa">Arrastra personas aquí</p>}
                  {dentro.map(f => (
                    <Ficha
                      key={f.key} ficha={f} compacta
                      seleccionada={sel?.key === f.key}
                      onSeleccionar={setSel}
                      onQuitar={levantar}
                      editando={editando === f.key}
                      onEditar={x => setEditando(x.key)}
                      onGuardar={guardarNombre}
                      onCancelar={() => setEditando(null)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      {sel && (
        <div className="mb-barra">
          <span><b>{sel.nombre}</b> seleccionado · toca una mesa para sentarlo</span>
          <button className="adm-btn adm-btn-ghost" onClick={() => setSel(null)}>Cancelar</button>
        </div>
      )}
      {aviso && <div className="mb-toast">{aviso}</div>}
    </div>
  )
}
