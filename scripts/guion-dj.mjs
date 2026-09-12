/**
 * El guion musical de la noche, para el DJ.
 *
 * NO TIENE DATOS PROPIOS. Todo sale de `minuto-a-minuto.mjs`, que es el
 * cronograma de la wedding planner con la música que cerraron los novios con el
 * DJ metida dentro. Este módulo sólo lo mastica para las dos salidas que lo
 * consumen: el Excel (`export-dj`) y las hojas A4 de la cabina
 * (`export-mesas-img`).
 *
 * Hasta el 11·IX·2026 aquí vivía un guion PROPUESTO por mí, con la ceremonia a
 * las 6:30 y canciones sugeridas. El 12 llegó la lista de verdad y el
 * cronograma de la wedding, y esa propuesta pasó a ser un segundo papel que
 * decía cosas distintas sobre la misma noche. Se borró entera: el día de la
 * boda, dos versiones del mismo guion son peores que ninguna.
 *
 * Los preparativos de la mañana no entran: son del cronograma de la wedding, no
 * del guion del DJ, y ocho líneas sin una sola canción en la hoja de la cabina
 * son ocho líneas que estorban.
 */
import { PROGRAMA } from './minuto-a-minuto.mjs'

// ─── La hora, en minutos ───
//
// Las horas vienen como las escribe la wedding —«7:00 p. m.», «12:30 a. m.»— y
// cruzan la medianoche a mitad de la fiesta. Para poder restar una de otra hay
// que ponerlas en la misma recta: la noche empieza por la mañana, así que la
// madrugada del día siguiente son las horas de la p. m. más 24. Sin esto,
// «1:00 a. m.» vendría ANTES que «12:45 a. m.» y los bloques de después de
// medianoche saldrían en negativo.
export function minutosDe(hora) {
  const m = String(hora).match(/(\d{1,2}):(\d{2})\s*([ap])/i)
  if (!m) return 0
  let h = +m[1] % 12
  const tarde = m[3].toLowerCase() === 'p'
  if (tarde) h += 12
  // La madrugada pertenece a la noche anterior, no a la mañana del mismo día
  else if (h < 6) h += 24
  return h * 60 + +m[2]
}

// El rótulo corto de cada momento: la primera frase de lo que pasa. En la hoja
// de la cabina no cabe el párrafo entero y lo que hace falta es reconocer el
// momento de un vistazo.
const titulo = que => {
  const t = que.split(/\.\s|\.$/)[0].trim()
  return t.length > 46 ? t.slice(0, 44).trimEnd() + '…' : t
}

// El guion, ya masticado. `dura` sale del fin que escribió la wedding y no de
// la hora del siguiente: hay dos líneas suyas que se solapan y restando contra
// la siguiente salían en negativo.
export const momentos = () => PROGRAMA
  .filter(f => f.bloque !== 'preparativos')
  .map((f, i) => ({
    n: i + 1,
    hora: f.ini.replace(/\s+/g, ' ').trim(),
    fin: f.fin.replace(/\s+/g, ' ').trim(),
    momento: titulo(f.que),
    pasa: f.que,
    dj: f.nota,
    canciones: f.musica.map(m => `${m.cancion}${m.artista ? ` · ${m.artista}` : ''}`),
    pistas: f.musica,
    inicio: minutosDe(f.ini),
    dura: Math.max(0, minutosDe(f.fin) - minutosDe(f.ini)),
    clave: !!f.clave,
    sinMusica: f.musica.length === 0,
  }))

// La forma de tupla que consume la hoja impresa: [hora, momento, pasa, dj, canciones]
export const GUION = momentos().map(m => [m.hora, m.momento, m.pasa, m.dj, m.canciones])

// El guion no cabe en una A4. Se parte en hojas de catorce momentos —lo que
// llena la hoja sin apretar— y las canciones de las mesas van al final.
export const POR_HOJA_GUION = 14
