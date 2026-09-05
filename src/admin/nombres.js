// ─── Nombres por completar ───
//
// La base arrastra nombres que no sirven para sentar a nadie ni para imprimir
// una tarjeta de mesa: «Invitado 3», «Acompañante», «Esposa», y bastantes que
// son solo el nombre de pila. Este módulo los detecta para poder marcarlos en
// el tablero y en los exports, y que se puedan arreglar de una pasada.
//
// No corrige nada solo: solo señala. Quién es «Invitado 3» lo sabe la pareja,
// no el código.

// Palabras que describen un papel, no a una persona
const GENERICO = /^(invitad[oa]s?|acompa[ñn]antes?|esposos?a?|espos[oa]|novi[oa]s?|pareja|hij[oa]s?|ni[ñn][oa]s?|beb[eé]s?|amig[oa]s?|persona|se[ñn]ora?|sra?|sr|srta|do[ñn]a?|don|tí[oa]s?|prim[oa]s?)\.?\s*\d*$/i

/**
 * Devuelve el motivo por el que un nombre está incompleto, o null si está bien.
 * @returns 'vacio' | 'generico' | 'incompleto' | null
 */
export function nombreIncompleto(nombre) {
  const s = (nombre || '').trim().replace(/\s+/g, ' ')
  if (!s) return 'vacio'
  if (GENERICO.test(s)) return 'generico'
  // Sin apellido no se puede imprimir una tarjeta de mesa decente
  if (!s.includes(' ')) return 'incompleto'
  return null
}

export const MOTIVO = {
  vacio:      'Sin nombre',
  generico:   'Nombre genérico: no dice quién es',
  incompleto: 'Falta el apellido',
}

/** Cuenta cuántos hay de cada motivo. */
export function resumenNombres(miembros) {
  const out = { vacio: 0, generico: 0, incompleto: 0, total: 0 }
  for (const m of miembros) {
    const r = nombreIncompleto(m.name)
    if (r) { out[r]++; out.total++ }
  }
  return out
}

/**
 * Normaliza mayúsculas al guardar: «JOrge» → «Jorge», «MARIA JOSE» → «Maria Jose».
 * Respeta las partículas que van en minúscula en español.
 */
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'do', 'van', 'von'])
export function normalizarNombre(nombre) {
  return (nombre || '')
    .trim().replace(/\s+/g, ' ')
    .split(' ')
    .map((p, i) => {
      const b = p.toLowerCase()
      if (i > 0 && PARTICULAS.has(b)) return b
      return b.charAt(0).toUpperCase() + b.slice(1)
    })
    .join(' ')
}
