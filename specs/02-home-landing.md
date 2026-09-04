# 02 — Home landing

**Estado:** Implementado
**Depende de:** SPEC 01
**Fecha:** 2026-09-04

**Objetivo:** Portar `home.jsx` del template (`references/templates/home-about/`) como nueva landing en `/`, moviendo la Biblioteca actual a `/biblioteca` y actualizando el Nav.

## Alcance

**Incluye:**

- Nueva landing en `app/page.tsx`: hero con silueta pixel decorativa, sección "¿Por qué Arcade Vault?", preview de juegos (6 primeros de `GAMES`), stats, actividad en vivo (últimas puntuaciones + top jugadores), pricing/FAQ, CTA final — igual estructura visual que `home.jsx`.
- Biblioteca actual (`app/page.tsx` de hoy) se mueve tal cual a `app/biblioteca/page.tsx`.
- `components/Nav.tsx`: nuevo link "Inicio" → `/`; link "Biblioteca" pasa a apuntar a `/biblioteca`; lógica `isActive` ajustada (Inicio activo solo en `/`; Biblioteca activo en `/biblioteca` y `/juegos/*`).
- Todos los botones/CTAs del template apuntan a rutas reales: "Explorar juegos" → `/biblioteca`, "Ver todos los juegos" → `/biblioteca`, "Crear cuenta"/"Empezar gratis"/CTA final → `/auth`, "Ver salón" → `/salon`, click en mini-card de juego → `/juegos/[id]`.
- Datos dinámicos derivados de `lib/data.ts` (no arrays de ejemplo hardcodeados del template):
  - Preview de juegos: `GAMES.slice(0, 6)`.
  - Stat "JUEGOS": `{GAMES.length}+` calculado; los otros dos stats ("MILES DE PARTIDAS", "GLOBAL RANKING") quedan como texto fijo, igual al template.
  - "Últimas puntuaciones" y "Top jugadores · hoy": generados con `seededScores(seed, count)` (dos seeds fijos distintos), usando `name` y `score`; sin timestamps reales — se omite la columna de tiempo relativo ("hace X min") del template.
- Animaciones `reveal`/`IntersectionObserver` al hacer scroll, igual al template (client component).
- `app/globals.css`: se agregan las clases CSS específicas de Home (`.home-hero`, `.home-title`, `.home-silos`, `.feature-grid`, `.mini-rail`, `.home-stats`, `.activity-grid`, `.pricing-grid`, `.home-final`, `.reveal`, etc.) portadas de `references/templates/home-about/styles.css`, ya que `app/globals.css` (SPEC 01) solo cubría navbar/biblioteca/detalle/reproductor/auth/salón.

**No incluye:**

- Página About (`about.jsx`) — queda para otro spec.
- Cambios al contenido o comportamiento de Biblioteca más allá de moverla de ruta.
- Backend, API routes o base de datos.
- Tests automatizados.

## Modelo de datos

No se introduce ningún dato nuevo. Se reutiliza `lib/data.ts` (`GAMES`, `seededScores`) ya existente de SPEC 01.

## Plan de implementación

1. **Mover Biblioteca** — copiar el contenido actual de `app/page.tsx` a `app/biblioteca/page.tsx` sin cambios de lógica.
2. **`components/Nav.tsx`** — agregar link "Inicio" (`href="/"`), cambiar href de "Biblioteca" a `/biblioteca`, actualizar `isActive`: `inicio` activo solo en `pathname === "/"`; `biblioteca` activo en `pathname.startsWith("/biblioteca") || pathname.startsWith("/juegos")`. Replicar en el panel móvil.
3. **`app/page.tsx`** (nuevo Home) — portar `home.jsx`: hero + `FloatingSilhouettes`, sección "por qué", preview de juegos con `MiniCard`, stats, actividad en vivo, pricing/FAQ, CTA final. Client component (`"use client"`) por el hook `reveal`. Conectar cada CTA a su ruta real (ver Alcance). Incluye portar a `app/globals.css` las clases CSS de Home/actividad/pricing que faltaban (ver Alcance) — sin esto la landing se ve sin estilos.
4. **Verificación manual** — `npm run dev`: `/` muestra el Home nuevo con animaciones reveal; `/biblioteca` muestra la Biblioteca intacta (buscador y chips funcionando); Nav resalta "Inicio" en `/` y "Biblioteca" en `/biblioteca` y en `/juegos/[id]`; todos los CTAs navegan a la ruta correcta.

Cada paso deja el proyecto compilando y navegable.

## Criterios de aceptación

- [x] `npm run dev` levanta sin errores; `/` muestra el nuevo Home (hero, por qué, preview de juegos, stats, actividad en vivo, pricing/FAQ, CTA final).
- [x] `/biblioteca` muestra la Biblioteca (buscador + chips) igual que antes, sin regresión.
- [x] `/` ya no muestra la Biblioteca.
- [x] Nav muestra "Inicio" y "Biblioteca" como links separados; "Inicio" activo solo en `/`; "Biblioteca" activo en `/biblioteca` y `/juegos/[id]`.
- [x] Preview de juegos en Home muestra los primeros 6 de `GAMES` y cada uno enlaza a `/juegos/[id]`.
- [x] Botones "Explorar juegos" y "Ver todos los juegos" navegan a `/biblioteca`; "Crear cuenta", "Empezar gratis" y CTA final navegan a `/auth`; "Ver salón" navega a `/salon`.
- [x] Stat "JUEGOS" muestra `{GAMES.length}+` (no hardcodeado a "12+").
- [x] "Últimas puntuaciones" y "Top jugadores · hoy" se generan con `seededScores`, no con los arrays de ejemplo del template.
- [x] Animaciones reveal disparan al hacer scroll en cada sección `.reveal`.

## Decisiones tomadas y descartadas

- **Ruta de Biblioteca:** se mueve a `/biblioteca` para liberar `/` como landing real, siguiendo el patrón de navegación del template (`home` y `biblioteca` como rutas separadas). Descartado: poner Home en `/inicio` y dejar Biblioteca en `/`, porque no calza con la convención de que `/` sea la landing.
- **About fuera de alcance:** se deja para spec aparte porque el usuario pidió reducir el alcance de este spec a solo Home.
- **Datos de actividad:** se usa `seededScores` con seeds fijos en vez de copiar los nombres/puntajes de ejemplo del template, para mantener consistencia con los datos reales del proyecto (mismo criterio que SPEC 01 con `seededScores` en Salón). Se omite el campo de tiempo relativo porque no hay timestamps reales que lo respalden.
- **Stats fijos:** solo el stat de cantidad de juegos se calcula dinámicamente; "MILES DE PARTIDAS" y "GLOBAL RANKING" quedan como texto decorativo fijo porque no hay métrica real de partidas jugadas ni de usuarios en el proyecto (todo mock, sin backend).
- **CSS de Home no portado en SPEC 01:** al verificar en el navegador, el hero y todas las secciones de Home se renderizaban sin estilos porque `app/globals.css` nunca incluyó las clases de `home.jsx` (SPEC 01 solo portó CSS de navbar/biblioteca/detalle/reproductor/auth/salón). Se agregaron esas clases a `app/globals.css` en el paso 3. Se simplificó `.tick-row`/`.top-row` a 2 columnas (nombre + puntaje) en vez de 4, consistente con la decisión de omitir timestamps en "Últimas puntuaciones".
