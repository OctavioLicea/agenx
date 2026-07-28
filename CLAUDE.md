<!--
Bloque para agregar a CLAUDE.md (o al archivo de instrucciones del
proyecto que uses). No reemplaza nada existente — se agrega como
sección nueva, de preferencia cerca del inicio.
-->

## Palabra de acción: "Date" — no construir sin ella

Okta define el trabajo de esta forma: primero pasa una lista de cambios,
Claude **pregunta** lo que haga falta y propone el alcance, y **solo
construye cuando Okta escribe la palabra `Date`**.

Reglas:

- **Antes de `Date`**: Claude puede leer el repo, investigar qué archivos
  toca cada cambio, revisar si algo ya existe, proponer alcance, señalar
  riesgos y hacer preguntas. **No escribe ni edita código.**
- **`Date` autoriza únicamente lo que se acordó en esa ronda de
  preguntas.** No es un permiso abierto: si aparece algo nuevo a medio
  camino, se plantea y se espera otro `Date`.
- **Documentación es la excepción**: actualizar `docs/BACKLOG.md` y
  `docs/bitacora/` no requiere `Date` — es parte del cierre obligatorio
  descrito abajo.
- Si Okta pide construir algo sin decir `Date`, preguntarle si va — pudo
  habérsele olvidado la palabra, pero la duda se aclara antes de tocar
  archivos.

Establecido el 27 jul 2026 (sesión 23), a prueba.

---

## Documentación de sesión — obligatorio antes de cerrar

Este proyecto lleva su historial y su estado actual DENTRO del repo, no
en un proyecto de Claude.ai aparte:

- `docs/BACKLOG.md` — el estado actual, un solo archivo. Se edita
  in-place cada sesión (nunca se crea una copia nueva con fecha). Si algo
  ya no aplica, se borra o se marca `[x]`, no se deja acumulando.
- `docs/bitacora/YYYY-MM-DD.md` — un archivo por sesión, fecha ISO. Es
  un registro histórico, nunca se edita el de un día anterior. Usa
  `docs/bitacora/TEMPLATE.md` como plantilla fija.

**Regla dura**: antes de cerrar cualquier sesión de trabajo en este
proyecto (sin importar si es Claude Code, Cowork, o chat normal), Claude
debe:

1. Preguntar si hay algo que registrar antes de cerrar (o hacerlo
   directamente si ya es evidente por el trabajo hecho en la sesión).
2. Actualizar `docs/BACKLOG.md` reflejando el estado real — agregar lo
   nuevo, tachar/quitar lo que ya no aplica, mover items entre
   Fase/Sprint si el alcance cambió.
3. Crear `docs/bitacora/<fecha-de-hoy>.md` con la plantilla de
   `docs/bitacora/TEMPLATE.md`, llenando al menos: decisiones tomadas,
   código entregado, pendientes para la próxima sesión.

Esto no es opcional ni depende de que Okta lo pida — es la única forma
de que la siguiente sesión (con quien sea, en el tool que sea) arranque
con el estado real y no con una versión vieja.

**Si al arrancar una sesión los documentos se sienten desactualizados o
contradicen algo que el código real muestra**: decirlo explícitamente
apenas se detecte, no asumir en silencio cuál versión es la correcta.
