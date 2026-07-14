// src/features/contactos/ListadoContactos.jsx
// Motivo: Homologación de accesibilidad en Contactos (pendiente arrastrado
//   desde Sesión 6/backlog). La tarjeta de contacto era un <div> con
//   onClick sin tabIndex/role/onKeyDown — invisible e inoperable para
//   teclado y lectores de pantalla. Se agrega role="button", tabIndex={0},
//   aria-label descriptivo y onKeyDown (Enter/Espacio) para igualarla a un
//   <button> real. El anillo de foco visible ahora lo cubre la regla
//   global `[tabindex]:focus-visible` en App.css.
//   [Actualización 13 jul 2026]: entrada "Importar contactos" (link junto
//   al contador) que abre ImportarContactos.jsx — pedido de Okta para los
//   ~1000 contactos que Nydia ya tiene fuera de la app.
//   [Actualización 13 jul 2026, más tarde]: selector de orden (más
//   recientes/nombre/empresa, mismo patrón que ListadoInteracciones.jsx)
//   + filtro opcional por fecha de creación (Desde/Hasta) — se agrega
//   `created_at` al select, antes no venía.
//   [Actualización 13 jul 2026, más tarde aún]: botón de eliminar por
//   contacto (ícono de bote de basura, doble affordance sobre la tarjeta
//   con stopPropagation, mismo patrón que el avatar en
//   ListadoInteracciones.jsx). Se verificaron los FK de `contactos` en
//   Supabase: TODAS las tablas hijas (interacciones, contacto_telefonos,
//   visitas, contacto_propiedades, propiedad_colaboradores,
//   procesos_comerciales) tienen ON DELETE CASCADE — borrar un contacto
//   borra en cascada su historial. El confirm() lo advierte explícitamente
//   usando los contadores que ya traía la fila (interacciones/propiedades).
//   [Actualización 2026-07-13, 23:10 hrs]: botón "Vaciar contactos" —
//   borrado masivo de TODOS los contactos del usuario (mismo cascade de
//   arriba aplica a cada uno: teléfonos, interacciones, visitas,
//   colaboraciones y procesos comerciales). Pedido explícito de Okta: en
//   vez de un window.confirm() normal (insuficiente para una acción tan
//   destructiva e irreversible), se agrega un modal propio que exige
//   escribir literalmente la palabra "Vaciar" para habilitar el botón de
//   confirmación — mismo patrón de "escribe para confirmar" usado en
//   GitHub/Supabase para borrados masivos. Borra por lotes de 200 ids
//   (los que ya están cargados en `contactos`, no solo los filtrados en
//   pantalla) para no exceder límites de un solo delete .in().
// Timestamp: 2026-07-13, 23:10 hrs

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import ImportarContactos from './ImportarContactos'

function telefonoPrincipalDe(c) {
  const tels = c.contacto_telefonos || []
  return tels.find((t) => t.es_principal)?.telefono || tels[0]?.telefono || null
}

function iniciales(nombre, telefono) {
  if (nombre?.trim()) {
    const partes = nombre.trim().split(/\s+/)
    return (partes[0][0] + (partes[1]?.[0] || '')).toUpperCase()
  }
  return telefono ? telefono.slice(-2) : '?'
}

function IconoCalendario() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconoBasura() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

function IconoAlerta() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

const PALABRA_CONFIRMACION = 'Vaciar'

// Modal de "escribe para confirmar" — mismo overlay/card que
// ImportarContactos.jsx, componente local (patrón ya usado en el
// proyecto: un componente por archivo en vez de compartirlo).
function ModalVaciarContactos({ total, vaciando, error, onCancelar, onConfirmar }) {
  const [texto, setTexto] = useState('')
  const habilitado = texto.trim() === PALABRA_CONFIRMACION

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,40,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16, boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--ta-surface)', borderRadius: 20, padding: 20, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#993C1D', marginBottom: 12 }}>
          <IconoAlerta />
          <span style={{ fontSize: 16, fontWeight: 600 }}>Vaciar contactos</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ta-text)', margin: '0 0 8px' }}>
          Esto eliminará permanentemente los {total} contacto{total === 1 ? '' : 's'} y todo su historial asociado (teléfonos, interacciones, visitas, propiedades asociadas y procesos comerciales).
        </p>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#993C1D', margin: '0 0 14px' }}>
          Esta acción no se puede deshacer.
        </p>
        <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>
          Escribe <strong>{PALABRA_CONFIRMACION}</strong> para confirmar:
        </p>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={vaciando}
          autoFocus
          placeholder={PALABRA_CONFIRMACION}
          style={{
            width: '100%', height: 40, borderRadius: 10, border: '0.5px solid var(--ta-border)',
            background: 'var(--ta-surface)', color: 'var(--ta-text)', padding: '0 12px',
            fontSize: 13, boxSizing: 'border-box', marginBottom: 14,
          }}
        />
        {error && <p style={{ color: '#993C1D', fontSize: 13, marginBottom: 10 }}>{error}</p>}
        <button
          type="button"
          onClick={() => onConfirmar()}
          disabled={!habilitado || vaciando}
          style={{
            width: '100%', height: 44, borderRadius: 10, border: 'none',
            background: '#993C1D', color: '#FFFFFF', fontSize: 14, fontWeight: 500,
            cursor: habilitado && !vaciando ? 'pointer' : 'default',
            opacity: habilitado && !vaciando ? 1 : 0.45,
          }}
        >
          {vaciando ? 'Vaciando...' : `Vaciar ${total} contacto${total === 1 ? '' : 's'}`}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={vaciando}
          style={{
            width: '100%', height: 40, borderRadius: 10, border: '0.5px solid var(--ta-border)',
            background: 'none', color: 'var(--ta-text)', fontSize: 13, cursor: 'pointer', marginTop: 8,
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

export default function ListadoContactos({ onSeleccionar, onNuevo, refreshKey = 0 }) {
  const [contactos, setContactos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [mostrarImportar, setMostrarImportar] = useState(false)
  const [recargaKey, setRecargaKey] = useState(0)
  const [orden, setOrden] = useState('creado') // 'creado' | 'nombre' | 'empresa'
  const [mostrarFiltroFecha, setMostrarFiltroFecha] = useState(false)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [mostrarVaciar, setMostrarVaciar] = useState(false)
  const [vaciando, setVaciando] = useState(false)
  const [errorVaciar, setErrorVaciar] = useState(null)

  useEffect(() => {
    setCargando(true)
    supabase
      .from('contactos')
      .select(`
        id, nombre, empresa, rol_principal, correo, created_at,
        contacto_telefonos(telefono, es_principal),
        interacciones(count),
        propiedad_colaboradores(count)
      `)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(`No se pudieron cargar los contactos: ${fetchError.message}`)
        } else {
          setContactos(data || [])
        }
        setCargando(false)
      })
  }, [refreshKey, recargaKey])

  // Búsqueda global: nombre, teléfonos (todos, no solo el principal),
  // empresa, rol_principal y correo. Más filtro opcional por fecha de
  // creación (created_at) — rango Desde/Hasta, ambos opcionales