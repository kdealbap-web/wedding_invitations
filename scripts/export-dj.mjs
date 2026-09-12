/**
 * La playlist del DJ, en Excel.
 *
 *   npm run dj
 *
 * Genera entrega/dj/playlist-DJ.xlsx con cuatro hojas:
 *
 *   Playlist          UNA FILA POR CANCIÓN. Es la hoja que se rellena.
 *   Minuto a minuto   los veinte momentos de la noche, cuánto dura cada bloque,
 *                     qué hay que pedirle al DJ ahí y cuántas canciones lleva
 *                     cargadas —eso último es una fórmula contra la Playlist—.
 *   Mesas             las once canciones que eligieron los invitados, con su
 *                     capitán y una hora sugerida para repartirlas.
 *   Resumen           los números, calculados en vivo.
 *
 * POR QUÉ UN EXCEL Y NO OTRA HOJA IMPRESA
 *
 * `dj/guion-musical-N.png` y `dj/canciones-por-mesa.png` ya existen y se llevan
 * a la cabina impresas. Lo que no se puede hacer en un PNG es CAMBIAR una
 * canción: el DJ tiene las suyas, los novios tienen las suyas, y eso se negocia
 * hasta el mismo sábado. Este libro es el sitio donde se negocia, y por eso todo
 * lo que se deduce va en fórmula y no en dato: se toca una celda y los conteos
 * se rehacen solos. Mismo criterio que el Excel de invitados.
 *
 * LA COLUMNA QUE MANDA es «LA QUE SUENA» de la hoja Playlist:
 * `IF(definitiva="", propuesta, definitiva)`. La propuesta se queda escrita —es
 * el punto de partida y el respaldo si nadie la cambia— y la definitiva la pisa
 * cuando alguien la escribe. Nadie tiene que borrar nada para cambiar algo.
 */
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import { mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { momentos } from './guion-dj.mjs'

const SALIDA = resolve('entrega/dj')

const ORO    = 'FFC8A96E'
const MARFIL = 'FFFBF5EA'
const ROJO   = 'FFB00020'
const TERRA  = 'FF9A5B45'

// ─── Los datos ───

async function env() {
  if (!existsSync('.env')) throw new Error('No hay .env con las credenciales de Supabase')
  const t = await readFile('.env', 'utf8')
  const g = k => (t.match(new RegExp(`^${k}=(.+)$`, 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '')
  const url = g('VITE_SUPABASE_URL')
  const key = g('SUPABASE_SERVICE_ROLE_KEY') || g('VITE_SUPABASE_ANON_KEY')
  if (!url || !key) throw new Error('Faltan VITE_SUPABASE_URL o la clave en .env')
  return { url, key }
}

// La mesa de los novios no va: el DJ no la anuncia ni tiene canción que corear.
// Mismo criterio que las imágenes.
const esPrincipal = m => /^\s*Mesa\s+(principal|de\s+los\s+novios)\s*$/i.test(m.nombre || '')

const ROMANOS = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
const romano = n => {
  let r = ''
  for (const [v, letra] of ROMANOS) while (n >= v) { r += letra; n -= v }
  return r
}

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do',
  'dos', 'van', 'von', 'di', 'du', 'san', 'santa', 'mac', 'mc'])

// Primer nombre + primer apellido, y sólo con cuatro unidades o más: con tres no
// se sabe si es «nombre + dos apellidos» o «dos nombres + un apellido».
const nombreCorto = n => {
  const u = [], buf = []
  for (const w of (n || '').trim().split(/\s+/).filter(Boolean)) {
    buf.push(w)
    if (!PARTICULAS.has(w.toLowerCase())) { u.push(buf.join(' ')); buf.length = 0 }
  }
  if (buf.length) u.push(buf.join(' '))
  return u.length >= 4 ? `${u[0]} ${u[2]}` : (n || '').trim()
}

// ─── Cuándo suenan las canciones de las mesas ───
//
// TODAS EN EL MISMO MOMENTO: en la entrega de las botellas a los capitanes, a
// las 9:10 p. m. Una detrás de otra y en desorden, con el novio dirigiendo.
//
// Hasta el 12·IX·2026 este módulo las repartía por la noche a intervalos, con
// una hora sugerida para cada una. Era una suposición mía; la dinámica real es
// seguida y la decidieron los novios con el DJ. Se quitó la columna de horas
// entera en vez de dejarla «por si acaso»: una hora escrita en una hoja que
// alguien va a leer en una cabina a oscuras se obedece, no se interpreta.
const MOMENTO_MESAS = '9:10 p. m. · entrega de botellas a los capitanes'

// ─── Canciones repetidas ───
//
// Dos de las canciones que eligieron las mesas son también propuestas del guion:
// «La Vaca y el Toro» está en el arranque de fiesta y «L'Amour Toujours» es la
// del cierre. Escritas distinto —una en mayúsculas y con guion, la otra con
// punto medio y tildes—, así que un COUNTIF de Excel no las ve. Se comparan sin
// tildes, sin signos y en minúscula, que es como suenan.
//
// La que se cambia es la del GUION, nunca la de la mesa: la mesa la eligió, su
// capitán la está esperando y va a levantarse cuando suene.
// El rango de los diacríticos va como clase \p{M} y no como escape numérico:
// se lee, y es lo que NFD deja suelto al separar la letra de su tilde.
const claveCancion = s => (s || '').toLowerCase().normalize('NFD')
  .replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim()

// ─── Estilos ───

const cabecera = fila => {
  fila.font = { bold: true, color: { argb: 'FF0F1117' }, size: 10 }
  fila.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ORO } }
  fila.alignment = { vertical: 'middle', wrapText: true }
  fila.height = 30
}
const anchos = (hoja, ws) => ws.forEach((w, i) => { hoja.getColumn(i + 1).width = w })
const pintar = (celda, argb) => { celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } } }

