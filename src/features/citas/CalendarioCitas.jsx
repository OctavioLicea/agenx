// src/features/citas/CalendarioCitas.jsx
// Motivo: Sprint N (Citas) — vista de calendario pedida por Okta tras
//   revisar el listado real con Nydia (Sesión 13, segunda vuelta).
//   Especificación explícita de Okta: 3 días a la vez (ayer/hoy/mañana,
//   deslizable con un control de fecha), enfocado en horario regular
//   9:00–19:00 (no un mes completo ni una semana de 7 columnas — mucho
//   para el volumen real de citas de Nydia). Reutiliza el arreglo
//   `citas` ya cargado por ListadoCitas.jsx (todas las citas del
//   usuario) y filtra en cliente por los 3 días visibles — sin query
//   nueva, dataset pequeño (3-4 propiedades activas).
//   Citas fuera de 9:00–19:00 no se descartan: se listan como chips
//   arriba de cada columna en vez de dibujarse fuera de la rejilla, para
//   mantener la rejilla acotada al horario regular como pidió Okta.
//
// [Actualización 2026-07-14, 21:17 hrs] Feedback de Okta tras primera
//   prueba visual: la rejilla se veía en blanco (las líneas de hora a
//   0.5px con --ta-border casi no tienen contraste contra --ta-surface)
//   y la fecha de enfoque se perdía dentro del input nativo. Cambios:
//   (1) rejilla reconstruida con CSS Grid (antes cada columna era un
//   flex hijo independiente — si un día tenía chips "fuera de horario"
//   y otro no, las rejillas de hora quedaban desalineadas entre
//   columnas; con Grid, encabezados/chips-fuera/rejilla son 3 filas
//   compartidas y cada fila se alinea sola); columna de horas (9:00…
//   18:00) a la izquierda; líneas de hora ahora con color-mix sobre
//   --ta-text (contraste garantizado en vez de depender de qué tan
//   cerca esté --ta-border del fondo); zebra sutil cada hora par;
//   columna de "hoy" con tinte de acento + línea de "ahora" en vivo. (2)
//   fecha de enfoque: input con texto centrado en negritas + encabezado
//   grande "Martes, 14 de julio" en color de acento arriba del selector,
//   para que no dependa solo del input pequeño. (3) filtro por
//   propiedad y por contacto — pedido directo de Okta, opciones
//   derivadas de las citas ya cargadas (sin query nueva), aplicado antes
//   de repartir citas en columnas/chips.
// Timestamp: 2026-07-14, 21:17 hrs

import { useMemo, useState } from 'react'

const HORA_INICIO = 9
const HORA_FIN = 19 // exclusivo a efectos de rejilla — última línea es "19"
const ALTO_HORA = 44 // px por hora — mismo mínimo de touch target que el resto de la app
const ALTO_REJILLA = (HORA_FIN - HORA_INICIO) * ALTO_HORA
const ANCHO_HORAS = 36 // columna de etiquetas de hora, a la izquierda

// Líneas/zebra de la rejilla vía color-mix sobre --ta-text: garantiza
// contraste visible sin importar qué tan parecidos sean --ta-border y
// --ta-surface (motivo del reporte de "rejilla en blanco").
const LINEA_REJILLA = 'color-mix(in srgb, var(--ta-text) 14%, transparent)'
const ZEBRA_HORA = 'color-mix(in srgb, var(--ta-text) 3%, transparent)'
const TINTE_HOY = 'color-mix(in srgb, var(--ta-accent) 6%, transparent)'

const coloresEstado = {
  programada: { bg: '#EAF3DE', text: '#27500A', ribbon: '#639922' },
  realizada: { bg: '#DCEAE3', text: '#144D36', ribbon: '#0F6E56' },
  cancelada: { bg: '#FCEBEB', text: '#791F1F', ribbon: '#E24B4A' },
  no_asistio: { bg: '#FAEEDA', text: '#633806', ribbon: '#EF9F27' },
}

