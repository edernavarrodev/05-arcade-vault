# 07 — Porteo de Tetris

**Estado:** Implemented
**Depende de:** SPEC 05, SPEC 06
**Fecha:** 2026-09-12

**Objetivo:** Portar el clon de Tetris (`references/started-games/03-tetris/game.js`) como segundo juego jugable real de la plataforma, con un id de catálogo nuevo (`tetris`), montado en `/juegos/tetris/jugar` con el HUD/pausa/modal existentes del reproductor. Como parte de este porteo se generaliza `GamePlayer.tsx` a un registry de juegos (`lib/games/registry.ts`), en vez de seguir con el `if (game.id === "asteroids")` hardcodeado de spec 05.

## Alcance

**Incluye:**

- **Refactor de registry (Paso 0):** `lib/games/types.ts` con las interfaces genéricas `GameComponentHandle`, `GameComponentProps<TState>`, `GameRegistryEntry<TState>`; `lib/games/registry.ts` registrando `asteroids` (motor existente sin tocar) y `tetris` (motor nuevo). `components/games/GamePlayer.tsx` deja de usar `isAsteroids`/`game.id === "asteroids"` en sus 8 puntos actuales (mock score/level, detección de gameover, `displayScore/Lives/Level`, pausa/restart, bloque de powerups, botón FIN, montaje canvas vs `game-arena`, título del modal) y despacha todo vía `getGameRegistryEntry(game.id)`.
- Nueva entrada de catálogo `tetris` en la tabla `games` (id nuevo, no reusa el slot `caida`): `title: "TETRIS"`, `short: "Encaja piezas antes de que el techo te aplaste."`, `long: "Piezas geométricas caen sin descanso. Rótalas y encástralas para limpiar líneas. La velocidad sube cada 10 líneas, sin piedad."`, `cat: "PUZZLE"`, `cover: "cover-tetris"` (clase nueva), `color: "cyan"` (color de la pieza I, la más icónica de Tetris).
- Motor del juego portado desde `game.js` casi tal cual (mismas piezas/rotación con kicks/colisión/clear de líneas/scoring por líneas y soft/hard drop) a un módulo TS, con estos cambios estructurales:
  - Se elimina todo el HUD/overlay DOM del original (`scoreEl`, `linesEl`, `levelEl`, `overlay`, `pauseMenu`, `controlsPanel`, panel de records, selector de skin/tema, selector de nivel inicial) — el motor deja de tocar el DOM fuera de los dos `<canvas>`.
  - Se fija un único skin (`retro`, el que ya calza con la estética CRT de la plataforma) y un único tema oscuro — sin selector.
  - Se elimina el sistema de records en `localStorage` (`tetris-records`) — el leaderboard real ya lo cubre spec 06 vía `saveScore`/`/salon`.
  - **Fin de partida fiel al original — una sola vida:** el juego mantiene el comportamiento 1:1 del original (`endGame()`): cuando una pieza nueva no puede spawnear, se dispara `phase: "gameover"` de inmediato. `TetrisState.lives` existe igual (con valor `1`, luego `0` al terminar) solo para reusar el mismo patrón de `player-hud` que ya usa `AsteroidsState.lives` (un corazón visible mientras se juega); no hay descuento progresivo ni continuidad tras perder.
  - El motor expone `onStateChange(state)` (score, líneas, nivel, vidas restantes, fase: `playing` | `gameover`, y `paused` — ver abajo) que se invoca cuando esos valores cambian.
  - `paused` se agrega como campo explícito de `TetrisState` (a diferencia de `AsteroidsState`) porque el original tiene atajos de teclado propios de pausa (`KeyP`/`Escape`) además del control externo — se necesita sincronizar el botón "PAUSA" del reproductor con ese estado interno.
- Componente cliente `TetrisGame.tsx` que monta **dos** `<canvas>` (tablero 10×20 y preview de la siguiente pieza 4×4), arranca/limpia el loop en `useEffect`, traduce `onStateChange` a estado React, expone `GameComponentHandle` (`pause`/`resume`/`restart`).
- Nivel para `saveScore`: se usa el nivel natural del motor (`level = Math.floor(lines / 10) + 1`, igual que el original), que alimenta `games.dificultad` vía `clamp(level, 1, 5)` (spec 06).
- Sin condición de victoria — igual que Asteroids, solo hay `gameover`.
- Controles de teclado, idénticos al original: `←`/`→` mueve (auto-repeat de SO al mantener, igual que hoy), `↓` soft drop (auto-repeat), `↑`/`X` rota (instantáneo, con wall-kicks `[0,-1,1,-2,2]`), `Espacio` hard drop (instantáneo).
- Controles táctiles: 5 botones en pantalla (izquierda, derecha, rotar, soft drop, hard drop), visibles bajo el mismo breakpoint móvil ya usado en el proyecto:
  - Izquierda, derecha y soft drop son **mantenidos**: el motor implementa un repeat interno mientras el botón está presionado (movimiento inmediato al presionar + repetición periódica mientras se sostiene), imitando el auto-repeat de teclado del original.
  - Rotar y hard drop son **instantáneos**: un solo tap dispara la acción una vez, sin repetición.
