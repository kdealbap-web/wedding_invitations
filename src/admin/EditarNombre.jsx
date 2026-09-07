import { useState, useRef, useEffect, useCallback } from 'react'
import { nombreIncompleto, MOTIVO, normalizarNombre } from './nombres'

// ─── Editar un nombre, en el sitio ───
//
// Sólo puede haber UNO abierto en todo el tablero, y por eso el estado que lo
// abre lleva la zona además de la clave de la ficha: la misma persona se pinta
// en la cola de «por completar» y otra vez en «Sin mesa» o en su mesa. Dos
// inputs con autoFocus montados en el mismo commit hacen que el primero reciba
// focusout en cuanto el segundo toma el foco —React llama .focus() por cada
// autoFocus—, y ese focusout guardaba y cerraba el editor en el mismo frame en
// que se abría. Era el motivo de que editar un nombre no funcionara nunca.
//
// El modelo de confirmación es explícito: Enter o ✓ guardan, Esc o ✕ cancelan,
// y salir del recuadro guarda. Nada de eso es adivinable solo, así que va
// escrito debajo del campo.

export default function EditarNombre({ ficha, onGuardar, onCancelar, haySiguiente, compacto }) {
  const inicial = ficha.anon ? '' : ficha.nombre
  const [valor, setValor] = useState(inicial)
  const caja   = useRef(null)
  const campo  = useRef(null)
  const cerrado = useRef(false)

  // El foco se pide aquí y no con autoFocus para poder seleccionar el texto:
  // casi siempre se reescribe el nombre entero, no se corrige una letra.
  // El scroll es para encadenar con Enter: la cola tiene su propio alto y el
  // siguiente nombre puede caer fuera de la parte visible.
  useEffect(() => {
    campo.current?.focus()
    campo.current?.select()
    caja.current?.scrollIntoView({ block: 'nearest' })
  }, [])

  const limpio = normalizarNombre(valor)
  const falta  = limpio ? nombreIncompleto(limpio) : 'vacio'
  const cambia = limpio && limpio !== inicial

  const confirmar = useCallback(seguir => {
    if (cerrado.current) return
    cerrado.current = true
    onGuardar(limpio, { seguir })
  }, [limpio, onGuardar])

  const cancelar = () => {
    if (cerrado.current) return
    cerrado.current = true
    onCancelar()
  }

  return (
    <div
      ref={caja}
      className={`mbn-ed${compacto ? ' compacto' : ''}`}
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
      // Salir del recuadro guarda. Se comprueba el destino porque el focusout
      // también salta al pasar el foco a los propios botones ✓ y ✕.
      onBlur={e => { if (!caja.current?.contains(e.relatedTarget)) confirmar(false) }}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); cancelar() }
        if (e.key === 'Enter')  { e.preventDefault(); confirmar(haySiguiente) }
      }}
    >
      <div className="mbn-ed-fila">
        <input
          ref={campo} value={valor} onChange={e => setValor(e.target.value)}
          placeholder={ficha.anon ? `Quién ocupa esta plaza de ${ficha.grupo}` : 'Nombre y apellido'}
          aria-label={ficha.anon ? `Nombre para una plaza de ${ficha.grupo}` : `Nombre de ${ficha.nombre}`}
          spellCheck={false} autoComplete="off"
        />
        {/* preventDefault en mousedown: sin él el botón roba el foco, el input
            dispara su blur y se guarda antes de saber a cuál se pulsó. */}
        <button
          type="button" className="mbn-ok" title="Guardar" aria-label="Guardar"
          onMouseDown={e => e.preventDefault()} onClick={() => confirmar(false)}
        >✓</button>
        <button
          type="button" className="mbn-no" title="Cancelar" aria-label="Cancelar"
          onMouseDown={e => e.preventDefault()} onClick={cancelar}
        >✕</button>
      </div>

      {/* Lo que se va a imprimir. La tipografía es la misma con la que
          imagenes.js dibuja la tarjeta de mesa: se ve el resultado, no el dato. */}
      <p className="mbn-vista">
        <em>En la tarjeta de mesa</em>
        {limpio
          ? <span className={falta ? 'floja' : ''}>{limpio}</span>
          : <span className="mbn-hueco">Saldría en blanco</span>}
      </p>

      <p className="mbn-pista">
        {cambia && falta
          ? <><b>{MOTIVO[falta]}.</b> Se guarda igual si es lo que sabes.</>
          : <>Enter {haySiguiente ? 'guarda y pasa al siguiente' : 'guarda'} · Esc cancela</>}
      </p>
    </div>
  )
}
