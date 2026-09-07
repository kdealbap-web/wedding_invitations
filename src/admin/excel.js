// ─── El libro de Excel, en un solo sitio ───
//
// Lo usan dos sitios: el botón «Exportar Excel» del panel y el script
// `scripts/export-invitados.mjs`. Por eso este módulo no importa Supabase ni
// toca el disco — recibe los datos ya cargados y devuelve el libro.
//
// ExcelJS entra por parámetro y no por import: en el navegador se carga con
// import() dinámico al pulsar el botón, para no meter ~900 kB en el bundle del
// panel que casi nunca se usan.
// Los dos con extensión: Node también carga este módulo, y allí no hay resolución de Vite
import { ESTADOS, estadoOf } from './cupos.js'
import { nombreIncompleto } from './nombres.js'

const LBL = Object.fromEntries(Object.entries(ESTADOS).map(([k, v]) => [k, v.lbl]))

const ORO = 'FFC8A96E'
const cabecera = fila => {
  fila.font = { bold: true, color: { argb: 'FF0F1117' }, size: 10 }
  fila.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ORO } }
  fila.alignment = { vertical: 'middle' }
  fila.height = 22
}
const anchos = (hoja, ws) => ws.forEach((w, i) => { hoja.getColumn(i + 1).width = w })

/**
 * Arma el libro completo.
 * @param datos    { rows, miembros, mesas, asientos } tal como salen de Supabase
 * @param ExcelJS  el módulo, inyectado por quien llama
 */
