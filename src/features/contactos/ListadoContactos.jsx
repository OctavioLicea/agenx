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
//   [Actualización 2026-07-14, 22:35 hrs] Okta reportó la app "muy lenta
//   para mostrar listas" probando un import de 5427 contactos reales.
//   Causa: se renderizaban TODAS las tarjetas de una vez — miles de nodos
//   de DOM en un solo paint, cada uno con sus propios listeners e íconos.
//   Se agrega paginación en cliente: `limite` (arranca en 100) sobre el
//   arreglo ya filtrado/ordenado (`ordenados`), con botón "Mostrar más"
//   al fondo que suma 100 más. La búsqueda y los filtros de fecha siguen
//   operando sobre TODOS los contactos ya cargados en memoria (un solo
//   fetch, sin paginar el query) — no se toca esa parte, así que buscar
//   sigue siendo global y no solo dentro de lo ya mostrado. `limite` se
//   reinicia a 100 cada vez que cambia búsqueda/orden/fecha, para no
//   quedar "enterrado" dentro de una lista larga tras un filtro nuevo.
// Timestamp: 2026-07-14, 22:35 hrs

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
  const [limite, setLimite] = useState(100)

  useEffect(() => {
    setCargando(true)
    supabase
      .from('contactos')
      .select(`
        id, nombre, empresa, rol_principal, correo, nota_sin_propiedad, created_at,
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
  // creación (created_at) — rango Desde/Hasta, ambos opcionales.
  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return contactos.filter((c) => {
      const coincideTexto =
        !texto ||
        c.nombre?.toLowerCase().includes(texto) ||
        (c.contacto_telefonos || []).some((t) => t.telefono?.toLowerCase().includes(texto)) ||
        c.empresa?.toLowerCase().includes(texto) ||
        c.rol_principal?.toLowerCase().includes(texto) ||
        c.correo?.toLowerCase().includes(texto)
      const fechaCreado = c.created_at ? new Date(c.created_at) : null
      const coincideFecha =
        (!fechaDesde || (fechaCreado && fechaCreado >= new Date(`${fechaDesde}T00:00:00`))) &&
        (!fechaHasta || (fechaCreado && fechaCreado <= new Date(`${fechaHasta}T23:59:59`)))
      return coincideTexto && coincideFecha
    })
  }, [contactos, busqueda, fechaDesde, fechaHasta])

  const ordenados = useMemo(() => {
    if (orden === 'creado') return filtrados
    const copia = [...filtrados]
    if (orden === 'nombre') {
      copia.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
    } else if (orden === 'empresa') {
      copia.sort((a, b) => (a.empresa || '').localeCompare(b.empresa || ''))
    }
    return copia
  }, [filtrados, orden])

  // Reinicia la paginación cada vez que cambia la búsqueda/orden/fecha —
  // si no, tras filtrar podrías quedar viendo "0 resultados visibles"
  // hasta hacer scroll o dar clic en Mostrar más, aunque sí haya matches.
  useEffect(() => {
    setLimite(100)
  }, [busqueda, orden, fechaDesde, fechaHasta])

  const visibles = ordenados.slice(0, limite)

  // Borra un contacto. Todas las tablas hijas tienen ON DELETE CASCADE en
  // Supabase, así que esto también borra sus teléfonos, interacciones,
  // visitas, colaboraciones en propiedades y procesos comerciales — por
  // eso el confirm() lo advierte con los contadores reales de la fila.
  async function eliminarContacto(c) {
    const numInteracciones = c.interacciones?.[0]?.count ?? 0
    const numPropiedades = c.propiedad_colaboradores?.[0]?.count ?? 0
    const detalle = []
    if (numInteracciones > 0) detalle.push(`${numInteracciones} interacción${numInteracciones === 1 ? '' : 'es'}`)
    if (numPropiedades > 0) detalle.push(`${numPropiedades} propiedad${numPropiedades === 1 ? '' : 'es'} asociada${numPropiedades === 1 ? '' : 's'}`)
    const advertencia = detalle.length
      ? `\n\nEsto también borrará: ${detalle.join(' y ')}. `
      : '\n\n'
    const confirmado = window.confirm(
      `¿Eliminar a ${c.nombre || 'este contacto'}?${advertencia}Esta acción no se puede deshacer.`
    )
    if (!confirmado) return

    const { error: deleteError } = await supabase.from('contactos').delete().eq('id', c.id)
    if (deleteError) {
      window.alert(`No se pudo eliminar: ${deleteError.message}`)
      return
    }
    setRecargaKey((v) => v + 1)
  }

  // Borrado masivo — usa los ids ya cargados en `contactos` (todos, no
  // solo `filtrados`), en lotes de 200 para no exceder límites de un
  // solo delete .in(). Mismo cascade que eliminarContacto: se lleva
  // teléfonos, interacciones, visitas, colaboraciones y procesos
  // comerciales de cada contacto.
  async function vaciarContactos() {
    setErrorVaciar(null)
    setVaciando(true)
    const ids = contactos.map((c) => c.id)
    for (let i = 0; i < ids.length; i += 200) {
      const lote = ids.slice(i, i + 200)
      const { error: deleteError } = await supabase.from('contactos').delete().in('id', lote)
      if (deleteError) {
        setErrorVaciar(`No se pudo vaciar por completo: ${deleteError.message}`)
        setVaciando(false)
        setRecargaKey((v) => v + 1)
        return
      }
    }
    setVaciando(false)
    setMostrarVaciar(false)
    setRecargaKey((v) => v + 1)
  }

  if (cargando) {
    return (
      <div style={{ background: 'var(--ta-bg)', display: 'flex', justifyContent: 'center', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: 480, height: '100%', background: 'var(--ta-surface)', padding: 16 }}>
          <div style={{ height: 40, borderRadius: 10, background: 'var(--ta-bg)', marginBottom: 16, animation: 'ta-pulso 1.4s ease-in-out infinite' }} />
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--ta-bg)', flexShrink: 0, animation: `ta-pulso 1.4s ease-in-out infinite ${i * 0.15}s` }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, width: '60%', borderRadius: 4, background: 'var(--ta-bg)', marginBottom: 8, animation: `ta-pulso 1.4s ease-in-out infinite ${i * 0.15}s` }} />
                <div style={{ height: 12, width: '35%', borderRadius: 4, background: 'var(--ta-bg)', animation: `ta-pulso 1.4s ease-in-out infinite ${i * 0.15}s` }} />
              </div>
            </div>
          ))}
          <style>{`@keyframes ta-pulso { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
        </div>
      </div>
    )
  }

  if (error) {
    return <p style={{ textAlign: 'center', marginTop: '3rem', color: '#993C1D' }}>{error}</p>
  }

  return (
    <div style={{ background: 'var(--ta-bg)', display: 'flex', justifyContent: 'center', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, height: '100%', overflowY: 'auto', background: 'var(--ta-surface)' }}>

        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--ta-surface)', padding: '12px 16px', borderBottom: '0.5px solid var(--ta-border)' }}>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, teléfono, empresa o rol"
            style={{
              width: '100%', height: 40, borderRadius: 10, border: '0.5px solid var(--ta-border)',
              background: 'var(--ta-surface)', color: 'var(--ta-text)',
              padding: '0 12px', fontSize: 13, boxSizing: 'border-box',
              fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>

        <div style={{ padding: '12px 16px 90px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--ta-text-muted)' }}>
              {filtrados.length > limite
                ? `Mostrando ${limite} de ${filtrados.length} contactos`
                : `${filtrados.length} contacto${filtrados.length === 1 ? '' : 's'}`}
            </p>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              aria-label="Ordenar por"
              style={{
                fontSize: 11, border: '0.5px solid var(--ta-border)', borderRadius: 8,
                background: 'var(--ta-surface)', color: 'var(--ta-text-muted)', padding: '5px 6px',
              }}
            >
              <option value="creado">Más recientes</option>
              <option value="nombre">Nombre (A-Z)</option>
              <option value="empresa">Empresa (A-Z)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
            <button
              type="button"
              onClick={() => setMostrarFiltroFecha((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', padding: 0, fontSize: 11, color: 'var(--ta-text-muted)', cursor: 'pointer' }}
            >
              <IconoCalendario />
              Filtrar por fecha
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => setMostrarImportar(true)}
                style={{ border: 'none', background: 'none', color: 'var(--ta-accent)', fontSize: 11, cursor: 'pointer', padding: '4px 0' }}
              >
                Importar contactos
              </button>
              <button
                type="button"
                onClick={() => setMostrarVaciar(true)}
                disabled={contactos.length === 0}
                style={{
                  border: 'none', background: 'none', color: '#993C1D', fontSize: 11,
                  cursor: contactos.length === 0 ? 'default' : 'pointer', padding: '4px 0',
                  opacity: contactos.length === 0 ? 0.4 : 1,
                }}
              >
                Vaciar contactos
              </button>
            </div>
          </div>

          {mostrarFiltroFecha && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 3px', fontSize: 10, color: 'var(--ta-text-muted)' }}>Desde</p>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '6px 8px', borderRadius: 8, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 3px', fontSize: 10, color: 'var(--ta-text-muted)' }}>Hasta</p>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '6px 8px', borderRadius: 8, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)' }}
                />
              </div>
              {(fechaDesde || fechaHasta) && (
                <button
                  type="button"
                  onClick={() => { setFechaDesde(''); setFechaHasta('') }}
                  style={{ alignSelf: 'flex-end', height: 30, border: '0.5px solid var(--ta-detail)', background: 'none', color: 'var(--ta-detail)', borderRadius: 8, fontSize: 11, padding: '0 8px', cursor: 'pointer' }}
                >
                  Limpiar
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visibles.map((c) => {
              const telefono = telefonoPrincipalDe(c)
              const numInteracciones = c.interacciones?.[0]?.count ?? 0
              const numPropiedades = c.propiedad_colaboradores?.[0]?.count ?? 0
              return (
                <div
                  key={c.id}
                  onClick={() => onSeleccionar?.(c)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir ficha de ${c.nombre || telefono || 'contacto sin nombre'}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSeleccionar?.(c) }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    border: '0.5px solid var(--ta-border)', borderRadius: 12, padding: 10,
                    background: 'var(--ta-surface)',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--ta-accent)', color: 'var(--ta-on-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 500,
                  }}>
                    {iniciales(c.nombre, telefono)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: c.nombre ? 'var(--ta-text)' : 'var(--ta-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.nombre || 'Sin nombre'}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ta-text-muted)' }}>
                      {telefono || 'Sin teléfono'}
                      {c.rol_principal && ` · ${c.rol_principal}`}
                    </p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <span style={{ fontSize: 10, background: 'var(--ta-bg)', color: 'var(--ta-text-muted)', borderRadius: 5, padding: '2px 6px' }}>
                        {numInteracciones} interacci{numInteracciones === 1 ? 'ón' : 'ones'}
                      </span>
                      <span style={{ fontSize: 10, background: 'var(--ta-bg)', color: 'var(--ta-text-muted)', borderRadius: 5, padding: '2px 6px' }}>
                        {numPropiedades} propiedad{numPropiedades === 1 ? '' : 'es'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); eliminarContacto(c) }}
                    onKeyDown={(e) => e.stopPropagation()}
                    aria-label={`Eliminar a ${c.nombre || telefono || 'contacto sin nombre'}`}
                    style={{
                      width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: 'none', background: 'none', color: 'var(--ta-text-muted)', cursor: 'pointer', borderRadius: 8,
                    }}
                  >
                    <IconoBasura />
                  </button>
                </div>
              )
            })}

            {filtrados.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ta-text-muted)', padding: '2rem 0' }}>
                No hay contactos que coincidan.
              </p>
            )}

            {ordenados.length > limite && (
              <button
                type="button"
                onClick={() => setLimite((v) => v + 100)}
                style={{
                  height: 40, borderRadius: 10, border: '0.5px solid var(--ta-border)',
                  background: 'var(--ta-surface)', color: 'var(--ta-accent)', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', marginTop: 4,
                }}
              >
                Mostrar 100 más ({ordenados.length - limite} restantes)
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onNuevo}
          aria-label="Nuevo contacto"
          style={{
            position: 'absolute', bottom: 16, right: 16, width: 52, height: 52, borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(160deg, color-mix(in srgb, var(--ta-accent) 82%, white 18%), var(--ta-accent) 55%, color-mix(in srgb, var(--ta-accent) 85%, black 15%))',
            color: 'var(--ta-on-accent)', fontSize: 24, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          +
        </button>
      </div>

      {mostrarImportar && (
        <ImportarContactos
          onCerrar={() => setMostrarImportar(false)}
          onImportado={() => {
            setMostrarImportar(false)
            setRecargaKey((v) => v + 1)
          }}
        />
      )}

      {mostrarVaciar && (
        <ModalVaciarContactos
          total={contactos.length}
          vaciando={vaciando}
          error={errorVaciar}
          onCancelar={() => { setMostrarVaciar(false); setErrorVaciar(null) }}
          onConfirmar={vaciarContactos}
        />
      