-- ══════════════════════════════════════════════════════════════════
--  011 — El admin del evento edita los textos de su invitación
--
--  En la 010 solo la plataforma podía tocar `events`, y Mayerlis (admin del
--  15 de Mauren) no podía cambiar ni una frase: el UPDATE pasaba 0 filas.
--  Ahora el admin de un evento puede actualizar SU evento, pero un trigger
--  le impide tocar lo que rompe links o publica: slug, tipo, estado, fecha,
--  tipos de invitación, y en el config la plantilla y el subdominio.
--  Crear y borrar eventos sigue siendo solo de la plataforma.
--
--  Idempotente.
-- ══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "ev_update_evento" ON events;
CREATE POLICY "ev_update_evento" ON events FOR UPDATE TO authenticated
  USING (puede_ver_evento(id)) WITH CHECK (puede_ver_evento(id));

CREATE OR REPLACE FUNCTION events_protege_campos() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Sin usuario (service_role, SQL Editor) o admin de plataforma: sin límites.
  IF auth.uid() IS NULL OR es_admin_plataforma() THEN RETURN NEW; END IF;
  IF NEW.slug             IS DISTINCT FROM OLD.slug
  OR NEW.tipo             IS DISTINCT FROM OLD.tipo
  OR NEW.estado           IS DISTINCT FROM OLD.estado
  OR NEW.fecha            IS DISTINCT FROM OLD.fecha
  OR NEW.invitation_types IS DISTINCT FROM OLD.invitation_types
  OR NEW.config->'plantilla'  IS DISTINCT FROM OLD.config->'plantilla'
  OR NEW.config->'subdominio' IS DISTINCT FROM OLD.config->'subdominio' THEN
    RAISE EXCEPTION 'Solo la plataforma puede cambiar slug, tipo, estado, fecha, tipos de invitación, plantilla o subdominio. Los textos sí se pueden editar.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS events_protege_campos ON events;
CREATE TRIGGER events_protege_campos BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION events_protege_campos();
