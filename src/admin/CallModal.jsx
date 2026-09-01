import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── Registro de una llamada de confirmación ───
// La wedding llama al número de la tarjeta y registra el resultado acá.
// Escribe una confirmación real (source='admin') para que los conteos del
// panel salgan de una sola fuente de verdad, y marca el estado de contacto
// en `guests` para saber a quién ya se llamó.

const MAX_TOTAL = 50

export default function CallModal({ row, onClose, onSaved }) {
  const [ready, setReady]         = useState(false)
  const [members, setMembers]     = useState([])
  const [confId, setConfId]       = useState(null)
  const [attending, setAttending] = useState(null)
  const [checked, setChecked]     = useState({})
  const [total, setTotal]         = useState('')
  const [touched, setTouched]     = useState(false)  // el total se auto-sincroniza hasta que lo teclean
  const [dietary, setDietary]     = useState('')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  // ─── Carga: miembros de la tarjeta + confirmación existente ───
  useEffect(() => {
    let alive = true
    const load = async () => {
      const { data, error: err } = await supabase
        .from('guests')
        .select('id, name, contact_notes, guest_members(id, name, order_num), confirmations(id, attending, attending_total, dietary_notes, source, confirmation_members(member_id))')
        .eq('id', row.id)
        .single()
      if (!alive) return
      if (err || !data) { setError('No se pudo cargar la tarjeta'); setReady(true); return }

      const mem = [...(data.guest_members || [])].sort((a, b) => a.order_num - b.order_num)

      // PostgREST devuelve `confirmations` como objeto por el UNIQUE en
      // guest_id, pero podría venir como arreglo. Normalizamos ambos.
      const raw  = data.confirmations
      const conf = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null)

      setMembers(mem)
      setNotes(data.contact_notes || '')

      if (conf) {
        const ids = new Set((conf.confirmation_members || []).map(cm => cm.member_id))
        // Las confirmaciones de la primera tanda (hasta el 3 de julio de 2026)
        // quedaron sin asistentes marcados porque las tarjetas todavía no
        // tenían nombres cargados. Ahí se pre-marcan todos: es la hipótesis
        // más probable —dijeron "sí asisto"— y la llamada la corrige.
        const preAll = conf.attending === true && ids.size === 0
        setConfId(conf.id)
        setAttending(conf.attending)
        setChecked(Object.fromEntries(mem.map(m => [m.id, preAll || ids.has(m.id)])))
        setDietary(conf.dietary_notes || '')
        if (conf.attending_total != null) { setTotal(String(conf.attending_total)); setTouched(true) }
      } else {
        // Sin respuesta previa: se asume que vienen todos y la wedding destilda
        setChecked(Object.fromEntries(mem.map(m => [m.id, true])))
      }
      setReady(true)
    }
    load()
    return () => { alive = false }
  }, [row.id])

  const checkedIds   = members.filter(m => checked[m.id]).map(m => m.id)
  const checkedCount = checkedIds.length

  // El total sigue a los checkboxes mientras nadie lo teclee a mano
  useEffect(() => {
    if (!touched && ready) setTotal(members.length ? String(checkedCount) : '')
  }, [checkedCount, touched, ready, members.length])

  const toggle = (id) => setChecked(p => ({ ...p, [id]: !p[id] }))

  const userEmail = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    return data?.user?.email || null
  }, [])

  // ─── Guardar la respuesta de la llamada ───
  const save = async () => {
    setError('')
    if (attending === null) return setError('Indica si asisten o no.')

    const n = parseInt(total, 10)
    if (attending) {
      if (!Number.isFinite(n) || n < 1) return setError('Indica cuántas personas asisten (mínimo 1).')
      if (n > MAX_TOTAL)                return setError('El total no puede pasar de ' + MAX_TOTAL + '.')
    }

    setSaving(true)
    try {
      const now = new Date().toISOString()

      // Upsert de la confirmación. song_request queda fuera del payload a
      // propósito: si el invitado ya pidió una canción por el link, la
      // llamada no debe borrársela.
      const { data: conf, error: cErr } = await supabase
        .from('confirmations')
        .upsert({
          guest_id:        row.id,
          attending,
          attending_total: attending ? n : null,
          dietary_notes:   dietary.trim() || null,
          source:          'admin',
          registered_by:   await userEmail(),
          confirmed_at:    now,
        }, { onConflict: 'guest_id' })
        .select('id')
        .single()
      if (cErr) throw cErr

      // Reemplazo completo de los asistentes marcados
      await supabase.from('confirmation_members').delete().eq('confirmation_id', conf.id)
      if (attending && checkedIds.length) {
        const { error: mErr } = await supabase.from('confirmation_members').insert(
          checkedIds.map(mid => ({ confirmation_id: conf.id, member_id: mid })),
        )
        if (mErr) throw mErr
      }

      const { error: gErr } = await supabase.from('guests').update({
        contact_status: 'contactado',
        contacted_at:   now,
        contact_notes:  notes.trim() || null,
      }).eq('id', row.id)
      if (gErr) throw gErr

      onSaved(attending
        ? row.group_name + ': ' + n + ' persona(s) confirmada(s)'
        : row.group_name + ': no asiste')
    } catch (e) {
      setError(e.message || 'Error al guardar')
      setSaving(false)
    }
  }

  // ─── No contestó: solo suma un intento, no toca la confirmación ───
  const noAnswer = async () => {
    setError('')
    setSaving(true)
    const attempts = (row.contact_attempts || 0) + 1
    try {
      const { error: gErr } = await supabase.from('guests').update({
        contact_status:   'no_contesta',
        contacted_at:     new Date().toISOString(),
        contact_attempts: attempts,
        contact_notes:    notes.trim() || null,
      }).eq('id', row.id)
      if (gErr) throw gErr
      onSaved(row.group_name + ': intento ' + attempts + ' sin respuesta')
    } catch (e) {
      setError(e.message || 'Error al guardar')
      setSaving(false)
    }
  }

  // ─── Deshacer una confirmación registrada por error ───
  const clearConf = async () => {
    if (!confirm('¿Borrar la confirmación de "' + row.group_name + '"? La tarjeta vuelve a quedar sin responder.')) return
    setSaving(true)
    try {
      const { error: dErr } = await supabase.from('confirmations').delete().eq('guest_id', row.id)
      if (dErr) throw dErr
      onSaved('Confirmación de ' + row.group_name + ' borrada')
    } catch (e) {
      setError(e.message || 'Error al borrar')
      setSaving(false)
    }
  }

  const cupos   = members.length || (row.total_members ?? 0)
  const extras  = Math.max(0, (parseInt(total, 10) || 0) - checkedCount)
  const telHref = 'tel:+' + (row.whatsapp || '').replace(/\D/g, '')

  return (
    <div className="adm-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal" style={{ maxWidth: 520 }}>
        <h3>Registrar llamada</h3>

        <div className="adm-call-who">
          <div>
            <div className="adm-call-name">{row.group_name}</div>
            <div className="adm-call-meta">
              {cupos} {cupos === 1 ? 'cupo' : 'cupos'}
              {row.whatsapp ? ' · ' + row.whatsapp : ''}
              {row.contact_attempts > 0 ? ' · ' + row.contact_attempts + ' intento(s)' : ''}
            </div>
          </div>
          {row.whatsapp && (
            <a className="adm-btn adm-btn-ghost" href={telHref}>
              <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Llamar
            </a>
          )}
        </div>

        {error && <p className="adm-err" style={{ marginBottom: '1rem' }}>{error}</p>}

        {!ready ? (
          <p style={{ color: '#475569', fontSize: '.85rem', padding: '1rem 0' }}>Cargando…</p>
        ) : (
          <>
            {/* ¿Asisten? */}
            <div className="adm-ff">
              <label>¿Asisten?</label>
              <div className="adm-toggle">
                {[{ val: true, lbl: 'Sí asiste' }, { val: false, lbl: 'No asiste' }].map(o => (
                  <label key={String(o.val)} className={attending === o.val ? 'on' : ''}>
                    <input type="radio" name="call_att" checked={attending === o.val} onChange={() => setAttending(o.val)} />
                    {o.lbl}
                  </label>
                ))}
              </div>
            </div>

            {attending === true && (
              <>
                {/* Quiénes asisten */}
                {members.length > 0 ? (
                  <div className="adm-ff">
                    <label>¿Quiénes? · destilda a quien no vaya</label>
                    <div className="adm-call-members">
                      {members.map(m => (
                        <label key={m.id} className={`adm-call-chk${checked[m.id] ? ' on' : ''}`}>
                          <input type="checkbox" checked={!!checked[m.id]} onChange={() => toggle(m.id)} />
                          <span className="adm-call-box">{checked[m.id] ? '✓' : ''}</span>
                          {m.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="adm-call-hint">
                    Esta tarjeta no tiene nombres cargados, así que no hay a quién marcar.
                    Registra cuántas personas asisten y, si te dieron los nombres, agrégalos
                    después con el botón <b>Editar</b> de la fila.
                  </p>
                )}

                {/* Total */}
                <div className="adm-ff">
                  <label>Total que asisten</label>
                  <div className="adm-call-total">
                    <input
                      type="number" min="1" max={MAX_TOTAL}
                      value={total}
                      onChange={e => { setTouched(true); setTotal(e.target.value) }}
                    />
                    {members.length > 0 && (
                      touched && String(checkedCount) !== total
                        ? <span className="adm-call-total-note warn">{checkedCount} marcado(s) · {extras} acompañante(s) sin nombre</span>
                        : <span className="adm-call-total-note">sigue a los nombres marcados</span>
                    )}
                  </div>
                </div>

                <div className="adm-ff">
                  <label>Restricción alimentaria</label>
                  <input value={dietary} onChange={e => setDietary(e.target.value)} placeholder="Ninguna" />
                </div>
              </>
            )}

            {/* Nota de la llamada */}
            <div className="adm-ff">
              <label>Nota de la llamada</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Confirmó por WhatsApp · volver a llamar después de las 6pm · viene con su hija"
                style={{ minHeight: 56 }}
              />
            </div>

            <div className="adm-call-actions">
              <button type="button" className="adm-btn adm-btn-ghost" onClick={noAnswer} disabled={saving}>
                <svg viewBox="0 0 24 24"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
                No contestó
              </button>
              {confId && (
                <button type="button" className="adm-btn adm-btn-red" onClick={clearConf} disabled={saving}>
                  Borrar confirmación
                </button>
              )}
              <div className="adm-call-spacer" />
              <button type="button" className="adm-btn adm-btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
              <button type="button" className="adm-btn adm-btn-gold" onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar respuesta'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
