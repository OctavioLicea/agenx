// src/features/citas/ListadoCitas.jsx
// Motivo: Sprint N (Citas) — módulo global, mismo patrón visual que
//   ListadoInteracciones.jsx (skeleton de carga, buscador + filtro de
//   chips, estado vacío, FAB de alta, fila con avatar de contacto +
//   miniatura de propiedad, click en fila abre modo edición, click en
//   avatar/nombre abre la ficha del contacto en modal). Diferencias
//   deliberadas frente a Interacciones: (1) orden por default es
//   ascendente por fecha_hora ("Próximas primero") en vez de descendente
//   — Citas es una agenda a futuro, no una bitácora de lo ya pasado; (2)
//   filtro por chips es por `estado` (programada/realizada/cancelada/
//   no_asistio), no por canal; (3) siempre hay propiedad (columna NOT
//   NULL en `visitas`), así que la miniatura de portada no es opcional
//   como en Interacciones.
// Timestamp: 2026-07-14, 22:40 hrs

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import CitaForm from './CitaForm'
import CalendarioCitas from './CalendarioCitas'
import ContactoForm from '../contactos/ContactoForm'

const ESTADO_LABEL = { programada: 'Programada', realizada: 'Realizada', cancelada: 'Cancelada', no_asistio: 'No asistió' }

// bg/text: badge de estado (chip a la derecha de la fila). ribbon: cintilla
// de color en el borde izquierdo de la fila — pedido explícito de Okta
// (Sesión 13, tras ver capturas reales) para que el estado se distinga de
// un vistazo sin tener que leer el badge. Mismo patrón que la etapa
// "Perdido" de Procesos comerciales en ContactoForm.jsx (única otra
// excepción documentada a la regla de "un solo acento funcional").
const coloresEstado = {
  programada: { bg: '#EAF3DE', text: '#27500A', ribbon: '#639922' },
  realizada: { bg: '#DCEAE3', text: '#144D36', ribbon: '#0F6E56' },
  cancelada: { bg: '#FCEBEB', text: '#791F1F', ribbon: '#E24B4A' },
  no_asistio: { bg: '#FAEEDA', text: '#633806', ribbon: '#EF9F27' },
}

