-- ══════════════════════════════════════════════════════════════════
--  009 — Cupos y número de tarjeta sin inventar personas
--
--  La lista del XV de Mauren trae, por tarjeta, un nombre de grupo y sus
--  cupos — no los nombres de cada persona. Hasta ahora los cupos salían de
--  contar `guest_members`, así que había que inventar «Invitado 1…N» para que
--  una familia de 5 valiera 5. Eso ensucia el RSVP y la cola de nombres.
--
--  1. `guests.cupos`: los cupos de la tarjeta. Si hay más personas cargadas
--     que cupos, mandan las personas (GREATEST): nunca se pierde a nadie.
--  2. `guests.numero`: el número de la tarjeta según el orden de la lista
--     del cliente. El panel lo muestra con la inicial del tipo (A-07, J-03).
--  3. `guest_summary.total_members` pasa a ser ese GREATEST. Todo lo que ya
--     cuenta por `total_members` (cupos.js, el Excel, las «plazas sin nombre»
--     de las mesas) funciona sin cambios.
--  4. `event_summary.cupos` cuenta igual.
--
--  Idempotente.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE guests ADD COLUMN IF NOT EXISTS cupos  SMALLINT CHECK (cupos BETWEEN 1 AND 50);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS numero SMALLINT CHECK (numero > 0);

-- event_summary depende de las tablas, no de guest_summary, pero se rehace
-- igual para que cuente los cupos con la misma regla.
DROP VIEW IF EXISTS event_summary;
DROP VIEW IF EXISTS guest_summary;

CREATE VIEW guest_summary AS
SELECT
  g.id,
  g.event_id,
  g.token,
  g.numero,
  g.name                                          AS group_name,
  g.invitation_type,
  g.whatsapp,
  g.notes,
  g.contact_status,
  g.contacted_at,
  g.contact_attempts,
  g.contact_notes,
  g.cupos,
  GREATEST(COALESCE(g.cupos, 0), COUNT(DISTINCT gm.id))::int AS total_members,
  COUNT(DISTINCT gm.id)::int                      AS named_members,
  c.attending,
  c.confirmed_at,
  c.source                                        AS confirmation_source,
  c.registered_by,
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

REVOKE ALL ON guest_summary FROM anon;
GRANT SELECT ON guest_summary TO authenticated, service_role;

CREATE VIEW event_summary AS
SELECT
  e.*,
  COUNT(gs.id)                                         AS tarjetas,
  COALESCE(SUM(gs.total_members), 0)::int              AS cupos,
  COUNT(gs.id) FILTER (WHERE gs.attending)             AS tarjetas_si,
  COUNT(gs.id) FILTER (WHERE gs.attending = false)     AS tarjetas_no,
  COALESCE(SUM(gs.view_count), 0)::int                 AS vistas
FROM events e
LEFT JOIN guest_summary gs ON gs.event_id = e.id
GROUP BY e.id;

REVOKE ALL ON event_summary FROM anon;
GRANT SELECT ON event_summary TO authenticated, service_role;
