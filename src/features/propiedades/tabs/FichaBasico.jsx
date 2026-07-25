// src/features/propiedades/tabs/FichaBasico.jsx
// Motivo: FEAT — se agrega campo "Descripción" (columna nueva
//   propiedades.descripcion, migración agregar_descripcion_propiedades).
//   Bajada corta tipo flyer, usada como subtítulo en el PDF de
//   ExportaFicha.jsx. Nuevo GrupoCampos dedicado, justo después de Tipo/
//   Operación/Uso/Zona — es lo más parecido a un "titular", tiene sentido
//   junto al título en vez de mezclado con precio/medidas.
// Timestamp: 2026-07-07, 22:50 hrs

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

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
  const [cargandoPlantillaRenta, setCargandoPlantillaRenta] = useState(false)

  const set = (field) => (v) => onChange({ ...value, [field]: v })

  // 24 jul — setter anidado para value.ficha.terminos_renta.*, mismo patrón
  // que set() pero un nivel más adentro del jsonb.
  const setTerminoRenta = (campo) => (v) =>
    onChange({
      ...value,
      ficha: {
        ...value.ficha,
        terminos_renta: { ...value.ficha?.terminos_renta, [campo]: v },
      },
    })

  // Trae la plantilla de requisitos de renta de Mi Perfil. Devuelve null
  // (sin tronar nada) si falla la sesión o la lectura — quien llama decide
  // qué hacer si no hay plantilla.
  const traerPlantillaRenta = async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) return null
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('plantilla_requisitos_renta_fisica, plantilla_requisitos_renta_moral')
      .eq('id', userData.user.id)
      .maybeSingle()
    if (!perfil) return null
    return {
      requisitos_fisica: perfil.plantilla_requisitos_renta_fisica || '',
      requisitos_moral: perfil.plantilla_requisitos_renta_moral || '',
    }
  }

  // Al cambiar la operación a "renta" por primera vez (sin requisitos ya
  // escritos en esta ficha, para no pisar una edición previa), se precarga
  // la plantilla que Nydia configuró en Mi Perfil. Si algo falla al leer
  // el perfil, simplemente se deja vacío — el cambio de operación no debe
  // bloquearse por esto.
  const cambiarOperacion = async (nuevaOperacion) => {
    const terminosActuales = value.ficha?.terminos_renta
    const yaTieneRequisitos = terminosActuales?.requisitos_fisica || terminosActuales?.requisitos_moral

    if (nuevaOperacion === 'renta' && !yaTieneRequisitos) {
      const plantilla = await traerPlantillaRenta()
      if (plantilla) {
        onChange({
          ...value,
          operacion: nuevaOperacion,
          ficha: { ...value.ficha, terminos_renta: { ...value.ficha?.terminos_renta, ...plantilla } },
        })
        return
      }
    }

    set('operacion')(nuevaOperacion)
  }

  // FIX (24 jul, reportado por Okta): propiedades que YA estaban en renta
  // antes de que este feature existiera (o cualquier ficha en renta que se
  // abre sin haber pasado nunca por cambiarOperacion, que solo dispara al
  // elegir "Renta" a mano) se quedaban sin plantilla para siempre — nunca
  // hay un cambio de operación que lo dispare. Al abrir una ficha ya
  // guardada (value.id existe) que es renta y no tiene nada capturado
  // todavía, se trae la plantilla una sola vez. Se detiene solo: en cuanto
  // haya algo en requisitos_fisica/moral (por esta carga o por edición de
  // Nydia), la condición yaTieneRequisitos ya no vuelve a dispararlo.
  useEffect(() => {
    if (!value.id || value.operacion !== 'renta') return
    const terminosActuales = value.ficha?.terminos_renta
    const yaTieneRequisitos = terminosActuales?.requisitos_fisica || terminosActuales?.requisitos_moral
    if (yaTieneRequisitos) return

    let cancelado = false
    traerPlantillaRenta().then((plantilla) => {
      if (!plantilla || cancelado) return
      onChange({
        ...value,
        ficha: { ...value.ficha, terminos_renta: { ...value.ficha?.terminos_renta, ...plantilla } },
      })
    })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.id, value.operacion])

  // Botón manual "Cargar de Mi Perfil" — para cuando Nydia actualiza su
  // plantilla después y quiere traerla a una ficha que ya tenía algo
  // capturado (el efecto de arriba no la pisa a propósito una vez que ya
  // hay texto). A diferencia del efecto, este SÍ sobreescribe — es una
  // acción explícita del usuario, no una carga automática.
  const recargarPlantillaRenta = async () => {
    setCargandoPlantillaRenta(true)
    const plantilla = await traerPlantillaRenta()
    setCargandoPlantillaRenta(false)
    if (!plantilla) return
    onChange({
      ...value,
      ficha: { ...value.ficha, terminos_renta: { ...value.ficha?.terminos_renta, ...plantilla } },
    })
  }

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
          <TapButtonGroup label="Operación" options={OPERACIONES} value={value.operacion} onChange={cambiarOperacion} required compact />
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

      {/* Sesión 20 (17 jul 2026): toggle de página pública. Apagado por
          default — Nydia decide explícitamente cuáles propiedades
          publicar. El botón para copiar/compartir la liga vive en el
          header de la ficha (PropiedadForm.jsx), no aquí. */}
      <GrupoCampos>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <p style={{ fontSize: 14, color: 'var(--ta-text)', margin: 0 }}>Página pública</p>
            <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '2px 0 0' }}>
              {value.publicado
                ? 'Visible sin login para quien tenga la liga.'
                : 'Apagada — nadie puede verla todavía.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!value.publicado}
            onClick={() => set('publicado')(!value.publicado)}
            style={{
              width: 48, height: 28, borderRadius: 14, border: 'none', flexShrink: 0,
              background: value.publicado ? 'var(--ta-accent)' : 'var(--ta-border)',
              position: 'relative', cursor: 'pointer',
            }}
          >
            <span
              style={{
                position: 'absolute', top: 3, left: value.publicado ? 23 : 3,
                width: 22, height: 22, borderRadius: '50%', background: 'var(--ta-surface)',
                transition: 'left 150ms ease-out',
              }}
            />
          </button>
        </div>
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

      {/* 24 jul — términos de renta, solo visibles cuando operacion ===
          'renta' (no hay precedente previo de un grupo condicionado por
          operación en esta ficha; se agrega aquí). requisitos_fisica/moral
          se precargan desde la plantilla de Mi Perfil al elegir "Renta"
          arriba (ver cambiarOperacion) y quedan editables por propiedad. */}
      {value.operacion === 'renta' && (
        <GrupoCampos>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: 0 }}>Términos de renta</p>
            <button
              type="button"
              onClick={recargarPlantillaRenta}
              disabled={cargandoPlantillaRenta}
              style={{ border: 'none', background: 'none', color: 'var(--ta-accent)', fontSize: 12, cursor: cargandoPlantillaRenta ? 'default' : 'pointer', padding: 0 }}
            >
              {cargandoPlantillaRenta ? 'Cargando...' : 'Cargar de Mi Perfil'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <NumberField
              label="Meses de depósito"
              value={value.ficha?.terminos_renta?.meses_deposito}
              onChange={setTerminoRenta('meses_deposito')}
            />
            <NumberField
              label="Meses mínimo de contrato"
              value={value.ficha?.terminos_renta?.meses_minimo_contrato}
              onChange={setTerminoRenta('meses_minimo_contrato')}
            />
          </div>
          <TextAreaField
            label="Requisitos — persona física"
            value={value.ficha?.terminos_renta?.requisitos_fisica}
            onChange={setTerminoRenta('requisitos_fisica')}
            placeholder={'• Identificación oficial\n• Comprobante de domicilio...'}
            ayuda="Se precargó desde tu plantilla en Mi Perfil — puedes ajustarla para esta propiedad."
            rows={4}
          />
          <TextAreaField
            label="Requisitos — persona moral"
            value={value.ficha?.terminos_renta?.requisitos_moral}
            onChange={setTerminoRenta('requisitos_moral')}
            placeholder={'• Acta constitutiva\n• Poder del representante legal...'}
            ayuda="Se precargó desde tu plantilla en Mi Perfil — puedes ajustarla para esta propiedad."
            rows={4}
          />
        </GrupoCampos>
      )}

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
