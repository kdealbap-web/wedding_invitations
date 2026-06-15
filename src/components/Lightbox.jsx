export default function Lightbox({ src, onClose }) {
  return (
    <div
      id="lightbox"
      role="dialog"
      aria-label="Foto ampliada"
      aria-modal="true"
      className={src ? 'open' : ''}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="lb-close" onClick={onClose} aria-label="Cerrar">×</div>
      {src && <img id="lb-img" src={src} alt="" />}
    </div>
  )
}
