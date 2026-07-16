// src/features/propiedades/tabs/FichaColaboradores.jsx
// Motivo: Sprint 3 (Interacciones) — parche urgente post-migración de
//   teléfonos (Sesión 10). Este archivo seguía leyendo/escribiendo
//   `contactos.telefono` directamente (columna eliminada, movida a
//   `contacto_telefonos`), quedando desincronizado de ContactoForm.jsx/
//   InteraccionForm.jsx/ListadoContactos.jsx ya migrados: colaboradores
//   creados aquí no aparecían en el resto de la app, y contactos creados
//   en el resto de la app aparecían sin teléfono aquí. Se ajustan
//   `buscarContactos` (join a contacto_telefonos, mismo patrón de 2
//   queries en paralelo que InteraccionForm.jsx), `crearContactoRapido`
//   (inserta el teléfono en contacto_telefonos, no en contactos) y
//   `cargarColaboradores` (trae contacto_telefonos embebido, se deriva
//   el teléfono principal en JS). El resto del archivo no se tocó.
//   [Actualización 2026-07-13] Se conecta el punto de entrada de
//   Interacciones pendiente desde Sesión 10: botón "+ Registrar
//   interacción" abre InteraccionForm.jsx con la propiedad ya bloqueada
//   (nuevo prop `propiedadTitulo`, pasado desde PropiedadForm.jsx).
// Timestamp: 2026-07-13, 21:41 hrs

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import ContactoForm from '../../contactos/ContactoForm'
import InteraccionForm from '../../interacciones/InteraccionForm'
import CitaForm from '../../citas/CitaForm'

const ROLES = [
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'comprador_interesado', label: 'Comprador interesado' },
  { value: 'arrendador', label: 'Arrendador' },
  { value: 'arrendatario', label: 'Arrendatario' },
  { value: 'asesor_colaborador', label: 'Asesor colaborador' },
  { value: 'notario', label: 'Notario' },
  { value: 'ejecutivo_bancario', label: 'Ejecutivo bancario' },
  { value: 'agencia_investigacion', label: 'Agencia investigación' },
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'otro', label: 'Otro' },
]

function iniciales(nombre) {
  if (!nombre) return '?'
  const partes = nombre.trim().split(/\s+/)
  return (partes[0][0] + (partes[1]?.[0] || '')).toUpperCase()
}

// Teléfono principal de un contacto ya cargado con su arreglo
// contacto_telefonos embebido — el marcado es_principal, o el primero
// si ninguno está marcado.
function telefonoPrincipalDe(contacto) {
  const tels = contacto?.contacto_telefonos || []
  return tels.find((t) => t.es_principal)?.telefono || tels[0]?.telefono || null
}

// Heurística simple: ¿el texto de búsqueda parece un teléfono? (solo
// dígitos/espacios/+/paréntesis/guiones, al menos 6 caracteres). Evita
// prellenar el campo "Teléfono" del alta rápida con un rol o nombre.
function pareceTelefono(texto) {
  return /^[\d\s+()-]{6,}$/.test(texto.trim())
}

function IconoQuitar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

function IconoCorreo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  )
}

