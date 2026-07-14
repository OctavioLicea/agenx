// src/features/propiedades/tabs/FichaTecnica.jsx
// Motivo: FIX de la pantalla en blanco al tocar esta pestaña — `value`
//   podía llegar undefined (cuando ListadoPropiedades no incluía `ficha`
//   en su select) y `value.situacion_fiscal_legal` tronaba sin control.
//   Se agrega default `value = {}` en la firma del componente.
// Timestamp: 2026-07-05, 22:40 hrs

import { useState } from 'react'

const SERVICIOS_GENERALES_ITEMS = [
  { key: 'seguridad_vigilancia', label: 'Seguridad y vigilancia' },
  { key: 'estacionamiento_techado_visitas', label: 'Estacionamiento techado y de visitas' },
  { key: 'elevador', label: 'Elevador' },
  { key: 'motor_lobby', label: 'Motor lobby' },
  { key: 'recepcion_paqueteria', label: 'Recepción de paquetería' },
]

const RECREACION_ITEMS = [
  { key: 'alberca_jacuzzi', label: 'Alberca y jacuzzi' },
  { key: 'gimnasio', label: 'Gimnasio' },
  { key: 'spa_sauna', label: 'Spa y sauna' },
  { key: 'roof_garden', label: 'Roof garden' },
  { key: 'salon_usos_multiples', label: 'Salón de usos múltiples' },
  { key: 'areas_asador_terrazas', label: 'Áreas de asador (BBQ) y terrazas' },
  { key: 'salon_juegos', label: 'Salón de juegos' },
]

const ACABADOS_ITEMS = [
  { key: 'pisos', label: 'Pisos' },
  { key: 'muros_techos', label: 'Muros y techos' },
  { key: 'fachadas', label: 'Fachadas' },
]

const EQUIPO_INTERIOR_ITEMS = [
  { key: 'cocina', label: 'Cocina' },
  { key: 'banos', label: 'Baños' },
  { key: 'almacenamiento', label: 'Almacenamiento' },
  { key: 'climatizacion', label: 'Climatización' },
]

const TIPOS_EXTRA = [
  { value: 'texto', label: 'Texto' },
  { value: 'numero', label: 'Número' },
  { value: 'si_no', label: 'Sí/No' },
]

const ESQUEMAS_PAGO = [
  { value: 'credito_bancario', label: 'Crédito bancario' },
  { value: 'infonavit', label: 'Infonavit' },
  { value: 'cofinavit', label: 'Cofinavit' },
  { value: 'recursos_propios', label: 'Recursos propios' },
]

// --- primitivas reutilizadas del patrón visual de BasicoTab ---------------

function TriToggle({ label, value, onChange }) {
  // value: null | true | false. Click en la opción activa la vuelve a null.
  const opciones = [
    { v: true, label: 'Sí' },
    { v: false, label: 'No' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--ta-border)' }}>
      <span style={{ fontSize: 14, color: 'var(--ta-text)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        {opciones.map((opt) => {
          const active = value === opt.v
          return (
            <button
              key={String(opt.v)}
              type="button"
              onClick={() => onChange(active ? null : opt.v)}
              style={{
                minWidth: 44,
                height: 32,
                padding: '0 12px',
                borderRadius: 16,
                fontSize: 13,
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

function ChipGroup({ label, options, value = [], onChange }) {
  const toggle = (v) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v))
    else onChange([...value, v])
  }
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 8px' }}>{label}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const active = value.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 18,
                fontSize: 13,
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

function TextArea({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>{label}</p>
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
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
        }}
      />
    </div>
  )
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>{label}</p>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          height: 40,
          padding: '0 12px',
          borderRadius: 10,
          border: '0.5px solid var(--ta-border)',
          background: 'var(--ta-surface)',
          color: 'var(--ta-text)',
          fontSize: 14,
        }}
      />
    </div>
  )
}

// --- acordeón ---------------------------------------------------------

