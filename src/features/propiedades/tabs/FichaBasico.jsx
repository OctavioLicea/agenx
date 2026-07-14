// src/features/propiedades/tabs/FichaBasico.jsx
// Motivo: FEAT — se agrega campo "Descripción" (columna nueva
//   propiedades.descripcion, migración agregar_descripcion_propiedades).
//   Bajada corta tipo flyer, usada como subtítulo en el PDF de
//   ExportaFicha.jsx. Nuevo GrupoCampos dedicado, justo después de Tipo/
//   Operación/Uso/Zona — es lo más parecido a un "titular", tiene sentido
//   junto al título en vez de mezclado con precio/medidas.
// Timestamp: 2026-07-07, 22:50 hrs

import { useState } from 'react'

const TIPOS = [
  { value: 'casa', label: 'Casa' },
  { value: 'depto', label: 'Depto' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'local', label: 'Local' },
  { value: 'otro', label: 'Otro' },
]

const OPERACIONES = [
  { value: 'venta', label: 'Venta' },
  { value: 'renta', label: 'Renta' },
]

const USOS = [
  { value: 'residencial', label: 'Residencial' },
  { value: 'comercial', label: 'Comercial' },
]

const ZONAS = [
  { value: 'saltillo', label: 'Saltillo' },
  { value: 'arteaga', label: 'Arteaga' },
  { value: 'ramos_arizpe', label: 'Ramos Arizpe' },
]

const ESTADOS = [
  { value: 'captacion', label: 'Captación' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'cerrada', label: 'Cerrada' },
]

const REDES = ['Facebook', 'Instagram', 'TikTok', 'Otro']

function Asterisco() {
  return <span style={{ color: 'var(--ta-detail)', marginLeft: 3 }}>*</span>
}

// Mismo tratamiento visual que Seccion en FichaTecnica.jsx (caja con borde
// + acento rosa-champán a la izquierda) — aquí sin acordeón, solo como
// agrupador visual, ya que Básico no necesita colapsar/expandir.
function GrupoCampos({ children }) {
  return (
    <div
      style={{
        marginBottom: 14,
        padding: '14px 14px 2px',
        borderRadius: 12,
        border: '0.5px solid var(--ta-border)',
        borderLeft: '3px solid var(--ta-detail)',
      }}
    >
      {children}
    </div>
  )
}

function TapButtonGroup({ label, options, value, onChange, required = false, compact = false }) {
  return (
    <div style={{ marginBottom: compact ? '1rem' : '1.25rem' }}>
      <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 8px' }}>
        {label}
        {required && <Asterisco />}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                padding: compact ? '8px 12px' : '10px 16px',
                borderRadius: 20,
                fontSize: compact ? 13 : 14,
                border: active ? 'none' : '0.5px solid var(--ta-border)',
                background: active ? 'var(--ta-accent)' : 'var(--ta-surface)',
                color: active ? 'var(--ta-on-accent)' : 'var(--ta-text)',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TextField({ label, value, onChange, required = false, placeholder }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>
        {label}
        {required && <Asterisco />}
      </p>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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
        }}
      />
    </div>
  )
}

// Nuevo — mismo tratamiento visual que TextField, pero <textarea> con
// contador de caracteres suave (sin límite duro, solo referencia visual
// de que esto es una bajada corta, no un historial largo).
function TextAreaField({ label, value, onChange, placeholder, ayuda, rows = 3 }) {
  const longitud = (value || '').length
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>{label}</p>
        {longitud > 0 && (
          <span style={{ fontSize: 10, color: 'var(--ta-text-muted)' }}>{longitud} caracteres</span>
        )}
      </div>
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 10,
          border: '0.5px solid var(--ta-border)',
          background: 'var(--ta-surface)',
          color: 'var(--ta-text)',
          fontSize: 14,
          fontFamily: 'inherit',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
      {ayuda && (
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ta-text-muted)' }}>{ayuda}</p>
      )}
    </div>
  )
}

