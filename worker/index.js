// ─── Worker weddingskya: fotos de los eventos en R2 ───
// Solo atiende /fotos/* y /api/* (run_worker_first en wrangler.jsonc); el resto
// del sitio son estáticos y no pasa por aquí, así un error en este archivo no
// tumba la invitación entera.
//
//   GET    /fotos/<slug>/<diapo>-<id>.jpg      la foto, con caché de un año
//   PUT    /api/fotos?evento=<uuid>&diapo=x10  sube una (cuerpo = JPEG)
//   DELETE /api/fotos?evento=<uuid>&key=<key>  borra una
//
// Cada subida lleva un nombre nuevo, así que el archivo nunca cambia y se puede
// cachear como `immutable`: quien ya la vio no la vuelve a pedir.
// El permiso lo decide Supabase: con la sesión del panel se pide el evento, y
// RLS solo lo devuelve a la plataforma o a su admin (migración 010).

const UN_ANO = 'public, max-age=31536000, immutable'
const MAX_BYTES = 4 * 1024 * 1024
const UUID_RE = /^[0-9a-f-]{36}$/
const DIAPO_RE = /^x\d{1,2}$/
const ORIGEN_RE = /^https:\/\/([a-z0-9-]+\.)*kdealbap\.com$|^http:\/\/localhost:\d+$/

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url)
    if (url.pathname.startsWith('/fotos/')) return servirFoto(req, env, ctx, url)
    if (url.pathname === '/api/fotos') return api(req, env, url)
    return env.ASSETS.fetch(req)
  },
}

async function servirFoto(req, env, ctx, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response(null, { status: 405 })
  const cache = caches.default
  const guardada = await cache.match(req)
  if (guardada) return guardada
  const obj = await env.FOTOS.get(decodeURIComponent(url.pathname.slice('/fotos/'.length)))
  if (!obj) return new Response('No existe', { status: 404 })
  const res = new Response(obj.body, {
    headers: { 'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': UN_ANO, ETag: obj.httpEtag },
  })
  ctx.waitUntil(cache.put(req, res.clone()))
  return res
}

async function api(req, env, url) {
  const origen = req.headers.get('Origin') || ''
  const cors = ORIGEN_RE.test(origen)
    ? { 'Access-Control-Allow-Origin': origen, 'Access-Control-Allow-Methods': 'PUT, DELETE', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', Vary: 'Origin' }
    : {}
  const json = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json', ...cors } })
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  const evento = url.searchParams.get('evento') || ''
  if (!UUID_RE.test(evento)) return json({ error: 'evento inválido' }, 400)
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'sin sesión' }, 401)

  // ¿Esta sesión puede ver el evento? RLS responde: fila = sí, vacío = no.
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/events?id=eq.${evento}&select=slug`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${jwt}` },
  })
  if (r.status === 401) return json({ error: 'sesión vencida, vuelve a entrar' }, 401)
  const slug = r.ok ? (await r.json())[0]?.slug : null
  if (!slug) return json({ error: 'sin permiso sobre este evento' }, 403)

  if (req.method === 'PUT') {
    const diapo = url.searchParams.get('diapo') || ''
    if (!DIAPO_RE.test(diapo)) return json({ error: 'diapositiva inválida' }, 400)
    const tipo = req.headers.get('Content-Type') || ''
    if (!/^image\/(jpeg|webp|png)$/.test(tipo)) return json({ error: 'solo imágenes JPEG, WebP o PNG' }, 415)
    const datos = await req.arrayBuffer()
    if (!datos.byteLength || datos.byteLength > MAX_BYTES) return json({ error: 'la foto debe pesar menos de 4 MB' }, 413)
    const ext = tipo.split('/')[1].replace('jpeg', 'jpg')
    const key = `${slug}/${diapo}-${crypto.randomUUID().slice(0, 8)}.${ext}`
    await env.FOTOS.put(key, datos, { httpMetadata: { contentType: tipo } })
    return json({ key })
  }

  if (req.method === 'DELETE') {
    const key = url.searchParams.get('key') || ''
    // Solo dentro de la carpeta de SU evento
    if (!key.startsWith(`${slug}/`) || key.includes('..')) return json({ error: 'clave inválida' }, 400)
    await env.FOTOS.delete(key)
    return json({ ok: true })
  }
  return json({ error: 'método no permitido' }, 405)
}