function Seccion({ titulo, abierta, onToggle, children }) {
  return (
    <div style={{ marginBottom: 10, borderRadius: 12, border: '0.5px solid var(--ta-border)', borderLeft: '3px solid var(--ta-detail)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierta}
        style={{
          width: '100%',
          minHeight: 48,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--ta-surface)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ta-text)' }}>{titulo}</span>
        <span
          aria-hidden="true"
          style={{
            color: 'var(--ta-detail)',
            fontSize: 16,
            transform: abierta ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms ease',
          }}
        >
          ⌄
        </span>
      </button>
      {abierta && <div style={{ padding: '4px 16px 16px' }}>{children}</div>}
    </div>
  )
}

// --- sección: Equipamiento y amenidades (con extras tipados) ----------

function ExtraRow({ extra, onChange, onEliminar }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
      <input
        type="text"
        placeholder="Nombre (ej. Alberca)"
        value={extra.nombre}
        onChange={(e) => onChange({ ...extra, nombre: e.target.value })}
        style={{ flex: 2, height: 36, padding: '0 10px', borderRadius: 8, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)', fontSize: 13 }}
      />
      <select
        value={extra.tipo}
        onChange={(e) => onChange({ ...extra, tipo: e.target.value, valor: '' })}
        style={{ height: 36, borderRadius: 8, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)', fontSize: 12, padding: '0 6px' }}
      >
        {TIPOS_EXTRA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      {extra.tipo === 'si_no' ? (
        <select
          value={extra.valor === true ? 'si' : extra.valor === false ? 'no' : ''}
          onChange={(e) => onChange({ ...extra, valor: e.target.value === 'si' })}
          style={{ height: 36, borderRadius: 8, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)', fontSize: 12, padding: '0 6px' }}
        >
          <option value="">—</option>
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
      ) : (
        <input
          type={extra.tipo === 'numero' ? 'number' : 'text'}
          placeholder="Valor"
          value={extra.valor ?? ''}
          onChange={(e) => onChange({ ...extra, valor: extra.tipo === 'numero' ? Number(e.target.value) : e.target.value })}
          style={{ flex: 1, height: 36, padding: '0 10px', borderRadius: 8, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)', fontSize: 13 }}
        />
      )}

      <button
        type="button"
        onClick={onEliminar}
        aria-label="Eliminar extra"
        style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', fontSize: 18, cursor: 'pointer', minWidth: 32 }}
      >
        ×
      </button>
    </div>
  )
}

function Subtitulo({ children }) {
  return (
    <p style={{
      fontSize: 12, fontWeight: 600, color: 'var(--ta-accent)', textTransform: 'uppercase',
      letterSpacing: '0.04em', margin: '18px 0 6px',
    }}>
      {children}
    </p>
  )
}

function SeccionEquipamiento({ equipamiento, onChange }) {
  const servicios = equipamiento.servicios_generales_seguridad || {}
  const recreacion = equipamiento.recreacion_bienestar || {}
  const acabados = equipamiento.acabados || {}
  const equipoInterior = equipamiento.equipo_interior || {}
  const extras = equipamiento.extras || []

  const setServicio = (key) => (v) => onChange({ ...equipamiento, servicios_generales_seguridad: { ...servicios, [key]: v } })
  const setRecreacion = (key) => (v) => onChange({ ...equipamiento, recreacion_bienestar: { ...recreacion, [key]: v } })
  const setAcabado = (key) => (v) => onChange({ ...equipamiento, acabados: { ...acabados, [key]: v } })
  const setEquipoInterior = (key) => (v) => onChange({ ...equipamiento, equipo_interior: { ...equipoInterior, [key]: v } })

  const agregarExtra = () => {
    onChange({ ...equipamiento, extras: [...extras, { nombre: '', tipo: 'texto', valor: '' }] })
  }
  const cambiarExtra = (idx) => (nuevo) => {
    const copia = [...extras]
    copia[idx] = nuevo
    onChange({ ...equipamiento, extras: copia })
  }
  const eliminarExtra = (idx) => {
    onChange({ ...equipamiento, extras: extras.filter((_, i) => i !== idx) })
  }

  return (
    <div>
      <Subtitulo>Servicios generales y seguridad</Subtitulo>
      {SERVICIOS_GENERALES_ITEMS.map((item) => (
        <TriToggle key={item.key} label={item.label} value={servicios[item.key]} onChange={setServicio(item.key)} />
      ))}

      <Subtitulo>Recreación y bienestar</Subtitulo>
      {RECREACION_ITEMS.map((item) => (
        <TriToggle key={item.key} label={item.label} value={recreacion[item.key]} onChange={setRecreacion(item.key)} />
      ))}

      <Subtitulo>Acabados</Subtitulo>
      {ACABADOS_ITEMS.map((item) => (
        <TextField
          key={item.key}
          label={item.label}
          value={acabados[item.key]}
          onChange={setAcabado(item.key)}
          placeholder="Ej. Porcelanato, Pintura vinílica, Piedra laja..."
        />
      ))}

      <Subtitulo>Equipamiento</Subtitulo>
      {EQUIPO_INTERIOR_ITEMS.map((item) => (
        <TriToggle key={item.key} label={item.label} value={equipoInterior[item.key]} onChange={setEquipoInterior(item.key)} />
      ))}

      <Subtitulo>Otro</Subtitulo>
      <div>
        {extras.map((extra, idx) => (
          <ExtraRow key={idx} extra={extra} onChange={cambiarExtra(idx)} onEliminar={() => eliminarExtra(idx)} />
        ))}
        <button
          type="button"
          onClick={agregarExtra}
          style={{ height: 36, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          + Agregar
        </button>
      </div>
    </div>
  )
}

// --- sección: Comentarios (interno / cliente) --------------------------

function SeccionComentarios({ comentarios, onChange }) {
  const agregar = () => onChange([...comentarios, { texto: '', visible_cliente: false }])
  const cambiar = (idx, campo, v) => {
    const copia = [...comentarios]
    copia[idx] = { ...copia[idx], [campo]: v }
    onChange(copia)
  }
  const eliminar = (idx) => onChange(comentarios.filter((_, i) => i !== idx))

  return (
    <div>
      {comentarios.map((c, idx) => (
        <div key={idx} style={{ marginBottom: 10, padding: 10, borderRadius: 10, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)' }}>
          <textarea
            value={c.texto}
            onChange={(e) => cambiar(idx, 'texto', e.target.value)}
            rows={2}
            placeholder="Comentario..."
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '0.5px solid var(--ta-border)', background: 'var(--ta-bg)', color: 'var(--ta-text)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ v: false, label: 'Interno' }, { v: true, label: 'Visible al cliente' }].map((opt) => {
                const active = c.visible_cliente === opt.v
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => cambiar(idx, 'visible_cliente', opt.v)}
                    style={{
                      height: 28,
                      padding: '0 10px',
                      borderRadius: 14,
                      fontSize: 11,
                      border: active ? 'none' : '0.5px solid var(--ta-border)',
                      background: active ? 'var(--ta-accent)' : 'var(--ta-bg)',
                      color: active ? 'var(--ta-on-accent)' : 'var(--ta-text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <button type="button" onClick={() => eliminar(idx)} aria-label="Eliminar comentario" style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', fontSize: 16, cursor: 'pointer' }}>×</button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={agregar}
        style={{ height: 36, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
      >
        + Agregar comentario
      </button>
    </div>
  )
}

// --- componente principal ----------------------------------------------

export default function FichaTecnica({ value = {}, onChange }) {
  const [abierta, setAbierta] = useState('equipamiento')

  const toggleSeccion = (key) => setAbierta((prev) => (prev === key ? null : key))

  const setFicha = (campo) => (v) => onChange({ ...value, [campo]: v })

  const situacion = value.situacion_fiscal_legal || {}
  const setSituacion = (campo) => (v) => setFicha('situacion_fiscal_legal')({ ...situacion, [campo]: v })

  return (
    <div>
      <Seccion titulo="Equipamiento y amenidades" abierta={abierta === 'equipamiento'} onToggle={() => toggleSeccion('equipamiento')}>
        <SeccionEquipamiento equipamiento={value.equipamiento || {}} onChange={setFicha('equipamiento')} />
      </Seccion>

      <Seccion titulo="Historial de la propiedad" abierta={abierta === 'historial'} onToggle={() => toggleSeccion('historial')}>
        <TextArea
          label="Historial"
          value={value.historial_propiedad}
          onChange={setFicha('historial_propiedad')}
          rows={4}
          placeholder="Registro de propietarios anteriores, remodelaciones, etc."
        />
      </Seccion>

      <Seccion titulo="Situación fiscal y legal" abierta={abierta === 'legal'} onToggle={() => toggleSeccion('legal')}>
        <TriToggle label="Al corriente de pagos/impuestos" value={situacion.al_corriente} onChange={setSituacion('al_corriente')} />
        <div style={{ marginTop: 12 }}>
          <TextArea label="Gravámenes" value={situacion.gravamenes} onChange={setSituacion('gravamenes')} rows={2} />
        </div>
        <ChipGroup
          label="Esquemas de pago aceptados"
          options={ESQUEMAS_PAGO}
          value={situacion.esquemas_pago_aceptados}
          onChange={setSituacion('esquemas_pago_aceptados')}
        />
        <TextArea label="Notas" value={situacion.notas} onChange={setSituacion('notas')} rows={2} />
      </Seccion>

      <Seccion titulo="Comentarios" abierta={abierta === 'comentarios'} onToggle={() => toggleSeccion('comentarios')}>
        <SeccionComentarios comentarios={value.comentarios || []} onChange={setFicha('comentarios')} />
      </Seccion>
    </div>
  )
}
