// src/features/citas/CitaForm.jsx
// Motivo: Sprint N (Citas) — formulario único invocable desde cualquier
//   lugar (ContactoForm.jsx, FichaColaboradores.jsx, o el botón global
//   "Agendar visita"), mismo patrón que InteraccionForm.jsx. Diferencia
//   clave frente a Interacciones: aquí Contacto Y Propiedad son AMBOS
//   obligatorios (columnas NOT NULL en `visitas`), y el contacto debe
//   tener nombre — hay un trigger de BD que bloquea el INSERT si no lo
//   tiene ("No se puede agendar una visita: el contacto no tiene nombre
//   registrado."). Por eso el alta rápida de contacto aquí SIEMPRE pide
//   nombre explícito (no se puede dar de alta solo con teléfono, a
//   diferencia de InteraccionForm.jsx) — mismo patrón de dos campos
//   (nombre + teléfono opcional) que crearContactoRapido en
//   FichaColaboradores.jsx.
//
// [Actualización 2026-07-14, 21:40 hrs] Fix reportado por Okta al editar
//   una cita: el contacto quedaba permanentemente bloqueado (sin forma de
//   cambiarlo), a diferencia de Propiedad, que ya tenía su botón "X" desde
//   el inicio. Se agregó el mismo patrón "onQuitar" a
//   BuscadorContactoConNombre — al quitar el contacto vuelve a mostrar el
//   buscador/alta rápida, igual que ya pasaba con Propiedad.
// Timestamp: 2026-07-14, 21:40 hrs

import { useState, useEffect } from 'react'
import { useCita, CITA_VACIA, ESTADOS_CITA } from './hooks/useCita'
import { supabase } from '../../lib/supabaseClient'

const ESTADO_LABEL = {
  programada: 'Programada',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
}

function aFechaInput(fechaIso) {
  const d = fechaIso ? new Date(fechaIso) : new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function aHoraInput(fechaIso) {
  const d = fechaIso ? new Date(fechaIso) : new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function IconoX() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M18 6 6 18" /><path d="M6 6l12 12" />
    </svg>
  )
}

function IconoBuscar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function IconoCalendario() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconoReloj() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
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

// Búsqueda combinada: nombre en `contactos`, teléfono en `contacto_telefonos`
// — mismo patrón (2 queries en paralelo) que InteraccionForm.jsx.
async function buscarContactos(texto) {
  const like = `%${texto}%`
  const [porNombre, porTelefono] = await Promise.all([
    supabase.from('contactos').select('id, nombre, rol_principal').ilike('nombre', like).limit(8),
    supabase.from('contacto_telefonos').select('telefono, contactos(id, nombre, rol_principal)').ilike('telefono', like).limit(8),
  ])

  const mapa = new Map()
  ;(porNombre.data || []).forEach((c) => mapa.set(c.id, { ...c, telefonos: [] }))
  ;(porTelefono.data || []).forEach((row) => {
    const c = row.contactos
    if (!c) return
    if (!mapa.has(c.id)) mapa.set(c.id, { ...c, telefonos: [] })
    mapa.get(c.id).telefonos.push(row.telefono)
  })

  const resultados = Array.from(mapa.values())
  if (resultados.length === 0) return resultados

  const ids = resultados.map((c) => c.id)
  const { data: todosTelefonos } = await supabase
    .from('contacto_telefonos')
    .select('contacto_id, telefono')
    .in('contacto_id', ids)

  const porContacto = new Map()
  ;(todosTelefonos || []).forEach((t) => {
    if (!porContacto.has(t.contacto_id)) porContacto.set(t.contacto_id, [])
    porContacto.get(t.contacto_id).push(t.telefono)
  })
  resultados.forEach((c) => { c.telefonos = porContacto.get(c.id) || [] })

  return resultados
}

// Alta rápida CON nombre obligatorio — a diferencia de InteraccionForm.jsx,
// aquí no se puede dar de alta un contacto solo con teléfono porque el
// trigger de `visitas` bloquea el INSERT si el contacto no tiene nombre.
async function crearContactoConNombre({ nombre, telefono }) {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  const { data: nuevoContacto, error: errContacto } = await supabase
    .from('contactos')
    .insert({ nombre: nombre.trim(), user_id: userId })
    .select()
    .single()
  if (errContacto) return { ok: false, error: errContacto }

  if (telefono?.trim()) {
    const { error: errTel } = await supabase
      .from('contacto_telefonos')
      .insert({ contacto_id: nuevoContacto.id, telefono: telefono.trim(), es_principal: true, user_id: userId })
    if (errTel) return { ok: false, error: errTel }
  }

  return { ok: true, contacto: nuevoContacto }
}