function NumberField({ label, value, onChange, step = '1', suffix }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>{label}</p>
      <div style={{ position: 'relative' }}>
        <input
          type="number"
          step={step}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          style={{
            width: '100%',
            height: 44,
            padding: '0 12px',
            borderRadius: 10,
            border: '0.5px solid var(--ta-border)',
            background: 'var(--ta-surface)',
            color: 'var(--ta-text)',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 14,
            boxSizing: 'border-box',
          }}
        />
        {suffix && (
          <span
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 12,
              color: 'var(--ta-text-muted)',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

// Precio con formato de miles (es-MX) + selector de moneda MXN/USD.
// Sin lógica de tipo de cambio — moneda es solo una etiqueta de la propiedad.
function PrecioField({ precio, moneda, onPrecioChange, onMonedaChange }) {
  const displayValue = precio != null ? Number(precio).toLocaleString('es-MX') : ''

  const handleChange = (e) => {
    const soloDigitos = e.target.value.replace(/[^\d]/g, '')
    onPrecioChange(soloDigitos === '' ? null : Number(soloDigitos))
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>Precio</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder="0"
          style={{
            flex: 1,
            height: 44,
            padding: '0 12px',
            borderRadius: 10,
            border: '0.5px solid var(--ta-border)',
            background: 'var(--ta-surface)',
            color: 'var(--ta-text)',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 14,
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden' }}>
          {['MXN', 'USD'].map((m) => {
            const active = (moneda || 'MXN') === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => onMonedaChange(m)}
                style={{
                  height: 44,
                  padding: '0 14px',
                  border: 'none',
                  background: active ? 'var(--ta-accent)' : 'var(--ta-surface)',
                  color: active ? 'var(--ta-on-accent)' : 'var(--ta-text)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {m}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function FichaBasico({ value, onChange }) {
  const [nuevaRed, setNuevaRed] = useState({ red: REDES[0], url: '' })

  const set = (field) => (v) => onChange({ ...value, [field]: v })

  const agregarRed = () => {
    if (!nuevaRed.url.trim()) return
    const actuales = value.redes_sociales || []
    onChange({ ...value, redes_sociales: [...actuales, nuevaRed] })
    setNuevaRed({ red: REDES[0], url: '' })
  }

  const eliminarRed = (idx) => {
    const actuales = [...(value.redes_sociales || [])]
    actuales.splice(idx, 1)
    onChange({ ...value, redes_sociales: actuales })
  }

  return (
    <div>
      <GrupoCampos>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <TapButtonGroup label="Tipo" options={TIPOS} value={value.tipo} onChange={set('tipo')} required compact />
          <TapButtonGroup label="Operación" options={OPERACIONES} value={value.operacion} onChange={set('operacion')} required compact />
          <TapButtonGroup label="Uso" options={USOS} value={value.uso} onChange={set('uso')} required compact />
          <TapButtonGroup label="Zona" options={ZONAS} value={value.zona} onChange={set('zona')} required compact />
        </div>

        {value.tipo === 'otro' && (
          <TextField
            label="Especifica el tipo"
            value={value.tipo_otro}
            onChange={set('tipo_otro')}
            placeholder="Ej. Bodega, Rancho, Nave industrial..."
          />
        )}
      </GrupoCampos>

      <GrupoCampos>
        <TextAreaField
          label="Descripción"
          value={value.descripcion}
          onChange={set('descripcion')}
          placeholder="Hermosa quinta campestre en Arteaga Coah. con todas las amenidades, lista para usarse y a 15 min de la plaza principal."
          ayuda="Bajada corta tipo flyer — aparece debajo del título en el PDF exportado."
          rows={3}
        />
      </GrupoCampos>

      <GrupoCampos>
        <TapButtonGroup label="Estado" options={ESTADOS} value={value.estado} onChange={set('estado')} />
      </GrupoCampos>

      <GrupoCampos>
        <PrecioField
          precio={value.precio}
          moneda={value.moneda}
          onPrecioChange={set('precio')}
          onMonedaChange={set('moneda')}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <NumberField label="Recámaras" value={value.recamaras} onChange={set('recamaras')} />
          <NumberField label="Baños" value={value.banos} onChange={set('banos')} step="0.5" />
          <NumberField label="Estacionamientos" value={value.estacionamientos} onChange={set('estacionamientos')} />
          <NumberField label="Cuota mant." value={value.cuota_mantenimiento} onChange={set('cuota_mantenimiento')} suffix="MXN" />
          <NumberField label="M² construcción" value={value.m2_construccion} onChange={set('m2_construccion')} suffix="m²" />
          <NumberField label="M² terreno" value={value.m2_terreno} onChange={set('m2_terreno')} suffix="m²" />
        </div>
      </GrupoCampos>

      <GrupoCampos>
        <div style={{ marginBottom: '0.5rem' }}>
          <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 8px' }}>Redes sociales</p>

          {(value.redes_sociales || []).map((r, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                marginBottom: 6,
                borderRadius: 8,
                border: '0.5px solid var(--ta-border)',
                background: 'var(--ta-surface)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ta-accent)', width: 64 }}>{r.red}</span>
              <span style={{ fontSize: 13, color: 'var(--ta-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.url}
              </span>
              <button
                type="button"
                onClick={() => eliminarRed(idx)}
                style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', cursor: 'pointer', fontSize: 16 }}
                aria-label="Eliminar red social"
              >
                ×
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <select
              value={nuevaRed.red}
              onChange={(e) => setNuevaRed({ ...nuevaRed, red: e.target.value })}
              style={{
                height: 40,
                borderRadius: 8,
                border: '0.5px solid var(--ta-border)',
                background: 'var(--ta-surface)',
                color: 'var(--ta-text)',
                fontSize: 13,
                padding: '0 8px',
              }}
            >
              {REDES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="URL del anuncio..."
              value={nuevaRed.url}
              onChange={(e) => setNuevaRed({ ...nuevaRed, url: e.target.value })}
              style={{
                flex: 1,
                height: 40,
                padding: '0 10px',
                borderRadius: 8,
                border: '0.5px solid var(--ta-border)',
                background: 'var(--ta-surface)',
                color: 'var(--ta-text)',
                fontSize: 13,
              }}
            />
            <button
              type="button"
              onClick={agregarRed}
              style={{
                height: 40,
                padding: '0 14px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--ta-accent)',
                color: 'var(--ta-on-accent)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              + Agregar
            </button>
          </div>
        </div>
      </GrupoCampos>
    </div>
  )
}
