// src/features/propiedades/ListadoPropiedades.jsx
// Motivo: 6 fixes de feedback de Okta tras la primera prueba real:
//   1-2) El mapa tapaba la barra de búsqueda y el botón de toggle — causa
//        raíz: los panes internos de Leaflet (z-index 200-700) escapaban
//        del contenedor del mapa porque este no tenía su propio z-index,
//        así que competían directo contra la barra (z-index 20). Se
//        arregla dándole zIndex explícito a ambos wrappers de mapa
//        (mapa completo y mini-mapa de modo grid), lo que los encierra en
//        su propio contexto de apilamiento.
//   3+6) Fotos lentas / sin thumbnail en la lista — se cambia de
//        background-image a <img loading="lazy" decoding="async">, que
//        el navegador solo descarga cuando la imagen va a entrar en
//        pantalla. Se agrega el mismo thumbnail a las tarjetas del
//        bottom sheet (antes solo texto).
//   4)   Separación seleccionar / abrir ficha — tocar una tarjeta
//        (grid o lista) solo resalta la propiedad y hace zoom hacia
//        ella en el mapa; abrir la ficha real requiere tocar el botón
//        de flecha explícito en la tarjeta.
//   5)   Confirmado sin cambios de código: Home siempre regresa aquí.
//
//   SCHEMA DE fotos_propiedad CONFIRMADO: columna storage_path (ruta
//   dentro del bucket), URL pública resuelta con
//   supabase.storage.from('bucket-propiedad-media').getPublicUrl(...).
//   FIX DE RAÍZ (retraso de ~4s al volver del listado): ya no depende de
//   montar/desmontar — App.jsx ahora mantiene este componente montado y
//   solo lo oculta con CSS. Acepta refreshKey para forzar un refetch
//   controlado (sin remount) cuando se guarda una propiedad.
//   Loading state cambia de texto plano a skeleton con estructura visual.
//   FIX CRÍTICO: el select antes solo traía un subconjunto de columnas
//   (sin `ficha`, `recamaras`, etc.). Al editar una propiedad así, su
//   ficha técnica real se perdía silenciosamente en el siguiente autosave
//   (se sobreescribía con vacío). Ahora usa `*` para traer la fila
//   completa, más el embed de fotos para la portada.
//   [Actualización 13 jul 2026]: cierra el pendiente de backlog ("¿control
//   explícito de ordenar?"). Selector Recientes/Título (A-Z)/Precio +
//   filtro opcional por fecha de captación (created_at, Desde/Hasta),
//   mismo patrón ya usado en ListadoContactos.jsx y
//   ListadoInteracciones.jsx. Se ordena ANTES de derivar conUbicacion —
//   los pines numerados del mapa y las tarjetas del sheet comparten
//   índice, deben venir de la misma lista ya ordenada.
//   FIX: input de búsqueda tenía texto invisible (blanco sobre fondo
//   blanco). Causa raíz: src/index.css (boilerplate de Vite, sin relación
//   con el sistema de diseño --ta-*) declaraba `color-scheme: light dark`
//   en :root, lo que hace que el navegador aplique su theming nativo
//   oscuro a inputs sin color de texto explícito cuando el SO/navegador
//   está en modo oscuro. Corregido a `color-scheme: light` en index.css
//   (la app no soporta modo oscuro, paleta fija en App.css) y se agrega
//   color: var(--ta-text) explícito a este input como refuerzo.
// Timestamp: 2026-07-13, 22:44 hrs

import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../../lib/supabaseClient'

const CENTRO_DEFAULT = [25.4383, -100.9737] // Saltillo, Coahuila

function IconoGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconoMapa() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 20l-6 3V7l6-3 6 3 6-3v16l-6 3-6-3z" />
      <path d="M9 4v16M15 7v16" />
    </svg>
  )
}

function IconoAbrirFicha() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function IconoCalendario() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function crearIcono(color, numero, seleccionado) {
  const tam = seleccionado ? 34 : 26
  return L.divIcon({
    className: '',
    html: `<div style="width:${tam}px;height:${tam}px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;${seleccionado ? 'box-shadow:0 0 0 3px #F5F1E8;' : ''}"><span style="transform:rotate(45deg);color:#F5F1E8;font-size:${seleccionado ? 13 : 11}px;font-weight:500;">${numero}</span></div>`,
    iconSize: [tam, tam],
    iconAnchor: [tam / 2, tam],
  })
}

function InvalidarTamano({ trigger }) {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 250)
    return () => clearTimeout(t)
  }, [trigger, map])
  return null
}

