export default function NavArrows({ cur, total, onPrev, onNext }) {
  return (
    <div id="nav-arrows">
      <button className="narr" aria-label="Anterior" onClick={onPrev}>
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <span id="nav-pos">{cur + 1} / {total}</span>
      <button className="narr" aria-label="Siguiente" onClick={onNext}>
        <svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18" /></svg>
      </button>
    </div>
  )
}
