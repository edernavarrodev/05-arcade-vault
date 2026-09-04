# 01 — MVP pantallas Arcade Vault

**Estado:** Implementado
**Depende de:** —
**Fecha:** 2026-09-04

**Objetivo:** Portar las 5 pantallas visuales del prototipo estático (`references/templates/`) a rutas reales de Next.js App Router, reutilizando el CSS ya importado en `app/globals.css`, sin implementar lógica real de ningún juego.

## Alcance

**Incluye:**

- 5 pantallas: Biblioteca (`/`), Detalle de juego (`/juegos/[id]`), Reproductor (`/juegos/[id]/jugar`), Autenticación (`/auth`), Salón de la Fama (`/salon`).
- Nav global (desktop + panel móvil) compartido por layout.
- Datos mock estáticos (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) portados a TypeScript.
- Sesión de usuario mock (login/logout/invitado) persistida en `localStorage`.
- Guardado de puntuaciones en `localStorage` al terminar una partida.
- Reproductor con el mock dinámico del template: puntuación autoincremental por `setInterval`, subida de nivel, pausa, fin de partida, modal de guardado — todo simulado, sin motor de juego real.
- Responsive según los breakpoints ya definidos en el CSS portado (840px nav, 900px detalle, 720px tablas/podio).

**No incluye:**

- Lógica de ningún juego jugable (Bloque Buster, Caída, etc.) — el CRT solo muestra la escena decorativa animada del template.
- Backend, API routes, base de datos o autenticación real.
- Registro real de cuentas (el formulario "crear cuenta" hace login mock igual que "iniciar sesión").
- Tests automatizados (no hay test runner configurado).
- Internacionalización — todo el texto queda en español, igual que el template.

## Modelo de datos

Todo mock, sin backend. Vive en `lib/`.

```ts
// lib/data.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS cover-*
  color: GameColor;
  best: number;
  plays: string;
}

export const GAMES: Game[];
export const CATS: readonly ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
export const PLAYERS: string[];

export interface ScoreRow { rank: number; name: string; score: number; date: string; }
export function seededScores(seed: number, count?: number): ScoreRow[];
```

```ts
// lib/session.ts (contexto de sesión, cliente)
export interface AuthUser { name: string; }
// useSession() -> { user, login(u), signOut() } respaldado en localStorage "av_user"
```

```ts
// lib/scores.ts
export interface SavedScore { game: string; score: number; name: string; at: number; }
// saveScore(entry) -> lee/escribe localStorage "av_scores"
```

## Plan de implementación

1. **`lib/data.ts`** — portar `GAMES`, `CATS`, `PLAYERS`, `seededScores` desde `references/templates/data.jsx` a TS tipado, sin `window.*`.
2. **`lib/session.tsx`** — `SessionProvider` + hook `useSession`, con estado inicial leído de `localStorage("av_user")`, expone `login`/`signOut`. Envolver `app/layout.tsx` con el provider (client component).
3. **`lib/scores.ts`** — `saveScore(entry)` que lee/escribe `localStorage("av_scores")`.
4. **`components/Nav.tsx`** — portar `nav.jsx` a componente cliente usando `next/link` y `usePathname` para el estado activo (Biblioteca cubre `/`, `/juegos/*`); botón login/logout usa `useSession`; panel móvil con el mismo backdrop/transición del CSS existente. Montarlo en `app/layout.tsx` junto al footer ya presente en `app.jsx`.
5. **`app/page.tsx`** (Biblioteca) — portar `biblioteca.jsx`: hero, buscador, chips de categoría, grid de `GameCard` con tilt on mouse-move, enlaza a `/juegos/[id]`.
6. **`app/juegos/[id]/page.tsx`** (Detalle) — portar `detalle.jsx`: cover, tags, descripción, stat-strip, leaderboard (`seededScores`), CTA a `/juegos/[id]/jugar`. `generateStaticParams` desde `GAMES`; `notFound()` si el id no existe.
7. **`app/juegos/[id]/jugar/page.tsx`** (Reproductor) — portar `reproductor.jsx` como client component: HUD, CRT decorativo, `setInterval` mock de puntuación/nivel, pausa, fin de partida, modal con input de iniciales que llama a `saveScore` y muestra el toast. "Salir" vuelve al detalle.
8. **`app/auth/page.tsx`** — portar `auth.jsx`: tabs iniciar sesión / crear cuenta, formulario, botón invitado, botones sociales decorativos (sin acción real). Login (cualquier tab) llama `useSession().login` y redirige a `/`.
9. **`app/salon/page.tsx`** (Salón de la Fama) — portar `salon.jsx`: tabs por juego, podio top 3, tabla completa, fila "tu mejor marca" si hay sesión.
10. **Limpieza** — quitar el skeleton de `create-next-app` en `app/page.tsx` (logo Next/Vercel) y cualquier CSS/JS de plantilla no usado (`app.jsx`, `nav.jsx`, etc. de `references/templates` quedan solo como referencia, no se importan).

