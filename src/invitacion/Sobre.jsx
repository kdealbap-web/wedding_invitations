import { useState, useRef, useEffect } from 'react'
import './sobre.css'

// ─── El sobre de apertura ───
// Pantalla completa ANTES del deck: un sobre con sello de cera. Al tocar el
// sello se rompe, la solapa se abre en 3D y la carta sale y crece hasta llenar
// la pantalla; entonces el sobre se desvanece y queda el deck. ~3 s en total,
// todo con transform y opacity.
//
// Es genérico: la plantilla lo configura con props y `tema`, que son variables
// CSS (--sb-*, ver sobre.css) puestas en línea.
//   listo      → ya llegaron los datos; hasta entonces el sello no se puede tocar
//   para       → nombre del invitado («Para: …»); aparece cuando llega
//   monograma  → lo que lleva el sello (M, 15…)
//   linea / titulo / nombre / fecha → la presentación que trae la carta
//   onAbierto  → se llama al terminar el fundido (aquí se desmonta el sobre)
// Ese toque es la primera interacción del invitado: YoutubeBtn engancha el
// mismo gesto (pointerdown/touchend en window) para arrancar la música.
export default function Sobre({ listo = false, para, monograma = '15', linea, titulo, nombre, fecha, tema, onAbierto }) {
  const [fase, setFase] = useState('cerrado')   // cerrado → abre → crece → sale
  const raiz  = useRef(null)
  const carta = useRef(null)
  const plazos = useRef([])
  useEffect(() => () => plazos.current.forEach(clearTimeout), [])
  const luego = (fn, ms) => { plazos.current.push(setTimeout(fn, ms)) }

  const abrir = () => {
    if (!listo || fase !== 'cerrado') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFase('sale')
      luego(() => onAbierto?.(), 450)
      return
    }
    setFase('abre')
    // Con la carta ya fuera se mide dónde quedó y se calcula cuánto hay que
    // moverla y agrandarla para que cubra la pantalla
    luego(() => {
      const r = carta.current?.getBoundingClientRect()
      if (r && raiz.current) {
        const s = raiz.current.style
        s.setProperty('--dx', `${window.innerWidth / 2 - (r.left + r.width / 2)}px`)
        s.setProperty('--dy', `${window.innerHeight / 2 - (r.top + r.height / 2)}px`)
        s.setProperty('--k', String(Math.max(window.innerWidth / r.width, window.innerHeight / r.height) * 1.06))
      }
      setFase('crece')
    }, 1800)
    luego(() => setFase('sale'), 2350)
    luego(() => onAbierto?.(), 3000)
  }

  const cls = ['sobre-root', fase !== 'cerrado' && 'is-abre', (fase === 'crece' || fase === 'sale') && 'is-crece', fase === 'sale' && 'is-sale'].filter(Boolean).join(' ')
  const sello = <><span className="s-cera" /><span className="s-mono">{monograma}</span></>

  return (
    <div ref={raiz} className={cls} style={tema} role="dialog" aria-label="Tu invitación">
      <div className="s-escena">
        <div className="s-sobre">
          <div className="s-fondo" />

          <div className="s-carta" ref={carta} aria-hidden={fase === 'cerrado'}>
            <div className="s-carta-in">
              {linea && <p className="s-c-linea">{linea}</p>}
              {titulo && <p className="s-c-titulo">{titulo}</p>}
              {nombre && <p className="s-c-nombre">{nombre}</p>}
              {fecha && <p className="s-c-fecha">{fecha}</p>}
            </div>
          </div>

          <div className="s-frente">
            <svg className="s-pliegue" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points="0,100 50,52 100,100" vectorEffect="non-scaling-stroke" />
              <polyline points="0,0 50,52 100,0" vectorEffect="non-scaling-stroke" className="s-borde" />
            </svg>
          </div>
          <div className="s-para">
            <span>Para</span>
            <b className={para ? '' : 'espera'}>{para || ' '}</b>
          </div>

          <div className="s-solapa" aria-hidden="true">
            <i className="s-sol-fuera"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="0,0 50,100 100,0" vectorEffect="non-scaling-stroke" /></svg></i>
            <i className="s-sol-dentro"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="0,0 50,100 100,0" vectorEffect="non-scaling-stroke" /></svg></i>
          </div>

          <button type="button" className={`s-sello${listo ? ' listo' : ''}`} onClick={abrir} disabled={!listo || fase !== 'cerrado'} aria-label={listo ? 'Abrir la invitación' : 'Preparando tu invitación'}>
            <span className="s-mitad s-izq" aria-hidden="true">{sello}</span>
            <span className="s-mitad s-der" aria-hidden="true">{sello}</span>
          </button>
        </div>
        <p className="s-pista" role="status">{fase !== 'cerrado' ? ' ' : listo ? 'Toca el sello para abrir' : 'Preparando tu invitación…'}</p>
      </div>
    </div>
  )
}
