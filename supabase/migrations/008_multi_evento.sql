-- ══════════════════════════════════════════════════════════════════
--  008 — De una boda a una plataforma de eventos
--
--  La boda de Angely & Kevin (12·IX·2026) salió bien y el mismo sistema
--  pasa a servir invitaciones de cualquier evento desde
--  invitation.kdealbap.com. Este cambio:
--
--  1. Crea `events`: una fila por evento, con su estado y su `config`
--     (textos, lugar, vestuario, colores…) en JSON. Lo que en la boda
--     estaba escrito en los componentes ahora vive aquí.
--  2. Cuelga `guests` y `mesas` de un evento (`event_id`). Todo lo que
--     ya existe se asigna a la boda, que queda ARCHIVADA.
--  3. Los tipos de invitación dejan de ser un CHECK fijo
--     ('completa','recepcion') y pasan a ser una lista por evento
--     (`events.invitation_types`): la boda tiene completa/recepcion y
--     un XV tiene adultos/jovenes. Un trigger valida contra esa lista.
--  4. Rehace `guest_summary` y `mesa_summary` con `event_id` para que
--     el panel filtre por evento. Se conservan los COUNT(DISTINCT …)
--     de la 002 y los permisos de la 004: la vista expone tokens y
--     `anon` NO debe poder leerla nunca.
--
--  Estado del evento y qué pasa con sus links (lo aplica get-invitation):
--    borrador   → el link abre en modo vista previa, el RSVP no se acepta
--    activo     → el link funciona y se puede confirmar
--    cerrado    → el link muestra «este evento ya no recibe respuestas»
--    archivado  → igual que cerrado; el evento ya pasó
--
--  Idempotente: se puede correr dos veces.
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. events
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT        UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  tipo              TEXT        NOT NULL
                    CHECK (tipo IN ('boda','xv','cumpleanos','bautizo','grado','corporativo','otro')),
  titulo            TEXT        NOT NULL,                 -- «Mis XV años · Mauren»
  fecha             TIMESTAMPTZ,                          -- inicio del evento (UTC)
  estado            TEXT        NOT NULL DEFAULT 'borrador'
                    CHECK (estado IN ('borrador','activo','cerrado','archivado')),
  -- [{ "key": "adultos", "label": "Adultos" }, …]  — la primera es la de defecto
  invitation_types  JSONB       NOT NULL DEFAULT '[{"key":"general","label":"General"}]'::jsonb
                    CHECK (jsonb_typeof(invitation_types) = 'array' AND jsonb_array_length(invitation_types) > 0),
  config            JSONB       NOT NULL DEFAULT '{}'::jsonb,
  rsvp_limite       DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_events" ON events;
CREATE POLICY "admin_all_events" ON events FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON events FROM anon;

CREATE OR REPLACE FUNCTION events_touch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_events_touch ON events;
CREATE TRIGGER trg_events_touch BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION events_touch();

