---
name: game-impl
description: Implementa un spec de porteo de juego aprobado, generado por /game-spec o /add-game. Valida estado Aprobado, crea la rama git, e implementa paso a paso (incluyendo aplicar la migración de seed de games vía Supabase MCP), pausando tras cada paso para revisión. Puede invocarse directo como comando, o vía el tool Skill desde /add-game.
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*), Bash(date:*), mcp__supabase__apply_migration, mcp__supabase__list_tables, mcp__supabase__list_migrations
---

# /game-impl — Implementador de specs de porteo de juegos

## Contexto de sesión

Estado actual del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles en esta carpeta:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

Config de creación de rama:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, sin archivo de config)"`

Registry de juegos (si falta, el Paso 0 del plan del spec debe hacer el refactor de GamePlayer):
!`ls lib/games/registry.ts 2>/dev/null || echo "lib/games/registry.ts no existe — falta el refactor de registry"`

---

## Instrucciones

Seguir estas cuatro fases en orden estricto. **No avanzar a la siguiente fase si la anterior no se completó correctamente.**

---

### Fase 1 — Identificar el spec

El argumento recibido es: `$ARGUMENTS`

Si `$ARGUMENTS` está vacío:

- Listar los archivos disponibles en `specs/` (ya están arriba).
- Pedir al usuario que especifique el nombre exacto del spec.
- Parar y esperar respuesta. No continuar.

Si `$ARGUMENTS` tiene valor:

- Buscar el archivo en `specs/`. El usuario puede haber escrito el nombre completo (`07-porteo-tetris-caida`), solo el número (`07`), o solo el slug (`porteo-tetris-caida`). Intentar encontrar el archivo correcto en cualquiera de esos casos.
- Si no se encuentra, mostrar los specs disponibles y pedir que corrija el nombre.
- Si se encuentra, continuar a la Fase 2.

---

### Fase 2 — Validar el estado del spec

Leer el archivo del spec localizado en la Fase 1 con el tool Read o `cat`.

En el contenido, buscar la línea que contiene el estado del spec. La etiqueta suele ser `**Estado:**` (o `**Status:**` en inglés), pero puede estar en cualquier idioma. Ubicarla por posición (línea de estado cerca del encabezado) y por la máquina de estados circundante, no por la etiqueta exacta.

**Regla absoluta:** solo se puede continuar si el estado **significa "Aprobado"** — sin importar el idioma usado.

Tratar como estado **Aprobado** (y continuar): `Approved`, `Aprobado`, `Aprovado`, `Approuvé`, `Genehmigt`, `Approvato`, o el equivalente en cualquier otro idioma.

Cualquier otro valor (`Draft`/`Borrador`, `In review`/`En revisión`, `Implemented`/`Implementado`, `Obsolete`/`Obsoleto`, o cualquier valor no reconocido) significa **parar** y mostrar el mensaje de error de abajo.

Si hay duda sobre si un valor significa "aprobado", **no asumir**. Parar y pedir al usuario que aclare o actualice el spec a la palabra canónica.

**Mensaje de error estándar cuando el estado no significa Aprobado:**

```
❌ No puedo implementar este spec.

Estado actual: [ESTADO ENCONTRADO]
Solo trabajo con specs cuyo estado signifique "Aprobado" (ej. `Aprobado`, `Approved`,
o el equivalente en otro idioma).

Para continuar tenés dos opciones:
  1. Si el spec está listo para implementarse, ábrelo y cambia el estado
     a "Aprobado" (o el término equivalente que use tu equipo) manualmente.
     Ese cambio lo hace el humano, no el agente.
  2. Si el spec todavía necesita trabajo, usa /game-spec para retomarlo,
     o /add-game para correr el flujo completo de nuevo.
```

No ofrecer alternativas, no sugerir "puedo empezar igual si querés". El bloque es intencional.

---

### Fase 3 — Crear la rama git y cambiar a ella

Una vez confirmado que el estado significa `Aprobado`:

0. **Chequear el working tree primero.** Mirar el `git status --short` de la sesión de arriba. Si **no está vacío**, parar, mostrar los cambios pendientes y preguntar:

   ```
   ⚠️ Hay cambios sin commitear en el working tree.
   Cambiar de rama los arrastraría. ¿Qué querés hacer?
     1. Commitealos o guardalos con stash vos mismo, y volvé a correr este comando (recomendado)
     2. Continuar igual — los cambios viajan a la rama nueva
   ```

   Esperar la respuesta. **No hacer stash ni commit en nombre del usuario** salvo que lo pida explícitamente. Si el working tree está limpio, saltar directo al paso 1 sin mencionarlo.

1. Derivar el nombre de rama del nombre completo del archivo del spec, sin extensión. Formato: `spec-NN-slug`. Ejemplo: `07-porteo-tetris-caida.md` → rama `spec-07-porteo-tetris-caida`.