- Al llegar a `gameover` (topar la pila), se abre el modal existente del reproductor: input de iniciales, `saveScore({ game: "tetris", score, name, level })`, toast "PUNTUACIÓN GUARDADA".
- Detalle (`/juegos/tetris`) funciona con el patrón ya existente (Server Component + `getGame`/`getTopScores` de spec 06) sin cambios de código adicionales — solo requiere que la fila exista en `games`.

**No incluye:**

- Selector de skin/tema, panel de controles colapsable, selector de nivel inicial, sistema de records en `localStorage` — todo eso queda descartado del original (reemplazado por el leaderboard real de spec 06 o directamente fuera de alcance).
- Combo/máx-combo — se calculaban solo para el panel de records descartado; no se persisten en ningún lado.
- Onboarding/tutorial, sonido/música, multiplayer.
- Hacer el motor responsive: el tablero mantiene su tamaño interno fijo (10×20 celdas de `BLOCK` px); se escala visualmente con CSS dentro de `crt-screen`, igual criterio que Asteroids en spec 05.
- Cambiar el leaderboard de `/salon` o el flujo de `/juegos/[id]` — ya leen de Supabase desde spec 06, sin cambios adicionales necesarios para soportar un id de juego nuevo.
- Migrar `bloque-buster`, `arkanoid` u otros juegos sin motor — quedan con el `game-arena` mock, sin cambios de comportamiento.

## Modelo de datos

```ts
// lib/games/types.ts (nuevo)
import type { ComponentType, ReactNode, Ref } from "react";

export interface GameComponentHandle {
  pause(): void;
  resume(): void;
  restart(): void;
}

export interface GameComponentProps<TState> {
  onStateChange: (state: TState) => void;
}

export interface GameRegistryEntry<TState = unknown> {
  Component: ComponentType<GameComponentProps<TState> & { ref?: Ref<GameComponentHandle> }>;
  hasLives: boolean;
  getScore: (state: TState) => number;
  getLevel: (state: TState) => number;
  getLives?: (state: TState) => number;
  isOver: (state: TState) => boolean;
  isWin?: (state: TState) => boolean;
  renderExtraHud?: (state: TState) => ReactNode;
}
```

```ts
// lib/games/registry.ts (nuevo)
import type { GameRegistryEntry } from "@/lib/games/types";
import AsteroidsGame, { AsteroidsPowerupsHud } from "@/components/games/AsteroidsGame";
import type { AsteroidsState } from "@/lib/games/asteroids/engine";
import TetrisGame from "@/components/games/TetrisGame";
import type { TetrisState } from "@/lib/games/tetris/engine";

const registry: Record<string, GameRegistryEntry<any>> = {
  asteroids: {
    Component: AsteroidsGame,
    hasLives: true,
    getScore: (s: AsteroidsState) => s.score,
    getLevel: (s: AsteroidsState) => s.level,
    getLives: (s: AsteroidsState) => s.lives,
    isOver: (s: AsteroidsState) => s.phase === "gameover",
    renderExtraHud: (s: AsteroidsState) => AsteroidsPowerupsHud({ state: s }),
  },
  tetris: {
    Component: TetrisGame,
    hasLives: true,
    getScore: (s: TetrisState) => s.score,
    getLevel: (s: TetrisState) => s.level,
    getLives: (s: TetrisState) => s.lives,
    isOver: (s: TetrisState) => s.phase === "gameover",
  },
};

export function getGameRegistryEntry(id: string) {
  return registry[id];
}
```

