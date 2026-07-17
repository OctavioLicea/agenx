// src/features/propiedades/PropiedadForm.jsx
// Motivo: FEAT — renombres de pestañas: "Documentos" → "Bóveda" (para que
//   quede asociada de entrada a algo seguro/privado, no solo "una carpeta
//   más") y "Colaboradores" → "Colabs" (los 5 labels ya se amontonaban en
//   una fila desde que se agregó Documentos). Se agregó un ícono distinto
//   por pestaña (antes solo texto, "poca personalidad" según Okta) —
//   ícono arriba, label abajo, mismo patrón visual que una barra de
//   navegación inferior aunque esté arriba del wizard.
// Timestamp: 2026-07-08, 22:35 hrs

import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { usePropiedad, PROPIEDAD_VACIA } from './hooks/usePropiedad'
import FichaBasico from './tabs/FichaBasico'
import FichaMediaUbic from './tabs/FichaMediaUbic'
import FichaColaboradores from './tabs/FichaColaboradores'
import FichaTecnica from './tabs/FichaTecnica'
import FichaDocumentos from './tabs/FichaDocumentos'
// Sesión 16: lazy — ExportaFicha carga @react-pdf/renderer, el paquete
// más pesado del bundle, y solo hace falta cuando de verdad se exporta
// un PDF (no en cada apertura del wizard de Propiedades).
const ExportaFicha = lazy(() => import('./ExportaFicha'))

const PASOS = [
  { key: 'basico', label: 'Básico' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'ficha', label: 'Ficha' },
  { key: 'colaboradores', label: 'Colabs' },
  { key: 'documentos', label: 'Bóveda' },
]

// Campos obligatorios en la BD (not null) que se capturan en "Básico".
// "titulo" se valida aquí a nivel app (no es NOT NULL en BD todavía, ver
// nota en migracion_basico_2026-07-04.sql).
const CAMPOS_OBLIGATORIOS_BASICO = [
  { campo: 'titulo', label: 'Título' },
  { campo: 'tipo', label: 'Tipo' },
  { campo: 'operacion', label: 'Operación' },
  { campo: 'uso', label: 'Uso' },
  { campo: 'zona', label: 'Zona' },
]

function validarBasico(propiedad) {
  const faltantes = CAMPOS_OBLIGATORIOS_BASICO
    .filter(({ campo }) => !propiedad[campo] || (typeof propiedad[campo] === 'string' && !propiedad[campo].trim()))
    .map(({ label }) => label)

  if (propiedad.tipo === 'otro' && !propiedad.tipo_otro?.trim()) {
    faltantes.push('Tipo (especificar)')
  }

  return faltantes
}

// Sesión 20 (17 jul 2026): ícono de liga pública (cadena/link) — mismo
// grosor de trazo (1.8) que el resto de los íconos del header.
function IconoLigaPublica() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function IconoCerrar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function IconoLapiz() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function IconoExportar() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </svg>
  )
}

// Íconos de las pestañas — uno distinto por sección, mismo estilo de
// trazo (stroke, currentColor) que el resto de íconos del wizard. Elegidos
// para reforzar el significado de cada pestaña de un vistazo: casa
// (Básico), cámara (Fotos), hoja con líneas (Ficha técnica), personas
// (Colabs), candado (Bóveda — asociación directa con "seguro/privado").
function IconoTabBasico() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  )
}

function IconoTabFotos() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function IconoTabFicha() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  )
}

function IconoTabColabs() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconoTabBoveda() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

const ICONOS_TAB = {
  basico: IconoTabBasico,
  fotos: IconoTabFotos,
  ficha: IconoTabFicha,
  colaboradores: IconoTabColabs,
  documentos: IconoTabBoveda,
}

