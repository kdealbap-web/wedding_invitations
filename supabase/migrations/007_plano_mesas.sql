-- ══════════════════════════════════════════════════════════════════
--  El sitio de cada mesa en el salón
--  Ejecutar en: Supabase Dashboard → SQL Editor
--
--  Hasta hoy la posición de una mesa en el plano se deducía de su NOMBRE
--  («Mesa 7» → hilera 2, columna 2) contra una cuadrícula escrita en el
--  código. Eso ataba dos cosas que no tienen por qué ir juntas: mover una
--  mesa de sitio obligaba a renumerarla, y cada cambio del salón —hubo dos
--  en tres días— era un cambio de código más una permutación en SQL.
--
--  Con `fila` y `col` guardadas, el número vuelve a ser lo que es —una
--  etiqueta— y el sitio se arrastra desde /admin/mesas. Renumerar y mover
--  pasan a ser dos operaciones distintas, que es lo que son.
--
--  Decisiones:
--  · 1-based, para que casen con lo que se dice en voz alta: «hilera 1,
--    columna 4». La cuadrícula del salón son 3 hileras; no se fija en la
--    base porque el salón ya cambió de forma dos veces y un CHECK sólo
--    estorbaría la próxima. El panel es el que limita.
--  · NULL = esa mesa todavía no tiene sitio en el plano. No es un error:
--    el panel las pinta debajo del salón para poder arrastrarlas adentro.
--    Por eso no hay DEFAULT ni NOT NULL.
--  · NO hay UNIQUE sobre (fila, col). Intercambiar dos mesas de sitio son
--    dos UPDATE, y con el índice el primero chocaría contra el segundo
--    —el mismo problema de ciclos que obligaba al UPDATE único al
--    renumerar—. Mismo criterio que la capacidad en 005: el panel avisa.
--  · Los muebles del salón (la mesa de postres) NO entran acá. Una fila en
--    `mesas` los metería en el Excel, en los avisos y en las hojas que se
--    imprimen como una mesa vacía a la que le falta gente. Viven como
--    constante en MesasBoard.jsx.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE mesas
  ADD COLUMN IF NOT EXISTS fila INT CHECK (fila >= 1),
  ADD COLUMN IF NOT EXISTS col  INT CHECK (col  >= 1);

-- ─────────────────────────────────────────────
-- Semilla: el salón tal como está dibujado hoy
-- ─────────────────────────────────────────────
-- Es la misma cuadrícula que PLANO en src/admin/MesasBoard.jsx, para que el
-- plano arranque idéntico a como se venía viendo. Desde acá en adelante la
-- fuente de verdad es esta tabla, no el código: el arreglo PLANO queda sólo
-- como respaldo para cuando esta migración todavía no se aplicó.
--
-- Sólo toca las que no tienen sitio (IS NULL), así que se puede correr dos
-- veces sin pisar lo que ya se haya movido a mano.
WITH plano(num, fila, col) AS (VALUES
  (11,1,1), (8,1,2), (5,1,3), (2,1,4),   -- la (1,5) la ocupa la mesa de postres
  (10,2,1), (7,2,2), (3,2,3),
  ( 9,3,1), (6,3,2), (4,3,3), (1,3,4)
)
UPDATE mesas m
SET fila = p.fila, col = p.col
FROM plano p
WHERE substring(m.nombre from '^\s*Mesa\s+(\d+)\s*$')::int = p.num
  AND m.fila IS NULL AND m.col IS NULL;

-- La de los novios va a la derecha del todo, y las demás quedan a su
-- izquierda. Responde a los dos nombres: el salón la llama «Mesa de los
-- Novios» y en la base es «Mesa principal» desde que se creó.
UPDATE mesas
SET fila = 1, col = 6
WHERE nombre ~* '^\s*Mesa\s+(principal|de\s+los\s+novios)\s*$'
  AND fila IS NULL AND col IS NULL;

-- ─────────────────────────────────────────────
-- La vista, con el sitio incluido
-- ─────────────────────────────────────────────
-- DROP + CREATE y no CREATE OR REPLACE: igual que en 006, el REPLACE sólo
-- admite añadir columnas al final y aquí `fila` y `col` van junto a `orden`,
-- que es lo que ordena. Los COUNT(DISTINCT …) se conservan de 005.
DROP VIEW IF EXISTS mesa_summary;
CREATE VIEW mesa_summary AS
SELECT
  m.id,
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
GROUP BY m.id, m.nombre, m.capacidad, m.orden, m.fila, m.col, m.notas, m.capitan_id, cap.name;

-- Expone nombres de invitados, así que se fijan los permisos explícitamente:
-- `anon` no debe poder leerla nunca.
REVOKE ALL ON mesa_summary FROM anon;
GRANT SELECT ON mesa_summary TO authenticated, service_role;
