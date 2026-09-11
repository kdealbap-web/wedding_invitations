import { useState, useEffect, useCallback, useMemo } from 'react'
import { logoWedding, p5722, p5810, p5887, e6174, e6181 } from '../assets/images'
import './pantalla.css'

// ─── Ornamentos compartidos ───
function Rule() {
  return (
    <div className="pl-rule" aria-hidden="true">
      <span className="pl-rule-l" />
      <svg viewBox="0 0 12 12" width="12" height="12"><path d="M6 0 12 6 6 12 0 6Z" /></svg>
      <span className="pl-rule-l" />
    </div>
  )
}

function Rings() {
  return (
    <svg className="pl-rings" viewBox="0 0 52 18" aria-hidden="true">
      <circle cx="15" cy="9" r="7" /><circle cx="37" cy="9" r="7" />
    </svg>
  )
}

// Cartela de momento: el patrón que comparten vals, brindis, torta y ramo
function Momento({ kicker, titulo, nota }) {
  return (
    <>
      <img className="pl-crest" src={logoWedding} alt="" aria-hidden="true" />
      <p className="pl-kicker">{kicker}</p>
      <h1 className="pl-momento">{titulo}</h1>
      <Rule />
      {nota && <p className="pl-nota">{nota}</p>}
    </>
  )
}

// ─── Las cartelas ───
// bg: foto de fondo · dim: opacidad del velo oscuro que la vuelve legible en LED
const ALL_CARTELAS = [
  {
    id: 'bienvenida', label: 'Bienvenida', bg: e6181, dim: 0.74,
    Comp: () => (
      <>
        <img className="pl-logo" src={logoWedding} alt="Angely & Kevin" />
        <p className="pl-script">Bienvenidos a nuestra boda</p>
        <h1 className="pl-nombre">Angely</h1>
        <p className="pl-amp">&amp;</p>
        <h1 className="pl-nombre pl-nombre-it">Kevin</h1>
        <Rings />
        <p className="pl-fecha">12 de Septiembre · 2026</p>
      </>
    ),
  },
  {
    id: 'hashtag', label: 'Hashtag', bg: null, dim: 0,
    Comp: () => (
      <>
        <img className="pl-crest" src={logoWedding} alt="" aria-hidden="true" />
        <p className="pl-kicker">Comparte la noche con nosotros</p>
        <h1 className="pl-hashtag">#AyKBoda</h1>
        <Rule />
        <p className="pl-nota">
          Sube tus fotos y videos con el hashtag
          <br />y aparecerán entre nuestros recuerdos.
        </p>
      </>
    ),
  },
  {
    id: 'brindis', label: 'Brindis', bg: p5722, dim: 0.72,
    Comp: () => <Momento kicker="Levantemos la copa" titulo="Un brindis" nota="Por los novios · por esta noche" />,
  },
  {
    id: 'vals', label: 'Primer baile', bg: p5810, dim: 0.74,
    Comp: () => <Momento kicker="Y que suene la música" titulo="El primer baile" nota="Angely & Kevin" />,
  },
  {
    id: 'torta', label: 'Torta', bg: null, dim: 0,
    Comp: () => <Momento kicker="El momento más dulce" titulo="El corte de la torta" nota="Acompáñanos alrededor de la mesa" />,
  },
  {
    id: 'ramo', label: 'Ramo', bg: p5887, dim: 0.75,
    Comp: () => <Momento kicker="Que la suerte decida" titulo="El lanzamiento del ramo" nota="Solteras a la pista" />,
  },
  {
    id: 'horaloca', label: 'Hora loca', bg: null, dim: 0, fiesta: true,
    Comp: () => (
      <>
        <p className="pl-kicker pl-kicker-fiesta">Que empiece el desorden</p>
        <h1 className="pl-loca">¡Hora loca!</h1>
        <p className="pl-nota pl-nota-fiesta">Todos a la pista · sin excusas</p>
      </>
    ),
  },
  {
    id: 'verso', label: 'Verso', bg: e6174, dim: 0.78,
    Comp: () => (
      <>
        <img className="pl-crest" src={logoWedding} alt="" aria-hidden="true" />
        <p className="pl-verso">
          «El amor es paciente, es bondadoso…
          <br />todo lo soporta, todo lo espera.»
        </p>
        <p className="pl-verso-ref">1 Corintios 13:4-7</p>
      </>
    ),
  },
  {
    id: 'gracias', label: 'Gracias', bg: null, dim: 0,
    Comp: () => (
      <>
        <img className="pl-logo pl-logo-sm" src={logoWedding} alt="Angely & Kevin" />
        <p className="pl-script">Gracias por acompañarnos</p>
        <Rule />
        <p className="pl-nota">
          Que esta noche quede en la memoria
          <br />de todos como quedará en la nuestra.
        </p>
        <p className="pl-firma">Angely &amp; Kevin</p>
      </>
    ),
  },
]

