# Angely & Kevin · 12 de septiembre de 2026

Invitación digital de boda con panel de administración de invitados.

Cada invitado recibe un link personalizado que abre una invitación a pantalla
completa con su nombre, sus cupos y un formulario de confirmación. Los novios
gestionan la lista, generan los links, los envían por WhatsApp y siguen las
confirmaciones en tiempo real desde `/admin`.

## Stack

- **React 19** + **Vite 7** + **React Router 7**
- **Supabase** — Postgres, Auth (solo para el panel) y Edge Functions (Deno)
- Deploy estático (Netlify / Cloudflare Pages) + Supabase para el backend

## Puesta en marcha

```bash
git clone <repo>
cd wedding_invitations
npm install
cp .env.example .env     # y rellena los valores de tu proyecto de Supabase
npm run dev
```

Los valores van en el Dashboard de Supabase → **Project Settings → API**.
Sin `.env` la aplicación no arranca.

Como la raíz `/` redirige al login del panel, para ver la invitación en desarrollo
necesitas un link generado desde `/admin`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm run build` | build de producción en `dist/` |
| `npm run preview` | sirve `dist/` localmente |
| `npm run optimize-images` | recomprime las fotos de `src/assets/img/` (respalda los originales) |
| `npm run favicons` | regenera el set de favicons desde el logo de la boda |

## Cómo funciona

### La invitación

Un slide-deck de 13 secciones a pantalla completa: portada con cuenta regresiva,
padres, galería, historia, guarda la fecha, ceremonia, recepción, vestimenta
(ellas / ellos), solo adultos, regalos, confirmación de asistencia y cierre.
Se navega con flechas, teclado, swipe o los dots laterales; también hay autoplay.

Hay dos tipos de invitación: **completa** (ceremonia + recepción) y **recepción**
(solo la fiesta), que oculta automáticamente las secciones de la ceremonia.

### El link personalizado

La ruta lleva un payload codificado en Base64URL con el token, el nombre del
invitado y su tipo de invitación:

```
https://tu-dominio/eyJ0IjoiYWJjMTIzIiwibiI6IkZhbWlsaWEiLCJrIjoiY29tcGxldGEifQ
```

Así el nombre aparece de inmediato al abrir, sin esperar a la red. Los cupos y la
confirmación previa se cargan después desde la base de datos.

### El panel (`/admin`)

Protegido con Supabase Auth. Permite crear y editar invitaciones (nombre del grupo,
miembros, WhatsApp, tipo, notas), copiar el link o el mensaje de invitación ya
redactado, enviarlo por WhatsApp con un clic, y hacer acciones masivas sobre varias
invitaciones a la vez.

El tablero muestra personas confirmadas sobre cupos totales, pendientes, quién no
asiste y cuáles invitaciones **aún no se han abierto** (útil para detectar links que
nunca se enviaron). Se refresca solo cada 15 segundos. Abajo se recopilan las
restricciones alimentarias y las canciones pedidas para la playlist, listas para
copiar.

## Base de datos

```
guests                    una fila por sobre/tarjeta (token único)
  ├── guest_members       las personas de esa tarjeta
  ├── confirmations       el RSVP (una por tarjeta)
  │     └── confirmation_members   quiénes asisten
  └── invitation_views    registro de aperturas del link
```

Row Level Security en todas las tablas: el rol anónimo **no tiene acceso directo** a
los datos, solo puede llamar a las Edge Functions.

### Aplicar migraciones

Los archivos están en `supabase/migrations/`, numerados y con un comentario de
cabecera que explica el porqué de cada cambio. Se aplican pegándolos en el
**SQL Editor** del Dashboard de Supabase, o con el script incluido:

```bash
node scripts/run-migration.mjs supabase/migrations/003_invitation_views.sql
```

El script necesita `.env.secrets` con `SUPABASE_DB_PASSWORD=` y el archivo
`supabase/.temp/pooler-url` que genera el CLI de Supabase.

### Edge Functions

Dos funciones en `supabase/functions/`, ambas con la service role key:

- **`get-invitation`** — devuelve los datos del invitado a partir de su token y
  registra la visita.
- **`submit-rsvp`** — guarda o actualiza la confirmación de asistencia.

```bash
npx supabase functions deploy get-invitation
npx supabase functions deploy submit-rsvp
```

## Deploy

```bash
npm run build     # → dist/
```

Sube `dist/` a Netlify, Cloudflare Pages o similar. El archivo `public/_redirects`
ya incluye el fallback de SPA (`/* /index.html 200`), imprescindible para que
funcionen los links de invitación. Recuerda definir las variables `VITE_*` en el
panel del proveedor de hosting.

## Seguridad

Nunca subas al repositorio tokens de invitación, nombres reales de invitados ni
números de WhatsApp. `.gitignore` ya excluye `.env`, `.env.secrets` e
`invite-urls.tsv`.

---

Para las notas técnicas de desarrollo (arquitectura interna, convenciones de código
y qué archivos son legacy) ver [`CLAUDE.md`](./CLAUDE.md).
