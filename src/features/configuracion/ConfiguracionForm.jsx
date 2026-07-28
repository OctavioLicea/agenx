// src/features/configuracion/ConfiguracionForm.jsx
// Motivo: FEAT — 27 jul 2026 (sesión 24). Módulo "Configuración"
//   (engrane en el TopBar), pedido de Okta: Mi Perfil se estaba
//   convirtiendo en un cajón de configuración. Aquí viven las secciones
//   que son AJUSTES de la app, movidas tal cual desde PerfilForm.jsx:
//   Requisitos de renta (plantillas), Página pública (tema) y Seguridad
//   (PIN de la Bóveda). Perfil se queda con la IDENTIDAD del asesor
//   (nombre, iniciales, correo público, foto, logo, color).
//   Sección nueva "Mi equipo": co-asesores por correo (máx 5), base del
//   sistema de colaboración — el correo puede no tener cuenta todavía;
//   el botón "Invitar a TuAsesor" abre un mailto con la liga a /registro
//   (misma decisión de cero infra: sin Edge Functions ni servicio de
//   correo; el correo de invitación sale de la app de correo del asesor).
//   El semáforo "con cuenta" es equipo_miembros.miembro_uid, que llenan
//   el trigger de perfiles (cuentas nuevas) o reclamar_membresias()
//   (cuentas que ya existían).
// Timestamp: 2026-07-27

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { generarSalt, hashPin, verificarPin, PIN_LARGO } from '../../lib/bovedaPin'

const LIMITE_EQUIPO = 5
const LIGA_REGISTRO = 'https://tuasesor.eventosytech.com/registro'

// Estandarización (misma sesión 24, feedback de Okta con captura): las
// secciones iban sobre caliza (--ta-bg) y con títulos desalineados —
// unos a la izquierda con ícono, otros centrados sin él. Estándar nuevo,
// tomado del lenguaje ya existente en el wizard de propiedades
// (GrupoCampos de FichaBasico/FichaTecnica): tarjeta blanca con borde de
// 0.5px + acento lateral de 3px, y las 4 secciones con el mismo
// encabezado — ícono + título a la izquierda, subtítulo muted debajo,
// textAlign explícito para matar cualquier centrado heredado.
const tarjetaSeccion = {
  background: '#FFFFFF',
  border: '0.5px solid var(--ta-border)',
  borderLeft: '3px solid var(--ta-detail)',
  borderRadius: 12,
  padding: 16,
  marginBottom: 14,
  textAlign: 'left',
}

function EncabezadoSeccion({ icono, titulo, subtitulo }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'flex', color: 'var(--ta-accent)' }}>{icono}</span>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--ta-text)', textAlign: 'left' }}>{titulo}</p>
      </div>
      {subtitulo && (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--ta-text-muted)', textAlign: 'left' }}>{subtitulo}</p>
      )}
    </div>
  )
}

function IconoCandado() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function IconoEquipo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.3 3-6 7-6s7 2.7 7 6" />
      <path d="M17 8a3 3 0 1 1 4 2.8" />
      <path d="M22 20c0-2.4-1.7-4.5-4-5.4" />
    </svg>
  )
}

function IconoX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function IconoDocumento() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  )
}

function IconoGlobo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

// Mismo componente que en PerfilForm.jsx (copiado, no importado — importar
// desde PerfilForm arrastraría ese archivo completo a este chunk lazy).
function CampoTextoLargo({ label, value, onChange, placeholder, rows = 5 }) {
  const [valor, setValor] = useState(value || '')

  useEffect(() => {
    setValor(value || '')
  }, [value])

  const confirmar = () => {
    if (valor.trim() !== (value || '').trim()) onChange(valor)
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 13, color: 'var(--ta-text)', margin: '0 0 6px' }}>{label}</p>
      <textarea
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={confirmar}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 10,
          border: '0.5px solid var(--ta-border)',
          background: '#FFFFFF',
          color: 'var(--ta-text)',
          fontSize: 13,
          fontFamily: 'inherit',
          lineHeight: 1.5,
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// Mismo componente que en PerfilForm.jsx (copiado por la misma razón).
function InputPin({ value, onChange, placeholder, autoFocus }) {
  return (
    <input
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={PIN_LARGO}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, PIN_LARGO))}
      placeholder={placeholder}
      style={{
        width: '100%', height: 40, borderRadius: 8, border: '0.5px solid var(--ta-border)',
        background: '#FFFFFF', color: 'var(--ta-text)', fontSize: 18, letterSpacing: 6,
        textAlign: 'center', boxSizing: 'border-box',
      }}
    />
  )
}

