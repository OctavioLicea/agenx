// src/features/interacciones/ListadoInteracciones.jsx
// Motivo: Sprint 3 (Interacciones) — módulo global, pendiente arrastrado
//   desde Sesión 10 ("Vista de listado propio de Interacciones"). Se
//   agrega SIN quitar la sección "Interacciones" de ContactoForm.jsx —
//   decisión de Okta: la sección dentro de la ficha sirve para registrar
//   rápido sin salir del contacto; este módulo sirve para ver todas las
//   interacciones sin importar el contacto, filtrables por canal, y para
//   dar de alta una interacción eligiendo el contacto desde cero (mismo
//   InteraccionForm.jsx reutilizado, sin contacto/propiedad bloqueados).
//   Mismo patrón visual que ListadoContactos.jsx: skeleton de carga,
//   buscador + filtro de chips, estado vacío, FAB de alta.
//   [Actualización 13 jul 2026, feedback de la primera prueba real]:
//   (1) miniatura de la propiedad (portada) + avatar de iniciales del
//   contacto en cada fila; (2) la fila ahora SÍ tiene acción: tocarla
//   abre InteraccionForm en modo edición (interaccionInicial); tocar el
//   avatar/nombre del contacto (stopPropagation) abre su ficha en modal
//   en vez de la interacción — mismo patrón de doble affordance que
//   FichaColaboradores.jsx (fila abre una cosa, botón anidado abre otra).
//   [Actualización 13 jul 2026, segunda vuelta de feedback con capturas]:
//   (1) reacomodo de la fila — fecha ahora junto al avatar (izquierda),
//   miniatura de propiedad movida al extremo derecho; (2) el canal
//   (Whatsapp/Llamada/Redes/Otro) sube de chip pequeño a texto
//   protagonista junto al nombre, mismo nivel visual; (3) selector de
//   orden (más recientes / contacto / propiedad).
//   [Actualización 13 jul 2026, tercera vuelta]: filtro opcional por
//   fecha (Desde/Hasta) — sobre `fecha_hora` (cuándo pasó la interacción),
//   no sobre `created_at` (cuándo se guardó la fila); es el dato que le
//   importa a Nydia y ya es editable en el formulario. Mismo patrón que
//   ListadoContactos.jsx y ListadoPropiedades.jsx.
// Timestamp: 2026-07-13, 22:25 hrs

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import InteraccionForm from './InteraccionForm'
import ContactoForm from '../contactos/ContactoForm'

const CANAL_LABEL = { whatsapp: 'Whatsapp', llamada: 'Llamada', redes_sociales: 'Redes', otro: 'Otro' }

const coloresCanal = {
  whatsapp: { bg: '#EAF3DE', text: '#27500A' },
  llamada: { bg: '#F1EFE8', text: '#5F5E5A' },
  redes_sociales: { bg: '#FAEEDA', text: '#633806' },
  otro: { bg: '#F1EFE8', text: '#5F5E5A' },
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

export default function ListadoInteracciones({ refreshKey = 0 }) {
  const [interacciones, setInteracciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [filtroCanal, setFiltroCanal] = useState('todos') // 'todos' | whatsapp | llamada | redes_sociales | otro
  const [orden, setOrden] = useState('fecha') // 'fecha' | 'contacto' | 'propiedad'
  const [mostrarFiltroFecha, setMostrarFiltroFecha] = useState(false)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [interaccionModal, setInteraccionModal] = useState(null) // fila completa, modo edición
  const [contactoModal, setContactoModal] = useState(null) // contacto abierto en modal, desde el avatar/nombre
  const [recargaKey, setRecargaKey] = useState(0)

  const cargar = useCallback(() => {
    setCargando(true)
    supabase
      .from('interacciones')
      .select('id, canal, direccion, nota, fecha_hora, contactos(id, nombre), propiedades(id, titulo, fotos_propiedad(storage_path, es_portada))')
      .order('fecha_hora', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(`No se pudieron cargar las interacciones: ${fetchError.message}`)
        } else {
          setInteracciones(data || [])
        }
        setCargando(false)
      })
  }, [])

  useEffect(() => { cargar() }, [cargar, refreshKey, recargaKey])

  // Filtro por fecha: sobre `fecha_hora` (cuándo pasó la interacción), no
  // sobre `created_at` (cuándo se guardó la fila) — es el dato que le
  // importa a Nydia y ya es editable/visible en el formulario. Rango
  // Desde/Hasta opcional, mismo patrón que Contactos y Propiedades.
  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return interacciones.filter((i) => {
      const coincideCanal = filtroCanal === 'todos' || i.canal === filtroCanal
      const coincideTexto =
        !texto ||
        i.contactos?.nombre?.toLowerCase().includes(texto) ||
        i.propiedades?.titulo?.toLowerCase().includes(texto) ||
        i.nota?.toLowerCase().includes(texto)
      const fecha = i.fecha_hora ? new Date(i.fecha_hora) : null
      const coincideFecha =
        (!fechaDesde || (fecha && fecha >= new Date(`${fechaDesde}T00:00:00`))) &&
        (!fechaHasta || (fecha && fecha <= new Date(`${fechaHasta}T23:59:59`)))
      return coincideCanal && coincideTexto && coincideFecha
    })
  }, [interacciones, busqueda, filtroCanal, fechaDesde, fechaHasta])

  // El query ya viene ordenado por fecha desc — 'fecha' no necesita resort.
  const ordenadas = useMemo(() => {
    if (orden === 'fecha') return filtradas
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
            {['todos', 'whatsapp', 'llamada', 'redes_sociales', 'otro'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFiltroCanal(c)}
                style={{
                  fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                  border: filtroCanal === c ? 'none' : '0.5px solid var(--ta-border)',
       