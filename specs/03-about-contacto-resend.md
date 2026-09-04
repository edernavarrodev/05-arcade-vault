# 03 — About y contacto con Resend

**Estado:** Implementado
**Depende de:** SPEC 02
**Fecha:** 2026-09-04

**Objetivo:** Portar `about.jsx` del template (`references/templates/home-about/`) como página `/acerca-de` con formulario de contacto que envía correos reales vía Resend.

## Alcance

**Incluye:**

- Nueva página `app/acerca-de/page.tsx`: sección hero "Acerca de" con misión y highlight-row (3 tarjetas con íconos), divisor animado, sección de contacto con intro + tips y formulario — igual estructura visual que `about.jsx`.
- `components/Nav.tsx`: nuevo link "Acerca de" → `/acerca-de`, en desktop y panel móvil, con lógica `isActive` para resaltarlo en esa ruta.
- Formulario de contacto (nombre, correo, mensaje) que envía un correo real usando Resend:
  - Validación de campos vacíos en cliente (shake, igual al template).
  - Validación básica de formato en servidor (campos no vacíos, email con formato válido) antes de llamar a Resend.
  - Estado de éxito: bloque `terminal-success` igual al template.
  - Estado de error (falla de red o de Resend): mensaje de error simple bajo el formulario; el formulario permanece visible para reintentar.
  - Estado de carga mientras se envía (botón deshabilitado/texto "ENVIANDO…").
- Backend: `app/api/contact/route.ts` (route handler POST) que recibe `{ name, email, msg }`, valida, y llama a la API de Resend server-side con la librería oficial `resend`.
- Correo enviado a `edernavarro.dev@gmail.com`, remitente `onboarding@resend.dev` (sandbox de Resend, sin dominio propio verificado).
- `RESEND_API_KEY` como variable de entorno en `.env.local` (no versionada; `.env*` ya está en `.gitignore`).
- `app/globals.css`: se agregan las clases CSS específicas de About/Contacto (`.about-hero`, `.about-title`, `.highlight-row`, `.about-divider`, `.about-contact`, `.contact-grid`, `.contact-form`, `.terminal-success`, etc.) portadas de `references/templates/home-about/styles.css`.
- Dependencia nueva en `package.json`: `resend`.

**No incluye:**

- Persistencia de mensajes en base de datos — el mensaje solo se envía por correo, no se guarda en ningún lado.
- Protección anti-spam (honeypot, captcha, rate limiting).
- Envío de correo de confirmación al usuario que llena el formulario (solo se notifica al destino fijo).
- Verificación de dominio propio en Resend.
- Tests automatizados.

## Modelo de datos

No se introduce persistencia. La única estructura nueva es el payload transitorio del formulario:

```ts
// app/api/contact/route.ts
type ContactPayload = { name: string; email: string; msg: string };
```

No se guarda en ningún store; vive solo durante el request.

## Plan de implementación

1. **Instalar dependencia** — `npm install resend`.
2. **Configurar entorno** — crear `.env.local` con `RESEND_API_KEY=<key del usuario>` (no versionado). Documentar en el spec que el usuario debe reemplazar la key real.
3. **`app/api/contact/route.ts`** — route handler `POST`: valida `name`, `email` (formato), `msg` no vacíos; si falla, responde 400 con mensaje de error; si son válidos, llama a `Resend` (`new Resend(process.env.RESEND_API_KEY)`) enviando correo `from: "onboarding@resend.dev"`, `to: "edernavarro.dev@gmail.com"`, `subject` con el nombre del remitente, `text`/`html` con nombre, correo y mensaje; responde 200 en éxito, 500 en fallo de Resend.
4. **`app/acerca-de/page.tsx`** — portar `about.jsx`: hero con `highlight-row` e íconos SVG pixel (`HighlightIcon`), divisor animado, sección de contacto con formulario controlado. `"use client"` por el hook `reveal` y el estado del form. `onSubmit` hace `fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })`; mientras espera muestra estado de carga; en éxito muestra `terminal-success`; en error muestra mensaje bajo el form y mantiene los datos ingresados.
5. **`components/Nav.tsx`** — agregar link "Acerca de" (`href="/acerca-de"`) en desktop y panel móvil; `isActive` resalta cuando `pathname === "/acerca-de"`.
6. **`app/globals.css`** — portar clases CSS de About/Contacto desde `references/templates/home-about/styles.css` (líneas ~1073-1140 y las que use `HighlightIcon`/`terminal-success`).
7. **Verificación manual** — `npm run dev`: `/acerca-de` muestra la página con animaciones reveal; Nav resalta "Acerca de" en esa ruta; enviar el formulario con una key de Resend válida entrega el correo a `edernavarro.dev@gmail.com` y muestra `terminal-success`; enviar con campos vacíos dispara el shake sin llamar al backend; forzar un error (p. ej. `RESEND_API_KEY` inválida) muestra el mensaje de error y permite reintentar sin perder los datos del form.