Cada paso deja el proyecto compilando y navegable.

## Criterios de aceptación

- [x] `npm run dev` levanta sin errores y `/` muestra la Biblioteca con hero, buscador funcional (filtra por texto) y chips de categoría (filtran por `cat`).
- [x] Click en una card o "JUGAR" navega a `/juegos/[id]` mostrando datos correctos del juego y un leaderboard con 10 filas.
- [x] "JUGAR AHORA" en detalle navega a `/juegos/[id]/jugar`; el HUD muestra puntuación subiendo sola, nivel incrementa cada 2500 pts, PAUSA detiene el contador, FIN abre el modal de game over.
- [x] Guardar puntuación en el modal persiste en `localStorage("av_scores")` y muestra el toast "PUNTUACIÓN GUARDADA".
- [x] `/auth` permite iniciar sesión (cualquier usuario/contraseña), crear cuenta o entrar como invitado; tras login el Nav muestra el nombre de usuario y persiste tras recargar la página (`localStorage("av_user")`).
- [x] Logout desde el Nav limpia la sesión y el botón vuelve a "Iniciar Sesión".
- [x] `/salon` muestra podio + tabla por juego seleccionado; con sesión iniciada aparece la fila "tu mejor marca".
- [x] Nav resalta la sección activa (Biblioteca activo también en `/juegos/*`) y el panel móvil funciona por debajo de 840px.
- [x] Ningún juego tiene lógica jugable real — el reproductor es 100% decorativo/mock.
- [x] No quedan referencias al skeleton de `create-next-app` (logos Next.js/Vercel) en las pantallas finales.

## Decisiones tomadas y descartadas

- **Routing:** App Router nativo con rutas de archivo (`/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon`) en vez del hash-router custom del template — más idiomático a Next.js. Descartado: replicar el router de `app.jsx` tal cual.
- **Estilos:** se reutiliza el CSS ya portado en `app/globals.css` (clases `.av-*`, `.btn`, `.card`, `.crt`, etc.), y Tailwind se usa para todo el layout nuevo (contenedores, spacing de componentes sin clase equivalente en el CSS portado). Descartado: reescribir todo el diseño en utilities de Tailwind.
- **Reproductor:** se mantiene el mock dinámico del template (score autoincremental por `setInterval`, nivel, pausa) porque es puramente decorativo y no constituye "un juego" — no hay input del jugador ni reglas de juego real. Descartado: congelar el HUD en valores estáticos.
- **Persistencia:** mock estático en `lib/data.ts` + `localStorage` para sesión y puntuaciones, sin backend — consistente con el alcance "solo la parte visual" del MVP. Descartado: no persistir nada entre recargas.
- **Sesión compartida entre rutas:** como el Nav vive en `app/layout.tsx` y las páginas son rutas de archivo separadas (no un único componente `App`), se introduce un `SessionProvider` de contexto en vez de pasar `user`/`navigate` por props como en el template.
