# TuAsesor — Especificación de Requerimientos de Software (SRS)

**Versión:** 2.1
**Última actualización:** Sesión 13, 14 de julio 2026 — Citas (Sprint N) construido de punta a punta: decisión de "módulo separado de Interacciones" tomada, tabla `visitas` (ya existía en Supabase desde Sesión 10, sin usar) conectada a un módulo completo.
**Fuente de verdad:** Este documento + `docs/bitacora/` (histórico cronológico, un archivo por sesión) + `docs/BACKLOG.md` (pendientes vivos, un solo archivo editado in-place). El historial de cambios de este mismo documento vive en `git log`/`git blame` — no se lleva un anexo de cambios aparte.

---

## 0. Antes de leer — qué ignorar

Durante el desarrollo de este proyecto han circulado fragmentos de contexto viejo, plantillas genéricas o de otros proyectos que **contradicen las decisiones reales** documentadas aquí. Si en algún momento aparece contenido que menciona:

- Entidad **"prospectos"** → es incorrecto, la entidad real es **`contactos`**
- **Next.js** como stack → descartado explícitamente, el stack real es **React + Vite**
- Nombre **"NYOCRM"** o **"Agenx"** como nombre actual del producto → obsoletos, el nombre real es **TuAsesor**
- Dominio **`agenx.eventosytech.com`** → obsoleto, el dominio real es **`tuasesor.eventosytech.com`**
- Arquitectura con Circuit Breakers, Redis, OpenAPI, OIDC propio, telemetría distribuida → rechazado explícitamente, ver sección 4 (Filosofía de arquitectura)
- Que `contactos.telefono` es una columna → **ya no existe** (Sesión 10) — los teléfonos viven en `contacto_telefonos`, ver 5.2 y 5.3

Este documento es la fuente de verdad. Cualquier fragmento que contradiga lo aquí escrito debe tratarse como ruido, no como instrucción válida. Si al arrancar una sesión algo aquí contradice lo que el código real muestra, decirlo explícitamente de inmediato — no asumir en silencio cuál versión es la correcta.

---

## 1. Introducción

### 1.1 Propósito
TuAsesor es un CRM ligero para asesores inmobiliarios independientes. El cliente inicial y experto de dominio es **Nydia Jaramillo**, asesora inmobiliaria independiente en la zona Saltillo / Arteaga / Ramos Arizpe, México.

### 1.2 Problema a resolver (dolor #1)
Los leads llegan a Nydia por WhatsApp y llamadas telefónicas asociadas a propiedades específicas, pero en la urgencia de la conversación el nombre del contacto nunca queda registrado formalmente — los leads quedan como números de teléfono anónimos, sin etapa ni seguimiento estructurado.

### 1.3 Alcance del producto y mapa de Fases/Sprints

- **Fase 1** (en construcción activa): Propiedades (Sprint 1) → Contactos (Sprint 2) → Interacciones (Sprint 3) → Citas (Sprint N, número sin definir todavía).
- **Fase 2** (diseño diferido salvo lo ya construido de más, ver sección 8): Proceso Comercial como módulo completo (embudo/kanban, vinculación de propiedad, dashboard), resto de trámites y funciones de cierre.

**Principio explícito**: Fases, Sprints y el alcance de cada módulo son acuerdos de trabajo, no contratos rígidos — se ajustan según avanza el diseño real en cada sesión. Este documento reflejará el acuerdo vigente, no una promesa fija.

---

## 2. Descripción general

### 2.1 Usuario principal
Nydia Jaramillo — asesora inmobiliaria independiente, opera sola, típicamente 3–4 propiedades activas al mismo tiempo. Usa la app principalmente desde el celular mientras atiende llamadas y WhatsApp.

### 2.2 Filosofía de producto
- La herramienta prioriza velocidad de captura de datos sobre exhaustividad — Nydia está trabajando en tiempo real, no llenando formularios con calma.
- Selectores tipo tap-button en vez de dropdowns, dado el volumen bajo de opciones (3-4 propiedades, pocas zonas).
- **Contactos es la entidad central del modelo de datos** — no propiedades. Esto es independiente del orden en que se construye el código (ver sección 6).
- **Tres conceptos que nunca se fusionan**, validados con el caso "Don Luis el plomero" (tiene una propiedad asociada, cero procesos comerciales, no necesariamente ninguna interacción registrada):
  - `propiedad_colaboradores` — relación/rol persistente de una persona con una propiedad.
  - `interacciones` — evento puntual de comunicación (llamada/whatsapp/redes).
  - `procesos_comerciales` — etapa del embudo de venta/renta.

