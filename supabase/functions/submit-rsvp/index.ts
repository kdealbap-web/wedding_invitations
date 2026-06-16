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
    const { guest_id, attending, member_ids = [], dietary_notes, song_request } = await req.json()
    if (!guest_id || attending === undefined) return json({ error: 'missing_fields' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Upsert confirmation (re-submit is allowed)
    const { data: conf, error: confErr } = await supabase
      .from('confirmations')
      .upsert(
        { guest_id, attending, dietary_notes: dietary_notes || null, song_request: song_request || null, confirmed_at: new Date().toISOString() },
        { onConflict: 'guest_id' },
      )
      .select('id')
      .single()

    if (confErr) throw confErr

    // Replace attending members
    await supabase.from('confirmation_members').delete().eq('confirmation_id', conf.id)

    if (attending && member_ids.length > 0) {
      const { error: cmErr } = await supabase.from('confirmation_members').insert(
        member_ids.map((mid: string) => ({ confirmation_id: conf.id, member_id: mid })),
      )
      if (cmErr) throw cmErr
    }

    return json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return json({ error: msg }, 500)
  }
})
