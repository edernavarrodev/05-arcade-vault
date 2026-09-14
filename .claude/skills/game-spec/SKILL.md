---
name: game-spec
description: Diseñador de specs especializado en portar un nuevo juego a Arcade Vault desde references/started-games. Pregunta qué juego de referencia portar, qué id/slot de catálogo reusar o crear, y cómo se integra al registry de juegos. Produce un spec en el mismo formato que /spec. Usar antes de /game-impl (o vía /add-game, que orquesta ambos).
disable-model-invocation: true
argument-hint: "[carpeta de referencia bajo references/started-games, ej. 03-tetris]"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /game-spec — Diseñador de specs para portar juegos

## Contexto de sesión

Fecha de hoy (usarla en el header del spec, nunca inventarla):
!`date +%F`

Specs que ya existen:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe todavía"`

Juegos de referencia disponibles para portar:
!`ls references/started-games/ 2>/dev/null || echo "references/started-games/ no existe"`

Motores ya portados en el proyecto:
!`ls lib/games/ 2>/dev/null || echo "lib/games/ no existe todavía — este sería el primer porteo"`

Registry de juegos (si falta, el refactor de GamePlayer.tsx va como Paso 0 del plan generado):
!`ls lib/games/registry.ts 2>/dev/null || echo "lib/games/registry.ts no existe todavía — falta el refactor de registry"`

---

Este skill ayuda a producir un spec para portar un juego de `references/started-games/` a la plataforma real, siguiendo exactamente las mismas reglas que se usaron a mano para Asteroids (spec 05) y el sistema de leaderboard/tabla de juegos (spec 06). **Acá no se escribe código.** El trabajo es aclarar con el usuario qué juego portar, cómo mapea su estado al contrato genérico de la plataforma, y dejar un spec listo para `/game-impl`.

## Filosofía

Mismo principio que `/spec`: el spec es el contrato que guía la implementación después. Si queda ambiguo qué juego portar, cómo mapear vidas/nivel/victoria, o qué botones táctiles expone, esa ambigüedad se paga después en código. Por eso la Fase 2 es lenta y deliberada, y la Fase 3 es rápida una vez que la información está completa.

Leer `.claude/skills/spec/template.md` para la estructura general de 7 secciones — este skill la respeta, con contenido específico de porteo de juegos en cada una.

## Fase 1 — Entender el contexto

1. Leer `CLAUDE.md`/`AGENTS.md` del proyecto si existen.
2. Leer completos `specs/05-juego-asteroids.md` y `specs/06-leaderboard-y-tabla-de-juegos.md` — son el precedente exacto de tono, estructura y nivel de detalle que un spec de porteo de juego debe igualar. Ambos están en español y en estado `Implemented`.
3. Leer `supabase/migrations/20260911000000_games_and_scores.sql` para listar los `id`/`title`/`cat`/`color`/`cover` de los 8 juegos ya sembrados en la tabla `games`, y cruzar contra el listado de `lib/games/` (sesión de arriba) para ver cuáles de esos 8 ya tienen motor real (hoy: solo `asteroids`).
4. Si `$ARGUMENTS` trae una carpeta de `references/started-games/` (ej. `03-tetris`), leer su `game.js` completo de una vez para tener el control scheme, el modelo de estado y los mecanismos especiales a mano antes de preguntar.

## Fase 2 — Aclarar con preguntas

Preguntar en bloques de 3 a 5 vía `AskUserQuestion`. Esperar respuesta entre bloques.

**Bloque A — identidad y catálogo:**

1. ¿Qué carpeta de `references/started-games/` portar? Si `$ARGUMENTS` ya la trae, confirmarla en vez de volver a preguntar. Si hay que elegir, recomendar según complejidad ya conocida del proyecto:
   - `03-tetris`: sin condición de victoria, pero su HUD original es 100% DOM (score/líneas/nivel/pausa/records fuera del canvas) — requiere más trabajo de normalización para que quede canvas + HUD de React, igual que Asteroids.
   - `04-arkanoid`: tiene condición de victoria (todos los ladrillos rotos) que Asteroids/Tetris no tienen, y depende de un spritesheet externo (`assets/spritesheet.js`) en vez de ser vectorial puro.
