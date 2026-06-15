export default function AutoPlayBtn({ active, onToggle }) {
  return (
    <button
      id="autoplay-btn"
      className={active ? 'active' : ''}
      aria-label={active ? 'Detener presentación automática' : 'Presentación automática'}
      title={active ? 'Detener' : 'Reproducir presentación'}
      onClick={onToggle}
    >
      {active
        ? <svg viewBox="0 0 24 24"><rect x="5" y="4" width="4" height="16" /><rect x="15" y="4" width="4" height="16" /></svg>
        : <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/><line x1="19" y1="3" x2="19" y2="21"/></svg>
      }
    </button>
  )
}