2. Leer el flag `AutoCreateBranch` de la config de la sesión de arriba.

   - Si el archivo de config no existe, el valor falta, o es irreconocible → tratarlo como `true` (default).
   - Solo un `false` explícito (en cualquier capitalización) desactiva la creación automática de rama.

   **Si `AutoCreateBranch` es `true` (default):** proceder sin preguntar.

   - Si la rama **no existe**: crearla con `git checkout -b spec-NN-slug`.
   - Si **ya existe**: esto significa que se está retomando trabajo previo. Cambiar a ella, leer `git log --oneline` en la rama, y decir al usuario qué pasos del plan ya parecen hechos y desde cuál se propone retomar. Esperar confirmación del punto de retomo antes de implementar nada.
   - En ambos casos: cambiar a la rama con `git checkout spec-NN-slug` y confirmar que el cambio fue exitoso antes de continuar.

   **Si `AutoCreateBranch` es `false`:** preguntar antes de tocar git.

   ```
   AutoCreateBranch está en false.
   ¿Crear y cambiar a la rama spec-NN-slug? [y/N]
   ```

   - Si responde **sí**: crear/cambiar a la rama igual que en el caso `true`.
   - Si responde **no** o deja vacío: **no crear ninguna rama.** Avisar que se va a implementar en la rama actual (la que muestra el contexto de sesión) y pedir confirmación explícita para continuar ahí. No improvisar — esperar la respuesta.

3. Confirmar visualmente al usuario que el spec está listo y qué rama está activa:

   ```
   ✅ Listo para implementar.

   Spec:   specs/NN-slug.md
   Rama:   spec-NN-slug  (activa)   (← o la rama actual, si no se creó una nueva)
   Estado: Aprobado   (← el valor real encontrado en el spec)
   ```

4. **No empezar a implementar todavía.** Primero mostrar el resumen del spec para tenerlo fresco. Extraer y mostrar:
   - El **objetivo** (línea después de `**Objetivo:**`/`**Objective:**` o equivalente).
   - El **alcance** (sección `## Alcance`/`## Scope` o equivalente).
   - El **plan de implementación** (sección con los pasos numerados).
   - Los **criterios de aceptación** (el checklist).

Emparejar los encabezados por significado, no por texto exacto — el spec puede estar en cualquier idioma.

---

### Fase 4 — Implementar paso a paso

Después de mostrar el resumen del spec, decir al usuario:

```
Voy a implementar el spec siguiendo el plan de implementación tal cual.
Voy a pausar después de cada paso para que revises el diff.

¿Arrancamos con el Paso 1?
```

Esperar confirmación explícita ("sí", "dale", "adelante", o equivalente). No empezar sin ella.

Una vez confirmado, seguir estas reglas durante toda la implementación:

**Nunca commitear automáticamente.** Ni por paso, ni al final. El código y el diff se muestran; commitear es decisión y comando del usuario. Solo commitear si lo pide explícitamente.

**Regla por encima de todas:** implementar lo que dice el spec. Si algo del spec parece subóptimo, mencionarlo como observación pero implementar lo acordado. Cambios al spec van al spec, no al código por sorpresa.

**Regla propia de este skill — migración de seed:** cuando el paso del plan sea "aplicar la migración de seed en `games`":

1. Generar el nombre de archivo como `supabase/migrations/<YYYYMMDDHHMMSS>_seed_<slug>.sql`, usando `date +%Y%m%d%H%M%S` para el timestamp (mismo patrón que las migraciones existentes del proyecto).
2. Escribir su contenido según lo que el spec definió (`insert` para id nuevo, `update` para slot reusado con contenido cambiado).
3. Aplicarla con `mcp__supabase__apply_migration`.
4. Verificar con `mcp__supabase__list_tables` que la fila quedó con los valores esperados.
5. Si el spec ya declaró explícitamente "no se requiere migración" (slot reusado sin cambios), saltar este paso entero y decirlo.

**Ritmo de trabajo:**

- Implementar un paso del plan.
- Mostrar un resumen de qué archivos se tocaron y qué se hizo.
- Decir: `Paso N completado. ¿Podés revisar el diff y avisarme si sigo con el Paso N+1?`
- Esperar confirmación antes de continuar.

**Si durante la implementación aparece una ambigüedad** que el spec no resuelve:

- Parar.
- Describir la ambigüedad exactamente.
- Presentar dos o tres opciones concretas.
- Esperar la decisión del usuario.
- No improvisar.

**Si el usuario pide algo fuera del alcance del spec:**

- Recordarle que está fuera del alcance de este spec.
- Sugerir anotarlo para el próximo spec.
- No implementarlo en esta rama.

**Al terminar el último paso:**

```
✅ Todos los pasos del plan están implementados.

Próximo paso: verificar los criterios de aceptación del spec uno por uno.
Si todos pasan, actualizar el estado del spec a "Implementado" (o el equivalente
en el idioma del repo) y hacer el commit final antes de mergear esta rama.
```

---

## Resumen de comportamiento esperado

```
/game-impl 07-porteo-tetris-caida

  Fase 1  →  Encuentra specs/07-porteo-tetris-caida.md
  Fase 2  →  Lee el estado → "Aprobado" → ✅ continúa
  Fase 3  →  git checkout -b spec-07-porteo-tetris-caida
             Muestra objetivo, alcance, plan y criterios
  Fase 4  →  Implementa paso a paso con pausas
             Incluye aplicar la migración de seed vía Supabase MCP cuando el paso lo pida
             Termina recordando verificar los criterios de aceptación

/game-impl 08-porteo-arkanoid  (estado: Draft)

  Fase 1  →  Encuentra specs/08-porteo-arkanoid.md
  Fase 2  →  Lee el estado → "Draft" → ❌ para
             Muestra el mensaje de error estándar
             No crea rama, no toca código
```

**La creación de rama se controla con el flag `AutoCreateBranch`** en `specs/.spec-config.yml` (compartido con `/spec`/`/spec-impl`). Default `true`. Ponerlo en `false` hace que la Fase 3 pregunte `[y/N]` antes de crear la rama.
