export default function VideoModal({ isOpen, onClose }) {
  return (
    <div
      id="video-modal"
      role="dialog"
      aria-label="Video de recuerdo"
      aria-modal="true"
      className={isOpen ? 'open' : ''}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="vm-inner">
        <div className="vm-close" onClick={onClose} aria-label="Cerrar">×</div>
        <p className="eyebrow" style={{ marginBottom: 'var(--gap-md)' }}>Video de Recuerdo</p>
        <div className="ph-img" style={{ aspectRatio: '16/9', marginBottom: 'var(--gap-md)' }}>
          [ Agrega aquí tu embed de YouTube o archivo de video · 16:9 ]
        </div>
        <p className="meta" style={{ textAlign: 'center' }}>
          Reemplaza el placeholder con un &lt;iframe&gt; de YouTube o &lt;video&gt; HTML5.
        </p>
      </div>
    </div>
  )
}
