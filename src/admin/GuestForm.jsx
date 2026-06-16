import { useState, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { supabase } from '../lib/supabase'

const EMPTY = { name: '', invitation_type: 'completa', whatsapp: '', notes: '', token: '', members: [''] }

export default function GuestForm({ guest, onClose, onSaved }) {
  const isEdit = Boolean(guest)
  const [form, setForm]     = useState(isEdit ? {
    name:            guest.name,
    invitation_type: guest.invitation_type,
    whatsapp:        guest.whatsapp || '',
    notes:           guest.notes || '',
    token:           guest.token,
    members:         guest.memberNames?.length ? guest.memberNames : [''],
  } : { ...EMPTY, token: nanoid(32) })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const setMember = (i, v) => {
    const arr = [...form.members]; arr[i] = v; set('members', arr)
  }
  const addMember    = () => set('members', [...form.members, ''])
  const removeMember = (i) => set('members', form.members.filter((_, j) => j !== i))

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const members = form.members.map(m => m.trim()).filter(Boolean)

      if (isEdit) {
        // Update guest
        const { error: gErr } = await supabase
          .from('guests')
          .update({ name: form.name.trim(), invitation_type: form.invitation_type, whatsapp: form.whatsapp.trim() || null, notes: form.notes.trim() || null })
          .eq('id', guest.id)
        if (gErr) throw gErr

        // Replace members
        await supabase.from('guest_members').delete().eq('guest_id', guest.id)
        if (members.length) {
          const { error: mErr } = await supabase.from('guest_members').insert(
            members.map((name, i) => ({ guest_id: guest.id, name, order_num: i + 1 }))
          )
          if (mErr) throw mErr
        }
      } else {
        // Insert guest
        const { data, error: gErr } = await supabase
          .from('guests')
          .insert({ name: form.name.trim(), invitation_type: form.invitation_type, token: form.token, whatsapp: form.whatsapp.trim() || null, notes: form.notes.trim() || null })
          .select('id')
          .single()
        if (gErr) throw gErr

        if (members.length) {
          const { error: mErr } = await supabase.from('guest_members').insert(
            members.map((name, i) => ({ guest_id: data.id, name, order_num: i + 1 }))
          )
          if (mErr) throw mErr
        }
      }

      onSaved()
    } catch (err) {
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal">
        <h3>{isEdit ? 'Editar invitado' : 'Nuevo invitado'}</h3>
        {error && <p className="adm-err" style={{ marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleSave}>
          <div className="adm-ff-row">
            <div className="adm-ff">
              <label>Nombre del grupo / tarjeta</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Familia García · Andrés y María"
                required
              />
            </div>
            <div className="adm-ff">
              <label>WhatsApp</label>
              <input
                value={form.whatsapp}
                onChange={e => set('whatsapp', e.target.value)}
                placeholder="573001234567"
              />
            </div>
          </div>

          <div className="adm-ff">
            <label>Tipo de invitación</label>
            <div className="adm-toggle">
              {[{ val: 'completa', lbl: 'Ceremonia + Recepción' }, { val: 'recepcion', lbl: 'Solo Recepción' }].map(o => (
                <label key={o.val} className={form.invitation_type === o.val ? 'on' : ''}>
                  <input type="radio" name="inv_type" checked={form.invitation_type === o.val} onChange={() => set('invitation_type', o.val)} />
                  {o.lbl}
                </label>
              ))}
            </div>
          </div>

          <div className="adm-ff">
            <label>Miembros de la invitación</label>
            <div className="adm-members">
              {form.members.map((m, i) => (
                <div key={i} className="adm-member-row">
                  <input
                    value={m}
                    onChange={e => setMember(i, e.target.value)}
                    placeholder={`Miembro ${i + 1}`}
                  />
                  {form.members.length > 1 && (
                    <button type="button" className="adm-ico red" title="Eliminar" onClick={() => removeMember(i)}>
                      <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="adm-add-member" onClick={addMember}>+ Agregar miembro</button>
            </div>
          </div>

          <div className="adm-ff">
            <label>Notas internas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Mesa preferida, alergias, etc." />
          </div>

          <div className="adm-ff">
            <label>Token de invitación</label>
            <div className="adm-token-row">
              <input value={form.token} readOnly />
              {!isEdit && (
                <button type="button" className="adm-ico" title="Regenerar" onClick={() => set('token', nanoid(32))}>
                  <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                </button>
              )}
            </div>
          </div>

          <div className="adm-modal-footer">
            <button type="button" className="adm-btn adm-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="adm-btn adm-btn-gold" disabled={saving}>
              {saving ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Crear invitado')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