```ts
// lib/games/tetris/engine.ts (nuevo)
export type TetrisPhase = "playing" | "gameover";

export interface TetrisState {
  score: number;
  lines: number;
  level: number;
  lives: number;
  phase: TetrisPhase;
  paused: boolean;
}

export interface TetrisEngine {
  start(): void; // arranca el loop
  stop(): void; // cancela requestAnimationFrame, limpia listeners
  setPaused(paused: boolean): void;
  restart(): void; // reinicia partida completa (init(), 1 vida, score 0)
  moveLeft(down: boolean): void; // down=true mantiene, repite; down=false suelta
  moveRight(down: boolean): void;
  softDrop(down: boolean): void;
  rotate(): void; // instantáneo
  hardDrop(): void; // instantáneo
}

export function createTetrisEngine(
  canvas: HTMLCanvasElement,
  nextCanvas: HTMLCanvasElement,
  onStateChange: (state: TetrisState) => void,
): TetrisEngine;
```

```sql
-- supabase/migrations/20260912000000_seed_tetris.sql (nuevo)

insert into games (id, title, short, long, cat, cover, color, best, plays, dificultad)
values (
  'tetris',
  'TETRIS',
  'Encaja piezas antes de que el techo te aplaste.',
  'Piezas geométricas caen sin descanso. Rótalas y encástralas para limpiar líneas. La velocidad sube cada 10 líneas, sin piedad.',
  'PUZZLE',
  'cover-tetris',
  'cyan',
  0,
  0,
  1
);
```

## Plan de implementación

1. **Paso 0 — Refactor de registry:**
   - Crear `lib/games/types.ts` con `GameComponentHandle`/`GameComponentProps`/`GameRegistryEntry` (forma exacta arriba).
   - Extraer el bloque de powerups de `GamePlayer.tsx` (líneas ~107-128) a un nuevo export `AsteroidsPowerupsHud` en `components/games/AsteroidsGame.tsx`, sin tocar `lib/games/asteroids/engine.ts`.
   - Crear `lib/games/registry.ts` registrando solo `asteroids` por ahora (la entrada `tetris` se agrega en el paso 6, una vez exista el motor).
   - Refactorizar `components/games/GamePlayer.tsx`: reemplazar `isAsteroids`/`game.id === "asteroids"` por `getGameRegistryEntry(game.id)` en sus 8 usos actuales.
   - Verificación manual: Asteroids sigue funcionando exactamente igual que en spec 05 (mover/disparar/power-ups/perder vidas/gameover/guardar score).
