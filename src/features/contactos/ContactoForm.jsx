// src/features/contactos/ContactoForm.jsx
// Motivo: Homologación de accesibilidad en Contactos (pendiente arrastrado
//   desde Sesión 6/backlog). Cambios: (1) todos los botones de solo-ícono
//   (editar nombre/campos, marcar teléfono principal, quitar teléfono,
//   quitar propiedad asociada, cerrar ficha, WhatsApp/Llamar/Correo)
//   suben a un hit-area mínimo de 44x44px, igualando el estándar que ya
//   tenían TopBar y el Buscador; (2) el selector de "rol principal" era
//   un <div onClick> sin tabIndex/role — inoperable por teclado — se
//   convierte en <button> real. El anillo de foco visible lo cubre la
//   regla global `:focus-visible` agregada en App.css.
// Timestamp: 2026-07-13, 21:02 hrs

import { useState, useEffect, useRef } from 'react'
import { useContacto, CONTACTO_VACIO } from './hooks/useContacto'
import { supabase } from '../../lib/supabaseClient'
import InteraccionForm from '../interacciones/InteraccionForm'
import EnviarDocumentosBoveda from './EnviarDocumentosBoveda'

const ETAPAS = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'calificacion', label: 'Calificación' },
  { value: 'interesado', label: 'Interesado' },
  { value: 'en_proceso_cierre', label: 'En proceso' },
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'perdido', label: 'Perdido' },
]

const CANAL_LABEL = { whatsapp: 'Whatsapp', llamada: 'Llamada', redes_sociales: 'Redes', otro: 'Otro' }

function formatearFecha(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function IconoLapiz() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function IconoRol() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function IconoWhatsApp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.3-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.3-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 4 3.5.6.2 1 .4 1.3.5.6.2 1.1.2 1.5.1.5-.1 1.6-.6 1.8-1.3.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3z"/>
      <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.7 3 1.1 4.8 1.1 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.1c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3C4 14.9 3.5 13.5 3.5 12 3.5 7.3 7.3 3.5 12 3.5S20.5 7.3 20.5 12 16.7 20.1 12 20.1z"/>
    </svg>
  )
}

function IconoTelefono() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

// Ícono de correo — mismo trazo (envelope) ya usado como acción rápida de
// mailto en FichaColaboradores.jsx, duplicado aquí a propósito (componentes
// locales por archivo, misma convención del resto del proyecto).
function IconoCorreo() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  )
}

// Ícono de "enviar documentos" — sobre + flecha, para diferenciarlo del
// mailto simple (IconoCorreo) que solo abre el correo en blanco.
function IconoEnviarDocs() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
      <path d="M22 2 12 13" />
    </svg>
  )
}

// Ícono de "quitar" — mismo trazo/grosor que el resto de íconos del archivo,
// reservado para desasociar (nunca para borrar el contacto/propiedad en sí).
function IconoQuitar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

