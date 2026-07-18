// src/features/perfil/PerfilForm.jsx
// Motivo: FEAT — se habilita la sección "Marca" (antes deshabilitada,
//   badge "Próximamente"): subida de logo_url (mismo patrón de
//   compresión/upload que avatar, pero en PNG para conservar
//   transparencia — los logos suelen tener fondo transparente, a
//   diferencia de la foto de avatar) y selector de color_acento. Ambos
//   quedan disponibles porque ExportaFicha.jsx (PDF de ficha técnica)
//   los necesita para poner marca del asesor en el PDF. Se queda
//   "tarjeta de presentación" fuera por ahora — eso sigue en Fase 2.
//   [Actualización 2026-07-13, 23:40 hrs]: sección "Seguridad" — PIN de
//   4 dígitos para la Bóveda de documentos (FichaDocumentos.jsx), pedido
//   de Okta. Se guarda hasheado (boveda_pin_hash/boveda_pin_salt, nuevas
//   columnas en tuasesor.perfiles) vía src/lib/bovedaPin.js. Cambiar el
//   PIN pide el actual primero; quitarlo es directo con confirm(). El
//   flujo de "olvidé mi PIN" vive en FichaDocumentos.jsx (donde se pide
//   el PIN), no aquí — aquí solo se configura/cambia/quita.
// Timestamp: 2026-07-13, 23:40 hrs

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { generarSalt, hashPin, verificarPin, PIN_LARGO } from '../../lib/bovedaPin'

function crearId() {
  return Math.random().toString(36).slice(2, 9)
}

const BUCKET_AVATARES = 'bucket-perfil-avatares'
const COLOR_ACENTO_DEFAULT = '#1F3A2C' // verde bosque, mismo valor que --ta-accent

// Mismo patrón de compresión ya usado en FichaMediaUbic.jsx (canvas,
// 1920px máx, JPEG 0.82) — para avatar basta con un tamaño más chico.
function compressImage(file, maxPx = 480, quality = 0.85) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width > height) {
          height = Math.round((height * maxPx) / width)
          width = maxPx
        } else {
          width = Math.round((width * maxPx) / height)
          height = maxPx
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

// Igual que compressImage, pero siempre sale en PNG (sin pérdida, conserva
// transparencia) — un logo con fondo transparente convertido a JPEG se
// vería con fondo blanco/negro sólido, mal en el PDF. maxPx más grande
// (800) porque el logo puede terminar impreso en el PDF, no solo en un
// círculo de 64px como el avatar.
function compressLogoPng(file, maxPx = 800) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width > height) {
          height = Math.round((height * maxPx) / width)
          width = maxPx
        } else {
          width = Math.round((width * maxPx) / height)
          height = maxPx
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          resolve(new File([blob], 'logo.png', { type: 'image/png' }))
        },
        'image/png'
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

function IconoX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function IconoLapiz() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function IconoImagen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
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

// Input de PIN de 4 dígitos — solo dígitos, autoFocus opcional, mismo
// estilo visual que el resto de inputs del perfil.
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

// Fila de "Datos personales" editable in-line: etiqueta arriba, valor
// como texto plano abajo (clic o lápiz para editar), autosave al salir
// del campo. Es solo la FILA — el agrupamiento en una caja con divisores
// lo hace el padre (PerfilForm), igual que el mockup original.
function CampoEditable({ label, value, onChange, placeholder, requerido, esPrimero }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(value || '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!editando) setValor(value || '')
  }, [value, editando])

  useEffect(() => {
    if (editando) inputRef.current?.focus()
  }, [editando])

  const confirmar = () => {
    setEditando(false)
    if (valor.trim() !== (value || '').trim()) {
      onChange(valor.trim())
    }
  }

  return (
    <div
      style={{
        padding: '10px 12px',
        borderTop: esPrimero ? 'none' : '0.5px solid var(--ta-border)',
        textAlign: 'left',
      }}
    >
      <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--ta-text-muted)', textAlign: 'left' }}>
        {label}
        {requerido && <span style={{ color: 'var(--ta-detail)' }}> *</span>}
      </p>
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
            style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}
          >
            <IconoLapiz />
          </button>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  height: 44,
  padding: '0 12px',
  borderRadius: 10,
  border: '0.5px solid var(--ta-border)',
  background: '#FFFFFF',
  color: 'var(--ta-text)',
  fontSize: 14,
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: 13,
  color: 'var(--ta-text-muted)',
  marginBottom: 6,
}

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