function BuscadorContactoConNombre({ contactoBloqueado, onSeleccionar, onQuitar }) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [creando, setCreando] = useState(false)
  const [altaNombre, setAltaNombre] = useState('')
  const [altaTelefono, setAltaTelefono] = useState('')

  useEffect(() => {
    if (!texto.trim() || texto.trim().length < 2) { setResultados([]); return }
    setBuscando(true)
    const t = setTimeout(async () => {
      const r = await buscarContactos(texto.trim())
      setResultados(r)
      setBuscando(false)
    }, 300)
    return () => clearTimeout(t)
  }, [texto])

  if (contactoBloqueado) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--ta-bg)', borderRadius: 10, padding: '8px 10px' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ta-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: 'var(--ta-on-accent)', flexShrink: 0 }}>
          {(contactoBloqueado.nombre || '?').slice(0, 2).toUpperCase()}
        </div>
        <span style={{ fontSize: 14, color: 'var(--ta-text)', flex: 1 }}>{contactoBloqueado.nombre || 'Sin nombre'}</span>
        {onQuitar && (
          <button type="button" onClick={onQuitar} aria-label="Quitar contacto" title="Quitar contacto" style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, borderRadius: 8, flexShrink: 0 }}>
            <IconoX />
          </button>
        )}
      </div>
    )
  }

  const crearRapido = async () => {
    if (!altaNombre.trim()) return
    setCreando(true)
    const res = await crearContactoConNombre({ nombre: altaNombre, telefono: altaTelefono })
    setCreando(false)
    if (res.ok) {
      onSeleccionar({ id: res.contacto.id, nombre: res.contacto.nombre })
      setTexto('')
      setResultados([])
      setAltaNombre('')
      setAltaTelefono('')
    }
  }

  return (
    <div>
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Nombre o teléfono..."
        style={{
          width: '100%', boxSizing: 'border-box', fontSize: 14, padding: '9px 10px',
          borderRadius: 10, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)',
        }}
      />
      {texto.trim().length >= 2 && (
        <div style={{ marginTop: 6 }}>
          {buscando ? (
            <p style={{ margin: 0, padding: 10, fontSize: 12, color: 'var(--ta-text-muted)', border: '0.5px solid var(--ta-border)', borderRadius: 10 }}>Buscando...</p>
          ) : resultados.length > 0 ? (
            <div style={{ border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden' }}>
              {resultados.map((c, idx) => {
                const elegir = () => { onSeleccionar({ id: c.id, nombre: c.nombre }); setTexto(''); setResultados([]) }
                return (
                  <div
                    key={c.id}
                    onClick={elegir}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir() } }}
                    style={{ padding: '8px 10px', cursor: 'pointer', minHeight: 44, boxSizing: 'border-box', borderTop: idx === 0 ? 'none' : '0.5px solid var(--ta-border)' }}
                  >
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ta-text)' }}>{c.nombre || 'Sin nombre'}</p>
                    {c.telefonos?.length > 0 && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ta-text-muted)' }}>{c.telefonos.join(' · ')}</p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ border: '0.5px solid var(--ta-border)', borderRadius: 10, padding: 10 }}>
              <p style={{ fontSize: 11, color: 'var(--ta-text-muted)', margin: '0 0 8px' }}>
                No se encontró — para agendar una visita el contacto necesita nombre:
              </p>
              <input
                type="text"
                placeholder="Nombre (obligatorio)"
                value={altaNombre || (/^[\d\s+()-]{6,}$/.test(texto.trim()) ? '' : texto)}
                onChange={(e) => setAltaNombre(e.target.value)}
                style={{ width: '100%', height: 36, padding: '0 10px', borderRadius: 8, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)', fontSize: 13, marginBottom: 6, boxSizing: 'border-box' }}
              />
              <input
                type="tel"
                placeholder="Teléfono (opcional)"
                value={altaTelefono || (/^[\d\s+()-]{6,}$/.test(texto.trim()) ? texto : '')}
                onChange={(e) => setAltaTelefono(e.target.value)}
                style={{ width: '100%', height: 36, padding: '0 10px', borderRadius: 8, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={crearRapido}
                disabled={creando || !(altaNombre.trim() || (!/^[\d\s+()-]{6,}$/.test(texto.trim()) && texto.trim()))}
                style={{
                  width: '100%', height: 36, borderRadius: 8, border: 'none',
                  background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', opacity: creando ? 0.7 : 1,
                }}
              >
                {creando ? 'Creando...' : '+ Crear contacto'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BuscadorPropiedadCita({ propiedadBloqueada, onSeleccionar, onQuitar }) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    if (!texto.trim()) { setResultados([]); return }
    setBuscando(true)
    const t = setTimeout(async () => {
      const { data } = await supabase.from('propiedades').select('id, titulo, fotos_propiedad(storage_path, es_portada)').ilike('titulo', `%${texto.trim()}%`).limit(8)
      setResultados(data || [])
      setBuscando(false)
    }, 300)
    return () => clearTimeout(t)
  }, [texto])

  if (propiedadBloqueada) {
    const portada = portadaDe(propiedadBloqueada)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--ta-bg)', borderRadius: 10, padding: '8px 10px' }}>
        {portada && (
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, overflow: 'hidden', background: 'var(--ta-surface)' }}>
            <img src={portada} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <span style={{ fontSize: 14, color: 'var(--ta-text)', flex: 1 }}>{propiedadBloqueada.titulo || 'Sin título'}</span>
        <button type="button" onClick={onQuitar} aria-label="Quitar propiedad" title="Quitar propiedad" style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, borderRadius: 8, flexShrink: 0 }}>
          <IconoX />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '0.5px dashed var(--ta-border)', borderRadius: 10, padding: '9px 10px' }}>
        <IconoBuscar />
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar propiedad..."
          style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14, color: 'var(--ta-text)' }}
        />
      </div>
      {texto.trim() && (
        <div style={{ marginTop: 6, border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden' }}>
          {buscando ? (
            <p style={{ margin: 0, padding: 10, fontSize: 12, color: 'var(--ta-text-muted)' }}>Buscando...</p>
          ) : resultados.length > 0 ? (
            resultados.map((p, idx) => {
              const elegir = () => { onSeleccionar(p); setTexto('') }
              const portada = portadaDe(p)
              return (
                <div
                  key={p.id}
                  onClick={elegir}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir() } }}
                  style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 13, color: 'var(--ta-text)', minHeight: 44, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, borderTop: idx === 0 ? 'none' : '0.5px solid var(--ta-border)' }}
                >
                  {portada && (
                    <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, overflow: 'hidden', background: 'var(--ta-bg)' }}>
                      <img src={portada} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  {p.titulo || 'Sin título'}
                </div>
              )
            })
          ) : (
            <p style={{ margin: 0, padding: 10, fontSize: 12, color: 'var(--ta-text-muted)' }}>Sin resultados.</p>
          )}
        </div>
      )}
    </div>
  )
}

