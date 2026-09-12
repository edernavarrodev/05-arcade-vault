# 06 — Leaderboard y tabla de juegos

**Estado:** Implemented
**Depende de:** SPEC 01, SPEC 04
**Fecha:** 2026-09-11

**Objetivo:** Reemplazar el catálogo de juegos (`lib/data.ts`) y el leaderboard mock (`seededScores`) por tablas reales en Supabase (`games`, `scores`), con lectura pública y guardado de puntuaciones reales sin autenticación.

> **Ampliación (post-implementación inicial, 2026-09-11):** durante la verificación manual se detectó que `games.best`/`games.plays` y la estrellas de "dificultad" del detalle quedaban desalineados de los scores reales (ej. mostraban `41.200`/`15.6K` del seed mock aunque solo había 1 score real guardado). Se decidió calcular y persistir estos contadores en `games` en cada guardado de score, en vez de dejarlos como valores estáticos del seed. Ver secciones actualizadas abajo.

## Alcance

**Incluye:**

- Tabla `games` en Supabase con los mismos campos que la interfaz `Game` actual (id, title, short, long, cat, cover, color, best, plays), poblada con seed 1:1 del array `GAMES` existente.
- Tabla `scores` en Supabase (id, game_id FK a games, name, score, created_at), reemplazando `localStorage("av_scores")`.
- RLS en ambas tablas: `SELECT` público (anon) sin restricción. `INSERT` público en `scores` sin restricción (sigue sin auth real, cualquiera guarda su score con nombre libre). Sin políticas de `UPDATE`/`DELETE` desde el cliente.
- Migración SQL versionada en `supabase/migrations/`.
- `lib/supabase/queries.ts` (nuevo): funciones de lectura (`getGames()`, `getGame(id)`, `getTopScores(gameId, limit)`) usando los clientes server/browser existentes de spec 04.
- `lib/scores.ts` — `saveScore()` pasa de síncrono (localStorage) a async, hace `insert` en la tabla `scores`.
- `app/page.tsx` — se separa en Server Component (fetch de `getGames()`) + Client Component nuevo (`components/HomeClient.tsx`) que recibe `games` por props y conserva la lógica actual (`useReveal`, filtros de categoría).
- `app/juegos/[id]/page.tsx` — sigue siendo Server Component; cambia `GAMES.find(...)` por `getGame(id)` y `seededScores(...)` por `getTopScores(id, 10)`. `generateStaticParams` usa `getGames()`.
- `app/juegos/[id]/jugar/page.tsx` — se separa en Server Component (fetch de `getGame(id)`, `notFound()` si no existe) + Client Component nuevo (`components/games/GamePlayer.tsx`, contenido actual del archivo) que recibe `game` por props. `saveScore()` ahora es async: botón de guardar muestra "GUARDANDO..." mientras corre el insert, y un mensaje de error con opción de reintentar si falla.
- `app/salon/page.tsx` — recibe `games` inicial del servidor (mismo patrón que home); el ranking por juego (podio + tabla) se resuelve con `getTopScores(gameId, 12)` vía fetch client-side (Supabase browser client) cada vez que cambia el tab seleccionado, con estado de carga mientras llega.
- Se elimina `seededScores` de `lib/data.ts` (ya no se usa en ningún lado tras esta spec).
- **(Ampliación)** Columna `scores.level` (nivel/dificultad alcanzado en esa partida, se guarda junto al score).
- **(Ampliación)** Columna `games.dificultad` (smallint 1-5) además de `best`/`plays`.
- **(Ampliación)** `saveScore()` recalcula y persiste en `games`, tras cada insert en `scores`: `plays` = `COUNT(*)` de scores de ese juego, `best` = `MAX(score)` de ese juego, `dificultad` = `clamp(level, 1, 5)` del score recién guardado (el último nivel jugado, no un promedio).
- **(Ampliación)** RLS: `UPDATE` público (anon, sin restricción) en `games` — mismo criterio de "sin auth real" ya aceptado para el `INSERT` público de `scores`.
- **(Ampliación)** `app/juegos/[id]/page.tsx` renderiza `game.plays`/`game.best` (ahora numéricos, ya no mock) y las estrellas de dificultad dinámicas desde `game.dificultad` en vez del `★ ★ ★ ☆ ☆` hardcodeado.

**No incluye:**

