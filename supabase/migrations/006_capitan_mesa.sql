-- ══════════════════════════════════════════════════════════════════
--  Capitán de mesa
--  Ejecutar en: Supabase Dashboard → SQL Editor
--
--  El día de la fiesta cada mesa tiene un capitán: la persona a la que el
--  salón y la wedding le hablan cuando hay que coordinar algo —servir, el
--  brindis, mover a alguien—. Hasta hoy eso vivía en la cabeza de Angely.
--
--  Decisiones:
--  · Es un atributo de la MESA, no de la persona. Una mesa tiene un capitán;
--    nadie es «capitán» en abstracto. Por eso va como columna de `mesas` y
--    no como bandera en `asientos`.
--  · Apunta a `guest_members` y no a `asientos`. Mover a alguien de mesa
--    borra su asiento y crea otro, así que un capitán atado al asiento se
--    perdería en cada arrastre. Atado a la persona sobrevive al movimiento,
--    y si acaba en otra mesa el panel lo marca en vez de borrarlo solo.
--  · ON DELETE SET NULL: si se borra a la persona, la mesa se queda sin
--    capitán. Lo contrario —arrastrar la mesa— sería absurdo.
--  · Una «plaza sin nombre» NO puede ser capitana: no hay a quién avisarle.
--    Se garantiza solo, porque la referencia es a guest_members.
--  · NO se valida en la base que el capitán esté sentado en su mesa. Mismo
--    criterio que la capacidad en 005: mientras se reacomoda es normal, y un
--    trigger aquí solo estorbaría. El panel lo marca en ámbar.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE mesas
  ADD COLUMN IF NOT EXISTS capitan_id UUID REFERENCES guest_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mesas_capitan
  ON mesas(capitan_id) WHERE capitan_id IS NOT NULL;

-- ─────────────────────────────────────────────
-- La vista, con el nombre ya resuelto
-- ─────────────────────────────────────────────
-- DROP + CREATE y no CREATE OR REPLACE: igual que en guest_summary, el
-- REPLACE solo admite añadir columnas al final y aquí conviene que
-- `capitan` quede junto a `capitan_id`.
--
-- COUNT(DISTINCT …) se conserva de 005: unir asientos con otra tabla en la
-- misma consulta multiplica filas, y sin DISTINCT los conteos se inflan.
DROP VIEW IF EXISTS mesa_summary;
CREATE VIEW mesa_summary AS
SELECT
  m.id,
  m.nombre,
  m.capacidad,
  m.orden,
  m.notas,
  m.capitan_id,
  cap.name                                      AS capitan,
  COUNT(DISTINCT a.id)                          AS ocupados,
  m.capacidad - COUNT(DISTINCT a.id)            AS libres,
  COUNT(DISTINCT a.guest_id)                    AS tarjetas
FROM mesas m
LEFT JOIN asientos      a   ON a.mesa_id = m.id
LEFT JOIN guest_members cap ON cap.id    = m.capitan_id
GROUP BY m.id, m.nombre, m.capacidad, m.orden, m.notas, m.capitan_id, cap.name;

-- Expone nombres de invitados, así que se fijan los permisos explícitamente:
-- `anon` no debe poder leerla nunca.
REVOKE ALL ON mesa_summary FROM anon;
GRANT SELECT ON mesa_summary TO authenticated, service_role;
