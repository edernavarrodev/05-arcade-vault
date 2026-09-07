# 01 - MVP jugable de Arkanoid

**Estado:** Implementado
**Depende de:** ninguno
**Fecha:** 2026-09-03
**Objetivo:** Crear un MVP jugable de Arkanoid con un nivel fijo, controlado por teclado, con estados Playing/GameOver/Win y botón de reinicio, sin sonido ni puntaje.

## Alcance

**Incluye:**
- Canvas fijo de 800x600 píxeles.
- Paleta controlada con flechas izquierda/derecha (o A/D).
- Bola que inicia pegada a la paleta y se lanza con espacio o click.
- 1 nivel fijo: grid simple de bloques de un solo color/tipo (spritesheet `block_gray` o similar).
- Colisión bola-paleta, bola-paredes, bola-bloque (bloque se rompe en 1 golpe).
- 1 vida: si la bola cae por debajo de la paleta, Game Over inmediato.
- Condición de victoria: se rompen todos los bloques del nivel → estado Win.
- Estados de juego: `playing`, `gameover`, `win` (sin `start` ni `paused`).
- Pantalla de fin (Game Over / Win) con botón o tecla para reiniciar el juego sin recargar la página.
- Consumo directo de `assets/spritesheet.js` vía `<script>` tag (sin build, sin dependencias).

**No incluye (fuera de este spec):**
- Sonido (`ball-bounce.mp3`, `break-sound.mp3`).
- Sistema de puntaje/score visible.
- Múltiples niveles o progresión.
- Power-ups.
- Pantalla de inicio (`start`) ni pausa.
- Persistencia (localStorage, highscores).
- Responsive/resize del canvas.
- Soporte mouse para la paleta.

## Modelo de datos

Sin persistencia. Estado en memoria (variables JS), no requiere estructuras serializadas:

- `gameState`: string, uno de `'playing' | 'gameover' | 'win'`.
- `paddle`: `{ x, y, w, h, speed }`.
- `ball`: `{ x, y, vx, vy, radius, attached }` (`attached: true` mientras está pegada a la paleta antes del lanzamiento).
- `bricks`: array de `{ x, y, w, h, alive }`, generado desde una grilla fija (filas x columnas) al iniciar/reiniciar.

## Plan de implementación

1. Crear `index.html`: carga `assets/spritesheet.js`, `style.css`, `game.js`, define `<canvas id="game" width="800" height="600">` y contenedor para pantalla de fin/reinicio.
2. Crear `style.css`: estilos básicos del canvas centrado y overlay de fin de juego (Game Over / Win + botón reiniciar).
3. Crear `game.js`: cargar spritesheet con `loadSpritesheet`, inicializar `paddle`, `ball`, `bricks` (grid fijo), y arrancar loop de render (`requestAnimationFrame`) que dibuja fondo, paleta, bola y bloques vivos.
4. Implementar input de teclado: mover paleta con flechas/A-D dentro de límites del canvas; espacio o click lanza la bola si `attached`.
5. Implementar física de movimiento de la bola y colisiones: paredes (rebote), paleta (rebote con ángulo según punto de impacto), bloques (rebote + `alive = false` al impactar).
6. Implementar transición a `gameover` cuando la bola cruza el borde inferior del canvas, deteniendo el loop de física y mostrando overlay con botón reiniciar.
7. Implementar transición a `win` cuando no quedan bloques `alive`, mostrando overlay con mensaje de victoria y botón reiniciar.
8. Implementar función `resetGame()` que reinicializa `paddle`, `ball`, `bricks` y `gameState = 'playing'`, invocada por el botón/tecla de reinicio.

## Criterios de aceptación

- [x] Abrir `index.html` en un navegador muestra el canvas 800x600 con paleta, bola pegada a la paleta y grid de bloques visibles.
- [x] Flechas izquierda/derecha (o A/D) mueven la paleta sin salir del canvas.
- [x] Espacio o click lanza la bola desde la paleta.
- [x] La bola rebota correctamente en paredes laterales, techo y paleta.
- [x] Al golpear un bloque, este desaparece y la bola rebota.
- [x] Si la bola cae por debajo de la paleta, el juego pasa a estado Game Over y muestra overlay con botón de reinicio.
- [x] Al romper todos los bloques, el juego pasa a estado Win y muestra overlay con botón de reinicio.
- [x] El botón/tecla de reinicio devuelve el juego a estado inicial jugable sin recargar la página.
- [x] No hay dependencias externas ni build step: el juego corre abriendo `index.html` directo.

## Decisiones tomadas y descartadas

- **1 vida en vez de 3:** decisión explícita del usuario para reducir alcance del MVP; sistema de vidas múltiples queda para un spec futuro.
- **Sin sonido ni score en el MVP:** se prioriza el loop de juego jugable; se agregan en specs posteriores.
- **1 nivel fijo, un solo tipo de bloque:** simplifica el modelo de datos y el plan de implementación; variedad de colores/niveles queda para después.
- **Canvas fijo 800x600, sin responsive:** simplifica cálculo de colisiones y física.
- **Bola pegada a la paleta al inicio con lanzamiento manual:** más fiel al género y evita que la bola caiga antes de que el jugador esté listo.
- **Botón/tecla de reinicio en vez de recargar página:** mejor experiencia de juego, evita depender de F5.