// El nombre de la hoja va entre comillas simples dentro de las fórmulas porque
// lleva espacios. Se escribe una vez aquí y no en cada fórmula.
const MM = "'Minuto a minuto'"

// ─── El libro ───

function construir(mesas) {
  const ms = momentos()
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Boda Angely & Kevin'
  wb.created = new Date()
  // ExcelJS escribe las fórmulas sin valor cacheado. Sin esto, algunos visores
  // muestran las celdas vacías hasta que alguien las toca.
  wb.calcProperties.fullCalcOnLoad = true

  // ══ PLAYLIST ══
  //
  // Se arma primero porque las otras dos hojas la cuentan con fórmulas y hace
  // falta saber en qué fila termina.
  //
  // Al final de cada momento va una fila EN BLANCO con su número y su hora ya
  // puestos: es el sitio obvio para añadir otra canción sin insertar filas a
  // mano ni arrastrar fórmulas.
  const pl = wb.addWorksheet('Playlist', { views: [{ state: 'frozen', ySplit: 1 }] })
  // Cuántas filas va a tener: las canciones de cada momento, la de las mesas
  // abierta en once, y una fila en blanco por momento para añadir.
  const ultimaFila = 1 + ms.reduce((a, m) => a + 1 +
    ((m.pistas || []).some(x => /CANCIONES DE LAS MESAS/i.test(x.momento))
      ? mesas.length : m.canciones.length), 0)
  pl.addRow(['#', 'Hora', 'Momento', 'Orden', 'Canción propuesta', 'Canción definitiva',
    'LA QUE SUENA', 'Artista', 'Duración (min)', 'Enlace o nota', '✔', 'Ojo'])
  cabecera(pl.getRow(1))
  anchos(pl, [5, 8, 28, 7, 38, 38, 38, 22, 13, 42, 5, 11])

  // Primero se arman todas las entradas y sólo después se escriben: hace falta
  // tener la lista completa para poder ver qué canción se repite.
  const entradas = []
  for (const m of ms) {
    // El momento de las canciones de las mesas se abre en once: son las que
    // eligieron los invitados y son las únicas que no se pueden cambiar. Aquí
    // dentro llevan su hora repartida, no la del momento, porque van sueltas a
    // lo largo de la noche y no seguidas.
    // El cronograma llama a esa línea «Música y pista abierta»; lo que la
    // identifica es la pista que lleva dentro, no cómo se llame la línea.
    const lista = (m.pistas || []).some(x => /CANCIONES DE LAS MESAS/i.test(x.momento))
      ? mesas.map(t => ({
          cancion: t.cancion,
          hora: m.hora,
          nota: `${t.nombre} · capitán ${t.capitan || '—'} · ${t.personas} personas`,
          fija: true,
        }))
      : (m.pistas || []).map(x => ({
          cancion: `${x.cancion}${x.artista ? ` · ${x.artista}` : ''}`,
          hora: m.hora,
          // Quién la pone va delante de la nota: en la iglesia toca el violín y
          // en el salón el DJ, y confundirlos es el error caro de la noche.
          nota: [x.quien, x.nota].filter(Boolean).join(' — '),
        }))

    lista.forEach((c, i) => entradas.push({ m, orden: i + 1, ...c }))
    // La fila para añadir. Si el momento no lleva música es la única que sale.
    entradas.push({
      m, orden: lista.length + 1, cancion: '', hora: m.hora,
      nota: m.sinMusica ? `SIN MÚSICA — ${m.dj}` : '', vacia: true,
    })
  }

  // Quién se repite con quién. La que se cambia es la del GUION: la de la mesa
  // la eligieron los invitados y su capitán ya la está esperando.
  const porClave = new Map()
  for (const e of entradas) if (e.cancion) {
    const k = claveCancion(e.cancion)
    porClave.set(k, [...(porClave.get(k) || []), e])
  }
  for (const [, grupo] of porClave) {
    if (grupo.length < 2) continue
    for (const e of grupo) {
      const otros = grupo.filter(o => o !== e)
      e.choque = otros.some(o => o.fija) && !e.fija
        ? `OJO, REPETIDA: es la canción de ${otros.find(o => o.fija).nota.split(' · ')[0]}. Cambia ÉSTA, la de la mesa no se toca.`
        : `OJO, REPETIDA: también en el momento ${otros.map(o => o.m.n).join(', ')}.`
    }
  }

  entradas.forEach(e => {
    const f = pl.rowCount + 1
    pl.addRow([e.m.n, e.hora, e.m.momento, e.orden, e.cancion, '',
      { formula: `IF(F${f}="",E${f},F${f})` }, '', null,
      [e.nota, e.choque].filter(Boolean).join('  '), '',
      // Se rehace sola si alguien escribe una definitiva que ya estaba: el aviso
      // de arriba es de hoy, éste es de siempre. Compara tal cual, sin quitar
      // tildes —Excel no sabe—, así que es el complemento y no el sustituto.
      { formula: `IF(G${f}="","",IF(COUNTIF($G$2:$G$${ultimaFila},G${f})>1,"REPETIDA",""))` }])

    const fila = pl.getRow(f)
    if (e.fija) {
      fila.getCell(5).font = { bold: true, color: { argb: TERRA } }
      pintar(fila.getCell(6), 'FFF3E9D8')
    }
    if (e.choque) {
      pintar(fila.getCell(10), 'FFFFF1CC')
      fila.getCell(10).font = { bold: true, color: { argb: 'FF8A6D00' } }
    }
    if (e.vacia && e.m.sinMusica) fila.eachCell(c => {
      // El momento tiene que verse en la lista aunque no suene nada, o el DJ
      // creerá que se saltó una fila.
      pintar(c, 'FFF2F2F2')
      c.font = { italic: true, color: { argb: 'FF7A7A7A' } }
    })
    fila.alignment = { wrapText: true, vertical: 'middle' }
  })

  const ultPl = pl.rowCount

  pl.getColumn(9).numFmt = '0.0'
  for (const n of [5, 6, 7, 10]) pl.getColumn(n).alignment = { wrapText: true, vertical: 'middle' }
  pl.getColumn(7).font = { bold: true }
  pl.autoFilter = { from: 'A1', to: `L${ultPl}` }

  // ══ MINUTO A MINUTO ══
  const mm = wb.addWorksheet('Minuto a minuto', { views: [{ state: 'frozen', ySplit: 1 }] })
  mm.addRow(['#', 'Hora', 'Momento', 'Qué pasa', 'Qué necesita el DJ', 'Micro',
    'Minutos del bloque', 'Minutos cargados', 'Diferencia', 'Canciones', 'Notas'])
  cabecera(mm.getRow(1))
  anchos(mm, [5, 8, 26, 46, 46, 7, 11, 11, 11, 11, 30])

  ms.forEach(m => {
    const f = mm.rowCount + 1
    mm.addRow([
      m.n, m.hora, m.momento, m.pasa, m.dj,
      // Una columna en vez de leerse veinte frases para saber dónde hay que
      // tener un micrófono en la mano.
      /micr[oó]fono/i.test(m.dj) ? 'SÍ' : '',
      m.dura,
      { formula: `SUMIFS(Playlist!$I$2:$I$${ultPl},Playlist!$A$2:$A$${ultPl},$A${f})` },
      // En blanco mientras no haya duraciones cargadas: si no, las veinte filas
      // salen en rojo desde el primer día y el aviso deja de significar nada.
      { formula: `IF(H${f}=0,"",H${f}-G${f})` },
      { formula: `SUMPRODUCT((Playlist!$A$2:$A$${ultPl}=$A${f})*(Playlist!$G$2:$G$${ultPl}<>""))` },
      '',
    ])
    const fila = mm.getRow(f)
    fila.alignment = { wrapText: true, vertical: 'top' }
    if (m.clave) {
      // Los momentos escritos en mayúscula son los que marcan la noche
      fila.eachCell(c => pintar(c, MARFIL))
      fila.getCell(3).font = { bold: true, color: { argb: TERRA }, size: 11 }
    }
    if (m.sinMusica) fila.getCell(5).font = { bold: true, color: { argb: ROJO } }
    if (fila.getCell(6).value === 'SÍ') fila.getCell(6).font = { bold: true, color: { argb: TERRA } }
  })

  const ultMm = ms.length + 1
  mm.addConditionalFormatting({
    ref: `I2:I${ultMm}`,
    rules: [
      { type: 'cellIs', operator: 'lessThan', formulae: ['0'], priority: 1,
        style: { font: { bold: true, color: { argb: ROJO } } } },
      { type: 'cellIs', operator: 'greaterThan', formulae: ['0'], priority: 2,
        style: { font: { color: { argb: 'FF8A6D00' } } } },
    ],
  })
  mm.addConditionalFormatting({
    ref: `J2:J${ultMm}`,
    rules: [{ type: 'cellIs', operator: 'equal', formulae: ['0'], priority: 1,
      style: { font: { bold: true, color: { argb: ROJO } } } }],
  })

  // ══ MESAS ══
  const me = wb.addWorksheet('Mesas', { views: [{ state: 'frozen', ySplit: 1 }] })
  me.addRow(['#', 'Mesa', 'Romano', 'Canción que eligieron', 'Capitán', 'Personas', '✔ Sonó'])
  cabecera(me.getRow(1))
  anchos(me, [5, 16, 9, 46, 28, 10, 9])

  // El número es el orden en que salen de la base, no el orden en que suenan:
  // suenan en desorden y lo decide el novio esa noche. Sirve para ir marcando.
  mesas.forEach((t, i) => {
    const f = me.rowCount + 1
    me.addRow([i + 1, t.nombre, t.romano, t.cancion || 'SIN CANCIÓN ANOTADA',
      t.capitan || '', t.personas, ''])
    const fila = me.getRow(f)
    if (!t.cancion) fila.getCell(4).font = { bold: true, color: { argb: ROJO } }
    if (!t.capitan) fila.getCell(5).font = { color: { argb: ROJO } }
  })

  const notas = [
    `TODAS SUENAN EN EL MISMO MOMENTO: ${MOMENTO_MESAS}.`,
    'UNA DETRÁS DE OTRA Y EN DESORDEN, sin dejar caer la pista. La dinámica la dirige el novio: él marca cuándo se cambia.',
    'Cuando suena la suya, esa mesa es la que responde y su capitán la levanta con su botella.',
    'Estas once son las únicas canciones que NO se cambian: las eligieron los invitados y su capitán ya lo sabe.',
  ]
  const fNota = me.rowCount + 2
  notas.forEach((t, i) => {
    me.getCell(`A${fNota + i}`).value = t
    me.mergeCells(`A${fNota + i}:G${fNota + i}`)
    me.getCell(`A${fNota + i}`).alignment = { wrapText: true, vertical: 'top' }
    me.getCell(`A${fNota + i}`).font = { italic: true, color: { argb: 'FF6B5B4B' } }
    me.getRow(fNota + i).height = 28
  })

  // ══ RESUMEN ══
  const rs = wb.addWorksheet('Resumen')
  anchos(rs, [38, 16, 62])
  rs.addRow(['PLAYLIST — ANGELY & KEVIN', '', 'Sábado 12 de septiembre de 2026 · Casona del Prado'])
  rs.getRow(1).font = { bold: true, size: 14, color: { argb: TERRA } }
  rs.addRow([])

  const cuentas = [
    ['Momentos del guion', { formula: `COUNT(${MM}!$A$2:$A$${ultMm})` },
      'Desde la ceremonia hasta la última canción.'],
    ['Canciones cargadas', { formula: `SUMPRODUCT(--(Playlist!$G$2:$G$${ultPl}<>""))` },
      'Todo lo que hoy tiene título en la columna «LA QUE SUENA».'],
    ['Cambiadas por el DJ', { formula: `SUMPRODUCT(--(Playlist!$F$2:$F$${ultPl}<>""))` },
      'Las que alguien escribió en «Canción definitiva». El resto van con la propuesta.'],
    ['Momentos sin una sola canción', { formula: `COUNTIF(${MM}!$J$2:$J$${ultMm},0)` },
      'Salen en rojo en «Minuto a minuto». Son momentos del cronograma de la wedding sin canción marcada: el brindis, la cena, las fotos en la pista, el snack y las picadas.'],
    ['Mesas con canción', { formula: `SUMPRODUCT(--(Mesas!$D$2:$D$${mesas.length + 1}<>"SIN CANCIÓN ANOTADA"))` },
      `De ${mesas.length}. Las eligieron los invitados y no se cambian.`],
    ['Canciones repetidas', { formula: `SUMPRODUCT(--(Playlist!$L$2:$L$${ultPl}<>""))` },
      'Fórmula: compara la columna «LA QUE SUENA» consigo misma. Los avisos de la columna «Enlace o nota» son los de hoy, que además comparan sin tildes ni mayúsculas.'],
    ['Minutos de guion', { formula: `SUM(${MM}!$G$2:$G$${ultMm})` },
      'De las 6:30 de la tarde a la 1:30 de la madrugada.'],
    ['Minutos de música cargados', { formula: `SUM(Playlist!$I$2:$I$${ultPl})` },
      'Sólo si se rellena la columna «Duración (min)». Vale cero mientras no se haga, y no pasa nada.'],
  ]
  cuentas.forEach(([a, b, c]) => {
    const f = rs.addRow([a, b, c])
    f.getCell(1).font = { bold: true }
    f.getCell(2).alignment = { horizontal: 'center' }
    f.getCell(2).font = { bold: true, size: 12, color: { argb: TERRA } }
    f.getCell(3).alignment = { wrapText: true, vertical: 'middle' }
    f.height = 32
  })

  rs.addRow([])
  const reglas = [
    'CÓMO SE USA — se escribe en la hoja «Playlist», columna «Canción definitiva». Lo que está en «Canción propuesta» no se borra: es el respaldo si al final nadie la cambia.',
    'LA COLUMNA QUE MANDA es «LA QUE SUENA». Es una fórmula: coge la definitiva si la hay y la propuesta si no. Es la que se lleva a la cabina.',
    'LAS ONCE DE LAS MESAS NO SE TOCAN, y suenan TODAS SEGUIDAS Y EN DESORDEN en la entrega de botellas a los capitanes, a las 9:10 p. m. Están en la hoja «Mesas» y otra vez dentro de la Playlist, en ese momento.',
    'LAS PROPUESTAS SON UNA PROPUESTA, no el repertorio. El DJ conoce su pista y los novios su gusto. Lo que sí está cerrado es el ORDEN de los momentos y qué viene después de qué.',
    'SI UNA CANCIÓN SALE DOS VECES la columna «Ojo» de la Playlist la marca sola y la nota lo dice. Hoy hay tres cruces: «All of Me» está propuesta en el cóctel y en el primer baile, y dos mesas eligieron la del arranque y la del cierre. Se cambia la del GUION, nunca la de la mesa.',
    'LA COLUMNA «MICRO» de «Minuto a minuto» marca los momentos en los que hace falta un micrófono en la mano. Son los que se olvidan.',
    'SI SE MUEVE UNA HORA, se cambia en «Minuto a minuto» y ya: los minutos de cada bloque son un dato, no una fórmula, porque el guion los fijó a mano.',
  ]
  reglas.forEach(t => {
    const f = rs.addRow([t])
    rs.mergeCells(`A${f.number}:C${f.number}`)
    f.getCell(1).alignment = { wrapText: true, vertical: 'top' }
    f.getCell(1).font = { size: 10 }
    f.height = 34
  })

  return wb
}