-- ─────────────────────────────────────────────
-- 2. La boda: evento #1, archivado
-- ─────────────────────────────────────────────
INSERT INTO events (slug, tipo, titulo, fecha, estado, invitation_types, config, rsvp_limite)
VALUES (
  'boda-angely-kevin', 'boda', 'Angely & Kevin',
  '2026-09-12 23:30:00+00', 'archivado',
  '[{"key":"completa","label":"Ceremonia + recepción"},{"key":"recepcion","label":"Solo recepción"}]',
  '{"anfitrion":"Angely & Kevin","plantilla":"boda"}',
  '2026-08-12'
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- 3. El quinceañero de Mauren: el primer evento nuevo, en borrador
-- ─────────────────────────────────────────────
INSERT INTO events (slug, tipo, titulo, fecha, estado, invitation_types, config)
VALUES (
  'xv-mauren', 'xv', 'Mis XV años · Mauren',
  '2026-12-29 00:30:00+00',          -- 28·XII·2026, 7:30 p. m. en Barranquilla (UTC−5)
  'borrador',
  '[{"key":"adultos","label":"Adultos"},{"key":"jovenes","label":"Jóvenes"}]',
  $json${
    "plantilla": "xv",
    "anfitrion": "Mauren Obando Mendoza",
    "nombre_corto": "Mauren",
    "titulo": "Mis XV años",
    "mensaje": "Hay historias y personas que no voy a olvidar y recuerdos como este que siempre voy a guardar. Porque son parte de mi vida, es mi deseo que compartan conmigo ese día tan especial.",
    "hora_texto": "7:30 p. m.",
    "lugar": {
      "nombre": "Hotel El Prado",
      "salon": "Salón Magdalena",
      "direccion": "Carrera 54 # 70-10, Barrio El Prado, Barranquilla, Atlántico, Colombia",
      "maps": "https://maps.app.goo.gl/d9fLxgskFfupzrxd9"
    },
    "vestuario": {
      "etiqueta": "Etiqueta de gala",
      "caballeros": "Esmoquin negro",
      "damas": "Vestido largo"
    },
    "tonos_reservados": {
      "colores": [
        { "nombre": "Rosa",     "hex": "#E8A7B8" },
        { "nombre": "Oro rosa", "hex": "#B76E79" },
        { "nombre": "Dorado",   "hex": "#C9A24A" },
        { "nombre": "Beis",     "hex": "#D9C3A5" },
        { "nombre": "Marrón",   "hex": "#6B4A35" }
      ],
      "nota": "Agradecemos respetuosamente evitar estos tonos en su vestuario."
    },
    "restriccion": {
      "titulo": "Solo jóvenes y adultos",
      "texto": "Esperamos contar con su compañía. Les agradecemos tener presente que la celebración está dirigida a jóvenes y adultos."
    },
    "regalos": {
      "titulo": "Lluvia de sobres",
      "texto": "Tu presencia es mi mayor regalo. Si deseas tener un detalle adicional conmigo, agradeceré tu lluvia de sobres."
    },
    "cierre": "Será una noche inolvidable y me hará muy feliz compartirla contigo."
  }$json$::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- 4. guests y mesas cuelgan de un evento
-- ─────────────────────────────────────────────
ALTER TABLE guests ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE mesas  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

UPDATE guests SET event_id = (SELECT id FROM events WHERE slug = 'boda-angely-kevin') WHERE event_id IS NULL;
UPDATE mesas  SET event_id = (SELECT id FROM events WHERE slug = 'boda-angely-kevin') WHERE event_id IS NULL;

ALTER TABLE guests ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE mesas  ALTER COLUMN event_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guests_event ON guests(event_id);
CREATE INDEX IF NOT EXISTS idx_mesas_event  ON mesas(event_id);

-- ─────────────────────────────────────────────
-- 5. invitation_type: del CHECK fijo a la lista del evento
-- ─────────────────────────────────────────────
DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'guests'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%invitation_type%'
  LOOP
    EXECUTE format('ALTER TABLE guests DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION guests_valida_tipo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tipos JSONB;
BEGIN
  SELECT invitation_types INTO tipos FROM events WHERE id = NEW.event_id;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(tipos) t WHERE t->>'key' = NEW.invitation_type) THEN
    RAISE EXCEPTION 'invitation_type "%" no existe en el evento', NEW.invitation_type;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guests_valida_tipo ON guests;
CREATE TRIGGER trg_guests_valida_tipo BEFORE INSERT OR UPDATE OF invitation_type, event_id ON guests
  FOR EACH ROW EXECUTE FUNCTION guests_valida_tipo();

-- Una mesa y sus asientos tienen que ser del mismo evento que la tarjeta.
CREATE OR REPLACE FUNCTION asientos_mismo_evento() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT event_id FROM mesas WHERE id = NEW.mesa_id) IS DISTINCT FROM
     (SELECT event_id FROM guests WHERE id = NEW.guest_id) THEN
    RAISE EXCEPTION 'la mesa y la tarjeta son de eventos distintos';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_asientos_mismo_evento ON asientos;
CREATE TRIGGER trg_asientos_mismo_evento BEFORE INSERT OR UPDATE OF mesa_id, guest_id ON asientos
  FOR EACH ROW EXECUTE FUNCTION asientos_mismo_evento();

-- ─────────────────────────────────────────────
-- 6. guest_summary con event_id (DROP + CREATE: cambia columnas)
-- ─────────────────────────────────────────────
DROP VIEW IF EXISTS guest_summary;
CREATE VIEW guest_summary AS
SELECT
  g.id,
  g.event_id,
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

-- ─────────────────────────────────────────────
-- 7. mesa_summary con event_id
-- ─────────────────────────────────────────────
DROP VIEW IF EXISTS mesa_summary;
CREATE VIEW mesa_summary AS
SELECT
  m.id,
  m.event_id,
  m.nombre,
  m.capacidad,
  m.orden,
  m.fila,
  m.col,
  m.notas,
  m.capitan_id,
  cap.name                                      AS capitan,
  COUNT(DISTINCT a.id)                          AS ocupados,
  m.capacidad - COUNT(DISTINCT a.id)            AS libres,
  COUNT(DISTINCT a.guest_id)                    AS tarjetas
FROM mesas m
LEFT JOIN asientos      a   ON a.mesa_id = m.id
LEFT JOIN guest_members cap ON cap.id    = m.capitan_id
GROUP BY m.id, m.event_id, m.nombre, m.capacidad, m.orden, m.fila, m.col, m.notas, m.capitan_id, cap.name;

REVOKE ALL ON mesa_summary FROM anon;
GRANT SELECT ON mesa_summary TO authenticated, service_role;

-- ─────────────────────────────────────────────
-- 8. event_summary — lo que lista el panel global
-- ─────────────────────────────────────────────
DROP VIEW IF EXISTS event_summary;
CREATE VIEW event_summary AS
SELECT
  e.*,
  COUNT(DISTINCT g.id)                                        AS tarjetas,
  COUNT(DISTINCT gm.id)                                       AS cupos,
  COUNT(DISTINCT c.guest_id) FILTER (WHERE c.attending)       AS tarjetas_si,
  COUNT(DISTINCT c.guest_id) FILTER (WHERE NOT c.attending)   AS tarjetas_no,
  COUNT(DISTINCT iv.id)                                       AS vistas
FROM events e
LEFT JOIN guests g            ON g.event_id = e.id
LEFT JOIN guest_members gm    ON gm.guest_id = g.id
LEFT JOIN confirmations c     ON c.guest_id  = g.id
LEFT JOIN invitation_views iv ON iv.guest_id = g.id
GROUP BY e.id;

REVOKE ALL ON event_summary FROM anon;
GRANT SELECT ON event_summary TO authenticated, service_role;
