// src/features/interacciones/InteraccionForm.jsx
// Motivo: Sprint 3 (Interacciones) — formulario único invocable desde
//   cualquier lugar (ContactoForm.jsx, FichaColaboradores.jsx, o el botón
//   global "Registrar nueva interacción"). Sin selector de contexto:
//   Contacto siempre arriba y obligatorio (búsqueda por nombre o
//   teléfono contra contacto_telefonos, con alta rápida si no existe),
//   Propiedad siempre abajo y opcional. Si se invoca con `contactoId` o
//   `propiedadId` ya resueltos, ese campo llega bloqueado (chip); el
//   otro queda libre para buscar/asociar.
//   [Actualización 13 jul 2026 — homologación de accesibilidad en
//   Contactos]: botones "Cerrar"/"Quitar propiedad" suben a 44x44px; las
//   filas de resultado de BuscadorContacto y BuscadorPropiedad eran
//   <div onClick> sin tabIndex/role — inoperables por teclado — ahora
//   son navegables (role="button", tabIndex, Enter/Espacio).
//   [Actualización 13 jul 2026, más tarde]: se detectó que la tabla
//   `interacciones` seguía en 0 filas — el botón "Guardar interacción"
//   se queda deshabilitado en silencio si falta contacto o canal, sin
//   ningún aviso. Se agrega un mensaje visible explicando qué falta.
//   [Actualización 13 jul 2026, feedback de la primera prueba real]:
//   (1) modo edición vía prop `interaccionInicial` — invocado desde el
//   nuevo click-en-fila de ListadoInteracciones.jsx, reutiliza el UPDATE
//   que useInteraccion() ya soportaba; (2) datetime-local reemplazado por
//   dos inputs nativos (date + time) — se veía feo en captura de Okta.
//   [Actualización 13 jul 2026, segunda vuelta]: (1) miniatura de
//   propiedad en BuscadorPropiedad (resultados y chip bloqueado); (2)
//   íconos de calendario/reloj superpuestos en los inputs date/time —
//   sin esto no había señal visual de que fueran controles tocables en
//   algunos navegadores/SO (pregunta directa de Okta al probar).
// Timestamp: 2026-07-13, 22:17 hrs

import { useState, useEffect } from 'react'
import { useInteraccion, INTERACCION_VACIA } from './hooks/useInteraccion'
import { supabase } from '../../lib/supabaseClient'

const CANALES = [
  { value: 'whatsapp', label: 'Whatsapp' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'redes_sociales', label: 'Redes' },
  { value: 'otro', label: 'Otro' },
]

const DIRECCIONES = [
  { value: 'entrante', label: 'Entrante' },
  { value: 'saliente', label: 'Saliente' },
]

const FUENTES = [
  { value: 'letrero', label: 'Letrero' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'Tiktok' },
  { value: 'recomendacion', label: 'Recomendación' },
  { value: 'otro', label: 'Otro' },
]

// Heurística simple para decidir si lo que se tecleó en el buscador de
// contacto es un teléfono o un nombre, al momento de dar de alta rápida.
function pareceTelefono(texto) {
  const digitos = (texto.match(/\d/g) || []).length
  return digitos >= 5
}

// Fecha y hora como dos campos nativos separados (date + time) en vez de
// datetime-local combinado — controles nativos del teléfono más amigables,
// sin construir un picker propio (feedback de Okta, Sesión 11).
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

// Calendario/reloj — señal visual explícita de que el campo es un control
// tocable. Los inputs date/time nativos no siempre traen su propio ícono
// (varía por navegador/SO — feedback de Okta al probar en su captura).
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

