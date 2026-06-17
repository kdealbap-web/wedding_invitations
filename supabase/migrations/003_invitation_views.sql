-- ══════════════════════════════════════════════════════════════════
--  Tracking de visitas a la invitación
--  Ejecutar en: Supabase Dashboard → SQL Editor
--
--  Cada apertura de una invitación inserta una fila aquí (desde la Edge
--  Function get-invitation, con service_role). El panel usa view_count y
--  last_viewed_at de guest_summary para saber quién ya la vio.
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS invitation_views (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id  UUID        NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitation_views_gid ON invitation_views(guest_id);

ALTER TABLE invitation_views ENABLE ROW LEVEL SECURITY;

-- El admin (authenticated) puede leer las visitas para el dashboard.
-- service_role (Edge Function) inserta y bypassa RLS. anon: sin acceso.
DROP POLICY IF EXISTS "admin_read_views" ON invitation_views;
CREATE POLICY "admin_read_views" ON invitation_views FOR SELECT TO authenticated USING (true);

-- ─────────────────────────────────────────────
-- guest_summary + conteo de visitas
-- (COUNT(DISTINCT ...) y MAX(...) son seguros ante el producto cartesiano)
-- ─────────────────────────────────────────────
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
  COUNT(DISTINCT cm.member_id)                    AS attending_count,
  COUNT(DISTINCT iv.id)                           AS view_count,
  MAX(iv.viewed_at)                               AS last_viewed_at
FROM guests g
LEFT JOIN guest_members gm        ON gm.guest_id       = g.id
LEFT JOIN confirmations c         ON c.guest_id        = g.id
LEFT JOIN confirmation_members cm ON cm.confirmation_id = c.id
LEFT JOIN invitation_views iv     ON iv.guest_id       = g.id
GROUP BY g.id, c.attending, c.confirmed_at;
