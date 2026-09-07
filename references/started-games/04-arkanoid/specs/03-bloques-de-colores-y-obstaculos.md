# 03 - Bloques de colores y obstáculos

**Estado:** Implemented
**Depende de:** SPEC 02
**Fecha:** 2026-09-03
**Objetivo:** Reemplazar el bloque gris único del MVP por 5 colores de bloques (1 golpe, puntaje distinto por color) más dos tipos de bloque obstáculo repartidos al azar: gris indestructible y marrón que resiste 3 golpes con sprite dañado.

## Alcance

**Incluye:**
- 5 filas de bloques de colores, cada fila con un color fijo: `red`, `yellow`, `cyan`, `magenta`, `green` (de arriba hacia abajo), usando `SPRITES.blocks` ya definidos en `assets/spritesheet.js`.
- Puntaje distinto por color (bloques de 1 golpe): `red=10`, `yellow=20`, `cyan=30`, `magenta=40`, `green=50`. Se define también `hotpink=60` en la tabla de puntos aunque no se use en el nivel actual (queda disponible para specs futuros).
- Bloque gris indestructible: nunca se rompe, la bola siempre rebota, no otorga puntaje. Usa el sprite `block_gray` ya existente (`sx:32, sy:288`).
- Bloque marrón resistente: requiere 2 golpes para romperse. Al primer golpe cambia a un sprite "dañado" (grieta); al segundo golpe explota y desaparece. Otorga 50 puntos al romperse del todo (no otorga puntos en el golpe intermedio).
- Nuevas entradas en `SPRITES.blocks` para el sprite intacto (`wood`) y su variante dañada (`wood_cracked`), extraídas de `assets/spritesheet-breakout.png` (fila `sy:272`, columnas `sx:32` y `sx:64`).
- 3 bloques grises y 3 bloques marrones ubicados al azar entre las 50 celdas del grid 5x10, en reemplazo de 6 celdas que de otro modo serían de color. La posición se sortea de nuevo en cada `resetGame()`.
- Animación de explosión por color al romperse un bloque de color (`EXPLOSION_FRAMES[color]`), ya soportado individualmente por color en `assets/spritesheet.js`.
- Animación de explosión para el bloque marrón al romperse del todo, reutilizando `EXPLOSION_FRAMES.gray` (no hay frames de explosión dedicados para el sprite `wood` en el spritesheet).
- Ajuste de la condición de victoria para que ignore los bloques grises indestructibles (de lo contrario nunca se podría ganar).

**No incluye (fuera de este spec):**
- Bloques irrompibles/obstáculo en sus otras 2 variantes visuales del proveedor (`red-brick`, `dark-brick` en `sy:272`/`sy:288`, columna `sx:64` del color rojo y gris) — quedan como sprites sin usar para specs futuros.
- Distintos tamaños de bola o paleta.
- Shooters laterales en la paleta.
- Múltiples niveles, progresión de dificultad o editor de niveles.
- Sonido de rotura distinto por tipo de bloque.
- Persistencia de puntaje (highscores, localStorage).

## Modelo de datos

Extiende el modelo de SPEC 01/02, sin persistencia (memoria/variables JS):

- `bricks[i].type`: string, uno de `'red' | 'yellow' | 'cyan' | 'magenta' | 'green' | 'gray' | 'brown'`. Reemplaza el bloque único `gray` del MVP.
- `bricks[i].breakable`: booleano. `false` solo para `type === 'gray'`.
- `bricks[i].hitsRequired`: número de golpes para romperse. `1` para los 5 colores, `2` para `brown`, `Infinity` (o no aplica) para `gray`.
- `bricks[i].hitsTaken`: número, inicia en `0`, se incrementa en cada golpe válido.
- `bricks[i].alive`, `bricks[i].exploding`, `bricks[i].explodeStart`: igual que SPEC 02.
- `BLOCK_SCORES`: mapa constante `{ red: 10, yellow: 20, cyan: 30, magenta: 40, green: 50, hotpink: 60, brown: 50 }`, usado al incrementar `score`. `gray` no aparece (no otorga puntos).
- `SPRITES.blocks.wood` y `SPRITES.blocks.wood_cracked`: nuevas entradas en `assets/spritesheet.js` (`{ sx:32, sy:272, sw:32, sh:16 }` y `{ sx:64, sy:272, sw:32, sh:16 }`).

## Plan de implementación

