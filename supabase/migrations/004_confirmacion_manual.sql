-- ══════════════════════════════════════════════════════════════════
--  Confirmación manual (telefónica) + seguimiento de contacto
--  Ejecutar en: Supabase Dashboard → SQL Editor
--
--  La wedding llama al número de cada tarjeta para confirmar cupos.
--  Necesita dos cosas que el esquema no tenía:
--    (a) registrar la respuesta desde el panel, sin depender de que el
--        invitado abra su link — antes la única vía era submit-rsvp;
--    (b) saber a quién ya contactó y a quién no.
--
--  Decisiones:
--  · El seguimiento de la llamada vive en `guests`, no en
--    `confirmations`: es un atributo de la tarjeta y existe desde antes
--    de que haya respuesta alguna (una tarjeta puede estar "contactada"
--    y seguir sin confirmar).
--  · La confirmación telefónica NO es un contador aparte: escribe una
--    fila real en `confirmations` con source='admin'. Así los conteos,
--    los badges y guest_summary conservan una sola fuente de verdad y
--    re-confirmar sigue siendo idempotente.
--  · `attending_total` permite registrar "vienen 3" cuando la tarjeta
--    no tiene nombres en guest_members y no hay a quién marcar.
-- ══════════════════════════════════════════════════════════════════

-- Las tablas de 001 se crearon sin cualificar el esquema, así que viven en
-- `public`. Si la sesión abre sin `public` en el search_path, todo el script
-- falla con «relation "guests" does not exist»; lo fijamos explícito.
SET search_path = public;

-- ─────────────────────────────────────────────
-- 1. guests — seguimiento de la llamada
-- ─────────────────────────────────────────────
ALTER TABLE guests ADD COLUMN IF NOT EXISTS contact_status   TEXT     NOT NULL DEFAULT 'pendiente';
ALTER TABLE guests ADD COLUMN IF NOT EXISTS contacted_at     TIMESTAMPTZ;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS contact_attempts SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS contact_notes    TEXT;

-- pendiente    → nadie la ha llamado todavía
-- no_contesta  → se intentó y no hubo respuesta (contact_attempts cuenta los intentos)
-- contactado   → se habló con ellos (la respuesta, si la dieron, está en confirmations)
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_contact_status_check;
ALTER TABLE guests ADD  CONSTRAINT guests_contact_status_check
  CHECK (contact_status IN ('pendiente','no_contesta','contactado'));

-- ─────────────────────────────────────────────
-- 2. confirmations — de dónde vino la respuesta
-- ─────────────────────────────────────────────
-- Las filas que ya existen entraron todas por el link del invitado, así
-- que el DEFAULT 'guest' las clasifica correctamente sin backfill.
ALTER TABLE confirmations ADD COLUMN IF NOT EXISTS source          TEXT NOT NULL DEFAULT 'guest';
ALTER TABLE confirmations ADD COLUMN IF NOT EXISTS attending_total SMALLINT;
ALTER TABLE confirmations ADD COLUMN IF NOT EXISTS registered_by   TEXT;

ALTER TABLE confirmations DROP CONSTRAINT IF EXISTS confirmations_source_check;
ALTER TABLE confirmations ADD  CONSTRAINT confirmations_source_check
  CHECK (source IN ('guest','admin'));

ALTER TABLE confirmations DROP CONSTRAINT IF EXISTS confirmations_attending_total_check;
ALTER TABLE confirmations ADD  CONSTRAINT confirmations_attending_total_check
  CHECK (attending_total IS NULL OR attending_total BETWEEN 0 AND 50);

-- ─────────────────────────────────────────────
-- 3. guest_summary
-- ─────────────────────────────────────────────
-- Se hace DROP + CREATE (no CREATE OR REPLACE) porque las columnas
-- nuevas van intercaladas, y REPLACE solo admite añadir al final.
DROP VIEW IF EXISTS guest_summary;

CREATE VIEW guest_summary AS
SELECT
  g.id,
  g.token,
  g.name                                          AS group_name,
  g.invitation_type,
  g.whatsapp,
  g.notes,
  g.contact_status,
  g.contacted_at,
  g.contact_attempts,
  g.contact_notes,
  COUNT(DISTINCT gm.id)                           AS total_members,
  c.attending,
  c.confirmed_at,
  c.source                                        AS confirmation_source,
  c.registered_by,
  -- Personas que asisten. attending_total (tecleado en una llamada)
  -- manda sobre el conteo de nombres marcados, porque puede incluir
  -- acompañantes que no están cargados en guest_members.
  -- Si no hay ninguno de los dos el resultado es 0 A PROPÓSITO: el panel
  -- marca esa tarjeta como "confirmada sin asistentes" para que la
  -- wedding la resuelva, en vez de inflar el total asumiendo sus cupos.
  CASE WHEN c.attending
       THEN COALESCE(c.attending_total, COUNT(DISTINCT cm.member_id))
       ELSE 0
  END                                             AS attending_count,
  COUNT(DISTINCT iv.id)                           AS view_count,
  MAX(iv.viewed_at)                               AS last_viewed_at
FROM guests g
LEFT JOIN guest_members gm        ON gm.guest_id       = g.id
LEFT JOIN confirmations c         ON c.guest_id        = g.id
LEFT JOIN confirmation_members cm ON cm.confirmation_id = c.id
LEFT JOIN invitation_views iv     ON iv.guest_id       = g.id
GROUP BY g.id, c.attending, c.confirmed_at, c.source, c.registered_by, c.attending_total;

-- La vista pertenece a postgres y NO lleva security_invoker, así que
-- lee las tablas base saltándose RLS. Como expone g.token (el link de
-- cada invitado), el rol anon no debe poder leerla nunca: el invitado
-- llega a sus datos solo por las Edge Functions.
REVOKE ALL ON guest_summary FROM anon;
GRANT SELECT ON guest_summary TO authenticated, service_role;
