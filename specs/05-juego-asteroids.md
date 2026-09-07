# 05 — Juego Asteroids

**Estado:** Approved
**Depende de:** SPEC 01
**Fecha:** 2026-09-07

**Objetivo:** Portar el clon de Asteroids (`references/started-games/02-asteroids/game.js`) como el primer juego jugable real de la plataforma, montado en `/juegos/asteroids/jugar` con el HUD/pausa/modal ya existentes del reproductor.

## Alcance

**Incluye:**

- Renombrar la entrada `rocas` de `lib/data.ts` a `asteroids` (mismo slot conceptual: SHOOTER, "Pulveriza asteroides en gravedad cero"), sin duplicar.
- Motor del juego portado desde `game.js` casi tal cual (mismas clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, mismo loop, misma lógica de colisiones/spawns/power-ups: triple, nova, escudo, slow motion) a un módulo TS, con dos cambios estructurales:
  - Se elimina `drawHUD()` y `drawOverlay()` del canvas — el motor deja de dibujar texto.
  - El motor expone un callback `onStateChange(state)` (score, vidas, nivel, power-ups activos con su tiempo restante, cargas de nova, fase: `playing` | `dead` | `gameover`) que se invoca cuando esos valores cambian, para que React los renderice.
- Componente cliente que monta el `<canvas>`, arranca/limpia el loop (`requestAnimationFrame`) en `useEffect`, y traduce el `onStateChange` a estado React.
- `app/juegos/[id]/jugar/page.tsx` distingue `id === "asteroids"`: en ese caso, dentro de `crt-screen` se monta el canvas del motor real en vez del `game-arena` decorativo; se reutiliza el `player-hud` (jugador/score/vidas/nivel), el modal de fin de partida y `saveScore()` ya existentes. El botón "FIN" se oculta para este juego (el game over lo dispara el propio motor al perder la última vida, no un botón manual).
- Pausa: estado `paused` explícito dentro del motor (no solo `dt=0` en React) — el botón "PAUSA" del reproductor llama a un método del motor que detiene el loop de física/spawns pero mantiene el `requestAnimationFrame` de dibujo si hace falta para overlays; "REANUDAR" lo reactiva.
- Controles táctiles: 5 botones en pantalla (izquierda, derecha, propulsar, disparar, nova) visibles bajo el mismo breakpoint móvil ya usado en el proyecto, mapeados a las mismas teclas internas (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`, `KeyB`) para no duplicar lógica de input.
- Al llegar a `gameover`, se abre el modal existente del reproductor (mismo flujo: input de iniciales, `saveScore({ game: "asteroids", score, name })`, toast "PUNTUACIÓN GUARDADA").
- Detalle (`/juegos/asteroids`) sigue funcionando igual (leaderboard mock `seededScores`, CTA a jugar) — no requiere cambios de contenido más allá del rename del `id`.

**No incluye:**

- Cambiar el leaderboard de `/salon` o `/juegos/asteroids` para leer scores reales guardados — sigue usando `seededScores` mock (eso ya es así para todos los juegos desde spec 01).
- Onboarding/tutorial dentro del juego.
- Sonido/música.
- Ranking en vivo, multiplayer, o cualquier feature no presente en `game.js` original.
- Ajustar el motor para ser responsive: el canvas mantiene su relación interna 800×600 (`W`/`H` fijos en la lógica toroidal); se escala visualmente con CSS (`width: 100%; height: auto`) dentro del contenedor `crt-screen`, sin recalcular física por tamaño de pantalla.

## Modelo de datos

No se agregan tablas ni tipos de persistencia nuevos. Cambios:

```ts
// lib/data.ts — reemplaza el objeto "rocas" existente
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "Pulveriza asteroides en gravedad cero.",
  long: "Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Recoge power-ups: triple disparo, escudo, bomba nova y cámara lenta.",
  cat: "SHOOTER",
  cover: "cover-rocas", // se mantiene la clase CSS existente
  color: "yellow",
  best: 41200,
  plays: "15.6K",
}
```

```ts
// lib/games/asteroids/engine.ts (nuevo)
export type AsteroidsPhase = "playing" | "dead" | "gameover";

