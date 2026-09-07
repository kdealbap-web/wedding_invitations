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

npm run usb              # arma entrega/USB_BODA_AyK/ para el proveedor de las LED
npm run export           # invitados + cupos + mesas a Excel con fórmulas vivas
npm run export -- --demo # el mismo Excel con datos de ejemplo, sin tocar la base
npm run mesas-img        # plano del salón + una hoja por mesa, en PNG
npm run export-todo      # el Excel y las imágenes de una vez
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

### Las cartelas de las pantallas LED

`src/pantalla/` — las láminas que se proyectan en las pantallas del salón el día
de la fiesta, en su propia ruta y con su propia hoja de estilos (`pantalla.css`).
No se publican en el sitio: son un taller para **generar archivos** que se copian
a una USB y se le entregan al proveedor de las LED, que los reproduce.

- Cada cartela mide exactamente `1920 × 1080` px y las medidas van en **px** (no
  rem) porque el destino es un raster de tamaño fijo — el mismo criterio por el
  que la tarjeta de participación usa pt.
- `ALL_CARTELAS` define orden, id, fondo y contenido. El componente publica los
  ids en `window.__CARTELAS`; el script de exportación los lee de ahí, así que el
  orden tiene **una sola fuente de verdad**. Añadir una cartela = añadirla al
  arreglo, nada más.
- **Zona segura de 96 px** por lado: los paneles LED recortan el borde. Todo el
  contenido vive dentro de `.pl-inner`, y `npm run pantallas` **avisa por consola
  si una cartela se desborda**. No ignores ese aviso.
- `.pl-inner>*{flex-shrink:0}` no es decorativo: sin él los hijos se comprimen
  cuando el bloque no cabe, el desborde se reparte hacia los dos bordes y algún
  elemento llega a alto 0 en vez de avisar.
- Las fotos de fondo llevan `blur(5px)` a propósito: sin él los títulos caen
  encima de las caras. Son ambiente, no sujeto.
- Fondo oscuro deliberado: el LED es emisivo, el negro se ve elegante y el blanco
  encandila a los invitados.

En el navegador (`/pantalla`) las flechas navegan, **G** dibuja la zona segura y
**F** va a pantalla completa. `?export=1&c=<id>` aísla una cartela sin controles;
es lo que usa el script.

```bash
npm run pantallas   # → entrega/pantallas-led/NN_id.png + LEEME.txt
```

Levanta Vite en memoria y captura con el Chrome (o Edge) ya instalado — por eso
la dependencia es `puppeteer-core` y no `puppeteer`, que se traería un navegador
de 150 MB. El flag `--disable-lcd-text` es obligatorio: sin él el antialiasing
subpíxel hornea franjas rojas y azules en los bordes de las letras, que en un
panel LED se ven como suciedad de color. `entrega/` está gitignoreado.

#### Los MP4

```bash
npm run videos                      # todas
npm run videos -- bienvenida        # sólo algunas
```

Salen a `entrega/pantallas-led/video/`: H.264, 1920 × 1080, `yuv420p`, CRF 16,
16 s en bucle. Requiere **ffmpeg** (instalado con `winget install Gyan.FFmpeg`;
el script lo busca en el PATH y, si no, en la ruta de winget, porque winget sólo
actualiza el PATH de las shells nuevas).

- Los fotogramas **no** se capturan en tiempo real: se recorre la línea de tiempo
  con la Web Animations API fijando `currentTime`. Es determinista y no depende
  de lo cargada que esté la máquina.
- Las animaciones viven en el bloque final de `pantalla.css` y sólo se activan
  con `?anim=1` (clase `.pl-anim`), así que **tocarlas no altera los PNG**.
- **La duración del video debe ser múltiplo de TODOS los ciclos** de esos
  keyframes, o el bucle da un salto al reiniciar. Hoy son 16 s y 8 s, y por eso
  `CICLO = 16`. Si añades un keyframe con otro periodo, ajusta esa constante al
  mínimo común múltiplo.
- `yuv420p` no es opcional: sin él muchos reproductores de LED no abren el
  archivo.
- Tarda entre 3 y 8 minutos por video. Es normal — son 480 capturas.

### `cine/` — la producción de video (segunda entrega)

Alternativa a las cartelas estáticas de `/pantalla`, **no un reemplazo**: las dos
propuestas conviven para comparar. `cine/` no forma parte del bundle de la SPA;
es un módulo de producción que se ejecuta por línea de comandos. Ver `cine/README.md`.

```bash
npm run cine                          # loop de 74 s + 5 segmentos de 15 s
npm run cine -- --paleta=invitacion   # la otra paleta
npm run cine -- --contacto            # sólo la hoja de contactos (~40 s)
npm run cine -- --fotos="D:/fotos"    # otra fuente de fotos
```

