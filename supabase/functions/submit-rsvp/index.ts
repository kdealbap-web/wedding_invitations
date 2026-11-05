import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { guest_id, attending, member_ids = [], attending_total, dietary_notes, song_request } = await req.json()
    if (!guest_id || attending === undefined) return json({ error: 'missing_fields' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Solo un evento ACTIVO acepta respuestas. En borrador el link es vista
    // previa; cerrado o archivado, el evento ya no recibe confirmaciones.
    const { data: g } = await supabase.from('guests').select('id, cupos, events(estado), guest_members(id)').eq('id', guest_id).single()
    const evRaw = g?.events as { estado: string } | { estado: string }[] | null | undefined
    const estado = Array.isArray(evRaw) ? evRaw[0]?.estado : evRaw?.estado
    if (!g || !estado) return json({ error: 'not_found' }, 404)
    if (estado === 'borrador') return json({ error: 'preview' }, 409)
    if (estado !== 'activo')   return json({ error: 'event_closed' }, 410)

    // Solo personas de ESTA tarjeta: el cliente no decide de quién confirma.
    const propios = new Set(((g.guest_members ?? []) as { id: string }[]).map((m) => m.id))
    const miembros = (member_ids as string[]).filter((id) => propios.has(id))

    // Tarjeta sin personas cargadas (009): el invitado dice cuántos van, y el
    // número se acota a los cupos de la tarjeta. Nunca más de los que tiene.
    const tope = Math.max((g.cupos as number | null) ?? 0, propios.size)
    const total = attending && miembros.length === 0 && Number.isInteger(attending_total) && tope > 0
      ? Math.min(Math.max(attending_total, 1), tope)
      : null

    // Upsert confirmation (re-submit is allowed).
    // source y attending_total se mandan explícitos: si la wedding ya había
    // registrado esta tarjeta por teléfono (source='admin', attending_total=N),
    // la respuesta del propio invitado manda y debe limpiar ese conteo manual;
    // sin enviarlos, ON CONFLICT DO UPDATE los dejaría intactos.
    const { data: conf, error: confErr } = await supabase
      .from('confirmations')
      .upsert(
        { guest_id, attending, dietary_notes: dietary_notes || null, song_request: song_request || null, source: 'guest', attending_total: total, confirmed_at: new Date().toISOString() },
        { onConflict: 'guest_id' },
      )
      .select('id')
      .single()

    if (confErr) throw confErr

    // Replace attending members
    await supabase.from('confirmation_members').delete().eq('confirmation_id', conf.id)

    if (attending && miembros.length > 0) {
      const { error: cmErr } = await supabase.from('confirmation_members').insert(
        miembros.map((mid: string) => ({ confirmation_id: conf.id, member_id: mid })),
      )
      if (cmErr) throw cmErr
    }

    return json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return json({ error: msg }, 500)
  }
})
