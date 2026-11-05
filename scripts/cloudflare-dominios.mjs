// ─── Dominios de la plataforma en Cloudflare ───
// Conecta invitation.kdealbap.com y los subdominios de cada evento al Worker
// `weddingskya`. Lo corre Kevin con scripts/cloudflare-dominios.bat, que pide el
// token por consola: el token nunca se escribe en disco ni en el log.
//
//   node scripts/cloudflare-dominios.mjs                 revisa y aplica
//   node scripts/cloudflare-dominios.mjs --solo-revisar  solo diagnostica
//
// Idempotente: un dominio que ya apunta al Worker no se toca. Deja un resumen
// en cloudflare-dominios.log (gitignoreado por *.log) para que Claude lo lea.
import { appendFileSync, writeFileSync } from 'node:fs'

const ZONA = 'kdealbap.com'
const WORKER = 'weddingskya'
const DOMINIOS = ['invitation.kdealbap.com', 'mauren.invitation.kdealbap.com']
const LOG = 'cloudflare-dominios.log'
const SOLO_REVISAR = process.argv.includes('--solo-revisar')

const TOKEN = process.env.CF_API_TOKEN?.trim()
writeFileSync(LOG, `cloudflare-dominios · ${new Date().toISOString()}\n`)
const log = (s) => { console.log(s); appendFileSync(LOG, s + '\n') }
if (!TOKEN) { log('✗ Falta CF_API_TOKEN'); process.exit(1) }

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
  // Confirmación del token antes de tocar nada: válido, activo y cuándo vence.
  // Se muestran sus 4 últimos caracteres para reconocerlo, nunca el token.
  // Token de usuario → /user/tokens/verify. Token de cuenta (la pantalla nueva de
  // Cloudflare los crea así) → /accounts/{id}/tokens/verify, con la cuenta de la zona.
  const zona = await api('GET', `/zones?name=${ZONA}`)
  const cuentaZona = process.env.CF_ACCOUNT_ID?.trim() || zona.result?.[0]?.account?.id
  let v = await api('GET', '/user/tokens/verify')
  if (!v.ok && cuentaZona) v = await api('GET', `/accounts/${cuentaZona}/tokens/verify`)
  if (!v.ok || v.result?.status !== 'active') throw new Error(`El token no es válido o no está activo (${v.status} ${v.errores}). Si lo creaste desde R2, ese no sirve: hace falta un API Token general (My Profile → API Tokens).`)
  log(`✓ Token confirmado: activo, termina en …${TOKEN.slice(-4)}${v.result.expires_on ? `, vence ${v.result.expires_on.slice(0, 10)}` : ', sin vencimiento'}`)

  if (!zona.ok || !zona.result?.length) throw new Error(`No veo la zona ${ZONA} (${zona.status} ${zona.errores}). ¿El token tiene Zone:Read sobre ella?`)
  const zoneId = zona.result[0].id
  const cuenta = cuentaZona
  log(`✓ Zona ${ZONA}`)

  const scripts = await api('GET', `/accounts/${cuenta}/workers/scripts`)
  if (!scripts.ok) throw new Error(`No puedo listar Workers (${scripts.status} ${scripts.errores}). Falta Workers Scripts:Edit.`)
  const w = scripts.result.find(s => s.id === WORKER)
  if (!w) throw new Error(`No existe el Worker ${WORKER}. Workers: ${scripts.result.map(s => s.id).join(', ')}`)
  log(`✓ Worker ${WORKER} (modificado ${w.modified_on?.slice(0, 10)})`)

  // De qué rama despliega (Workers Builds). Es solo informativo: si el token no
  // tiene el permiso de Builds, se dice y se sigue.
  const builds = await api('GET', `/accounts/${cuenta}/builds/workers/${w.tag}/triggers`)
  if (builds.ok) {
    for (const t of builds.result || []) {
      log(`  build: rama ${t.branch_includes?.join(',') || '?'} · build «${t.build_command || ''}» · deploy «${t.deploy_command || ''}» · dir «${t.root_directory || '/'}»`)
    }
  } else log(`  (no pude leer la configuración de build: ${builds.status} ${builds.errores})`)

  const actuales = await api('GET', `/accounts/${cuenta}/workers/domains`)
  if (!actuales.ok) throw new Error(`No puedo listar dominios de Workers (${actuales.status} ${actuales.errores})`)

  for (const host of DOMINIOS) {
    const ya = actuales.result.find(d => d.hostname === host)
    if (ya?.service === WORKER) { log(`= ${host} ya apunta a ${WORKER}`); continue }
    if (ya) { log(`! ${host} apunta a OTRO Worker (${ya.service}); no lo toco`); continue }

    const dns = await api('GET', `/zones/${zoneId}/dns_records?name=${host}`)
    if (dns.ok && dns.result?.length) {
      log(`! ${host} ya tiene registros DNS (${dns.result.map(r => `${r.type} ${r.content}`).join(', ')}); el dominio de Workers no se puede crear encima. Bórralos o dime y lo vemos.`)
      continue
    }
    if (SOLO_REVISAR) { log(`· ${host} libre: se crearía`); continue }

    const r = await api('PUT', `/accounts/${cuenta}/workers/domains`, { environment: 'production', hostname: host, service: WORKER, zone_id: zoneId })
    log(r.ok ? `✓ ${host} → ${WORKER}` : `✗ ${host}: ${r.status} ${r.errores}`)
  }

  // El certificado puede tardar unos minutos; esto solo dice si ya responde.
  for (const host of DOMINIOS) {
    try {
      const r = await fetch(`https://${host}/`, { redirect: 'manual' })
      log(`  https://${host}/ → ${r.status}`)
    } catch (e) { log(`  https://${host}/ → aún no responde (${e.cause?.code || e.message}); normal los primeros minutos`) }
  }
  log('Listo.')
} catch (e) {
  log(`✗ ${e.message}`)
  process.exitCode = 1
}
