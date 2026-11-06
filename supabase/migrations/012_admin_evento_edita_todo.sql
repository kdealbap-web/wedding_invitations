-- ══════════════════════════════════════════════════════════════════
--  012 — El admin del evento edita TODO su evento
--
--  La 011 le dejaba solo los textos; Kevin decidió que el admin del evento
--  (Mayerlis en el 15 de Mauren) cambie cualquier cosa del suyo: estado,
--  fecha, plantilla, tipos… Se quita el trigger que lo impedía. La política
--  ev_update_evento (011) sigue limitando el UPDATE a su propio evento, y
--  crear o borrar eventos sigue siendo solo de la plataforma (ev_write).
--
--  Idempotente.
-- ══════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS events_protege_campos ON events;
DROP FUNCTION IF EXISTS events_protege_campos();