### 2.3 Realismo sobre automatización de canal (WhatsApp/llamadas)
Se evaluó explícitamente (Sesión 10) un escenario "ideal" de call-center: número entra → se identifica al contacto automáticamente. Es técnicamente alcanzable (VoIP con webhook para llamadas, API oficial de WhatsApp Business para mensajes), pero en ambos casos el costo real no es de desarrollo — es que Nydia cambie cómo opera (número de negocio nuevo, o migrar su WhatsApp personal a la API oficial, perdiendo la app de consumidor que usa hoy). **Decisión**: no se diseña como prerequisito de Interacciones. El escenario de arranque asume que Nydia sigue usando su celular/WhatsApp normal, y TuAsesor es donde registra manualmente lo que ya pasó o está pasando. Queda como visión de mediano plazo si en algún momento se justifica el costo de operación.

### 2.4 Multi-tenancy futura
No requiere cambios de esquema. La RLS por `user_id` ya aísla cuentas distintas. Queda como posibilidad de negocio (vender TuAsesor a otros asesores), sin trabajo pendiente de diseño hoy.

---

## 3. Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | React + Vite | SPA simple, sin necesidad de SSR (los leads llegan por WhatsApp/letreros físicos, no por buscadores — SEO irrelevante) |
| Backend | Supabase (Auth, Postgres, Storage) | Postgres + Auth + Storage en un solo servicio, sin mantener infraestructura propia como desarrollador único |
| Seguridad | RLS (Row Level Security) | La autorización vive en políticas de base de datos, no en una capa de API propia |
| Hosting | GitHub Pages | Gratuito, sin necesidad de SSR |
| Dominio | `tuasesor.eventosytech.com` | Subdominio propio (CNAME en GoDaddy → `octaviolicea.github.io`). No se usa patrón de ruta (`/tuasesor/app`) como en el proyecto hermano `ivent`, porque TuAsesor no tiene necesidad de landing pública de venta hoy. |
| Mapas | Leaflet (open source) | Sin costo, sin API key |
| Geocoding | Nominatim (OpenStreetMap) | Gratuito, sin API key, límite de 1 req/seg (suficiente para el volumen de uso) |
| PDF | `@react-pdf/renderer` | Generación 100% client-side, sin Edge Function (ver 5.9) |

**Next.js fue descartado explícitamente**: en GitHub Pages solo es viable vía export estático, lo cual desactiva SSR, API routes, middleware e Image Optimization — es decir, se pagaría el peso del framework sin ninguna de sus ventajas reales.

### 3.1 Repositorio y despliegue
- Repo: `github.com/OctavioLicea/TuAsesor`
- Deploy: `vite build && gh-pages -d dist`
- `public/CNAME` preserva el dominio propio entre deploys (de otra forma cada deploy borra la config de dominio)
- Documentación viva del proyecto (`docs/BACKLOG.md`, `docs/bitacora/`, este archivo) vive **dentro de este mismo repo**, versionada con git — no en un proyecto de Claude.ai aparte. Ver `CLAUDE.md` en la raíz del repo para la regla de actualización obligatoria al cerrar sesión.

---

## 4. Filosofía de arquitectura

**Minimalismo YAGNI** — un solo fundador/desarrollador, sin presupuesto de infraestructura, negocio aún sin validar a escala.

**Explícitamente rechazado** (evaluado y descartado en sesión de "acuerdos de desarrollo"):
- Circuit breakers, retries con backoff, rate limiting — no hay servicios externos críticos más que Supabase
- Caché (Redis/InMemory) — dataset mínimo (Nydia + 3-4 propiedades activas), Postgres directo ya es instantáneo
- Contratos OpenAPI — no hay API propia, Supabase genera acceso vía PostgREST
- Arquitectura orientada a eventos — sin webhook de WhatsApp por ahora (ver 2.3)
- OAuth2/OIDC propio — Supabase Auth ya lo resuelve
- Telemetría distribuida — no hay sistema distribuido