- **`guion.mjs` es la única fuente creativa.** Escenas, duraciones, fotos,
  movimiento de cámara y textos. El resto sólo ejecuta.
- **Todo se mide en fotogramas, no en segundos.** A 29.97 fps (`30000/1001`) los
  segundos redondos no caen en cuadro entero: 15 s serían 449,55. Trabajando en
  fotogramas el bucle cierra exacto.
- El navegador sólo compone **las capas de texto** (PNG con alfa, una vez por
  escena). Todo el movimiento —Ken Burns, grano, viñeta, light leak, crossfades—
  lo hace ffmpeg. Por eso rinde ~2 min por segmento en vez de los ~3 min por cada
  16 s de `scripts/export-videos.mjs`.
- `yuv420p` es obligatorio o muchos reproductores de LED no abren el archivo.
- **`npm run fiesta`** (`cine/fiesta.mjs`) genera las piezas dinámicas de corte
  rápido — mosaico y ráfaga — con otra técnica: `sharp` compone cada estado como
  imagen completa y ffmpeg sólo las secuencia. Sin `zoompan`, así que las dos
  salen en menos de 2 min.

> **Vigila el bitrate.** El grano es ruido aleatorio y x264 no lo comprime: con
> CRF 14 los segmentos salían a 86–104 Mbps y el loop a 452 MB — 1,37 GB por
> paleta, y muchos reproductores de LED no pasan de 20–40 Mbps. Los parámetros
> están centralizados en `guion.mjs` (`X264_FINAL`, `GRANO`). **Si subes `GRANO`,
> vuelve a medir el peso.**

> **Las fotos llevan orientación EXIF 8** (17 de 20). El navegador la aplica;
> `sharp` y `ffmpeg` **no**. Sin normalizar, el video sale con la gente acostada.
> `fotos.mjs` escribe copias ya rotadas antes de que ffmpeg toque nada. **No
> alimentes ffmpeg con los originales.**

> Al aplicar el EXIF esas 17 fotos resultan **verticales** (1467 × 2200). A sangre
> en 16:9 habría que recortar el 63 % del alto. Por eso hay dos disposiciones que
> `fotos.mjs` elige sola: `pleno` (apaisada, a sangre, texto centrado) y
> `editorial` (vertical entera en un panel a la derecha, fondo desenfocado de ella
> misma, texto a bandera a la izquierda).

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

### Mesas del salón

`/admin/mesas` — `src/admin/MesasBoard.jsx`. Angely arma las mesas arrastrando
personas. Requiere la migración `005_mesas.sql`; si no está aplicada, la pantalla
lo dice en vez de reventar.

- **Se sienta a la PERSONA, no a la tarjeta.** Una familia puede repartirse entre
  dos mesas, y eso pasa siempre con los niños.
- Las tarjetas **sin `guest_members` cargados** aportan «plazas sin nombre»
  (`asientos.member_id IS NULL` + `etiqueta`): ocupan sitio aunque no sepamos a
  quién. Es la única forma de que esas tarjetas no desaparezcan del reparto.
- Un índice único parcial sobre `member_id` impide que una persona con nombre
  quede sentada en dos mesas. Las plazas sin nombre quedan fuera de ese índice
  porque una misma tarjeta puede aportar varias.
- **La capacidad no se valida en la base.** Pasarse de una mesa mientras se
  reacomoda es normal; el panel la marca en rojo y ya.
- «Sugerir reparto» mantiene junta cada tarjeta y la mete en la mesa donde quepa
  más ajustada. Es una ayuda, no una decisión: solo toca a quien está sin mesa.
- Funciona con arrastrar y soltar **y** con clic (seleccionar persona → tocar
  mesa), porque en tableta el arrastre es incómodo.

Las mesas se dibujan **redondas de verdad** (`src/admin/MesaRedonda.jsx`): un
tablero central con el nombre y los puestos repartidos por la circunferencia.

- `medidas()` calcula el radio a partir de la capacidad para que los puestos no
  se encimen, pero **el mínimo de 96 px no es por los puestos**: es para que el
  nombre de la mesa quepa dentro del tablero.
- Cada tarjeta tiene un **color estable** sacado de su id (`colorDe()`). Sirve
  para ver de un vistazo si una familia quedó partida entre dos mesas.
- Debajo del círculo va la lista de nombres: las iniciales solas no se leen.
- Al crear una mesa, el nombre se abre seleccionado. «Mesa 3» es un marcador de
  posición, no el nombre que va a llevar.
- `onDragLeave` comprueba `currentTarget.contains(relatedTarget)`: sin eso el
  evento salta al pasar por encima de cualquier hijo y la mesa parpadea.

