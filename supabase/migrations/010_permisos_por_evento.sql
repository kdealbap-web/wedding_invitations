-- ══════════════════════════════════════════════════════════════════
--  010 — Cada quien ve solo su evento
--
--  Hasta aquí cualquier usuario autenticado veía TODO (políticas
--  USING (true)), y las vistas del panel ni siquiera pasaban por RLS:
--  pertenecen a postgres y sin `security_invoker` leen como su dueño.
--  Con un solo evento daba igual; con clientes (el 15 de Mauren, la mamá
--  con su propio login) una familia vería los nombres y teléfonos de las
--  demás. Eso se cierra en la base, no en la interfaz.
--
--  · platform_admins — ven y crean todos los eventos (Kevin).
--  · event_admins    — ven y gestionan SOLO su evento: invitados, llamadas,
--                      mesas. No crean eventos ni cambian su estado/config.
--
--  Los permisos van por CORREO (verificado por Supabase Auth, se lee del JWT),
--  así un acceso se puede dejar listo antes de que la persona tenga cuenta.
--  Las Edge Functions usan service_role y no les afecta nada de esto.
--
--  Idempotente.
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS platform_admins (
  email      TEXT PRIMARY KEY CHECK (email = lower(email)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_admins (
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  email      TEXT NOT NULL CHECK (email = lower(email)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, email)
);
CREATE INDEX IF NOT EXISTS idx_event_admins_email ON event_admins(email);

-- ─── Funciones de permiso ───
-- SECURITY DEFINER para poder leer las tablas de admins sin abrirlas por RLS.
CREATE OR REPLACE FUNCTION es_admin_plataforma() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM platform_admins WHERE email = lower(auth.jwt()->>'email'))
$$;

CREATE OR REPLACE FUNCTION puede_ver_evento(ev UUID) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT es_admin_plataforma()
      OR EXISTS (SELECT 1 FROM event_admins WHERE event_id = ev AND email = lower(auth.jwt()->>'email'))
$$;

REVOKE ALL ON FUNCTION es_admin_plataforma(), puede_ver_evento(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION es_admin_plataforma(), puede_ver_evento(UUID) TO authenticated, service_role;

-- ─── Fuera las políticas abiertas ───
DROP POLICY IF EXISTS "admin_all_events"               ON events;
DROP POLICY IF EXISTS "admin_all_guests"               ON guests;
DROP POLICY IF EXISTS "admin_all_guest_members"        ON guest_members;
DROP POLICY IF EXISTS "admin_all_confirmations"        ON confirmations;
DROP POLICY IF EXISTS "admin_all_confirmation_members" ON confirmation_members;
DROP POLICY IF EXISTS "admin_read_views"               ON invitation_views;
DROP POLICY IF EXISTS "admin_all_mesas"                ON mesas;
DROP POLICY IF EXISTS "admin_all_asientos"             ON asientos;

-- events: el admin del evento lo LEE; crear, cambiar estado/config o borrar es de la plataforma.
DROP POLICY IF EXISTS "ev_select" ON events;
DROP POLICY IF EXISTS "ev_write"  ON events;
CREATE POLICY "ev_select" ON events FOR SELECT TO authenticated USING (puede_ver_evento(id));
CREATE POLICY "ev_write"  ON events FOR ALL    TO authenticated USING (es_admin_plataforma()) WITH CHECK (es_admin_plataforma());

DROP POLICY IF EXISTS "evento_guests" ON guests;
CREATE POLICY "evento_guests" ON guests FOR ALL TO authenticated
  USING (puede_ver_evento(event_id)) WITH CHECK (puede_ver_evento(event_id));

DROP POLICY IF EXISTS "evento_mesas" ON mesas;
CREATE POLICY "evento_mesas" ON mesas FOR ALL TO authenticated
  USING (puede_ver_evento(event_id)) WITH CHECK (puede_ver_evento(event_id));

DROP POLICY IF EXISTS "evento_guest_members" ON guest_members;
CREATE POLICY "evento_guest_members" ON guest_members FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM guests g WHERE g.id = guest_id AND puede_ver_evento(g.event_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM guests g WHERE g.id = guest_id AND puede_ver_evento(g.event_id)));

DROP POLICY IF EXISTS "evento_confirmations" ON confirmations;
CREATE POLICY "evento_confirmations" ON confirmations FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM guests g WHERE g.id = guest_id AND puede_ver_evento(g.event_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM guests g WHERE g.id = guest_id AND puede_ver_evento(g.event_id)));

DROP POLICY IF EXISTS "evento_confirmation_members" ON confirmation_members;
CREATE POLICY "evento_confirmation_members" ON confirmation_members FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM confirmations c JOIN guests g ON g.id = c.guest_id
                      WHERE c.id = confirmation_id AND puede_ver_evento(g.event_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM confirmations c JOIN guests g ON g.id = c.guest_id
                      WHERE c.id = confirmation_id AND puede_ver_evento(g.event_id)));

DROP POLICY IF EXISTS "evento_views" ON invitation_views;
CREATE POLICY "evento_views" ON invitation_views FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM guests g WHERE g.id = guest_id AND puede_ver_evento(g.event_id)));

DROP POLICY IF EXISTS "evento_asientos" ON asientos;
CREATE POLICY "evento_asientos" ON asientos FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM mesas m WHERE m.id = mesa_id AND puede_ver_evento(m.event_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM mesas m WHERE m.id = mesa_id AND puede_ver_evento(m.event_id)));

-- ─── Las tablas de admins: solo la plataforma las gestiona ───
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_admins    ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON platform_admins, event_admins FROM anon;
DROP POLICY IF EXISTS "pa_plataforma" ON platform_admins;
DROP POLICY IF EXISTS "ea_plataforma" ON event_admins;
DROP POLICY IF EXISTS "ea_propio"     ON event_admins;
CREATE POLICY "pa_plataforma" ON platform_admins FOR ALL TO authenticated
  USING (es_admin_plataforma()) WITH CHECK (es_admin_plataforma());
CREATE POLICY "ea_plataforma" ON event_admins FOR ALL TO authenticated
  USING (es_admin_plataforma()) WITH CHECK (es_admin_plataforma());
-- Cada admin ve sus propias filas: así el panel sabe a qué evento llevarlo.
CREATE POLICY "ea_propio" ON event_admins FOR SELECT TO authenticated
  USING (email = lower(auth.jwt()->>'email'));

-- ─── Las vistas pasan a leer con los permisos de quien consulta ───
-- Sin esto las vistas leen como postgres y se saltan todo lo de arriba.
ALTER VIEW guest_summary SET (security_invoker = on);
ALTER VIEW mesa_summary  SET (security_invoker = on);
ALTER VIEW event_summary SET (security_invoker = on);

-- ─── Quién es quién (5·XI·2026) ───
INSERT INTO platform_admins (email) VALUES ('kdealbap@gmail.com') ON CONFLICT DO NOTHING;

INSERT INTO event_admins (event_id, email)
SELECT e.id, x.email
FROM events e
JOIN (VALUES
  ('boda-angely-kevin', 'angelyacosta1011@gmail.com'),
  ('boda-angely-kevin', 'yulitzaorozcowedding@gmail.com'),
  ('xv-mauren',         'maye.obandom02@gmail.com')
) AS x(slug, email) ON x.slug = e.slug
ON CONFLICT DO NOTHING;
