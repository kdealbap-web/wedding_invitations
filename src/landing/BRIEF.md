# Brief · invitation.kdealbap.com

## Posicionamiento
Invitaciones digitales **hechas a la medida en Barranquilla**, nacidas de una boda
real (Angely & Kevin, 12·IX·2026: 48 invitaciones, 83 personas, 11 mesas). No es
una plantilla con tu nombre encima: es un enlace distinto para cada familia, que la
saluda por su nombre, y un panel que le da al organizador el número exacto.
Premium sin solemnidad: la calidad de la papelería fina con el pulso del Caribe.

## A quién le hablamos
- **Quien paga y organiza**: la mamá que arma los 15 años, la pareja que se casa,
  la wedding planner que lleva tres eventos a la vez.
- Llegan **desde WhatsApp, en el celular**. La página se diseña primero a 390 px.
- Quieren dos cosas: que sus invitados digan «¡qué bonita!» y no perseguir a nadie
  para saber cuántos van.

## Personalidad
**Rotunda · cálida · precisa.** Rotunda en la tipografía (no susurra), cálida en el
color (vino y rubor, no beige), precisa en los datos (cupos, mesas, precios claros).

## Color — «Lacre y cayena»
El lacre del sello, el terciopelo del sobre y la flor de cayena del Caribe.

| Rol | Nombre | Hex | Proporción |
|---|---|---|---|
| Dominante oscuro | Vino | `#2A0A17` | ~45 % (hero, historia, paquetes, pie) |
| Superficie oscura elevada | Vino alto | `#3F1426` | tarjetas sobre vino |
| Dominante claro | Rubor | `#F6D5CD` | ~25 % (recorrido, piezas, proceso) |
| Neutro claro | Papel | `#FFF5F0` | ~20 % (panel, eventos, preguntas) |
| Tinta (texto sobre claro) | Tinta | `#1E0810` | texto |
| Texto secundario | Malva `#C49BA5` (sobre vino) · Ciruela `#6E4553` (sobre claro) | | texto |
| **Acento único** | Cayena | `#FF5236` | ≤ 5 %: botones, el nombre del invitado, un dato clave, y el cierre |

Por qué: el marfil + serif fina se lee como «plantilla de IA». El vino da
profundidad y lujo nocturno (las fiestas son de noche), el rubor reemplaza al beige
con un claro con temperatura, y la cayena es una sola nota viva que marca **dónde
se actúa**. El cierre es la única superficie grande en cayena: es el clímax, el CTA.
Contrastes: cayena lleva texto vino (6:1), nunca texto blanco ni texto chico sobre papel.

## Tipografía (Fontshare)
- **Zodiak** (display) — serif de alto contraste con remates afilados. Se usa en
  **800–900**, apretada, a escala de cartel; la cursiva 400 sólo para la palabra
  «Para», como el sobrescrito de un sobre. Es lo opuesto a la serif fina en cursiva
  ligera que se rechazó: pesa, tiene filo y se ve de lejos.
- **Switzer** (UI y texto) — grotesca neutra, muy legible a 15–17 px en el celular,
  con 500/600 para botones y datos. Deja que Zodiak sea la voz.
- Escala: texto 16 → 17 px; titulares `clamp()` de 2,4 a 5,8 rem; el nombre del
  hero hasta 9,5 rem. Interlineado display 0,9; texto 1,55.
- Sin «eyebrows» en mayúsculas espaciadas encima de cada título.

## Retícula
12 columnas a 1440 (contenedor 1320, medianil 24), 4 a 390 (margen 20). La
composición es **asimétrica**: titulares que invaden la foto, el teléfono que se
sale de su columna, paquetes con el central levantado y montado sobre los otros.
Cada sección cambia de fondo; nada de bandas iguales seguidas.

## Momento firma
**El recorrido en un teléfono en perspectiva**: al hacer scroll el teléfono queda
fijo, gira en 3D y muestra la secuencia real — llega el mensaje de WhatsApp, el
sobre se abre con el nombre de la familia, se marcan quiénes van —. Es lo que vive
el invitado, contado en el orden en que pasa.

## Movimiento
Un solo momento orquestado (el teléfono) y una entrada del hero. El nombre del hero
rota entre familias para demostrar la personalización. Todo lo demás, quieto o con
un revelado corto. `prefers-reduced-motion`: sin giro, sin rotación de nombres,
estados finales visibles.

## Fotografía
Sólo la boda real (`src/assets/images.js`), nunca la carpeta de eventos de clientes.
Color natural, recortes apretados, atardeceres que ya traen el vino y la cayena.
Las fotos son prueba, no decoración: van con su pie y su fecha.