**Las mesas no se generan solas.** «Sugerir reparto» existe, pero es opt-in y
solo toca a quien está sin mesa; el reparto lo arma la pareja.

#### La mesa principal y la numeración

La mesa de los novios se llama **«Mesa principal»** y no lleva número: la
numeración corriente empieza en **«Mesa 1»** después de ella. `nuevaMesa()` saca
el número del más alto que ya exista entre las que casan con `/^Mesa \d+$/`, y
no de `mesas.length`, por dos razones: así la principal no consume el 1, y así
borrar una del medio no genera un nombre repetido.

#### Capitán de mesa

Cada mesa tiene un capitán: la persona a la que el salón y la wedding le hablan
esa noche. Se elige con el `<select>` del pie de cada mesa, y los candidatos son
**quienes están sentados ahí en ese momento** — la lista se rehace sola.

- Se guarda la **persona** (`mesas.capitan_id → guest_members`), no el asiento.
  Mover a alguien de mesa borra su asiento y crea otro, así que un capitán atado
  al asiento se perdería en cada arrastre.
- Una **plaza sin nombre no puede ser capitana**: no hay a quién avisarle. Sale
  gratis, porque la referencia es a `guest_members`.
- Si al reacomodar el capitán acaba en otra mesa, **no se borra**: el `<select>`
  lo sigue mostrando con «ya no está en esta mesa» y el tablero lo cuenta aparte.
  Borrarlo solo perdería una decisión que costó tomar.
- Una mesa cuenta como «con capitán» **solo si el capitán está sentado en ella**.
  Si contara la sola asignación, la ficha diría «todas con capitán» mientras otra
  avisa de que uno está fuera, y las dos se contradirían.
- Las mesas **vacías no cuentan** como pendientes: todavía no pueden tener capitán.
- Va a los dos exports: columna **Capítán** en la hoja `Mesas`, columna **Rol** en
  `Reparto`, y en las imágenes en la cabecera de cada hoja de mesa — que es el
  papel que de verdad se lleva al salón— y con ★ en el plano general.

#### Los novios son una tarjeta más

Angely y Kevin están en `guests` como cualquier invitado (tarjeta «Familia De
Alba Acosta», confirmada, 2 personas) y sentados en la Mesa principal. **Es a
propósito:** el catering los cobra, así que tienen que entrar en `personasOf()` y
por tanto en el total del Excel y en el reparto. No los saques del listado para
«que no estorben»; el número que se le pasa al salón dejaría de cuadrar.

### Nombres por completar — `src/admin/nombres.js`

La base arrastra nombres que no sirven para sentar a nadie ni para imprimir una
tarjeta de mesa: **22 «Invitado N»**, «Acompañante», «Esposa», «Novia», y unos
16 que son solo el nombre de pila. `nombreIncompleto()` los detecta y devuelve
el motivo (`vacio` · `generico` · `incompleto`).

No corrige nada solo, **solo señala**: quién es «Invitado 3» lo sabe la pareja,
no el código. Se marcan en el tablero, en el Excel y en las imágenes, siempre en
rojo, para que se puedan arreglar de una pasada.

En `/admin/mesas` la lista **«Nombres por completar»** es la cola que hay que
dejar vacía antes de mandar a imprimir. Va agrupada por sobre y cada fila dice
el motivo y en qué mesa se sienta esa persona, porque quién es «Invitado 3» se
deduce de la familia y del sitio, no del nombre. Un clic abre la fila; **Enter
guarda y salta a la siguiente**, así que las 38 se arreglan de una pasada. En el
pool y dentro de las mesas siguen valiendo el doble clic, el ✎ y F2.

Al ponerle nombre a una «plaza sin nombre» se **crea la persona de verdad** en
`guest_members` y, si estaba sentada, el asiento pasa a apuntar a ella en vez de
a la etiqueta. Al guardar, `normalizarNombre()` arregla las mayúsculas
(«JOrge» → «Jorge») respetando las partículas en minúscula. Un nombre que sigue
flojo se guarda igual — la pareja escribe lo que sabe—, pero el editor lo dice
antes de guardar y la fila se queda en la cola.

### El editor de nombres — `src/admin/EditarNombre.jsx`

Un único componente para las tres superficies (la cola, el pool y la lista de
cada mesa), y **sólo puede haber uno abierto a la vez**. Por eso `editando` en
`MesasBoard` guarda `{ key, zona }` y no sólo la clave de la ficha:

> La misma persona se pinta en la cola **y** otra vez en «Sin mesa» o en su mesa.
> Con la clave sola se abrían dos editores en el mismo commit, y React aplica
> `autoFocus` llamando `.focus()` **por cada uno**: el primero recibía `focusout`
> en cuanto montaba el segundo, ese blur guardaba, y `guardarNombre` cerraba el
> editor en el mismo frame en que se abría. Editar un nombre no funcionó nunca
> desde ninguna superficie. **Si añades un cuarto sitio donde se pinte una ficha,
> dale su propia zona.**