2. ¿Qué id/slot de catálogo reusar? Mostrar los 6 slots sin motor (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`, con su `title`/`cat`/`color`/`cover` actuales leídos del seed) y recomendar el match temático más cercano: tetris → `caida` (ya es "PUZZLE"), arkanoid → `bloque-buster` (ya es "ARCADE"/rompe-bloques). Ofrecer "crear un id nuevo" como alternativa explícita.
3. Si se reusa un slot: ¿el contenido (`title`/`short`/`long`/`cover`/`color`) se mantiene igual (caso común, sin escritura a la base) o cambia (dispara una migración de `update`)?
4. Si es un id nuevo: pedir `title`, `short`, `long`, `cat` (debe ser uno de `CATS` en `lib/data.ts`), `color` (uno de `GameColor`), y clase CSS de `cover`.

**Bloque B — mapeo de estado (llena el contrato genérico):**

5. ¿Este juego tiene concepto de vidas? Si sí, ¿cómo las trackea el `game.js` original?
6. ¿Tiene un valor de "nivel" natural para pasarle a `saveScore`? Si no, confirmar que se use la constante `1`, o proponer una alternativa derivada (ej. oleada, líneas/10, etc.).
7. ¿Tiene una fase de "victoria" separada del game over (relevante hoy solo para arkanoid)?
8. Leer el `game.js` real del juego elegido y enumerar el set de controles táctiles real (no asumir el de 5 botones de asteroids — tetris necesita izq/der/rotar/soft-drop/hard-drop; arkanoid necesita izq/der/lanzar). Para cada acción, indicar si es "mantenida" (down/up/leave, como mover) o "instantánea" (solo down, como disparar).

**Bloque C — paths y refactor:**

9. Confirmar los paths derivados: `lib/games/<id>/engine.ts`, `components/games/<Pascal>Game.tsx`, tipo `<Pascal>State`, factory `create<Pascal>Engine(...)` (`<Pascal>` = el id sin guiones, cada segmento capitalizado — ej. `bloque-buster` → `BloqueBuster`).
10. Informar (no preguntar — se deriva del contexto de sesión) si hace falta el refactor de registry: si `lib/games/registry.ts` no existe todavía, el plan incluirá un Paso 0 que lo crea junto con `lib/games/types.ts` y refactoriza `GamePlayer.tsx`, antes de portar el juego nuevo.

**Cuándo parar de preguntar:** cuando se puedan responder sin asumir nada: (1) qué archivos van a aparecer o cambiar, (2) cuál es el primer y último paso ejecutable, (3) cómo se verifica que está terminado.

## Fase 3 — Escribir el spec

Igual que `/spec`: si ya hay toda la información (Bloques A-C completos sin ambigüedad), escribir el spec completo de una vez y pasar a Fase 4 sin pedir confirmación sección por sección. Si algo quedó vago, desarrollar sección por sección mostrando cada una y esperando confirmación.

Contenido de cada sección:

1. **Header**: mismo formato que specs 05/06 (`**Estado:** Draft`, `**Depende de:** SPEC 06` como mínimo — todo porteo depende del modelo de `games`/`scores` — más `SPEC 05` si el plan incluye el refactor de registry, ya que ese refactor toca `GamePlayer.tsx` introducido en spec 05).
2. **Alcance**: enumerar explícitamente el set de controles táctiles decidido en el Bloque B (mismo estilo que spec 05 lo hizo para Asteroids), y si el id de catálogo es un reuso-con-rename o una entrada nueva.
3. **Modelo de datos**:
   - Si `lib/games/registry.ts` no existe todavía: incluir literalmente las interfaces `GameComponentHandle`, `GameComponentProps<TState>`, `GameRegistryEntry<TState>` (ver forma exacta abajo).
   - Siempre incluir la firma exacta de `<Pascal>State`/`create<Pascal>Engine` del juego nuevo, con el mismo nivel de detalle que specs 05/06 usaron para `AsteroidsState`/`createAsteroidsEngine`.
   - Incluir el SQL de seed exacto (ver más abajo), o declarar explícitamente "no se requiere migración" si el slot reusado no cambia de contenido.
4. **Plan de implementación**, numerado, en este orden exacto:
   - **Paso 0** (solo si `lib/games/registry.ts` falta): crear `lib/games/types.ts` con las interfaces genéricas; crear `lib/games/registry.ts` registrando `asteroids` (extrayendo el bloque de powerups de `GamePlayer.tsx` líneas ~107-128 a un nuevo export `AsteroidsPowerupsHud` en `components/games/AsteroidsGame.tsx` — sin tocar `lib/games/asteroids/engine.ts`); refactorizar `components/games/GamePlayer.tsx` reemplazando `isAsteroids` por `getGameRegistryEntry(game.id)` en cada uno de sus 8 usos actuales (mock score/level, detección de gameover, `displayScore/Lives/Level`, pausa/restart, bloque de powerups, botón FIN, montaje canvas vs `game-arena`, título del modal). Verificación manual: Asteroids sigue funcionando exactamente igual que en spec 05.
   - Seed en `games`: no-op (slot sin cambios) o migración `insert`/`update` (ver SQL abajo), aplicada con `mcp__supabase__apply_migration` durante `/game-impl`.
   - Portar `lib/games/<id>/engine.ts` desde `references/started-games/<carpeta>/game.js`: mantener intacta la física/colisiones/puntaje, quitar cualquier dibujo de HUD/overlay en canvas y cualquier elemento DOM de score/pausa/records (igual que spec 05 quitó `drawHUD()`/`drawOverlay()`), reemplazar listeners de teclado globales por listeners agregados/quitados dentro del factory, agregar `onStateChange` que dispare solo en cambios, exponer `start/stop/setPaused/restart` más un método por cada control táctil del Bloque B.
   - Portar `components/games/<Pascal>Game.tsx`: `forwardRef` con el handle `GameComponentHandle`, monta el/los canvas necesarios (tetris necesita dos: tablero + preview de la siguiente pieza), botones táctiles exactos del Bloque B con el wiring mantenido/instantáneo que corresponda.
   - Agregar la entrada al registry (`getScore`/`getLevel`/`getLives`/`isOver`/`isWin`/`renderExtraHud` según lo definido en el Bloque B).
   - Verificación manual: teclado igual 1:1 al original, botones táctiles en viewport móvil, HUD de la plataforma actualizado en vivo, gameover (y victoria si aplica) abre el modal existente, `saveScore` persiste y aparece en `/salon`, el resto del catálogo sin motor sigue con el `game-arena` mock sin cambios.
5. **Criterios de aceptación**: checklist booleana calcada del estilo de spec 05, adaptada al id nuevo, incluyendo un ítem explícito de que los demás juegos mock no cambian de comportamiento.
6. **Decisiones tomadas y descartadas**: registrar la decisión de reuso de id vs id nuevo, el mapeo de vidas/nivel/victoria del Bloque B, y — si aplica — la justificación del refactor de registry (aislar el cambio de dispatch sin tocar `AsteroidsGame.tsx` ni su engine, mismo razonamiento que ya se usó para no reescribir el motor de Asteroids en spec 05).

### Formas exactas a embeber cuando el registry no existe todavía

```ts
// lib/games/types.ts
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
// lib/games/registry.ts
import type { GameRegistryEntry } from "@/lib/games/types";
import AsteroidsGame, { AsteroidsPowerupsHud } from "@/components/games/AsteroidsGame";
import type { AsteroidsState } from "@/lib/games/asteroids/engine";

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
};