Cada paso deja el proyecto compilando y navegable.

## Criterios de aceptación

- [x] `npm run dev` levanta sin errores; `/acerca-de` muestra hero, highlight-row, divisor animado y sección de contacto, igual al template.
- [x] Nav muestra "Acerca de" como link y lo resalta como activo en `/acerca-de`.
- [x] Enviar el formulario con campos vacíos dispara el shake y no hace petición al servidor.
- [x] Enviar el formulario con datos válidos y `RESEND_API_KEY` válida entrega un correo real a `edernavarro.dev@gmail.com` y muestra el bloque `terminal-success` con el nombre ingresado.
- [x] Si `POST /api/contact` falla (Resend rechaza, red cae, o key inválida), se muestra un mensaje de error bajo el formulario y los datos ingresados no se pierden.
- [x] `app/api/contact/route.ts` valida formato de email y campos no vacíos antes de invocar Resend, devolviendo 400 si la validación falla.
- [x] `RESEND_API_KEY` no está hardcodeada en el código ni versionada (vive en `.env.local`).
- [x] Animaciones reveal disparan al hacer scroll en `/acerca-de`.

## Decisiones tomadas y descartadas

- **Ruta `/acerca-de` en vez de `/about`:** consistente con el resto del sitio en español (`/biblioteca`, `/salon`). Descartado `/about` por mezclar idiomas en las rutas.
- **Envío vía route handler (`app/api/contact/route.ts`) en vez de Server Action:** más explícito y fácil de probar con `fetch`/curl directamente; sigue el patrón estándar de Next.js App Router para integraciones con servicios externos.
- **Remitente sandbox `onboarding@resend.dev`:** el proyecto no tiene dominio propio verificado en Resend; se usa el remitente de pruebas que Resend provee por defecto, sin bloquear el desarrollo. Puede migrarse a un dominio propio en un spec futuro sin cambiar el resto del flujo.
- **Sin persistencia de mensajes:** el alcance pedido es solo "envío de correos", no un sistema de tickets; guardar mensajes en base de datos se descarta por no haber backend/DB en el proyecto (ver AGENTS.md/CLAUDE.md: skeleton sin rutas custom hasta specs anteriores).
- **Sin protección anti-spam:** fuera de alcance explícito; el usuario no lo pidió y añadiría complejidad (captcha, rate limiting) no justificada para un formulario de contacto simple en un proyecto de curso.
- **Estado de error como mensaje simple (no terminal con línea roja):** el usuario eligió la opción más simple; evita duplicar la lógica visual del terminal-success para un caso secundario.

## Riesgos identificados

- **Key de Resend inválida o no configurada:** si `.env.local` no tiene `RESEND_API_KEY` o la key es inválida, todo envío fallará con el estado de error — el usuario debe crear su cuenta en Resend y generar una key antes de probar el flujo de éxito.
- **Remitente sandbox con límites:** `onboarding@resend.dev` puede tener restricciones de volumen/uso propias del modo de pruebas de Resend; si se necesita producción real, requiere verificar dominio propio (fuera de este spec).