// Buscador global: nombre/rol_principal/empresa/correo en `contactos`,
// teléfono en `contacto_telefonos` — 2 queries en paralelo en vez de un
// OR anidado entre tablas (mismo criterio que InteraccionForm.jsx).
async function buscarContactos(texto) {
  if (!texto.trim()) return []
  const like = `%${texto}%`

  const [porCampos, porTelefono] = await Promise.all([
    supabase
      .from('contactos')
      .select('id, nombre, rol_principal, empresa, correo')
      .or(`nombre.ilike.${like},rol_principal.ilike.${like},empresa.ilike.${like},correo.ilike.${like}`)
      .limit(8),
    supabase
      .from('contacto_telefonos')
      .select('telefono, contactos(id, nombre, rol_principal, empresa, correo)')
      .ilike('telefono', like)
      .limit(8),
  ])

  if (porCampos.error) console.error('Error buscando contactos:', porCampos.error.message)
  if (porTelefono.error) console.error('Error buscando por teléfono:', porTelefono.error.message)

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

  // Traer TODOS los teléfonos de los contactos encontrados, para
  // mostrarlos aunque el match haya sido solo por nombre/rol/etc.
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

async function crearContactoRapido({ nombre, telefono }) {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user.id

  const { data: contacto, error } = await supabase
    .from('contactos')
    .insert({ nombre: nombre || null, user_id: userId })
    .select()
    .single()
  if (error) throw error

  if (telefono?.trim()) {
    const { error: errorTel } = await supabase
      .from('contacto_telefonos')
      .insert({ contacto_id: contacto.id, telefono: telefono.trim(), es_principal: true, user_id: userId })
    if (errorTel) throw errorTel
  }

  return contacto
}

export default function FichaColaboradores({ propiedadId, propiedadTitulo }) {
  const [colaboradores, setColaboradores] = useState([])
  const [cargando, setCargando] = useState(true)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [contactoSeleccionado, setContactoSeleccionado] = useState(null)
  const [rol, setRol] = useState('vendedor')
  const [rolOtro, setRolOtro] = useState('')
  const [comision, setComision] = useState('')
  const [notas, setNotas] = useState('')

  const [contactoRapidoNombre, setContactoRapidoNombre] = useState('')
  const [contactoRapidoTelefono, setContactoRapidoTelefono] = useState('')

  // Contacto abierto en el modal de ficha (null = modal cerrado). Guarda el
  // objeto contacto completo (no solo el id) para que ContactoForm arranque
  // con los datos ya cargados sin esperar un fetch adicional.
  const [contactoModal, setContactoModal] = useState(null)

  // Modal de alta de interacción con la propiedad ya bloqueada — mismo
  // InteraccionForm.jsx reutilizado de Contactos, sin duplicar lógica.
  // Pendiente arrastrado desde Sesión 10 ("conectar punto de entrada
  // desde FichaColaboradores.jsx").
  const [mostrarFormInteraccion, setMostrarFormInteraccion] = useState(false)

  // Modal de alta de cita con la propiedad ya bloqueada — mismo CitaForm.jsx
  // reutilizado de Contactos, sin duplicar lógica (Sprint N, Sesión 13).
  const [mostrarFormCita, setMostrarFormCita] = useState(false)

  const cargarColaboradores = useCallback(async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('propiedad_colaboradores')
      .select('id, rol, rol_otro, porcentaje_comision, activo, contactos(id, nombre, correo, empresa, rol_principal, nota_sin_propiedad, contacto_telefonos(telefono, es_principal))')
      .eq('propiedad_id', propiedadId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error cargando colaboradores:', error.message)
    } else {
      setColaboradores(data)
    }
    setCargando(false)
  }, [propiedadId])

  useEffect(() => {
    if (propiedadId) cargarColaboradores()
  }, [propiedadId, cargarColaboradores])

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (busqueda.trim()) {
        setResultados(await buscarContactos(busqueda))
      } else {
        setResultados([])
      }
    }, 250) // debounce simple
    return () => clearTimeout(timeout)
  }, [busqueda])

  const resetForm = () => {
    setMostrarForm(false)
    setBusqueda('')
    setResultados([])
    setContactoSeleccionado(null)
    setRol('vendedor')
    setRolOtro('')
    setComision('')
    setNotas('')
    setContactoRapidoNombre('')
    setContactoRapidoTelefono('')
  }

  const guardarColaborador = async () => {
    let contacto = contactoSeleccionado

    // Si no seleccionó ninguno de la búsqueda pero escribió datos de alta rápida
    if (!contacto && contactoRapidoTelefono.trim()) {
      contacto = await crearContactoRapido({
        nombre: contactoRapidoNombre,
        telefono: contactoRapidoTelefono,
      })
    }

    if (!contacto) return // nada que guardar sin contacto

    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase.from('propiedad_colaboradores').insert({
      propiedad_id: propiedadId,
      contacto_id: contacto.id,
      rol,
      rol_otro: rol === 'otro' ? rolOtro : null,
      porcentaje_comision: comision === '' ? null : Number(comision),
      notas: notas || null,
      user_id: userData.user.id,
    })

    if (error) {
      console.error('Error guardando colaborador:', error.message)
      return
    }

    resetForm()
    cargarColaboradores()
  }

  // Quitar colaborador: borra el registro de propiedad_colaboradores
  // (nunca el contacto). confirm() nativo, mismo patrón que
  // desasociarPropiedad en ContactoForm.jsx.
  const quitarColaborador = async (c) => {
    const nombre = c.contactos?.nombre || telefonoPrincipalDe(c.contactos) || 'este colaborador'
    const rolInfo = ROLES.find((r) => r.value === c.rol)
    const rolLabel = c.rol === 'otro' ? c.rol_otro : rolInfo?.label
    const ok = window.confirm(`¿Quitar a ${nombre} como ${rolLabel || 'colaborador'} de esta propiedad?`)
    if (!ok) return
    const { error } = await supabase.from('propiedad_colaboradores').delete().eq('id', c.id)
    if (error) {
      console.error('Error al quitar colaborador:', error.message)
      return
    }
    setColaboradores((prev) => prev.filter((x) => x.id !== c.id))
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 10px' }}>Colaboradores</p>

      {cargando ? (
        <p style={{ fontSize: 13, color: 'var(--ta-text-muted)' }}>Cargando...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem' }}>
          {colaboradores.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--ta-text-muted)' }}>Sin colaboradores todavía.</p>
          )}

          {colaboradores.map((c) => {
            const rolInfo = ROLES.find((r) => r.value === c.rol)
            const telefono = telefonoPrincipalDe(c.contactos)
            return (
              <div
                key={c.id}
                onClick={() => setContactoModal(c.contactos)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setContactoModal(c.contactos) }}
                style={{
                  background: 'var(--ta-surface)',
                  border: '0.5px solid var(--ta-border)',
                  borderRadius: 12,
                  padding: '0.75rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--ta-accent)',
                    color: 'var(--ta-on-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  {iniciales(c.contactos?.nombre)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--ta-text)' }}>
                    {c.contactos?.nombre || telefono || 'Sin nombre'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ta-text-muted)' }}>
                    {c.rol === 'otro' ? c.rol_otro : rolInfo?.label}
                    {c.porcentaje_comision ? ` · ${c.porcentaje_comision}%` : ' · sin comisión'}
                  </p>
                </div>
                {c.contactos?.correo && (
                  <a
                    href={`mailto:${c.contactos.correo}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Enviar correo a ${c.contactos?.nombre || 'este colaborador'}`}
                    title={`Enviar correo a ${c.contactos?.nombre || 'este colaborador'}`}
                    style={{ width: 44, height: 44, flexShrink: 0, border: 'none', borderRadius: 8, background: 'var(--ta-bg)', color: 'var(--ta-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                  >
                    <IconoCorreo />
                  </a>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); quitarColaborador(c) }}
                  aria-label={`Quitar a ${c.contactos?.nombre || telefono || 'este colaborador'}`}
                  title={`Quitar a ${c.contactos?.nombre || telefono || 'este colaborador'}`}
                  style={{ width: 44, height: 44, flexShrink: 0, border: 'none', borderRadius: 8, background: 'var(--ta-bg)', color: 'var(--ta-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <IconoQuitar />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {!mostrarForm ? (
        <button
          type="button"
          onClick={() => setMostrarForm(true)}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 10,
            border: 'none',
            background: 'var(--ta-accent)',
            color: 'var(--ta-on-accent)',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          + Agregar colaborador
        </button>
      ) : null}

      {!mostrarForm && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => setMostrarFormInteraccion(true)}
            style={{
              flex: 1, height: 40, borderRadius: 10,
              border: '0.5px dashed var(--ta-detail)', background: 'none',
              color: 'var(--ta-text-muted)', fontSize: 13, cursor: 'pointer',
            }}
          >
            + Registrar interacción
          </button>
          <button
            type="button"
            onClick={() => setMostrarFormCita(true)}
            style={{
              flex: 1, height: 40, borderRadius: 10,
              border: '0.5px dashed var(--ta-detail)', background: 'none',
              color: 'var(--ta-text-muted)', fontSize: 13, cursor: 'pointer',
            }}
          >
            + Agendar visita
          </button>
        </div>
      )}

      {mostrarForm && (
        <div
          style={{
            background: 'var(--ta-surface)',
            border: '0.5px solid var(--ta-border)',
            borderRadius: 12,
            padding: '0.9rem',
          }}
        >
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 500, color: 'var(--ta-text-muted)' }}>
            NUEVO COLABORADOR
          </p>

          {!contactoSeleccionado && (
            <>
              <input
                type="text"
                placeholder="Buscar contacto (nombre, teléfono, rol, empresa o correo)..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: '0.5px solid var(--ta-border)',
                  background: 'var(--ta-surface)',
                  color: 'var(--ta-text)',
                  fontSize: 13,
                  marginBottom: 8,
                }}
              />

              {resultados.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {resultados.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setContactoSeleccionado(r)}
                      style={{
                        display: 'block',
                        width: '100%',
                        minHeight: 44,
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '0.5px solid var(--ta-border)',
                        background: 'var(--ta-surface)',
                        color: 'var(--ta-text)',
                        fontSize: 13,
                        marginBottom: 4,
                        boxSizing: 'border-box',
                      }}
                    >
                      {r.nombre || '(sin nombre)'} · {r.telefonos?.[0] || 'sin teléfono'}
                      {r.rol_principal && ` · ${r.rol_principal}`}
                    </button>
                  ))}
                </div>
              )}

              {busqueda.trim() && resultados.length === 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>
                    No se encontró — crear contacto rápido:
                  </p>
                  <input
                    type="text"
                    placeholder="Nombre (opcional)"
                    value={contactoRapidoNombre}
                    onChange={(e) => setContactoRapidoNombre(e.target.value)}
                    style={{
                      width: '100%',
                      height: 34,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '0.5px solid var(--ta-border)',
                      background: 'var(--ta-surface)',
                      fontSize: 13,
                      marginBottom: 6,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Teléfono"
                    value={contactoRapidoTelefono || (pareceTelefono(busqueda) ? busqueda : '')}
                    onChange={(e) => setContactoRapidoTelefono(e.target.value)}
                    style={{
                      width: '100%',
                      height: 34,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '0.5px solid var(--ta-border)',
                      background: 'var(--ta-surface)',
                      fontSize: 13,
                    }}
                  />
                </div>
              )}
            </>
          )}

          {contactoSeleccionado && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
                fontSize: 13,
              }}
            >
              <span>
                {contactoSeleccionado.nombre || contactoSeleccionado.telefonos?.[0] || 'Sin nombre'}
                {contactoSeleccionado.rol_principal && ` · ${contactoSeleccionado.rol_principal}`}
              </span>
              <button
                type="button"
                onClick={() => setContactoSeleccionado(null)}
                style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', fontSize: 12 }}
              >
                cambiar
              </button>
            </div>
          )}

          <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--ta-text-muted)' }}>Rol</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRol(r.value)}
                style={{
                  fontSize: 12,
                  minHeight: 40,
                  padding: '6px 10px',
                  borderRadius: 20,
                  border: rol === r.value ? 'none' : '0.5px solid var(--ta-border)',
                  background: rol === r.value ? 'var(--ta-accent)' : 'var(--ta-surface)',
                  color: rol === r.value ? 'var(--ta-on-accent)' : 'var(--ta-text)',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {rol === 'otro' && (
            <input
              type="text"
              placeholder="Especifica el rol..."
              value={rolOtro}
              onChange={(e) => setRolOtro(e.target.value)}
              style={{
                width: '100%',
                height: 34,
                padding: '0 10px',
                borderRadius: 8,
                border: '0.5px solid var(--ta-border)',
                background: 'var(--ta-surface)',
                fontSize: 13,
                marginBottom: 10,
              }}
            />
          )}

          <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--ta-text-muted)' }}>% Comisión (opcional)</p>
          <input
            type="number"
            step="0.1"
            placeholder="0.0"
            value={comision}
            onChange={(e) => setComision(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              padding: '0 10px',
              borderRadius: 8,
              border: '0.5px solid var(--ta-border)',
              background: 'var(--ta-surface)',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 13,
              marginBottom: 10,
            }}
          />

          <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--ta-text-muted)' }}>Notas (opcional)</p>
          <textarea
            rows={2}
            placeholder="Notas sobre este colaborador..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '0.5px solid var(--ta-border)',
              background: 'var(--ta-surface)',
              fontSize: 13,
              resize: 'none',
              marginBottom: 12,
            }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={resetForm}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 8,
                border: '0.5px solid var(--ta-border)',
                background: 'var(--ta-surface)',
                color: 'var(--ta-text)',
                fontSize: 13,
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardarColaborador}
              style={{
                flex: 2,
                height: 40,
                borderRadius: 8,
                border: 'none',
                background: 'var(--ta-accent)',
                color: 'var(--ta-on-accent)',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Guardar colaborador
            </button>
          </div>
        </div>
      )}

      {/* Modal de ficha de contacto — el wizard de Propiedades sigue montado
          detrás (decisión de Okta, sin navegar fuera). z-index por encima de
          los controles internos de Leaflet (hasta 1200) usados en Fotos y
          ubicación. Se cierra con el botón × que ya trae ContactoForm.jsx en
          su header (onGuardado también fuerza un guardado final). */}
      {contactoModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.4)', overflowY: 'auto',
          }}
        >
          <ContactoForm
            contactoInicial={contactoModal}
            onGuardado={() => {
              setContactoModal(null)
              cargarColaboradores() // por si el nombre/rol del contacto cambiaron dentro del modal
            }}
          />
        </div>
      )}

      {/* Modal de alta de interacción — propiedad ya bloqueada (chip), el
          contacto queda libre para buscar/asociar. InteraccionForm.jsx ya
          trae su propio overlay fixed, no se envuelve en nada extra. */}
      {mostrarFormInteraccion && (
        <InteraccionForm
          propiedadId={propiedadId}
          propiedadTitulo={propiedadTitulo}
          onCerrar={() => setMostrarFormInteraccion(false)}
          onGuardado={() => setMostrarFormInteraccion(false)}
        />
      )}

      {/* Modal de alta de cita — propiedad ya bloqueada (chip), el contacto
          queda libre para buscar/asociar. CitaForm.jsx ya trae su propio
          overlay fixed, no se envuelve en nada extra. */}
      {mostrarFormCita && (
        <CitaForm
          propiedadId={propiedadId}
          propiedadTitulo={propiedadTitulo}
          onCerrar={() => setMostrarFormCita(false)}
          onGuardado={() => setMostrarFormCita(f