**Sí adoptado**:
- Code splitting (gratis con Vite)
- Accesibilidad básica (WCAG mínimo — HTML semántico, focus visible) — **arrastrado como pendiente real** en Ficha técnica y Colaboradores, ver `docs/BACKLOG.md`
- RLS + validación de inputs (ya es el núcleo de seguridad del proyecto)
- Error boundaries ligeros

**Principio de diseño de datos**: preferir arreglos/estructuras flexibles (jsonb) o tablas relacionales puente sobre columnas fijas de valor único por defecto, asumiendo que casi cualquier atributo puede eventualmente necesitar más de un valor. Objetivo: evitar migraciones parchadas por haber asumido "un solo valor" desde el diseño inicial. **Matiz agregado en Sesión 10**: cuando el campo múltiple se va a **buscar/filtrar con frecuencia** (ej. teléfonos de contacto, consultados en cada interacción entrante), preferir una tabla relacional puente (indexable) sobre jsonb — jsonb sigue siendo el default para datos descriptivos de forma variable que no se buscan directamente (ej. `ficha` de propiedad).

**Postgres, `NULL` y `UNIQUE` no son excluyentes**: una columna puede ser nullable y tener `UNIQUE` a la vez — Postgres permite múltiples `NULL` en una columna `UNIQUE` porque no los considera iguales entre sí. Usar esto en vez de valores centinela inventados (`-1`, `-9`, etc.) cuando un dato puede faltar pero debe seguir siendo único cuando sí existe.

---

## 5. Modelo de datos

Todos los objetos viven en el schema **`tuasesor`** de un proyecto Supabase compartido con otra app (`ivent`, schema `public`, con datos reales de producción — tratar con cuidado). Todo SQL debe calificar tablas como `tuasesor.<tabla>`. Cliente inicializado con `db: { schema: 'tuasesor' }`.

### 5.1 Entidades y relaciones

| Tabla | Rol |
|---|---|
| `contactos` | **Entidad central.** Nombre nullable hasta identificarse. Ya no tiene columna `telefono` (ver 5.3) |
| `contacto_telefonos` | Muchos a muchos: teléfonos de un contacto. Un contacto puede tener 0, 1 o varios; un mismo teléfono puede pertenecer a varios contactos (ej. pareja que comparte celular) |
| `propiedades` | Inmuebles gestionados |
| `interacciones` | Registro de contacto por WhatsApp/llamada/redes, ligado a un contacto obligatorio y opcionalmente a una propiedad |
| `procesos_comerciales` | El embudo de venta/renta (`etapa`), ligado a un contacto obligatorio y opcionalmente a una propiedad. Separado de `propiedad_colaboradores` a propósito |
| `visitas` | Citas agendadas, bloqueadas por trigger si el contacto no tiene nombre. **Sin construir todavía** (Sprint N, sin número asignado) |
| `fotos_propiedad` | Fotos de cada propiedad, fuente de metadato EXIF para geolocalización |
| `propiedad_colaboradores` | Muchos a muchos: cualquier persona con un rol en una propiedad (vendedor, notario, banco, comprador interesado, etc.) |
| `documentos_propiedad` | Documentos sensibles de una propiedad (INE, contratos, escrituras, PDF de ficha exportado), Storage privado |
| `perfiles` | Datos del asesor (Nydia): nombre, teléfonos, redes sociales, marca (logo/color de acento) |
| `contacto_propiedades` | **Sin confirmar si sigue vigente** — tabla de "propiedades de interés de un contacto" descrita en versiones anteriores de este documento, pero ninguna bitácora registra que se haya construido; es posible que haya quedado superada por `propiedad_colaboradores` (rol `comprador_interesado`) o por `procesos_comerciales` (etapa `interesado`). Confirmar con Okta antes de asumir que sigue siendo parte del modelo. |

### 5.2 `contactos`