// Ícono de estrella — marca cuál teléfono es el principal (el que se usa
// para WhatsApp/Llamar en el header). Relleno = es el principal.
function IconoEstrella({ relleno }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={relleno ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

// Fila editable in-line dentro de una caja con divisores — copiado tal cual
// de CampoEditable en PerfilForm.jsx (misma etiqueta arriba fontSize 11,
// valor abajo fontSize 13, borderTop como divisor salvo la primera fila).
function CampoEditable({ label, value, onChange, placeholder, esPrimero }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(value || '')
  const inputRef = useRef(null)

  useEffect(() => { if (!editando) setValor(value || '') }, [value, editando])
  useEffect(() => { if (editando) inputRef.current?.focus() }, [editando])

  const confirmar = () => {
    setEditando(false)
    if (valor.trim() !== (value || '').trim()) onChange(valor.trim() || null)
  }

  return (
    <div
      style={{
        padding: '10px 12px',
        borderTop: esPrimero ? 'none' : '0.5px solid var(--ta-border)',
        textAlign: 'left',
      }}
    >
      <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--ta-text-muted)', textAlign: 'left' }}>{label}</p>
      {editando ? (
        <input
          ref={inputRef}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          placeholder={placeholder}
          style={{
            width: '100%', fontSize: 13, color: 'var(--ta-text)', border: 'none',
            borderBottom: '1px solid var(--ta-accent)', background: 'none',
            padding: '2px 0', outline: 'none', boxSizing: 'border-box', textAlign: 'left',
          }}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p
            onClick={() => setEditando(true)}
            style={{
              flex: 1, margin: 0, fontSize: 13, cursor: 'text', textAlign: 'left',
              color: value ? 'var(--ta-text)' : 'var(--ta-text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {value || placeholder}
          </p>
          <button
            type="button"
            onClick={() => setEditando(true)}
            aria-label={`Editar ${label.toLowerCase()}`}
            style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, borderRadius: 8 }}
          >
            <IconoLapiz />
          </button>
        </div>
      )}
    </div>
  )
}

// Fila de un teléfono ya existente (contacto.id ya resuelto): estrella para
// marcar/ver si es el principal, número (no editable — si está mal, se
// quita y se agrega de nuevo, YAGNI), etiqueta editable, botón quitar.
function FilaTelefono({ t, esPrimero, onCambiarEtiqueta, onMarcarPrincipal, onQuitar }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderTop: esPrimero ? 'none' : '0.5px solid var(--ta-border)' }}>
      <button
        type="button"
        onClick={onMarcarPrincipal}
        aria-label={t.es_principal ? 'Teléfono principal' : 'Marcar como principal'}
        style={{ border: 'none', background: 'none', cursor: 'pointer', color: t.es_principal ? 'var(--ta-accent)' : 'var(--ta-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minWidth: 44, minHeight: 44, borderRadius: 8 }}
      >
        <IconoEstrella relleno={t.es_principal} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ta-text)' }}>{t.telefono}</p>
        <input
          defaultValue={t.etiqueta || ''}
          onBlur={(e) => { if (e.target.value.trim() !== (t.etiqueta || '')) onCambiarEtiqueta(e.target.value.trim() || null) }}
          placeholder="Etiqueta (celular, casa...)"
          style={{ width: '100%', fontSize: 11, color: 'var(--ta-text-muted)', border: 'none', background: 'none', padding: 0, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      <button
        type="button"
        onClick={onQuitar}
        aria-label={`Quitar ${t.telefono}`}
        style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minWidth: 44, minHeight: 44, borderRadius: 8 }}
      >
        <IconoQuitar />
      </button>
    </div>
  )
}

// Botón "+ Agregar teléfono" que se convierte en un input al hacer clic —
// mismo criterio de "acción, no formulario abierto de entrada" que el
// resto de la ficha.
function AgregarTelefono({ onAgregar }) {
  const [abierto, setAbierto] = useState(false)
  const [valor, setValor] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { if (abierto) inputRef.current?.focus() }, [abierto])

  const confirmar = () => {
    if (valor.trim()) onAgregar(valor.trim())
    setValor('')
    setAbierto(false)
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        style={{ width: '100%', height: 40, borderRadius: 10, border: '0.5px dashed var(--ta-detail)', background: 'none', color: 'var(--ta-text-muted)', fontSize: 13, cursor: 'pointer' }}
      >
        + Agregar teléfono
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      type="tel"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') confirmar() }}
      onBlur={confirmar}
      placeholder="Nuevo teléfono"
      style={{ width: '100%', fontSize: 14, padding: '9px 10px', borderRadius: 10, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)', boxSizing: 'border-box' }}
    />
  )
}

// Mismas constantes de estilo de sección que PerfilForm.jsx.
const encabezadoSeccion = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--ta-text-muted)',
  margin: '0 0 10px',
}

const divisorSeccion = {
  borderTop: '0.5px solid var(--ta-border)',
  marginTop: 24,
  paddingTop: 24,
}