export default function PerfilForm({ user, onGuardado, onPerfilActualizado }) {
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const [nombreCompleto, setNombreCompleto] = useState('')
  const [nombreCorto, setNombreCorto] = useState('')
  const [nombreComercial, setNombreComercial] = useState('')
  const [telefonos, setTelefonos] = useState([])
  const [redesSociales, setRedesSociales] = useState([])
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [subiendoAvatar, setSubiendoAvatar] = useState(false)
  const avatarInputRef = useRef(null)

  // Marca (logo + color de acento) — antes deshabilitado, ahora funcional.
  const [logoUrl, setLogoUrl] = useState(null)
  const [colorAcento, setColorAcento] = useState(COLOR_ACENTO_DEFAULT)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const logoInputRef = useRef(null)

  // Tema de la página pública (17 jul, sistema de temas) — un tema a la
  // vez por asesor. `accesoTemaElegante` decide si Elegance aparece como
  // opción; viene de una columna real (no un hardcode de quién es Nydia
  // en el código), la activa Okta a mano por asesor en Supabase.
  const [estiloPaginaPublica, setEstiloPaginaPublica] = useState('estandar')
  const [accesoTemaElegante, setAccesoTemaElegante] = useState(false)
  const [accesoTemaNocturno, setAccesoTemaNocturno] = useState(false)

  // Seguridad — PIN de la Bóveda. bovedaPinHash/Salt reflejan lo que hay
  // guardado en BD; el resto es estado local del mini-formulario de
  // configurar/cambiar PIN (nunca visible a la vez que el de "quitar").
  const [bovedaPinHash, setBovedaPinHash] = useState(null)
  const [bovedaPinSalt, setBovedaPinSalt] = useState(null)
  const [mostrarFormPin, setMostrarFormPin] = useState(false)
  const [pinActual, setPinActual] = useState('')
  const [pinNuevo, setPinNuevo] = useState('')
  const [pinConfirmar, setPinConfirmar] = useState('')
  const [errorPin, setErrorPin] = useState(null)
  const [guardandoPin, setGuardandoPin] = useState(false)

  useEffect(() => {
    if (!user) return

    supabase
      .from('perfiles')
      .select('nombre_completo, nombre_corto, nombre_comercial, telefonos, redes_sociales, avatar_url, logo_url, color_acento, boveda_pin_hash, boveda_pin_salt, estilo_pagina_publica, acceso_tema_elegante, acceso_tema_nocturno')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError('No se pudo cargar tu perfil.')
        } else if (data) {
          setNombreCompleto(data.nombre_completo || '')
          setNombreCorto(data.nombre_corto || '')
          setNombreComercial(data.nombre_comercial || '')
          setTelefonos(
            (data.telefonos || []).map((t) => ({ ...t, _id: crearId() }))
          )
          setRedesSociales(
            (data.redes_sociales || []).map((r) => ({ ...r, _id: crearId() }))
          )
          setAvatarUrl(data.avatar_url || null)
          setLogoUrl(data.logo_url || null)
          setColorAcento(data.color_acento || COLOR_ACENTO_DEFAULT)
          setBovedaPinHash(data.boveda_pin_hash || null)
          setBovedaPinSalt(data.boveda_pin_salt || null)
          setEstiloPaginaPublica(data.estilo_pagina_publica || 'estandar')
          setAccesoTemaElegante(data.acceso_tema_elegante === true)
          setAccesoTemaNocturno(data.acceso_tema_nocturno === true)
        }
        setCargando(false)
      })
  }, [user])

  const resetFormPin = () => {
    setMostrarFormPin(false)
    setPinActual('')
    setPinNuevo('')
    setPinConfirmar('')
    setErrorPin(null)
  }

  // Configurar (primera vez) o cambiar (pide el PIN actual primero) el PIN
  // de la Bóveda. Guarda hash + salt nuevos en tuasesor.perfiles — nunca
  // se guarda el PIN en claro, ni siquiera de paso.
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

  const agregarTelefono = () => {
    setTelefonos((prev) => [...prev, { _id: crearId(), etiqueta: '', numero: '' }])
  }

  const actualizarTelefono = (id, campo, valor) => {
    setTelefonos((prev) => prev.map((t) => (t._id === id ? { ...t, [campo]: valor } : t)))
  }

  const quitarTelefono = (id) => {
    setTelefonos((prev) => prev.filter((t) => t._id !== id))
  }

  const agregarRedSocial = () => {
    setRedesSociales((prev) => [...prev, { _id: crearId(), red: '', url: '' }])
  }

  const actualizarRedSocial = (id, campo, valor) => {
    setRedesSociales((prev) => prev.map((r) => (r._id === id ? { ...r, [campo]: valor } : r)))
  }

  const quitarRedSocial = (id) => {
    setRedesSociales((prev) => prev.filter((r) => r._id !== id))
  }

  // Autosave de un solo campo de "Datos personales" — se dispara al salir
  // del campo (blur), no espera al botón "Guardar cambios" del final.
  const guardarCampo = async (columna, valor, setLocal) => {
    setLocal(valor)

    if (columna === 'nombre_corto' && !valor.trim()) {
      setError('El nombre corto es obligatorio — es el que se muestra en la app.')
      return
    }

    const { error: saveError } = await supabase.from('perfiles').upsert({
      id: user.id,
      [columna]: valor.trim() || null,
    })

    if (saveError) {
      setError('No se pudo guardar el cambio. Intenta de nuevo.')
    } else {
      setError(null)
    }
  }

  const subirAvatar = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('El avatar debe ser una imagen.')
      return
    }

    setSubiendoAvatar(true)
    setError(null)

    const comprimido = await compressImage(file)
    const storagePath = `${user.id}/avatar.jpg`

    const { error: storageError } = await supabase.storage
      .from(BUCKET_AVATARES)
      .upload(storagePath, comprimido, { upsert: true, contentType: 'image/jpeg' })

    if (storageError) {
      setSubiendoAvatar(false)
      setError(`No se pudo subir la foto: ${storageError.message}`)
      return
    }

    // Cache-busting: el path siempre es el mismo (avatar.jpg), así que sin
    // esto el navegador podría seguir mostrando la imagen vieja en caché.
    const { data: urlData } = supabase.storage.from(BUCKET_AVATARES).getPublicUrl(storagePath)
    const urlConVersion = `${urlData.publicUrl}?v=${Date.now()}`

    const { error: dbError } = await supabase
      .from('perfiles')
      .upsert({ id: user.id, avatar_url: urlConVersion })

    setSubiendoAvatar(false)

    if (dbError) {
      setError('La foto se subió, pero no se pudo guardar en tu perfil. Intenta de nuevo.')
      return
    }

    setAvatarUrl(urlConVersion)
    onPerfilActualizado?.() // refresca el avatar en el TopBar SIN navegar (a diferencia de onGuardado)
  }

  // Mismo patrón que subirAvatar — misma bucket (bucket-perfil-avatares,
  // ya tiene las políticas RLS correctas por prefijo {user_id}/), pero
  // ruta logo.png distinta y salida en PNG (conserva transparencia).
  const subirLogo = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('El logo debe ser una imagen.')
      return
    }

    setSubiendoLogo(true)
    setError(null)

    const comprimido = await compressLogoPng(file)
    const storagePath = `${user.id}/logo.png`

    const { error: storageError } = await supabase.storage
      .from(BUCKET_AVATARES)
      .upload(storagePath, comprimido, { upsert: true, contentType: 'image/png' })

    if (storageError) {
      setSubiendoLogo(false)
      setError(`No se pudo subir el logo: ${storageError.message}`)
      return
    }

    const { data: urlData } = supabase.storage.from(BUCKET_AVATARES).getPublicUrl(storagePath)
    const urlConVersion = `${urlData.publicUrl}?v=${Date.now()}`

    const { error: dbError } = await supabase
      .from('perfiles')
      .upsert({ id: user.id, logo_url: urlConVersion })

    setSubiendoLogo(false)

    if (dbError) {
      setError('El logo se subió, pero no se pudo guardar en tu perfil. Intenta de nuevo.')
      return
    }

    setLogoUrl(urlConVersion)
  }

  const quitarLogo = async () => {
    const ok = window.confirm('¿Quitar el logo de marca? El PDF de ficha técnica saldrá sin logo hasta que subas uno nuevo.')
    if (!ok) return
    setLogoUrl(null)
    await supabase.from('perfiles').upsert({ id: user.id, logo_url: null })
  }

  // Color de acento: se guarda al soltar el selector (onChange del <input
  // type="color"> ya dispara solo al confirmar, no en cada frame de arrastre).
  const actualizarColorAcento = async (hex) => {
    setColorAcento(hex)
    await supabase.from('perfiles').upsert({ id: user.id, color_acento: hex })
  }

  // Tema de la página pública: autosave inmediato al elegir, mismo patrón
  // que el color de acento — no depende del botón "Guardar cambios".
  const actualizarEstiloPaginaPublica = async (estilo) => {
    setEstiloPaginaPublica(estilo)
    await supabase.from('perfiles').upsert({ id: user.id, estilo_pagina_publica: estilo })
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    setError(null)

    if (!nombreCorto.trim()) {
      setError('El nombre corto es obligatorio — es el que se muestra en la app.')
      return
    }

    setGuardando(true)

    const limpiarId = ({ _id, ...resto }) => resto

    const { error: saveError } = await supabase.from('perfiles').upsert({
      id: user.id,
      nombre_completo: nombreCompleto.trim() || null,
      nombre_corto: nombreCorto.trim(),
      nombre_comercial: nombreComercial.trim() || null,
      telefonos: telefonos.map(limpiarId),
      redes_sociales: redesSociales.map(limpiarId),
    })

    setGuardando(false)

    if (saveError) {
      setError('No se pudo guardar tu perfil. Intenta de nuevo.')
      return
    }

    onGuardado?.()
  }

  if (cargando) {
    return (
      <p style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--ta-text-muted)' }}>
        Cargando perfil...
      </p>
    )
  }

  const iniciales = (nombreCorto || nombreCompleto || '?').trim().charAt(0).toUpperCase()

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={subiendoAvatar}
            aria-label="Cambiar foto de perfil"
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: avatarUrl ? 'transparent' : 'var(--ta-accent)',
              color: 'var(--ta-on-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 500,
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              iniciales
            )}
            <div
              style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: subiendoAvatar ? 1 : 0, transition: 'opacity 150ms ease',
              }}
            >
              <span style={{ color: '#fff', fontSize: 10 }}>{subiendoAvatar ? 'Subiendo...' : ''}</span>
            </div>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={subirAvatar}
          />
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--ta-text-muted)' }}>
            {user?.email}
          </p>
        </div>

        <form onSubmit={handleGuardar} noValidate>
          <p style={encabezadoSeccion}>Datos personales</p>
          <div style={{ border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden' }}>
            <CampoEditable
              label="Nombre completo"
              value={nombreCompleto}
              onChange={(v) => guardarCampo('nombre_completo', v, setNombreCompleto)}
              placeholder="Nydia Jaramillo Sandoval"
              esPrimero
            />
            <CampoEditable
              label="Nombre corto"
              value={nombreCorto}
              onChange={(v) => guardarCampo('nombre_corto', v, setNombreCorto)}
              placeholder="Nydia"
              requerido
            />
            <CampoEditable
              label="Nombre comercial"
              value={nombreComercial}
              onChange={(v) => guardarCampo('nombre_comercial', v, setNombreComercial)}
              placeholder="Trifecta Inmobiliaria"
            />
          </div>

          <div style={divisorSeccion}>
            <p style={encabezadoSeccion}>Teléfonos</p>
            {telefonos.length > 0 && (
              <div style={{ border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                {telefonos.map((tel, idx) => (
                  <div
                    key={tel._id}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      padding: '4px 4px 4px 10px',
                      borderTop: idx === 0 ? 'none' : '0.5px solid var(--ta-border)',
                    }}
                  >
                    <input
                      type="text"
                      value={tel.etiqueta}
                      onChange={(e) => actualizarTelefono(tel._id, 'etiqueta', e.target.value)}
                      placeholder="WhatsApp"
                      style={{ ...inputStyle, width: 100, flexShrink: 0, border: 'none', height: 40 }}
                    />
                    <input
                      type="tel"
                      value={tel.numero}
                      onChange={(e) => actualizarTelefono(tel._id, 'numero', e.target.value)}
                      placeholder="+52 844 000 0000"
                      style={{ ...inputStyle, border: 'none', height: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => quitarTelefono(tel._id)}
                      aria-label="Quitar teléfono"
                      style={{
                        width: 40, height: 40, flexShrink: 0, border: 'none', background: 'none',
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
            <button
              type="button"
              onClick={agregarTelefono}
              style={{
                width: '100%', height: 40, borderRadius: 10,
                border: '0.5px dashed var(--ta-detail)', background: 'none',
                color: 'var(--ta-text-muted)', fontSize: 13, cursor: 'pointer',
              }}
            >
              + Agregar teléfono
            </button>
          </div>

          <div style={divisorSeccion}>
            <p style={encabezadoSeccion}>Redes sociales</p>
            {redesSociales.length > 0 && (
              <div style={{ border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                {redesSociales.map((red, idx) => (
                  <div
                    key={red._id}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      padding: '4px 4px 4px 10px',
                      borderTop: idx === 0 ? 'none' : '0.5px solid var(--ta-border)',
                    }}
                  >
                    <input
                      type="text"
                      value={red.red}
                      onChange={(e) => actualizarRedSocial(red._id, 'red', e.target.value)}
                      placeholder="Instagram"
                      style={{ ...inputStyle, width: 100, flexShrink: 0, border: 'none', height: 40 }}
                    />
                    <input
                      type="url"
                      value={red.url}
                      onChange={(e) => actualizarRedSocial(red._id, 'url', e.target.value)}
                      placeholder="https://instagram.com/..."
                      style={{ ...inputStyle, border: 'none', height: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => quitarRedSocial(red._id)}
                      aria-label="Quitar red social"
                      style={{
                        width: 40, height: 40, flexShrink: 0, border: 'none', background: 'none',
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
            <button
              type="button"
              onClick={agregarRedSocial}
              style={{
                width: '100%', height: 40, borderRadius: 10,
                border: '0.5px dashed var(--ta-detail)', background: 'none',
                color: 'var(--ta-text-muted)', fontSize: 13, cursor: 'pointer',
              }}
            >
              + Agregar red social
            </button>
          </div>

          {/* Marca — antes deshabilitada con badge "Próximamente". Ahora
              funcional: logo (usado en el PDF de ficha técnica) y color de
              acento (guardado, aunque todavía no se aplica al tema en vivo
              de la app — eso sigue siendo Fase 2). Tarjeta de presentación
              se queda pendiente. */}
          <div style={{ ...divisorSeccion, background: 'var(--ta-bg)', borderRadius: 12, padding: 16, marginTop: 24 }}>
            <p style={{ ...encabezadoSeccion, marginBottom: 14 }}>Marca</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={subiendoLogo}
                aria-label="Cambiar logo de marca"
                style={{
                  width: 64, height: 64, borderRadius: 10, flexShrink: 0,
                  background: logoUrl ? 'var(--ta-surface)' : 'var(--ta-surface)',
                  border: '0.5px dashed var(--ta-detail)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--ta-text-muted)', padding: 4, cursor: 'pointer',
                  overflow: 'hidden', position: 'relative',
                }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <IconoImagen />
                )}
                <div
                  style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: subiendoLogo ? 1 : 0, transition: 'opacity 150ms ease',
                  }}
                >
                  <span style={{ color: '#fff', fontSize: 9 }}>{subiendoLogo ? 'Subiendo...' : ''}</span>
                </div>
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={subirLogo}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ta-text)' }}>
                  {logoUrl ? 'Logo cargado' : 'Sin logo'}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--ta-text-muted)' }}>
                  Se usa en el PDF de ficha técnica. Recomendado: PNG con fondo transparente.
                </p>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={quitarLogo}
                    style={{ marginTop: 6, border: 'none', background: 'none', color: 'var(--ta-detail)', fontSize: 11, cursor: 'pointer', padding: 0 }}
                  >
                    Quitar logo
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 13, color: 'var(--ta-text)' }}>Color de acento</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--ta-text-muted)' }}>
                  También se usa en el PDF de ficha técnica.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--ta-text-muted)', fontFamily: 'monospace' }}>{colorAcento}</span>
                <label
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: '0.5px solid var(--ta-border)',
                    background: colorAcento, display: 'block', cursor: 'pointer', overflow: 'hidden', position: 'relative',
                  }}
                >
                  <input
                    type="color"
                    value={colorAcento}
                    onChange={(e) => actualizarColorAcento(e.target.value)}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', border: 'none', padding: 0 }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Estilo de la página pública (17 jul, sistema de temas) — un
              tema a la vez. Elegance solo aparece si accesoTemaElegante
              viene en true desde la BD (columna real, activada a mano por
              asesor — no depende de quién esté logueado). */}
          <div style={{ ...divisorSeccion, background: 'var(--ta-bg)', borderRadius: 12, padding: 16, marginTop: 24 }}>
            <p style={{ ...encabezadoSeccion, marginBottom: 4 }}>Página pública</p>
            <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--ta-text-muted)' }}>
              Estilo visual de la ficha que ven tus clientes en el link público de cada propiedad.
            </p>
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

          {/* Seguridad — PIN de la Bóveda de documentos. Independiente del
              botón "Guardar cambios" de abajo (mismo patrón de autosave que
              avatar/logo/color), para no perder el PIN si algo falla en el
              resto del formulario. */}
          <div style={{ ...divisorSeccion, background: 'var(--ta-bg)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <IconoCandado />
              <p style={{ ...encabezadoSeccion, margin: 0 }}>Seguridad</p>
            </div>

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

          <button
            type="submit"
            disabled={guardando}
            style={{
              width: '100%',
              height: 44,
              marginTop: 24,
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(160deg, color-mix(in srgb, var(--ta-accent) 82%, white 18%), var(--ta-accent) 55%, color-mix(in srgb, var(--ta-accent) 85%, black 15%))',
              color: 'var(--ta-on-accent)',
              fontSize: 14,
              fontWeight: 500,
              cursor: guardando ? 'default' : 'pointer',
              opacity: guardando ? 0.6 : 1,
            }}
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}
