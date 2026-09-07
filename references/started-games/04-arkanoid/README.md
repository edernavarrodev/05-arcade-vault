# Juego de Arkanoid

Arkanoid hecho en HTML, CSS y JavaScript puro, sin dependencias.

## Cómo jugar

Abre `index.html` en el navegador (o sírvelo con cualquier servidor estático).

- **Flechas ← / →** o **A / D**: mover la paleta.
- **Espacio** o **clic en el canvas**: lanzar la pelota.
- Destruye todos los bloques rompibles para ganar. Si la pelota cae, pierdes.
- Al terminar la partida aparece la puntuación y un botón para reiniciar.

## Características implementadas

- Bucle de juego con paleta, pelota y colisiones (paredes, paleta, bloques).
- 5 filas de bloques de colores (rojo, amarillo, cian, magenta, verde), cada una con puntaje distinto.
- Bloques obstáculo: gris (indestructible) y marrón (resiste 2 golpes, muestra sprite agrietado).
- Animación de explosión al destruir un bloque y puntaje acumulado en pantalla.
- Efectos de sonido de rebote y rotura de bloques.
- Pantallas de victoria y game over con reinicio.

## Estructura

- `index.html` — canvas del juego y pantalla de fin de partida.
- `style.css` — estilos.
- `game.js` — lógica completa del juego (estado, física, colisiones, puntaje, sonido).
- `assets/` — spritesheet (`spritesheet-breakout.png` + `spritesheet.js`) y sonidos (`ball-bounce.mp3`, `break-sound.mp3`).
- `specs/` — especificaciones de cada funcionalidad, usadas por el flujo `/spec` y `/spec-impl` (ver `CLAUDE.md`).

## Desarrollo

Sin build ni tests: es JavaScript vanilla servido directo. Las nuevas funcionalidades se agregan siguiendo el flujo de specs descrito en `CLAUDE.md`.
