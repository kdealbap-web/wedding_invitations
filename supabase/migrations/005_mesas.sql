-- ══════════════════════════════════════════════════════════════════
--  Organización de mesas del salón
--  Ejecutar en: Supabase Dashboard → SQL Editor
--
--  Angely arma las mesas desde /admin/mesas arrastrando personas. Hacía
--  falta dónde guardar eso.
--
--  Decisiones:
--  · Se sienta a la PERSONA, no a la tarjeta. Una familia de cuatro puede
--    repartirse entre dos mesas, y eso pasa siempre con los niños.
--  · Pero hay tarjetas sin `guest_members` cargados: existen y ocupan
--    sitio aunque no sepamos los nombres. Por eso `asientos.member_id`
--    admite NULL y entonces manda `etiqueta` — son las «plazas sin
--    nombre», que se cuentan igual para la capacidad de la mesa.
--  · `guest_id` va SIEMPRE, incluso con member_id lleno. Es redundante a
--    propósito: permite pintar la mesa agrupada por tarjeta y avisar de
--    familias partidas sin unir tres tablas en cada consulta.
--  · El índice único sobre member_id impide que una persona con nombre
--    quede sentada en dos mesas. Las plazas sin nombre no lo llevan
--    porque una misma tarjeta puede aportar varias.
--  · NO se restringe la capacidad en la base. Sobrepasar una mesa por un
--    rato mientras se reacomoda es normal; el panel lo marca en rojo y
--    ya. Un CHECK aquí solo estorbaría.
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. mesas
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mesas (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT        NOT NULL,
  capacidad  INT         NOT NULL DEFAULT 8 CHECK (capacidad BETWEEN 1 AND 30),
  orden      INT         NOT NULL DEFAULT 0,      -- para ordenarlas en el tablero
  notas      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. asientos — una fila por persona sentada
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asientos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id    UUID        NOT NULL REFERENCES mesas(id)         ON DELETE CASCADE,
  guest_id   UUID        NOT NULL REFERENCES guests(id)        ON DELETE CASCADE,
  member_id  UUID                 REFERENCES guest_members(id) ON DELETE CASCADE,
  etiqueta   TEXT,                                  -- solo cuando member_id es NULL
  orden      INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Sin nombre propio hay que poner al menos una etiqueta legible
  CONSTRAINT asiento_identificable CHECK (member_id IS NOT NULL OR etiqueta IS NOT NULL)
);

-- ─────────────────────────────────────────────
-- Índices
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_asientos_mesa  ON asientos(mesa_id);
CREATE INDEX IF NOT EXISTS idx_asientos_guest ON asientos(guest_id);

-- Una persona con nombre se sienta en una sola mesa. Las plazas sin nombre
-- quedan fuera del índice porque una tarjeta puede aportar varias.
CREATE UNIQUE INDEX IF NOT EXISTS idx_asientos_member_unico
  ON asientos(member_id) WHERE member_id IS NOT NULL;

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
-- Mismo criterio que el resto del esquema: el panel (authenticated) accede a
-- todo; el invitado (anon) no toca estas tablas nunca.
ALTER TABLE mesas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE asientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_mesas"    ON mesas    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_asientos" ON asientos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- Vista del tablero
-- ─────────────────────────────────────────────
-- COUNT(DISTINCT a.id) por la misma razón que en guest_summary: unir varias
-- tablas en la misma consulta multiplica filas y sin DISTINCT los conteos se
-- inflan. Ver 002_fix_guest_summary_counts.sql.
DROP VIEW IF EXISTS mesa_summary;
CREATE VIEW mesa_summary AS
SELECT
  m.id,
  m.nombre,
  m.capacidad,
  m.orden,
  m.notas,
  COUNT(DISTINCT a.id)                          AS ocupados,
  m.capacidad - COUNT(DISTINCT a.id)            AS libres,
  COUNT(DISTINCT a.guest_id)                    AS tarjetas
FROM mesas m
LEFT JOIN asientos a ON a.mesa_id = m.id
GROUP BY m.id, m.nombre, m.capacidad, m.orden, m.notas;

-- Expone solo agregados, ningún token, pero se fijan permisos igual por
-- coherencia con guest_summary.
REVOKE ALL ON mesa_summary FROM anon;
GRANT SELECT ON mesa_summary TO authenticated, service_role;