// Props: contactoId/contactoNombre y propiedadId/propiedadTitulo opcionales
// — cuando se invoca desde un contexto ya resuelto (ficha de Contacto, o
// Colaboradores de una Propiedad), ese campo llega bloqueado (pero se
// puede quitar y buscar otro). `citaInicial` (fila completa de `visitas`
// con joins) activa el modo edición. Cuando se edita desde dentro de
// ContactoForm.jsx, el query de esa pantalla no trae el join a
// `contactos` (ya se sabe quién es, es la ficha abierta) — por eso
// contactoId/contactoNombre sirven como respaldo si `citaInicial.contactos`
// no viene poblado.
export default function CitaForm({ contactoId, contactoNombre, propiedadId, propiedadTitulo, citaInicial, onGuardado, onCerrar }) {
  const editando = Boolean(citaInicial)

  const [inicial] = useState(() => {
    if (citaInicial) {
      return {
        ...CITA_VACIA,
        id: citaInicial.id,
        contacto_id: citaInicial.contactos?.id || contactoId || null,
        propiedad_id: citaInicial.propiedades?.id || propiedadId || null,
        estado: citaInicial.estado || 'programada',
        nota: citaInicial.nota || null,
        fecha_hora: citaInicial.fecha_hora || new Date().toISOString(),
      }
    }
    return {
      ...CITA_VACIA,
      contacto_id: contactoId || null,
      propiedad_id: propiedadId || null,
      fecha_hora: new Date().toISOString(),
    }
  })
  const { cita, actualizar, guardar, guardando, error } = useCita(inicial)

  const [contactoElegido, setContactoElegido] = useState(() => {
    if (citaInicial?.contactos) return { id: citaInicial.contactos.id, nombre: citaInicial.contactos.nombre }
    if (contactoId) return { id: contactoId, nombre: contactoNombre }
    return null
  })
  const [propiedadElegida, setPropiedadElegida] = useState(() => {
    if (citaInicial?.propiedades) return { id: citaInicial.propiedades.id, titulo: citaInicial.propiedades.titulo }
    return propiedadId ? { id: propiedadId, titulo: propiedadTitulo } : null
  })

  const guardarClick = async () => {
    const res = await guardar()
    if (res.ok) onGuardado?.(res.data)
  }

  const faltaAlgo = !cita.contacto_id || !cita.propiedad_id

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,40,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto', background: 'var(--ta-surface)', borderRadius: 20, padding: 16 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" title="Cerrar" style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, borderRadius: 8 }}>
            <IconoX />
          </button>
          <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--ta-text)' }}>{editando ? 'Editar cita' : 'Agendar visita'}</span>
          <span style={{ width: 44 }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>Contacto *</p>
          <BuscadorContactoConNombre
            contactoBloqueado={contactoElegido}
            onSeleccionar={(c) => { setContactoElegido(c); actualizar({ contacto_id: c.id }) }}
            onQuitar={() => { setContactoElegido(null); actualizar({ contacto_id: null }) }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>Propiedad *</p>
          <BuscadorPropiedadCita
            propiedadBloqueada={propiedadElegida}
            onSeleccionar={(p) => { setPropiedadElegida(p); actualizar({ propiedad_id: p.id }) }}
            onQuitar={() => { setPropiedadElegida(null); actualizar({ propiedad_id: null }) }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>Fecha y hora</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ta-text-muted)', pointerEvents: 'none', display: 'flex' }}>
                <IconoCalendario />
              </span>
              <input
                type="date"
                value={aFechaInput(cita.fecha_hora)}
                onChange={(e) => {
                  const hora = aHoraInput(cita.fecha_hora)
                  actualizar({ fecha_hora: new Date(`${e.target.value}T${hora}`).toISOString() })
                }}
                style={{
                  width: '100%', boxSizing: 'border-box', fontSize: 14, padding: '9px 10px 9px 32px',
                  borderRadius: 10, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)',
                }}
              />
            </div>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ta-text-muted)', pointerEvents: 'none', display: 'flex' }}>
                <IconoReloj />
              </span>
              <input
                type="time"
                value={aHoraInput(cita.fecha_hora)}
                onChange={(e) => {
                  const fecha = aFechaInput(cita.fecha_hora)
                  actualizar({ fecha_hora: new Date(`${fecha}T${e.target.value}`).toISOString() })
                }}
                style={{
                  width: '100%', boxSizing: 'border-box', fontSize: 14, padding: '9px 10px 9px 32px',
                  borderRadius: 10, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>Estado</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ESTADOS_CITA.map((v) => {
              const activo = cita.estado === v
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => actualizar({ estado: v })}
                  style={{
                    padding: '8px 12px', borderRadius: 10, fontSize: 12, cursor: 'pointer', minHeight: 40,
                    border: activo ? '0.5px solid var(--ta-accent)' : '0.5px solid var(--ta-border)',
                    background: activo ? 'var(--ta-accent)' : 'var(--ta-surface)',
                    color: activo ? 'var(--ta-on-accent)' : 'var(--ta-text)',
                  }}
                >
                  {ESTADO_LABEL[v]}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>Nota</p>
          <textarea
            rows={2}
            value={cita.nota || ''}
            onChange={(e) => actualizar({ nota: e.target.value })}
            placeholder="¿Algo que recordar de esta visita?"
            style={{
              width: '100%', boxSizing: 'border-box', fontSize: 14, padding: '9px 10px',
              borderRadius: 10, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)',
              fontFamily: 'inherit', resize: 'none',
            }}
          />
        </div>

        {error && <p style={{ color: '#993C1D', fontSize: 13, marginBottom: 10 }}>{error}</p>}

        {!guardando && faltaAlgo && (
          <p style={{ color: 'var(--ta-text-muted)', fontSize: 12, marginBottom: 10 }}>
            {!cita.contacto_id ? 'Elige o crea un contacto (con nombre) para poder guardar.' : 'Elige una propiedad para poder guardar.'}
          </p>
        )}

        <button
          type="button"
          onClick={guardarClick}
          disabled={faltaAlgo || guardando}
          style={{
            width: '100%', background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', border: 'none',
            borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 500,
            cursor: faltaAlgo ? 'default' : 'pointer',
            opacity: faltaAlgo ? 0.5 : 1,
          }}
        >
          {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agendar visita'}
        </button>
      </div>
    </div>
  )
}
