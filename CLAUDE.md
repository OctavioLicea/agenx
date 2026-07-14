<!--
Bloque para agregar a CLAUDE.md (o al archivo de instrucciones del
proyecto que uses). No reemplaza nada existente — se agrega como
sección nueva, de preferencia cerca del inicio.
-->

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