// Header protagonista: nombre + rol_principal editables in-line, teléfono
// + acciones rápidas. Mismo patrón de clic-para-editar que TituloFicha en
// PropiedadForm.jsx, duplicado aquí a propósito (componentes locales por
// archivo, consistente con el resto del proyecto).
function NombreYRol({ nombre, rolPrincipal, onCambiarNombre, onCambiarRol }) {
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [valorNombre, setValorNombre] = useState(nombre || '')
  const [editandoRol, setEditandoRol] = useState(false)
  const [valorRol, setValorRol] = useState(rolPrincipal || '')
  const refNombre = useRef(null)
  const refRol = useRef(null)

  useEffect(() => { if (!editandoNombre) setValorNombre(nombre || '') }, [nombre, editandoNombre])
  useEffect(() => { if (editandoNombre) refNombre.current?.focus() }, [editandoNombre])
  useEffect(() => { if (!editandoRol) setValorRol(rolPrincipal || '') }, [rolPrincipal, editandoRol])
  useEffect(() => { if (editandoRol) refRol.current?.focus() }, [editandoRol])

  const confirmarNombre = () => {
    setEditandoNombre(false)
    if (valorNombre.trim() !== (nombre || '').trim()) onCambiarNombre(valorNombre.trim() || null)
  }
  const confirmarRol = () => {
    setEditandoRol(false)
    if (valorRol.trim() !== (rolPrincipal || '').trim()) onCambiarRol(valorRol.trim() || null)
  }

  return (
    <div>
      {editandoNombre ? (
        <input
          ref={refNombre}
          value={valorNombre}
          onChange={(e) => setValorNombre(e.target.value)}
          onBlur={confirmarNombre}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          placeholder="Nombre del contacto"
          style={{
            width: '100%', fontSize: 22, fontWeight: 500, color: 'var(--ta-text)',
            border: 'none', borderBottom: '1px solid var(--ta-accent)', background: 'none',
            padding: '2px 0', outline: 'none', boxSizing: 'border-box',
          }}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p
            onClick={() => setEditandoNombre(true)}
            style={{
              margin: 0, fontSize: 22, fontWeight: 500, cursor: 'text',
              color: nombre ? 'var(--ta-text)' : 'var(--ta-text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {nombre || 'Sin nombre'}
          </p>
          <button type="button" onClick={() => setEditandoNombre(true)} aria-label="Editar nombre" style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, borderRadius: 8, flexShrink: 0 }}>
            <IconoLapiz />
          </button>
        </div>
      )}

      {editandoRol ? (
        <input
          ref={refRol}
          value={valorRol}
          onChange={(e) => setValorRol(e.target.value)}
          onBlur={confirmarRol}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          placeholder="Rol principal (ej. Plomero, Notario, Cliente...)"
          style={{
            width: '100%', fontSize: 14, color: 'var(--ta-text-muted)', border: 'none',
            borderBottom: '1px solid var(--ta-accent)', background: 'none',
            padding: '2px 0', outline: 'none', boxSizing: 'border-box', marginTop: 3,
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditandoRol(true)}
          aria-label={rolPrincipal ? `Editar rol: ${rolPrincipal}` : 'Agregar rol principal'}
          style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, cursor: 'pointer', border: 'none', background: 'none', padding: 0, minHeight: 44, textAlign: 'left' }}
        >
          <IconoRol />
          <span style={{ fontSize: 14, color: rolPrincipal ? 'var(--ta-text-muted)' : 'var(--ta-border)' }}>
            {rolPrincipal || 'Agregar rol principal'}
          </span>
        </button>
      )}
    </div>
  )
}

