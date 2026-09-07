# 02 - Destrucción de bloques con animación y puntaje

**Estado:** Implemented
**Depende de:** SPEC 01
**Fecha:** 2026-09-03
**Objetivo:** Al destruir un bloque se reproduce una animación de explosión (sin sonido) y se suma puntaje visible en pantalla que se acumula durante la partida.

## Alcance

**Incluye:**
- Animación de explosión al destruir un bloque, usando `EXPLOSION_FRAMES.gray` y `EXPLOSION_DURATION` ya definidos en `assets/spritesheet.js`.
- Durante la animación el bloque ya no colisiona ni bloquea, pero se sigue dibujando (con los frames de explosión) hasta que termina la duración.
- Puntaje (`score`) que suma 10 puntos por cada bloque destruido.
- Texto "Puntaje: N" visible dentro del canvas (dibujado con `ctx.fillText`), actualizado en tiempo real.
- Texto "Puntaje: N" también visible en la pantalla final (game over / victoria).
- Reset de `score` a 0 al llamar `resetGame()`.

**No incluye (fuera de este spec):**
- Sonido de rotura (`break-sound.mp3`) ni de rebote (`ball-bounce.mp3`).
- Distintos puntajes por color/tipo de bloque (sigue habiendo un solo tipo, `gray`).
- Persistencia de puntaje (highscores, localStorage).
- Combos, multiplicadores o bonus de puntaje.
- Cambios a las reglas de victoria/derrota del MVP.

## Modelo de datos

Extiende el modelo del SPEC 01, sin persistencia (memoria/variables JS):

- `bricks[i].alive`: se mantiene, pasa a `false` en el momento del impacto (deja de colisionar).
- `bricks[i].exploding`: booleano nuevo, `true` mientras se reproduce la animación de explosión.
- `bricks[i].explodeStart`: timestamp (`performance.now()` o `Date.now()`) del momento del impacto, usado para calcular el frame actual según `EXPLOSION_DURATION`.
- `score`: número, inicia en 0, se incrementa en +10 por cada bloque destruido.

## Plan de implementación

1. En `createBricks()`/`resetGame()`: agregar `exploding: false` y `explodeStart: null` a cada bloque; agregar variable global `score = 0`.
2. En `index.html`: agregar `<p id="end-score"></p>` dentro de `#end-screen`, junto a `#end-message`, para mostrar el puntaje final.
3. En la colisión bola-bloque (`updateBall`): al destruir un bloque, en vez de solo `brick.alive = false`, también setear `brick.exploding = true`, `brick.explodeStart = performance.now()` e incrementar `score += 10`.
4. En `draw()`: para bloques con `alive === true` dibujar sprite normal; para bloques con `exploding === true` calcular el frame de `EXPLOSION_FRAMES.gray` según tiempo transcurrido desde `explodeStart` y dibujarlo; cuando el tiempo transcurrido supere `EXPLOSION_DURATION`, poner `exploding = false` (deja de dibujarse). Al final de `draw()`, dibujar el texto "Puntaje: N" dentro del canvas con `ctx.fillText` (color claro para contraste sobre fondo negro del canvas).
5. Verificar que la condición de victoria (`bricks.every(b => !b.alive)`) sigue funcionando igual, ya que se basa en `alive` y no en `exploding`.
6. En `resetGame()`: reiniciar `score` a 0.
7. En `showEndScreen()`: actualizar `#end-score` con el puntaje final junto con el mensaje de game over/victoria.

## Criterios de aceptación

- [x] Al golpear un bloque, este deja de bloquear la bola inmediatamente pero se ve una animación de explosión (frames de `EXPLOSION_FRAMES.gray`) antes de desaparecer del todo.
- [x] La animación de explosión dura aproximadamente `EXPLOSION_DURATION` (150ms) y luego el bloque desaparece completamente.
- [x] Cada bloque destruido suma 10 puntos al puntaje.
- [x] El puntaje se muestra dentro del canvas como texto "Puntaje: N", con contraste legible sobre el fondo, y se actualiza en tiempo real.
- [x] Al finalizar la partida (game over o victoria), la pantalla final muestra el puntaje obtenido.
- [x] Al reiniciar la partida (botón/tecla de reinicio), el puntaje vuelve a 0.
- [x] La condición de victoria (romper todos los bloques) sigue funcionando igual que en el SPEC 01.
- [x] No hay sonido reproducido en ningún punto de esta funcionalidad.

## Decisiones tomadas y descartadas

- **Usar `EXPLOSION_FRAMES` existente en vez de animación genérica (fade/scale):** ya está definido en `assets/spritesheet.js` con 4 frames y duración, evita reinventar la animación.
- **10 puntos fijos por bloque:** único tipo de bloque (`gray`) en el MVP, no hay justificación aún para puntajes variables por color.
- **Puntaje dibujado con `ctx.fillText` dentro del canvas (revertido de la decisión original de usar HTML sobre el canvas):** el texto HTML posicionado arriba del canvas no tenía contraste suficiente contra el fondo (`#2b2b2b`) sin estilos dedicados; dibujarlo dentro del canvas, sobre fondo negro, con color claro, resuelve la legibilidad sin agregar CSS nuevo.
- **Puntaje también mostrado en la pantalla final:** el usuario pidió ver el resultado acumulado tanto en game over como en victoria, no solo durante la partida.
- **Puntaje se resetea en cada `resetGame()`:** consistente con la falta de persistencia entre partidas del SPEC 01.
- **Sin sonido en este spec:** decisión explícita del usuario, se deja para un spec futuro junto con `break-sound.mp3`/`ball-bounce.mp3`.