// Búsqueda combinada: nombre/rol/empresa en `contactos`, teléfono en
// `contacto_telefonos`. Dos queries en paralelo en vez de un OR anidado
// entre tablas — mismo patrón ya usado en FichaColaboradores.jsx
// (Sesión 16: se homologó aquí para no dejarlo inconsistente).
async function buscarContactos(texto) {
  const like = `%${texto}%`
  const [porCampos, porTelefono] = await Promise.all([
    supabase.from('contactos').select('id, nombre, rol_principal, empresa').or(`nombre.ilike.${like},rol_principal.ilike.${like},empresa.ilike.${like}`).limit(8),
    supabase.from('contacto_telefonos').select('telefono, contactos(id, nombre, rol_principal, empresa)').ilike('telefono', like).limit(8),
  ])

  const mapa = new Map()
  ;(porCampos.data || []).forEach((c) => mapa.set(c.id, { ...c, telefonos: [] }))
  ;(porTelefono.data || []).forEach((row) => {
    const c = row.contactos
    if (!c) return
    if (!mapa.has(c.id)) mapa.set(c.id, { ...c, telefonos: [] })
    mapa.get(c.id).telefonos.push(row.telefono)
  })

  const resultados = Array.from(mapa.values())
  if (resultados.length === 0) return resultados

  // Traer TODOS los teléfonos de los contactos encontrados, para mostrarlos
  // debajo del nombre aunque el match haya sido solo por nombre.
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

async function crearContactoRapido(texto) {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  const esTelefono = pareceTelefono(texto)

  const { data: nuevoContacto, error: errContacto } = await supabase
    .from('contactos')
    .insert({ nombre: esTelefono ? null : texto, user_id: userId })
    .select()
    .single()
  if (errContacto) return { ok: false, error: errContacto }

  if (esTelefono) {
    const { error: errTel } = await supabase
      .from('contacto_telefonos')
      .insert({ contacto_id: nuevoContacto.id, telefono: texto, es_principal: true, user_id: userId })
    if (errTel) return { ok: false, error: errTel }
  }

  return { ok: true, contacto: nuevoContacto }
}

function BuscadorContacto({ contactoBloqueado, onSeleccionar }) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [creando, setCreando] = useState(false)

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
      </div>
    )
  }

  const crearRapido = async () => {
    setCreando(true)
    const res = await crearContactoRapido(texto.trim())
    setCreando(false)
    if (res.ok) {
      onSeleccionar({ id: res.contacto.id, nombre: res.contacto.nombre })
      setTexto('')
      setResultados([])
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
        <div style={{ marginTop: 6, border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden', maxHeight: 260, overflowY: 'auto' }}>
          {buscando ? (
            <p style={{ margin: 0, padding: 10, fontSize: 12, color: 'var(--ta-text-muted)' }}>Buscando...</p>
          ) : resultados.length > 0 ? (
            resultados.map((c, idx) => {
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
            })
          ) : (
            <button
              type="button"
              onClick={crearRapido}
              disabled={creando}
              style={{ width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'none', fontSize: 13, color: 'var(--ta-accent)', cursor: 'pointer' }}
            >
              {creando ? 'Creando...' : `+ Crear contacto rápido con "${texto.trim()}"`}
            </button>
          )}
        </div>
      )}
      <p style={{ fontSize: 11, color: 'var(--ta-text-muted)', margin: '6px 0 0' }}>
        Si el teléfono o nombre no existe, se da de alta aquí mismo y se completa después.
      </p>
    </div>
  )
}

