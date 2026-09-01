# CLAUDE.md

Guía para trabajar en este repositorio. Léela antes de tocar código.

## Qué es

Invitación digital de boda (Angely & Kevin · 12 de septiembre de 2026) con panel de
administración de invitados. **Una sola SPA** que sirve dos aplicaciones distintas.

React 19 · Vite 7 · React Router 7 · Supabase (Postgres + Auth + Edge Functions).
Sin TypeScript en el frontend, sin framework de CSS, sin librería de estado.

## Comandos

```bash
npm install
npm run dev              # servidor de desarrollo (Vite)
npm run build            # build de producción → dist/
npm run preview          # sirve dist/ localmente

npm run optimize-images  # recomprime src/assets/img/*.jpg (respalda en _originals/)
npm run favicons         # regenera public/favicon* desde el logo de la boda
```

**No hay tests.** No los inventes ni asumas que existe una suite.

**El lint está roto.** `eslint.config.js` importa `@eslint/js`, `globals`,
`eslint-plugin-react-hooks` y `eslint-plugin-react-refresh`, pero ninguno está en
`package.json` y no existe script `lint`. `npx eslint` falla hoy. Si el usuario pide
lint, hay que instalar esas cuatro dependencias primero.

### Migraciones

```bash
node scripts/run-migration.mjs supabase/migrations/003_invitation_views.sql
```

Requiere `.env.secrets` con `SUPABASE_DB_PASSWORD=` y el archivo
`supabase/.temp/pooler-url` (ambos gitignored, generados por el CLI de Supabase).
Sin ellos, las migraciones se aplican a mano pegándolas en el SQL Editor del
Dashboard de Supabase — que es como se aplicaron todas las actuales.

## Variables de entorno

Ver `.env.example`. Sin `.env` funcionan `/participacion` y la invitación pública,
pero `/admin` muestra un error explicando qué variable falta (`src/lib/supabase.js`
valida antes de llamar a `createClient`). Las llamadas a Supabase, claro, fallan.

| Variable | Usada en | Para qué |
|---|---|---|
| `VITE_SUPABASE_URL` | `lib/api.js`, `lib/supabase.js` | base de las Edge Functions y del cliente JS |
| `VITE_SUPABASE_ANON_KEY` | `lib/api.js`, `lib/supabase.js` | auth del panel + bearer de las Edge Functions |
| `VITE_APP_URL` | `admin/Dashboard.jsx` | dominio para construir los links de invitación |

`SUPABASE_DB_PASSWORD` va aparte, en `.env.secrets`, y solo lo usa el script de migraciones.

## Arquitectura

### Dos apps, un bundle

`src/main.jsx` reparte por ruta:

```
/admin/*        →  src/admin/AdminApp.jsx                       panel privado (Supabase Auth)
/participacion  →  src/participacion/TarjetaParticipacion.jsx   tarjeta imprimible 5 × 7"
/*              →  src/App.jsx                                  la invitación pública
```

La ruta `/participacion` va **antes** de la catch-all a propósito: cualquier ruta no
reconocida se interpreta como payload Base64 de invitación.

El panel accede a las tablas **directamente** con el cliente de Supabase, autorizado
por RLS como rol `authenticated`. El invitado **nunca** toca las tablas: solo llama
Edge Functions.

`AdminApp` y la tarjeta se cargan con `lazy()` **a propósito**, no solo por el tamaño
del bundle: `src/lib/supabase.js` construye el cliente al importarse, y cuando ese
import era estático un `.env` ausente tumbaba la aplicación entera dejando pantalla
en negro —incluida la tarjeta, que no usa Supabase—. Manteniéndolos diferidos, un
fallo de configuración queda contenido en su propia ruta. **No conviertas esos
`lazy()` en imports estáticos.**

Un `ErrorBoundary` envuelve las rutas para que cualquier fallo al montar muestre el
mensaje en vez de una pantalla vacía.

### El link de invitación

La ruta pública no es un token plano, es un payload JSON codificado en Base64URL:

```
https://dominio/eyJ0IjoiYWJjMTIzIiwibiI6IkZhbWlsaWEiLCJrIjoiY29tcGxldGEifQ
                └─ { t: token, n: nombre, k: invitation_type }
```

- Se **genera** en `encodeInvite()` — `src/admin/Dashboard.jsx`.
- Se **decodifica** en `decodePath()` — `src/GuestContext.jsx`.
- Los dos son un par: si tocas uno, toca el otro. Ambos son UTF-8 safe
  (`TextEncoder` / `TextDecoder`) porque los nombres llevan tildes y ñ.

El propósito del payload es pintar el nombre del invitado **al instante**, antes de
que responda la red; los cupos y la confirmación llegan después vía `get-invitation`.

