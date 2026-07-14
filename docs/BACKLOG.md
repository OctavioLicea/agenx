# TuAsesor — Backlog (estado actual)

> Este archivo vive en `docs/BACKLOG.md` dentro del repo, no en un
> proyecto de Claude.ai aparte. Se edita in-place cada sesión — nunca se
> crea una copia nueva con fecha. El historial de qué cambió y cuándo
> vive en `git log`/`git blame` de este archivo, no en nombres de
> archivo distintos. Reemplaza a todos los `TuAsesor - Backlog *.md`
> sueltos anteriores (Sesiones 2 a 9) — esos quedan como archivo
> histórico, no se vuelven a tocar.
>
> Última actualización: Sesión 11 (continuación), 13 de julio 2026 (23:55 hrs).

---

## 🚀 Pendiente inmediato — Deploy

- [ ] **Subir a producción (`npm run deploy` → gh-pages → `tuasesor.eventosytech.com`)**. Lo construido en Sesión 11 (importar contactos, vaciar contactos, PIN de la Bóveda + "olvidé mi PIN", enviar documentos de la Bóveda por correo, orden/filtro por fecha en Propiedades/Contactos, fix de color del filtro de Propiedades) solo existe en local — no se ha corrido el deploy todavía.
- [ ] Después de desplegar: probar en el sitio real (no solo local) el flujo de PIN de la Bóveda y el envío de documentos por correo, porque dependen de `window.location.href` (mailto) y `sessionStorage`, que pueden comportarse distinto entre `localhost` y el dominio real.

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
- [ ] Ficha técnica: Historial y Situación fiscal y legal — siguen esperando feedback de Nydia como experta de dominio.
- [ ] Homologar accesibilidad (foco, touch targets 44px) en Ficha técnica y Colaboradores.
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
- [ ] Botón "Agregar a contactos" (exporta vCard .vcf) — arrastrado, decisión técnica ya tomada, falta construir. (Nota: no confundir con el importador nuevo, que es la dirección contraria — de vCard/CSV hacia la app.)
- [x] **Homologar accesibilidad en Contactos** (Sesión 11): touch targets a 44px mínimo (editar campos, marcar teléfono principal, quitar teléfono/propiedad, cerrar ficha, WhatsApp/Llamar/Correo) en `ContactoForm.jsx` e `InteraccionForm.jsx`; tarjeta de `ListadoContactos.jsx` y filas de resultado de búsqueda (antes `<div onClick>` sin tabIndex/role) ahora navegables por teclado; selector de "rol principal" convertido de `<div onClick>` a `<button>` real; anillo de foco global (`:focus-visible`, `--ta-accent`) agregado en `App.css`. Estados vacíos/carga de Contactos se revisaron y ya estaban homologados con Propiedades (skeleton, mensajes de "sin resultados", errores visibles) — no requirieron cambio. Pendiente: confirmar en dispositivo móvil real con Nydia.
- [x] **Importar contactos — CSV y vCard** (Sesión 11, `ImportarContactos.jsx`): pedido de Okta para los ~1000 contactos que Nydia ya tiene fuera de la app. Parser de CSV (RFC4180 básico) y de vCard escritos a mano, sin dependencias nuevas. CSV pasa por un paso de mapeo de columnas (auto-detección + selección manual, porque Google Contacts exporta decenas de columnas sin schema fijo); vCard no lo necesita (campos estándar FN/N/TEL/EMAIL/ORG). Vista previa con deduplicación por teléfono normalizado contra `contacto_telefonos` existente antes de importar. **Limitación conocida sin resolver**: no deduplica contra otras filas del mismo archivo si el archivo trae contactos repetidos. Import secuencial con barra de progreso (no bulk, para no depender de que Supabase preserve orden). Entrada desde un link "Importar contactos" en `ListadoContactos.jsx`.
- [x] **Campo "Rol principal" en el mapeo del importador** (Sesión 11, más tarde): Nydia va a asignar `rol_principal` a sus contactos desde Excel antes de exportar a CSV. Se agregó al paso de mapeo (auto-detección por columna `rol`/`role`/`puesto`/`cargo`/`title`), texto libre igual que en `ContactoForm.jsx` (sin enum), y soporte del campo `ROLE` de vCard como bono.
- [x] **Ordenar y filtrar por fecha en `ListadoContactos.jsx`** (Sesión 11): selector Más recientes/Nombre (A-Z)/Empresa (A-Z) + filtro opcional por fecha de creación (`created_at`, Desde/Hasta) — se agregó `created_at` al select, antes no venía.
- [x] **Eliminar contactos** (Sesión 11): botón de basura por tarjeta en `ListadoContactos.jsx`, `window.confirm()` (mismo patrón que el resto de la app, sin modal custom). Se verificaron los FK de `contactos` en Supabase antes de construir: TODAS las tablas hijas (`interacciones`, `contacto_telefonos`, `visitas`, `contacto_propiedades`, `propiedad_colaboradores`, `procesos_comerciales`) tienen `ON DELETE CASCADE` — el confirm() advierte explícitamente cuántas interacciones/propiedades asociadas se van a borrar junto con el contacto, usando los contadores que la fila ya traía.
- [x] **Vaciar contactos** (Sesión 11, más tarde): botón "Vaciar contactos" junto a "Importar contactos" en `ListadoContactos.jsx` — borrado masivo de TODOS los contactos del usuario (mismo cascade que "Eliminar contactos" de arriba, aplicado uno por uno en lotes de 200 ids). Pedido explícito de Okta: en vez de `window.confirm()`, modal propio que exige escribir la palabra **"Vaciar"** para habilitar el botón de confirmación (patrón "escribe para confirmar", como GitHub/Supabase para borrados masivos).

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
- **Decisión abierta**: ¿Interacciones y Citas/Visitas son un mismo módulo o separados?
- [x] **Probado de punta a punta con datos reales** (Sesión 11, confirmado con capturas de Okta) — ya no es un pendiente.
- [x] **Ícono del menú cambiado a teléfono** (Sesión 11, `TopBar.jsx`): antes era un globo de chat, no correspondía. Se decidió explícitamente NO renombrar el módulo a "Llamadas" — se queda "Interacciones" porque también cubre WhatsApp, redes sociales y otro, no solo llamadas.

