-- ══════════════════════════════════════════════════════════════════
--  FIX · guest_summary contaba de más (producto cartesiano)
--  Ejecutar en: Supabase Dashboard → SQL Editor
--
--  Problema: al unir guest_members (N filas) y confirmation_members (M
--  filas) en la misma consulta se generan N×M filas, y COUNT(gm.id) /
--  COUNT(cm.member_id) se inflaban a N×M (p.ej. familia de 4 → 16).
--  Solución: COUNT(DISTINCT ...).
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW guest_summary AS
SELECT
  g.id,
  g.token,
  g.name                                         AS group_name,
  g.invitation_type,
  g.whatsapp,
  g.notes,
  COUNT(DISTINCT gm.id)                           AS total_members,
  c.attending,
  c.confirmed_at,
  COUNT(DISTINCT cm.member_id)                    AS attending_count
FROM guests g
LEFT JOIN guest_members gm        ON gm.guest_id      = g.id
LEFT JOIN confirmations c         ON c.guest_id        = g.id
LEFT JOIN confirmation_members cm ON cm.confirmation_id = c.id
GROUP BY g.id, c.attending, c.confirmed_at;
