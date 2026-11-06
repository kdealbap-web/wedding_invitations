// ─── Variables de build en Cloudflare ───
// Deja las variables VITE_* iguales en los dos proyectos que compilan cada push a
// master: el Worker `weddingskya` (Workers Builds, sirve invitation.kdealbap.com y
// los subdominios) y el proyecto de Pages `weddingkya`. Si a uno le falta una, su
// build sale sin Supabase y las invitaciones fallan.
//
// Lo corre Kevin con scripts/cloudflare-config.bat, que pide el token por consola.
// Las llaves salen de .env (local) y VITE_APP_URL de .env.production. No despliega:
// solo configura; el siguiente push ya compila con esto. Idempotente.
// Resumen en cloudflare-config.log (gitignoreado) para que Claude lo lea.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'

const ZONA = 'kdealbap.com'
const WORKER = 'weddingskya'
const PAGES = 'weddingkya'
const LOG = 'cloudflare-config.log'

const leerEnv = (archivo) => Object.fromEntries(readFileSync(archivo, 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*(VITE_[A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const local = leerEnv('.env')
const VARS = {
  VITE_SUPABASE_URL: local.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: local.VITE_SUPABASE_ANON_KEY,
  VITE_APP_URL: leerEnv('.env.production').VITE_APP_URL,
}

const TOKEN = process.env.CF_API_TOKEN?.trim()
writeFileSync(LOG, `cloudflare-config · ${new Date().toISOString()}\n`)
const log = (s) => { console.log(s); appendFileSync(LOG, s + '\n') }
// La anon key es pública (va dentro del bundle), pero igual solo se muestra la cola
const muestra = (k, v) => k.includes('KEY') ? `…${String(v).slice(-6)}` : v

const api = async (metodo, ruta, cuerpo) => {
  const r = await fetch(`https://api.cloudflare.com/client/v4${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const j = await r.json().catch(() => ({}))
  return { ok: r.ok && j.success !== false, status: r.status, result: j.result, errores: (j.errors || []).map(e => `${e.code} ${e.message}`).join('; ') }
}

try {
  if (!TOKEN) throw new Error('Falta CF_API_TOKEN')
  for (const [k, v] of Object.entries(VARS)) if (!v) throw new Error(`Falta ${k} en .env / .env.production`)
  if (!VARS.VITE_APP_URL.startsWith('https://invitation.kdealbap.com')) throw new Error(`VITE_APP_URL raro: ${VARS.VITE_APP_URL}`)
  log('Valores a dejar:')
  for (const [k, v] of Object.entries(VARS)) log(`  ${k} = ${muestra(k, v)}`)

  const zona = await api('GET', `/zones?name=${ZONA}`)
  const cuenta = process.env.CF_ACCOUNT_ID?.trim() || zona.result?.[0]?.account?.id
  if (!cuenta) throw new Error(`No pude deducir la cuenta (${zona.status} ${zona.errores}). Pega el Account ID.`)
  let v = await api('GET', '/user/tokens/verify')
  if (!v.ok) v = await api('GET', `/accounts/${cuenta}/tokens/verify`)
  if (!v.ok || v.result?.status !== 'active') throw new Error(`El token no es válido o no está activo (${v.status} ${v.errores})`)
  log(`✓ Token activo, termina en …${TOKEN.slice(-4)}`)

  // ── 1. Worker weddingskya (Workers Builds) ──
  const scripts = await api('GET', `/accounts/${cuenta}/workers/scripts`)
  const w = scripts.result?.find(s => s.id === WORKER)
  if (!w) throw new Error(`No veo el Worker ${WORKER} (${scripts.status} ${scripts.errores})`)
  const triggers = await api('GET', `/accounts/${cuenta}/builds/workers/${w.tag}/triggers`)
  if (!triggers.ok) log(`✗ Worker: no puedo leer su build (${triggers.status} ${triggers.errores}). Al token le falta «Workers Builds Configuration: Edit».`)
  for (const t of triggers.result || []) {
    const ruta = `/accounts/${cuenta}/builds/triggers/${t.trigger_uuid}/environment_variables`
    const r = await api('PATCH', ruta, Object.fromEntries(Object.entries(VARS).map(([k, val]) => [k, { value: val, is_secret: false }])))
    log(r.ok ? `✓ Worker ${WORKER} · rama ${t.branch_includes?.join(',')}: variables puestas` : `✗ Worker ${WORKER}: ${r.status} ${r.errores}`)
    const ahora = await api('GET', ruta)
    if (ahora.ok) log(`  ahora tiene: ${Object.keys(ahora.result || {}).sort().join(', ')}`)
  }

  // ── 2. Pages weddingkya (también compila en cada push) ──
  const p = await api('GET', `/accounts/${cuenta}/pages/projects/${PAGES}`)
  if (!p.ok) log(`✗ Pages ${PAGES}: no lo puedo leer (${p.status} ${p.errores}). Al token le falta «Cloudflare Pages: Edit».`)
  else {
    const env_vars = Object.fromEntries(Object.entries(VARS).map(([k, val]) => [k, { type: 'plain_text', value: val }]))
    const r = await api('PATCH', `/accounts/${cuenta}/pages/projects/${PAGES}`, { deployment_configs: { production: { env_vars }, preview: { env_vars } } })
    log(r.ok ? `✓ Pages ${PAGES}: variables puestas (producción y preview)` : `✗ Pages ${PAGES}: ${r.status} ${r.errores}`)
    if (r.ok) log(`  ahora tiene: ${Object.keys(r.result?.deployment_configs?.production?.env_vars || {}).sort().join(', ')}`)
  }
  log('Listo. No se desplegó nada: el próximo push compila con esto.')
} catch (e) {
  log(`✗ ${e.message}`)
  process.exitCode = 1
}