El foco se pide en un `useEffect` y no con `autoFocus`, para poder seleccionar el
texto de una vez. Enter y ✓ guardan, Esc y ✕ cancelan, y salir del recuadro
guarda — el `onBlur` comprueba `relatedTarget` porque también salta al pasar el
foco a los propios botones—. Los botones llevan `preventDefault` en `mousedown`
o robarían el foco y se guardaría antes de saber a cuál se pulsó.

Debajo del campo va el nombre en **Cormorant Garamond**, la misma tipografía con
la que `imagenes.js` lo imprime en la tarjeta de mesa: no es adorno, es ver el
resultado en vez del dato.

Abrir el editor **cancela la selección pendiente** (`sel`). Sin eso, el clic con
el que se cierra el editor sentaba a esa persona en la mesa que se hubiera tocado.

> **Las plazas anónimas se renumeran.** Van indexadas `0…sinNombre-1` y el asiento
> guarda ese índice en `orden`. Al convertir la plaza *k* en persona queda una
> plaza menos, así que `guardarNombre` **corre un puesto las posteriores**. Sin
> eso, el asiento de la plaza *k+1* deja de casar con ninguna ficha: aparece
> huérfano en su mesa y su sitio reaparece a la vez en «Sin mesa».

### Export del reparto de mesas

Dos formatos, y cada uno se genera desde el panel y desde consola:

| | Botón | Consola |
|---|---|---|
| Excel (5 hojas, con **Reparto**) | «Exportar Excel» | `npm run export` |
| Imágenes (plano + hoja por mesa) | «Exportar imágenes» | `npm run mesas-img` |
| Ambos | — | `npm run export-todo` |

Las imágenes van a 2x para que impresas no se vean pixeladas. El **script**
dibuja en HTML y captura con Chrome headless; el **botón** dibuja en `<canvas>` y
empaqueta en ZIP con `jszip` — el navegador no deja descargar doce archivos
sueltos sin aprobar cada uno. Son dos herramientas distintas a propósito, pero
comparten paleta, tipografías y el criterio de qué nombre está incompleto.

### Los cupos viven en `src/admin/cupos.js`

`estadoOf`, `personasOf`, `cuposAbiertosOf` y `ESTADOS` estaban dentro de
`Dashboard.jsx`. Se extrajeron cuando el tablero de mesas y el export a Excel
necesitaron los mismos números: **si esto se duplica, el panel y el Excel acaban
diciendo cosas distintas y nadie sabe cuál creer.** Cualquier cosa que cuente
gente importa de ahí.

### El Excel

Se genera desde **dos sitios que comparten el mismo constructor**,
`src/admin/excel.js`:

- **Botón «Exportar Excel»** en el panel (Invitados y Mesas). `src/admin/descargar.js`
  trae los datos, arma el libro y lo descarga.
- **`npm run export`** desde consola, para lo mismo sin abrir el navegador.

`ExcelJS` **no se importa arriba**: pesa ~900 kB y entra por `import()` dinámico
al pulsar el botón, así queda en su propio chunk y el panel no lo carga hasta que
hace falta. Por eso `construirLibro()` lo recibe por parámetro en vez de
importarlo — es lo que permite que el mismo módulo sirva al navegador y a Node.

`src/admin/excel.js` importa `'./cupos.js'` **con extensión**: Vite la resuelve
sin ella, pero Node no, y este módulo lo carga también el script.

> El libro **reimplementa las reglas de cupos como fórmulas de Excel**, porque
> tiene que recalcular solo cuando Angely edita una celda. Es la única
> duplicación aceptada, y va marcada en el código: si cambias `personasOf()`,
> cambia también la fórmula de la columna «Personas».

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
- **`CONTACTO_WA` en `InvitacionCerrada.jsx` está vacío a propósito, no es un TODO.**
  Todo el que recibió invitación tiene el teléfono de Angely o de Kevin, así que no se
  publica un número: la pantalla muestra el texto sin enlace y eso es lo definitivo.
  El constante queda por si algún día se quiere el botón de WhatsApp.
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

Migración `005_mesas.sql`: tablas `mesas` y `asientos` + vista `mesa_summary`.
Ver «Mesas del salón» más arriba. **Aplicada.**

Migración `006_capitan_mesa.sql`: `mesas.capitan_id` → `guest_members`, más la
vista `mesa_summary` rehecha para exponer el nombre ya resuelto. Ver «Capitán de
mesa». El panel comprueba si la columna existe y esconde el control si no, así
que se puede desplegar el código antes de aplicarla sin romper nada.

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
