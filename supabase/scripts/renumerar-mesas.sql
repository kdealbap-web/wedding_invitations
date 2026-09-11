-- ══════════════════════════════════════════════════════════════════
--  Renumerar las mesas del salón
--  Ejecutar en: Supabase Dashboard → SQL Editor, un PASO por vez
--
--  EL CAMINO CORRIENTE ES EL PANEL: /admin/mesas → «Renumerar». Valida en
--  vivo, enseña qué cambia y escribe lo mismo que esto. Este archivo queda
--  para un cambio masivo preparado de antemano, o para cuando no hay panel
--  a mano. Se aplica con supabase/scripts/renumerar-mesas.mjs, que lee el
--  mapeo de aquí abajo, o pegando el PASO 2 en el SQL Editor.
--
--  El reparto físico del salón cambió y las mesas quedaron con otro
--  número: la que era la 6 ahora es la 2, y así. Renumerar cambia dos cosas
--  y ninguna es el sitio de la mesa:
--
--  · El NOMBRE, que es la etiqueta. Desde la migración 007 el sitio en el
--    plano vive en `mesas.fila` y `mesas.col` y se arrastra en el panel, así
--    que renumerar ya NO mueve nada de sitio.
--  · El `orden`, que sí importa: los tres consumidores —el panel, el Excel y
--    las imágenes— listan por ahí, no por nombre. Renumerar sin tocarlo deja
--    el Excel y las hojas de mesa en la secuencia vieja.
--
--  NO es una migración: no es esquema, es un dato del mundo real, y
--  aplicar una permutación dos veces da un resultado distinto —así que no
--  se puede replayear como el resto de supabase/migrations/.
--
--  Lo que NO se mueve: `asientos` apunta a `mesas.id` (UUID) y
--  `capitan_id` a `guest_members`. Nadie se levanta de su silla ni pierde
--  su capitán; cambia la etiqueta y el orden, nada más.
-- ══════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════
--  PASO 0 — ¿Está aplicada la 006?  (correr solo este bloque)
-- ══════════════════════════════════════════════════════════════════
-- Los pasos 1 y 3 leen `capitan`, que la trae 006_capitan_mesa.sql. Si esa
-- migración todavía no se aplicó, esas consultas fallan con «column does not
-- exist» — no el PASO 2, que no toca capitanes y se puede correr igual.
SELECT CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'mesas' AND column_name = 'capitan_id')
       THEN 'OK · 006_capitan_mesa.sql aplicada, el reporte sale completo'
       ELSE 'FALTA · aplicá supabase/migrations/006_capitan_mesa.sql primero, o borrá las líneas de capitán de los PASOS 1 y 3'
       END AS "migración 006";


-- ══════════════════════════════════════════════════════════════════
--  PASO 1 — Cómo están hoy  (correr solo este bloque)
-- ══════════════════════════════════════════════════════════════════
-- Con esta foto se escribe el mapeo del PASO 2. `fila` y `col` son el sitio de
-- cada mesa en el salón, y desde la 007 se leen de la tabla en vez de deducirse
-- del número: vacías = esa mesa todavía no tiene sitio en el plano.
SELECT
  substring(s.nombre from '^\s*Mesa\s+(\d+)\s*$')::int AS "N°",
  s.nombre,
  s.fila,
  s.col,
  s.capacidad,
  s.ocupados,
  s.libres,
  s.tarjetas,
  s.capitan,
  s.orden     AS "orden actual"
FROM mesa_summary s
ORDER BY s.orden, s.nombre;


-- ══════════════════════════════════════════════════════════════════
--  PASO 2 — Aplicar la renumeración  (correr solo este bloque)
-- ══════════════════════════════════════════════════════════════════
BEGIN;

-- ─── El mapeo: lo único que hay que editar ───
-- Una fila por mesa que se mueve: (número viejo, número nuevo).
-- La PK sobre `viejo` y el UNIQUE sobre `nuevo` son la primera validación: si
-- repetís un origen, o mandás dos mesas al mismo número, el INSERT falla acá
-- y no se toca nada.
CREATE TEMP TABLE renumeracion (
  viejo INT PRIMARY KEY,
  nuevo INT NOT NULL UNIQUE
) ON COMMIT DROP;