Hay soporte legacy de `?t=TOKEN` (solo token, sin nombre inmediato). No lo elimines
sin avisar: puede haber links viejos circulando por WhatsApp.

Si no hay payload válido ni `?t=`, la app **redirige a `/admin/login`**
(`src/App.jsx`) — un visitante casual del dominio raíz nunca ve la invitación.

### El slide-deck

`src/App.jsx` es el orquestador. No hay scroll de página: son 13 secciones fijas
superpuestas y solo una lleva la clase `.active`.

- `ALL_SECTIONS` define orden, componente, imagen de fondo y overlay de cada slide.
- `NAV_ICONS` mapea el id del slide a su SVG en la navegación lateral.
- Transición de 950 ms, bloqueada por `transitioning.current` para evitar saltos dobles.
- Navegación: teclado (flechas), swipe vertical, dots laterales, flechas inferiores y
  autoplay de 5 s. Es **circular**: del último se vuelve al primero.
- El swipe respeta el scroll interno: si `.sec.active .sec-c` puede desplazarse, solo
  cambia de slide en los bordes.

**Añadir una sección** = crear el archivo en `src/sections/`, registrarlo en
`ALL_SECTIONS` y en `NAV_ICONS`, y darle su transform de entrada en `src/index.css`
(bloque `#sN:not(.active):not(.exiting)`).

### La tarjeta de participación

`src/participacion/` — el anuncio formal impreso, en su propia ruta y con su propia
hoja de estilos (`tarjeta.css`). Es la **única parte del proyecto sobre fondo claro**:
usa una paleta marfil derivada de los mismos tokens, porque va a papel.

- Mide exactamente `127mm × 178mm` (5 × 7 pulgadas) y `@page` fija ese tamaño sin
  márgenes, así que `window.print()` produce un PDF de una sola página a sangre.
- Los tamaños de texto van en **pt** (no rem) porque el destino es impresión.
- `print-color-adjust: exact` es lo que hace que el marfil y los dorados salgan
  impresos; sin eso el navegador los descarta.
- El contenido cabe justo: hay un `.tp-grow` que absorbe la holgura sobrante. Si
  añades o alargas texto, **vuelve a comprobar que sigue cabiendo en una página**
  (imprimir a PDF y verificar que no salgan dos).
- En pantallas estrechas la tarjeta se escala con `transform`, y `.tp-stage` reserva
  el alto escalado. La impresión resetea ese transform.

### Tipos de invitación

`invitation_type` tiene exactamente dos valores, con un CHECK en la base de datos:

- `completa` — ceremonia religiosa + recepción. Ve las 13 secciones.
- `recepcion` — solo la fiesta. `src/App.jsx` **filtra los slides `s4` y `s5`**
  (Guarda la fecha y Ceremonia), quedando 11.

Cualquier sección nueva que hable de la ceremonia debe entrar en ese filtro.

## Modelo de datos

```
guests                    una fila por sobre/tarjeta (token único, nombre del grupo)
  ├── guest_members       personas de esa tarjeta (order_num define el orden)
  ├── confirmations       UNIQUE por guest_id → el RSVP es un upsert
  │     └── confirmation_members   quiénes de la tarjeta asisten
  └── invitation_views    una fila por apertura del link
```

`guest_summary` es la vista que consume el panel: agrega cupos, estado, asistentes,
número de vistas y última vista.

### Confirmación telefónica y preconfirmación

**Solo la llamada confirma.** Lo que el invitado responde desde su link es una
**preconfirmación**: sirve para saber a quién llamar primero, pero no entra en el
número que se le pasa al catering. La wedding valida por teléfono y eso es lo que
cuenta.

`src/admin/Dashboard.jsx` deriva **un solo eje de estado** con `estadoOf(row)`, y los
cinco valores son excluyentes y en este orden (la respuesta pesa más que el intento
de llamada):

| Estado | Condición | Cuenta personas |
|---|---|---|
| `no_asiste` | `attending = false`, de cualquier origen | 0 |
| `confirmado` | `attending = true` y `source = 'admin'` | sí, el dato exacto |
| `preconfirmado` | `attending = true` y `source = 'guest'` | provisional |
| `no_contesta` | sin respuesta y `contact_status = 'no_contesta'` | 0 |
| `sin_respuesta` | todo lo demás | 0 |

Un «no» se cree venga de donde venga — nadie necesita una llamada para confirmar que
no va. Un «sí» por el link, en cambio, siempre espera la llamada.

`personasOf(row)` decide cuánta gente aporta una tarjeta:

- **Confirmada** → `attending_count`, el dato exacto que se tecleó en la llamada.
- **Preconfirmada** → lo que el invitado marcó y, **si no marcó a nadie, los cupos
  completos de la tarjeta**. Es un número provisional, así que se cuenta el sobre
  entero en vez de descartarlo. Esto es lo que hace que las confirmaciones viejas sin
  `confirmation_members` dejen de ser un agujero: valen sus cupos hasta que la
  llamada los precise.