- Autenticación real. Se mantiene el mock `av_user` de `localStorage` (spec 04); el guardado de score sigue con nombre/iniciales libres, sin relacionar con un usuario autenticado.
- Migrar los scores que ya existen en `localStorage("av_scores")` de partidas jugadas antes de esta spec — se descartan, la tabla `scores` arranca vacía.
- ~~Columnas `best`/`plays` calculadas en vivo desde `scores` — quedan como columnas estáticas en `games`, igual que hoy.~~ **Revertido por la ampliación**: ahora se recalculan y persisten en cada guardado (ver arriba).
- Recalcular `dificultad` como agregación estadística sobre todos los scores (ej. desviación estándar) — se usa el nivel del último score guardado, no una fórmula estadística. Queda como posible mejora futura.
- RLS granular por usuario (rate limiting, anti-cheat de scores, validación de rangos de puntaje) — cualquier mejora de seguridad sobre el `INSERT`/`UPDATE` público queda para otra spec.
- Restringir el `UPDATE` público de `games` a solo las columnas `best`/`plays`/`dificultad` (vía función RPC `SECURITY DEFINER` u otro mecanismo de columna) — se acepta el riesgo de que cualquier cliente anónimo pueda reescribir cualquier columna de `games` (título, cover, etc.) vía la API pública, igual que ya se acepta para el `INSERT` sin restricción de `scores`.
- Edición/administración del catálogo de juegos (CRUD de `games`) — la tabla se llena solo por el seed de esta spec.
- Realtime en el leaderboard (actualización en vivo sin recargar) — spec 04 ya dejó Realtime fuera de alcance.

## Modelo de datos

```sql
-- supabase/migrations/20260911000000_games_and_scores.sql

create table games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null,
  cover text not null,
  color text not null,
  best bigint not null default 0,
  plays text not null default '0'
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id),
  name text not null,
  score bigint not null,
  created_at timestamptz not null default now()
);

create index scores_game_id_score_idx on scores (game_id, score desc);

alter table games enable row level security;
alter table scores enable row level security;

create policy "games_public_read" on games for select using (true);
create policy "scores_public_read" on scores for select using (true);
create policy "scores_public_insert" on scores for insert with check (true);

insert into games (id, title, short, long, cat, cover, color, best, plays) values
  ('bloque-buster', 'BLOQUE BUSTER', ..., ..., 'ARCADE', 'cover-bricks', 'cyan', 28450, '12.4K'),
  -- ... resto de las 8 entradas actuales de GAMES, 1:1
  ;
```

```sql
-- supabase/migrations/20260911010000_dynamic_game_stats.sql (Ampliación)

alter table games add column dificultad smallint not null default 1;

-- plays pasa de texto mock ("12.4K") a contador real; se resetea a 0
-- porque el valor de texto no es convertible y ya no representa datos reales.
alter table games alter column plays drop default;
alter table games alter column plays type bigint using 0;
alter table games alter column plays set default 0;

-- best también se resetea: ya no es el mock, se recalcula desde scores reales.
update games set best = 0;

alter table scores add column level integer not null default 1;

create policy "games_public_update" on games for update using (true) with check (true);
```

```ts
// lib/supabase/queries.ts (nuevo)
import type { Game } from "@/lib/data"; // tipos se conservan, solo cambia el origen del dato

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // created_at formateado
}

export async function getGames(): Promise<Game[]>;
export async function getGame(id: string): Promise<Game | null>;
export async function getTopScores(gameId: string, limit: number): Promise<ScoreRow[]>;
```

```ts
// lib/scores.ts — firma nueva (Ampliación: agrega `level`)
export async function saveScore(entry: {
  game: string;
  score: number;
  name: string;
  level: number;
}): Promise<void>;
// Además del insert en `scores`, recalcula y hace update en `games`:
//   plays = COUNT(*) scores del juego
//   best = MAX(score) scores del juego
//   dificultad = clamp(entry.level, 1, 5)
```

## Plan de implementación

