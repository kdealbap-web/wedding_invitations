const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

async function call(fn, body) {
  const res = await fetch(`${BASE}/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data
}

export const getInvitation = (token) => call('get-invitation', { token })
export const submitRsvp    = (payload) => call('submit-rsvp', payload)