### Invitación cerrada

Cuando la respuesta registrada es `attending = false`, **la invitación deja de estar
vigente**. `get-invitation` devuelve solo `{ id, name, revoked: true }` y **omite los
miembros, el tipo y la confirmación**: la información del evento deja de viajar por la
red, no es solo que la interfaz la esconda. `src/App.jsx` cortocircuita antes de montar
el slide-deck y renderiza `src/components/InvitacionCerrada.jsx`.

- Se reabre **sola** en cuanto la respuesta vuelve a ser «sí» — la wedding lo cambia en
  el modal de llamada. No hay bandera aparte que sincronizar.
- Aplica a los «no» de cualquier origen, link o llamada. Un «no» por error se resuelve
  por el camino de vuelta de la pantalla, que es lo que la hace segura: sin ese enlace,
  un clic equivocado dejaría al invitado sin invitación y sin salida.
- **`CONTACTO_WA` en `InvitacionCerrada.jsx` está vacío.** Sin número, la pantalla
  muestra el texto sin enlace. Es el único dato pendiente de la funcionalidad.
- La visita se registra igual en `invitation_views`: que alguien con la invitación
  cerrada intente abrirla es justamente la señal de que quizá cambió de planes.
- El deck alcanza a montarse durante el ida y vuelta de `get-invitation` (el payload
  Base64 pinta el nombre al instante, a propósito), así que hay una fracción de segundo
  en que se ve la primera slide antes del corte.

Migración `004_confirmacion_manual.sql`:

- `guests.contact_status` — `pendiente` · `no_contesta` · `contactado`, más
  `contacted_at`, `contact_attempts` y `contact_notes`. Es un atributo de la tarjeta,
  no de la respuesta: una tarjeta puede estar contactada y seguir sin confirmar.
- `confirmations.source` — `guest` (entró por el link) o `admin` (la registró la
  wedding en una llamada). La confirmación telefónica **no** es un contador aparte:
  escribe una fila real en `confirmations`, así los conteos tienen una sola fuente de
  verdad.
- `confirmations.attending_total` — cabeza de conteo tecleada en la llamada. En
  `guest_summary`, `attending_count` es
  `COALESCE(attending_total, COUNT(DISTINCT confirmation_members))`, porque una
  llamada puede reportar acompañantes que no están en `guest_members`.

> **Ojo:** `attending_count` da 0 cuando no hay ni `attending_total` ni miembros
> marcados. Las 45 confirmaciones que entraron por el link antes del 4 de julio de
> 2026 están así (24 de ellas): se hicieron cuando las tarjetas todavía no tenían
> nombres en `guest_members`, así que `submit-rsvp` recibió `member_ids: []`. Es dato
> perdido en la base — por eso `personasOf()` cuenta los cupos de la tarjeta para las
> preconfirmadas, en vez de contar 0. **No leas `attending_count` directo para
> totales: usá `personasOf()`.**

`guest_summary` se recrea con `DROP` + `CREATE` (no `CREATE OR REPLACE`, que solo
admite añadir columnas al final) y fija sus permisos explícitamente: expone
`g.token`, así que **`anon` no debe poder leerla nunca**.

> **Regla:** todos los conteos de `guest_summary` usan `COUNT(DISTINCT …)` a
> propósito. Unir `guest_members` (N filas) con `confirmation_members` (M filas) en la
> misma consulta produce un producto cartesiano N×M y sin `DISTINCT` los cupos se
> inflan (una familia de 4 aparecía como 16). Ver `002_fix_guest_summary_counts.sql`.
> Si reescribes la vista, conserva los `DISTINCT`.

Las migraciones en `supabase/migrations/` están numeradas y llevan un comentario de
cabecera explicando el porqué. Mantén ese formato al añadir una nueva.

## Edge Functions

Deno + TypeScript, en `supabase/functions/`. Ambas usan `SERVICE_ROLE_KEY`, así que
**bypasean RLS** — son la única puerta de entrada del invitado a los datos.

- **`get-invitation`** — recibe el token, devuelve nombre, tipo, miembros y la
  confirmación existente. Normaliza `confirmations` (PostgREST la devuelve como
  objeto por el UNIQUE en `guest_id`, pero podría venir como arreglo). Registra la
  visita en `invitation_views` dentro de un try/catch propio: **el tracking nunca
  debe romper la invitación**. Si la confirmación dice `attending = false`, corta y
  devuelve `{ id, name, revoked: true }` — ver «Invitación cerrada».
