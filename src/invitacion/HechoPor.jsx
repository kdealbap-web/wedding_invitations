// ─── «Hecha con invitation» ───
// El crédito discreto que va al final de una invitación y lleva a la landing.
// La marca es un sobre cerrado con su lacre: lo primero que ve el invitado.
// Los colores salen de la plantilla (currentColor y --hp-lacre).

const LANDING = 'https://invitation.kdealbap.com/?ref=invitacion'

export const MarcaSobre = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2.8 6.2 12 13l9.2-6.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="2.6" fill="var(--hp-lacre, #c98c80)" />
  </svg>
)

export default function HechoPor({ className = '' }) {
  return (
    <a className={`hecho-por ${className}`} href={LANDING} target="_blank" rel="noopener">
      <MarcaSobre className="hp-marca" />
      <span>Hecha con <b>kdealbap</b> invitation</span>
    </a>
  )
}
