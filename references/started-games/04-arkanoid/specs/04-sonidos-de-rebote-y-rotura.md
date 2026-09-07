# 04 - Sonidos de rebote y rotura

**Estado:** Implemented
**Depende de:** SPEC 03
**Fecha:** 2026-09-03
**Objetivo:** Reproducir `ball-bounce.mp3` cuando la pelota rebota (paredes, paleta, bloque gris, primer golpe del marrón) y `break-sound.mp3` cuando un bloque se destruye del todo.

## Alcance

**Incluye:**
- Sonido `assets/sounds/ball-bounce.mp3` al rebotar la pelota en:
  - paredes laterales y superior,
  - la paleta,
  - el bloque gris indestructible (cada golpe, ya que nunca se rompe),
  - el bloque marrón en su primer golpe (cuando pasa a sprite agrietado sin destruirse).
- Sonido `assets/sounds/break-sound.mp3` solo cuando un bloque se destruye del todo (`alive` pasa a `false`): bloques de color en su único golpe, y bloque marrón en su segundo golpe.
- Ambos sonidos pueden solaparse entre sí y consigo mismos (ej. dos bloques golpeados en frames cercanos) sin cortarse: se reproduce clonando el audio (`cloneNode`) en cada reproducción en vez de reusar una única instancia.
- Volumen fijo moderado (`0.1`) para ambos sonidos, sin control de mute ni UI de volumen.
- Carga de los sonidos vía `new Audio('assets/sounds/...')`, consumidos directamente por `game.js` sin bundlers (zero dependencies).

**No incluye (fuera de este spec):**
- Sonido distinto por color de bloque (todos los bloques de color comparten el mismo `break-sound.mp3`).
- Control de volumen o mute desde la UI.
- Música de fondo.
- Persistencia de preferencias de audio (ej. volumen guardado en localStorage).
- Manejo de autoplay policy más allá de que el primer sonido se dispare tras una interacción del usuario (lanzar la bola con click/Space ya cuenta como interacción).

## Modelo de datos

No introduce nuevas estructuras de datos de juego (bricks, score, etc. no cambian). Se agregan solo referencias de audio en `game.js`:

- `bounceSound`: `Audio` apuntando a `assets/sounds/ball-bounce.mp3`.
- `breakSound`: `Audio` apuntando a `assets/sounds/break-sound.mp3`.
- Función `playSound(audio)`: clona el `Audio` (`audio.cloneNode()`), fija `volume = 0.1` y llama `.play()`, ignorando la promesa rechazada si el navegador bloquea el autoplay.

## Plan de implementación

1. En `game.js`: declarar `bounceSound = new Audio('assets/sounds/ball-bounce.mp3')` y `breakSound = new Audio('assets/sounds/break-sound.mp3')`, junto a una función `playSound(audio)` que clona, fija volumen `0.1` y reproduce (con `.catch(() => {})` para ignorar bloqueos de autoplay).
2. En `updateBall()`, agregar `playSound(bounceSound)` en cada rebote de pared (izquierda, derecha, superior) y en el rebote contra la paleta.
3. En el bloque de colisión bola-bloque de `updateBall()`:
   - Si `brick.breakable === false` (gris): agregar `playSound(bounceSound)` tras el rebote.
   - Si `brick.breakable === true` y tras incrementar `hitsTaken` el bloque **no** llega a `hitsRequired` (golpe intermedio, ej. primer golpe del marrón): agregar `playSound(bounceSound)`.
   - Si `brick.breakable === true` y el bloque sí se destruye (`hitsTaken >= hitsRequired`): agregar `playSound(breakSound)` (reemplaza el rebote por la rotura; no suenan ambos en el mismo golpe).
4. Verificar manualmente en navegador que ambos sonidos se disparan en los casos esperados y que dos rebotes/roturas cercanos en el tiempo no se cortan entre sí (usar DevTools o simplemente escuchar solapamientos).

## Criterios de aceptación

- [x] Al rebotar contra cualquier pared o la paleta se escucha `ball-bounce.mp3`.
- [x] Al golpear un bloque gris se escucha `ball-bounce.mp3` (nunca `break-sound.mp3`, ya que nunca se rompe).
- [x] Al dar el primer golpe a un bloque marrón (pasa a sprite agrietado) se escucha `ball-bounce.mp3`.
- [x] Al dar el segundo golpe a un bloque marrón (se destruye) se escucha `break-sound.mp3`, no `ball-bounce.mp3`.
- [x] Al destruir cualquier bloque de color (1 golpe) se escucha `break-sound.mp3`.
- [x] Dos sonidos disparados en frames cercanos (ej. dos bloques golpeados casi al mismo tiempo) se escuchan ambos, sin que uno corte al otro.
- [x] El volumen de ambos sonidos es moderado y consistente (no ensordecedor) en cada reproducción.
- [x] El resto del juego (física, puntaje, explosiones visuales) sigue funcionando igual que en SPEC 03.

## Decisiones tomadas y descartadas

- **`cloneNode` en cada reproducción en vez de una sola instancia `Audio` reusada:** el usuario pidió que los sonidos puedan solaparse sin cortarse; reusar una sola instancia y llamar `.play()` reinicia la reproducción en curso, cortando el sonido anterior.
- **Bloque gris siempre reproduce rebote, nunca rotura:** consistente con SPEC 03, donde el gris es indestructible y solo rebota.
- **Bloque marrón reproduce rebote en el 1er golpe y rotura en el 2do:** el usuario pidió explícitamente que el rebote suene "la primera vez del bloque marrón"; el segundo golpe lo destruye, por lo que corresponde el sonido de rotura en vez del de rebote.
- **Mismo `break-sound.mp3` para todos los colores y para el marrón:** el usuario descartó sonido distinto por tipo de bloque; solo hay un archivo de rotura disponible en `assets/sounds/`.
- **Volumen fijo `0.1` (bajado de `0.5` inicial), sin UI de mute/volumen:** decisión explícita del usuario para mantener el alcance simple, sin agregar controles nuevos a `index.html`/`style.css`; el usuario reportó que `0.5` resultaba demasiado fuerte y perturbador.
- **Sin manejo especial de autoplay policy más allá de `.catch()`:** el juego ya requiere una interacción del usuario (click o Space) para lanzar la bola, lo cual habilita el audio en la mayoría de navegadores; no se agrega un flujo dedicado de "activar sonido".