function aYMD(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function mismoDia(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function sumarDias(d, n) {
  const copia = new Date(d)
  copia.setDate(copia.getDate() + n)
  return copia
}

function formatearHora(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function capitalizar(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function IconoChevronIzq() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}
function IconoChevronDer() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

const DIAS_LABEL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const estiloSelect = {
  flex: 1, height: 34, borderRadius: 8, border: '0.5px solid var(--ta-border)',
  background: 'var(--ta-surface)', color: 'var(--ta-text)', fontSize: 11.5,
  padding: '0 6px', minWidth: 0,
}

// --- Fila 1: encabezado de cada día (Lun 13 / Mar 14 / Mié 15) ---
function EncabezadoDia({ fecha, hoy }) {
  const esHoy = mismoDia(fecha, hoy)
  return (
    <div style={{ textAlign: 'center', padding: '4px 0 8px', borderBottom: esHoy ? '2px solid var(--ta-accent)' : '1px solid var(--ta-border)' }}>
      <p style={{ margin: 0, fontSize: 10, color: 'var(--ta-text-muted)' }}>{DIAS_LABEL[fecha.getDay()]}</p>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: esHoy ? 'var(--ta-accent)' : 'var(--ta-text)' }}>{fecha.getDate()}</p>
    </div>
  )
}

// --- Fila 2: chips de citas fuera de 9:00–19:00, por día ---
function FueraDeHorario({ fecha, citas, onSeleccionar }) {
  const fuera = useMemo(() => {
    return citas
      .map((c) => ({ cita: c, fecha: new Date(c.fecha_hora) }))
      .filter(({ fecha: d }) => {
        if (!mismoDia(d, fecha)) return false
        const hora = d.getHours() + d.getMinutes() / 60
        return hora < HORA_INICIO || hora >= HORA_FIN
      })
  }, [citas, fecha])

  if (fuera.length === 0) return <div />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 0 8px' }}>
      {fuera.map(({ cita, fecha: f }) => {
        const colores = coloresEstado[cita.estado] || coloresEstado.programada
        return (
          <button
            key={cita.id}
            type="button"
            onClick={() => onSeleccionar(cita)}
            title={`${formatearHora(f)} · ${cita.contactos?.nombre || 'Sin nombre'} (fuera de horario)`}
            style={{
              fontSize: 9, padding: '3px 5px', borderRadius: 6, border: 'none', textAlign: 'left',
              background: colores.bg, color: colores.text, cursor: 'pointer', minHeight: 22,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {formatearHora(f)} {cita.contactos?.nombre || 'Sin nombre'}
          </button>
        )
      })}
    </div>
  )
}

// --- Columna de etiquetas de hora (9:00 … 18:00), compartida a la izquierda ---
function EtiquetasHoras() {
  const horas = []
  for (let h = HORA_INICIO; h < HORA_FIN; h++) horas.push(h)
  return (
    <div style={{ position: 'relative', height: ALTO_REJILLA }}>
      {horas.map((h) => (
        <span
          key={h}
          style={{
            position: 'absolute', top: h === HORA_INICIO ? 0 : (h - HORA_INICIO) * ALTO_HORA - 6,
            right: 4, fontSize: 9, color: 'var(--ta-text-muted)', fontVariantNumeric: 'tabular-nums',
          }}
        >
          {String(h).padStart(2, '0')}:00
        </span>
      ))}
    </div>
  )
}

// --- Fila 3: rejilla de horas del día, con las citas dentro de 9:00–19:00 ---
function RejillaDia({ fecha, citas, hoy, onSeleccionar }) {
  const esHoy = mismoDia(fecha, hoy)

  const dentro = useMemo(() => {
    return citas
      .map((c) => ({ cita: c, fecha: new Date(c.fecha_hora) }))
      .filter(({ fecha: d }) => {
        if (!mismoDia(d, fecha)) return false
        const hora = d.getHours() + d.getMinutes() / 60
        return hora >= HORA_INICIO && hora < HORA_FIN
      })
      .map((x) => ({ ...x, hora: x.fecha.getHours() + x.fecha.getMinutes() / 60 }))
  }, [citas, fecha])

  const ahora = new Date()
  const horaAhora = ahora.getHours() + ahora.getMinutes() / 60
  const mostrarLineaAhora = esHoy && horaAhora >= HORA_INICIO && horaAhora < HORA_FIN

  const fondo = [
    esHoy ? TINTE_HOY : null,
    `repeating-linear-gradient(to bottom, ${ZEBRA_HORA} 0, ${ZEBRA_HORA} ${ALTO_HORA}px, transparent ${ALTO_HORA}px, transparent ${2 * ALTO_HORA}px)`,
    `repeating-linear-gradient(to bottom, ${LINEA_REJILLA} 0, ${LINEA_REJILLA} 1px, transparent 1px, transparent ${ALTO_HORA}px)`,
  ].filter(Boolean).join(', ')

  return (
    <div style={{ position: 'relative', height: ALTO_REJILLA, background: fondo, borderLeft: '1px solid var(--ta-border)', borderTop: `1px solid ${LINEA_REJILLA}` }}>
      {dentro.map(({ cita, fecha: f, hora }) => {
        const colores = coloresEstado[cita.estado] || coloresEstado.programada
        const top = (hora - HORA_INICIO) * ALTO_HORA
        return (
          <button
            key={cita.id}
            type="button"
            onClick={() => onSeleccionar(cita)}
            title={`${formatearHora(f)} · ${cita.contactos?.nombre || 'Sin nombre'} · ${cita.propiedades?.titulo || ''}`}
            style={{
              position: 'absolute', left: 2, right: 2, top: top + 1, height: ALTO_HORA - 4,
              borderRadius: 6, border: 'none', borderLeft: `3px solid ${colores.ribbon}`,
              background: colores.bg, color: colores.text, cursor: 'pointer', textAlign: 'left',
              padding: '2px 5px', fontSize: 9, lineHeight: 1.25, overflow: 'hidden', zIndex: 1,
            }}
          >
            <span style={{ display: 'block', fontWeight: 600 }}>{formatearHora(f)}</span>
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cita.contactos?.nombre || 'Sin nombre'}
            </span>
          </button>
        )
      })}

      {mostrarLineaAhora && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: (horaAhora - HORA_INICIO) * ALTO_HORA, borderTop: '2px solid var(--ta-accent)', zIndex: 2 }}>
          <span style={{ position: 'absolute', left: -4, top: -4, width: 8, height: 8, borderRadius: '50%', background: 'var(--ta-accent)' }} />
        </div>
      )}
    </div>
  )
}