1. **Migración SQL** — crear `supabase/migrations/20260911000000_games_and_scores.sql` con las tablas, índice, RLS policies y el seed de las 8 entradas actuales de `GAMES` (copiadas tal cual desde `lib/data.ts`). Aplicar con `mcp__supabase__apply_migration`. Verificar con `list_tables` que ambas existen con RLS activo.
2. **`lib/supabase/queries.ts`** (nuevo) — `getGames()`, `getGame(id)` (usa el server client de spec 04), `getTopScores(gameId, limit)` (order by score desc, limit N, mapea a `ScoreRow` con `rank` calculado y `date` formateada).
3. **`lib/scores.ts`** — `saveScore()` async, hace `insert` en `scores` vía el client de browser (Client Components llaman `saveScore` desde el navegador).
4. **`lib/data.ts`** — se queda solo con los tipos (`Game`, `GameCategory`, `GameColor`) y se elimina el array `GAMES` y la función `seededScores`.
5. **`app/page.tsx`** → Server Component: `const games = await getGames()`, renderiza `<HomeClient games={games} />`. **`components/HomeClient.tsx`** (nuevo, `"use client"`) — contenido actual de `app/page.tsx` (hooks `useReveal`, filtros, JSX), recibiendo `games` por props en vez de importar `GAMES`.
6. **`app/juegos/[id]/page.tsx`** — `generateStaticParams` usa `(await getGames()).map(...)`; body usa `getGame(id)` y `getTopScores(id, 10)` en vez de `GAMES.find` / `seededScores`.
7. **`app/juegos/[id]/jugar/page.tsx`** → Server Component: `const game = await getGame(id); if (!game) notFound();`, renderiza `<GamePlayer game={game} />`. **`components/games/GamePlayer.tsx`** (nuevo, `"use client"`) — contenido actual del archivo (estado de score/lives/paused/over, integración con `AsteroidsGame`, modal), recibiendo `game` por props. El botón de guardar en el modal pasa por estados `idle → guardando → guardado / error` llamando el `saveScore` async.
8. **`app/salon/page.tsx`** — se separa igual que home: Server Component padre con `getGames()` inicial pasado a un Client Component (o se mantiene "use client" completo si recibe `games` como prop desde un wrapper server mínimo). El `useMemo(seededScores...)` se reemplaza por un `useEffect` que llama `getTopScores(tab, 12)` (Supabase browser client) cada vez que cambia `tab`, con estado `loading` mientras se resuelve (spinner o placeholder simple en podio/tabla).
9. **Verificación manual** — recargar home y ver juegos desde Supabase; entrar a `/juegos/asteroids`, jugar, perder las 3 vidas, guardar score (ver "GUARDANDO..." y luego confirmación); entrar a `/salon`, cambiar de tab, ver el score recién guardado aparecer en el ranking de Asteroids.
10. **(Ampliación) Migración `dynamic_game_stats`** — agregar `games.dificultad`, cambiar `games.plays` a `bigint` (reset a 0), resetear `games.best` a 0, agregar `scores.level`, agregar policy `games_public_update`. Aplicar con `mcp__supabase__apply_migration`, verificar con `list_tables`.
11. **(Ampliación) `lib/data.ts`** — agregar `dificultad: number` a la interfaz `Game`; cambiar `plays` de `string` a `number`.
12. **(Ampliación) `lib/scores.ts`** — `saveScore()` recibe `level`; tras el insert en `scores`, calcula `COUNT`/`MAX` reales del juego y hace `update` en `games` (`plays`, `best`, `dificultad`).
13. **(Ampliación) `components/games/GamePlayer.tsx`** — pasa `level: displayLevel` a `saveScore()`.
14. **(Ampliación) `app/juegos/[id]/page.tsx`** — `game.plays`/`game.best` se muestran como número (`toLocaleString`); las estrellas de dificultad se renderizan dinámicamente desde `game.dificultad` (`★` repetido `dificultad` veces + `☆` el resto hasta 5).
15. **(Ampliación) Verificación manual** — guardar un score nuevo en Asteroids y confirmar en `/juegos/asteroids` que "Partidas" y "Mejor global" reflejan el conteo/máximo real, y que las estrellas de dificultad cambian según el nivel alcanzado.

Cada paso deja el proyecto compilando y navegable.

## Criterios de aceptación

- [ ] Tablas `games` y `scores` existen en Supabase con RLS habilitado y las policies de lectura pública / insert público en `scores` descritas arriba.
- [ ] `games` contiene las 8 entradas que hoy tiene `GAMES`, con los mismos valores de `id`/`title`/`short`/`long`/`cat`/`cover`/`color`/`best`/`plays`.
- [ ] `lib/data.ts` ya no exporta `GAMES` ni `seededScores` — solo los tipos.
- [ ] Home (`/`) muestra el catálogo de juegos leído de Supabase (no del array estático), con el mismo filtro por categoría y animación de reveal de antes.
- [ ] `/juegos/[id]` muestra el detalle correcto leído de Supabase y `generateStaticParams` genera una ruta estática por cada juego de la tabla.
- [ ] `/juegos/asteroids/jugar` recibe el `game` correcto desde el servidor y el motor/HUD funcionan igual que en spec 05.
- [ ] Al terminar una partida y guardar el score, el botón muestra "GUARDANDO..." durante el insert y confirma éxito (o muestra error con opción de reintentar si falla la conexión) — nunca falla silenciosamente.
- [ ] El score guardado queda en la tabla `scores` de Supabase con el `game_id` correcto, visible en una nueva query sin recargar código.
- [ ] `/salon` muestra, para el juego seleccionado en las tabs, el ranking real (top 12) leído de `scores` ordenado por puntaje descendente, con estado de carga mientras cambia de tab.
- [ ] Cambiar de tab en `/salon` dispara un nuevo fetch y actualiza podio + tabla con los datos del juego correspondiente.
- [ ] No queda ninguna referencia a `localStorage("av_scores")` ni a `seededScores` en el código.
- [ ] El flujo de sesión mock (`av_user`) sigue funcionando sin cambios — esta spec no toca auth.
- [ ] **(Ampliación)** Al guardar un score, `games.plays` y `games.best` del juego correspondiente reflejan `COUNT`/`MAX` reales de `scores` (verificable con una query directa tras guardar).
- [ ] **(Ampliación)** `games.dificultad` del juego correspondiente queda en `clamp(nivel_alcanzado, 1, 5)` tras guardar el score.
- [ ] **(Ampliación)** `/juegos/[id]` muestra "Partidas"/"Mejor global" numéricos reales y estrellas de dificultad dinámicas (no el `★ ★ ★ ☆ ☆` fijo de antes).
- [ ] **(Ampliación)** Existe la policy `games_public_update` (RLS) permitiendo el `UPDATE` público necesario para lo anterior.

