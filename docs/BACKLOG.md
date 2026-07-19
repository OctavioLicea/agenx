# TuAsesor — Backlog (estado actual)

> Este archivo vive en `docs/BACKLOG.md` dentro del repo, no en un
> proyecto de Claude.ai aparte. Se edita in-place cada sesión — nunca se
> crea una copia nueva con fecha. El historial de qué cambió y cuándo
> vive en `git log`/`git blame` de este archivo, no en nombres de
> archivo distintos. Reemplaza a todos los `TuAsesor - Backlog *.md`
> sueltos anteriores (Sesiones 2 a 9) — esos quedan como archivo
> histórico, no se vuelven a tocar.
>
> Última actualización: 18 de julio 2026 (tema "Nocturno" agregado al
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
- [ ] **Pendiente de revisión más a fondo** (no urgente, pero real): el
  grant amplio parece venir de un `ALTER DEFAULT PRIVILEGES` a nivel de
  todo el schema `tuasesor` que le da `INSERT/UPDATE/DELETE/TRUNCATE` a
  `anon` y `authenticated` en CUALQUIER tabla/vista nueva por default.
  En las tablas reales no es explotable porque el RLS de "solo el dueño"
  las protege — pero vale la pena, en una sesión dedicada a seguridad,
  revisar ese default y dejarlo más restrictivo para que un futuro objeto
  nuevo no repita el mismo hueco sin que nadie se dé cuenta.

## 🎨 Sistema de temas para la página pública (17 jul) — CONSTRUIDO, en revisión visual

- [x] **Decisión de producto**: la página pública deja de ser un solo diseño — se vuelve un sistema de temas seleccionable por asesor (`perfiles.estilo_pagina_publica`, un tema a la vez por asesor). Arrancamos con 2: **Estándar** (el actual, verde bosque/caliza) y **Elegance** (blanco/negro/dorado, `Playfair Display` + `Montserrat`) — reservado para Nydia mientras sea la única usuaria (`perfiles.acceso_tema_elegante`).
- [x] **Arquitectura construida** (17 jul, "parte 1"): `usePropiedadPublica.js` (hook compartido de fetch/formato), `iconos.jsx` + `componentesCompartidos.jsx` (Marca, Lightbox — reusables entre temas), `temas/registro.js` (mapa estilo → componente con `lazy()`, fallback a Estándar), `temas/estandar/PresentacionEstandar.jsx` + `estandar.css` (el diseño actual, movido tal cual, sin cambios visuales). `PropiedadPublica.jsx` quedó como shell delgado. Build y lint verificados limpios.
- [x] **Columna `perfiles.estilo_pagina_publica` creada** (`text default 'estandar'`, sin `CHECK` — el registro de temas en código decide qué es válido) y agregada a la vista `perfiles_publicos` con su `GRANT SELECT` a `anon` (ver también el fix de seguridad de arriba, encontrado al verificar esta migración).
- [x] **Selector de tema en `PerfilForm.jsx`** ("Página pública", junto a Marca): autosave igual que color de acento. Estándar siempre visible; Elegance solo aparece si `perfiles.acceso_tema_elegante = true` (columna real, activada a mano por asesor — hoy solo Nydia). Migración aplicada y verificada.
- [x] **Regla de mockup-primero rota una vez, corregida después** (17 jul): la primera versión de Elegance se construyó directo en código, sin mockup previo — Okta lo notó ("nos faltó discutir primero tu mockup"). A partir de ahí, toda la iteración visual de Elegance se hizo con la herramienta de mockup (10+ rondas) y el código real se tocó hasta el final, ya con el diseño aprobado. Se mantiene la regla para cambios visuales grandes futuros.
- [x] **Tema "Elegance" — construido e iterado hasta código final** (17 jul): `temas/elegante/PresentacionElegante.jsx` + `elegante.css`. Header con logo de TuAsesor + fecha/hora en vivo + "Solicitar Tour" (WhatsApp), botones redondeados (6px) en todo el tema. Carrusel principal (flechas + puntos) + columna de miniaturas, reutiliza el Lightbox compartido. Fila de stats simplificada (sin divisores/cajas por ítem, íconos más grandes) — diverge del diseño con cajas que tenía la primera versión, ajustado tras varias rondas de mockup. Cuerpo en grid 2:1 (carrusel:sidebar, antes 1.6:1). Sidebar: precio + CTAs (WhatsApp / Solicitar ficha técnica) y tarjeta de la asesora **fusionados en una sola tarjeta** con un divisor interno (antes eran dos tarjetas separadas). Foto de Nydia arriba del nombre (apilado, centrado, esquinas redondeadas — antes iban lado a lado). Botones de contacto de la asesora (WhatsApp, Llamar) con fondo negro (`--pe-dark`) e ícono/texto dorado (`--pe-accent`), mismo patrón que el botón "Solicitar Tour" del header. Mapa Leaflet + link "Ver en Google Maps". Color de acento actualizado de `#B8963A` (dorado de marca) a **`#C5A059`**, el que indica `docs/gemini-code-EstiloPaginaPropiedad.md` — contradicción marca-vs-guía que Okta resolvió explícitamente ("usa lo que la guía visual dicte"); el logo de TuAsesor en el header se queda en su dorado de marca (`#B8963A`), sin resolver todavía si debe alinearse también. Playfair Display (500 títulos / 700 precio) + Montserrat cargadas solo cuando este tema está activo. Build + lint verificados limpios tras el port final.
- [ ] **Botón de contacto "Correo" — decisión resuelta, botón todavía sin construir**: se optó por la opción (b), campo nuevo `correo_publico` en `perfiles` (separado del correo de login). El campo ya tiene UI en `PerfilForm.jsx` (18 jul, sin commitear) y ya se lee en `usePropiedadPublica.js` (`perfiles_publicos.correo_publico`). **Falta**: agregar el tercer botón "Correo" (`mailto:`) en los 3 temas con el mismo patrón que WhatsApp/Llamar — no se construyó todavía, solo el dato ya está disponible.
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
- [ ] **Nada de esto está commiteado todavía** — vive en el working directory del repo local de Okta, junto con los cambios sin commitear de `correo_publico`/tarjeta de presentación de más arriba.

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
