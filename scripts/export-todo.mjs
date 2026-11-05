// ─── export-todo ───
// El Excel, las imágenes de mesas y la playlist del DJ de una vez.
// Reenvía los argumentos a los tres, porque `npm run a && npm run b -- --x`
// sólo le pasa --x al último.
//
//   npm run export-todo -- --evento=xv-mauren
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
for (const script of ['export-invitados', 'export-mesas-img', 'export-dj']) {
  console.log(`\n── ${script} ──`)
  const r = spawnSync(process.execPath, [`scripts/${script}.mjs`, ...args], { stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