## Decisiones tomadas y descartadas

- **Spec combinada en vez de separada:** el usuario decidió unir tabla de juegos y leaderboard en una sola spec pese a ser dos modelos de datos distintos, porque están relacionados (scores referencian game_id) y se implementan en la misma pasada. Descartado: dos specs secuenciales (una por tabla).
- **`best`/`plays` como columnas estáticas, no calculadas:** se mantiene el valor fijo migrado del mock en vez de derivarlo en vivo de `scores` (MAX/COUNT), para no expandir el alcance con agregaciones adicionales. Queda como mejora futura si se quiere que esos números reflejen partidas reales.
- **Sin autenticación real:** se mantiene el mock `av_user` y el `INSERT` público sin relación a usuario autenticado, consistente con lo que spec 04 dejó explícitamente fuera de alcance.
- **RLS lectura/inserción pública sin validación adicional:** se prioriza simplicidad para esta spec; anti-cheat, rate limiting o validación de rango de score en `scores` quedan fuera, a definir en una spec de seguridad si se vuelve necesario.
- **Scores viejos de `localStorage` se descartan:** eran datos de prueba de specs anteriores: no vale la pena escribir un script de migración one-time para datos mock.
- **Server Component + Client Component separado para home y `/jugar`:** en vez de fetch client-side con loading spinner, se resuelve el dato en el servidor (sin parpadeo de carga) y se pasa por props al componente client que ya maneja la interactividad (reveal, motor del juego). `/salon` es la excepción: como el ranking cambia por interacción del usuario (tabs), ese fetch específico sí es client-side con estado de carga.
- **Migración SQL versionada en el repo:** en vez de aplicar cambios de schema solo vía MCP sin dejar rastro, se guarda el SQL en `supabase/migrations/` para que el cambio de schema quede documentado y reproducible, igual que se documentan los demás cambios de este proyecto.

### Ampliación: contadores dinámicos (2026-09-11)

- **`best`/`plays` pasan a calcularse y persistirse en cada guardado, revirtiendo la decisión original:** durante la verificación manual se notó que mostrar valores de seed mock (`41.200`, `15.6K`) junto a un leaderboard con datos reales (`0`, 1 partida) era inconsistente y confuso. Se prioriza consistencia visual sobre el ahorro de alcance original.
- **Cálculo "almacenado + actualizado al guardar" en vez de "en vivo por query":** el usuario prefirió persistir los valores en `games` (actualizados por `saveScore()`) en vez de calcular `COUNT`/`MAX` en cada carga de `/juegos/[id]`. Motivo: evitar agregación repetida en cada lectura del detalle. Trade-off aceptado: `games` puede quedar desincronizado si un `insert` en `scores` no llega a completar el `update` posterior (no hay transacción atómica cliente-side entre ambas queries).
- **`dificultad` = nivel del último score guardado, no una fórmula estadística:** se descartó calcular dificultad en base a dispersión/promedio de scores (más "correcto" estadísticamente) porque el usuario pidió explícitamente que refleje "el último nivel de dificultad del juego con la que se guarda el score". Es decir, cada guardado sobrescribe `dificultad` con `clamp(nivel_de_esa_partida, 1, 5)`, sin memoria de guardados anteriores.
- **`UPDATE` público sin restricción de columnas en `games`:** se evaluó una función RPC `SECURITY DEFINER` que solo permitiera tocar `best`/`plays`/`dificultad` (más seguro, ya que una policy `UPDATE` abierta permite que cualquier cliente anónimo reescriba también `title`/`cover`/`color`/etc. de cualquier juego vía la API pública de Supabase). El usuario eligió la policy pública simple por consistencia con el `INSERT` público ya aceptado en `scores` y para no sumar complejidad de funciones SQL. Riesgo aceptado explícitamente; posible mejora futura de seguridad.
- **Reset de `best`/`plays` a `0` para los 8 juegos en la migración de ampliación:** los valores de seed mock ya no representan datos reales una vez que el sistema empieza a trackear scores reales; se resetean para evitar mostrar números mock junto a contadores reales de otros juegos. Consistente con la decisión previa de descartar los scores mock de `localStorage`.
