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
    const { token } = await req.json()
    if (!token) return json({ error: 'token_required' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error } = await supabase
      .from('guests')
      .select('id, name, invitation_type, guest_members(id, name, order_num)')
      .eq('token', token)
      .single()

    if (error || !data) return json({ error: 'not_found' }, 404)

    const members = [...(data.guest_members as {id:string;name:string;order_num:number}[])]
      .sort((a, b) => a.order_num - b.order_num)
      .map(({ id, name }) => ({ id, name }))

    return json({ id: data.id, name: data.name, invitation_type: data.invitation_type, members })
  } catch (e) {
    return json({ error: 'internal_error' }, 500)
  }
})
