# 04 — Implementar Supabase

**Estado:** Implementado
**Depende de:** SPEC 01
**Fecha:** 2026-09-07

**Objetivo:** Conectar el proyecto Next.js a Supabase (cliente browser/server + middleware) sin todavía migrar auth ni datos, dejando la integración lista para specs futuras.

## Alcance

**Incluye:**

- Instalar `@supabase/ssr` y `@supabase/supabase-js`.
- `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (proyecto Supabase ya existe).
- `lib/supabase/client.ts` — cliente para browser/Client Components.
- `lib/supabase/server.ts` — cliente para Server Components/Route Handlers usando cookies de `next/headers`.
- `proxy.ts` — refresca la sesión de Supabase en cada request (patrón estándar `@supabase/ssr`). **Ajuste durante implementación:** Next.js 16 deprecó `middleware.ts` y lo renombró a `proxy.ts` (mismo comportamiento, cambia solo nombre de archivo y función exportada `proxy` en vez de `middleware`). Se usa `proxy.ts` por ser la API vigente en esta versión.
- Verificación de que la conexión funciona (query trivial contra el proyecto, ej. `select 1` o listar tablas existentes).

**No incluye (a futuro, specs separadas):**

- Auth real (login/registro/logout) — sigue con la sesión mock en `localStorage av_user`.
- Tablas `profiles`, `games`, `scores` ni ninguna migración SQL.
- Reemplazar `av_scores`/`GAMES` mock por datos reales.
- RLS policies.
- Realtime, Edge Functions.

## Modelo de datos

Esta spec no crea tablas ni estructuras de datos nuevas. Solo agrega los archivos de cliente Supabase (`lib/supabase/client.ts`, `lib/supabase/server.ts`) y variables de entorno.

## Plan de implementación

1. Instalar `@supabase/ssr` y `@supabase/supabase-js`. Crear `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. Crear `lib/supabase/client.ts` (browser client con `createBrowserClient`).
3. Crear `lib/supabase/server.ts` (server client con `createServerClient` + cookies de `next/headers`).
4. Crear `proxy.ts` (renombrado de `middleware.ts` en Next.js 16) que refresca la sesión en cada request y define `matcher` para excluir assets estáticos.
5. Página o script de verificación temporal (ej. log en consola del servidor al cargar `/`) que confirma que el cliente conecta al proyecto sin error — se remueve o se deja como comentario simple, no es una feature visible.

Cada paso deja el proyecto compilando y navegable.

## Criterios de aceptación

- [x] `npm run dev` levanta sin errores con las variables de entorno de Supabase configuradas.
- [x] `lib/supabase/client.ts` y `lib/supabase/server.ts` exportan funciones que crean un cliente Supabase válido (build de TypeScript sin errores).
- [x] `proxy.ts` se ejecuta en cada request sin romper la navegación de las rutas existentes (`/`, `/juegos/[id]`, `/auth`, `/salon`).
- [x] Una query trivial contra el proyecto Supabase (ej. `supabase.from(...).select()` o `auth.getSession()`) se ejecuta sin error de conexión/credenciales.
- [x] Las pantallas existentes (mock auth, mock scores) siguen funcionando igual que antes — esta spec no cambia su comportamiento.

## Decisiones tomadas y descartadas

- **Sí:** `@supabase/ssr` con middleware desde el inicio, aunque auth mock siga activo. Evita rehacer la base de conexión en la próxima spec.
- **No:** crear tablas o RLS en esta spec. Se definen cuando se implemente auth/datos reales, con más contexto de lo que cada tabla necesita.
- **No:** tocar `lib/session.tsx`, `lib/scores.ts`, `lib/data.ts` ni ninguna UI. Esta spec es puramente de conexión.

## Lo que **no** está en esta spec

- Auth real (login/registro/logout).
- Tablas `profiles`, `games`, `scores` y sus RLS.
- Migración de `av_scores`/`GAMES` mock a Supabase.
- Realtime, Edge Functions, OAuth social.

Cada uno, si se implementa, va en su propia spec.
