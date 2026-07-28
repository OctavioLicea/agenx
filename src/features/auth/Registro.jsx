// src/features/auth/Registro.jsx
// Motivo: FEAT — 27 jul 2026 (sesión 24, colaboración). Registro en
//   autoservicio para co-asesores invitados por correo (sección "Mi
//   equipo" de Configuración). Decisión de arquitectura (opción C de 3):
//   signUp() normal del SDK — funciona desde el navegador sin service
//   role key, sin Edge Function y sin el script manual de invitación.
//   El control de acceso NO está aquí: el trigger de BD
//   trg_perfiles_requiere_equipo rebota el alta del perfil si el correo
//   no está en el equipo de ningún asesor, así que aunque cualquiera
//   llegue a /registro y cree una cuenta de Auth (compartida con ivent),
//   sin membresía nunca obtiene perfil y el candado de App.jsx no lo
//   deja entrar. Esta pantalla solo da la mejor UX posible sobre esa
//   regla: avisa ANTES de pedir datos de perfil si el correo no está
//   invitado.
//   Flujo: correo + contraseña → signUp (manda correo de confirmación de
//   Supabase; OJO: la plantilla de ese correo es del proyecto compartido
//   con ivent) → el link regresa a /registro con tokens → sesión manual
//   (detectSessionInUrl está apagado global, ver supabaseClient.js) →
//   chequeo de membresía → formulario de perfil (nombre, comercial,
//   iniciales) → upsert a perfiles → recarga a la raíz.
//   Mismos patrones anti-StrictMode que EstablecerPassword.jsx (yaCorrio
//   + activoRef) — ver la explicación larga allá.
// Timestamp: 2026-07-27

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import logoTuAsesor from '../../assets/logo-cuadros-verde-texto-dorado.png'

// Misma sugerencia que en PerfilForm.jsx: primera letra de hasta 3
// palabras del nombre completo.
function sugerirIniciales(nombre) {
  return (nombre || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
}

const correoValido = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)

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

const botonPrimario = (deshabilitado) => ({
  width: '100%',
  height: 44,
  marginTop: 20,
  borderRadius: 10,
  border: 'none',
  background: 'var(--ta-accent)',
  color: 'var(--ta-on-accent)',
  fontSize: 14,
  fontWeight: 500,
  cursor: deshabilitado ? 'default' : 'pointer',
  opacity: deshabilitado ? 0.6 : 1,
})

function Marco({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', background: '#FFFFFF' }}>
      <div style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <img src={logoTuAsesor} alt="TuAsesor" style={{ width: 200, maxWidth: '100%', height: 'auto' }} />
        </div>
        {children}
      </div>
    </div>
  )
}

