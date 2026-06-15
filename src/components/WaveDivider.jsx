export default function WaveDivider({ fill, flipped = false }) {
  return (
    <div
      className="wave-div"
      aria-hidden="true"
      style={flipped ? { transform: 'scaleY(-1)' } : undefined}
    >
      <svg viewBox="0 0 1440 48" preserveAspectRatio="none" fill={fill}>
        <path d="M0 0L0 22C120 38 240 10 360 26C480 42 600 14 720 30C840 46 960 16 1080 30C1200 44 1320 12 1440 24L1440 0Z" />
      </svg>
    </div>
  )
}