const correoValido = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)

export default function ConfiguracionForm({ user }) {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // Plantillas de requisitos de renta (movido de PerfilForm).
  const [plantillaReqFisica, setPlantillaReqFisica] = useState('')
  const [plantillaReqMoral, setPlantillaReqMoral] = useState('')

  // Tema de la página pública (movido de PerfilForm).
  const [estiloPaginaPublica, setEstiloPaginaPublica] = useState('estandar')
  const [accesoTemaElegante, setAccesoTemaElegante] = useState(false)
  const [accesoTemaNocturno, setAccesoTemaNocturno] = useState(false)

  // Seguridad — PIN de la Bóveda (movido de PerfilForm).
  const [bovedaPinHash, setBovedaPinHash] = useState(null)
  const [bovedaPinSalt, setBovedaPinSalt] = useState(null)
  const [mostrarFormPin, setMostrarFormPin] = useState(false)
  const [pinActual, setPinActual] = useState('')
  const [pinNuevo, setPinNuevo] = useState('')
  const [pinConfirmar, setPinConfirmar] = useState('')
  const [errorPin, setErrorPin] = useState(null)
  const [guardandoPin, setGuardandoPin] = useState(false)

  // Mi equipo (nuevo, sesión 24).
  const [miembros, setMiembros] = useState([])
  const [correoNuevo, setCorreoNuevo] = useState('')
  const [agregandoMiembro, setAgregandoMiembro] = useState(false)
  const [errorEquipo, setErrorEquipo] = useState(null)

  useEffect(() => {
    if (!user) return
    let activo = true

    Promise.all([
      supabase
        .from('perfiles')
        .select('plantilla_requisitos_renta_fisica, plantilla_requisitos_renta_moral, estilo_pagina_publica, acceso_tema_elegante, acceso_tema_nocturno, boveda_pin_hash, boveda_pin_salt')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('equipo_miembros')
        .select('id, correo, miembro_uid, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true }),
    ]).then(([perfilRes, equipoRes]) => {
      if (!activo) return
      if (perfilRes.error || equipoRes.error) {
        setError('No se pudo cargar la configuración.')
      } else {
        const data = perfilRes.data
        if (data) {
          setPlantillaReqFisica(data.plantilla_requisitos_renta_fisica || '')
          setPlantillaReqMoral(data.plantilla_requisitos_renta_moral || '')
          setEstiloPaginaPublica(data.estilo_pagina_publica || 'estandar')
          setAccesoTemaElegante(data.acceso_tema_elegante === true)
          setAccesoTemaNocturno(data.acceso_tema_nocturno === true)
          setBovedaPinHash(data.boveda_pin_hash || null)
          setBovedaPinSalt(data.boveda_pin_salt || null)
        }
        setMiembros(equipoRes.data || [])
      }
      setCargando(false)
    })

    return () => { activo = false }
  }, [user])

  // Autosave de un campo del perfil — mismo patrón que PerfilForm.
  const guardarCampoPerfil = async (columna, valor, setLocal) => {
    setLocal(valor)
    const { error: saveError } = await supabase.from('perfiles').upsert({
      id: user.id,
      [columna]: typeof valor === 'string' ? (valor.trim() || null) : valor,
    })
    if (saveError) setError('No se pudo guardar el cambio. Intenta de nuevo.')
    else setError(null)
  }

  const actualizarEstiloPaginaPublica = async (estilo) => {
    setEstiloPaginaPublica(estilo)
    await supabase.from('perfiles').upsert({ id: user.id, estilo_pagina_publica: estilo })
  }

  // ---- PIN de la Bóveda (idéntico a como vivía en PerfilForm) ----

  const resetFormPin = () => {
    setMostrarFormPin(false)
    setPinActual('')
    setPinNuevo('')
    setPinConfirmar('')
    setErrorPin(null)
  }

  const guardarPin = async () => {
    setErrorPin(null)

    if (bovedaPinHash) {
      const actualOk = await verificarPin(pinActual, bovedaPinSalt, bovedaPinHash)
      if (!actualOk) {
        setErrorPin('El PIN actual no es correcto.')
        return
      }
    }
    if (pinNuevo.length !== PIN_LARGO) {
      setErrorPin(`El PIN debe tener ${PIN_LARGO} dígitos.`)
      return
    }
    if (pinNuevo !== pinConfirmar) {
      setErrorPin('Los dos PIN no coinciden.')
      return
    }

    setGuardandoPin(true)
    const salt = generarSalt()
    const hash = await hashPin(pinNuevo, salt)

    const { error: saveError } = await supabase.from('perfiles').upsert({
      id: user.id,
      boveda_pin_hash: hash,
      boveda_pin_salt: salt,
    })
    setGuardandoPin(false)

    if (saveError) {
      setErrorPin('No se pudo guardar el PIN. Intenta de nuevo.')
      return
    }

    setBovedaPinHash(hash)
    setBovedaPinSalt(salt)
    resetFormPin()
  }

  const quitarPin = async () => {
    const ok = window.confirm('¿Quitar el PIN de la Bóveda? Cualquiera que abra la app podrá ver los documentos de tus propiedades sin código.')
    if (!ok) return

    const { error: saveError } = await supabase.from('perfiles').upsert({
      id: user.id,
      boveda_pin_hash: null,
      boveda_pin_salt: null,
    })
    if (saveError) {
      setError('No se pudo quitar el PIN. Intenta de nuevo.')
      return
    }
    setBovedaPinHash(null)
    setBovedaPinSalt(null)
    sessionStorage.removeItem('ta_boveda_unlocked')
  }

  // ---- Mi equipo ----

  const agregarMiembro = async () => {
    const correo = correoNuevo.trim().toLowerCase()
    setErrorEquipo(null)

    if (!correoValido(correo)) {
      setErrorEquipo('Escribe un correo válido.')
      return
    }
    if (correo === (user?.email || '').toLowerCase()) {
      setErrorEquipo('Ese es tu propio correo.')
      return
    }
    if (miembros.length >= LIMITE_EQUIPO) {
      setErrorEquipo(`El equipo admite máximo ${LIMITE_EQUIPO} co-asesores.`)
      return
    }

    setAgregandoMiembro(true)
    const { data, error: insError } = await supabase
      .from('equipo_miembros')
      .insert({ owner_id: user.id, correo })
      .select('id, correo, miembro_uid, created_at')
      .single()
    setAgregandoMiembro(false)

    if (insError) {
      setErrorEquipo(
        insError.code === '23505'
          ? 'Ese correo ya está en tu equipo.'
          : 'No se pudo agregar. Intenta de nuevo.'
      )
      return
    }

    setMiembros((prev) => [...prev, data])
    setCorreoNuevo('')
  }

  const quitarMiembro = async (miembro) => {
    const ok = window.confirm(
      `¿Quitar a ${miembro.correo} de tu equipo? Perderá el acceso a todas las propiedades que le hayas compartido.`
    )
    if (!ok) return

    const { error: delError } = await supabase.from('equipo_miembros').delete().eq('id', miembro.id)
    if (delError) {
      setErrorEquipo('No se pudo quitar. Intenta de nuevo.')
      return
    }
    setMiembros((prev) => prev.filter((m) => m.id !== miembro.id))
  }

  // Invitación por mailto (misma decisión de arquitectura que el resto de
  // los correos de la app): el mensaje sale de la app de correo del
  // asesor, con la liga a /registro. La cuenta se crea allá, no aquí.
  // Es un <a href> (como los mailto de ContactoForm), no una asignación a
  // window.location — el linter (react-hooks/immutability) marca esa
  // asignación en componentes nuevos.
  const ligaInvitacion = (miembro) => {
    const asunto = 'Invitación a TuAsesor'
    const cuerpo = [
      'Hola,',
      '',
      'Te invito a colaborar conmigo en TuAsesor, el CRM inmobiliario que uso para administrar mis propiedades.',
      '',
      `Crea tu cuenta aquí con este mismo correo (${miembro.correo}):`,
      LIGA_REGISTRO,
      '',
      'Al entrar, define tu contraseña y completa tu perfil. Nos vemos adentro.',
    ].join('\n')
    return `mailto:${miembro.correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
  }

  if (cargando) {
    return (
      <p style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--ta-text-muted)' }}>
        Cargando configuración...
      </p>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      <div
        style={{
          background: 'var(--ta-surface)',
          border: '0.5px solid var(--ta-border)',
          borderRadius: 16,
          padding: '28px 20px',
        }}
      >
        {/* ---- Mi equipo ---- */}
        <div style={tarjetaSeccion}>
          <EncabezadoSeccion
            icono={<IconoEquipo />}
            titulo="Mi equipo"
            subtitulo={`Co-asesores con los que puedes compartir propiedades (máximo ${LIMITE_EQUIPO}). Si aún no tienen cuenta, invítalos — el acceso se activa cuando se registren con ese mismo correo.`}
          />

          {miembros.length > 0 && (
            <div style={{ border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 10, background: '#FFFFFF' }}>
              {miembros.map((m, idx) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 4px 8px 12px',
                    borderTop: idx === 0 ? 'none' : '0.5px solid var(--ta-border)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ta-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.correo}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: m.miembro_uid ? 'var(--ta-accent)' : 'var(--ta-text-muted)' }}>
                      {m.miembro_uid ? 'Con cuenta' : 'Sin cuenta todavía'}
                    </p>
                  </div>
                  {!m.miembro_uid && (
                    <a
                      href={ligaInvitacion(m)}
                      style={{
                        height: 44, display: 'flex', alignItems: 'center', color: 'var(--ta-accent)',
                        fontSize: 12, cursor: 'pointer', flexShrink: 0, padding: '0 6px',
                        textDecoration: 'none',
                      }}
                    >
                      Invitar a TuAsesor
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => quitarMiembro(m)}
                    aria-label={`Quitar a ${m.correo} del equipo`}
                    style={{
                      width: 44, height: 44, flexShrink: 0, border: 'none', background: 'none',
                      color: 'var(--ta-text-muted)', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <IconoX />
                  </button>
                </div>
              ))}
            </div>
          )}

          {miembros.length < LIMITE_EQUIPO && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                value={correoNuevo}
                onChange={(e) => setCorreoNuevo(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarMiembro() } }}
                placeholder="correo@ejemplo.com"
                style={{
                  flex: 1, height: 44, padding: '0 12px', borderRadius: 10,
                  border: '0.5px solid var(--ta-border)', background: '#FFFFFF',
                  color: 'var(--ta-text)', fontSize: 14, boxSizing: 'border-box', minWidth: 0,
                }}
              />
              <button
                type="button"
                onClick={agregarMiembro}
                disabled={agregandoMiembro}
                style={{
                  height: 44, padding: '0 16px', borderRadius: 10, border: 'none',
                  background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 13,
                  fontWeight: 500, cursor: agregandoMiembro ? 'default' : 'pointer',
                  opacity: agregandoMiembro ? 0.6 : 1, flexShrink: 0,
                }}
              >
                {agregandoMiembro ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
          )}

          {errorEquipo && (
            <p role="alert" style={{ color: '#993C1D', fontSize: 12, margin: '10px 0 0' }}>{errorEquipo}</p>
          )}
        </div>

        {/* ---- Requisitos de renta (movido de Mi Perfil) ---- */}
        <div style={tarjetaSeccion}>
          <EncabezadoSeccion
            icono={<IconoDocumento />}
            titulo="Requisitos de renta"
            subtitulo="Se precarga automáticamente en cada propiedad nueva que pongas en renta — puedes ajustarla después, propiedad por propiedad."
          />
          <CampoTextoLargo
            label="Persona física"
            value={plantillaReqFisica}
            onChange={(v) => guardarCampoPerfil('plantilla_requisitos_renta_fisica', v, setPlantillaReqFisica)}
            placeholder={'• Identificación oficial\n• Comprobante de domicilio\n• Comprobante de ingresos\n• Aval o fiador'}
          />
          <CampoTextoLargo
            label="Persona moral"
            value={plantillaReqMoral}
            onChange={(v) => guardarCampoPerfil('plantilla_requisitos_renta_moral', v, setPlantillaReqMoral)}
            placeholder={'• Acta constitutiva\n• Poder del representante legal\n• Comprobante de domicilio fiscal\n• Estados financieros'}
          />
        </div>

        {/* ---- Página pública (movido de Mi Perfil) ---- */}
        <div style={tarjetaSeccion}>
          <EncabezadoSeccion
            icono={<IconoGlobo />}
            titulo="Página pública"
            subtitulo="Estilo visual de la ficha que ven tus clientes en el link público de cada propiedad."
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => actualizarEstiloPaginaPublica('estandar')}
              style={{
                flex: '1 1 140px', textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                border: estiloPaginaPublica === 'estandar' ? '1.5px solid var(--ta-accent)' : '0.5px solid var(--ta-border)',
                background: '#fff',
              }}
            >
              <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 500, color: 'var(--ta-text)' }}>Estándar</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--ta-text-muted)' }}>Verde y caliza, el de siempre</p>
            </button>

            {accesoTemaElegante && (
              <button
                type="button"
                onClick={() => actualizarEstiloPaginaPublica('elegante')}
                style={{
                  flex: '1 1 140px', textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  border: estiloPaginaPublica === 'elegante' ? '1.5px solid var(--ta-accent)' : '0.5px solid var(--ta-border)',
                  background: '#fff',
                }}
              >
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 500, color: 'var(--ta-text)' }}>Elegance</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--ta-text-muted)' }}>Blanco y dorado, look de alta plusvalía</p>
              </button>
            )}

            {accesoTemaNocturno && (
              <button
                type="button"
                onClick={() => actualizarEstiloPaginaPublica('nocturno')}
                style={{
                  flex: '1 1 140px', textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  border: estiloPaginaPublica === 'nocturno' ? '1.5px solid var(--ta-accent)' : '0.5px solid var(--ta-border)',
                  background: '#fff',
                }}
              >
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 500, color: 'var(--ta-text)' }}>Nocturno</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--ta-text-muted)' }}>Negro y dorado, minimalista de lujo</p>
              </button>
            )}
          </div>
        </div>

        {/* ---- Seguridad (movido de Mi Perfil) ---- */}
        <div style={{ ...tarjetaSeccion, marginBottom: 0 }}>
          <EncabezadoSeccion
            icono={<IconoCandado />}
            titulo="Seguridad"
            subtitulo="PIN de acceso a la Bóveda de documentos."
          />

          {!mostrarFormPin ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 13, color: 'var(--ta-text)' }}>
                  PIN de la Bóveda {bovedaPinHash ? '· activo' : '· sin configurar'}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--ta-text-muted)' }}>
                  Pide un código de 4 dígitos para abrir los documentos de una propiedad.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setMostrarFormPin(true)}
                  style={{ border: 'none', background: 'none', color: 'var(--ta-accent)', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'right' }}
                >
                  {bovedaPinHash ? 'Cambiar' : 'Configurar'}
                </button>
                {bovedaPinHash && (
                  <button
                    type="button"
                    onClick={quitarPin}
                    style={{ border: 'none', background: 'none', color: '#993C1D', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'right' }}
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              {bovedaPinHash && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--ta-text-muted)' }}>PIN actual</p>
                  <InputPin value={pinActual} onChange={setPinActual} placeholder="····" autoFocus />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--ta-text-muted)' }}>PIN nuevo</p>
                  <InputPin value={pinNuevo} onChange={setPinNuevo} placeholder="····" autoFocus={!bovedaPinHash} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--ta-text-muted)' }}>Confirmar</p>
                  <InputPin value={pinConfirmar} onChange={setPinConfirmar} placeholder="····" />
                </div>
              </div>
              {errorPin && <p style={{ color: '#993C1D', fontSize: 12, margin: '0 0 10px' }}>{errorPin}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={resetFormPin}
                  disabled={guardandoPin}
                  style={{ flex: 1, height: 38, borderRadius: 8, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)', fontSize: 13 }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarPin}
                  disabled={guardandoPin}
                  style={{ flex: 2, height: 38, borderRadius: 8, border: 'none', background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 13, fontWeight: 500, opacity: guardandoPin ? 0.6 : 1 }}
                >
                  {guardandoPin ? 'Guardando...' : 'Guardar PIN'}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" style={{ color: '#993C1D', fontSize: 13, margin: '20px 0 0' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