// ─── Generar ───

async function main() {
  const { url, key } = await env()
  const sb = createClient(url, key)
  const [ms, as, mem] = await Promise.all([
    sb.from('mesas').select('*').order('orden'),
    sb.from('asientos').select('mesa_id, member_id'),
    sb.from('guest_members').select('id, name'),
  ])
  for (const r of [ms, as, mem]) if (r.error) throw new Error(r.error.message)

  const nombreDe = new Map(mem.data.map(m => [m.id, m.name]))
  const cuantos = as.data.reduce((a, x) => a.set(x.mesa_id, (a.get(x.mesa_id) || 0) + 1), new Map())

  const mesas = ms.data.filter(m => !esPrincipal(m)).map(m => ({
    nombre: m.nombre,
    romano: romano(+(String(m.nombre).match(/\d+/) || [0])[0]),
    cancion: (m.notas || '').trim(),
    capitan: m.capitan_id ? nombreCorto(nombreDe.get(m.capitan_id) || '') : '',
    personas: cuantos.get(m.id) || 0,
  }))

  await mkdir(SALIDA, { recursive: true })
  const destino = join(SALIDA, 'playlist-DJ.xlsx')
  await construir(mesas).xlsx.writeFile(destino)

  const sinCancion = mesas.filter(m => !m.cancion).length
  console.log('  ✓ dj/playlist-DJ.xlsx'.padEnd(32),
    `${momentos().length} momentos · ${mesas.length} mesas` +
    (sinCancion ? ` · ojo: ${sinCancion} sin canción` : ' · todas con canción'))
  console.log(`\n  En ${SALIDA}\n`)
}

main().catch(e => { console.error('✗', e.message); process.exitCode = 1 })