export function construirLibro({ rows, miembros, mesas = [], asientos = [] }, ExcelJS) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Boda Angely & Kevin'
  wb.created = new Date()
  // ExcelJS escribe las fórmulas sin valor cacheado. Sin esto, algunos visores
  // muestran las celdas vacías hasta que alguien las toca.
  wb.calcProperties.fullCalcOnLoad = true

  const porTarjeta = miembros.reduce((a, m) => { (a[m.guest_id] ||= []).push(m); return a }, {})
  const mesaDe = new Map(mesas.map(m => [m.id, m.nombre]))
  const mesaDeMiembro = new Map(asientos.filter(a => a.member_id).map(a => [a.member_id, mesaDe.get(a.mesa_id) || '']))
  const nombreDeMiembro = new Map(miembros.map(m => [m.id, m.name]))
  const grupoDeTarjeta = new Map(rows.map(r => [r.id, r.group_name]))

  // ══ TARJETAS ══
  const t = wb.addWorksheet('Tarjetas', { views: [{ state: 'frozen', ySplit: 1 }] })
  t.addRow(['Tarjeta', 'Tipo', 'Estado', 'Cupos', 'Confirmados', 'Personas', 'Mesas', 'WhatsApp', 'Vistas'])
  cabecera(t.getRow(1))
  anchos(t, [34, 12, 15, 8, 12, 10, 22, 16, 8])

  rows.forEach((r, i) => {
    const f = i + 2
    const suyas = [...new Set(asientos.filter(a => a.guest_id === r.id).map(a => mesaDe.get(a.mesa_id)).filter(Boolean))]
    t.addRow([
      r.group_name,
      r.invitation_type === 'completa' ? 'Completa' : 'Recepción',
      LBL[estadoOf(r)],
      r.total_members || 0,
      r.attending_count || 0,
      // ── Fórmula que replica personasOf() de cupos.js ──
      // Si cambias aquella, cambia esta. Es la única duplicación aceptada:
      // el Excel tiene que recalcular solo cuando se edita una celda.
      { formula: `IF(C${f}="${LBL.confirmado}",E${f},IF(C${f}="${LBL.preconfirmado}",IF(E${f}>0,E${f},D${f}),0))` },
      suyas.join(', '),
      r.whatsapp || '',
      r.view_count || 0,
    ])
  })

  const ultT = Math.max(rows.length + 1, 2)
  if (rows.length) {
    t.dataValidations.add(`C2:C${ultT}`, {
      type: 'list', allowBlank: false,
      formulae: [`"${Object.values(LBL).join(',')}"`],
      showErrorMessage: true, errorTitle: 'Estado no válido',
      error: 'Elige uno de la lista: si escribes otra cosa, los totales dejan de sumar.',
    })
    t.autoFilter = { from: 'A1', to: `I${ultT}` }
    // Las tarjetas sin cupos cargados saltan a la vista: no se pueden contar ni sentar
    t.addConditionalFormatting({
      ref: `D2:D${ultT}`,
      rules: [{ type: 'cellIs', operator: 'equal', formulae: ['0'], priority: 1,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFE0E0' } } } }],
    })
  }

  // ══ PERSONAS ══
  const p = wb.addWorksheet('Personas', { views: [{ state: 'frozen', ySplit: 1 }] })
  p.addRow(['Persona', 'Tarjeta', 'Estado tarjeta', 'Mesa'])
  cabecera(p.getRow(1))
  anchos(p, [30, 34, 16, 20])

  const filasPersona = []
  for (const r of rows) {
    const ms = (porTarjeta[r.id] || []).slice().sort((a, b) => a.order_num - b.order_num)
    for (const m of ms) filasPersona.push([m.name, r.group_name, LBL[estadoOf(r)], mesaDeMiembro.get(m.id) || ''])
    // Sin nombres cargados la tarjeta desaparecería de esta hoja, y es justo la
    // que hay que completar. Se deja una fila marcada.
    if (!ms.length && estadoOf(r) !== 'no_asiste') {
      filasPersona.push(['(sin nombres cargados)', r.group_name, LBL[estadoOf(r)], ''])
    }
  }
  filasPersona.forEach(f => {
    const fila = p.addRow(f)
    // Rojo = nombre que no sirve para una tarjeta de mesa
    if (nombreIncompleto(f[0])) {
      fila.getCell(1).font = { color: { argb: 'FFB00020' } }
      fila.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F0' } }
    }
  })
  const ultP = Math.max(filasPersona.length + 1, 2)
  if (filasPersona.length) {
    if (mesas.length) {
      p.dataValidations.add(`D2:D${ultP}`, {
        type: 'list', allowBlank: true,
        formulae: [`"${mesas.map(m => m.nombre).join(',')}"`],
      })
    }
    p.autoFilter = { from: 'A1', to: `D${ultP}` }
  }

  // ══ MESAS ══
  const ms = wb.addWorksheet('Mesas')
  ms.addRow(['Mesa', 'Capacidad', 'Sentados', 'Libres', 'Estado', 'Capitán'])
  cabecera(ms.getRow(1))
  anchos(ms, [24, 12, 11, 10, 16, 26])

  mesas.forEach((m, i) => {
    const f = i + 2
    ms.addRow([
      m.nombre, m.capacidad,
      // Cuenta contra la hoja Personas: si mueve a alguien de mesa allí, esto cambia
      { formula: `COUNTIF(Personas!$D$2:$D$${ultP},A${f})` },
      { formula: `B${f}-C${f}` },
      { formula: `IF(D${f}<0,"PASADA",IF(D${f}=0,"Llena","Libre"))` },
      // El capitán es un dato, no una fórmula: sale de la base, no de esta hoja.
      // Si lo movieron de mesa se dice, o la hoja que se lleva al salón mentiría.
      m.capitan_id
        ? (nombreDeMiembro.get(m.capitan_id) || '') +
          (asientos.some(a => a.mesa_id === m.id && a.member_id === m.capitan_id) ? '' : ' (no está sentado aquí)')
        : '',
    ])
    if (!m.capitan_id) ms.getRow(f).getCell(6).fill =
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF6E5' } }
  })
  if (mesas.length) {
    ms.addConditionalFormatting({
      ref: `E2:E${mesas.length + 1}`,
      rules: [{ type: 'cellIs', operator: 'equal', formulae: ['"PASADA"'], priority: 1,
        style: { font: { bold: true, color: { argb: 'FFB00020' } } } }],
    })
  }

  // ══ REPARTO ══
  // El listado que se imprime y se lleva al salón: cada mesa con sus nombres
  // completos, en bloques. Es la vista que de verdad se usa el día de la boda.
  const rep = wb.addWorksheet('Reparto', { views: [{ state: 'frozen', ySplit: 1 }] })
  rep.addRow(['Mesa', '#', 'Persona', 'Tarjeta', 'Rol'])
  cabecera(rep.getRow(1))
  anchos(rep, [22, 5, 32, 34, 12])

  for (const m of mesas) {
    const suyos = asientos.filter(a => a.mesa_id === m.id)
    if (!suyos.length) {
      const f = rep.addRow([m.nombre, '', '(mesa vacía)', '', ''])
      f.getCell(3).font = { italic: true, color: { argb: 'FF999999' } }
      continue
    }
    suyos
      .map(a => ({
        persona: a.member_id ? (nombreDeMiembro.get(a.member_id) || '') : (a.etiqueta || 'Sin nombre'),
        tarjeta: grupoDeTarjeta.get(a.guest_id) || '',
        anon: !a.member_id,
        manda: !!a.member_id && a.member_id === m.capitan_id,
      }))
      .sort((a, b) => a.tarjeta.localeCompare(b.tarjeta, 'es') || a.persona.localeCompare(b.persona, 'es'))
      .forEach((x, i) => {
        const f = rep.addRow([i === 0 ? m.nombre : '', i + 1, x.persona, x.tarjeta, x.manda ? 'Capitán' : ''])
        if (i === 0) f.getCell(1).font = { bold: true }
        // El capitán es a quien busca el salón el día de la fiesta: va marcado
        if (x.manda) f.getCell(5).font = { bold: true, color: { argb: 'FF8A6D1F' } }
        // Lo que hay que arreglar antes de imprimir tarjetas de mesa
        if (x.anon || nombreIncompleto(x.persona)) {
          f.getCell(3).font = { color: { argb: 'FFB00020' } }
          f.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F0' } }
        }
      })
  }
  if (rep.rowCount > 1) rep.autoFilter = { from: 'A1', to: `E${rep.rowCount}` }

  // ══ RESUMEN ══
  const res = wb.addWorksheet('Resumen')
  anchos(res, [34, 14, 52])
  res.addRow(['RESUMEN DE CUPOS']).font = { bold: true, size: 13 }
  res.addRow([])
  cabecera(res.addRow(['Concepto', 'Valor', 'Cómo se calcula']))

  // Las filas que otras fórmulas referencian llevan `ref`. Escribir «B15» a mano
  // es pedir que se rompa: basta añadir un concepto arriba para que apunte a otra
  // cosa, y en Excel eso no da error, solo un número equivocado.
  const filas = [
    { c: 'Tarjetas', f: `COUNTA(Tarjetas!A2:A${ultT})`, n: 'Todas las tarjetas del listado' },
    {},
    { c: 'Confirmadas (teléfono)',  f: `COUNTIF(Tarjetas!C:C,"${LBL.confirmado}")`,    n: 'Solo la llamada confirma' },
    { c: 'Preconfirmadas (link)',   f: `COUNTIF(Tarjetas!C:C,"${LBL.preconfirmado}")`, n: 'Dijeron que sí por el link · falta llamarlas' },
    { c: 'No asisten',              f: `COUNTIF(Tarjetas!C:C,"${LBL.no_asiste}")`,     n: 'Avisaron que no pueden' },
    { c: 'No contestan',            f: `COUNTIF(Tarjetas!C:C,"${LBL.no_contesta}")`,   n: 'Se intentó llamar sin respuesta' },
    { c: 'Sin respuesta',           f: `COUNTIF(Tarjetas!C:C,"${LBL.sin_respuesta}")`, n: 'Nadie ha respondido todavía' },
    {},
    { c: 'PERSONAS confirmadas',    f: `SUMIF(Tarjetas!C:C,"${LBL.confirmado}",Tarjetas!F:F)`,    n: 'Este es el número para el catering', fuerte: true },
    { c: 'Personas preconfirmadas', f: `SUMIF(Tarjetas!C:C,"${LBL.preconfirmado}",Tarjetas!F:F)`, n: 'Provisional hasta validar por teléfono' },
    { c: 'Cupos en el aire',        f: `SUMIF(Tarjetas!C:C,"${LBL.no_contesta}",Tarjetas!D:D)+SUMIF(Tarjetas!C:C,"${LBL.sin_respuesta}",Tarjetas!D:D)`, n: 'Cupos de quienes aún no responden' },
    { c: 'TOTAL A SENTAR', ref: 'total', f: `SUMIF(Tarjetas!C:C,"${LBL.confirmado}",Tarjetas!F:F)+SUMIF(Tarjetas!C:C,"${LBL.preconfirmado}",Tarjetas!F:F)`, n: 'Confirmadas + preconfirmadas', fuerte: true },
    {},
    { c: 'Puestos en mesas', ref: 'puestos',  f: 'SUM(Mesas!B:B)', n: 'Suma de la capacidad de todas las mesas' },
    { c: 'Sentados',         ref: 'sentados', f: 'SUM(Mesas!C:C)', n: 'Personas ya con mesa asignada' },
    { c: 'Faltan por sentar', usa: r => `${r.total}-${r.sentados}`, n: 'Total a sentar menos los ya sentados' },
    { c: 'Puestos sobrantes', usa: r => `${r.puestos}-${r.total}`,  n: 'Negativo = faltan mesas' },
    {},
    { c: 'Tarjetas sin cupos cargados', f: 'COUNTIF(Tarjetas!D:D,0)', n: 'No suman capacidad ni se pueden sentar por nombre — hay que completarlas' },
    ...(mesas.length
      ? [{ c: 'Mesas sin capitán', f: `COUNTBLANK(Mesas!F2:F${mesas.length + 1})`, n: 'Cada mesa necesita a quién le habla el salón esa noche' }]
      : []),
  ]

  const ref = {}
  const pendientes = []
  for (const d of filas) {
    if (!d.c) { res.addRow(['']); continue }
    const fila = res.addRow([d.c, d.f ? { formula: d.f } : null, d.n || ''])
    if (d.ref) ref[d.ref] = `B${fila.number}`
    if (d.usa) pendientes.push({ fila, usa: d.usa })
    if (d.fuerte) {
      fila.font = { bold: true }
      fila.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4DC' } }
    }
    fila.getCell(3).font = { size: 9, color: { argb: 'FF777777' }, italic: true }
  }
  // Ahora sí: las referencias existen y se resuelven contra la fila real
  for (const { fila, usa } of pendientes) fila.getCell(2).value = { formula: usa(ref) }

  res.addRow([])
  res.addRow(['Las celdas de Valor son FÓRMULAS: cambia un estado en la hoja Tarjetas o una mesa en la hoja Personas y todo esto se recalcula solo.'])
    .font = { italic: true, size: 9, color: { argb: 'FF444444' } }

  return { wb, filasPersona }
}

/** Nombre de archivo con la fecha, para no pisar exports anteriores. */
export function nombreArchivo() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `invitados-y-mesas_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.xlsx`
}