-- Reparto del 10·IX·2026. Es una permutación cerrada de 1…11: los once
-- destinos son exactamente los once orígenes, así que ninguna mesa queda
-- pisada por otra que no se mueva. Las que no se mueven (la 1 y la 11) van
-- igual en la lista: así el mapeo es el retrato completo del salón y no hay
-- que adivinar si a una mesa se la olvidó o se la dejó a propósito.
INSERT INTO renumeracion (viejo, nuevo) VALUES
  ( 1,  1),   -- se queda
  ( 2,  6),
  ( 3,  7),
  ( 4,  2),
  ( 5,  8),
  ( 6,  3),
  ( 7,  9),
  ( 8,  5),
  ( 9, 10),
  (10,  4),
  (11, 11);   -- se queda
  --
  -- La lista original decía «la nueva 11 corresponde a la anterior 13», pero no
  -- hay ninguna «Mesa 13»: era la 11, que se queda como está. Si al correr esto
  -- la verificación se queja de que el 11 no existe, borrá esa línea —no cambia
  -- nada— y la posición 11 del plano se queda como hueco hasta que se cree.

-- ─── Verificaciones ───
DO $$
DECLARE
  faltan TEXT;
  choca  TEXT;
BEGIN
  -- 1. Cada origen del mapeo tiene que existir hoy como «Mesa N».
  SELECT string_agg(r.viejo::text, ', ' ORDER BY r.viejo) INTO faltan
  FROM renumeracion r
  WHERE NOT EXISTS (
    SELECT 1 FROM mesas m
    WHERE substring(m.nombre from '^\s*Mesa\s+(\d+)\s*$')::int = r.viejo
  );
  IF faltan IS NOT NULL THEN
    RAISE EXCEPTION 'No existe ninguna «Mesa N» con estos números: %', faltan;
  END IF;

  -- 2. Ningún destino puede caer sobre una mesa que NO se mueve: quedarían
  --    dos mesas llamadas igual, y en las hojas impresas y el Excel no habría
  --    forma de saber cuál es cuál.
  SELECT string_agg(format('%s→%s', r.viejo, r.nuevo), ', ' ORDER BY r.nuevo) INTO choca
  FROM renumeracion r
  WHERE EXISTS (
      SELECT 1 FROM mesas m
      WHERE substring(m.nombre from '^\s*Mesa\s+(\d+)\s*$')::int = r.nuevo
    )
    AND r.nuevo NOT IN (SELECT viejo FROM renumeracion);
  IF choca IS NOT NULL THEN
    RAISE EXCEPTION
      'El destino ya lo ocupa una mesa que no se mueve (%). Agregá esa mesa al mapeo.', choca;
  END IF;
END $$;

-- ─── El cambio ───
-- UN SOLO UPDATE, y eso es el punto: todas las filas leen el estado viejo y
-- escriben el nuevo dentro del mismo statement. Una secuencia de UPDATEs de a
-- uno se pisa a sí misma en cuanto el mapeo tiene un ciclo (6→2 y 2→6).
UPDATE mesas m
SET nombre = 'Mesa ' || r.nuevo,
    orden  = r.nuevo
FROM renumeracion r
WHERE substring(m.nombre from '^\s*Mesa\s+(\d+)\s*$')::int = r.viejo;

-- ─── `orden` queda derivado del número, para todas ───
-- Así la lista del detalle y los dos exports —que leen `orden`— no pueden
-- contradecir a la etiqueta. Es idempotente, y de paso corrige las mesas que
-- ya venían descuadradas de antes.
UPDATE mesas
SET orden = substring(nombre from '^\s*Mesa\s+(\d+)\s*$')::int
WHERE nombre ~ '^\s*Mesa\s+\d+\s*$'
  AND orden IS DISTINCT FROM substring(nombre from '^\s*Mesa\s+(\d+)\s*$')::int;

