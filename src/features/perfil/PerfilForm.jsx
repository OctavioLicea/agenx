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
//   [Actualización 2026-07-27, sesión 24]: las secciones de CONFIGURACIÓN
//   (Requisitos de renta, Página pública/tema, Seguridad/PIN) se movieron
//   al módulo nuevo Configuración (ConfiguracionForm.jsx, engrane en el
//   TopBar) — pedido de Okta: Mi Perfil se queda solo con la IDENTIDAD
//   del asesor. Campo nuevo "Iniciales" (máx 3, se sugieren solas desde
//   el nombre completo): rastro de "capturada por / última edición" en
//   propiedades, para la co-asesoría.
// Timestamp: 2026-07-27

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

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

function IconoSubida() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15.5V4M12 4 8 8M12 4l4 4" />
      <path d="M4 15.5v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

// Control de subida de imagen reusado por Logo y Tarjeta de presentación
// (18 jul, a pedido de Okta — el control anterior, chico y con texto al
// lado, no se leía como un "subir imagen" estándar). Caja grande con
// borde punteado cuando está vacía, preview a pantalla completa dentro
// de la caja cuando ya hay imagen, "Cambiar" como badge visible siempre
// (no depende de :hover, que no existe en touch) y "Quitar" como link
// aparte debajo — mismo patrón de acción destructiva que ya usa el resto
// de la app (texto en --ta-detail, sin ícono).
function ControlSubidaImagen({ titulo, ayuda, url, subiendo, onElegir, onQuitar, aspectRatio = '16 / 10', objectFit = 'contain' }) {
  return (
    <div>
      <button
        type="button"
        onClick={onElegir}
        disabled={subiendo}
        aria-label={url ? `Cambiar ${titulo.toLowerCase()}` : `Subir ${titulo.toLowerCase()}`}
        style={{
          width: '100%', aspectRatio, borderRadius: 10, padding: 0, cursor: 'pointer',
          border: url ? '0.5px solid var(--ta-border)' : '1.5px dashed var(--ta-detail)',
          background: 'var(--ta-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 6, overflow: 'hidden', position: 'relative',
        }}
      >
        {url ? (
          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit }} />
        ) : (
          <>
            <span style={{ color: 'var(--ta-text-muted)', display: 'flex' }}><IconoSubida /></span>
            <span style={{ fontSize: 12.5, color: 'var(--ta-text-muted)' }}>Haz clic para subir</span>
          </>
        )}
        <div
          style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: subiendo ? 1 : 0, transition: 'opacity 150ms ease',
          }}
        >
          <span style={{ color: '#fff', fontSize: 12 }}>{subiendo ? 'Subiendo...' : ''}</span>
        </div>
        {url && !subiendo && (
          <span
            style={{
              position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.55)',
              color: '#fff', fontSize: 10.5, fontWeight: 500, padding: '4px 9px', borderRadius: 20,
            }}
          >
            Cambiar
          </span>
        )}
      </button>
      <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ta-text)' }}>{titulo}</p>
      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ta-text-muted)' }}>{ayuda}</p>
      {url && (
        <button
          type="button"
          onClick={onQuitar}
          style={{ marginTop: 4, border: 'none', background: 'none', color: 'var(--ta-detail)', fontSize: 11, cursor: 'pointer', padding: 0 }}
        >
          Quitar
        </button>
      )}
    </div>
  )
}

// (CampoTextoLargo, IconoCandado e InputPin se movieron a
// ConfiguracionForm.jsx junto con sus secciones — sesión 24.)