export function getGameRegistryEntry(id: string) {
  return registry[id];
}
```

### SQL de seed — dos casos

**Caso A (común):** slot reusado sin cambios de contenido → sin migración. Declarar explícito en el spec: "No se requiere migración: el registro `<id>` ya existe en `games` con el contenido correcto."

**Caso B (id nuevo, o slot reusado con contenido distinto):**

```sql
-- supabase/migrations/<timestamp>_seed_<slug>.sql

insert into games (id, title, short, long, cat, cover, color, best, plays, dificultad)
values ('<id>', '<TITLE>', '<short>', '<long>', '<CAT>', '<cover-class>', '<color>', 0, 0, 1);

-- o, si se reusa un id existente con contenido nuevo:
update games
set title = '<TITLE>', short = '<short>', long = '<long>', cover = '<cover-class>', color = '<color>'
where id = '<id>';
```

Usar siempre el esquema post-`20260911010000_dynamic_game_stats.sql` (`plays bigint default 0`, `dificultad smallint default 1`) — nunca la forma obsoleta del seed original de spec 06 (`plays` como texto).

## Fase 4 — Guardar el spec

Misma mecánica que `.claude/skills/spec/SKILL.md` Fase 4:

1. Determinar el número siguiente a partir del listado de `specs/` de la sesión de arriba.
2. Generar un slug kebab-case a partir del objetivo (ej. `porteo-tetris-caida`).
3. Usar la fecha de la sesión de arriba.
4. Escribir el archivo directo en `specs/NN-slug.md`. No pedir permiso para escribirlo. Solo preguntar si el archivo destino ya existe.
5. Marcar el estado como `Draft`.
6. Si el header lista dependencias, verificar que cada spec referenciada exista en `specs/`.
7. Sembrar `specs/.spec-config.yml` con el contenido default si no existe (igual que `/spec`); si ya existe, no tocarlo.
8. Confirmar al usuario: path del archivo creado, recordatorio de que está en `Draft`, y próximo paso: `/game-impl NN-slug` una vez aprobado (o, si vino invocado desde `/add-game`, dejar que ese skill continúe el flujo).
9. **Parar acá.** No proponer implementar, no escribir código, no tomar ninguna acción más allá de esta confirmación.

## Reglas duras

- Nunca escribir código durante este skill — solo el archivo `.md` del spec al final.
- Nunca asumir decisiones que el usuario no confirmó en la Fase 2 — si falta información, preguntar.
- Nunca proponer implementar el spec después de guardarlo.
- Si `$ARGUMENTS` viene vacío, empezar preguntando directamente qué carpeta de `references/started-games/` portar (Bloque A, pregunta 1).