export default function Registro() {
  // 'cargando': procesando tokens del link de confirmación (o decidiendo
  // que no hay). 'inicio': formulario correo+contraseña. 'revisa-correo':
  // signUp enviado, falta confirmar. 'perfil': sesión confirmada y correo
  // invitado — completar nombre/comercial/iniciales. 'sin-equipo': sesión
  // confirmada pero el correo no está en ningún equipo.
  const [estado, setEstado] = useState('cargando')
  const [user, setUser] = useState(null)

  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')

  const [nombreCompleto, setNombreCompleto] = useState('')
  const [nombreComercial, setNombreComercial] = useState('')
  const [iniciales, setIniciales] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const yaCorrio = useRef(false)
  const activoRef = useRef(true)

  // Con sesión ya establecida: ¿este correo está invitado al equipo de
  // alguien? (RLS: el miembro puede VER sus propias filas.) Decide entre
  // 'perfil' y 'sin-equipo'.
  const revisarMembresia = async (usuario) => {
    const { data, error: memError } = await supabase
      .from('equipo_miembros')
      .select('id')
      .limit(1)
    if (memError || !data || data.length === 0) {
      setUser(usuario)
      setEstado('sin-equipo')
      return
    }
    setUser(usuario)
    setEstado('perfil')
  }

  useEffect(() => {
    activoRef.current = true

    if (yaCorrio.current) return
    yaCorrio.current = true

    async function procesarLlegada() {
      try {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const query = new URLSearchParams(window.location.search)
        const accessToken = hash.get('access_token')
        const refreshToken = hash.get('refresh_token')
        const code = query.get('code')

        let session = null

        if (accessToken && refreshToken) {
          const { data, error: sesError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!sesError) session = data.session
          else console.error('setSession falló:', sesError)
        } else if (code) {
          const { data, error: sesError } = await supabase.auth.exchangeCodeForSession(code)
          if (!sesError) session = data.session
          else console.error('exchangeCodeForSession falló:', sesError)
        } else {
          // Llegada directa a /registro sin tokens: si ya hay una sesión
          // guardada a medio registro (confirmó el correo pero cerró antes
          // de completar el perfil), se retoma donde iba; si no, al form.
          const { data } = await supabase.auth.getSession()
          session = data.session
        }

        if (!activoRef.current) return

        if (session?.user) {
          // Los tokens no deben quedar visibles ni reutilizables en la URL.
          window.history.replaceState({}, '', window.location.pathname)
          await revisarMembresia(session.user)
        } else {
          setEstado('inicio')
        }
      } catch (e) {
        console.error('Excepción procesando la llegada a /registro:', e)
        if (activoRef.current) setEstado('inicio')
      }
    }

    procesarLlegada()
    return () => {
      activoRef.current = false
    }
  }, [])

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError(null)

    const correoLimpio = correo.trim().toLowerCase()
    if (!correoValido(correoLimpio)) {
      setError('Escribe un correo válido.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setEnviando(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: correoLimpio,
      password,
      options: {
        // El correo de confirmación debe regresar AQUÍ, no al Site URL
        // compartido del proyecto (que apunta a ivent — mismo problema ya
        // resuelto en el flujo de invitación, ver scripts/invitar-usuario.mjs).
        // origin cubre localhost y producción sin hardcodear.
        emailRedirectTo: `${window.location.origin}/registro`,
      },
    })
    setEnviando(false)

    if (signUpError) {
      setError(
        /already registered/i.test(signUpError.message)
          ? 'Ya existe una cuenta con ese correo. Si es tuya, entra por la pantalla normal de TuAsesor.'
          : 'No se pudo crear la cuenta: ' + signUpError.message
      )
      return
    }

    // Si el proyecto tuviera la confirmación de correo apagada, signUp
    // regresa sesión de inmediato — se salta el paso del correo.
    if (data?.session?.user) {
      await revisarMembresia(data.session.user)
      return
    }

    setEstado('revisa-correo')
  }

  const handlePerfil = async (e) => {
    e.preventDefault()
    setError(null)

    if (!nombreCompleto.trim() || !nombreComercial.trim()) {
      setError('Nombre y nombre comercial son obligatorios.')
      return
    }

    setEnviando(true)
    const inicialesFinal = (iniciales.trim() || sugerirIniciales(nombreCompleto)).slice(0, 3).toUpperCase()
    const { error: perfilError } = await supabase.from('perfiles').upsert({
      id: user.id,
      nombre_completo: nombreCompleto.trim(),
      nombre_comercial: nombreComercial.trim(),
      iniciales: inicialesFinal || null,
    })
    setEnviando(false)

    if (perfilError) {
      // El trigger de BD es la última línea de defensa — si el correo dejó
      // de estar invitado entre el chequeo y este submit, rebota aquí.
      if (/REGISTRO_SIN_EQUIPO/.test(perfilError.message)) {
        setEstado('sin-equipo')
        return
      }
      setError('No se pudo crear tu perfil: ' + perfilError.message)
      return
    }

    // Recarga limpia a la raíz: main.jsx monta App normal, el candado
    // encuentra el perfil recién creado y deja pasar.
    window.location.href = '/'
  }

  if (estado === 'cargando') {
    return <p style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--ta-text-muted)' }}>Cargando...</p>
  }

  if (estado === 'revisa-correo') {
    return (
      <Marco>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ta-text)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Te mandamos un correo a <strong>{correo.trim().toLowerCase()}</strong> para confirmar tu cuenta.
          </p>
          <p style={{ color: 'var(--ta-text-muted)', fontSize: 13, lineHeight: 1.6, marginTop: 12 }}>
            Ábrelo y da clic en el link — te traerá de vuelta aquí para terminar tu registro. Revisa también la carpeta de spam.
          </p>
        </div>
      </Marco>
    )
  }

  if (estado === 'sin-equipo') {
    return (
      <Marco>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ta-text)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Tu correo {user?.email ? <strong>{user.email}</strong> : null} no está en el equipo de ningún asesor de TuAsesor.
          </p>
          <p style={{ color: 'var(--ta-text-muted)', fontSize: 13, lineHeight: 1.6, marginTop: 12 }}>
            Pide a quien te invitó que te agregue a su equipo (Configuración → Mi equipo) con este mismo correo, y vuelve a entrar a esta liga.
          </p>
        </div>
      </Marco>
    )
  }

  if (estado === 'perfil') {
    return (
      <Marco>
        <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', marginBottom: 4 }}>
          Completa tu cuenta
        </p>
        <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', marginBottom: 24 }}>
          {user?.email}
        </p>

        <form onSubmit={handlePerfil} noValidate>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="reg-nombre" style={labelStyle}>Nombre completo</label>
            <input
              id="reg-nombre"
              type="text"
              autoComplete="name"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="reg-comercial" style={labelStyle}>Nombre comercial</label>
            <input
              id="reg-comercial"
              type="text"
              autoComplete="organization"
              value={nombreComercial}
              onChange={(e) => setNombreComercial(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="reg-iniciales" style={labelStyle}>Iniciales (máx. 3 letras)</label>
            <input
              id="reg-iniciales"
              type="text"
              value={iniciales}
              onChange={(e) => setIniciales(e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ]/g, '').slice(0, 3))}
              placeholder={sugerirIniciales(nombreCompleto) || 'ABC'}
              style={inputStyle}
            />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ta-text-muted)' }}>
              Identifican quién capturó o editó cada propiedad al colaborar.
            </p>
          </div>

          {error && (
            <p role="alert" style={{ color: '#993C1D', fontSize: 13, margin: '10px 0 0' }}>{error}</p>
          )}

          <button type="submit" disabled={enviando} aria-busy={enviando} style={botonPrimario(enviando)}>
            {enviando ? 'Guardando...' : 'Entrar a TuAsesor'}
          </button>
        </form>
      </Marco>
    )
  }

  // estado === 'inicio'
  return (
    <Marco>
      <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', marginBottom: 24 }}>
        Crea tu cuenta de co-asesor. Usa el mismo correo al que te llegó la invitación.
      </p>

      <form onSubmit={handleSignUp} noValidate>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="reg-correo" style={labelStyle}>Correo</label>
          <input
            id="reg-correo"
            type="email"
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="reg-pass" style={labelStyle}>Contraseña</label>
          <input
            id="reg-pass"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="reg-pass2" style={labelStyle}>Confirmar contraseña</label>
          <input
            id="reg-pass2"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        {error && (
          <p role="alert" style={{ color: '#993C1D', fontSize: 13, margin: '10px 0 0' }}>{error}</p>
        )}

        <button type="submit" disabled={enviando} aria-busy={enviando} style={botonPrimario(enviando)}>
          {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>
    </Marco>
  )
}