1. En `assets/spritesheet.js`: agregar `wood` y `wood_cracked` a `SPRITES.blocks` con las coordenadas indicadas arriba.
2. En `game.js`, definir `BLOCK_SCORES` y las constantes de fila (`ROW_COLORS = ['red','yellow','cyan','magenta','green']`).
3. En `createBricks()`: para cada celda del grid 5x10, asignar `type` según `ROW_COLORS[row]`; luego sortear 6 índices distintos entre las 50 celdas y reasignarles `type = 'gray'` (3 de ellos) o `type = 'brown'` (los otros 3). Setear `breakable`, `hitsRequired`, `hitsTaken: 0` según el `type` resultante.
4. En la colisión bola-bloque (`updateBall`): si `brick.breakable === false` (gris), solo rebotar la bola, sin modificar `alive`/`hitsTaken`/`score`. Si es rompible, incrementar `hitsTaken`; si `hitsTaken < hitsRequired`, solo rebotar (sin destruir); si `hitsTaken >= hitsRequired`, destruir el bloque igual que en SPEC 02 (`alive=false`, `exploding=true`, `explodeStart`) y sumar `BLOCK_SCORES[brick.type]` a `score`.
5. En `draw()`: dibujar cada bloque vivo con `drawSprite(ctx, 'block_' + brick.type, ...)`, salvo el caso `brown` con `hitsTaken === 1` (tras su primer golpe, a la espera del segundo) que usa `drawSprite(ctx, 'block_wood_cracked', ...)`. Para bloques `exploding`, usar `EXPLOSION_FRAMES[brick.type]` si existe, o `EXPLOSION_FRAMES.gray` como fallback (caso `brown`).
6. Actualizar la condición de victoria (en `updateBall` y donde corresponda) a `bricks.filter(b => b.breakable).every(b => !b.alive)`, para que los bloques grises indestructibles no bloqueen la victoria.
7. Verificar que `resetGame()` vuelve a llamar `createBricks()` (nuevo sorteo de posiciones gris/marrón en cada partida) y reinicia `score` a 0, igual que SPEC 02.

## Criterios de aceptación

- [x] El grid muestra 5 filas de colores distintos (`red, yellow, cyan, magenta, green`), de arriba hacia abajo en ese orden.
- [x] Cada bloque de color se rompe en 1 golpe y suma el puntaje correspondiente a su color (`10/20/30/40/50`).
- [x] Hay exactamente 3 bloques grises y 3 marrones en el grid, en posiciones distintas en cada partida (tras reiniciar).
- [x] Un bloque gris nunca se rompe: la bola rebota indefinidamente y el puntaje no cambia al golpearlo.
- [x] Un bloque marrón necesita 2 golpes: tras el 1er golpe cambia visualmente a sprite dañado (grieta), y recién al 2do golpe explota, desaparece y suma 50 puntos.
- [x] Al romper un bloque de color, la explosión usa los frames de `EXPLOSION_FRAMES` de ese mismo color.
- [x] Al romper el bloque marrón, se ve una animación de explosión (reutilizando `EXPLOSION_FRAMES.gray`).
- [x] Es posible ganar la partida (romper todos los bloques rompibles) aunque los 3 bloques grises sigan intactos en el tablero.
- [x] El puntaje final mostrado en la pantalla de fin refleja la suma correcta de todos los bloques rompibles destruidos.
- [x] No hay sonido reproducido en ningún punto de esta funcionalidad (se mantiene la decisión de SPEC 02).

## Decisiones tomadas y descartadas

- **Solo bloques (colores + obstáculos) en este spec, sin tamaños de bola/paleta ni shooters:** esas features tocan dominios de decisión distintos (física de paleta, sistema de power-ups); quedan para specs futuros a pedido explícito del usuario tras aclarar el pedido original.
- **5 colores de fila en vez de 6:** el grid actual del MVP tiene 5 filas fijas; se deja `hotpink` definido en `BLOCK_SCORES` pero sin uso en el nivel actual, listo para un spec de niveles múltiples.
- **Gris permanentemente indestructible (no cuenta hits):** decisión explícita del usuario, más simple que un contador de golpes que nunca llega a 0.
- **Marrón con 2 golpes y un solo sprite intermedio "dañado":** el spritesheet solo trae un sprite intacto (`wood`) y uno agrietado (`wood_cracked`) por tipo de obstáculo (se verificó inspeccionando `assets/spritesheet-breakout.png`, fila `sy:272`); se ajustó de 3 a 2 golpes tras probar el juego, ya que con solo 2 estados visuales disponibles (intacto/agrietado) 3 golpes dejaban un golpe "invisible" sin cambio de sprite. Con 2 golpes: 1er golpe muestra agrietado, 2do golpe rompe.
- **Reutilizar `EXPLOSION_FRAMES.gray` para la explosión del bloque marrón:** no existen frames de explosión dedicados para el sprite `wood` en el spritesheet (las columnas de crumble solo se definieron para las filas de color 0-5); reutilizar `gray` evita agregar sprites nuevos que no provee el asset.
- **3 grises + 3 marrones, posiciones aleatorias por partida:** cantidad moderada elegida por el usuario para que se note la variedad sin dominar el nivel; el sorteo se repite en cada `resetGame()` para variar el layout entre partidas.
- **Puntaje escalonado 10-60 por color y 50 para el bloque marrón:** el usuario pidió puntaje distinto por color; se eligió una progresión simple y el marrón queda por encima del promedio de los bloques de 1 golpe para recompensar el esfuerzo de 3 impactos.
- **Las otras 2 variantes visuales de obstáculo del proveedor (`red-brick`, `dark-brick`) quedan sin usar:** el usuario solo pidió 2 tipos de comportamiento (indestructible y resistente a 3 golpes); no hay necesidad de un 3er/4to tipo de obstáculo en este spec.