function formatearFecha(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function iniciales(nombre) {
  if (!nombre?.trim()) return '?'
  const partes = nombre.trim().split(/\s+/)
  return (partes[0][0] + (partes[1]?.[0] || '')).toUpperCase()
}

function IconoCalendario() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function portadaDe(propiedad) {
  const fotos = propiedad?.fotos_propiedad || []
  const portada = fotos.find((f) => f.es_portada) || fotos[0]
  if (!portada?.storage_path) return null
  const { data } = supabase.storage.from('bucket-propiedad-media').getPublicUrl(portada.storage_path)
  return data?.publicUrl || null
}

export default function ListadoCitas({ refreshKey = 0 }) {
  const [citas, setCitas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [vista, setVista] = useState('lista') // 'lista' | 'calendario'
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas') // 'todas' | programada | realizada | cancelada | no_asistio
  const [orden, setOrden] = useState('proximas') // 'proximas' | 'contacto' | 'propiedad'
  const [mostrarFiltroFecha, setMostrarFiltroFecha] = useState(false)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [citaModal, setCitaModal] = useState(null) // fila completa, modo edición
  const [contactoModal, setContactoModal] = useState(null)
  const [recargaKey, setRecargaKey] = useState(0)

  const cargar = useCallback(() => {
    setCargando(true)
    supabase
      .from('visitas')
      .select('id, estado, nota, fecha_hora, contactos(id, nombre, empresa, correo, rol_principal, nota_sin_propiedad), propiedades(id, titulo, fotos_propiedad(storage_path, es_portada))')
      .order('fecha_hora', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(`No se pudieron cargar las citas: ${fetchError.message}`)
        } else {
          setCitas(data || [])
        }
        setCargando(false)
      })
  }, [])

  useEffect(() => { cargar() }, [cargar, refreshKey, recargaKey])

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return citas.filter((c) => {
      const coincideEstado = filtroEstado === 'todas' || c.estado === filtroEstado
      const coincideTexto =
        !texto ||
        c.contactos?.nombre?.toLowerCase().includes(texto) ||
        c.propiedades?.titulo?.toLowerCase().includes(texto) ||
        c.nota?.toLowerCase().includes(texto)
      const fecha = c.fecha_hora ? new Date(c.fecha_hora) : null
      const coincideFecha =
        (!fechaDesde || (fecha && fecha >= new Date(`${fechaDesde}T00:00:00`))) &&
        (!fechaHasta || (fecha && fecha <= new Date(`${fechaHasta}T23:59:59`)))
      return coincideEstado && coincideTexto && coincideFecha
    })
  }, [citas, busqueda, filtroEstado, fechaDesde, fechaHasta])

  // El query ya viene ordenado por fecha_hora asc — 'proximas' no necesita resort.
  const ordenadas = useMemo(() => {
    if (orden === 'proximas') return filtradas
    const copia = [...filtradas]
    if (orden === 'contacto') {
      copia.sort((a, b) => (a.contactos?.nombre || '').localeCompare(b.contactos?.nombre || ''))
    } else if (orden === 'propiedad') {
      copia.sort((a, b) => (a.propiedades?.titulo || '').localeCompare(b.propiedades?.titulo || ''))
    }
    return copia
  }, [filtradas, orden])

  if (cargando) {
    return (
      <div style={{ background: 'var(--ta-bg)', display: 'flex', justifyContent: 'center', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: 480, height: '100%', background: 'var(--ta-surface)', padding: 16 }}>
          <div style={{ height: 40, borderRadius: 10, background: 'var(--ta-bg)', marginBottom: 10, animation: 'ta-pulso 1.4s ease-in-out infinite' }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 60, height: 28, borderRadius: 8, background: 'var(--ta-bg)', animation: `ta-pulso 1.4s ease-in-out infinite ${i * 0.1}s` }} />
            ))}
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 56, borderRadius: 12, background: 'var(--ta-bg)', marginBottom: 10, animation: `ta-pulso 1.4s ease-in-out infinite ${i * 0.15}s` }} />
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
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {[{ v: 'lista', label: 'Lista' }, { v: 'calendario', label: 'Calendario' }].map((t) => (
              <button
                key={t.v}
                type="button"
                onClick={() => setVista(t.v)}
                style={{
                  flex: 1, height: 36, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  border: vista === t.v ? 'none' : '0.5px solid var(--ta-border)',
                  background: vista === t.v ? 'var(--ta-accent)' : 'var(--ta-surface)',
                  color: vista === t.v ? 'var(--ta-on-accent)' : 'var(--ta-text)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {vista === 'lista' && (
            <>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por contacto, propiedad o nota"
                style={{
                  width: '100%', height: 40, borderRadius: 10, border: '0.5px solid var(--ta-border)',
                  background: 'var(--ta-surface)', color: 'var(--ta-text)',
                  padding: '0 12px', fontSize: 13, boxSizing: 'border-box',
                  fontFamily: 'inherit', outline: 'none', marginBottom: 8,
                }}
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['todas', 'programada', 'realizada', 'cancelada', 'no_asistio'].map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setFiltroEstado(e)}
                    style={{
                      fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                      border: filtroEstado === e ? 'none' : '0.5px solid var(--ta-border)',
                      background: filtroEstado === e ? 'var(--ta-accent)' : 'var(--ta-bg)',
                      color: filtroEstado === e ? 'var(--ta-on-accent)' : 'var(--ta-text-muted)',
                    }}
                  >
                    {e === 'todas' ? 'Todas' : ESTADO_LABEL[e]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {vista === 'calendario' ? (
          <div style={{ padding: '12px 16px 90px' }}>
            <CalendarioCitas citas={citas} onSeleccionar={setCitaModal} />
          </div>
        ) : (
        <div style={{ padding: '12px 16px 90px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--ta-text-muted)' }}>
              {filtradas.length} cita{filtradas.length === 1 ? '' : 's'}
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
              <option value="proximas">Próximas primero</option>
              <option value="contacto">Contacto (A-Z)</option>
              <option value="propiedad">Propiedad (A-Z)</option>
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => setMostrarFiltroFecha((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', padding: 0, fontSize: 11, color: 'var(--ta-text-muted)', cursor: 'pointer' }}
            >
              <IconoCalendario />
              Filtrar por fecha
            </button>
            {mostrarFiltroFecha && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-end' }}>
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
                    style={{ height: 30, border: '0.5px solid var(--ta-detail)', background: 'none', color: 'var(--ta-detail)', borderRadius: 8, fontSize: 11, padding: '0 8px', cursor: 'pointer' }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ordenadas.map((c) => {
              const colores = coloresEstado[c.estado] || coloresEstado.programada
              const portada = portadaDe(c.propiedades)
              const abrirContacto = (e) => {
                e.stopPropagation()
                if (c.contactos) setContactoModal(c.contactos)
              }
              return (
                <div
                  key={c.id}
                  onClick={() => setCitaModal(c)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Editar cita con ${c.contactos?.nombre || 'contacto sin nombre'}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCitaModal(c) }
                  }}
                  style={{ display: 'flex', gap: 10, alignItems: 'flex-start', border: '0.5px solid var(--ta-border)', borderLeft: `3px solid ${colores.ribbon}`, borderRadius: 12, padding: 10, background: 'var(--ta-surface)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, width: 56 }}>
                    <button
                      type="button"
                      onClick={abrirContacto}
                      onKeyDown={(e) => e.stopPropagation()}
                      aria-label={`Abrir ficha de ${c.contactos?.nombre || 'contacto sin nombre'}`}
                      disabled={!c.contactos}
                      style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0, border: 'none',
                        background: 'var(--ta-accent)', color: 'var(--ta-on-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 500, cursor: c.contactos ? 'pointer' : 'default', padding: 0,
                      }}
                    >
                      {iniciales(c.contactos?.nombre)}
                    </button>
                    <span style={{ fontSize: 9, color: 'var(--ta-text-muted)', textAlign: 'center', lineHeight: 1.25 }}>
                      {formatearFecha(c.fecha_hora)}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ta-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.contactos?.nombre || 'Sin nombre'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: colores.text, background: colores.bg, borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>
                        {ESTADO_LABEL[c.estado] || c.estado}
                      </span>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      {c.propiedades?.titulo && (
                        <span style={{ fontSize: 10, background: 'var(--ta-bg)', color: 'var(--ta-text-muted)', borderRadius: 5, padding: '2px 6px' }}>
                          {c.propiedades.titulo}
                        </span>
                      )}
                    </div>
                    {c.nota && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ta-text)' }}>{c.nota}</p>
                    )}
                  </div>

                  {portada && (
                    <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, overflow: 'hidden', background: 'var(--ta-bg)' }}>
                      <img src={portada} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              )
            })}

            {filtradas.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ta-text-muted)', padding: '2rem 0' }}>
                No hay citas que coincidan.
              </p>
            )}
          </div>
        </div>
        )}

        <button
          type="button"
          onClick={() => setMostrarForm(true)}
          aria-label="Agendar visita"
          title="Agendar visita"
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

      {mostrarForm && (
        <CitaForm
          onCerrar={() => setMostrarForm(false)}
          onGuardado={() => {
            setMostrarForm(false)
            setRecargaKey((v) => v + 1)
          }}
        />
      )}

      {citaModal && (
        <CitaForm
          citaInicial={citaModal}
          onCerrar={() => setCitaModal(null)}
          onGuardado={() => {
            setCitaModal(null)
            setRecargaKey((v) => v + 1)
          }}
        />
      )}

      {contactoModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.4)', overflowY: 'auto' }}>
          <ContactoForm
            contactoInicial={contactoModal}
            onGuardado={() => setContactoModal(null)}
          />
        </div>
      )}
    </div>
  )
}