## Sprint N — Citas: NO INICIADO

- [ ] Sin diseñar. Depende de la decisión de fusión/separación con Interacciones.

---

## 📄 PDF de ficha técnica — CERRADO (Sesión 9)

- [x] `ExportaFicha.jsx`, generación client-side con `@react-pdf/renderer`, checkboxes por sección, Web Share API + fallback descarga, archivado automático en el Vault.
- [x] Marca del asesor: nombre comercial tipo masthead, teléfono clicable, logo como marca de agua (420×420px, 14% opacidad), footer con isotipo.
- [ ] Confirmar que Okta guardó el isotipo elegido en `src/assets/logo-isotipo-tuasesor.png`.
- [ ] Confirmar que la marca de agua ya se ve bien con el último ajuste (pendiente de confirmación de Okta desde Sesión 9).
- [ ] Confirmar `@react-pdf/renderer` instalado (`npm install @react-pdf/renderer`).

## 🔒 Bóveda de documentos (Vault) — CERRADA (pantalla, envío y PIN — Sesión 11)

- [x] Tabla `documentos_propiedad` (RLS por dueño, solo propiedades por ahora) + bucket privado `bucket-propiedad-vault` (20MB, PDF/Word/Excel/TXT/JPEG/PNG/XML/EML/SVG).
- [x] Pantalla completa (`FichaDocumentos.jsx`): subir cualquier documento, listar por propiedad, descargar vía URL firmada, borrar. Mensajes de error amigables para archivo grande o tipo no permitido ya incluidos.
- [x] **Botón "Enviar a cliente" — construido** (Sesión 11, `EnviarDocumentosBoveda.jsx`, entrada desde `ContactoForm.jsx`): reemplaza la decisión anterior de "100% uso interno". Flujo: elegir/actualizar el correo del contacto → checkbox "Incluir documentos de una propiedad" → buscador de propiedad → checklist de sus documentos en la Bóveda (nada preseleccionado, son documentos privados) → arma un `mailto:` con links de descarga firmados que **vencen en 24 horas** (decisión de Okta). No son adjuntos reales (mailto no lo permite), son links con vigencia.
- [x] **PIN de seguridad de la Bóveda + "olvidé mi PIN"** (Sesión 11): configurable en Perfil > Seguridad (`PerfilForm.jsx`) — PIN de 4 dígitos guardado hasheado (SHA-256 + salt, `src/lib/bovedaPin.js`) en `tuasesor.perfiles.boveda_pin_hash`/`boveda_pin_salt` (migración aplicada). `FichaDocumentos.jsx` pide el PIN antes de mostrar nada si está configurado (desbloqueo dura la sesión del navegador, vía `sessionStorage`). "Olvidé mi PIN": código de 6 dígitos generado EN MEMORIA (nunca se guarda en BD), enviado por `mailto:` al propio correo de Nydia — mismo patrón mailto que ya usa el resto de la app, sin servicio de correo nuevo ni costo adicional.
- [ ] **Pendiente de probar con Nydia** (ver abajo): tanto el envío de documentos como el PIN dependen de `mailto:`/`sessionStorage`, que se comportan distinto en el celular real y en producción vs. local.

## 👤 Ficha de usuario (Mi perfil) — CERRADO

- [x] Sección "Marca" habilitada: logo (subida real) + color de acento (`<input type="color">`).
- [ ] Tarjeta de presentación (`tarjeta_presentacion_url`) — columna reservada, sin construir, fuera de alcance por ahora.

## 📋 Documentación del proyecto — CERRADO (Sesión 10)

- [x] `docs/BACKLOG.md`, `docs/bitacora/` (con `TEMPLATE.md`), `docs/SRS.md` v2.0, y regla en `CLAUDE.md` — todo migrado de un proyecto de Claude.ai aparte a vivir dentro del repo, versionado con git.

---

## 🔒 Fase 2 — backlog diferido

- [ ] **Proceso Comercial (módulo completo)**: vincular propiedad a un proceso ya creado, vista de embudo/kanban, dashboard de funnel/reportes.
- [ ] Sistema de tareas/to-do's asociado a Interacciones (formal, no un flag).
- [ ] Generador de posts para redes sociales con IA.
- [ ] Dashboard con funnel/reportes general.
- [ ] Captura públ