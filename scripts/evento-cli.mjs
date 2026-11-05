// ─── Elegir el evento de un script por consola ───
//
// Todos los scripts que leen invitados o mesas toman `--evento=<slug>`. Sin la
// bandera no adivinan: listan los eventos y salen con error, porque exportar
// las mesas de otro evento sin darse cuenta es peor que no exportar.

export const slugPedido = () =>
  (process.argv.find(a => a.startsWith('--evento=')) || '').slice('--evento='.length) || null

/** Devuelve la fila de `events` o, si no hay bandera/slug válido, lista y sale. */
export async function elegirEvento(sb) {
  const slug = slugPedido()
  const { data, error } = await sb.from('events').select('id, slug, titulo, estado, tipo, invitation_types').order('fecha')
  if (error) throw new Error(`events: ${error.message}${error.message.includes('does not exist') ? ' (¿falta aplicar 008_multi_evento.sql?)' : ''}`)

  const ev = slug && (data || []).find(e => e.slug === slug)
  if (ev) return ev

  console.error(slug ? `\n  No existe el evento «${slug}».` : '\n  Falta --evento=<slug>.')
  console.error('  Eventos disponibles:\n')
  for (const e of data || []) console.error(`    --evento=${e.slug.padEnd(24)} ${e.titulo} · ${e.estado}`)
  console.error('')
  process.exit(2)
}