export interface AsteroidsPowerupStatus {
  triple: number; // segundos restantes, 0 = inactivo
  shield: number;
  slow: number;
  novaCharges: number;
}

export interface AsteroidsState {
  score: number;
  lives: number;
  level: number;
  phase: AsteroidsPhase;
  powerups: AsteroidsPowerupStatus;
}

export interface AsteroidsEngine {
  start(): void; // arranca el loop
  stop(): void; // cancela requestAnimationFrame, limpia listeners
  setPaused(paused: boolean): void;
  restart(): void; // reinicia partida (initGame())
}

export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  onStateChange: (state: AsteroidsState) => void,
): AsteroidsEngine;
```

## Plan de implementación

1. **`lib/data.ts`** — renombrar la entrada `rocas` a `asteroids` (mismo contenido salvo `id`, `title` y `long` ajustados). Verificar que no queda ninguna referencia a `id: "rocas"` en el proyecto.
2. **`lib/games/asteroids/engine.ts`** — portar `game.js`: clases y funciones internas iguales, pero:
   - Reemplazar `keys`/`justPressed` globales por listeners agregados/quitados dentro de `createAsteroidsEngine` (para poder limpiar en `stop()` y no pisar otras instancias si el usuario navega).
   - Quitar `drawHUD()` y `drawOverlay()` del `draw()` interno.
   - Agregar disparo de `onStateChange` en los puntos donde cambian `score`, `lives`, `level`, `ship.timers`, `ship.novaCharges` o `state` (reutilizar el `state` interno del original, renombrado `phase` en el objeto expuesto para no chocar con la palabra reservada de React).
   - Agregar `paused` interno: cuando es `true`, `update(dt)` no avanza física/spawns pero `draw()` sigue corriendo (para que el canvas no se congele en un frame roto tras resize).
   - Exponer los 5 inputs también como métodos (`pressLeft(down)`, `pressRight(down)`, `pressThrust(down)`, `shoot()`, `nova()`) que internamente setean las mismas banderas que el teclado, para que los botones táctiles reusen la lógica sin duplicarla.
3. **`components/games/AsteroidsGame.tsx`** (nuevo, `"use client"`) — monta `<canvas>`, en `useEffect` llama `createAsteroidsEngine(canvasRef.current, setEngineState)`, `.start()`; cleanup llama `.stop()`. Expone vía `ref`/props los métodos que el reproductor necesita: `pause()`, `resume()`, y renderiza los 5 botones táctiles debajo del canvas (ocultos en desktop vía CSS, igual breakpoint que el nav móvil).
4. **`app/juegos/[id]/jugar/page.tsx`** — cuando `game.id === "asteroids"`:
   - Sustituir el bloque `game-arena` decorativo por `<AsteroidsGame ... />`.
   - El `score`/`lives`/`level` del `player-hud` pasan a leerse del estado que emite el motor (vía `onStateChange`) en vez del `setInterval` mock.
   - Botón "PAUSA" llama al método de pausa del motor en vez de solo cambiar estado React.
   - Botón "FIN" se oculta para este juego (`game.id !== "asteroids"` para mostrarlo).
   - `over` (que abre el modal) pasa a activarse cuando `phase === "gameover"` viene del motor, no por click manual.
   - El resto de juegos (`bloque-buster`, `caida`, etc.) siguen usando el mock existente sin cambios.
5. **Verificación manual** — jugar una partida completa: mover/disparar/recibir power-ups/perder las 3 vidas, confirmar que aparece el modal con el score correcto y que `saveScore` persiste en `localStorage("av_scores")` con `game: "asteroids"`.

Cada paso deja el proyecto compilando y navegable.

## Criterios de aceptación

- [ ] `lib/data.ts` ya no tiene ningún objeto con `id: "rocas"`; existe uno con `id: "asteroids"`.
- [ ] `/juegos/asteroids` muestra el detalle correcto (título, descripción, leaderboard) y el CTA navega a `/juegos/asteroids/jugar`.
- [ ] En `/juegos/asteroids/jugar` se ve el canvas del juego real (nave, asteroides, disparo) en vez del `game-arena` decorativo.
- [ ] Teclado funciona igual que el original: `←`/`→` rota, `↑` propulsa, `Espacio` dispara, `B` detona nova si hay cargas.
- [ ] Los 5 botones táctiles (izq/der/propulsar/disparar/nova) aparecen en viewport móvil y controlan la nave igual que el teclado.
- [ ] `player-hud` (score, vidas, nivel) se actualiza en tiempo real reflejando el estado real del motor, no un mock.
- [ ] Power-ups (triple, nova, escudo, slow) se recogen, se activan visualmente en el HUD de la plataforma (no el HUD dibujado en canvas) y expiran correctamente.
- [ ] Botón "PAUSA" detiene la partida (asteroides/nave/spawns dejan de moverse) y "REANUDAR" la continúa sin perder estado.
- [ ] Al perder la tercera vida se abre automáticamente el modal de fin de partida existente, con el score final correcto.
- [ ] Guardar puntuación en el modal persiste en `localStorage("av_scores")` con `game: "asteroids"`.
- [ ] "JUGAR DE NUEVO" desde el modal reinicia una partida nueva del motor (no solo resetea el mock).
- [ ] Salir de la página (botón "SALIR" o navegación) detiene el loop del motor y remueve sus listeners de teclado (sin fugas al volver a entrar).
- [ ] Los demás juegos del catálogo (`bloque-buster`, `caida`, etc.) siguen mostrando el reproductor mock sin cambios de comportamiento.

## Decisiones tomadas y descartadas

- **Reuso de id existente:** se renombra `rocas` → `asteroids` en vez de crear una entrada duplicada, porque conceptualmente ya era el mismo juego (mismo cover, misma descripción corta). Descartado: mantener `rocas` como duplicado o placeholder separado.
- **Motor portado casi tal cual:** se mantiene la lógica interna de `game.js` (clases, física, colisiones, power-ups) en vez de reescribirla a hooks/estado React, para no reintroducir bugs en un motor ya balanceado y probado. Solo se le agrega un puente de salida (`onStateChange`) y se le quita el dibujo de texto/overlay.
- **HUD/pausa/modal de la plataforma:** se reutiliza el `player-hud`, los botones y el modal ya existentes del reproductor (spec 01) en vez de mantener el overlay dibujado en canvas del original — consistente con el resto del catálogo y evita HUD duplicado (uno en canvas, otro en React).
- **Pausa con estado explícito en el motor:** en vez de solo detener `requestAnimationFrame` desde React (`dt=0` externo), se agrega un flag `paused` dentro del motor para que `draw()` pueda seguir corriendo si se necesita (ej. redibujar tras resize) sin reanudar física por accidente.
- **Canvas no responsive en su lógica interna:** la física toroidal de `game.js` usa `W`/`H` fijos (800×600) en el cálculo de wrap; recalcular eso por tamaño de pantalla es un cambio de motor no trivial y fuera de alcance. Se escala solo visualmente con CSS.
- **Controles táctiles con botón nova incluido:** paridad completa con teclado (5 controles) en vez de solo movimiento/disparo, porque nova es parte del gameplay balanceado del original.
- **No se toca `/salon` ni el leaderboard de `seededScores`:** guardar scores reales sin conectarlos al ranking visible ya es el comportamiento actual de toda la plataforma (spec 01); cambiarlo es un scope aparte.
