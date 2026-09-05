# cine/ — producción de video para las pantallas LED

Segunda entrega, **alternativa** a las cartelas estáticas de `/pantalla`. Aquella
sigue viva y no se toca: son dos propuestas para comparar.

Todo corre **local**. No hay servicios en la nube en ninguna parte del flujo.

## Comandos

```bash
npm run cine                          # loop + 5 segmentos, paleta escenario
npm run cine -- --paleta=invitacion   # la otra paleta
npm run cine -- --contacto            # sólo la hoja de contactos (~40 s)
npm run cine -- --solo=vals           # una sola pieza
npm run cine -- --solo=loop           # sólo el loop principal
npm run cine -- --fotos="D:/fotos-boda"

npm run fiesta                        # mosaico + ráfaga
npm run fiesta -- --solo=rafaga
```

Salida en `entrega/cine/<paleta>/` (gitignoreado).

## Cómo se reparte el trabajo

| Etapa | Herramienta | Por qué |
|---|---|---|
| Capas de texto | Chrome vía `puppeteer-core` | `drawtext` de ffmpeg no sabe de Cormorant Garamond ni Great Vibes, ni hace el interletrado amplio. El navegador compone igual que el sitio. |
| Normalizar fotos | `sharp` | Aplicar la orientación EXIF, que ffmpeg ignora. |
| Movimiento y acabado | `ffmpeg` | Ken Burns (`zoompan`), crossfades (`xfade`), grano (`noise`), viñeta, light leak. |

El navegador se llama **14 veces en total** (una por escena), no una vez por
fotograma. Esa es la diferencia con `scripts/export-videos.mjs`, que captura
cada cuadro y por eso tarda 3 minutos por cada 16 segundos.

## Archivos

| Archivo | Qué es |
|---|---|
| `guion.mjs` | **El guion.** Escenas, duraciones, fotos, movimiento de cámara y textos. Es la única fuente creativa; el resto sólo ejecuta. |
| `paleta.mjs` | Las dos paletas en comparación y las tres tipografías. |
| `fotos.mjs` | Normaliza EXIF y decide la disposición de cada foto. |
| `overlay.mjs` | Convierte una capa del guion en PNG con alfa. |
| `render.mjs` | Orquestador del loop y los segmentos. |
| `fiesta.mjs` | Piezas dinámicas de corte rápido: mosaico y ráfaga. |

## Dos trampas que ya están resueltas

**1. Orientación EXIF.** 17 de las 20 fotos del repo llevan orientación EXIF 8
(«girar 90° al mostrar»). El navegador la aplica; `sharp` y `ffmpeg` **no**.
Alimentar ffmpeg con los originales produce video con la gente acostada.
`fotos.mjs` escribe copias ya rotadas antes de tocar ffmpeg.

**2. Esas 17 fotos son verticales** (1467 × 2200 al mostrarse bien). A sangre en
16:9 habría que recortar el 63 % del alto: cabezas o pies fuera de cuadro. Por eso
hay dos disposiciones, que `fotos.mjs` elige sola según la forma de cada foto:

- **`pleno`** — foto apaisada a sangre, texto centrado encima. Sólo 3 fotos.
- **`editorial`** — la foto vertical **entera** en un panel a la derecha, fondo
  desenfocado de ella misma, y el texto a bandera a la izquierda.

## Fotogramas, no segundos

A 29.97 fps (`30000/1001`) los segundos redondos no caen en fotograma entero:
15 s serían 449.55 cuadros. Todo el guion se mide en **fotogramas**, y los
segundos se derivan. Así el bucle cierra exacto y no hay medio cuadro de deriva.

## Parámetros de exportación

```
contenedor  MP4
códec       H.264 (libx264)
resolución  1920 × 1080
fps         30000/1001 (29.97)
pix_fmt     yuv420p        ← sin esto muchos reproductores de LED no abren el archivo
CRF         14 por escena · 16 en el encadenado final
preset      medium / slow
faststart   sí
audio       ninguno        ← el sonido lo pone el DJ
```

## Rendimiento

Unos **2 minutos por segmento de 15 s**; el loop de 74 s ronda los 10. El cuello
es `zoompan` trabajando a 3840 × 2160 para que el zoom no se vea escalonado.

## Para cambiar algo

- **Textos, duraciones, orden, qué foto va en qué escena** → `guion.mjs`, y ya.
- **Colores** → `paleta.mjs`.
- **Tamaños tipográficos** → `overlay.mjs`.
- **Grano, viñeta, intensidad del light leak** → `render.mjs`, función `escena()`.

## Las piezas de fiesta

`fiesta.mjs` es el contrapunto del loop elegante, y usa **otra técnica a
propósito**: `sharp` compone cada estado como imagen completa y ffmpeg sólo las
secuencia. Sin `zoompan` a 4K, así que las dos piezas salen en menos de dos
minutos — contra los dos minutos que cuesta **un solo** segmento del loop. Eso es
lo que hace viable probar variantes de montaje.

| Pieza | Qué hace |
|---|---|
| `07_mosaico` | Rejilla de 4 × 3 que se llena celda a celda cada 15 fotogramas; al completarse entra el rótulo del hashtag. |
| `08_rafaga` | 20 cortes secos de 18 fotogramas (~100 golpes por minuto) y cierre con «¡A la pista!». |

- El **golpe de luz** en cada corte es `eq=brightness` con `eval=frame`: una
  subida que decae en una décima justo al empezar cada celda del ritmo. Es lo que
  hace que el corte se sienta aunque no haya audio.
- El rótulo del mosaico usa la capa `banda` y no `grande`: el velo radial de
  `grande` está pensado para una foto sola y sobre una rejilla llena **lava todas
  las celdas**.
- En la ráfaga las tres fotos apaisadas van **a sangre** y las verticales en panel
  con filete. La variedad de encuadre es de lo que vive un montaje rápido.

## El bitrate importa

Con CRF 14 y grano, los segmentos salían a **86–104 Mbps** (150-186 MB por 15 s) y
el loop a 452 MB — 1,37 GB por paleta. El grano es ruido aleatorio y x264 no lo
puede comprimir. Muchos reproductores de LED no pasan de 20–40 Mbps y se atascan.

Los parámetros viven en `guion.mjs` (`X264_FINAL`, `GRANO`): CRF 20 con techo de
20 Mbps, grano a 4, `profile high` / `level 4.1` y un keyframe cada 2 s por
compatibilidad de reproductores. Se ve igual en un panel y pesa una fracción.
**Si subes `GRANO`, vuelve a medir el peso.**