// Sugerencia automática de iniciales a partir del nombre completo:
// primera letra de hasta 3 palabras ("Nydia Jaramillo Sandoval" → "NJS").
function sugerirIniciales(nombre) {
  return (nombre || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
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

// (labelStyle se fue con las secciones movidas a ConfiguracionForm.jsx.)

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
  // Correo público de contacto (18 jul) — distinto del correo de login
  // (user.email, con el que se accede al CRM). Es el que ve el cliente en
  // la página pública; resuelve la decisión abierta que bloqueaba el
  // botón "Correo" del tema Elegance (ver docs/BACKLOG.md).
  const [correoPublico, setCorreoPublico] = useState('')
  // Iniciales (sesión 24, co-asesoría): rastro de "capturada por / última
  // edición" en propiedades. Máx 3 letras, sugeridas desde el nombre.
  const [inicialesPerfil, setInicialesPerfil] = useState('')
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

  // Tarjeta de presentación (18 jul) — columna tarjeta_presentacion_url ya
  // existía reservada desde Sesión 9, sin UI hasta ahora. Mismo patrón de
  // subida que el logo (mismo bucket, imagen comprimida a PNG).
  const [tarjetaUrl, setTarjetaUrl] = useState(null)
  const [subiendoTarjeta, setSubiendoTarjeta] = useState(false)
  const tarjetaInputRef = useRef(null)

  // (Tema de página pública y PIN de la Bóveda viven ahora en
  // ConfiguracionForm.jsx — sesión 24.)

  useEffect(() => {
    if (!user) return

    supabase
      .from('perfiles')
      .select('nombre_completo, nombre_corto, nombre_comercial, correo_publico, iniciales, telefonos, redes_sociales, avatar_url, logo_url, tarjeta_presentacion_url, color_acento')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError('No se pudo cargar tu perfil.')
        } else if (data) {
          setNombreCompleto(data.nombre_completo || '')
          setNombreCorto(data.nombre_corto || '')
          setNombreComercial(data.nombre_comercial || '')
          setCorreoPublico(data.correo_publico || '')
          setInicialesPerfil(data.iniciales || '')
          setTelefonos(
            (data.telefonos || []).map((t) => ({ ...t, _id: crearId() }))
          )
          setRedesSociales(
            (data.redes_sociales || []).map((r) => ({ ...r, _id: crearId() }))
          )
          setAvatarUrl(data.avatar_url || null)
          setLogoUrl(data.logo_url || null)
          setTarjetaUrl(data.tarjeta_presentacion_url || null)
          setColorAcento(data.color_acento || COLOR_ACENTO_DEFAULT)
        }
        setCargando(false)
      })
  }, [user])

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

  // Mismo patrón que subirLogo — misma bucket y compresión a PNG. Imagen
  // por ahora (no PDF), consistente con avatar/logo; si Nydia necesita
  // subir la tarjeta como PDF se agrega después.
  const subirTarjeta = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('La tarjeta de presentación debe ser una imagen.')
      return
    }

    setSubiendoTarjeta(true)
    setError(null)

    const comprimido = await compressLogoPng(file, 1200)
    const storagePath = `${user.id}/tarjeta.png`

    const { error: storageError } = await supabase.storage
      .from(BUCKET_AVATARES)
      .upload(storagePath, comprimido, { upsert: true, contentType: 'image/png' })

    if (storageError) {
      setSubiendoTarjeta(false)
      setError(`No se pudo subir la tarjeta: ${storageError.message}`)
      return
    }

    const { data: urlData } = supabase.storage.from(BUCKET_AVATARES).getPublicUrl(storagePath)
    const urlConVersion = `${urlData.publicUrl}?v=${Date.now()}`

    const { error: dbError } = await supabase
      .from('perfiles')
      .upsert({ id: user.id, tarjeta_presentacion_url: urlConVersion })

    setSubiendoTarjeta(false)

    if (dbError) {
      setError('La tarjeta se subió, pero no se pudo guardar en tu perfil. Intenta de nuevo.')
      return
    }

    setTarjetaUrl(urlConVersion)
  }

  const quitarTarjeta = async () => {
    const ok = window.confirm('¿Quitar tu tarjeta de presentación?')
    if (!ok) return
    setTarjetaUrl(null)
    await supabase.from('perfiles').upsert({ id: user.id, tarjeta_presentacion_url: null })
  }

  // Color de acento: se guarda al soltar el selector (onChange del <input
  // type="color"> ya dispara solo al confirmar, no en cada frame de arrastre).
  const actualizarColorAcento = async (hex) => {
    setColorAcento(hex)
    await supabase.from('perfiles').upsert({ id: user.id, color_acento: hex })
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

  const inicialAvatar = (nombreCorto || nombreCompleto || '?').trim().charAt(0).toUpperCase()

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
              inicialAvatar
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
            <CampoEditable
              label="Correo público"
              value={correoPublico}
              onChange={(v) => guardarCampo('correo_publico', v, setCorreoPublico)}
              placeholder="nydia@ejemplo.com"
            />
            <CampoEditable
              label="Iniciales"
              value={inicialesPerfil}
              onChange={(v) => guardarCampo('iniciales', v.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ]/g, '').slice(0, 3), setInicialesPerfil)}
              placeholder={sugerirIniciales(nombreCompleto) || 'NJS'}
            />
          </div>
          <p style={{ margin: '6px 2px 0', fontSize: 11, color: 'var(--ta-text-muted)' }}>
            Las iniciales (máx. 3 letras) identifican quién capturó o editó cada propiedad cuando colaboras con tu equipo.
          </p>
          <p style={{ margin: '6px 2px 0', fontSize: 11, color: 'var(--ta-text-muted)' }}>
            El correo público es el que ven tus clientes (página pública, PDF). Es distinto de {user?.email}, con el que entras al CRM.
          </p>

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
              funcional: logo (usado en el PDF de ficha técnica), tarjeta de
              presentación (18 jul, columna reservada desde Sesión 9) y
              color de acento (guardado, aunque todavía no se aplica al
              tema en vivo de la app — eso sigue siendo Fase 2). */}
          <div style={{ ...divisorSeccion, background: 'var(--ta-bg)', borderRadius: 12, padding: 16, marginTop: 24 }}>
            <p style={{ ...encabezadoSeccion, marginBottom: 14 }}>Marca</p>

            <div style={{ marginBottom: 20 }}>
              <ControlSubidaImagen
                titulo={logoUrl ? 'Logo cargado' : 'Logo'}
                ayuda="Se usa en el PDF de ficha técnica. Recomendado: PNG con fondo transparente."
                url={logoUrl}
                subiendo={subiendoLogo}
                onElegir={() => logoInputRef.current?.click()}
                onQuitar={quitarLogo}
                aspectRatio="1 / 1"
              />
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={subirLogo}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <ControlSubidaImagen
                titulo={tarjetaUrl ? 'Tarjeta de presentación cargada' : 'Tarjeta de presentación'}
                ayuda="Foto o diseño de tu tarjeta de negocios, para compartir con clientes."
                url={tarjetaUrl}
                subiendo={subiendoTarjeta}
                onElegir={() => tarjetaInputRef.current?.click()}
                onQuitar={quitarTarjeta}
                aspectRatio="16 / 9"
              />
              <input
                ref={tarjetaInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={subirTarjeta}
              />
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

          {/* (Página pública y Seguridad viven ahora en el módulo
              Configuración — sesión 24.) */}

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
