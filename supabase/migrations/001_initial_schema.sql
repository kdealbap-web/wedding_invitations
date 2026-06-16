-- ══════════════════════════════════════════════════════════════════
--  BODA ANGELY & KEVIN — Schema inicial (3NF)
--  Ejecutar en: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- Habilitar extensión para tokens aleatorios
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────
-- 1. guests — una fila por sobre/tarjeta
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token            TEXT        UNIQUE NOT NULL,            -- 32 chars, va en ?t= de la URL
  name             TEXT        NOT NULL,                   -- nombre del grupo / cabeza de familia
  invitation_type  TEXT        NOT NULL
                   CHECK (invitation_type IN ('completa','recepcion')),
  whatsapp         TEXT,                                   -- ej: 573001234567
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 2. guest_members — miembros de cada tarjeta
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guest_members (
  id         UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id   UUID     NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  name       TEXT     NOT NULL,
  order_num  SMALLINT NOT NULL,
  UNIQUE (guest_id, order_num)
);

-- ─────────────────────────────────────────────
-- 3. confirmations — una por tarjeta (UNIQUE guest_id)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS confirmations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id        UUID        UNIQUE NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  attending       BOOLEAN     NOT NULL,
  dietary_notes   TEXT,
  song_request    TEXT,
  confirmed_at    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 4. confirmation_members — qué miembros asisten
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS confirmation_members (
  confirmation_id UUID NOT NULL REFERENCES confirmations(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES guest_members(id) ON DELETE CASCADE,
  PRIMARY KEY (confirmation_id, member_id)
);

-- ─────────────────────────────────────────────
-- Índices
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_guests_token       ON guests(token);
CREATE INDEX IF NOT EXISTS idx_guest_members_gid  ON guest_members(guest_id);
CREATE INDEX IF NOT EXISTS idx_confirmations_gid  ON confirmations(guest_id);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
ALTER TABLE guests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmation_members ENABLE ROW LEVEL SECURITY;

-- service_role (Edge Functions) → bypasses RLS, full access siempre.
-- authenticated (admin logueado en el dashboard) → acceso completo via RLS.
-- anon (invitado público) → CERO acceso directo; solo puede llamar Edge Functions.

CREATE POLICY "admin_all_guests"              ON guests              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_guest_members"       ON guest_members       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_confirmations"       ON confirmations       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_confirmation_members" ON confirmation_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- Vista útil para el dashboard de admin
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW guest_summary AS
SELECT
  g.id,
  g.token,
  g.name                                         AS group_name,
  g.invitation_type,
  g.whatsapp,
  g.notes,
  COUNT(gm.id)                                   AS total_members,
  c.attending,
  c.confirmed_at,
  COUNT(cm.member_id)                            AS attending_count
FROM guests g
LEFT JOIN guest_members gm        ON gm.guest_id      = g.id
LEFT JOIN confirmations c         ON c.guest_id        = g.id
LEFT JOIN confirmation_members cm ON cm.confirmation_id = c.id
GROUP BY g.id, c.attending, c.confirmed_at;