// El script de exportación (scripts/export-pantallas.mjs) lee esta lista desde el
// navegador, para que el orden y los ids tengan una sola fuente de verdad.
if (typeof window !== 'undefined') window.__CARTELAS = ALL_CARTELAS.map(c => c.id)

export default function PantallaLed() {
  const params     = useMemo(() => new URLSearchParams(window.location.search), [])
  const exportMode = params.has('export')   // sin controles ni guías: modo captura
  const anim       = params.has('anim')     // activa los keyframes: sólo para los MP4
  const only       = params.get('c')        // aísla una cartela para exportarla

  const [i, setI]           = useState(0)
  const [guias, setGuias]   = useState(false)  // zona segura: los paneles LED recortan bordes
  const [escala, setEscala] = useState(1)

  const cartelas = only ? ALL_CARTELAS.filter(c => c.id === only) : ALL_CARTELAS
  const actual   = cartelas[Math.min(i, cartelas.length - 1)] || ALL_CARTELAS[0]

  // index.css fija overflow:hidden en html/body; aquí sumamos el fondo neutro del taller
  useEffect(() => {
    document.body.classList.add('pl-body')
    return () => document.body.classList.remove('pl-body')
  }, [])

  // En captura el viewport ya mide 1920×1080 exactos: escala 1 y sin reflow
  useEffect(() => {
    if (exportMode) return
    const fit = () => setEscala(Math.min(1, (window.innerWidth - 96) / 1920, (window.innerHeight - 210) / 1080))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [exportMode])

  const ir = useCallback(d => setI(v => (v + d + cartelas.length) % cartelas.length), [cartelas.length])

  useEffect(() => {
    if (exportMode) return
    const onKey = e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); ir(1) }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); ir(-1) }
      if (e.key === 'g' || e.key === 'G') setGuias(v => !v)
      if (e.key === 'f' || e.key === 'F') document.documentElement.requestFullscreen?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ir, exportMode])

  const Card = (
    <article
      id="pl-card"
      className={`pl-card${actual.fiesta ? ' pl-card-fiesta' : ''}${anim ? ' pl-anim' : ''}${guias && !exportMode ? ' pl-guias' : ''}`}
    >
      {actual.bg && (
        <>
          <img className="pl-bg" src={actual.bg} alt="" aria-hidden="true" />
          <span className="pl-dim" style={{ background: `rgba(12,7,3,${actual.dim})` }} aria-hidden="true" />
        </>
      )}
      <span className="pl-vig" aria-hidden="true" />
      <div className="pl-inner"><actual.Comp /></div>
    </article>
  )

  if (exportMode) return Card

  return (
    <div className="pl-root">
      <header className="pl-bar">
        <span className="pl-bar-t">Pantallas LED · 1920 × 1080</span>
        <div className="pl-bar-nav">
          <button className="pl-btn" onClick={() => ir(-1)} aria-label="Anterior">←</button>
          <span className="pl-bar-pos">{String(i + 1).padStart(2, '0')} / {String(cartelas.length).padStart(2, '0')}</span>
          <button className="pl-btn" onClick={() => ir(1)} aria-label="Siguiente">→</button>
        </div>
        <span className="pl-bar-name">{actual.label}</span>
        <button className={`pl-btn pl-btn-t${guias ? ' on' : ''}`} onClick={() => setGuias(v => !v)}>Zona segura (G)</button>
      </header>

      <div className="pl-stage" style={{ height: 1080 * escala }}>
        <div className="pl-scaler" style={{ transform: `scale(${escala})` }}>{Card}</div>
      </div>

      <nav className="pl-tabs">
        {cartelas.map((c, n) => (
          <button key={c.id} className={`pl-tab${n === i ? ' on' : ''}`} onClick={() => setI(n)}>{c.label}</button>
        ))}
      </nav>
      <p className="pl-hint">
        Flechas para navegar · <b>G</b> marca la zona segura del panel · <b>F</b> pantalla completa.
        Los PNG finales se generan con <code>npm run pantallas</code>.
      </p>
    </div>
  )
}
