# TuAsesor — Backlog (estado actual)

> Este archivo vive en `docs/BACKLOG.md` dentro del repo, no en un
> proyecto de Claude.ai aparte. Se edita in-place cada sesión — nunca se
> crea una copia nueva con fecha. El historial de qué cambió y cuándo
> vive en `git log`/`git blame` de este archivo, no en nombres de
> archivo distintos. Reemplaza a todos los `TuAsesor - Backlog *.md`
> sueltos anteriores (Sesiones 2 a 9) — esos quedan como archivo
> histórico, no se vuelven a tocar.
>
> Última actualización: 24 de julio 2026 (sesión 22, continuación 4 —
> fix de precarga de plantilla en propiedades ya existentes en renta +
> botón manual "Cargar de Mi Perfil"; instrucciones de comit/deploy
> entregadas a Okta, con un hallazgo de historial git divergido que se
> le explicó antes de dar los comandos, ver "🚀 Pendiente inmediato —
> Deploy" abajo.)
>
> Actualización anterior: 24 de julio 2026 (sesión 22, continuación 4 —
> campos exclusivos de renta en la ficha base: # meses de depósito, #
> meses mínimo de contrato, requisitos de arrendamiento por persona
> física/moral. Ver sección "🏠 Campos de renta en la ficha base" abajo.)
>
> Actualización anterior: 23 de julio 2026 (sesión 22, continuación 3 —
> 4 mejoras de UX reportadas por Okta: grid por default en Propiedades,
> toast de doble-atrás para salir de la app, ícono de cerrar unificado en
> 9 componentes, botón "Regenerar" renombrado en el generador de posts.)
>
> Actualización anterior: 23 de julio 2026 (sesión 22 — bloqueante de
> `nombre_comercial` de la cuenta de Okta resuelto completando el perfil
> (no borrando la cuenta, por el riesgo cruzado con ivent que se descubrió
> al intentarlo); QA/Playwright arrancado y luego desinstalado por
> completo el mismo día.)
>
> Actualización anterior: 23 de julio 2026 (sesión 21, continuación — el
> flujo de invitación multi-usuario quedó funcionando de punta a punta:
> los 2 bugs abiertos del cierre anterior (redirect_to a ivent, "Auth
> session missing!") están resueltos, ver detalle abajo en "Multi-usuario:
> candado de acceso + invitaciones").
>
> Actualización anterior: 21 de julio 2026 (sesión 21 — corregidas 2 notas
> obsoletas de "sin commitear" del 18 jul, que ya estaban commiteadas y
> pusheadas desde ese mismo día; botón de contacto "Correo" construido
> en los 3 temas de la página pública; y cerrado el hallazgo de
> seguridad del `ALTER DEFAULT PRIVILEGES` a nivel schema `tuasesor`,
> ver detalle en la sección de Decisiones abiertas / seguridad).
>
> Actualización anterior: 18 de julio 2026 (tema "Nocturno" agregado al
> sistema de temas de la página pública — commit `dc08fe8`, sin bitácora
> propia hasta ahora, ver nota abajo; fix de navegación con botón
> "atrás" del navegador en celular; botón de liga pública ahora también
> abre la página en pestaña nueva; botón de Compartir + QR homologado en
> los 3 temas de la página pública, antes solo existía en Estándar; y
> generador de post para Facebook por plantillas — sin IA generativa,
> decisión explícita para no romper el principio de cero costo).
>
> **Nota de proceso (18 jul)**: al conectar el repo esta sesión se
> encontró un commit del mismo día (`dc08fe8`, mensaje vacío "...") que
> agrega el tema Nocturno completo + cambios a `PerfilForm.jsx`
> (`correo_publico`, UI de "tarjeta de presentación"), y 4 archivos más
> modificados sin commitear encima de eso — nada de eso tenía bitácora
> ni entrada en este archivo. Se documenta aquí retroactivamente lo que
> se pudo confirmar leyendo el código; falta que quien hizo ese trabajo
> confirme alcance y pendientes reales.

---

## ⚠️ Incidente: corrupción de archivos por bug de sync del sandbox de Cowork (Sesión 15, resuelto)

- [x] **Causa**: el sandbox de Cowork lee la carpeta montada del repo con una vista a veces obsoleta/cacheada — un archivo editado por fuera (herramienta de edición real) puede no reflejarse de inmediato al leerlo por bash (`cat`, `git diff`, etc.), ya documentado desde Sesión 12. El riesgo nuevo descubierto hoy: el workaround usado en sesiones anteriores para forzar que git detectara un cambio (leer el archivo con bash y reescribirlo tal cual) es **peligroso** si la lectura de bash está obsoleta en ese momento — reescribe el archivo real con contenido viejo/truncado, perdiendo el cambio real. Esto truncó a medio JSX 4 archivos (`ListadoContactos.jsx`, `ListadoInteracciones.jsx`, `ListadoCitas.jsx`, `FichaColaboradores.jsx`) tras aplicar el fix de notas (ver abajo).
- [x] **Cómo se detectó**: por primera vez se logró correr un build real dentro de Cowork — copiando el repo (sin `node_modules`/`.git`) a una carpeta temporal fuera del repo y corriendo `npm install` ahí (para bajar los binarios nativos de Linux de Rolldown/Vite, distintos a los de Windows que trae el `node_modules` real). El build marcó 4 errores de sintaxis exactos en los archivos truncados.
- [x] **Reparado**: contenido reconstruido desde el commit previo al incidente + el fix de notas reaplicado, escrito con `cp` directo desde una copia ya verificada (nunca releyendo el archivo real por bash a medio arreglo). Verificado con dos builds limpios (258 módulos, sin errores) antes de comitear.
- [x] **Regla nueva, dura**: NUNCA usar "leer con bash + reescribir" como forma de forzar que git detecte un cambio hecho por la herramienta de edición real. Si `git diff`/`git status` no ve un cambio que sí existe, la única forma segura es escribir contenido ya verificado (ej. desde una copia de respaldo o `git show` de un commit bueno) directamente encima, sin pasar por una lectura de bash del archivo en su estado actual.
- [x] **Método nuevo para verificar builds en Cowork**: copiar el repo (excluyendo `node_modules` y `.git`) a una carpeta temporal fuera del repo, `npm install` ahí, `npm run build` ahí. Nunca correr `npm install` sobre la carpeta real montada — los binarios nativos de Linux instalados ahí romperían `npm run dev`/`build` en Windows.

---

## 🐌 Rendimiento — problema activo, reportado por Okta (Sesión 14)

- [ ] **La app se siente muy lenta al desplegar cada forma o listado** (revisar resto de módulos más allá de Contactos) — **movido a baja prioridad, ver sección al final del documento**.
- [x] **Causa 1 encontrada y corregida — import de contactos secuencial**: `ImportarContactos.jsx` hacía un INSERT por contacto MÁS otro INSERT por cada teléfono, uno a la vez, esperando cada respuesta de red antes de seguir. Con 5427 filas eso eran miles de round-trips secuenciales — "43 de 5427" a ese ritmo hubiera tardado horas. Reescrito a inserts por lote de 300 (`TAMANO_LOTE`); el id de cada contacto se genera en el cliente (`crypto.randomUUID()`) antes de insertar para ligar los teléfonos del lote sin depender del orden de respuesta de Postgres. Reduce miles de requests a un puñado.
- [x] **Causa 2 encontrada y corregida — `ListadoContactos.jsx` renderizaba todo de golpe**: con miles de contactos cargados, se pintaban todas las tarjetas en un solo paint (miles de nodos de DOM). Se agregó paginación en cliente ("Mostrar 100 más"), la búsqueda/filtros siguen operando sobre todos los contactos ya cargados en memoria (no se paginó el query, solo el render).
- [x] **Confirmado el conteo real e investigada su composición** (Sesión 15, verificado directo en Supabase): quedaron **5608 contactos** (no 5427), importados en 23 minutos — confirma que el fix de lotes funciona bien incluso a más volumen del esperado. Desglose: 5508 teléfonos ligados, 100 contactos sin ningún teléfono, **334 grupos de teléfonos duplicados** (355 filas de más) — consistente con la limitación ya documentada del importador (no deduplica contra otras filas del mismo archivo). 2554 contactos con nota, 864 con rol principal.
- [x] **Decidido (Sesión 16): NO limpiar los duplicados/contactos sin teléfono por ahora.** Cerrado sin acción — Okta decidió no priorizar la limpieza de los 334 grupos duplicados / 100 sin teléfono en esta sesión.

---

## 🚀 Pendiente inmediato — Deploy

- [ ] **Comitear y desplegar todo lo acumulado desde la Sesión 22
  (candado multi-usuario) hasta hoy 24 jul (campos de renta)** —
  instrucciones entregadas a Okta para correr desde su máquina, ver
  detalle abajo. Nada de esto se ha comiteado todavía.
- [x] **Hallazgo al preparar el comit (24 jul): historial divergido —
  `main` local mostraba "ahead 1, behind 1" contra `origin/main`.**
  Diagnosticado con `git diff` entre ambos commits: son el mismo cambio
  (candado de acceso multi-usuario), pero el commit ya pusheado en
  GitHub (`fbde1f7`) además borra `docs/bitacora/2026-07-23.md`, algo
  que el commit local (`6f645fd`) no tiene — parece un commit hecho por
  Okta directo en otra sesión/máquina que este checkout nunca llegó a
  sincronizar. **No se tocó nada del historial sin confirmar con
  Okta primero** (misma regla de "mostrar antes de ejecutar" ya
  establecida) — se le explicó el hallazgo junto con las instrucciones
  de comit, recomendando `git reset --mixed origin/main` (no destructivo,
  no toca ningún archivo de trabajo, solo realinea qué ya está
  comiteado) en vez de un `pull`/`merge` normal, y recuperar
  `docs/bitacora/2026-07-23.md` en vez de dejarlo borrado (esa bitácora
  documenta la primera mitad del 23 jul, `2026-07-23_2.md` es la
  continuación — son dos sesiones distintas del mismo día, no
  duplicados; seguirlo borrando iría contra la regla dura de este
  proyecto de nunca perder una bitácora ya cerrada).

- [x] **Subir a producción (`npm run deploy` → gh-pages → `tuasesor.eventosytech.com`)** — hecho en Sesión 12 (14 jul). Commit de todo lo pendiente de Sesión 11 preparado en Cowork (revisado a mano: sin secretos, sin archivos de sync colados); `npm run deploy` corrido por Okta desde su máquina — build de Vite ok (254 módulos), publicado.
- [x] **Fix: `CNAME` movido a `public/CNAME`** (Sesión 12) — el primer deploy de la sesión rompió el dominio custom (`tuasesor.eventosytech.com` → 404 "no GitHub Pages site here") porque `CNAME` vivía solo en la raíz del proyecto y Vite no lo copiaba al build; cada `npm run deploy` publica `dist/` completo a `gh-pages`, así que el dominio se perdió. Corregido copiando `CNAME` a `public/` para que sobreviva a todo build futuro. Confirmado vía `git show origin/gh-pages:CNAME` que ya está de vuelta en la rama.
- [x] **Confirmar que el sitio ya responde** (Sesión 15) — confirmado por Okta: `tuasesor.eventosytech.com` ya carga bien. Era propagación normal de certificado/CDN tras el incidente de Sesión 12, sin necesidad de intervención adicional.
- [x] Probar en el sitio real el flujo de PIN de la Bóveda y el envío de documentos por correo (Sesión 15) — confirmado por Okta: ambos funcionan en producción.
- [x] **Bundle inicial reducido de 716 kB a 189.12 kB gzip** (`index.js`, confirmado por build de Okta el 16 jul): `PropiedadForm` (47.88 kB gzip), `PerfilForm` (5.26 kB gzip) y `ExportaFicha` (487.15 kB gzip — incluye `@react-pdf/renderer`) ya no van en la carga inicial, solo al usarse. Code-splitting de Sesión 16 funcionando para estos tres.
- [x] **`ContactoForm` homologado a import dinámico en los 3 archivos que lo abrían en modal — confirmado con build** (Sesión 17, 16 jul): `ListadoInteracciones.jsx`, `ListadoCitas.jsx` y `FichaColaboradores.jsx` (el tercero no se había detectado en el warning original, se encontró al revisar todos los usos) pasaron de `import ContactoForm from ...` estático a `const ContactoForm = lazy(() => import(...))`, con `<Suspense>` alrededor del modal, mismo patrón que `App.jsx`. Warning `INEFFECTIVE_DYNAMIC_IMPORT` ya no aparece; `ContactoForm` quedó en su propio chunk (39.10 kB / gzip 9.21 kB), bundle inicial bajó de 189.12 a **182.44 kB gzip**.
- [x] **Push a `origin/main`** (Sesión 15, cerrado por Okta el 16 jul) — confirmado por Okta que ya se hizo desde su máquina.
- [x] **Limpieza de archivos sueltos en `.git/`** (arrastrado desde Sesión 12, cuantificado en Sesión 15, **resuelto Sesión 16**): los 9 `*.lock.old*` + 127 `tmp_obj_*` sí se pudieron borrar desde Cowork esta vez (`find .git -iname "*.lock.old*" -delete` y equivalente para `tmp_obj_*`, tras habilitar el permiso de borrado). Confirmado en 0 archivos sueltos restantes.
- [x] **Nueva instancia del bug de locks del sandbox, esta vez bloqueando a Okta directo** (Sesión 16): al intentar `git commit` en su máquina, salió `fatal: cannot lock ref 'HEAD': Unable to create '.git/HEAD.lock': File exists` — un `.git/HEAD.lock` viejo (no uno de los `*.lock.old*` ya limpiados arriba, sino uno activo/vigente) quedó de alguna operación de git anterior interrumpida por el sandbox. Resuelto borrándolo a mano (`del .git\HEAD.lock` en PowerShell) y reintentando el commit. **Refuerza la sospecha de que el sandbox de Cowork puede dejar procesos de git a medias sin limpiar su lock** — vigilar si se repite.

---

## 🐛 UX — scroll faltante en resultados de búsqueda (Sesión 16, corregido)

- [x] **Reportado por Okta con captura**: al buscar contacto por rol/empresa en `FichaColaboradores.jsx` (ver fix de arriba), una búsqueda con muchas coincidencias no tenía scroll propio — la lista de resultados crecía sin límite. Mismo patrón (contenedor con `overflow: 'hidden'` pero sin `maxHeight`/`overflowY`) se encontró también en los buscadores de contacto y de propiedad de `InteraccionForm.jsx`, `CitaForm.jsx` y `EnviarDocumentosBoveda.jsx` — corregidos los 5 puntos con `maxHeight: 260, overflowY: 'auto'`, mismo valor ya usado en el preview de importación de `ImportarContactos.jsx`.

---

## Fases y Sprints (mapa vigente)

- **Fase 1**: Propiedades (Sprint 1) → Contactos (Sprint 2) → Interacciones (Sprint 3) → Citas (Sprint N, número sin definir).
- **Fase 2**: Proceso Comercial (módulo completo) → resto de items diferidos abajo.
- Fases, Sprints y alcance de cada módulo son **acuerdos de trabajo, no contratos rígidos** — se ajustan según avanza el diseño en cada sesión.

---

## Sprint 1 — Propiedades: CERRADO

- [x] Wizard completo (Básico, Fotos y ubicación, Ficha técnica, Colaboradores), autosave, `ListadoPropiedades.jsx` (mapa + grid + búsqueda + filtro venta/renta).
- [x] Colaboradores probado con contactos reales (Sesión 9) — ya no está pendiente.
- [x] Botón "Quitar" colaborador, tarjeta de colaborador clicable → abre ficha de contacto como modal, ícono de correo (mailto) por colaborador (Sesión 9).
- [x] Descripción (columna real, no jsonb) — alimenta el PDF exportado.
- [ ] Ficha técnica: Historial y Situación fiscal y legal — **movido a baja prioridad, ver sección al final del documento**.
- [x] **Homologar accesibilidad (touch targets 44px) en Ficha técnica y Colaboradores** (Sesión 13): mismo criterio ya usado en Contactos (Sesión 11) — botones de ícono único (eliminar extra/comentario, correo/quitar colaborador) suben a 44×44; chips y toggles densos (Sí/No, esquemas de pago, roles) suben a 40px mínimo; botones "+ Agregar" quedan en 40px, igual que "+ Agregar teléfono" en ContactoForm.jsx. El anillo de foco global ya cubre estos controles desde Sesión 11, no requirió cambio.
- [x] **Ordenar `ListadoPropiedades.jsx`** (Sesión 11): selector Recientes/Título (A-Z)/Precio + filtro opcional por fecha de captación (`created_at`, Desde/Hasta), aplicado tanto en vista mapa (sheet) como grid — los pines numerados y las tarjetas comparten índice, se ordena antes de derivar ubicaciones.
- [x] **Fix: filtro de `ListadoPropiedades.jsx` con texto invisible** (Sesión 11, más tarde): el input de búsqueda se veía blanco sobre blanco. Causa raíz: `src/index.css` (boilerplate de Vite sin relación con el sistema `--ta-*`) declaraba `color-scheme: light dark`, y el navegador aplica texto claro nativo a inputs sin `color` explícito cuando el SO/navegador está en modo oscuro. Corregido a `color-scheme: light` (la app no tiene modo oscuro) + `color: var(--ta-text)` explícito en el input como refuerzo.

## Sprint 2 — Contactos: CERRADO (con incidente de migración ya resuelto)

- [x] `useContacto.js`, `ContactoForm.jsx`, `ListadoContactos.jsx` construidos de punta a punta; `empresa`, `rol_principal`, `correo` cerrados.
- [x] Desasociar propiedad, búsqueda global (nombre/teléfono/empresa/rol/correo) (Sesión 9).
- [x] `procesos_comerciales`: tabla + alta rápida ya construidos (Sesión 8) — el embudo vive ahí, no en `contactos`.
- [x] **Modelo de teléfonos migrado a `contacto_telefonos`** — confirmado funcionando en Contactos y Colaboradores tras resolver el incidente de abajo.
- [x] `FichaColaboradores.jsx` parchado para usar `contacto_telefonos` (ya no referencia la columna eliminada).
- [x] `ListadoContactos.jsx` ahora muestra conteo de interacciones y propiedades asociadas por tarjeta.
- [ ] Vincular una propiedad concreta a un proceso comercial ya creado sin ella — **movido a Fase 2** (ver "Proceso Comercial" abajo).
- [x] **Botón "Agregar a contactos" (exporta vCard .vcf)** (Sesión 16, `ContactoForm.jsx`): 5to botón del header junto a WhatsApp/Llamar/Correo/Enviar documentos — genera un vCard 3.0 (nombre, empresa, rol como `TITLE`, todos los teléfonos, correo, nota) y lo descarga como `.vcf` vía Blob + `<a download>`, sin dependencias nuevas. Al abrirlo en el teléfono, el sistema operativo lo pasa directo a Contactos nativo (crear o combinar) — eso lo hace el SO, no la app. (No confundir con el importador, que es la dirección contraria — de vCard/CSV hacia la app.) **Probado en celular real y confirmado por Okta (16 jul)**.
- [x] **Homologar accesibilidad en Contactos** (Sesión 11): touch targets a 44px mínimo (editar campos, marcar teléfono principal, quitar teléfono/propiedad, cerrar ficha, WhatsApp/Llamar/Correo) en `ContactoForm.jsx` e `InteraccionForm.jsx`; tarjeta de `ListadoContactos.jsx` y filas de resultado de búsqueda (antes `<div onClick>` sin tabIndex/role) ahora navegables por teclado; selector de "rol principal" convertido de `<div onClick>` a `<button>` real; anillo de foco global (`:focus-visible`, `--ta-accent`) agregado en `App.css`. Estados vacíos/carga de Contactos se revisaron y ya estaban homologados con Propiedades (skeleton, mensajes de "sin resultados", errores visibles) — no requirieron cambio. Pendiente: confirmar en dispositivo móvil real con Nydia.
- [x] **Importar contactos — CSV y vCard** (Sesión 11, `ImportarContactos.jsx`): pedido de Okta para los ~1000 contactos que Nydia ya tiene fuera de la app. Parser de CSV (RFC4180 básico) y de vCard escritos a mano, sin dependencias nuevas. CSV pasa por un paso de mapeo de columnas (auto-detección + selección manual, porque Google Contacts exporta decenas de columnas sin schema fijo); vCard no lo necesita (campos estándar FN/N/TEL/EMAIL/ORG). Vista previa con deduplicación por teléfono normalizado contra `contacto_telefonos` existente antes de importar. **Limitación conocida sin resolver**: no deduplica contra otras filas del mismo archivo si el archivo trae contactos repetidos. Import secuencial con barra de progreso (no bulk, para no depender de que Supabase preserve orden). Entrada desde un link "Importar contactos" en `ListadoContactos.jsx`.
- [x] **Campo "Rol principal" en el mapeo del importador** (Sesión 11, más tarde): Nydia va a asignar `rol_principal` a sus contactos desde Excel antes de exportar a CSV. Se agregó al paso de mapeo (auto-detección por columna `rol`/`role`/`puesto`/`cargo`/`title`), texto libre igual que en `ContactoForm.jsx` (sin enum), y soporte del campo `ROLE` de vCard como bono.
- [x] **Ordenar y filtrar por fecha en `ListadoContactos.jsx`** (Sesión 11): selector Más recientes/Nombre (A-Z)/Empresa (A-Z) + filtro opcional por fecha de creación (`created_at`, Desde/Hasta) — se agregó `created_at` al select, antes no venía.
- [x] **Eliminar contactos** (Sesión 11): botón de basura por tarjeta en `ListadoContactos.jsx`, `window.confirm()` (mismo patrón que el resto de la app, sin modal custom). Se verificaron los FK de `contactos` en Supabase antes de construir: TODAS las tablas hijas (`interacciones`, `contacto_telefonos`, `visitas`, `contacto_propiedades`, `propiedad_colaboradores`, `procesos_comerciales`) tienen `ON DELETE CASCADE` — el confirm() advierte explícitamente cuántas interacciones/propiedades asociadas se van a borrar junto con el contacto, usando los contadores que la fila ya traía.
- [x] **Vaciar contactos** (Sesión 11, más tarde): botón "Vaciar contactos" junto a "Importar contactos" en `ListadoContactos.jsx` — borrado masivo de TODOS los contactos del usuario (mismo cascade que "Eliminar contactos" de arriba, aplicado uno por uno en lotes de 200 ids). Pedido explícito de Okta: en vez de `window.confirm()`, modal propio que exige escribir la palabra **"Vaciar"** para habilitar el botón de confirmación (patrón "escribe para confirmar", como GitHub/Supabase para borrados masivos).
- [x] **Campo "Notas" en el importador** (Sesión 14): agregado al paso de mapeo de `ImportarContactos.jsx`, mismo patrón que "Rol principal" — auto-detección de columna (nota/note/comentario/observación), soporte del campo `NOTE` estándar de vCard, se guarda en la columna real `nota_sin_propiedad` (la misma que usa la sección "Nota" de `ContactoForm.jsx`).
- [x] **Manejo de archivos .xlsx en el importador** (Sesión 14): Okta preguntó por soporte directo de Excel. Decisión tomada explícitamente: NO agregar SheetJS/xlsx como dependencia nueva — el importador ya lee CSV, que es justo lo que produce "Guardar como > CSV" en Excel. En vez de dejar que un .xlsx suba y falle con un error críptico, se detecta la extensión y se muestra un mensaje guiando a exportar CSV primero (el `accept` del input se amplió para permitir seleccionarlos y que el mensaje se alcance a ver).
- [x] **Fix de rendimiento del import — inserts por lote** (Sesión 14): ver detalle en la sección "🐌 Rendimiento" arriba.
- [x] **Paginación en `ListadoContactos.jsx`** (Sesión 14): ver detalle en la sección "🐌 Rendimiento" arriba.
- [x] **Buscar contacto por rol o compañía, no solo nombre/teléfono** (pedido por Okta, Sesión 14; cerrado Sesión 16): `FichaColaboradores.jsx` ya lo tenía (Okta confirmó que "funciona" al probarlo). Homologado el mismo patrón (`.or()` con `nombre`/`rol_principal`/`empresa`) en `InteraccionForm.jsx` y `CitaForm.jsx`, que solo buscaban por nombre/teléfono — quedan los 3 buscadores consistentes.
- [x] **Fix: notas de contacto no se mostraban en la ficha** (Sesión 15): `ListadoContactos.jsx` no incluía `nota_sin_propiedad` en su `select()`, así que el campo llegaba vacío a `ContactoForm.jsx` aunque estuviera guardado en Supabase (confirmado: 2554 contactos con nota real tras el import de Sesión 14). Mismo hueco en los otros 3 puntos que abren `ContactoForm` en modal (`ListadoInteracciones.jsx`, `ListadoCitas.jsx`, `FichaColaboradores.jsx`) — tampoco traían `empresa`/`rol_principal`/`nota_sin_propiedad`. Corregidos los 4 selects. Ver incidente de corrupción arriba — este fix se vio afectado y tuvo que repararse en la misma sesión.

**⚠️ Incidente de migración (Sesión 10, resuelto)**: la migración original de `contacto_telefonos`/`interacciones` se corrió por partes, y las dos tablas nunca llegaron a crearse (el paso de `insert...select` que copiaba los teléfonos existentes falló silenciosamente al no existir la tabla destino). Después se corrió `drop column telefono` de todas formas, **perdiendo los números de teléfono de los contactos que existían hasta ese momento** (confirmado por Okta como datos de prueba, sin necesidad de restaurar backup). Se repararon ambas tablas con un script de un solo bloque + verificación inmediata vía `information_schema` (3 relaciones FK confirmadas). Contactos y Colaboradores funcionando de nuevo. **Lección aplicada**: ver "Principios vigentes" abajo.

## Sprint 3 — Interacciones: EN CURSO (módulo global entregado y probado — Sesión 11)

- [x] Tabla `interacciones` — creada y verificada (ver incidente arriba): `contacto_id` obligatorio, `propiedad_id` opcional, `canal` (whatsapp | llamada | redes_sociales | otro), `direccion` (entrante | saliente), `fuente` opcional, `nota`, `fecha_hora` editable.
- [x] `useInteraccion.js` + `InteraccionForm.jsx`: formulario único invocable desde cualquier lugar — Contacto siempre arriba y obligatorio (búsqueda por nombre o teléfono contra `contacto_telefonos`, con alta rápida si no existe), Propiedad siempre abajo y opcional. Sin selector de contexto.
- [x] Sección "Interacciones" agregada a `ContactoForm.jsx` con botón "+ Registrar interacción".
- [x] **Conectado el punto de entrada desde `FichaColaboradores.jsx`** (Sesión 11): botón "+ Registrar interacción" con la propiedad ya bloqueada, mismo `InteraccionForm.jsx` reutilizado (nuevo prop `propiedadTitulo`).
- [x] **Botón global "Registrar nueva interacción" — decidido**: vive en el FAB del nuevo módulo `ListadoInteracciones.jsx` (ver abajo), sin contacto ni propiedad bloqueados.
- [x] **Vista de listado propio de Interacciones — `ListadoInteracciones.jsx`** (Sesión 11), entrada nueva en el menú del avatar (TopBar). Decisión explícita de Okta: se agrega SIN quitar la sección dentro de `ContactoForm.jsx` — la sección sirve para registrar rápido sin salir del contacto, el módulo global sirve para ver/filtrar todo. Incluye: miniatura de portada de la propiedad + avatar de iniciales del contacto por fila (fila reacomodada tras feedback: fecha junto al avatar a la izquierda, miniatura al extremo derecho, canal como texto protagonista junto al nombre); tocar la fila abre la interacción en modo edición; tocar el avatar/nombre (con stopPropagation) abre la ficha del contacto en modal; filtro por canal; **selector de orden** (más recientes/contacto/propiedad — mismo patrón replicado luego en Contactos y Propiedades); **filtro por fecha** (Desde/Hasta) sobre `fecha_hora` (la fecha de la interacción misma, no `created_at` de la fila).
- [x] **Modo edición en `InteraccionForm.jsx`** (Sesión 11): prop `interaccionInicial` — reutiliza el UPDATE que `useInteraccion()` ya soportaba, solo faltaba poder arrancar precargado.
- [x] **Fixes de UX de la primera prueba real** (Sesión 11): (1) botón "Guardar" se quedaba deshabilitado en silencio si faltaba contacto o canal — se agregó aviso visible (causa real de por qué la tabla llevaba 0 filas hasta esta sesión); (2) `datetime-local` reemplazado por dos inputs nativos (fecha + hora) con íconos de calendario/reloj superpuestos — los inputs nativos no siempre traen su propio ícono, sin eso no había señal de que fueran controles tocables; (3) miniatura de propiedad agregada a `BuscadorPropiedad` (resultados y chip bloqueado).
- [ ] "Tareas" asociadas a una interacción — feature formal tipo to-do, **diferida a Fase 2**, sin schema reservado todavía.
- [x] **Probado de punta a punta con datos reales** (Sesión 11, confirmado con capturas de Okta) — ya no es un pendiente.
- [x] **Ícono del menú cambiado a teléfono** (Sesión 11, `TopBar.jsx`): antes era un globo de chat, no correspondía. Se decidió explícitamente NO renombrar el módulo a "Llamadas" — se queda "Interacciones" porque también cubre WhatsApp, redes sociales y otro, no solo llamadas.

## Sprint N — Citas: CERRADO (construido, probado, calendario confirmado — Sesión 15)

- [x] **Decisión tomada: módulo separado de Interacciones** (Sesión 13) — Interacciones sigue siendo bitácora de comunicación ya sucedida; Citas es agenda a futuro, con estado y propiedad siempre obligatoria. La tabla `visitas` ya existía en Supabase desde Sesión 10 (nunca se había usado) — se confirmó su schema real antes de construir en vez de asumir.
- [x] `useCita.js`, `CitaForm.jsx`, `ListadoCitas.jsx` construidos de punta a punta, mismo patrón que Interacciones (Sesión 11): formulario único invocable desde cualquier lugar, listado global filtrable/ordenable, FAB de alta, modal de edición al tocar una fila.
- [x] Puntos de entrada: sección "Citas" en `ContactoForm.jsx` (junto a Interacciones), botón "+ Agendar visita" en `FichaColaboradores.jsx` (propiedad ya bloqueada), nuevo módulo raíz en el menú de `TopBar.jsx`/`App.jsx` (cuarto ícono, calendario).
- [x] **Estados reales confirmados contra Supabase antes de construir la UI**: `programada`, `realizada`, `cancelada`, `no_asistio` — **no existe `confirmada`**, se descartó de los chips de estado en `CitaForm.jsx`/`ListadoCitas.jsx`.
- [x] Alta rápida de contacto dentro de `CitaForm.jsx` siempre pide nombre explícito (nunca solo teléfono como en Interacciones) — hay un trigger de BD (`trg_visitas_requiere_nombre`) que bloquea el INSERT si el contacto no tiene nombre.
- [x] **Probado con datos reales por Okta** (Sesión 13, segunda vuelta) — capturas confirmaron que el listado carga y se ve bien.
- [x] **Cintilla de color por estado** (Sesión 13, feedback tras probar): borde izquierdo de 3px con color por estado (verde programada, teal realizada, rojo cancelada, ámbar no_asistio) en `ListadoCitas.jsx` y en la sección "Citas" de `ContactoForm.jsx`. Mismo patrón ya usado en la etapa "Perdido" de Procesos comerciales — única otra excepción documentada a "un solo acento funcional".
- [x] **Vista de calendario (`CalendarioCitas.jsx`)** (Sesión 13): toggle Lista/Calendario arriba de `ListadoCitas.jsx`. Muestra 3 días a la vez (ayer/hoy/mañana relativo a un "día de enfoque" elegible con `<input type="date">` + flechas prev/siguiente), enfocado en horario regular 9:00–19:00. Citas fuera de ese rango se muestran como chips arriba de cada columna en vez de romper la rejilla. Reutiliza el arreglo `citas` que `ListadoCitas.jsx` ya carga completo — sin query nueva (dataset chico, 3-4 propiedades activas).
- [ ] Sin recordatorios/notificaciones — fuera de alcance por ahora (mismo criterio YAGNI que el resto del proyecto).
- [x] **Fix: rejilla del calendario "en blanco" + fecha de enfoque poco visible** (Sesión 14, tras primera prueba visual de Okta): las líneas de hora a 0.5px con `--ta-border` casi no tenían contraste contra `--ta-surface`, se veían vacías. `CalendarioCitas.jsx` reconstruido con CSS Grid (antes cada columna alineaba sola — si un día tenía chips "fuera de horario" y otro no, las rejillas quedaban desalineadas entre columnas); columna de etiquetas de hora (9:00–18:00) a la izquierda; líneas con `color-mix` sobre `--ta-text` (contraste garantizado); zebra sutil por hora; columna de "hoy" con tinte de acento + línea de "ahora" en vivo. Fecha de enfoque: encabezado grande en negritas/acento arriba del selector + el input de fecha también centrado y en negritas.
- [x] **Filtro por propiedad y por contacto en el calendario** (Sesión 14, pedido de Okta): dos selects en `CalendarioCitas.jsx`, opciones derivadas de las citas ya cargadas (sin query nueva), botón "Limpiar" cuando hay filtro activo.
- [x] **Fix: contacto no se podía cambiar al editar una cita** (Sesión 14, reportado por Okta con captura): `CitaForm.jsx` — Propiedad ya tenía botón "✕" para desbloquear y buscar otra, pero Contacto nunca lo tuvo (quedaba permanentemente fijo en modo edición). Se agregó el mismo patrón `onQuitar` a `BuscadorContactoConNombre`.
- [x] **Vista de calendario probada con datos reales** (Sesión 15) — confirmado por Okta que el calendario (grid, filtros, acento de "hoy") se ve y funciona bien tras los cambios de Sesión 14.

## 📧 Envío por correo (mailto) — decisión de arquitectura confirmada (Sesión 13)

- [x] **Decisión: se queda con `mailto:`, sin servicio de correo nuevo.** Dos limitaciones reales detectadas al probar con datos reales: (1) las URLs firmadas de Supabase se ven feas en el cuerpo del correo — no se pueden acortar sin agregar infraestructura (Edge Function de redirección); (2) el remitente ("De:") lo decide la app de correo predeterminada de quien abre el link, no el código — es una limitación de `mailto:` en sí, no de esta app. Okta eligió explícitamente NO agregar un servicio de correo transaccional (Resend/SendGrid) para resolver esto, manteniendo el principio de cero costo/infra del proyecto.
- [x] **Mitigación aplicada**: aviso visible en `EnviarDocumentosBoveda.jsx` bajo el botón "Abrir correo" explicando que el remitente depende de la app de correo predeterminada del dispositivo, no de TuAsesor.
- [ ] **Acción para Nydia (no es código)**: configurar su app de correo predeterminada — **movido a baja prioridad, ver sección al final del documento**.

---

## 📄 PDF de ficha técnica — CERRADO (Sesión 9)

- [x] `ExportaFicha.jsx`, generación client-side con `@react-pdf/renderer`, checkboxes por sección, Web Share API + fallback descarga, archivado automático en el Vault.
- [x] Marca del asesor: nombre comercial tipo masthead, teléfono clicable, logo como marca de agua (420×420px, 14% opacidad), footer con isotipo.
- [x] Isotipo guardado en `src/assets/logo-isotipo-tuasesor.png` — confirmado por Okta (Sesión 13).
- [x] Marca de agua del PDF se ve bien con el ajuste actual — confirmado por Okta (Sesión 13). Pendiente desde Sesión 9, cerrado.
- [x] `@react-pdf/renderer` instalado — confirmado por Okta (Sesión 13, `npm install` corrido, "up to date", 0 vulnerabilidades).
- [x] **Rediseño completo (Sesión 18, 16 jul, pedido de Nydia)**: Fotografías pasa a ser la primera sección (antes iba después de precio/stats), cuadrícula uniforme sin distinción portada/galería, límite de fotos subido de 8 a 12. Header fijo (nombre/teléfono/insignia con el logo real de perfil) repetido en ambas páginas. Precio como CTA de cierre en la página 1 ("Más información al [tel]"); salto de página forzado antes de la ficha técnica de la página 2 (stats/dirección/equipamiento), y salto adicional antes de la descripción cuando hay más de 6 fotos o la descripción es más larga que ~media página (heurística por líneas, no caracteres). Bloques que ya no se cortan a la mitad entre páginas (`wrap={false}`): precio CTA, stats+dirección+cuota, tabla de equipamiento. Equipamiento y amenidades pasa de 1 a 2 columnas. Marca de agua chica (isotipo verde de TuAsesor, 30% opacidad, esquina inferior derecha) en cada foto de la ficha.
- [x] **Favicon (ícono de la pestaña del navegador) cambiado** (Sesión 18): antes era el logo genérico de Vite (nunca se había tocado `public/favicon.svg`), ahora es el isotipo dorado de TuAsesor (`#BC7130`, distinto del verde). Requirió `?v=2` en el `<link>` de `index.html` para forzar al navegador a dejar de usar el favicon cacheado. El isotipo verde del footer del PDF no cambió — se queda como estaba.

## 🔒 Bóveda de documentos (Vault) — CERRADA (pantalla, envío y PIN — Sesión 11)

- [x] Tabla `documentos_propiedad` (RLS por dueño, solo propiedades por ahora) + bucket privado `bucket-propiedad-vault` (20MB, PDF/Word/Excel/TXT/JPEG/PNG/XML/EML/SVG).
- [x] Pantalla completa (`FichaDocumentos.jsx`): subir cualquier documento, listar por propiedad, descargar vía URL firmada, borrar. Mensajes de error amigables para archivo grande o tipo no permitido ya incluidos.
- [x] **Botón "Enviar a cliente" — construido** (Sesión 11, `EnviarDocumentosBoveda.jsx`, entrada desde `ContactoForm.jsx`): reemplaza la decisión anterior de "100% uso interno". Flujo: elegir/actualizar el correo del contacto → checkbox "Incluir documentos de una propiedad" → buscador de propiedad → checklist de sus documentos en la Bóveda (nada preseleccionado, son documentos privados) → arma un `mailto:` con links de descarga firmados que **vencen en 24 horas** (decisión de Okta). No son adjuntos reales (mailto no lo permite), son links con vigencia.
- [x] **PIN de seguridad de la Bóveda + "olvidé mi PIN"** (Sesión 11): configurable en Perfil > Seguridad (`PerfilForm.jsx`) — PIN de 4 dígitos guardado hasheado (SHA-256 + salt, `src/lib/bovedaPin.js`) en `tuasesor.perfiles.boveda_pin_hash`/`boveda_pin_salt` (migración aplicada). `FichaDocumentos.jsx` pide el PIN antes de mostrar nada si está configurado (desbloqueo dura la sesión del navegador, vía `sessionStorage`). "Olvidé mi PIN": código de 6 dígitos generado EN MEMORIA (nunca se guarda en BD), enviado por `mailto:` al propio correo de Nydia — mismo patrón mailto que ya usa el resto de la app, sin servicio de correo nuevo ni costo adicional.
- [ ] **Pendiente de probar con Nydia** (ver abajo): tanto el envío de documentos como el PIN dependen de `mailto:`/`sessionStorage`, que se comportan distinto en el celular real y en producción vs. local.
- [x] **Tooltip + ícono del botón "Enviar documentos" en `ContactoForm.jsx`** (Sesión 13): el botón solo tenía `aria-label` (invisible para usuarios videntes) y su ícono (sobre + flecha) era casi indistinguible del ícono de correo (mailto) junto a él — Okta reportó que no había forma de saber para qué servía. Se agregó `title` (tooltip nativo al pasar el mouse) a los 4 botones de acción rápida del header (WhatsApp, Llamar, Correo, Enviar documentos), y se rediseñó `IconoEnviarDocs` a un documento con esquina doblada + líneas de movimiento (referencia visual de Okta), distinto del sobre simple.
- [x] **Escanear documento con la cámara** (Sesión 16, `EscanearDocumento.jsx`, nuevo botón junto a "Elegir archivo..." en `FichaDocumentos.jsx`): abre la cámara directo (`capture="environment"`), muestra la foto con 4 esquinas arrastrables, endereza la perspectiva en vivo (2 triángulos + transformación afín, sin librería nueva — algoritmo prototipado y aprobado por Okta antes de construirlo) y entrega un JPEG que reutiliza el mismo `subirDocumento()` que ya existía. Nivel 2 de 3 discutidos con Okta (cámara + recorte manual); se descartó auto-detección de bordes tipo CamScanner (Nivel 3) por requerir una librería pesada, en contra del principio de cero costo/infra. **Probado en celular real y confirmado por Okta (16 jul)**.

## 🌐 Página pública de presentación por propiedad (Sesión 18, 16 jul) — construida y desplegada

- [x] **Decisión de alcance**: 1 propiedad = 1 página pública (link individual, como el que se manda por WhatsApp), NO un catálogo/marketplace navegable de todas las propiedades de Nydia — eso sigue siendo una pieza más grande y separada (ver Fase 2 abajo, sigue diferida si se decide construirla).
- [x] Ruta pública `/p/:id` sin login — ruteo manual en `main.jsx` (la app no usa react-router en ningún otro lado; se agregó un chequeo de `window.location.pathname` en vez de sumar la dependencia solo para esta ruta).
- [x] Fallback de GitHub Pages (`public/404.html` + script en `index.html`, técnica estándar rafgraph/spa-github-pages) — sin esto, abrir el link directo (no navegando desde dentro de la app) daba 404 de GitHub antes de que React cargara.
- [x] Migración en Supabase: columna `propiedades.publicado` (default `false` — Nydia decide explícitamente cuáles publicar) + 3 vistas públicas (`propiedades_publicas`, `fotos_propiedad_publicas`, `perfiles_publicos`) con `GRANT SELECT` solo a esas vistas, nunca a las tablas reales (que siguen con su RLS de "solo el dueño" de siempre). Las vistas excluyen `historial_propiedad`, `situacion_fiscal_legal` y `comentarios` internos del jsonb `ficha` — mismo criterio "información sensible, oculta por default" que ya usa la ficha PDF.
- [x] Toggle "Publicar" en `FichaBasico.jsx`, apagado por default.
- [x] Botón de liga pública en el header de `PropiedadForm.jsx` — copia `tuasesor.eventosytech.com/p/{id}` al portapapeles, solo visible cuando `publicado=true` y la propiedad ya está guardada.
- [x] `PropiedadPublica.jsx`: galería (1 foto grande + 4 chicas con overlay "+N fotos"), tarjetas de stats con ícono (recámaras/baños/estacionamientos/m² construcción/m² terreno/zona), tarjeta de precio con botón de WhatsApp + "Compartir" (Web Share API con fallback a copiar liga), tarjeta de contacto de Nydia, descripción, amenidades, mapa de Leaflet (mismo patrón ya usado en `FichaMediaUbic.jsx`, sin dependencia nueva). Iconografía propia en SVG, sin emojis.
- [x] **Rediseño v2** tras mockup interactivo (Okta pidió trabajar con mockups antes de tocar código real, mismo criterio que se va a seguir usando para cambios visuales grandes): paleta blanco + verde bosque (sin el caliza de fondo del resto de la app — pedido explícito, "público de alta plusvalía"), layout inspirado en dos fichas reales que compartió Okta (Lamudi/Inmuebles24-style).
- [x] **Desplegado a producción** (16 jul, confirmado por Okta).
- [ ] **Pendiente: seguir mejorando el diseño visual.** Okta, tras ver la v2 en vivo: "se ve mejor, tiene potencial pero aquí lo dejamos" — no hay lista específica de qué falta todavía, retomar con feedback nuevo cuando Okta lo traiga. Probable que valga la pena seguir iterando con mockups antes de tocar el código real, como se hizo esta vez.
- [ ] Pendiente de probar en celular real y con Nydia.

## 🖼️ Rebranding del logo de TuAsesor (17 jul) — favicon/TopBar/Login/PDF actualizados

- [x] **Isotipo nuevo**: 4 cuadrados en escalera (guía completa en
  `src/assets/GUIA-DE-ESTILO Logotipo TuAsesor.md` — colores, tipografía
  Baloo 2, reglas de uso). Variante compacta de 2 cuadros sobre fondo
  verde carbón para usos de ícono (favicon, avatar) — la de 4 cuadros
  completa no se lee bien a tamaños chicos.
- [x] **Favicon**: reemplazado el SVG viejo por PNGs en 4 tamaños
  (`public/favicon-16/32/64/256.png`, copiados de
  `src/assets/logo-isotipo-tuasesor-N.png`) — `index.html` actualizado
  con `<link rel="icon">` por tamaño + `apple-touch-icon`, cache-bust a
  `?v=3`. `public/favicon.svg` se queda sin usar (no se borró, solo dejó
  de referenciarse).
- [x] **Ícono del menú (`TopBar.jsx`)**: import cambiado de
  `assets/branding/logo-isotipo-dorado.svg` (diseño viejo) a
  `assets/logo-isotipo-tuasesor.png` (variante compacta nueva).
- [x] **Logo de la pantalla de login (`LoginForm.jsx`)**: import cambiado
  de `assets/branding/logo-cuadros-verde-texto-dorado.svg` a
  `assets/logo-cuadros-verde-texto-dorado.png` (mismo nombre, contenido
  nuevo — isotipo completo de 4 cuadros + texto "TuAsesor").
- [x] **Marca de agua del PDF (`ExportaFicha.jsx`)**: ya usaba
  `assets/logo-isotipo-tuasesor.png` sin cambiar el import — se actualizó
  sola al reemplazar el archivo. Se guardó backup del isotipo viejo en
  `logo-isotipo-tuasesor.old.png` (sin usar, solo referencia).
- [x] **Limpieza de PNGs sueltos sin usar** (Okta, antes de esta sesión):
  `logo-solido-dorado.png`, `logo-solido-verde.png`, `logo-tuasesor.png`
  borrados — ya no los importaba nada.
- [ ] **`src/assets/branding/*.svg` (5 archivos) quedaron sin usar** tras
  este cambio — nadie los importa ya. No se borraron (fuera del alcance
  de esta sesión); Okta puede limpiarlos cuando quiera.
- [x] **Ícono del menú (`TopBar.jsx`) actualizado a vector real**:
  `branding/logo-isotipo-dorado.svg` que subió Okta es un vector limpio
  (6 paths, 2 colores reales de marca) — reemplazó al PNG de respaldo.
- [ ] **Los 2 SVG del logo completo (`branding/logo-cuadros-*.svg`) NO
  son vectores limpios** — son trazado automático de una imagen (100+
  paths, decenas de tonos de dorado casi idénticos por anti-aliasing),
  pesados (117–173 KB c/u vs. ~10 KB de un vector real) y con bordes
  menos nítidos de cerca. `LoginForm.jsx` se quedó en el PNG (más
  liviano, ya probado, se ve bien a 220px). Pendiente: si Okta consigue
  exportar un vector real desde la herramienta de diseño original (no
  "convertir PNG a SVG"), cambiar el import de `LoginForm.jsx` a ese SVG.

## 🚨 Fix de seguridad urgente: escritura anónima en vistas públicas (17 jul) — RESUELTO

- [x] **Hallazgo** (al verificar la migración de `estilo_pagina_publica`):
  las 3 vistas públicas (`perfiles_publicos`, `propiedades_publicas`,
  `fotos_propiedad_publicas`) son "security definer" por diseño (dueño
  `postgres`, con `bypassrls` — necesario para que `anon` pueda leer
  filas filtradas por `publicado=true` aunque las tablas reales tengan
  RLS de "solo el dueño"). El problema: además de `SELECT`, `anon` y
  `authenticated` tenían también `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE`
  sobre esas 3 vistas (heredado de un grant amplio a nivel de schema, no
  algo agregado hoy). Como son vistas simples de una sola tabla, esos
  comandos se propagan a la tabla real — **bypaseando el RLS por
  completo**. Cualquier visitante anónimo (sin login, solo con la
  `anon key` pública del bundle) podía borrar o modificar propiedades,
  perfiles o fotos reales de Nydia con una petición HTTP directa.
  Confirmado con `get_advisors` (Supabase) — lint `security_definer_view`
  en nivel ERROR sobre las 3 vistas.
- [x] **Corregido**: `REVOKE INSERT, UPDATE, DELETE, TRUNCATE` sobre las
  3 vistas para `anon` y `authenticated`, dejando únicamente `SELECT`.
  Verificado con `information_schema.role_table_grants` — no rompe nada,
  la página pública solo necesitaba lectura.
- [x] **Resuelto (21 jul, sesión 21)**: confirmado que el grant amplio venía
  de un `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA tuasesor`
  que daba `INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN` a
  `anon` y `authenticated` en cualquier tabla nueva por default (más
  `SELECT/UPDATE/USAGE` en secuencias). Hallazgo nuevo al confirmarlo:
  `TRUNCATE` estaba entre los privilegios — y `TRUNCATE` es la única
  operación DML que Postgres **no filtra con RLS** (no hay caso de uso
  real desde la app, nadie lo pidió a propósito, era arrastre de un
  `GRANT ALL`/default sin acotar). No explotable hoy vía la REST API de
  PostgREST (no expone `TRUNCATE`), pero sin ninguna razón de negocio
  para existir.
  **Aplicado** (2 migraciones, `restringir_default_privileges_schema_tuasesor`
  + `revocar_maintain_y_cerrar_default_anon` — la segunda corrige que
  `MAINTAIN`, privilegio nuevo de Postgres 17, se había quedado fuera del
  primer REVOKE): `anon` queda en cero privilegios tanto en las 11 tablas
  reales como en el default de objetos futuros (nunca tiene casos de uso
  ahí, todo lo público pasa por las 3 vistas `*_publicas` con `GRANT
  SELECT` explícito, sin cambio); `authenticated` conserva exactamente
  `INSERT/SELECT/UPDATE/DELETE` en tablas reales y `SELECT` en las vistas
  públicas — igual que hoy, sin cambio funcional para la app, solo se le
  quitó `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN` que no usa.
  **Incidente propio durante el fix, ya corregido en la misma sesión**: el
  primer `REVOKE SELECT ... ON ALL TABLES IN SCHEMA tuasesor FROM anon`
  se aplicó pensando solo en las 11 tablas reales, pero en Postgres "ALL
  TABLES IN SCHEMA" incluye vistas — le quitó por accidente el `SELECT` a
  `anon` en las 3 vistas públicas, lo que habría roto `/p/:id` para
  cualquier visitante sin sesión. Detectado de inmediato al verificar con
  query, corregido con un `GRANT SELECT` puntual sobre las 3 vistas en la
  migración `restaurar_select_anon_vistas_publicas`, confirmado con
  `get_advisors` que no quedó ninguna regresión. **Lección para futuras
  migraciones de grants en este schema**: nunca usar `ON ALL TABLES IN
  SCHEMA` cuando el schema mezcla tablas privadas y vistas públicas con
  necesidades de acceso distintas — apuntar a la lista explícita de
  tablas o de vistas, nunca al schema completo.
  Si algún día una tabla nueva necesita `bigserial`/`identity` (hoy todo
  usa `gen_random_uuid()`, no hay secuencias reales), quien escriba esa
  migración deberá agregar un `GRANT USAGE ON SEQUENCE ... TO
  authenticated` explícito — el default de secuencias también quedó en
  cero para ambos roles.

## 🎨 Sistema de temas para la página pública (17 jul) — CONSTRUIDO, en revisión visual

- [x] **Decisión de producto**: la página pública deja de ser un solo diseño — se vuelve un sistema de temas seleccionable por asesor (`perfiles.estilo_pagina_publica`, un tema a la vez por asesor). Arrancamos con 2: **Estándar** (el actual, verde bosque/caliza) y **Elegance** (blanco/negro/dorado, `Playfair Display` + `Montserrat`) — reservado para Nydia mientras sea la única usuaria (`perfiles.acceso_tema_elegante`).
- [x] **Arquitectura construida** (17 jul, "parte 1"): `usePropiedadPublica.js` (hook compartido de fetch/formato), `iconos.jsx` + `componentesCompartidos.jsx` (Marca, Lightbox — reusables entre temas), `temas/registro.js` (mapa estilo → componente con `lazy()`, fallback a Estándar), `temas/estandar/PresentacionEstandar.jsx` + `estandar.css` (el diseño actual, movido tal cual, sin cambios visuales). `PropiedadPublica.jsx` quedó como shell delgado. Build y lint verificados limpios.
- [x] **Columna `perfiles.estilo_pagina_publica` creada** (`text default 'estandar'`, sin `CHECK` — el registro de temas en código decide qué es válido) y agregada a la vista `perfiles_publicos` con su `GRANT SELECT` a `anon` (ver también el fix de seguridad de arriba, encontrado al verificar esta migración).
- [x] **Selector de tema en `PerfilForm.jsx`** ("Página pública", junto a Marca): autosave igual que color de acento. Estándar siempre visible; Elegance solo aparece si `perfiles.acceso_tema_elegante = true` (columna real, activada a mano por asesor — hoy solo Nydia). Migración aplicada y verificada.
- [x] **Regla de mockup-primero rota una vez, corregida después** (17 jul): la primera versión de Elegance se construyó directo en código, sin mockup previo — Okta lo notó ("nos faltó discutir primero tu mockup"). A partir de ahí, toda la iteración visual de Elegance se hizo con la herramienta de mockup (10+ rondas) y el código real se tocó hasta el final, ya con el diseño aprobado. Se mantiene la regla para cambios visuales grandes futuros.
- [x] **Tema "Elegance" — construido e iterado hasta código final** (17 jul): `temas/elegante/PresentacionElegante.jsx` + `elegante.css`. Header con logo de TuAsesor + fecha/hora en vivo + "Solicitar Tour" (WhatsApp), botones redondeados (6px) en todo el tema. Carrusel principal (flechas + puntos) + columna de miniaturas, reutiliza el Lightbox compartido. Fila de stats simplificada (sin divisores/cajas por ítem, íconos más grandes) — diverge del diseño con cajas que tenía la primera versión, ajustado tras varias rondas de mockup. Cuerpo en grid 2:1 (carrusel:sidebar, antes 1.6:1). Sidebar: precio + CTAs (WhatsApp / Solicitar ficha técnica) y tarjeta de la asesora **fusionados en una sola tarjeta** con un divisor interno (antes eran dos tarjetas separadas). Foto de Nydia arriba del nombre (apilado, centrado, esquinas redondeadas — antes iban lado a lado). Botones de contacto de la asesora (WhatsApp, Llamar) con fondo negro (`--pe-dark`) e ícono/texto dorado (`--pe-accent`), mismo patrón que el botón "Solicitar Tour" del header. Mapa Leaflet + link "Ver en Google Maps". Color de acento actualizado de `#B8963A` (dorado de marca) a **`#C5A059`**, el que indica `docs/gemini-code-EstiloPaginaPropiedad.md` — contradicción marca-vs-guía que Okta resolvió explícitamente ("usa lo que la guía visual dicte"); el logo de TuAsesor en el header se queda en su dorado de marca (`#B8963A`), sin resolver todavía si debe alinearse también. Playfair Display (500 títulos / 700 precio) + Montserrat cargadas solo cuando este tema está activo. Build + lint verificados limpios tras el port final.
- [x] **Botón de contacto "Correo" — construido en los 3 temas** (21 jul, sesión 21): nuevo `IconoCorreo` en `iconos.jsx` (sobre, mismo trazo 1.8 que el resto). **Estándar**: el teléfono pasó de texto plano a link `tel:` real + botón `mailto:` debajo, mismo estilo discreto (fila de ícono+texto, sin CTA lleno — Estándar no tenía un botón "Llamar" separado de WhatsApp, se construyó a la par). **Elegance**: tercer botón dentro de `.pe-contactos`, junto a WhatsApp/Llamar, mismo estilo `.pe-contacto-btn`. **Nocturno**: botón secundario `.no-cta-secundaria` (`mailto:`) debajo del row de WhatsApp/Ficha técnica/Llamar. Los 3 solo se muestran si `perfil?.correo_publico` existe. Build verificado limpio (273 módulos, sin errores) y lint sin regresiones (55 errores preexistentes del repo, ninguno en los archivos tocados).
- [x] **Decisión resuelta: el correo de contacto público es un campo separado del correo de login** (`perfiles.correo_publico`, editable, opcional) — no se expone el correo real de la cuenta de Supabase Auth.
- [x] **Fix: `.pe-header` y `.pe-galeria` no compartían el `max-width` de `.pe-cuerpo`** (17 jul, encontrado por Okta al probar en `localhost:5173` con la ventana ancha — "no construiste lo que rebotamos con mockups"): `.pe-cuerpo` ya tenía `max-width: 980px; margin: 0 auto`, pero el header y la galería no — en pantallas anchas se estiraban de borde a borde de la ventana mientras el precio/título quedaban en una columna centrada más angosta, rompiendo la sensación de "una sola tarjeta" que sí tenía el mockup (siempre a un ancho fijo). El desfase venía desde la construcción original de Elegance, no se detectó antes porque el mockup nunca se revisó a ancho de ventana completo. Corregido: nuevo `.pe-header-inner` (max-width 980px, centrado) dentro de `.pe-header` (que se queda full-bleed solo para el fondo/borde), y `max-width`/`margin: 0 auto` agregado directo a `.pe-galeria`. Build verificado limpio.
- [x] **Nota, no es bug**: el título de la propiedad de prueba sale en MAYÚSCULAS en la página pública — verificado directo en Supabase (`propiedades_publicas.titulo = "CASA EN VENTA EN PRIVANZAS DEL CAMPESTRE"`), es el dato tal como se capturó, no una transformación de CSS. Contra la fuente serif del tema Elegance se ve más pesado que en el mockup (que usaba texto en mayúsculas/minúsculas normales a mano) — vale la pena que Nydia sepa que cómo captura el título en `PropiedadForm.jsx` sí se refleja tal cual en la página pública.
- [ ] **Pendiente de revisar con Okta/Nydia en vivo**: refrescar `localhost:5173` (recarga forzada) tras el fix de `max-width` y confirmar si ya se parece al mockup aprobado; confirmar si el botón "Solicitar ficha técnica" debe decir/hacer algo distinto mientras no exista el formulario de leads (Fase 2).
- [x] **Header de Elegance definido** (mockup de Okta, logo "PRISE" de referencia): el menú completo (Propiedades/Servicios/Nosotros/Contacto) NO se construye — el alcance sigue siendo 1 propiedad = 1 página, no un sitio completo. Esa zona del header se usa para marca "TuAsesor" + logo de Nydia (el logo va a necesitar trabajo aparte para que rime con la estética Elegance) + fecha/hora arriba. Botón "Solicitar Tour" se queda.
- [x] **CTA "Contactar asesor"/"Solicitar ficha técnica" — se quedan como WhatsApp directo por ahora**, igual que hoy. El formulario que capture el lead directo al CRM (contacto + proceso comercial) le gustó a Okta pero se difiere — **movido a Fase 2** (ver abajo), para cuando se arme el módulo de leads/Proceso Comercial. Implica un INSERT público controlado (RLS, anti-spam) — no es solo visual, hay que diseñarlo con cuidado cuando llegue el momento.
- [x] **Descartado del mockup de Elegance**: sección "Clientes satisfechos" (logos de aliados — no aplica al negocio de Nydia) y "Recibe novedades exclusivas" (newsletter — implicaría guardar correos sin tener después cómo enviarles nada, en contra de YAGNI).
- [x] Mapa: se mantiene Leaflet/OpenStreetMap embebido (ya decidido, gratis) + link "Ver en Google Maps" (`google.com/maps?q=lat,lng`, sin API key) — ya construido en `PresentacionElegante.jsx`.

### Tema "Nocturno" (18 jul) — tercer tema, construido y commiteado sin bitácora

- [x] **`temas/nocturno/PresentacionNocturna.jsx` + `nocturna.css`** (commit `dc08fe8`, mismo día, sin mensaje de commit ni bitácora — documentado retroactivamente): tercer tema de la página pública, reservado por asesor vía `perfiles.acceso_tema_nocturno` (mismo patrón de acceso que Elegance). Según los comentarios del propio código: header con logo/nombre de la ASESORA (no de TuAsesor); precio + CTAs + tabla de datos arriba junto a la galería; specs en tabla (no tarjetas); vitrina de ubicación chica en vez de mapa grande embebido. Reusa el mismo hook/íconos/Lightbox que Estándar y Elegance.
- [ ] **Pendiente de confirmar**: ¿ya se probó en `localhost`/producción con datos reales? ¿Hay mockup aprobado por Okta como en Elegance? No hay bitácora de esa sesión que lo confirme.
- [x] Selector de tema en `PerfilForm.jsx` ya soporta Nocturno (columna `acceso_tema_nocturno` referenciada en el `select` de perfil).

## 🔗 Fixes de navegación y compartir en página pública (18 jul)

- [x] **Fix: botón "atrás" del navegador en celular sacaba de la app por completo** (reportado por Okta): `vista` en `App.jsx` era solo estado de React, sin ninguna entrada en el historial del navegador — el primer "atrás" no tenía a dónde ir dentro de la app, así que salía de la PWA/pestaña y había que reabrir todo desde cero. Corregido sin agregar react-router (la app sigue siendo un solo módulo raíz con `vista` como estado interno): nuevo `irAVista()` centraliza cada cambio de vista real y hace `history.pushState` con `{ vista, propiedadSeleccionada, contactoSeleccionado }`; un listener de `popstate` restaura ese estado cuando el usuario presiona atrás; `history.replaceState` al montar deja un punto de partida ("buscador") para que el primer atrás navegue dentro de la app. Verificado con build limpio (272 módulos).
- [x] **Fix: botón de liga pública en `PropiedadForm.jsx` copiaba pero no abría nada** (reportado por Okta): `copiarLigaPublica()` ahora, además de copiar al portapapeles, abre la página pública en pestaña nueva (`window.open(url, '_blank', 'noopener')`).
- [x] **Botón de Compartir + QR homologado en los 3 temas** (pedido por Okta — antes solo Estándar tenía "Compartir", Elegance y Nocturno no tenían ningún botón de compartir): nuevo componente compartido `ModalQR` en `componentesCompartidos.jsx` (overlay con imagen de QR generada vía la API pública/gratuita `api.qrserver.com`, sin dependencia nueva, mismo criterio "servicio externo sin costo" que ya usa el mapa OSM/Nominatim) + ícono nuevo `IconoQR` en `iconos.jsx`. Cada tema ahora tiene una fila "Compartir" (reusa `compartirLiga`/`compartido` del hook `usePropiedadPublica`, ya existía) + botón de QR junto a él, con el estilo propio de cada tema (Estándar: botón blanco con borde; Elegance: outline dorado/negro; Nocturno: outline `--no-border-strong`, clases nuevas `.no-ctas-share`/`.no-cta-compartir`/`.no-cta-icono` en `nocturna.css`).
- [ ] **Pendiente de probar en celular real**: los 3 fixes de arriba solo se verificaron con build/lint limpios en Cowork — falta confirmar visualmente en un celular real (el bug original del botón "atrás" solo se reproduce en navegador móvil, no en desktop).
- [x] **Commiteado y pusheado** (confirmado 21 jul, sesión 21): commit `06a5503` ("Nav con historial (boton atras), liga publica en pestana nueva, compartir+QR en los 3 temas, generador de post Facebook por plantillas", 18 jul 22:52) incluye estos 3 fixes + `correo_publico`/tarjeta de presentación de `PerfilForm.jsx` + el generador de posts de Facebook. `git status` limpio, `origin/main` al día — la nota de "sin commitear" de esta sección y de la sección de temas (línea de `correo_publico`) estaba desactualizada, corregida en esta sesión.

## 📱 Generador de post para Facebook (18 jul) — construido, por plantillas

- [x] **Decisión de arquitectura (18 jul, a pedido de Okta, rebotada antes de construir)**: el ítem de Fase 2 "Generador de posts para redes sociales con IA" originalmente proponía una Edge Function → API de Claude. Se descartó esa ruta: llamar a un modelo por HTTP tiene costo por generación, y rompería el único criterio de cero-costo que ha seguido todo el proyecto (mailto en vez de servicio de correo, Nominatim/OSM en vez de Google Maps de paga, sin WhatsApp API oficial). En su lugar: generador 100% local por plantillas, usando los datos que Nydia ya captura (título/descripción los sigue escribiendo ella a mano, igual que hoy) — sin IA generativa, sin llamada externa, sin costo por uso.
- [x] **`GeneradorPostFacebook.jsx`** (nuevo, `src/features/propiedades/`): modal con checklist de qué datos incluir (zona, precio, recámaras, baños, estacionamientos, m² construcción/terreno, amenidades destacadas, hashtags) + selector de 3 estilos ("Directo": emojis y bullets; "Elegante": texto corrido; "Datos rápidos": caption corto). El texto sale en un textarea editable — mientras Nydia no lo edite a mano, cambiar checklist/estilo lo regenera solo; en cuanto edita directo, se detiene el auto-regenerado (con aviso visible) y queda el botón "Regenerar" para empezar de nuevo. Botón "Copiar texto" con el mismo patrón de feedback (2s) que el resto de la app. No publica directo a Facebook (no hay integración con Meta API) — se copia y se pega a mano.
- [x] **Botón de entrada**: ícono de Facebook (monocromo, mismo criterio que el ícono de WhatsApp) en el header de `PropiedadForm.jsx`, junto a Exportar PDF y Copiar liga pública — solo habilitado cuando la propiedad ya está guardada.
- [x] **Sección "Estatus legal" omitida del todo** (decisión de Okta): la Ficha técnica no tiene ese campo lleno todavía (ver "Baja prioridad" abajo), así que el post no la incluye en vez de mostrar algo vacío o inventado.
- [x] **Si la propiedad está publicada** (`propiedades.publicado = true`), el post incluye la liga a su página pública (`/p/:id`) — mismo link que ya genera "Copiar liga pública". Si no está publicada, se avisa dentro del modal y el post no la incluye.
- [x] **Iterado con mockup antes de tocar código** (18 jul, Okta lo pidió explícitamente tras notar que se había saltado ese paso — regla ya establecida desde el incidente de Elegance): 2 rondas de mockup con `mcp__visualize` antes de escribir el componente final. Cambios que salieron de ahí:
  - **Estilo "Directo" ya no re-lista recámaras/baños/m²/amenidades por separado**: la descripción que Nydia ya escribe a mano en `FichaBasico.jsx` viene en formato post-listo (emojis, bullets, precio, hasta su teléfono) — repetir specs se veía redundante. Esos campos del checklist se deshabilitan (grises) solo cuando el estilo activo es "Directo"; "Elegante" y "Datos rápidos" sí arman su propio resumen y sí los usan.
  - **Campo nuevo "Gancho"**: siempre visible (no depende del estilo), con borde `--ta-detail` y asterisco como recordatorio visual de que un post sin gancho no destaca en el feed — no bloquea "Copiar" si se deja vacío, es norma de buena práctica, no validación dura.
  - **Campo nuevo "Llamado a la acción" (CTA)**: opcional, texto libre, se agrega antes de la liga/hashtags si se llena.
  - **Paleta de 18 emojis rápidos** (🏡📍💰✨✔️📸📞📅🚗🛁🍳🌳🔑🔥❄️🏊🛋️🅿️, tomados de los que ya usa Nydia en sus descripciones): clic inserta en la posición del cursor del textarea — pensado para cuando prefiere escribir el post ella misma desde cero en vez de usar el generado automático.
- [x] Build y lint verificados limpios (272→273 módulos con el componente base, sin regresión tras agregar gancho/CTA/emojis).
- [x] **Ajustes finales de color (18 jul)**: campo CTA pasó de fondo `--ta-bg` (caliza) a `--ta-surface` (blanco) para quedar igual que Gancho — antes eran distintos sin querer. Ícono del botón de entrada en `PropiedadForm.jsx` pasó de monocromo (`currentColor`) a azul de marca de Facebook (`#1877F2`, hardcodeado) a pedido explícito de Okta — único ícono del header que rompe el criterio "monocromo" del resto de la app, a propósito, para reconocerse de inmediato. El estado deshabilitado (propiedad sin guardar) ya no se comunica con color de ícono (no aplica con fill fijo) sino con `opacity: 0.4` en el botón.
- [ ] **Pendiente de probar con Nydia**: los 3 estilos son un punto de partida — falta que Nydia los use con una propiedad real y diga si el tono/formato le sirve o si hace falta ajustar alguno.
- [ ] Por ahora es solo Facebook (aunque el texto generado, al ser plano, también sirve para Instagram/WhatsApp Estados con copiar-pegar) — no hay botones separados por red social.

## 🔑 Multi-usuario: candado de acceso + invitaciones con contraseña propia (22-23 jul) — FUNCIONA DE PUNTA A PUNTA, verificado en BD, falta comitear

- [x] **Hallazgo de arquitectura**: Supabase Auth es *por proyecto*, no por app — este proyecto (`NYOWedding`) hospeda TuAsesor (schema `tuasesor`) y **ivent** (schema `public`), compartiendo `auth.users`. RLS por schema separa los datos, no el login.
- [x] **Riesgo real confirmado**: cuentas "huérfanas" (sesión válida en el proyecto, sin fila en `tuasesor.perfiles`) podían entrar a TuAsesor en producción antes de este candado: `andy.liceag@gmail.com`, `olicea@hebmex.com`. Con el candado desplegado, ambas quedan bloqueadas automáticamente al no tener `nombre_completo`/`nombre_comercial`.
- [x] **Decisión**: cada colega tiene copia independiente, alta por invite de Supabase (nunca contraseña temporal a mano).
- [x] **Candado en `App.jsx`**: exige `perfiles.nombre_completo` + `nombre_comercial`; si falta cualquiera, `signOut()` automático y mensaje "sin acceso" en vez del CRM. Corre también al recargar con sesión ya guardada.
- [x] **`EstablecerPassword.jsx`** (`src/features/auth/`): pantalla de invitación — nombre, nombre comercial, contraseña propia; `updateUser({password})` + upsert a `perfiles`. Logo/foto quedan opcionales, se llenan después en Mi Perfil. El correo nunca se captura aquí, vive en `auth.users`.
- [x] **Ruteo en `main.jsx`**: detecta `type=invite` (hash o query) y monta `EstablecerPassword` en vez de `App`.
- [x] **Bug #1 resuelto — redirect_to apuntaba a ivent**: el botón "Invite user" del dashboard siempre usa el Site URL compartido (ivent), y aterrizar ahí — aunque fuera un instante — hacía que la propia app de ivent cerrara la sesión del invitado antes de poder transplantarla a TuAsesor (confirmado en los logs de Auth: `login` seguido de `logout` ~60s después, `referer: eventosytech.com`, y luego `session_not_found` al llegar a TuAsesor). Fix real, sin tocar el Site URL compartido (eso rompería los correos de ivent): `scripts/invitar-usuario.mjs`, que manda la invitación por la Admin API con `redirectTo` explícito hacia TuAsesor. Requiere: (1) agregar `http://localhost:5173/**` y `https://tuasesor.eventosytech.com/**` a Authentication > URL Configuration > Redirect URLs, (2) correr el script con `SUPABASE_SERVICE_ROLE_KEY` en un `.env.local` local (nunca en el `.env` del navegador, nunca commiteado). Uso: `node --env-file=.env.local scripts/invitar-usuario.mjs correo@ejemplo.com [--local] [--force]` — `--local` manda a localhost en vez de producción, `--force` borra primero cualquier cuenta existente con ese correo (pensado para la cuenta de prueba, que se reinvita seguido).
- [x] **Bug #2 resuelto — "Auth session missing!"**: 2 causas reales distintas, ambas confirmadas con logs de consola y de Auth antes de arreglarlas (la primera sospecha, HMR de Vite, era incorrecta):
  1. **Carrera con `detectSessionInUrl`**: el SDK de Supabase, por default, procesa automáticamente los tokens del link apenas se crea el cliente — en paralelo a que `EstablecerPassword.jsx` hacía su propio `setSession()` manual. Confirmado en consola: `"Session as retrieved from URL was issued over 120s ago, URL could be stale"` (advertencia propia del SDK). Fix: `auth: { detectSessionInUrl: false }` en `supabaseClient.js` — `EstablecerPassword.jsx` es el único lugar de la app que necesita leer tokens de la URL, ya no compite con nadie.
  2. **La bandera `activo` "envenenada" por StrictMode**: React monta cada componente 2 veces en dev (monta → desmonta → monta). Un primer fix (ref `yaCorrio`) evitó que `setSession()` se llamara dos veces, pero no bastaba: la bandera `activo` vivía como variable local de cada invocación del efecto — el desmontaje falso de StrictMode la apagaba en la closure del primer montaje, y cuando por fin llegaba la respuesta exitosa de `setSession()` (confirmado con logs: `activo? false session?.user? true`), el código la veía en `false` y abortaba sin nunca poner `estado='listo'`, pese a que la sesión sí se había establecido bien. Fix: `activoRef` (ref compartido, no variable local) que se reactiva a `true` en cada invocación del efecto — para cuando la promesa de la primera invocación resuelve, refleja el estado real y no un snapshot congelado.
- [x] **Probado de punta a punta y verificado en base de datos** (23 jul): invitación → `EstablecerPassword` → contraseña + perfil → candado → CRM. Cuenta de prueba `octavioliceade@hotmail.com` completó el flujo completo; `tuasesor.perfiles` confirma `nombre_completo: "OCTAVIO LICEA"`, `nombre_comercial: "Okta Licea"`.
- [x] **Bloqueante antes de desplegar a producción — resuelto (23 jul, misma sesión)**: la propia cuenta de Okta (`octaviolicea1@gmail.com`) seguía sin `nombre_comercial` en `perfiles`. Se consideró borrar la cuenta en vez de completarla, pero un intento de `DELETE FROM auth.users` se detuvo solo gracias a una FK: esta cuenta también tiene un evento con fotos en **ivent** (schema `public`, mismo proyecto — `auth.users` es compartida entre las dos apps), y el borrado en cascada se hubiera llevado ese evento entre las patas. La transacción falló completa (sin cambios) por la FK `photos → events`, no por una verificación previa de Claude — **lección aplicada de aquí en adelante**: cualquier `DELETE` sobre una tabla compartida entre TuAsesor e ivent revisa primero las dependencias en AMBOS schemas y se confirma con Okta antes de ejecutar, no después de que falle. Decisión final: no borrar la cuenta, completar el perfil — `nombre_comercial` actualizado a **"Octavio C. Licea"** vía SQL directo, confirmado con `returning`. Nydia ya tenía los 4 campos completos, no le afectaba este bloqueante.
- [ ] **Falta comitear**: `main.jsx`, `App.jsx`, `src/lib/supabaseClient.js`, `src/features/auth/EstablecerPassword.jsx`, `scripts/invitar-usuario.mjs` — bloqueado en Cowork por el bug conocido de sandbox (`.git/index.lock`, permiso denegado); comandos ya entregados a Okta para correr desde su máquina. **Okta lo va a hacer al final del día de hoy (23 jul).**
- [ ] **Falta agregar las Redirect URLs al proyecto de Supabase** si no se hizo ya de forma permanente (se agregaron durante esta sesión vía dashboard — confirmar que sigan ahí en la próxima sesión, no se puede verificar por SQL).
- [ ] **Cuenta de prueba `octavioliceade@hotmail.com`** quedó con perfil completo y dentro del CRM tras la prueba exitosa. **Decidido (23 jul): Okta la borra él mismo**, no Claude — dado el hallazgo de arriba (`auth.users` compartida con ivent), cualquier borrado de cuenta en este proyecto se revisa a mano antes de ejecutar.

## 🧪 QA / Playwright — arrancado y desinstalado el mismo día (23 jul)

- [x] **Hallazgo al arrancar**: el repo tenía DOS setups de Playwright sin usar, nunca limpiados — `playwright.config.js` (`testDir: './tests'`) y `playwright.config.ts` (`testDir: './e2e'`), cada uno con su propio `example.spec` boilerplate sin tocar (probablemente de correr `npm init playwright` dos veces en sesiones distintas).
- [x] **Setup duplicado borrado (23 jul, a pedido explícito de Okta)**: `tests/example.spec.js`, `playwright.config.js` y la carpeta `tests/` (quedó vacía) eliminados. `e2e/` + `playwright.config.ts` queda como el único setup.
- [x] **`e2e/login.spec.ts`** (nuevo): 4 casos sobre `LoginForm.jsx` — formulario renderiza sus campos; ícono de ojo muestra/oculta la contraseña; credenciales inválidas muestran el mensaje de error real y el botón se re-habilita; login válido saca de la pantalla de login (lee `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` de env, se salta si no están). `npm run test:e2e` agregado a `package.json`. `baseURL`/`webServer` configurados en `playwright.config.ts`.
- [x] **Corrido por primera vez por Okta en su máquina (23 jul)**: 12 de 18 fallaron (todos los de `login.spec.ts`, en los 3 navegadores) — solo pasaron los 2 `example.spec.ts` de fábrica, que ni siquiera tocan la app (van directo a `playwright.dev`). Apunta a que el `webServer` no llegó a levantar `npm run dev` a tiempo o el navegador no conectó a `localhost:5173` — no se alcanzó a diagnosticar el error exacto.
- [x] **Decisión (23 jul, mismo día): primero pausado, después desinstalado por completo.** Okta lo cuestionó explícitamente ("¿esto va a complicar todo?") — para un proyecto de una sola persona, sin CI, montar una suite de e2e con 3 navegadores es más infraestructura de la necesaria hoy, mismo criterio YAGNI que el resto del proyecto. Tras acordar pausarlo, Okta pidió ir un paso más allá y quitarlo del todo.
- [x] **Desinstalado (23 jul, más tarde en la misma sesión)**: borrados `e2e/login.spec.ts`, `e2e/example.spec.ts`, la carpeta `e2e/`, `playwright.config.ts`, y las carpetas de artefactos generadas por la corrida de Okta (`playwright-report/`, `test-results/`, ya estaban en `.gitignore` pero seguían en disco). `package.json`: quitado el script `test:e2e` y la dependencia `@playwright/test` de `devDependencies`. **Confirmado por Okta (23 jul)**: corrió `npm install` en su máquina — `removed 3 packages` (`@playwright/test` + sus 2 dependencias exclusivas), `package-lock.json`/`node_modules` ya sincronizados. No queda ningún archivo ni paquete de Playwright en el repo. `npm audit` marcó 2 vulnerabilidades de severidad alta, ambas en dependencias de build (`postcss`, `brace-expansion` — herramientas del toolchain, no código expuesto a Nydia/clientes), corregidas con `npm audit fix` (sin `--force`, actualización compatible) — confirmado **0 vulnerabilidades** después. `npm run build` verificado limpio tras el fix (867ms, sin errores; el warning de chunks >500kB es el ya conocido de `ExportaFicha`/`@react-pdf/renderer`, cargado con `lazy()`, no afecta la carga inicial).

## 🎨 4 mejoras de UX reportadas por Okta (23 jul) — construidas y verificadas

- [x] **Grid por default en `ListadoPropiedades.jsx`, mapa solo al togglear**: antes la vista arrancaba en mapa, y aunque cambiaras a grid quedaba un mini-mapa fijo de 110px siempre visible arriba. Ahora `vista` arranca en `'grid'` y el mini-mapa se quitó por completo del modo grid — el mapa (completo) solo aparece si tocas el ícono de mapa en la barra de arriba. El padding-top del grid subió de 16px a 110px para que no quede tapado por la barra de filtros, que sigue flotando encima con `position: absolute`. (Sin cambio: tocar una tarjeta en grid sigue mandando a la vista de mapa para centrar el pin — eso ya era el comportamiento de "seleccionar" desde Sesión 16, no se tocó.)
- [x] **Toast "Toca atrás de nuevo para salir" en `App.jsx`**: el fix del 18 jul resolvía la navegación entre vistas dentro de la app, pero desde 'buscador' (la pantalla de entrada) un atrás más seguía sacando de la app sin avisar — nunca se había probado en celular real. Patrón de doble-atrás (mismo que WhatsApp/apps Android, elegido por Okta sobre un modal Sí/No bloqueante): el primer atrás desde 'buscador' se cancela (`pushState` vuelve a dejar una entrada de la app) y muestra un toast fijo abajo por 2 segundos; un segundo atrás dentro de esa ventana ya no se cancela, deja salir de verdad. **Pendiente de confirmar en celular real** (igual que el fix original del 18 jul, nunca validado fuera de Cowork).
- [x] **Ícono de cerrar (X) unificado — `src/components/BotonCerrar.jsx` (nuevo)**: había 9 copias distintas del botón de cerrar repartidas en `CitaForm`, `InteraccionForm`, `EnviarDocumentosBoveda`, `GeneradorPostFacebook`, `ImportarContactos`, `EscanearDocumento` (6 arriba-izquierda, SVG local cada una), `PropiedadForm` (arriba-derecha, SVG local) y `ContactoForm`/`ExportaFicha` (arriba-derecha, pero con el carácter de texto `×` en vez de SVG — por eso se veían más débiles). Ahora un solo componente compartido, siempre arriba a la derecha, área tocable 44×44 (mismo estándar de accesibilidad ya usado en Contactos/Propiedades). En `PropiedadForm`/`ExportaFicha` (headers con varios íconos de 32px en fila) se usó a 40×40 vía el prop `style` para no romper la alineación del resto de la fila. Los `IconoX`/`IconoCerrar` locales que quedaron sin uso se borraron de cada archivo (los que seguían usándose para otra cosa, como botones de "quitar selección" en `CitaForm`/`InteraccionForm`, se dejaron intactos).
- [x] **Contraste del botón — segunda vuelta, mismo día**: la primera versión usaba fondo `var(--ta-bg)` (el mismo beige del lienzo general de la app) sobre una ventana blanca — casi no se notaba como botón. Se armó un mockup comparando 3 variantes (borde delgado, círculo gris translúcido, círculo sólido oscuro) — Okta eligió el círculo sólido (`background: var(--ta-text)`, ícono en `var(--ta-surface)` blanco), el de mayor contraste. Con el círculo oscuro la X de 18px se veía chica en proporción — subida a 22px con `strokeWidth 2.4` para que se note bien dentro del círculo.
- [x] **Variante `toolbar` — tercera vuelta, mismo día**: Okta reportó que el círculo sólido se veía "burdo" en el header de `PropiedadForm.jsx` (fila con lápiz, compartir, Facebook y liga pública). Consultado `ui-ux-pro-max`: reglas `icon-style-consistent` (un mismo lenguaje visual de íconos en todo el producto) y `primary-action` (las acciones secundarias deben verse subordinadas) — un botón con más peso que sus 3-4 hermanos del mismo header se lee como la acción principal, cuando cerrar es la más secundaria. `BotonCerrar` ahora acepta `variant="toolbar"` (cuadrado redondeado 32×32, fondo `var(--ta-bg)`, mismo lenguaje que sus hermanos) vs. el default `"modal"` (círculo sólido 44×44, para headers donde la X es el único botón — `CitaForm`, `InteraccionForm`, `EnviarDocumentosBoveda`, `GeneradorPostFacebook`, `ImportarContactos`, `EscanearDocumento`, `ContactoForm`, `ExportaFicha`). Aplicado `variant="toolbar"` solo en `PropiedadForm.jsx` (el único header con varios íconos hermanos) — `ExportaFicha.jsx` se revirtió al default (solo tiene título + cerrar, sin fila de íconos, sí necesita el contraste fuerte).
- [x] **Botón "Regenerar" → "Reiniciar texto" en `GeneradorPostFacebook.jsx`**: Okta reportó confusión sobre qué hacía. Aclarado en la conversación: no restaura ningún texto original guardado (no existe tal cosa) — arma un texto nuevo desde cero con los datos de la propiedad + la configuración actual del checklist/estilo, descartando cualquier edición manual. Decisión de Okta: solo renombrar el botón para que el verbo comunique mejor "empieza de nuevo" en vez de agregar tooltip o un `confirm()` antes de sobreescribir.
- [x] **Verificado**: `npm install` + `npm run build` (275 módulos, sin errores, mismo warning ya conocido de chunks >500kB en `ExportaFicha`) + `npm run lint` en una copia temporal fuera del repo (método ya documentado). Lint: 57 errores/17 warnings preexistentes del repo (mismo patrón de `react-hooks/set-state-in-effect` ya arrastrado de sesiones anteriores) — confirmado uno por uno que ninguno cae en líneas tocadas hoy, cero regresiones nuevas.

## 🗺️ 3 fixes en la página pública, tema Elegance (24 jul)

- [x] **Mapa no respondía al mouse en desktop hasta el primer clic**: mismo bug ya conocido y resuelto en `ListadoPropiedades.jsx` (CRM) — el contenedor del mapa (`.pe-mapa`, con `aspect-ratio` en CSS) a veces no tenía su alto final calculado cuando Leaflet se montaba, dejando cacheado un tamaño interno equivocado que rompía el drag/pan hasta que algo forzaba un recálculo. Nuevo componente compartido `InvalidarTamanoMapa` en `componentesCompartidos.jsx` (llama `map.invalidateSize()` en un timeout corto tras montar) — agregado a los 3 temas (Estándar, Elegance, Nocturno), no solo Elegance, porque los 3 tienen el mismo `MapContainer` sin este fix.
- [x] **"Falta un frame" al mapa — confirmado**: `.pe-card` (Elegance) usa solo `box-shadow`, sin borde, a propósito (parte de la estética "elegante" del tema). Pero el mapa, al ser contenido embebido (no una foto con límites visuales propios), sí necesitaba un borde definido — agregado `border: 0.5px solid var(--pe-border)` a `.pe-mapa`, mismo hairline que ya usa el resto del tema, sin pelearse con el criterio "sin bordes" de las demás tarjetas.
- [x] **"Asesora inmobiliaria" se repetía bajo el nombre de Nydia**: causa raíz — `nombre_comercial` de Nydia ya es "Nydia Jaramillo Asesora Inmobiliaria" (ella lo escribió así, incluyendo el rol en su nombre comercial), y Elegance (y también Estándar, mismo bug, no reportado todavía) tenían un subtítulo fijo "Asesora inmobiliaria" hardcodeado debajo, sin importar qué dijera `nombre_comercial`. Quitado el subtítulo fijo en ambos temas — Nocturno no tenía el bug (ahí "Asesora inmobiliaria" solo aparece como *fallback* si `marcaTexto` viene vacío, patrón correcto que no se tocó).
- [x] Verificado con build limpio, sin errores en los 3 temas.

## 🖱️ Fix: doble clic para abrir ficha desde el grid (23 jul)

- [x] **Reportado por Okta**: al tocar una tarjeta en el grid, la vista saltaba a mapa y solo centraba/seleccionaba la propiedad (comportamiento de Sesión 16, "seleccionar ≠ abrir ficha") — había que tocar otra vez (la flecha) para realmente abrir la ficha. Tenía sentido cuando el grid convivía con un mini-mapa siempre visible; ahora que el grid es limpio (ver arriba) y es la vista de entrada, ese paso intermedio ya no aporta nada.
- [x] **Corregido solo en grid**: tocar la tarjeta ahora llama directo a `onSeleccionar` (abre la ficha). Se quitó el botón de flecha "Ver ficha completa", redundante con la tarjeta completa ya siendo clicable. **Sin cambio en la vista de mapa**: ahí tocar un pin/tarjeta del sheet sigue solo centrando primero — sí es útil confirmar ubicación antes de abrir cuando estás navegando el mapa.
- [x] Verificado con build limpio.

## 🙈 Ocultar/mostrar propiedades (soft delete) en el grid (23 jul)

- [x] **Usa `propiedades.esta_oculto`**, columna que ya existía en el schema (`boolean default false`) pero no se usaba en ningún lado del código todavía — confirmado con `Grep` antes de construir.
- [x] **Ícono de ojo por tarjeta** (esquina superior izquierda del grid, junto al de "abrir ficha" que ya estaba a la derecha): ojo abierto = ocultar, ojo tachado = mostrar. Update optimista directo a Supabase + estado local, sin refetch completo.
- [x] **Chip "Ocultas" en la barra de filtros**, aparte de Todas/Venta/Renta (estilo oscuro sólido a propósito, para no confundirse con esos): por default las ocultas quedan excluidas del grid y del mapa; activar el chip muestra SOLO las ocultas (de cualquier operación). "Limpiar" ya resetea `filtroOperacion` a `'todas'`, así que también saca del modo "Ocultas" sin cambio extra.
- [x] Tarjetas ocultas (visibles solo bajo el filtro) muestran una etiqueta roja "Oculta" junto al badge de estado, para diferenciarlas a simple vista.
- [x] Verificado con build limpio (277 módulos, sin errores).

## 🏠 Campos de renta en la ficha base (24 jul) — construido y verificado

- [x] **Pedido de Okta**: en propiedades en renta hacen falta 3 campos —
  # meses de depósito, # meses mínimo de contrato, y "requisitos de
  renta" (distintos según persona física o persona moral). Antes de
  codificar se hicieron 4 preguntas concretas (mismo patrón ya
  establecido esta sesión: investigar el código real primero, preguntar
  después con opciones basadas en lo encontrado, nunca en abstracto).
- [x] **Decisión: requisitos son una plantilla fija, no texto por
  propiedad**: Nydia los redacta UNA vez en Mi Perfil (texto libre, con
  viñetas a mano si quiere) y se precargan solos en cada propiedad nueva
  que ponga en renta — pero quedan editables ahí por si un caso puntual
  necesita algo distinto. Formato: texto libre por tipo de persona (no
  checklist estructurado).
- [x] **Migración aplicada** (`agregar_plantillas_requisitos_renta_perfiles`):
  `tuasesor.perfiles.plantilla_requisitos_renta_fisica` y
  `...renta_moral` (ambas `text`, nullable).
- [x] **`PerfilForm.jsx`**: nueva sección "Requisitos de renta" (entre
  Redes sociales y Marca) con 2 textareas de autosave al salir del campo
  (`CampoTextoLargo`, nuevo — mismo patrón de autosave que `CampoEditable`
  pero multilínea).
- [x] **Meses de depósito / meses mínimo de contrato — viven en el jsonb
  `ficha`, no como columnas reales**: ninguno de los dos se filtra ni se
  ordena en ningún listado hoy, mismo criterio ya usado para
  `situacion_fiscal_legal` (ver "Principios vigentes" — hybrid
  jsonb/columna). Nueva llave `ficha.terminos_renta` en `FICHA_DEFAULT`
  (`usePropiedad.js`) — no requirió tocar la whitelist
  `COLUMNAS_PROPIEDADES`, `ficha` ya estaba incluida completa.
- [x] **`FichaBasico.jsx`**: nuevo grupo "Términos de renta", visible
  solo cuando `operacion === 'renta'` (primer campo condicionado por
  operación en esta ficha — no había precedente). Al elegir "Renta" por
  primera vez (sin requisitos ya escritos en esa ficha, para no pisar una
  edición previa), `cambiarOperacion()` trae la plantilla del perfil
  desde Supabase y precarga `requisitos_fisica`/`requisitos_moral`.
- [x] **Visible en PDF (`ExportaFicha.jsx`)**: sección "Términos de
  renta" agregada como parte de la ficha Básica (sin checkbox propio,
  mismo criterio que precio/dirección — siempre se incluye si
  `operacion === 'renta'`).
- [x] **Visible en los 3 temas de la página pública**: `terminosRenta`
  agregado a `usePropiedadPublica.js` (derivado de `propiedad.ficha`, ya
  venía completo en la vista `propiedades_publicas`, no requirió tocar la
  vista/RLS). Tarjeta/card "Términos de renta" agregada en Estándar,
  Elegance y Nocturno, cada una con el lenguaje visual propio del tema
  — solo se pinta si hay algo capturado.
- [x] **Verificado**: `npm install` + `npm run build` (limpio) +
  `npm run lint` en copia temporal (58 errores/17 warnings — +1 sobre el
  baseline de 57, causado por el mismo patrón `react-hooks/set-state-in-effect`
  que ya existe en `CampoEditable` del mismo archivo, replicado a
  propósito en el nuevo `CampoTextoLargo` — no es una regresión de un
  patrón nuevo, es el mismo patrón ya aceptado en este archivo).
- [ ] **Pendiente de probar con Nydia**: cargar una propiedad real en
  renta, confirmar que la plantilla se precarga bien y que el texto se
  ve bien en el PDF/página pública con viñetas escritas a mano.
- [x] **Fix (24 jul, mismo día, reportado por Okta): propiedades YA
  existentes en renta no precargaban los requisitos.** Causa: la
  precarga solo estaba conectada a `cambiarOperacion()`, que dispara al
  ELEGIR "Renta" a mano — una propiedad que ya era renta desde antes de
  este feature (o cualquier ficha en renta que se abre sin pasar por ese
  clic) nunca disparaba nada. Corregido con un `useEffect` en
  `FichaBasico.jsx`: al abrir una ficha ya guardada (`value.id` existe)
  que es renta y no tiene nada capturado todavía, trae la plantilla una
  sola vez (se detiene solo en cuanto haya texto, para no pisar
  ediciones). Se agregó también un botón manual **"Cargar de Mi
  Perfil"** junto al encabezado de la sección — por si Nydia actualiza
  su plantilla más adelante y quiere traerla a una ficha que ya tenía
  algo escrito (ese caso el `useEffect` no lo pisa a propósito). Build
  verificado limpio.

## 👤 Ficha de usuario (Mi perfil) — CERRADO

- [x] Sección "Marca" habilitada: logo (subida real) + color de acento (`<input type="color">`).
- [ ] Tarjeta de presentación (`tarjeta_presentacion_url`) — columna reservada, sin construir, fuera de alcance por ahora.

## 📋 Documentación del proyecto — CERRADO (Sesión 10)

- [x] `docs/BACKLOG.md`, `docs/bitacora/` (con `TEMPLATE.md`), `docs/SRS.md` v2.0, y regla en `CLAUDE.md` — todo migrado de un proyecto de Claude.ai aparte a vivir dentro del repo, versionado con git.

---

## 🔒 Fase 2 — backlog diferido

- [ ] **Proceso Comercial (módulo completo)**: vincular propiedad a un proceso ya creado, vista de embudo/kanban, dashboard de funnel/reportes.
- [ ] **Formulario de leads en la página pública → CRM** (crea contacto + proceso comercial desde una visita anónima, sin login) — decidido 17 jul, parte natural del módulo de Proceso Comercial de arriba. Reemplazaría el WhatsApp directo de "Contactar asesor" en el tema Elegance cuando se construya.
- [ ] Sistema de tareas/to-do's asociado a Interacciones (formal, no un flag).
- [x] ~~Generador de posts para redes sociales con IA.~~ Construido en Sesión de 18 jul como generador **por plantillas, sin IA generativa** (ver sección "📱 Generador de post para Facebook" arriba) — decisión explícita de no usar una Edge Function con costo por llamada. Ya no es Fase 2.
- [ ] Dashboard con funnel/reportes general.
- [x] ~~Captura pública / liga al cliente.~~ Construida en Sesión 18 como página individual por propiedad (`/p/:id`, ver sección "🌐 Página pública de presentación" arriba) — ya no es Fase 2. Un catálogo/marketplace navegable de TODAS las propiedades (más grande, con buscador/SEO) sigue diferido si se decide construirlo.
- [ ] Integración oficial de WhatsApp API (o VoIP para llamadas) — requiere que Nydia cambie cómo opera, no es solo desarrollo.
- [ ] Módulo de cierre/post-venta.
- [ ] Chat en lenguaje natural (IA) — 3 capacidades independientes.
- [x] ~~Botón "Enviar a cliente" del Vault.~~ Construido en Sesión 11 (ver sección "Bóveda de documentos" arriba) — ya no es Fase 2.

---

## ❓ Decisiones abiertas

- ~~Fusión o separación de Interacciones y Citas/Visitas (Sprint 3 vs Sprint N).~~ **Resuelto (Sesión 13)**: separados. Ver sección "Sprint N — Citas" arriba.
- ~~¿Documentos de la Bóveda también para contactos, o se queda permanentemente solo en propiedades?~~ **Resuelto parcialmente (Sesión 11)**: los documentos se siguen subiendo únicamente por propiedad (`documentos_propiedad`), pero ahora SÍ se pueden enviar a un contacto por correo desde la ficha del contacto (`EnviarDocumentosBoveda.jsx`) — no se duplican ni se suben documentos propios de un contacto.
- Uso futuro del ícono de cuadros del logo como guiño visual en las fichas.
- ~~**¿`contacto_propiedades` sigue vigente?**~~ **Resuelto (Sesión 11)**: sí existe — confirmada vía `information_schema` al revisar los FK de `contactos` antes de construir "eliminar contacto" (tiene `contacto_id` con `ON DELETE CASCADE`). Confirmado de nuevo por Okta (16 jul) que sigue en uso.
- ~~**MCP de Supabase conectado a este chat apunta a otro proyecto** (detectado Sesión 14)~~ **Corregido — era una falsa alarma (sesión del 15 de julio)**: el proyecto "NYOWedding" (org "Octavio's Wedding.Org") SÍ es el correcto — es la instancia Supabase Pro compartida donde vive el schema `tuasesor` (confirmado por Okta con captura del SQL Editor mostrando queries reales contra `tuasesor.contactos`/`tuasesor.contacto_telefonos` dentro de ese mismo proyecto). Lo que pasó en Sesión 14: `list_tables` sin especificar schema solo trajo las tablas de `public` (`guests`, `wishes`, `tracker_items` — de la app hermana), no de `tuasesor`; se leyó como "proyecto equivocado" cuando en realidad era el proyecto correcto con el schema equivocado a la vista. **Lección**: al usar el MCP de Supabase en este repo, siempre pedir explícitamente el schema `tuasesor` (no asumir `public` por default).
- **Proyecto de Claude.ai (conocimiento importado) desactualizado desde la Sesión 8** (6 de julio) — no refleja la migración de documentación a `docs/` decidida en Sesión 10 ni nada de lo construido en Sesiones 9-11. Detectado en Sesión 11 al pedir un recap: se leyó primero el conocimiento de Claude.ai (única fuente disponible al inicio de esa sesión) antes de confirmar que `docs/` en el repo era la fuente vigente. Pendiente decidir: ¿se sigue actualizando ese proyecto en paralelo, o se marca explícitamente como archivo histórico congelado en Sesión 8? **Okta no tiene opinión formada todavía (16 jul)** — sigue abierta.
- ~~**¿El correo de login de Nydia es real y accesible por ella?**~~ **Resuelto (22 jul, sesión 21)**: Okta notó que la cuenta de Nydia (`nydiapjaramillo@gmail.com`, creada Sesión 8) nunca había verificado de verdad que ese correo fuera real y accesible por ella — quedó confirmada (`email_confirmed_at`) probablemente por Auto Confirm al crearla desde el dashboard, sin que nadie hubiera comprobado la entrega real. Confirmado primero que esto es seguro de corregir sin riesgo: las 12 políticas RLS de `tuasesor` usan `auth.uid() = user_id` (el UUID interno, inmutable), nunca el correo — cambiarlo o verificarlo no toca ninguna fila de lo que Nydia ya capturó. Hubo una falsa alarma en el camino: Okta pensó que el correo real de Nydia llevaba un punto (`nydiap.jaramillo@gmail.com`) distinto al de la base — resuelto al recordar que Gmail ignora los puntos en la parte local de la dirección (`nydiapjaramillo@gmail.com` y `nydiap.jaramillo@gmail.com` son el mismo buzón para cualquier `@gmail.com`), así que es el mismo correo. **Verificación real**: se envió un correo de "reset password" desde el dashboard de Supabase (Authentication > Users) a esa dirección — Nydia confirmó que le llegó a su propia bandeja (captura compartida), sin que Okta tenga su contraseña ni acceso a esa cuenta. **No se completó el reset** (a propósito — se decidió dejar su contraseña actual sin cambios, la verificación de entrega ya era suficiente). Descartadas las alternativas de login con código (ver arriba): Supabase no soporta correo como segundo factor nativo (solo TOTP/SMS), y agregarlo a mano requeriría un servicio de correo transaccional de pago, contra el principio de cero costo del proyecto.
- ~~**¿Cómo limitar las llamadas a la app para evitar ataques?**~~ **Resuelto (21 jul, sesión 21)**: revisado el panorama completo. El login (`signInWithPassword`, único flujo de Auth que usa la app — no hay magic link/OTP/signup público) ya viene protegido por el rate limiting nativo de Supabase Auth (por IP, valores default razonables, en Authentication > Rate Limits). La API de datos (PostgREST) no tiene límite de volumen nativo — eso ya no es un problema de *datos* gracias al cierre de privilegios de la sesión (RLS + grants), pero sigue siendo un problema de *costo/disponibilidad* si alguien hace un ataque volumétrico; la mitigación gratuita es un spend cap/alerta de uso en el plan de Supabase, no una Edge Function de rate limiting (eso sería infraestructura nueva, contra el criterio de cero-costo del proyecto — YAGNI hasta que haya abuso real observado). **Activado**: Leaked Password Protection en Authentication > Providers > Email (Pro Plan), confirmado con `get_advisors` — el warning `auth_leaked_password_protection` ya no aparece.

---

## 🔽 Baja prioridad (agrupado 16 jul, a pedido de Okta — mostrar aparte al pedir el backlog)

- [ ] **Rendimiento en Propiedades/Interacciones/Citas/fichas** más allá de lo ya optimizado en Contactos — en hold, sin fecha.
- [ ] **Ficha técnica: Historial y Situación fiscal y legal** — sigue esperando feedback de Nydia como experta de dominio.
- [ ] **Acción para Nydia (no es código)**: configurar su app de correo predeterminada en el celular/computadora para que la cuenta "De:" ya sea su correo de negocio.

---

## Principios vigentes

- **YAGNI** — no construir nada que Nydia no necesite ya.
- **Hybrid jsonb / tabla puente**: columnas reales para lo filtrable/ordenable; jsonb para lo descriptivo de forma variable; tabla relacional puente cuando el campo múltiple SÍ se busca/filtra con frecuencia.
- **Un solo acento funcional** (`--ta-accent`, verde bosque) a la vez.
- **Fases, Sprints y alcance son acuerdos de trabajo, no contratos rígidos**.
- **Relación vs. evento vs. embudo son 3 conceptos separados, nunca fusionar**: `propiedad_colaboradores`, `interacciones`, `procesos_comerciales`. Caso de validación: "Don Luis el plomero".
- **Postgres `NULL` + `UNIQUE` no son excluyentes** — usar en vez de valores centinela inventados.
- **Migraciones: correr siempre como un solo bloque, nunca por partes** — y verificar inmediatamente después con una query de `information_schema` que confirme que las relaciones/columnas esperadas de verdad quedaron creadas, en vez de asumir que "sin error visible" significa "se aplicó completa". Añadido tras el incidente de Sesión 10 (`contacto_telefonos`/`interacciones` nunca se crearon en la primera corrida, y la columna vieja se eliminó de todas formas antes de notarlo).