```sql
create table tuasesor.contactos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),

  nombre text,                  -- nullable hasta identificarse
  empresa text,
  correo text,
  rol_principal text,           -- texto libre, etiqueta general (no catálogo cerrado)
  nota_sin_propiedad text,      -- contacto sin propiedades asociadas todavía

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- Nombre: nullable hasta identificarse — es el **gate obligatorio a nivel de base de datos (trigger)** para poder agendar una visita.
- **`telefono` ya NO es columna de esta tabla** (migrada en Sesión 10) — ver 5.3, `contacto_telefonos`.
- **El embudo (`etapa`) NO vive aquí** (columna eliminada en Sesión 8) — vive en `procesos_comerciales` (5.8). Un contacto puede tener 0, 1 o varios procesos comerciales en paralelo o a lo largo del tiempo (ej. compró y después renta), y contactos de solo-servicio (plomero, notario) nunca deben cargar una etapa que no les aplica.
- `rol_principal` es una etiqueta general del contacto (texto libre), distinta de `propiedad_colaboradores.rol`, que es específico por propiedad — nunca se autocompleta uno con el otro.

### 5.3 `contacto_telefonos`

```sql
create table tuasesor.contacto_telefonos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  contacto_id uuid not null references tuasesor.contactos(id) on delete cascade,

  telefono text not null,
  etiqueta text,                -- ej. "celular", "casa", "trabajo" — libre, opcional
  es_principal boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (contacto_id, telefono)
);
```

- Reemplaza la columna única `contactos.telefono` (Sesión 10). Un contacto puede tener 0, 1 o varios teléfonos; un mismo teléfono puede pertenecer a varios contactos (ej. pareja que comparte celular) — por eso **no** hay `UNIQUE` global sobre `telefono`, solo por `(contacto_id, telefono)`.
- `es_principal`: cuál teléfono se usa para los accesos directos de WhatsApp/Llamar en la ficha de contacto. Solo uno por contacto debería estar en `true` (regla de aplicación, no constraint de base de datos todavía).
- Índices por `telefono` y por `contacto_id` — la búsqueda por teléfono es una operación frecuente (cada interacción entrante se busca por número).

### 5.4 `propiedades`

```sql
create table tuasesor.propiedades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),

  tipo text not null check (tipo in ('casa','depto','terreno','local','otro')),
  operacion text not null check (operacion in ('venta','renta')),
  uso text not null check (uso in ('residencial','comercial')),
  zona text not null check (zona in ('saltillo','arteaga','ramos_arizpe')),
  precio numeric(12,2),

  recamaras numeric,
  banos numeric,                    -- admite decimales, ej. 2.5
  estacionamientos integer,
  m2_construccion numeric,
  m2_terreno numeric,
  cuota_mantenimiento numeric,      -- opcional

  estado text not null default 'captacion'
    check (estado in ('captacion','disponible','en_proceso','cerrada')),

  descripcion text,                 -- bajada corta tipo flyer, aparece en el PDF exportado (5.9)
  ficha_completa boolean not null default false,
  ficha jsonb not null default '{}'::jsonb,
  redes_sociales jsonb not null default '[]'::jsonb,  -- [{ "red": "Facebook", "url": "..." }, ...]

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tuasesor.propiedades enable row level security;

create policy "Propiedades: acceso solo al dueño"
  on tuasesor.propiedades
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

**Mini-embudo de estado**: `captacion → disponible → en_proceso → cerrada`. `ficha_completa` es independiente y no bloquea publicar.

### 5.5 Estructura de `ficha` (jsonb)

```json
{
  "equipamiento": {
    "cocina_integral": null,
    "climatizacion_minisplits": null,
    "pisos_porcelanato": null,
    "ventaneria_doble_vidrio": null,
    "cisterna_hidroneumatico": null,
    "seguridad_privada_24h": null,
    "areas_comunes": null,
    "extras": []
  },
  "historial_propiedad": "",
  "situacion_fiscal_legal": {
    "al_corriente": null,
    "gravamenes": "",
    "esquemas_pago_aceptados": [],
    "notas": ""
  },
  "ubicacion_conectividad": {
    "zona_colonia_referencia": "",
    "puntos_interes_cercanos": "",
    "servicios": { "escuelas": "", "hospitales": "", "transporte": "" }
  },
  "comentarios": []
}
```

- `equipamiento.extras`: arreglo tipado (texto/número/sí-no) para atributos personalizados no cubiertos por la lista precargada — permite a Nydia agregar campos sin necesidad de deploy.
- `comentarios`: arreglo de `{ texto, visible_cliente }` — separa notas internas de las que aparecen en el PDF al cliente (5.9, ya construido).
- **Planos y Certificados de mantenimiento fueron eliminados de la ficha técnica** — viven en la Bóveda de documentos (5.10, infraestructura ya construida), junto con INE, contratos y escrituras.
- `disponibilidad_confirmada` fue eliminado por ser duplicado del campo `estado` ya existente.
- Historial y Situación fiscal y legal siguen esperando feedback de Nydia como experta de dominio (arrastrado, ver `docs/BACKLOG.md`).