- **`submit-rsvp`** — upsert de la confirmación por `guest_id` y reemplazo completo
  de los miembros asistentes, así que re-confirmar es idempotente. Manda
  `source: 'guest'` y `attending_total: null` **explícitos**: si la wedding ya había
  registrado la tarjeta por teléfono, la respuesta del propio invitado manda y tiene
  que limpiar ese conteo manual — `ON CONFLICT DO UPDATE` solo toca las columnas que
  van en el payload.

Desplegar: `npx supabase functions deploy <nombre>`.

## Convenciones de código

Extraídas del código existente — síguelas, no impongas otras.

- **Sin punto y coma.** Comillas simples. Imports alineados en columna cuando son
  varios seguidos (ver la cabecera de `src/App.jsx`).
- **Comentarios y textos de UI en español**; nombres de variables y funciones en
  inglés. Los separadores de bloque usan guiones de caja: `// ─── Título ───`.
- **CSS plano, un solo archivo por app**: `src/index.css` para la invitación,
  `src/admin/admin.css` para el panel. Sin CSS Modules, sin Tailwind, sin
  styled-components. Estilo compacto, una regla por línea.
- **Tokens de diseño** en `:root` de `index.css`, en `oklch()`: `--acc` (terracota,
  color principal), `--acc-dk`, `--gold`, `--olive`, `--olsft`; tipografías `--fd`
  (Cormorant Garamond, títulos), `--fb` (Jost, texto) y `--fs` (Great Vibes,
  caligráfica); `--sp` es la curva de easing compartida.
- **Iconos SVG inline**, nunca una librería de iconos.
- Estilos puntuales van en `style={{…}}` inline; los reutilizables, al archivo CSS.
- Las imágenes se importan desde `src/assets/images.js` (barrel de exports), nunca
  por ruta directa.

## Datos de la boda

Están hardcodeados en los componentes. Si cambian, hay que buscarlos:

| Dato | Valor |
|---|---|
| Fecha | Sábado 12 de septiembre de 2026 |
| Ceremonia | 6:30 PM · Parroquia San Luis Beltrán, Barranquilla |
| Recepción | 8:30 PM · Casona del Prado, Barranquilla |
| Límite de RSVP | 12 de agosto |
| Hashtag | `#AyKBoda` |

> **La fecha está duplicada en 6 lugares.** Si se mueve, hay que tocar todos:
> `src/sections/S1Hero.jsx` (cuenta regresiva), `src/admin/Dashboard.jsx` (días
> restantes), `src/sections/S4SaveDate.jsx` (dos veces: URL de Google Calendar y
> archivo .ics), `src/participacion/TarjetaParticipacion.jsx` (la tarjeta impresa)
> e `index.html` (título de la pestaña). Ojo con la zona horaria:
> Colombia es UTC−5, así que 6:30 PM local se escribe como `23:30Z`.

## Legacy — no tocar, no confundir con código activo

Estos archivos son del diseño anterior (scroll vertical de página larga) y **no se
importan en ningún lado**. Se conservan como referencia. No los edites al hacer
cambios y no asumas que un componente con nombre parecido es el que está en uso.

- `src/components/` — de los 27 archivos, solo **8 están vivos**: `AudioBtn`,
  `AutoPlayBtn`, `InvitacionCerrada`, `NavArrows`, `NavDots`, `PetalRain`, `ProgBar`,
  `Toast`.
  Los otros 19 son muertos: `Hero`, `Historia`, `RsvpSection`, `EnvelopeIntro`,
  `Countdown`, `CtaFinal`, `DressCode`, `Galeria`, `HashtagBlock`, `Hoteles`,
  `InfoImportante`, `Itinerario`, `Lightbox`, `MapaSection`, `Musica`, `PageFooter`,
  `Turismo`, `VideoModal`, `WaveDivider`.
- `src/sections/S5Venues.jsx` — reemplazado por `S5Ceremony` + `S5Reception`.
- `src/App.css` — no se importa en ningún archivo.
- `src/assets/audio/*.mp3` — los que suenan de verdad son `public/audio/perfect.mp3`
  y `public/audio/all_of_me.mp3`, referenciados por ruta absoluta en `AudioBtn.jsx`.
- `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`.

La sección correcta del RSVP es `src/sections/S10Rsvp.jsx`, **no**
`src/components/RsvpSection.jsx`.

## Deploy

Sitio estático desde `dist/`. `public/_redirects` (`/* /index.html 200`) da el
fallback de SPA que necesita el esquema de rutas Base64 — es formato de Netlify /
Cloudflare Pages. Las Edge Functions y las migraciones se despliegan aparte, contra
Supabase.

## Datos sensibles

`.gitignore` ya excluye `.env`, `.env.secrets` e `invite-urls.tsv` (nombres reales +
tokens de invitados). **Nunca** subas tokens, nombres de invitados ni números de
WhatsApp al repositorio, ni los pegues en mensajes de commit.
