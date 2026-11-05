// ─── Pantallas de estado ───
// Páginas neutras para todo lo que no es una invitación viva: link viejo,
// link que no existe, evento terminado. No llevan datos de ningún evento.
// Reutilizan el aspecto de .cerrada (index.css).

function Estado({ eyebrow, titulo, texto, children }) {
  return (
    <div className="cerrada">
      <div className="cerrada-c">
        {eyebrow && <p className="cerrada-eyebrow">{eyebrow}</p>}
        <h1 className="cerrada-title">{titulo}</h1>
        {texto && <p className="cerrada-text" style={{ marginBottom: 0 }}>{texto}</p>}
        {children}
      </div>
    </div>
  )
}

// Cualquier ruta que no es /i/:token — incluidos los links viejos de la boda
// (/eyJ… y ?t=) — cae acá.
export const NoActiva = () => (
  <Estado
    eyebrow="Invitación"
    titulo={<>Esta invitación <em>ya no está activa</em></>}
    texto="El enlace que abriste corresponde a un evento que ya terminó o a una invitación que cambió. Si crees que es un error, escríbele a quien te invitó."
  />
)

export const NoEncontrada = () => (
  <Estado
    eyebrow="Invitación"
    titulo={<>No encontramos <em>esta invitación</em></>}
    texto="Revisa que el enlace esté completo, tal como te lo enviaron. Si el problema sigue, pídele a quien te invitó que te lo comparta de nuevo."
  />
)

export const EventoFinalizado = ({ titulo }) => (
  <Estado
    eyebrow="Gracias por acompañarnos"
    titulo={<>Este evento <em>ya finalizó</em></>}
    texto={titulo ? `«${titulo}» ya no recibe respuestas ni muestra su invitación.` : 'Este evento ya no recibe respuestas ni muestra su invitación.'}
  />
)

// Mientras responde la red: sin nombre ni datos, solo un respiro.
export const Cargador = () => (
  <div className="cerrada" role="status" aria-live="polite">
    <div className="cerrada-c">
      <div className="inv-loader" aria-hidden="true"><span /><span /><span /></div>
      <p className="cerrada-eyebrow" style={{ marginTop: '1.4rem', marginBottom: 0 }}>Abriendo tu invitación</p>
    </div>
  </div>
)