function BuscadorPropiedad({ propiedadBloqueada, onSeleccionar, onQuitar }) {
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
        <button type="button" onClick={onQuitar} aria-label="Quitar propiedad" style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, borderRadius: 8, flexShrink: 0 }}>
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
        <div style={{ marginTop: 6, border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden', maxHeight: 260, overflowY: 'auto' }}>
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

// Props: contactoId/contactoNombre y propiedadId/propiedadTitulo son
// opcionales — cuando se invoca desde un contexto ya resuelto (la ficha
// de un contacto, o Colaboradores de una propiedad), ese campo llega
// bloqueado. El botón global "Registrar nueva interacción" invoca este
// mismo formulario sin ninguno de los dos, y ambos quedan libres.
// `interaccionInicial` (opcional, Sesión 11): modo edición — se invoca
// desde ListadoInteracciones.jsx con la fila completa ya traída del
// query (id, canal, direccion, nota, fecha_hora, contactos{id,nombre},
// propiedades{id,titulo}). useInteraccion() ya sabía hacer UPDATE cuando
// interaccion.id existe — solo faltaba poder arrancar con esos datos.
export default function InteraccionForm({ contactoId, contactoNombre, propiedadId, propiedadTitulo, interaccionInicial, onGuardado, onCerrar }) {
  const editando = Boolean(interaccionInicial)

  const [inicial] = useState(() => {
    if (interaccionInicial) {
      return {
        ...INTERACCION_VACIA,
        id: interaccionInicial.id,
        contacto_id: interaccionInicial.contactos?.id || null,
        propiedad_id: interaccionInicial.propiedades?.id || null,
        canal: interaccionInicial.canal || null,
        direccion: interaccionInicial.direccion || 'entrante',
        nota: interaccionInicial.nota || null,
        fecha_hora: interaccionInicial.fecha_hora || new Date().toISOString(),
      }
    }
    return {
      ...INTERACCION_VACIA,
      contacto_id: contactoId || null,
      propiedad_id: propiedadId || null,
      fecha_hora: new Date().toISOString(),
    }
  })
  const { interaccion, actualizar, guardar, guardando, error } = useInteraccion(inicial)

  const [contactoElegido, setContactoElegido] = useState(() => {
    if (interaccionInicial?.contactos) return { id: interaccionInicial.contactos.id, nombre: interaccionInicial.contactos.nombre }
    return contactoId ? { id: contactoId, nombre: contactoNombre } : null
  })
  const [propiedadElegida, setPropiedadElegida] = useState(() => {
    if (interaccionInicial?.propiedades) return { id: interaccionInicial.propiedades.id, titulo: interaccionInicial.propiedades.titulo }
    return propiedadId ? { id: propiedadId, titulo: propiedadTitulo } : null
  })
  const [fuenteAbierta, setFuenteAbierta] = useState(false)

  const guardarClick = async () => {
    const res = await guardar()
    if (res.ok) onGuardado?.(res.data)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,40,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto', background: 'var(--ta-surface)', borderRadius: 20, padding: 16 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, borderRadius: 8 }}>
            <IconoX />
          </button>
          <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--ta-text)' }}>{editando ? 'Editar interacción' : 'Nueva interacción'}</span>
          <span style={{ width: 44 }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>Contacto *</p>
          <BuscadorContacto
            contactoBloqueado={contactoElegido}
            onSeleccionar={(c) => { setContactoElegido(c); actualizar({ contacto_id: c.id }) }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>Propiedad <span style={{ color: 'var(--ta-text-muted)' }}>(opcional)</span></p>
          <BuscadorPropiedad
            propiedadBloqueada={propiedadElegida}
            onSeleccionar={(p) => { setPropiedadElegida(p); actualizar({ propiedad_id: p.id }) }}
            onQuitar={() => { setPropiedadElegida(null); actualizar({ propiedad_id: null }) }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>Canal</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {CANALES.map((c) => {
              const activo = interaccion.canal === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => actualizar({ canal: c.value })}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 11, cursor: 'pointer',
                    border: activo ? '0.5px solid var(--ta-accent)' : '0.5px solid var(--ta-border)',
                    background: activo ? 'var(--ta-accent)' : 'var(--ta-surface)',
                    color: activo ? 'var(--ta-on-accent)' : 'var(--ta-text)',
                  }}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>Dirección</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {DIRECCIONES.map((d) => {
              const activo = interaccion.direccion === d.value
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => actualizar({ direccion: d.value })}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, cursor: 'pointer',
                    border: activo ? '0.5px solid var(--ta-accent)' : '0.5px solid var(--ta-border)',
                    background: activo ? 'var(--ta-accent)' : 'var(--ta-surface)',
                    color: activo ? 'var(--ta-on-accent)' : 'var(--ta-text)',
                  }}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
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
                value={aFechaInput(interaccion.fecha_hora)}
                onChange={(e) => {
                  const hora = aHoraInput(interaccion.fecha_hora)
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
                value={aHoraInput(interaccion.fecha_hora)}
                onChange={(e) => {
                  const fecha = aFechaInput(interaccion.fecha_hora)
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
          <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>Nota</p>
          <textarea
            rows={2}
            value={interaccion.nota || ''}
            onChange={(e) => actualizar({ nota: e.target.value })}
            placeholder="¿Qué pasó en esta llamada?"
            style={{
              width: '100%', boxSizing: 'border-box', fontSize: 14, padding: '9px 10px',
              borderRadius: 10, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)',
              fontFamily: 'inherit', resize: 'none',
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => setFuenteAbierta((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', padding: 0, fontSize: 13, color: 'var(--ta-text-muted)', marginBottom: 14, cursor: 'pointer' }}
        >
          + Agregar fuente
        </button>
        {fuenteAbierta && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '-6px 0 14px' }}>
            {FUENTES.map((f) => {
              const activo = interaccion.fuente === f.value
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => actualizar({ fuente: activo ? null : f.value })}
                  style={{
                    fontSize: 11, padding: '6px 10px', borderRadius: 20, cursor: 'pointer',
                    border: activo ? '0.5px solid var(--ta-accent)' : '0.5px solid var(--ta-border)',
                    background: activo ? 'var(--ta-accent)' : 'none',
                    color: activo ? 'var(--ta-on-accent)' : 'var(--ta-text)',
                  }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        )}

        {error && <p style={{ color: '#993C1D', fontSize: 13, marginBottom: 10 }}>{error}</p>}

        {!guardando && (!interaccion.contacto_id || !interaccion.canal) && (
          <p style={{ color: 'var(--ta-text-muted)', fontSize: 12, marginBottom: 10 }}>
            {!interaccion.contacto_id ? 'Elige o crea un contacto para poder guardar.' : 'Elige un canal para poder guardar.'}
          </p>
        )}

        <button
          type="button"
          onClick={guardarClick}
          disabled={!interaccion.contacto_id || !interaccion.canal || guardando}
          style={{
            width: '100%', background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', border: 'none',
            borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 500,
            cursor: (!interaccion.contacto_id || !interaccion.canal) ? 'default' : 'pointer',
            opacity: (!interaccion.contacto_id || !interaccion.canal) ? 0.5 : 1,
          }}
        >
          {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Guardar interacción'}
        </button>
      </div>
    </div>
  )
}
