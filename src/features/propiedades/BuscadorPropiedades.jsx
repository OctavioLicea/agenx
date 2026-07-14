// src/features/propiedades/BuscadorPropiedades.jsx
// Motivo: combo de búsqueda temporal para reabrir y editar propiedades ya
//   dadas de alta — parche funcional simple mientras no exista la página de
//   listado completa (grid/lista + mapa, estilo Airbnb/Google Maps, backlog
//   aparte). Busca por título y dirección; sin texto muestra las más
//   recientes (útil para "reabrir la última que edité").
// Timestamp: 2026-07-04, 22:41 hrs

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

const ESTADO_LABEL = {
  captacion: 'Captación',
  disponible: 'Disponible',
  en_proceso: 'En proceso',
  cerrada: 'Cerrada',
}

async function buscarPropiedades(texto) {
  let query = supabase
    .from('propiedades')
    .select('id, titulo, tipo, zona, direccion, estado, precio, moneda')
    .order('updated_at', { ascending: false })
    .limit(10)

  if (texto.trim()) {
    query = query.or(`titulo.ilike.%${texto}%,direccion.ilike.%${texto}%`)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error buscando propiedades:', error.message)
    return []
  }
  return data
}

async function obtenerPropiedadCompleta(id) {
  const { data, error } = await supabase.from('propiedades').select('*').eq('id', id).single()
  if (error) {
    console.error('Error cargando propiedad:', error.message)
    return null
  }
  return data
}

export default function BuscadorPropiedades({ onSeleccionar, onNueva }) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    buscarPropiedades('').then((r) => {
      setResultados(r)
      setCargando(false)
    })
  }, [])

  const handleChange = (valor) => {
    setTexto(valor)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setCargando(true)
      const r = await buscarPropiedades(valor)
      setResultados(r)
      setCargando(false)
    }, 350)
  }

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const seleccionar = async (id) => {
    setCargandoDetalle(true)
    const propiedad = await obtenerPropiedadCompleta(id)
    setCargandoDetalle(false)
    if (propiedad) onSeleccionar(propiedad)
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 10px' }}>
        Buscar propiedad para editar
      </p>

      <input
        type="text"
        value={texto}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Título o dirección..."
        style={{
          width: '100%',
          height: 44,
          padding: '0 12px',
          borderRadius: 10,
          border: '0.5px solid var(--ta-border)',
          background: 'var(--ta-surface)',
          color: 'var(--ta-text)',
          fontSize: 14,
          boxSizing: 'border-box',
          marginBottom: 16,
        }}
      />

      <button
        type="button"
        onClick={onNueva}
        style={{
          width: '100%',
          height: 44,
          borderRadius: 10,
          border: 'none',
          background: 'var(--ta-accent)',
          color: 'var(--ta-on-accent)',
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 20,
          cursor: 'pointer',
        }}
      >
        + Nueva propiedad
      </button>

      {cargando ? (
        <p style={{ fontSize: 13, color: 'var(--ta-text-muted)' }}>Buscando...</p>
      ) : resultados.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ta-text-muted)' }}>
          {texto ? 'Sin resultados.' : 'Todavía no hay propiedades guardadas.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!texto && (
            <p style={{ fontSize: 11, color: 'var(--ta-text-muted)', margin: '0 0 4px' }}>
              Más recientes
            </p>
          )}
          {resultados.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => seleccionar(p.id)}
              disabled={cargandoDetalle}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 10,
                border: '0.5px solid var(--ta-border)',
                background: 'var(--ta-surface)',
                cursor: cargandoDetalle ? 'default' : 'pointer',
                opacity: cargandoDetalle ? 0.6 : 1,
              }}
            >
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--ta-text)' }}>
                {p.titulo || '(sin título)'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ta-text-muted)' }}>
                {p.direccion || p.zona || 'sin dirección'}
                {p.precio ? ` · ${Number(p.precio).toLocaleString('es-MX')} ${p.moneda || 'MXN'}` : ''}
                {' · '}
                {ESTADO_LABEL[p.estado] || p.estado}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
