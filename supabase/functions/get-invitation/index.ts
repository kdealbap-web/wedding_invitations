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
      .select('id, name, invitation_type, numero, cupos, events(slug, tipo, titulo, fecha, estado, rsvp_limite, invitation_types, config), guest_members(id, name, order_num), confirmations(attending, attending_total, dietary_notes, song_request, confirmed_at, confirmation_members(member_id))')
      .eq('token', token)
      .single()

    if (error || !data) return json({ error: 'not_found' }, 404)

    // El evento manda sobre el link. Cerrado o archivado: el link deja de
    // funcionar y SOLO viaja el título del evento — ni miembros, ni lugar, ni
    // la confirmación. Así quedaron inactivos los links de la boda.
    type Ev = { slug: string; tipo: string; titulo: string; fecha: string | null; estado: string;
                rsvp_limite: string | null; invitation_types: unknown; config: Record<string, unknown> }
    const evRaw = data.events as Ev | Ev[] | null
    const ev = Array.isArray(evRaw) ? evRaw[0] : evRaw
    if (!ev) return json({ error: 'not_found' }, 404)
    if (ev.estado === 'cerrado' || ev.estado === 'archivado') {
      return json({ inactive: true, event: { titulo: ev.titulo, estado: ev.estado } })
    }
    const event = {
      slug: ev.slug, tipo: ev.tipo, titulo: ev.titulo, fecha: ev.fecha, estado: ev.estado,
      rsvp_limite: ev.rsvp_limite, invitation_types: ev.invitation_types, config: ev.config,
      preview: ev.estado === 'borrador',
    }

    const members = [...(data.guest_members as {id:string;name:string;order_num:number}[])]
      .sort((a, b) => a.order_num - b.order_num)
      .map(({ id, name }) => ({ id, name }))

    // Confirmación existente (máximo una por guest_id). Por el UNIQUE en
    // guest_id, PostgREST devuelve `confirmations` como OBJETO (relación 1-a-1);
    // en otros casos podría venir como arreglo. Normalizamos ambos.
    type ConfRow = {
      attending: boolean; attending_total: number | null; dietary_notes: string | null; song_request: string | null;
      confirmed_at: string; confirmation_members: { member_id: string }[] | null
    }
    const confRaw = data.confirmations as ConfRow | ConfRow[] | null
    const confRow = Array.isArray(confRaw) ? (confRaw[0] ?? null) : (confRaw ?? null)

    const confirmation = confRow ? {
      attending:            confRow.attending,
      dietary_notes:        confRow.dietary_notes,
      song_request:         confRow.song_request,
      confirmed_at:         confRow.confirmed_at,
      attending_total:      confRow.attending_total,
      attending_member_ids: (confRow.confirmation_members ?? []).map((cm) => cm.member_id),
    } : null

    // Registrar la visita (nunca debe romper la invitación si falla).
    // Se registra también en las invitaciones cerradas: saber que intentaron
    // abrirla es justamente la señal de que quizá cambiaron de planes.
    // En borrador no se cuentan: es el cliente revisando la vista previa.
    if (!event.preview) try { await supabase.from('invitation_views').insert({ guest_id: data.id }) } catch { /* ignore */ }

    // Invitación cerrada: quien avisó que no asiste deja de recibir los datos
    // del evento. No es solo cosa de la interfaz — acá no se devuelven los
    // miembros, ni el tipo, ni la confirmación, así que la información deja de
    // viajar por la red. Se reabre sola si la respuesta vuelve a ser "sí".
    if (confirmation && confirmation.attending === false) {
      return json({ id: data.id, name: data.name, revoked: true, event: { titulo: ev.titulo, tipo: ev.tipo, slug: ev.slug } })
    }

    // cupos: los de la tarjeta (009) o, si hay más personas cargadas, las personas.
    const cupos = Math.max((data.cupos as number | null) ?? 0, members.length)
    return json({ id: data.id, name: data.name, numero: data.numero, cupos, invitation_type: data.invitation_type, members, confirmation, event })
  } catch (e) {
    return json({ error: 'internal_error' }, 500)
  }
})
