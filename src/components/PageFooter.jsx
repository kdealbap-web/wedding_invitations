export default function PageFooter() {
  return (
    <footer className="pagefoot" data-od-id="footer">
      <div className="container">
        <span className="foot-monogram">K &amp; A</span>
        <p>Con amor, <strong>Kevin Erney &amp; Angely Amileth</strong></p>
        <p style={{ marginTop: '6px' }}>12 de Septiembre de 2026 · Barranquilla, Colombia</p>
        <p className="meta" style={{ marginTop: 'var(--gap-md)' }}>
          ¿Consultas? Escríbenos a&nbsp;
          <a href="mailto:boda@kevin-angely.co" style={{ color: 'var(--accent)' }}>
            boda@kevin-angely.co
          </a>
        </p>
      </div>
    </footer>
  )
}