### 5.6 `interacciones`

```sql
create table tuasesor.interacciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),

  contacto_id uuid not null references tuasesor.contactos(id) on delete cascade,
  propiedad_id uuid references tuasesor.propiedades(id) on delete set null,

  canal text not null check (canal in ('whatsapp','llamada','redes_sociales','otro')),
  direccion text not null check (direccion in ('entrante','saliente')),
  fuente text check (fuente in ('letrero','facebook','instagram','tiktok','recomendacion','otro')),

  nota text,
  fecha_hora timestamptz not null default now(),  -- editable: Nydia puede registrar algo que ya pasó

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- `contacto_id` obligatorio, `propiedad_id` opcional (flujo A = viene de una propiedad publicada; flujo B = consulta general de zona).
- `canal`: `redes_sociales` agrupa Instagram/TikTok/Facebook como un solo valor — cuál red específica ya la distingue `fuente`, no hace falta duplicar el dato en dos campos.
- **Formulario único** (`InteraccionForm.jsx`), invocable desde cualquier lugar (ficha de Contacto, Colaboradores de una Propiedad, o un botón global) sin selector de contexto: Contacto siempre arriba y obligatorio (búsqueda por nombre o teléfono contra `contacto_telefonos`, con alta rápida si no existe), Propiedad siempre abajo y opcional.
- "Tareas" asociadas a una interacción (seguimiento formal tipo to-do) — diferido a Fase 2, sin schema reservado todavía.
- **Decisión resuelta (Sesión 13)**: Interacciones y Citas/Visitas son módulos **separados**. Interacciones es bitácora de comunicación ya sucedida (`propiedad_id` opcional); Citas es agenda a futuro con estado y `propiedad_id` obligatorio — ver 5.7.

### 5.7 `visitas` (módulo "Citas")

```sql
create table tuasesor.visitas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),

  contacto_id uuid not null references tuasesor.contactos(id) on delete cascade,
  propiedad_id uuid not null references tuasesor.propiedades(id) on delete cascade,

  fecha_hora timestamptz not null,
  estado text not null default 'programada'
    check (estado in ('programada','realizada','cancelada','no_asistio')),
  nota text,

  created_at timestamptz not null default now()
);
```

- **Construido (Sesión 13)**: `useCita.js`, `CitaForm.jsx`, `ListadoCitas.jsx`, entradas desde `ContactoForm.jsx` (sección "Citas"), `FichaColaboradores.jsx` (botón "+ Agendar visita", propiedad bloqueada), y nuevo módulo raíz en `TopBar.jsx`/`App.jsx`.
- `contacto_id` y `propiedad_id` **ambos obligatorios** (a diferencia de `interacciones`, donde `propiedad_id` es opcional) — refleja que una visita siempre es a una propiedad concreta.
- **Estados reales del CHECK constraint** (confirmados contra el schema de Supabase antes de construir, la tabla ya existía desde Sesión 10 sin usarse): `programada`, `realizada`, `cancelada`, `no_asistio`. **No existe el estado `confirmada`** — se descartó de la UI al descubrir que no está en el constraint.
- Trigger `trg_visitas_requiere_nombre` (BEFORE INSERT): bloquea el alta si el contacto no tiene `nombre`. Por eso `CitaForm.jsx` NO permite alta rápida de contacto solo con teléfono (a diferencia de `InteraccionForm.jsx`) — el mini-formulario de alta rápida siempre pide nombre explícito antes de habilitar "Crear contacto".
- Sin vista de calendario — es una lista ordenable/filtrable (mismo patrón que Interacciones), orden por default ascendente por `fecha_hora` ("Próximas primero"), a diferencia de Interacciones que ordena descendente (más recientes primero). YAGNI: calendario visual queda diferido hasta que el volumen de citas de Nydia lo justifique.

### 5.8 `propiedad_colaboradores`
Reemplaza la idea de "coasesores". Cualquier persona que participa en una propiedad en cualquier rol vive aquí — `id` propia (un mismo contacto puede tener varios roles en la misma propiedad). Columnas: `propiedad_id`, `contacto_id`, `rol` (vendedor, comprador_interesado, arrendador, arrendatario, asesor_colaborador, notario, ejecutivo_bancario, agencia_investigacion, proveedor, otro), `rol_otro`, `porcentaje_comision` (nullable), `notas`, `activo`.

### 5.9 `procesos_comerciales`

```sql
create table tuasesor.procesos_comerciales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),

  contacto_id uuid not null references tuasesor.contactos(id) on delete cascade,
  propiedad_id uuid references tuasesor.propiedades(id) on delete set null,

  etapa text not null default 'nuevo'
    check (etapa in ('nuevo','calificacion','interesado','en_proceso_cierre','cerrado','perdido')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- El embudo real: `nuevo → calificacion → interesado → en_proceso_cierre → cerrado`, con salida lateral a `perdido` desde cualquiera de las primeras cuatro.
- `contacto_id` obligatorio, `propiedad_id` **nullable** (cubre leads sin propiedad concreta todavía) — hoy nace sin propiedad vía alta rápida en `ContactoForm.jsx`.
- **Vincular una propiedad concreta a un proceso ya creado sin ella, vista de embudo/kanban y dashboard de funnel/reportes son Fase 2** ("módulo Proceso Comercial completo", ver sección 8) — la tabla y la alta rápida ya existen desde Sprint 2, esto es la capa completa encima.
- Separada de `propiedad_colaboradores` a propósito — ver el caso "Don Luis el plomero" en 2.2.

### 5.10 `documentos_propiedad` (Bóveda de documentos)

- Tabla espejo minimalista de `fotos_propiedad`: `propiedad_id` obligatorio (documentos solo de propiedades por ahora, no de contactos — extensible a futuro con el mismo patrón de FK nullable que `procesos_comerciales` si hace falta), `tipo_documento` (chips fijos + "Otro"), `nombre_original`. RLS restringida al dueño.
- Bucket privado de verdad `bucket-propiedad-vault` (a diferencia de `bucket-propiedad-media`, que es público) — 20MB máx por archivo, tipos permitidos PDF/Word/Excel/TXT/JPEG/PNG. URLs firmadas desde el día uno.
- **Infraestructura construida** (Sesión 9). **Pantalla completa sin construir todavía**: subir cualquier documento (no solo el PDF auto-generado), listar por propiedad, descargar vía URL firmada, borrar. Falta también el mensaje de error amigable en frontend cuando el archivo excede tamaño o tipo permitido (el bucket ya rechaza esos casos a nivel Supabase).
- Botón "Enviar a cliente" (link firmado) — decidido explícitamente que por ahora es 100% uso interno.

### 5.11 PDF de ficha técnica (`ExportaFicha.jsx`)

- **Construido de punta a punta** (Sesión 9). Generación 100% client-side con `@react-pdf/renderer`, sin Edge Function.
- Checkboxes por sección: Básico siempre incluido, Fotos opcional, Ficha técnica opcional (Historial y Situación fiscal y legal como sub-checks independientes, apagados por default por ser información sensible). Un solo toggle global de "incluir campos vacíos".
- Compartir vía Web Share API (manda directo a WhatsApp en celular) con fallback a descarga normal.
- Cada PDF exportado se archiva automáticamente en el Vault (`documentos_propiedad`, `tipo_documento: 'ficha_exportada'`).
- Marca del asesor: nombre comercial tipo masthead arriba del título, teléfono clicable (`tel:`), logo como marca de agua grande detrás del contenido (420×420px, 14% opacidad, centrado con contenedor de página completa — no como logo chico en la esquina), footer con isotipo + "Generado con TuAsesor".
- **Pendiente de confirmar por Okta**: que el isotipo esté guardado en `src/assets/logo-isotipo-tuasesor.png` (o la ruta real usada) y que la marca de agua se vea bien con el último ajuste.

### 5.12 `perfiles`
Datos del asesor: `nombre_completo`/`nombre_corto`/`nombre_comercial` (columnas fijas), `telefonos`/`redes_sociales` (jsonb, arreglos — mismo patrón que `propiedades.redes_sociales`), `tarjeta_presentacion_url` (columna reservada, sin construir), `logo_url`/`color_acento` (sección "Marca", **habilitada y en uso** desde Sesión 9 — ya no es "Próximamente").

---

## 6. Orden de construcción (Sprints)

> **Importante**: "Sprint" (orden de construcción del código) es un concepto distinto de "Fase" (alcance grande del proyecto). Contactos sigue siendo la entidad central del modelo de datos — eso no cambia. Ambos son acuerdos de trabajo, no contratos rígidos (ver 1.3).

| Sprint | Módulo | Estado |
|---|---|---|
| **Sprint 1** | Propiedades | **Cerrado.** Colaboradores probado con contactos reales (Sesión 9). Pendiente: accesibilidad, feedback de Nydia en Historial/Situación fiscal y legal |
| **Sprint 2** | Libreta de contactos | **Cerrado (base), con refactor de teléfonos en curso.** Ver 5.2/5.3. Pendiente: vCard, accesibilidad |
| **Sprint 3** | Interacciones | **Cerrado.** Probado de punta a punta con datos reales (Sesión 11) |
| **Sprint N** | Citas | **Construido (Sesión 13).** Módulo separado de Interacciones — `visitas`, `CitaForm.jsx`, `ListadoCitas.jsx`, puntos de entrada. Pendiente probar con datos reales |

### 6.1 Sprint 1 — estado de diseño

**Pestaña Básico** ✅ — tipo, operación, uso, zona, precio, estado, descripción, redes sociales (multi-anuncio, red + URL libres), recámaras/baños/estacionamientos/m²construcción/m²terreno/cuota mantenimiento.

**Pestaña Fotos y ubicación** ✅ — grid de fotos, extracción de GPS vía EXIF con alternativas de geocoding o pin manual (siempre arrastrable), `ListadoPropiedades.jsx` con mapa Leaflet + grid + búsqueda + filtro venta/renta (construido Sesión 7).

**Pestaña Ficha técnica** ✅ — 5 secciones (ver 5.5).

**Pestaña Colaboradores** ✅ — probado con contactos reales, con botón "Quitar", tarjeta clicable → modal de ficha de contacto, ícono de correo.

---

## 7. Sistema de diseño

### 7.1 Paleta de colores
Basada en la marca personal real de Nydia (tarjeta de presentación), no en el logo genérico del producto TuAsesor.

| Nivel | Variable | Valor | Rol |
|---|---|---|---|
| Fondo | `--ta-bg` | `#F2EFE8` (caliza) | Lienzo general |
| Superficie | `--ta-surface` | `#FFFFFF` | Cards, inputs (corregido de `#FAFAF7` en Sesión 8 — "fatiga de caliza", fondo y superficie eran casi indistinguibles) |
| Tinta | `--ta-text` / `--ta-text-muted` | `#2A2A28` / `#6B6A63` | Texto principal / secundario |
| Acento funcional (único) | `--ta-accent` | `#1F3A2C` (verde bosque) | Único color permitido en elementos interactivos |
| Texto sobre acento | `--ta-on-accent` | `#F5F1E8` (crema) | Contraste sobre el verde |
| Detalle decorativo | `--ta-detail` | `#C9A183` (rosa-champán) | Solo en elementos NO interactivos (líneas, indicadores de progreso) |
| Borde | `--ta-border` | `#E2DDD0` | Separadores sutiles |

**Regla de oro**: un solo acento funcional a la vez. El rosa-champán nunca aparece en botones ni estados seleccionables — evita ambigüedad sobre qué es interactivo.

**Regla de superficies** (Sesión 7): vistas de **listado** (Listado de Propiedades/Contactos) usan tarjetas blancas sobre caliza; vistas de **formulario/detalle** (Perfil, wizard de Propiedades, ficha de Contacto) usan una sola hoja blanca continua, caliza solo como marco lateral o acento puntual.

### 7.2 Patrones de componente
- Tap-buttons en vez de dropdowns para selección de pocas opciones
- Botón "+ Agregar..." punteado (borde `--ta-detail`) para acciones de alta dentro de una sección, en vez de link de texto
- Listas editables con divisores internos para campos de cardinalidad variable (redes sociales, comentarios, teléfonos, atributos extra)
- Precio y datos numéricos en tipografía monoespaciada
- Confirmación de acciones destructivas: `window.confirm()` nativo — decisión explícita, cero componente nuevo (YAGNI)
- Navegación a fichas relacionadas (ej. abrir un contacto desde Colaboradores) vía modal que reutiliza el componente existente, sin tocar rutas ni el componente padre

### 7.3 Skills obligatorios
`ui-ux-pro-max` y `frontend-design` para toda decisión de UI/UX. Mobile-first siempre.

---

## 8. Backlog Fase 2 (diferido)

> Ver `docs/BACKLOG.md` para el estado accionable y actualizado — esta sección es el resumen de alcance, no la lista de tareas viva.

- **Proceso Comercial (módulo completo)**: vincular propiedad a un proceso ya creado, vista de embudo/kanban, dashboard de funnel/reportes. La tabla y la alta rápida ya existen (5.9).
- Sistema de tareas/to-do's asociado a Interacciones (formal, no un flag).
- Pantalla completa de la Bóveda de documentos (infraestructura ya construida, ver 5.10).
- **Generador de posts para redes sociales con IA** — posible diferenciador de producto. Fuente de datos: Básico + Ficha técnica + Fotos. Estructura propuesta: Gancho → Datos clave → Beneficios (alimentado por `equipamiento`) → Estatus legal → CTA. Arquitectura: Edge Function de Supabase que llama a la API de Claude.
- Dashboard con funnel/reportes general.
- Captura pública / liga al cliente — patrón: Edge Function + token con expiración, nunca acceso directo a tabla desde el navegador del cliente.
- Integración oficial de WhatsApp API o VoIP para llamadas (ver 2.3 — requiere que Nydia cambie cómo opera, no es solo desarrollo).
- Módulo de cierre/post-venta.
- Chat en lenguaje natural (IA) — 3 capacidades independientes: alta de propiedad por chat (la más simple), preguntas en lenguaje natural sobre los datos (requiere herramientas acotadas predefinidas, nunca SQL libre generado por el modelo), resumen semanal de pendientes. Costo estimado: centavos al mes al volumen de Nydia.

**Ya NO están en esta sección** (se construyeron de punta a punta en Sesión 9, ver 5.10 y 5.11): Bóveda de documentos (infraestructura) y Generación de PDF de ficha técnica.

---

## 9. Convenciones de desarrollo

### 9.1 Cabecera de archivo (obligatoria en todo archivo generado/modificado)
```
Línea 1: nombre de página y ruta dentro de la app
Línea 2: razón del cambio
Línea 3: timestamp real YYYY-MM-DD, HH:MM hrs (nunca placeholder)
```

### 9.2 Variables de entorno
Prefijo `VITE_` obligatorio para toda variable visible en frontend. `.env.example` sí se sube a git (con comentario `# Proposito:` y `# ADVERTENCIA:` si aplica). `.env` real nunca se sube.

### 9.3 Documentación de sesión — obligatoria antes de cerrar
Ver `CLAUDE.md` en la raíz del repo. Regla dura: toda sesión de trabajo (sin importar el tool) termina actualizando `docs/BACKLOG.md` in-place y creando `docs/bitacora/<fecha-ISO>.md` con la plantilla de `docs/bitacora/TEMPLATE.md`. No depende de que Okta lo pida.

### 9.4 Otros
- Advertir antes de operaciones costosas en tokens
- Para cambios menores en código ya existente, usar diffs en vez de reescribir archivos completos
- Supabase Pro plan, Daily Backups activos (7 días de retención)
- Tras cualquier `ALTER TABLE`, recargar el schema de PostgREST manualmente desde el Dashboard (Project Settings → Data API → Exposed schemas) — `NOTIFY` por SQL no lo resuelve de forma confiable
- Sí es posible crear buckets de Storage directamente por migración SQL usando las herramientas de Supabase con rol elevado (confirmado Sesión 9) — el bloqueo encontrado en Sesión 8 era específico del cliente con anon key, no una limitación real de Supabase

---

## 10. Documentos relacionados

- `docs/bitacora/YYYY-MM-DD.md` — registro histórico cronológico, un archivo por sesión, nunca se edita el de un día anterior
- `docs/BACKLOG.md` — checklist vivo de pendientes accionables, un solo archivo editado in-place (no se acumula, no se crean copias con fecha)
- `CLAUDE.md` (raíz del repo) — instrucciones del proyecto, incluyendo la regla de actualización de documentación al cerrar sesión