// Props: citas (arreglo ya cargado por ListadoCitas.jsx, sin query nueva),
// onSeleccionar(cita) — abre CitaForm en modo edición, mismo comportamiento
// que tocar una fila en la vista de lista.
export default function CalendarioCitas({ citas, onSeleccionar }) {
  const hoy = useMemo(() => new Date(), [])
  const [diaFoco, setDiaFoco] = useState(hoy)
  const [filtroPropiedadId, setFiltroPropiedadId] = useState('todas')
  const [filtroContactoId, setFiltroContactoId] = useState('todos')

  const propiedadesOpciones = useMemo(() => {
    const mapa = new Map()
    citas.forEach((c) => { if (c.propiedades?.id) mapa.set(c.propiedades.id, c.propiedades.titulo || 'Sin título') })
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [citas])

  const contactosOpciones = useMemo(() => {
    const mapa = new Map()
    citas.forEach((c) => { if (c.contactos?.id) mapa.set(c.contactos.id, c.contactos.nombre || 'Sin nombre') })
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [citas])

  const citasFiltradas = useMemo(() => {
    return citas.filter((c) =>
      (filtroPropiedadId === 'todas' || c.propiedades?.id === filtroPropiedadId) &&
      (filtroContactoId === 'todos' || c.contactos?.id === filtroContactoId)
    )
  }, [citas, filtroPropiedadId, filtroContactoId])

  const hayFiltro = filtroPropiedadId !== 'todas' || filtroContactoId !== 'todos'
  const dias = [sumarDias(diaFoco, -1), diaFoco, sumarDias(diaFoco, 1)]
  const etiquetaFoco = capitalizar(diaFoco.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }))

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <select
          value={filtroPropiedadId}
          onChange={(e) => setFiltroPropiedadId(e.target.value)}
          aria-label="Filtrar calendario por propiedad"
          style={estiloSelect}
        >
          <option value="todas">Todas las propiedades</option>
          {propiedadesOpciones.map(([id, titulo]) => (
            <option key={id} value={id}>{titulo}</option>
          ))}
        </select>
        <select
          value={filtroContactoId}
          onChange={(e) => setFiltroContactoId(e.target.value)}
          aria-label="Filtrar calendario por contacto"
          style={estiloSelect}
        >
          <option value="todos">Todos los contactos</option>
          {contactosOpciones.map(([id, nombre]) => (
            <option key={id} value={id}>{nombre}</option>
          ))}
        </select>
        {hayFiltro && (
          <button
            type="button"
            onClick={() => { setFiltroPropiedadId('todas'); setFiltroContactoId('todos') }}
            title="Quitar filtros"
            style={{ flexShrink: 0, height: 34, padding: '0 8px', borderRadius: 8, border: '0.5px solid var(--ta-detail)', background: 'none', color: 'var(--ta-detail)', fontSize: 11, cursor: 'pointer' }}
          >
            Limpiar
          </button>
        )}
      </div>

      <p style={{ margin: '0 0 8px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--ta-accent)' }}>
        {etiquetaFoco}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setDiaFoco((d) => sumarDias(d, -1))}
          aria-label="Día anterior"
          title="Día anterior"
          style={{ width: 36, height: 36, flexShrink: 0, border: '0.5px solid var(--ta-border)', borderRadius: 8, background: 'var(--ta-surface)', color: 'var(--ta-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <IconoChevronIzq />
        </button>

        <input
          type="date"
          value={aYMD(diaFoco)}
          onChange={(e) => {
            if (!e.target.value) return
            const [y, m, d] = e.target.value.split('-').map(Number)
            setDiaFoco(new Date(y, m - 1, d))
          }}
          aria-label="Elegir día de enfoque"
          style={{ flex: 1, height: 36, borderRadius: 8, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-accent)', padding: '0 8px', fontSize: 13, fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' }}
        />

        {!mismoDia(diaFoco, hoy) && (
          <button
            type="button"
            onClick={() => setDiaFoco(hoy)}
            style={{ height: 36, padding: '0 10px', borderRadius: 8, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-accent)', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
          >
            Hoy
          </button>
        )}

        <button
          type="button"
          onClick={() => setDiaFoco((d) => sumarDias(d, 1))}
          aria-label="Día siguiente"
          title="Día siguiente"
          style={{ width: 36, height: 36, flexShrink: 0, border: '0.5px solid var(--ta-border)', borderRadius: 8, background: 'var(--ta-surface)', color: 'var(--ta-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <IconoChevronDer />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `${ANCHO_HORAS}px repeat(3, 1fr)`, columnGap: 6 }}>
        <div />
        {dias.map((f, idx) => <EncabezadoDia key={`h${idx}`} fecha={f} hoy={hoy} />)}

        <div />
        {dias.map((f, idx) => <FueraDeHorario key={`f${idx}`} fecha={f} citas={citasFiltradas} onSeleccionar={onSeleccionar} />)}

        <EtiquetasHoras />
        {dias.map((f, idx) => <RejillaDia key={`r${idx}`} fecha={f} citas={citasFiltradas} hoy={hoy} onSeleccionar={onSeleccionar} />)}
      </div>

      {citasFiltradas.length === 0 && citas.length > 0 && (
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ta-text-muted)', marginTop: 10 }}>
          Ninguna cita coincide con el filtro elegido.
        </p>
      )}

      <p style={{ fontSize: 10, color: 'var(--ta-text-muted)', textAlign: 'center', marginTop: 10 }}>
        Horario regular 9:00–19:00. Las citas fuera de ese rango aparecen como chips arriba de cada día.
      </p>
    </div>
  )
}