2. **Migración `supabase/migrations/20260912000000_seed_tetris.sql`** — insertar la fila `tetris` en `games` (SQL exacto arriba). Aplicar con `mcp__supabase__apply_migration`. Verificar con `list_tables`/query que la fila existe con los valores correctos.
3. **`lib/games/tetris/engine.ts`** — portar `game.js`:
   - Mantener intactas las funciones de física/reglas: `createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate` (con los mismos wall-kicks), `merge`, `clearLines`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`, el cálculo de `dropInterval`/`level` y el scoring (`LINE_SCORES`, +1 por soft drop, +2×celdas por hard drop).
   - Quitar todo el código de DOM/HUD/overlay/records/skins/tema — el motor solo dibuja en los dos canvas que recibe.
   - Fijar skin `retro` y tema oscuro sin selector (usar directamente `COLORS` del original para `drawBlockRetro`).
   - Reemplazar el listener global de `keydown` por listeners agregados/quitados dentro de `createTetrisEngine` (limpiables en `stop()`).
   - `lives` interno arranca en `1`; en el punto donde `spawn()` detecta `collide(...)` (el mismo punto donde el original llama `endGame()`), fijar `lives = 0` y `phase: "gameover"` de inmediato — sin descuento progresivo ni limpieza de tablero, fiel al original.
   - Agregar `paused` interno con los mismos triggers que el original (`KeyP`/`Escape` vía teclado, más el método `setPaused` externo) — cuando es `true`, el loop de caída/física no avanza pero el estado se sigue exponiendo.
   - Exponer `moveLeft(down)`/`moveRight(down)`/`softDrop(down)` con repeat interno (mueve inmediato al pasar a `true`, y repite en un intervalo interno mientras siga `true`) y `rotate()`/`hardDrop()` instantáneos — todos setean/leen las mismas banderas que usan los listeners de teclado, sin duplicar lógica.
   - Disparar `onStateChange` en los puntos donde cambian `score`, `lines`, `level`, `lives`, `phase` o `paused`.
4. **`components/games/TetrisGame.tsx`** (nuevo, `"use client"`) — `forwardRef<GameComponentHandle, GameComponentProps<TetrisState>>`, monta el `<canvas>` del tablero y el `<canvas>` de "siguiente pieza", en `useEffect` llama `createTetrisEngine(boardCanvasRef.current, nextCanvasRef.current, onStateChange)` y `.start()`; cleanup llama `.stop()`. El handle expone `pause()`/`resume()` (delegan a `setPaused`) y `restart()`. Renderiza los 5 botones táctiles debajo del canvas (mismo breakpoint móvil que `AsteroidsGame.tsx`), con izquierda/derecha/soft-drop usando `onPointerDown`/`onPointerUp`/`onPointerLeave` para el patrón mantenido, y rotar/hard-drop usando `onClick` para el patrón instantáneo.
5. **`lib/games/registry.ts`** — agregar la entrada `tetris` (forma exacta arriba: `hasLives: true`, sin `renderExtraHud`, sin `isWin`).
6. **Verificación manual** — entrar a `/juegos/tetris/jugar`: jugar con teclado (mover/rotar/soft drop/hard drop, ver el preview de la siguiente pieza), toparse la pila y confirmar que se abre de inmediato el modal de fin de partida con el score correcto; repetir el flujo básico con los 5 botones táctiles en viewport móvil; guardar el score y confirmar que aparece en `/salon` bajo el tab de Tetris; confirmar que Asteroids y el resto del catálogo mock siguen sin cambios de comportamiento.

Cada paso deja el proyecto compilando y navegable.

## Criterios de aceptación

- [x] `lib/games/types.ts` y `lib/games/registry.ts` existen; `GamePlayer.tsx` no tiene ninguna referencia a `isAsteroids` ni a `game.id === "asteroids"` — todo pasa por `getGameRegistryEntry`.
- [x] Asteroids sigue funcionando exactamente igual que en spec 05 tras el refactor de registry (regresión cero).
- [x] La tabla `games` tiene una fila `id = "tetris"` con `title`/`short`/`long`/`cat`/`cover`/`color` correctos y `best`/`plays` en `0`, `dificultad` en `1`.
- [x] `/juegos/tetris` muestra el detalle correcto (título, descripción, leaderboard real vía `getTopScores`) y el CTA navega a `/juegos/tetris/jugar`.
- [x] En `/juegos/tetris/jugar` se ve el canvas del tablero (10×20) y el canvas de la siguiente pieza, en vez del `game-arena` decorativo.
- [x] Teclado funciona igual que el original: `←`/`→` mueve, `↓` soft drop, `↑`/`X` rota con wall-kicks, `Espacio` hard drop.
- [x] Los 5 botones táctiles (izq/der/rotar/soft-drop/hard-drop) aparecen en viewport móvil; izq/der/soft-drop repiten mientras se mantienen presionados, rotar/hard-drop actúan una sola vez por tap.
- [x] `player-hud` (score, vidas, nivel) se actualiza en tiempo real reflejando el estado real del motor.
- [x] Al toparse la pila (una pieza nueva no puede spawnear) se abre automáticamente el modal de fin de partida existente, con el score final correcto — sin descuento de vidas ni continuidad, igual que el original.
- [x] Botón "PAUSA"/"REANUDAR" del reproductor funciona, y queda sincronizado si el jugador usa `KeyP`/`Escape` del teclado original.
- [x] Guardar puntuación en el modal persiste en la tabla `scores` con `game_id: "tetris"` y el `level` alcanzado (que a su vez actualiza `games.dificultad`/`best`/`plays` de `tetris` vía spec 06).
- [x] El score guardado aparece en `/salon` bajo el tab de Tetris.
- [x] "JUGAR DE NUEVO" desde el modal reinicia una partida nueva completa (1 vida, score/líneas/nivel en cero).
- [x] Salir de la página detiene el loop del motor y remueve sus listeners de teclado, sin fugas al volver a entrar.
- [x] Los demás juegos del catálogo sin motor (`bloque-buster`, `caida`, etc.) siguen mostrando el reproductor mock sin cambios de comportamiento.

## Decisiones tomadas y descartadas

- **Id de catálogo nuevo (`tetris`) en vez de reusar `caida`:** el usuario decidió explícitamente no reusar el slot `caida` (que hoy ya representa un juego temáticamente similar) para no perder esa entrada del catálogo mock/seed original; se crea una fila nueva en `games`. Descartado: renombrar/actualizar `caida` como se hizo con `rocas → asteroids` en spec 05.
- **`color: "cyan"`:** `GameColor` solo admite 4 valores (`cyan`/`magenta`/`yellow`/`green`); se eligió `cyan` por ser el color de la pieza I, la más icónica del juego, en vez de `magenta` (que ya usa `caida`) para reforzar que es una entrada de catálogo independiente.
- ~~**Sistema de 3 vidas en vez del "fin instantáneo" del original:** decisión explícita del usuario, aparta este porteo del comportamiento 1:1 que sí se siguió en spec 05 para Asteroids.~~ **Revertido durante la implementación (2026-09-14):** tras probar la versión de 3 vidas, el usuario pidió volver a una sola vida, fiel al `endGame()` instantáneo del original. `TetrisState.lives` se conserva igual (arranca en `1`, pasa a `0` en gameover) únicamente para reusar el mismo patrón de `player-hud` que ya usa `AsteroidsState.lives`, no como mecánica de vidas real.
- ~~**Al perder una vida se limpia el tablero pero se conserva score/líneas/nivel:**~~ **Revertido junto con el punto anterior:** al quedar en una sola vida, ya no existe la situación de "perder una vida y continuar" — el `gameover` es directo, sin limpieza de tablero intermedia.
- **Se elimina el sistema de records en `localStorage` del original:** redundante con el leaderboard real de Supabase (spec 06); mantenerlo hubiera dejado dos rankings paralelos y desincronizados, mismo razonamiento que ya se aplicó para no mezclar `seededScores` con datos reales.
- **Un solo skin/tema fijo, sin selectores:** el original expone selectores de skin (`retro`/`neon`/`pastel`/`pixel`) y tema claro/oscuro pensados para una página standalone; la plataforma ya tiene su propia identidad visual (`crt-screen` oscuro), así que se fija `retro` + tema oscuro y se descartan los selectores, igual criterio que spec 05 aplicó al quitar el HUD dibujado en canvas de Asteroids.
- **`paused` como campo explícito de `TetrisState` (a diferencia de `AsteroidsState`):** necesario porque el original de Tetris tiene atajos de teclado propios de pausa (`KeyP`/`Escape`) que deben quedar sincronizados con el botón "PAUSA" del reproductor; Asteroids no tenía ese atajo nativo por lo que no lo necesitó en spec 05.
- **Refactor de registry como Paso 0, en la misma spec en vez de una spec aparte:** el registry es un prerrequisito estructural para agregar un segundo motor sin seguir apilando `if (game.id === ...)` en `GamePlayer.tsx`; se decidió incluirlo aquí (siguiendo el criterio ya anotado en la sesión de `/add-game`) en vez de abrir una spec de refactor separada, porque no tiene valor por sí solo sin un segundo juego que lo motive.
- **Controles táctiles con semántica mixta (mantenido vs. instantáneo) en vez de todo instantáneo:** se prioriza fidelidad con el auto-repeat de teclado del original (mover/soft-drop se sienten iguales en móvil que en desktop) sobre la simplicidad de implementar los 5 botones de forma uniforme.

### Nota de implementación: bug encontrado y corregido durante la verificación (2026-09-14)

Durante la verificación manual del criterio de pausa se detectó que el botón "PAUSA"/"REANUDAR" de `GamePlayer.tsx` no reflejaba la pausa disparada por `KeyP`/`Escape` desde dentro del motor de Tetris: el motor sí congelaba el tablero, pero el botón seguía mostrando "PAUSA" (desincronizado), porque `GamePlayer.tsx` nunca leía `engineState.paused`. Se agregó un `useEffect` que sincroniza el `paused` de React con `engineState.paused` cuando el campo existe en el estado del juego activo (mismo patrón ya usado para `entry.isOver(engineState)`). Este efecto es un no-op para Asteroids, cuyo `AsteroidsState` no tiene campo `paused`. Verificado en el navegador: el botón ahora cambia a "REANUDAR" y muestra el overlay "EN PAUSA" correctamente al pausar por teclado.

Nota aparte: la presencia de los 5 botones táctiles y su breakpoint (`@media (max-width: 840px)`) se verificaron por código/DOM (clase `.tetris-touch-controls` presente, mismo patrón CSS que `.asteroids-touch-controls` ya en producción desde spec 05) — el entorno de pruebas no permitió reducir el viewport real por debajo de 840px para una captura visual en modo móvil.

También se detectó, en una segunda pasada de verificación, que el cover art de `tetris` (miniatura en Biblioteca y cabecera de `/juegos/tetris`) se veía como un recuadro negro vacío: el seed usaba `cover: "cover-tetris"` pero esa clase CSS nunca se definió en `app/globals.css` (el resto del catálogo la define en la sección "Cover art generators (pure CSS)" — `cover-bricks`, `cover-tetro`, `cover-rocas`, etc.). Se agregó `.cover-tetris` siguiendo el mismo patrón (gradiente de fondo + pseudo-elemento `::after` con bloques CSS), representando una pieza I cyan cayendo sobre una pila de bloques amarillo/magenta/verde. Verificado visualmente en `/`, `/juegos/tetris` y la Biblioteca.