// Título protagonista, editable in-line, visible en las 4 pestañas.
// El guardado real en BD lo dispara un debounce en el componente padre
// (no aquí) — este componente solo actualiza el estado local vía onChange.
function TituloFicha({ titulo, onChange }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(titulo || '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!editando) setValor(titulo || '')
  }, [titulo, editando])

  useEffect(() => {
    if (editando) inputRef.current?.focus()
  }, [editando])

  const confirmar = () => {
    setEditando(false)
    if (valor.trim() !== (titulo || '').trim()) {
      onChange(valor.trim())
    }
  }

  if (editando) {
    return (
      <input
        ref={inputRef}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
        placeholder="Título de la propiedad"
        style={{
          width: '100%',
          fontSize: 18,
          fontWeight: 500,
          color: 'var(--ta-text)',
          border: 'none',
          borderBottom: '1px solid var(--ta-accent)',
          background: 'none',
          padding: '2px 0',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <p
        onClick={() => setEditando(true)}
        style={{
          flex: 1, margin: 0, fontSize: 18, fontWeight: 500, cursor: 'text',
          color: titulo ? 'var(--ta-text)' : 'var(--ta-text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {titulo || 'Título de la propiedad'}
      </p>
      <button
        type="button"
        onClick={() => setEditando(true)}
        aria-label="Editar título"
        style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}
      >
        <IconoLapiz />
      </button>
    </div>
  )
}

function TabsFicha({ pasoActivo, bloqueado, onCambiar }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 10, overflowX: 'auto' }}>
      {PASOS.map((p) => {
        const activo = p.key === pasoActivo
        const deshabilitado = bloqueado && p.key !== 'basico'
        const Icono = ICONOS_TAB[p.key]
        return (
          <button
            key={p.key}
            type="button"
            disabled={deshabilitado}
            onClick={() => onCambiar(p.key)}
            style={{
              flex: 1,
              minWidth: 64,
              padding: '8px 0 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              fontSize: 11,
              fontWeight: activo ? 500 : 400,
              letterSpacing: '0.02em',
              border: 'none',
              borderBottom: activo ? '2px solid var(--ta-accent)' : '2px solid var(--ta-border)',
              borderRadius: 0,
              background: 'none',
              color: deshabilitado ? 'var(--ta-border)' : activo ? 'var(--ta-accent)' : 'var(--ta-text-muted)',
              cursor: deshabilitado ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Icono />
            {p.label.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

export default function PropiedadForm({ propiedadInicial, onGuardado }) {
  const { propiedad, actualizar, guardar, guardando, error } = usePropiedad(propiedadInicial ?? PROPIEDAD_VACIA)
  const [paso, setPaso] = useState('basico')
  const [camposFaltantes, setCamposFaltantes] = useState([])
  const [mostrarExport, setMostrarExport] = useState(false)
  const [ligaCopiada, setLigaCopiada] = useState(false)
  const ultimoGuardado = useRef(JSON.stringify(propiedad))

  const idxActual = PASOS.findIndex((p) => p.key === paso)
  const bloqueado = !propiedad.id

  // Autosave general (debounced) — cualquier cambio en la ficha (no solo el
  // título) se persiste solo, una vez que existe el borrador (propiedad.id).
  // Reemplaza al botón "Guardar propiedad" del último paso.
  useEffect(() => {
    if (!propiedad.id) return
    const actual = JSON.stringify(propiedad)
    if (actual === ultimoGuardado.current) return
    const t = setTimeout(() => {
      guardar()
      ultimoGuardado.current = actual
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 600)
    return () => clearTimeout(t)
  }, [propiedad])

  // Solo se usa desde Básico + propiedad nueva (ver botón condicional más
  // abajo) — valida, crea el borrador en BD, y avanza a "Fotos".
  const guardarYContinuar = async () => {
    const faltantes = validarBasico(propiedad)
    if (faltantes.length > 0) {
      setCamposFaltantes(faltantes)
      return
    }

    setCamposFaltantes([])

    const res = await guardar()
    if (!res.ok) return // no avanza si falló el guardado del borrador
    ultimoGuardado.current = JSON.stringify({ ...propiedad, id: res.data?.id ?? propiedad.id })

    setPaso('fotos')
  }

  const cambiarPaso = (key) => {
    if (bloqueado && key !== 'basico') return // tab bloqueada en alta nueva
    setCamposFaltantes([])
    setPaso(key)
  }

  const cerrar = async () => {
    if (propiedad.id) {
      await guardar() // guardado forzado, por si el autosave aún no disparó
    }
    onGuardado?.(propiedad)
  }

  // Confirm nativo antes de abrir el modal — el header ahora tiene 2
  // botones (exportar + cerrar), mismo criterio de fricción deliberada
  // que "Quitar" en Colaboradores/Contactos.
  const abrirExportar = () => {
    const ok = window.confirm('¿Exportar la ficha de esta propiedad a PDF?')
    if (!ok) return
    setMostrarExport(true)
  }

  // Sesión 20 (17 jul 2026): copia la liga pública (/p/:id) al portapapeles.
  // Solo aparece cuando propiedad.publicado es true — el toggle vive en
  // FichaBasico.jsx. Feedback visual simple (cambia el ícono 2s), mismo
  // criterio "sin dependencias nuevas" del resto del proyecto.
  const copiarLigaPublica = async () => {
    const url = `https://tuasesor.eventosytech.com/p/${propiedad.id}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copia la liga:', url)
      return
    }
    setLigaCopiada(true)
    setTimeout(() => setLigaCopiada(false), 2000)
  }

  return (
    <div style={{ background: 'var(--ta-bg)', display: 'flex', justifyContent: 'center', minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--ta-surface)', display: 'flex', flexDirection: 'column' }}>

        {/* Header fijo: título editable + tabs. top:56 = justo debajo del
            TopBar (que ya es sticky top:0 con 56px de alto). */}
        <div
          style={{
            position: 'sticky',
            top: 56,
            zIndex: 5,
            background: 'var(--ta-surface)',
            borderBottom: '0.5px solid var(--ta-border)',
            padding: '14px 16px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <TituloFicha titulo={propiedad.titulo} onChange={(v) => actualizar({ titulo: v })} />
            </div>
            <button
              type="button"
              onClick={abrirExportar}
              disabled={guardando || bloqueado}
              aria-label="Exportar ficha a PDF"
              title={bloqueado ? 'Guarda la propiedad primero para poder exportarla' : 'Exportar ficha a PDF'}
              style={{
                width: 32, height: 32, flexShrink: 0, border: 'none', borderRadius: 8,
                background: 'var(--ta-bg)', color: bloqueado ? 'var(--ta-border)' : 'var(--ta-text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: bloqueado ? 'not-allowed' : 'pointer',
              }}
            >
              <IconoExportar />
            </button>
            {propiedad.publicado && !bloqueado && (
              <button
                type="button"
                onClick={copiarLigaPublica}
                aria-label="Copiar liga pública"
                title={ligaCopiada ? '¡Copiada!' : 'Copiar liga pública'}
                style={{
                  width: 32, height: 32, flexShrink: 0, border: 'none', borderRadius: 8,
                  background: ligaCopiada ? 'var(--ta-accent)' : 'var(--ta-bg)',
                  color: ligaCopiada ? 'var(--ta-on-accent)' : 'var(--ta-text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <IconoLigaPublica />
              </button>
            )}
            <button
              type="button"
              onClick={cerrar}
              disabled={guardando}
              aria-label="Cerrar ficha de propiedad"
              style={{
                width: 32, height: 32, flexShrink: 0, border: 'none', borderRadius: 8,
                background: 'var(--ta-bg)', color: 'var(--ta-text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <IconoCerrar />
            </button>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ta-text-muted)', height: 14, visibility: guardando ? 'visible' : 'hidden' }}>
            Guardando...
          </p>
          <TabsFicha pasoActivo={paso} bloqueado={bloqueado} onCambiar={cambiarPaso} />
        </div>

        <div style={{ flex: 1, padding: '1rem' }}>
          {paso === 'basico' && <FichaBasico value={propiedad} onChange={actualizar} />}

          {paso === 'fotos' && (
            <FichaMediaUbic
              propiedadId={propiedad.id}
              ubicacion={{ lat: propiedad.lat, lng: propiedad.lng, ubicacion_origen: propiedad.ubicacion_origen, direccion: propiedad.direccion }}
              onUbicacionChange={(u) => actualizar(u)}
              ubicacionConectividad={propiedad.ficha?.ubicacion_conectividad}
              onUbicacionConectividadChange={(v) => actualizar({ ficha: { ...propiedad.ficha, ubicacion_conectividad: v } })}
            />
          )}

          {paso === 'ficha' && (
            <FichaTecnica
              value={propiedad.ficha}
              onChange={(nuevaFicha) => actualizar({ ficha: nuevaFicha })}
            />
          )}

          {paso === 'colaboradores' && <FichaColaboradores propiedadId={propiedad.id} propiedadTitulo={propiedad.titulo} />}

          {paso === 'documentos' && <FichaDocumentos propiedadId={propiedad.id} />}

          {(camposFaltantes.length > 0 || error) && (
            <div style={{ marginTop: '1rem' }}>
              {camposFaltantes.length > 0 && (
                <p style={{ color: '#993C1D', fontSize: 13, margin: 0 }}>
                  Falta completar: {camposFaltantes.join(', ')}
                </p>
              )}
              {error && (
                <p style={{ color: '#993C1D', fontSize: 13, margin: 0 }}>
                  Error al guardar: {error}
                </p>
              )}
            </div>
          )}

          {/* Solo tiene sentido este botón en Básico + propiedad nueva —
              es el paso que crea el borrador y desbloquea las demás
              pestañas. Una vez que existe propiedad.id, los tabs ya
              resuelven toda la navegación y "Cerrar" vive en el header. */}
          {paso === 'basico' && bloqueado && (
            <button
              type="button"
              onClick={guardarYContinuar}
              disabled={guardando}
              style={{
                width: '100%',
                height: 44,
                marginTop: '1.5rem',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(160deg, color-mix(in srgb, var(--ta-accent) 82%, white 18%), var(--ta-accent) 55%, color-mix(in srgb, var(--ta-accent) 85%, black 15%))',
                color: 'var(--ta-on-accent)',
                fontSize: 14,
                fontWeight: 500,
                opacity: guardando ? 0.6 : 1,
              }}
            >
              {guardando ? 'Guardando borrador...' : 'Guardar y continuar'}
            </button>
          )}
        </div>
      </div>

      {mostrarExport && (
        <Suspense fallback={<p style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--ta-text-muted)' }}>Cargando...</p>}>
          <ExportaFicha propiedad={propiedad} onCerrar={() => setMostrarExport(false)} />
        </Suspense>
      )}
    </div>
  )
}