function seccionEstiloEtapa(etapa) {
  if (etapa === 'perdido') return { background: '#FCEBEB', color: '#791F1F', border: '0.5px dashed #E24B4A' }
  const activo = { background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', border: 'none' }
  return activo
}

export default function ContactoForm({ contactoInicial, onGuardado }) {
  const { contacto, actualizar, guardar, guardando, error } = useContacto(contactoInicial ?? CONTACTO_VACIO)
  const ultimoGuardado = useRef(JSON.stringify(contacto))
  const creandoRef = useRef(false)

  const [propiedadesAsociadas, setPropiedadesAsociadas] = useState([])
  const [cargandoPropiedades, setCargandoPropiedades] = useState(true)
  const [procesos, setProcesos] = useState([])
  const [cargandoProcesos, setCargandoProcesos] = useState(true)

  // Teléfonos — tabla puente contacto_telefonos. telefonoNuevo solo se usa
  // ANTES de que el contacto tenga id (header en modo captura).
  const [telefonos, setTelefonos] = useState([])
  const [cargandoTelefonos, setCargandoTelefonos] = useState(true)
  const [telefonoNuevo, setTelefonoNuevo] = useState('')

  // Interacciones — lista + modal de alta.
  const [interacciones, setInteracciones] = useState([])
  const [cargandoInteracciones, setCargandoInteracciones] = useState(true)
  const [mostrarFormInteraccion, setMostrarFormInteraccion] = useState(false)

  // Enviar documentos de la Bóveda por correo — pedido de Nydia (vía
  // Okta). Ver EnviarDocumentosBoveda.jsx para el flujo completo.
  const [mostrarEnviarDocumentos, setMostrarEnviarDocumentos] = useState(false)

  // Auto-creación: antes se disparaba solo con el teléfono (única columna
  // obligatoria de `contactos`). Esa columna ya no existe aquí — ahora se
  // dispara con el primer teléfono O el primer nombre capturado, lo que
  // pase primero. creandoRef evita duplicados si el efecto se re-dispara
  // mientras la primera creación sigue en curso.
  useEffect(() => {
    if (contacto.id) return
    const tieneAlgo = telefonoNuevo.trim() || contacto.nombre?.trim()
    if (!tieneAlgo) return
    if (creandoRef.current) return
    creandoRef.current = true
    guardar().then(async (res) => {
      if (res.ok && res.data?.id && telefonoNuevo.trim()) {
        const { data: userData } = await supabase.auth.getUser()
        const { data: nuevoTel } = await supabase
          .from('contacto_telefonos')
          .insert({ contacto_id: res.data.id, telefono: telefonoNuevo.trim(), es_principal: true, user_id: userData.user.id })
          .select()
          .single()
        if (nuevoTel) setTelefonos([nuevoTel])
      }
    }).finally(() => { creandoRef.current = false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telefonoNuevo, contacto.nombre, contacto.id])

  // Autosave general debounced — mismo patrón (seguro) que PropiedadForm.jsx.
  useEffect(() => {
    if (!contacto.id) return
    const actual = JSON.stringify(contacto)
    if (actual === ultimoGuardado.current) return
    const t = setTimeout(() => {
      guardar()
      ultimoGuardado.current = actual
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 600)
    return () => clearTimeout(t)
  }, [contacto])

  const cargarTelefonos = () => {
    if (!contacto.id) { setCargandoTelefonos(false); return }
    setCargandoTelefonos(true)
    supabase
      .from('contacto_telefonos')
      .select('id, telefono, etiqueta, es_principal')
      .eq('contacto_id', contacto.id)
      .order('es_principal', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) console.error('Error al cargar teléfonos:', fetchError.message)
        setTelefonos(data || [])
        setCargandoTelefonos(false)
      })
  }

  const agregarTelefono = async (telefono) => {
    if (!contacto.id || !telefono.trim()) return
    const { data: userData } = await supabase.auth.getUser()
    const esPrimero = telefonos.length === 0
    const { error: insertError } = await supabase.from('contacto_telefonos').insert({
      contacto_id: contacto.id,
      telefono: telefono.trim(),
      es_principal: esPrimero,
      user_id: userData.user.id,
    })
    if (insertError) { console.error('Error al agregar teléfono:', insertError.message); return }
    cargarTelefonos()
  }

  const cambiarEtiquetaTelefono = async (id, etiqueta) => {
    setTelefonos((prev) => prev.map((t) => (t.id === id ? { ...t, etiqueta } : t)))
    const { error: updateError } = await supabase.from('contacto_telefonos').update({ etiqueta }).eq('id', id)
    if (updateError) { console.error('Error al actualizar etiqueta:', updateError.message); cargarTelefonos() }
  }

  const marcarTelefonoPrincipal = async (id) => {
    setTelefonos((prev) => prev.map((t) => ({ ...t, es_principal: t.id === id })))
    await supabase.from('contacto_telefonos').update({ es_principal: false }).eq('contacto_id', contacto.id)
    const { error: updateError } = await supabase.from('contacto_telefonos').update({ es_principal: true }).eq('id', id)
    if (updateError) { console.error('Error al marcar teléfono principal:', updateError.message); cargarTelefonos() }
  }

  const quitarTelefono = async (t) => {
    const ok = window.confirm(`¿Quitar el teléfono ${t.telefono}?`)
    if (!ok) return
    const { error: deleteError } = await supabase.from('contacto_telefonos').delete().eq('id', t.id)
    if (deleteError) { console.error('Error al quitar teléfono:', deleteError.message); return }
    setTelefonos((prev) => prev.filter((x) => x.id !== t.id))
  }

  const cargarPropiedadesAsociadas = () => {
    if (!contacto.id) { setCargandoPropiedades(false); return }
    setCargandoPropiedades(true)
    supabase
      .from('propiedad_colaboradores')
      .select('id, rol, rol_otro, propiedades(id, titulo, fotos_propiedad(storage_path, es_portada))')
      .eq('contacto_id', contacto.id)
      .then(({ data, error: fetchError }) => {
        if (fetchError) console.error('Error al cargar propiedades asociadas:', fetchError.message)
        setPropiedadesAsociadas(data || [])
        setCargandoPropiedades(false)
      })
  }

  const cargarProcesos = () => {
    if (!contacto.id) { setCargandoProcesos(false); return }
    setCargandoProcesos(true)
    supabase
      .from('procesos_comerciales')
      .select('id, etapa, propiedades(id, titulo)')
      .eq('contacto_id', contacto.id)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) console.error('Error al cargar procesos comerciales:', fetchError.message)
        setProcesos(data || [])
        setCargandoProcesos(false)
      })
  }

  const cargarInteracciones = () => {
    if (!contacto.id) { setCargandoInteracciones(false); return }
    setCargandoInteracciones(true)
    supabase
      .from('interacciones')
      .select('id, canal, direccion, nota, fecha_hora, propiedades(id, titulo)')
      .eq('contacto_id', contacto.id)
      .order('fecha_hora', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) console.error('Error al cargar interacciones:', fetchError.message)
        setInteracciones(data || [])
        setCargandoInteracciones(false)
      })
  }

  useEffect(() => {
    cargarPropiedadesAsociadas()
    cargarProcesos()
    cargarTelefonos()
    cargarInteracciones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacto.id])

  const portadaDe = (fotos) => {
    const fotosArr = fotos || []
    const portada = fotosArr.find((f) => f.es_portada) || fotosArr[0]
    if (!portada?.storage_path) return null
    const { data } = supabase.storage.from('bucket-propiedad-media').getPublicUrl(portada.storage_path)
    return data?.publicUrl || null
  }

  // Desasociar propiedad: borra el registro de propiedad_colaboradores
  // (nunca el contacto ni la propiedad). confirm() nativo por decisión de
  // Okta — sin componente de confirmación nuevo, YAGNI.
  const desasociarPropiedad = async (pc) => {
    const titulo = pc.propiedades?.titulo || 'esta propiedad'
    const rol = pc.rol === 'otro' ? pc.rol_otro : pc.rol
    const ok = window.confirm(`¿Quitar a ${contacto.nombre || 'este contacto'} como ${rol || 'colaborador'} de "${titulo}"?`)
    if (!ok) return
    const { error: deleteError } = await supabase.from('propiedad_colaboradores').delete().eq('id', pc.id)
    if (deleteError) {
      console.error('Error al desasociar propiedad:', deleteError.message)
      return
    }
    setPropiedadesAsociadas((prev) => prev.filter((p) => p.id !== pc.id))
  }

  const agregarProceso = async () => {
    if (!contacto.id) return
    const { data: userData } = await supabase.auth.getUser()
    const { error: insertError } = await supabase.from('procesos_comerciales').insert({
      contacto_id: contacto.id,
      etapa: 'nuevo',
      user_id: userData.user.id,
    })
    if (insertError) {
      console.error('Error al crear proceso comercial:', insertError.message)
      return
    }
    cargarProcesos()
  }

  const cambiarEtapaProceso = async (procesoId, nuevaEtapa) => {
    setProcesos((prev) => prev.map((p) => (p.id === procesoId ? { ...p, etapa: nuevaEtapa } : p)))
    const { error: updateError } = await supabase
      .from('procesos_comerciales')
      .update({ etapa: nuevaEtapa })
      .eq('id', procesoId)
    if (updateError) {
      console.error('Error al actualizar etapa:', updateError.message)
      cargarProcesos()
    }
  }

  const cerrar = async () => {
    if (contacto.id) await guardar()
    onGuardado?.(contacto)
  }

  const telefonoPrincipal = telefonos.find((t) => t.es_principal) || telefonos[0]
  const telefonoLimpio = (telefonoPrincipal?.telefono || '').replace(/[^\d+]/g, '')

  return (
    <div style={{ background: 'var(--ta-bg)', display: 'flex', justifyContent: 'center', minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--ta-surface)', display: 'flex', flexDirection: 'column' }}>

        <div
          style={{
            position: 'sticky', top: 56, zIndex: 5, background: 'var(--ta-surface)',
            borderBottom: '0.5px solid var(--ta-border)', padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NombreYRol
                nombre={contacto.nombre}
                rolPrincipal={contacto.rol_principal}
                onCambiarNombre={(v) => actualizar({ nombre: v })}
                onCambiarRol={(v) => actualizar({ rol_principal: v })}
              />
            </div>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar ficha de contacto"
              style={{ width: 44, height: 44, flexShrink: 0, border: 'none', borderRadius: 8, background: 'var(--ta-bg)', color: 'var(--ta-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              {!contacto.id ? (
                <input
                  type="tel"
                  value={telefonoNuevo}
                  onChange={(e) => setTelefonoNuevo(e.target.value)}
                  placeholder="Teléfono (o captura el nombre arriba)"
                  style={{
                    width: '100%', fontSize: 14, color: 'var(--ta-text)', border: 'none',
                    borderBottom: '1px solid var(--ta-accent)', background: 'none',
                    padding: '2px 0', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              ) : telefonoPrincipal ? (
                <span style={{ fontSize: 14, color: 'var(--ta-text)' }}>{telefonoPrincipal.telefono}</span>
              ) : (
                <span style={{ fontSize: 14, color: 'var(--ta-text-muted)' }}>Sin teléfono — agrégalo abajo</span>
              )}
            </div>
            {telefonoPrincipal && (
              <>
                <a
                  href={`https://wa.me/${telefonoLimpio}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Abrir WhatsApp"
                  style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}
                >
                  <IconoWhatsApp />
                </a>
                <a
                  href={`tel:${telefonoLimpio}`}
                  aria-label="Llamar"
                  style={{ width: 44, height: 44, borderRadius: 10, border: '0.5px solid var(--ta-border)', color: 'var(--ta-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}
                >
                  <IconoTelefono />
                </a>
              </>
            )}
            {contacto.correo?.trim() && (
              <a
                href={`mailto:${contacto.correo.trim()}`}
                aria-label="Enviar correo"
                style={{ width: 44, height: 44, borderRadius: 10, border: '0.5px solid var(--ta-border)', color: 'var(--ta-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}
              >
                <IconoCorreo />
              </a>
            )}
            {contacto.id && (
              <button
                type="button"
                onClick={() => setMostrarEnviarDocumentos(true)}
                aria-label="Enviar documentos de la bóveda"
                style={{ width: 44, height: 44, borderRadius: 10, border: '0.5px solid var(--ta-border)', background: 'none', color: 'var(--ta-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <IconoEnviarDocs />
              </button>
            )}
          </div>

          <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--ta-text-muted)', height: 14, visibility: guardando ? 'visible' : 'hidden' }}>
            Guardando...
          </p>
        </div>

        <div style={{ flex: 1, padding: '1rem' }}>

          <p style={encabezadoSeccion}>Datos de contacto</p>
          <div style={{ border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden' }}>
            <CampoEditable
              label="Empresa"
              value={contacto.empresa}
              onChange={(v) => actualizar({ empresa: v })}
              placeholder="Sin especificar"
              esPrimero
            />
            <CampoEditable
              label="Correo"
              value={contacto.correo}
              onChange={(v) => actualizar({ correo: v })}
              placeholder="Sin especificar"
            />
          </div>

          {/* Teléfonos — tabla puente contacto_telefonos. Solo aplica una
              vez que el contacto ya tiene id (antes de eso, el teléfono se
              captura en el header y dispara la creación). */}
          {contacto.id && (
            <div style={divisorSeccion}>
              <p style={encabezadoSeccion}>Teléfonos</p>
              {cargandoTelefonos ? (
                <p style={{ fontSize: 13, color: 'var(--ta-text-muted)' }}>Cargando...</p>
              ) : telefonos.length > 0 ? (
                <div style={{ border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                  {telefonos.map((t, idx) => (
                    <FilaTelefono
                      key={t.id}
                      t={t}
                      esPrimero={idx === 0}
                      onCambiarEtiqueta={(etiqueta) => cambiarEtiquetaTelefono(t.id, etiqueta)}
                      onMarcarPrincipal={() => marcarTelefonoPrincipal(t.id)}
                      onQuitar={() => quitarTelefono(t)}
                    />
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', marginBottom: 10 }}>Sin teléfonos todavía.</p>
              )}
              <AgregarTelefono onAgregar={agregarTelefono} />
            </div>
          )}

          <div style={divisorSeccion}>
            <p style={encabezadoSeccion}>Nota</p>
            <textarea
              value={contacto.nota_sin_propiedad || ''}
              onChange={(e) => actualizar({ nota_sin_propiedad: e.target.value })}
              rows={3}
              placeholder="Contexto libre sobre este contacto..."
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)',
                color: 'var(--ta-text)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Interacciones — de `interacciones`. Bitácora de contactos
              puntuales (llamada/whatsapp/redes), distinta de Procesos
              comerciales (el embudo) y de Propiedades asociadas (el rol). */}
          <div style={divisorSeccion}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={encabezadoSeccion}>Interacciones</p>
              {!cargandoInteracciones && <span style={{ fontSize: 11, color: 'var(--ta-text-muted)' }}>{interacciones.length}</span>}
            </div>

            {cargandoInteracciones ? (
              <p style={{ fontSize: 13, color: 'var(--ta-text-muted)' }}>Cargando...</p>
            ) : interacciones.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', marginBottom: 10 }}>
                {contacto.id ? 'Sin interacciones todavía.' : 'Guarda el contacto para poder registrar interacciones.'}
              </p>
            ) : (
              <div style={{ border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                {interacciones.map((i, idx) => (
                  <div key={i.id} style={{ padding: '10px 12px', borderTop: idx === 0 ? 'none' : '0.5px solid var(--ta-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: 'var(--ta-text)' }}>
                        {CANAL_LABEL[i.canal] || i.canal} · {i.direccion === 'entrante' ? 'Entrante' : 'Saliente'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ta-text-muted)' }}>{formatearFecha(i.fecha_hora)}</span>
                    </div>
                    {i.propiedades?.titulo && (
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ta-text-muted)' }}>{i.propiedades.titulo}</p>
                    )}
                    {i.nota && (
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ta-text)' }}>{i.nota}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setMostrarFormInteraccion(true)}
              disabled={!contacto.id}
              style={{
                width: '100%', height: 40, borderRadius: 10,
                border: '0.5px dashed var(--ta-detail)', background: 'none',
                color: 'var(--ta-text-muted)', fontSize: 13,
                cursor: contacto.id ? 'pointer' : 'default', opacity: contacto.id ? 1 : 0.5,
              }}
            >
              + Registrar interacción
            </button>
          </div>

          {/* Propiedades asociadas — de propiedad_colaboradores. TODOS los
              roles (servicio y negocio). Nunca mezclar con procesos_comerciales.
              Botón "Quitar" borra solo la relación (propiedad_colaboradores),
              nunca el contacto ni la propiedad. */}
          <div style={divisorSeccion}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={encabezadoSeccion}>Propiedades asociadas</p>
              {!cargandoPropiedades && <span style={{ fontSize: 11, color: 'var(--ta-text-muted)' }}>{propiedadesAsociadas.length}</span>}
            </div>

            {cargandoPropiedades ? (
              <p style={{ fontSize: 13, color: 'var(--ta-text-muted)' }}>Cargando...</p>
            ) : propiedadesAsociadas.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ta-text-muted)' }}>Sin propiedades asociadas todavía.</p>
            ) : (
              <div style={{ border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden' }}>
                {propiedadesAsociadas.map((pc, idx) => {
                  const portada = portadaDe(pc.propiedades?.fotos_propiedad)
                  return (
                    <div
                      key={pc.id}
                      style={{
                        display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px',
                        borderTop: idx === 0 ? 'none' : '0.5px solid var(--ta-border)',
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, background: 'var(--ta-bg)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {portada ? (
                          <img src={portada} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 9, color: 'var(--ta-text-muted)' }}>Sin foto</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--ta-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pc.propiedades?.titulo || 'Sin título'}
                        </p>
                        <span style={{ fontSize: 10, background: 'var(--ta-bg)', color: 'var(--ta-text-muted)', borderRadius: 5, padding: '2px 6px' }}>
                          {pc.rol === 'otro' ? pc.rol_otro : pc.rol}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => desasociarPropiedad(pc)}
                        aria-label={`Quitar relación con ${pc.propiedades?.titulo || 'esta propiedad'}`}
                        style={{ width: 44, height: 44, flexShrink: 0, border: 'none', background: 'none', color: 'var(--ta-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <IconoQuitar />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Procesos comerciales — de procesos_comerciales. El embudo real.
              Nunca fusionar con propiedades asociadas de arriba. */}
          <div style={divisorSeccion}>
            <p style={encabezadoSeccion}>Procesos comerciales</p>

            {cargandoProcesos ? (
              <p style={{ fontSize: 13, color: 'var(--ta-text-muted)' }}>Cargando...</p>
            ) : procesos.length > 0 ? (
              <div style={{ border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                {procesos.map((p, idx) => (
                  <div
                    key={p.id}
                    style={{ padding: '10px 12px', borderTop: idx === 0 ? 'none' : '0.5px solid var(--ta-border)' }}
                  >
                    <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--ta-text-muted)' }}>
                      {p.propiedades?.titulo || 'Sin propiedad concreta'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {ETAPAS.map((et) => {
                        const activo = p.etapa === et.value
                        const estilo = activo ? seccionEstiloEtapa(et.value) : { background: 'var(--ta-bg)', color: 'var(--ta-text-muted)', border: '0.5px solid var(--ta-border)' }
                        return (
                          <button
                            key={et.value}
                            type="button"
                            onClick={() => cambiarEtapaProceso(p.id, et.value)}
                            style={{ padding: '4px 10px', borderRadius: 16, fontSize: 11, cursor: 'pointer', ...estilo }}
                          >
                            {et.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style=