-- La principal no lleva número y va primera. Sin el 0 explícito empata con la
-- Mesa 1, y el desempate por nombre la deja segunda.
UPDATE mesas SET orden = 0 WHERE nombre ~* '^\s*Mesa\s+principal\s*$';

COMMIT;
-- ↑ Para un ensayo en seco: cambiá COMMIT por ROLLBACK y corré el bloque. Las
--   verificaciones y el UPDATE se ejecutan, pero nada queda escrito.


-- ══════════════════════════════════════════════════════════════════
--  PASO 3 — El reporte  (tres consultas, correlas de a una)
-- ══════════════════════════════════════════════════════════════════

-- ─── 3.a Resumen por mesa, con su sitio en el plano ───
-- `fila` y `col` vacías = esa mesa no tiene sitio en el plano todavía: en el
-- panel sale debajo del salón, en «Sin sitio en el plano».
SELECT
  substring(s.nombre from '^\s*Mesa\s+(\d+)\s*$')::int AS "N°",
  s.nombre,
  s.fila,
  s.col,
  s.capacidad,
  s.ocupados,
  s.libres,
  s.tarjetas,
  COALESCE(s.capitan, '— sin capitán —') AS capitan
FROM mesa_summary s
ORDER BY s.orden, s.nombre;

-- ─── 3.b El reparto: quién se sienta dónde ───
-- Mismas columnas que la hoja «Reparto» del Excel, incluida Rol.
SELECT
  m.orden                            AS "N°",
  m.nombre                           AS mesa,
  COALESCE(gm.name, a.etiqueta)      AS persona,
  g.name                             AS tarjeta,
  CASE WHEN a.member_id IS NULL        THEN 'plaza sin nombre'
       WHEN a.member_id = m.capitan_id THEN 'Capitán'
       ELSE '' END                   AS rol
FROM asientos a
JOIN mesas  m              ON m.id  = a.mesa_id
JOIN guests g              ON g.id  = a.guest_id
LEFT JOIN guest_members gm ON gm.id = a.member_id
ORDER BY m.orden, m.nombre, COALESCE(gm.name, a.etiqueta);

-- ─── 3.c Avisos ───
-- Lo que hay que mirar antes de mandar a imprimir. Sin filas = todo en orden.
WITH n AS (
  SELECT substring(nombre from '^\s*Mesa\s+(\d+)\s*$')::int AS num FROM mesas
), lim AS (
  SELECT COALESCE(max(num), 0) AS hasta FROM n
)
SELECT aviso FROM (
  SELECT 1 AS ord,
         format('Nombre repetido: «%s» aparece %s veces — el plano las pinta encima', nombre, count(*)) AS aviso
    FROM mesas GROUP BY nombre HAVING count(*) > 1
  UNION ALL
  -- generate_series toma el tope de `lim` y no de un subquery escalar en el
  -- FROM: la referencia a un FROM-item anterior sí está garantizada.
  SELECT 2, format('No existe la Mesa %s: el plano va a enseñar el hueco', s)
    FROM lim, generate_series(1, lim.hasta) s
   WHERE NOT EXISTS (SELECT 1 FROM n WHERE num = s)
  UNION ALL
  SELECT 3, format('«%s» pasada de capacidad: %s sentados en %s puestos', nombre, ocupados, capacidad)
    FROM mesa_summary WHERE ocupados > capacidad
  UNION ALL
  SELECT 4, format('«%s»: el capitán %s ya no está sentado ahí', m.nombre, gm.name)
    FROM mesas m JOIN guest_members gm ON gm.id = m.capitan_id
   WHERE NOT EXISTS (SELECT 1 FROM asientos a WHERE a.mesa_id = m.id AND a.member_id = m.capitan_id)
  UNION ALL
  SELECT 5, format('«%s» tiene %s sentados y sigue sin capitán', nombre, ocupados)
    FROM mesa_summary WHERE capitan_id IS NULL AND ocupados > 0
) x
ORDER BY ord, aviso;