function CentrarEnSeleccion({ propiedad }) {
  const map = useMap()
  useEffect(() => {
    if (propiedad?.lat != null && propiedad?.lng != null) {
      map.flyTo([propiedad.lat, propiedad.lng], Math.max(map.getZoom(), 14), { duration: 0.6 })
    }
  }, [propiedad, map])
  return null
}

function AjustarVistaAFiltro({ trigger, puntos }) {
  const map = useMap()
  useEffect(() => {
    if (puntos.length === 0) return
    if (puntos.length === 1) {
      map.flyTo(puntos[0], Math.max(map.getZoom(), 13), { duration: 0.6 })
    } else {
      const bounds = L.latLngBounds(puntos)
      map.flyToBounds(bounds, { padding: [40, 40], duration: 0.6 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])
  return null
}

function formatearPrecio(precio, moneda, operacion) {
  if (precio == null) return 'Precio a consultar'
  const monto = new Intl.NumberFormat('es-MX').format(precio)
  const sufijo = operacion === 'renta' ? ' / mes' : ''
  return `$${monto} ${moneda || 'MXN'}${sufijo}`
}

const coloresEstado = {
  captacion: { bg: '#F1EFE8', text: '#5F5E5A' },
  disponible: { bg: '#EAF3DE', text: '#27500A' },
  en_proceso: { bg: '#FAEEDA', text: '#633806' },
  cerrada: { bg: '#FCEBEB', text: '#791F1F' },
}

const etiquetasEstado = {
  captacion: 'Captación',
  disponible: 'Disponible',
  en_proceso: 'En proceso',
  cerrada: 'Cerrada',
}

// Fila compartida entre la vista mapa (sheet) y grid: contador + orden +
// toggle de filtro por fecha. Componente local para no duplicar el JSX
// dos veces (una por vista) — mismo patrón de orden que ya se agregó a
// ListadoInteracciones.jsx y ListadoContactos.jsx.
function BarraOrdenFecha({ cantidad, orden, setOrden, mostrarFiltroFecha, setMostrarFiltroFecha, fechaDesde, setFechaDesde, fechaHasta, setFechaHasta }) {
  return (
    <>
      <div style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--ta-text-muted)' }}>
          {cantidad} propiedad{cantidad === 1 ? '' : 'es'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => setMostrarFiltroFecha((v) => !v)}
            aria-label="Filtrar por fecha de captación"
            style={{
              width: 26, height: 26, border: '0.5px solid var(--ta-border)', borderRadius: 6,
              background: mostrarFiltroFecha ? 'var(--ta-accent)' : 'var(--ta-surface)',
              color: mostrarFiltroFecha ? 'var(--ta-on-accent)' : 'var(--ta-text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <IconoCalendario />
          </button>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            aria-label="Ordenar por"
            style={{ fontSize: 11, border: '0.5px solid var(--ta-border)', borderRadius: 8, background: 'var(--ta-surface)', color: 'var(--ta-text-muted)', padding: '4px 6px' }}
          >
            <option value="reciente">Recientes</option>
            <option value="titulo">Título (A-Z)</option>
            <option value="precio">Precio</option>
          </select>
        </div>
      </div>
      {mostrarFiltroFecha && (
        <div style={{ margin: '0 0 8px', display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 2px', fontSize: 9, color: 'var(--ta-text-muted)' }}>Captada desde</p>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 11, padding: '5px 6px', borderRadius: 6, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 2px', fontSize: 9, color: 'var(--ta-text-muted)' }}>Hasta</p>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 11, padding: '5px 6px', borderRadius: 6, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)' }}
            />
          </div>
          {(fechaDesde || fechaHasta) && (
            <button
              type="button"
              onClick={() => { setFechaDesde(''); setFechaHasta('') }}
              style={{ height: 28, border: '0.5px solid var(--ta-detail)', background: 'none', color: 'var(--ta-detail)', borderRadius: 6, fontSize: 10, padding: '0 8px', cursor: 'pointer' }}
            >
              Limpiar
            </button>
          )}
        </div>
      )}
    </>
  )
}

function Miniatura({ src, tam }) {
  return (
    <div style={{ width: tam, height: tam, borderRadius: 8, flexShrink: 0, background: 'var(--ta-bg)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontSize: 9, color: 'var(--ta-text-muted)' }}>Sin foto</span>
      )}
    </div>
  )
}

export default function ListadoPropiedades({ onSeleccionar, onNueva, refreshKey = 0 }) {
  const [propiedades, setPropiedades] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [filtroOperacion, setFiltroOperacion] = useState('todas') // 'todas' | 'venta' | 'renta'
  const [vista, setVista] = useState('mapa') // 'mapa' | 'grid'
  const [seleccionadaId, setSeleccionadaId] = useState(null)
  const [sheetExpandido, setSheetExpandido] = useState(false)
  const [orden, setOrden] = useState('reciente') // 'reciente' | 'titulo' | 'precio'
  const [mostrarFiltroFecha, setMostrarFiltroFecha] = useState(false)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  useEffect(() => {
    setCargando(true)
    supabase
      .from('propiedades')
      .select(
        '*, fotos_propiedad(storage_path, es_portada)'
      )
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          console.error('Error al cargar propiedades:', fetchError)
          setError(`No se pudieron cargar las propiedades: ${fetchError.message}`)
        } else {
          setPropiedades(data || [])
        }
        setCargando(false)
      })
  }, [refreshKey])

  // Filtro por fecha de captación (created_at) — rango Desde/Hasta opcional,
  // pedido de Okta junto con el mismo control en Contactos e Interacciones.
  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return propiedades.filter((p) => {
      const coincideTexto =
        !texto ||
        p.titulo?.toLowerCase().includes(texto) ||
        p.direccion?.toLowerCase().includes(texto)
      const coincideOperacion = filtroOperacion === 'todas' || p.operacion === filtroOperacion
      const fechaCreada = p.created_at ? new Date(p.created_at) : null
      const coincideFecha =
        (!fechaDesde || (fechaCreada && fechaCreada >= new Date(`${fechaDesde}T00:00:00`))) &&
        (!fechaHasta || (fechaCreada && fechaCreada <= new Date(`${fechaHasta}T23:59:59`)))
      return coincideTexto && coincideOperacion && coincideFecha
    })
  }, [propiedades, busqueda, filtroOperacion, fechaDesde, fechaHasta])

  // 'reciente' ya viene ordenado desc desde el query, no hace falta resort.
  // Ordenar ANTES de derivar conUbicacion/seleccionada — los pines del mapa
  // y las tarjetas numeradas del sheet comparten el mismo índice, así que
  // deben venir de la misma lista ya ordenada.
  const ordenadas = useMemo(() => {
    if (orden === 'reciente') return filtradas
    const copia = [...filtradas]
    if (orden === 'titulo') {
      copia.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''))
    } else if (orden === 'precio') {
      copia.sort((a, b) => (a.precio ?? Infinity) - (b.precio ?? Infinity))
    }
    return copia
  }, [filtradas, orden])

  const conUbicacion = ordenadas.filter((p) => p.lat != null && p.lng != null)
  const puntosFiltro = useMemo(() => conUbicacion.map((p) => [p.lat, p.lng]), [conUbicacion])
  const triggerFiltro = `${busqueda}|${filtroOperacion}|${orden}|${fechaDesde}|${fechaHasta}`
  const seleccionada = ordenadas.find((p) => p.id === seleccionadaId) || null

  const portadaDe = (p) => {
    const fotos = p.fotos_propiedad || []
    const portada = fotos.find((f) => f.es_portada) || fotos[0]
    if (!portada?.storage_path) return null
    const { data } = supabase.storage.from('bucket-propiedad-media').getPublicUrl(portada.storage_path)
    return data?.publicUrl || null
  }

  // Tocar una tarjeta o un pin SOLO selecciona y centra el mapa — abrir la
  // ficha real requiere el botón explícito (IconoAbrirFicha).
  const seleccionar = (id) => {
    setSeleccionadaId(id)
    setVista('mapa')
  }

  if (cargando) {
    return (
      <div style={{ background: 'var(--ta-bg)', display: 'flex', justifyContent: 'center', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: 480, height: '100%', background: 'var(--ta-surface)', padding: 16 }}>
          <div style={{ height: 40, borderRadius: 10, background: 'var(--ta-bg)', marginBottom: 10, animation: 'ta-pulso 1.4s ease-in-out infinite' }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            <div style={{ width: 60, height: 28, borderRadius: 8, background: 'var(--ta-bg)', animation: 'ta-pulso 1.4s ease-in-out infinite' }} />
            <div style={{ width: 60, height: 28, borderRadius: 8, background: 'var(--ta-bg)', animation: 'ta-pulso 1.4s ease-in-out infinite 0.1s' }} />
            <div style={{ width: 60, height: 28, borderRadius: 8, background: 'var(--ta-bg)', animation: 'ta-pulso 1.4s ease-in-out infinite 0.2s' }} />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--ta-bg)', flexShrink: 0, animation: `ta-pulso 1.4s ease-in-out infinite ${i * 0.15}s` }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, width: '70%', borderRadius: 4, background: 'var(--ta-bg)', marginBottom: 8, animation: `ta-pulso 1.4s ease-in-out infinite ${i * 0.15}s` }} />
                <div style={{ height: 12, width: '40%', borderRadius: 4, background: 'var(--ta-bg)', animation: `ta-pulso 1.4s ease-in-out infinite ${i * 0.15}s` }} />
              </div>
            </div>
          ))}
          <style>{`
            @keyframes ta-pulso { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          `}</style>
        </div>
      </div>
    )
  }

  if (error) {
    return <p style={{ textAlign: 'center', marginTop: '3rem', color: '#993C1D' }}>{error}</p>
  }

  const filtrosBar = (
    <>
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 30, display: 'flex', gap: 8 }}>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por título o dirección"
          style={{
            flex: 1, height: 40, borderRadius: 10, border: '0.5px solid var(--ta-border)',
            background: '#FFFFFF', color: 'var(--ta-text)', padding: '0 12px', fontSize: 13, boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onClick={() => setVista((v) => (v === 'mapa' ? 'grid' : 'mapa'))}
          aria-label={vista === 'mapa' ? 'Ver como grid' : 'Ver mapa'}
          style={{
            width: 40, height: 40, borderRadius: 10, border: 'none', flexShrink: 0,
            background: 'var(--ta-accent)', color: 'var(--ta-on-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          {vista === 'mapa' ? <IconoGrid /> : <IconoMapa />}
        </button>
      </div>

      <div style={{ position: 'absolute', top: 60, left: 12, right: 12, zIndex: 30, display: 'flex', gap: 6, alignItems: 'center' }}>
        {['todas', 'venta', 'renta'].map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => setFiltroOperacion(op)}
            style={{
              fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
              border: filtroOperacion === op ? 'none' : '0.5px solid var(--ta-border)',
              background: filtroOperacion === op ? 'var(--ta-accent)' : 'var(--ta-bg)',
              color: filtroOperacion === op ? 'var(--ta-on-accent)' : 'var(--ta-text-muted)',
            }}
          >
            {op === 'todas' ? 'Todas' : op === 'venta' ? 'Venta' : 'Renta'}
          </button>
        ))}
        {(busqueda.trim() !== '' || filtroOperacion !== 'todas') && (
          <button
            type="button"
            onClick={() => { setBusqueda(''); setFiltroOperacion('todas') }}
            style={{
              fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
              border: '0.5px solid var(--ta-detail)', background: '#FFFFFF', color: 'var(--ta-detail)',
              marginLeft: 'auto',
            }}
          >
            Limpiar
          </button>
        )}
      </div>
    </>
  )

  return (
    <div style={{ background: 'var(--ta-bg)', display: 'flex', justifyContent: 'center', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, height: '100%', overflow: 'hidden', background: 'var(--ta-surface)' }}>
        {filtrosBar}

        {vista === 'mapa' ? (
          <>
            {/* zIndex explícito: encierra los panes internos de Leaflet
                (z-index 200-700) en su propio contexto de apilamiento,
                para que no compitan contra filtrosBar (z-index 30). */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
              <MapContainer center={CENTRO_DEFAULT} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <InvalidarTamano trigger={vista} />
                <AjustarVistaAFiltro trigger={triggerFiltro} puntos={puntosFiltro} />
                <CentrarEnSeleccion propiedad={seleccionada} />
                {conUbicacion.map((p, idx) => (
                  <Marker
                    key={p.id}
                    position={[p.lat, p.lng]}
                    icon={crearIcono(p.id === seleccionadaId ? '#BC7130' : '#1F3A2C', idx + 1, p.id === seleccionadaId)}
                    eventHandlers={{ click: () => seleccionar(p.id) }}
                  />
                ))}
              </MapContainer>
            </div>

            <div
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
                background: '#FFFFFF', borderRadius: '16px 16px 0 0',
                boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
                height: sheetExpandido ? '80%' : 230,
                display: 'flex', flexDirection: 'column',
                transition: 'height 200ms ease',
              }}
            >
              <button
                type="button"
                onClick={() => setSheetExpandido((v) => !v)}
                aria-label={sheetExpandido ? 'Contraer lista' : 'Expandir lista'}
                style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px', border: 'none', background: 'none', cursor: 'pointer' }}
              >
                <span style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--ta-border)' }} />
              </button>
              <div style={{ margin: '0 16px' }}>
                <BarraOrdenFecha
                  cantidad={ordenadas.length}
                  orden={orden} setOrden={setOrden}
                  mostrarFiltroFecha={mostrarFiltroFecha} setMostrarFiltroFecha={setMostrarFiltroFecha}
                  fechaDesde={fechaDesde} setFechaDesde={setFechaDesde}
                  fechaHasta={fechaHasta} setFechaHasta={setFechaHasta}
                />
              </div>
              <div style={{ overflowY: 'auto', padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ordenadas.map((p, idx) => {
                  const esSeleccionada = p.id === seleccionadaId
                  return (
                    <div
                      key={p.id}
                      onClick={() => seleccionar(p.id)}
                      style={{
                        display: 'flex', gap: 10, alignItems: 'center', borderRadius: 12, padding: 8, cursor: 'pointer',
                        border: esSeleccionada ? '2px solid #BC7130' : '0.5px solid var(--ta-border)',
                        background: esSeleccionada ? '#FAEEDA' : '#FFFFFF',
                      }}
                    >
                      <Miniatura src={portadaDe(p)} tam={44} />
                      {p.lat != null && (
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          background: esSeleccionada ? '#BC7130' : 'var(--ta-accent)',
                          color: 'var(--ta-on-accent)', fontSize: 10, fontWeight: 500,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {idx + 1}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--ta-text)' }}>{p.titulo || 'Sin título'}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 500, color: 'var(--ta-accent)' }}>
                          {formatearPrecio(p.precio, p.moneda, p.operacion)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onSeleccionar?.(p) }}
                        aria-label="Ver ficha completa"
                        style={{
                          width: 32, height: 32, flexShrink: 0, border: 'none', borderRadius: 8,
                          background: esSeleccionada ? '#BC7130' : 'var(--ta-bg)',
                          color: esSeleccionada ? '#FFFFFF' : 'var(--ta-text-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}
                      >
                        <IconoAbrirFicha />
                      </button>
                    </div>
                  )
                })}
                {filtradas.length === 0 && (
                  <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ta-text-muted)', padding: '1rem 0' }}>
                    No hay propiedades que coincidan.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', height: 110, flexShrink: 0, zIndex: 1 }}>
              <MapContainer
                center={CENTRO_DEFAULT}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
              >
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <InvalidarTamano trigger={vista} />
                {conUbicacion.map((p, idx) => (
                  <Marker
                    key={p.id}
                    position={[p.lat, p.lng]}
                    icon={crearIcono('#1F3A2C', idx + 1, false)}
                    eventHandlers={{ click: () => seleccionar(p.id) }}
                  />
                ))}
              </MapContainer>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px 90px' }}>
              <BarraOrdenFecha
                cantidad={ordenadas.length}
                orden={orden} setOrden={setOrden}
                mostrarFiltroFecha={mostrarFiltroFecha} setMostrarFiltroFecha={setMostrarFiltroFecha}
                fechaDesde={fechaDesde} setFechaDesde={setFechaDesde}
                fechaHasta={fechaHasta} setFechaHasta={setFechaHasta}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
                {ordenadas.map((p) => {
                  const portada = portadaDe(p)
                  const colores = coloresEstado[p.estado] || coloresEstado.captacion
                  return (
                    <div
                      key={p.id}
                      onClick={() => seleccionar(p.id)}
                      style={{ background: '#FFFFFF', border: '0.5px solid var(--ta-border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                    >
                      <div style={{ height: 90, background: 'var(--ta-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {portada ? (
                          <img
                            src={portada}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--ta-text-muted)' }}>Sin foto</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onSeleccionar?.(p) }}
                        aria-label="Ver ficha completa"
                        style={{
                          position: 'absolute', top: 6, right: 6, width: 26, height: 26,
                          border: 'none', borderRadius: 7, background: 'rgba(255,255,255,0.9)',
                          color: 'var(--ta-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}
                      >
                        <IconoAbrirFicha />
                      </button>
                      <div style={{ padding: 8 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: 'var(--ta-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.titulo || 'Sin título'}
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 500, color: 'var(--ta-accent)' }}>
                          {formatearPrecio(p.precio, p.moneda, p.operacion)}
                        </p>
                        <span style={{ display: 'inline-block', marginTop: 5, fontSize: 8, background: colores.bg, color: colores.text, borderRadius: 5, padding: '2px 5px' }}>
                          {etiquetasEstado[p.estado] || p.estado}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {filtradas.length === 0 && (
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ta-text-muted)', padding: '1rem 0' }}>
                  No hay propiedades que coincidan.
                </p>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onNueva}
          aria-label="Nueva propiedad"
          style={{
            position: 'absolute',
            bottom: vista === 'mapa' 