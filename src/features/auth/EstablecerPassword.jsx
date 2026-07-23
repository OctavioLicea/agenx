// src/features/auth/EstablecerPassword.jsx
// Motivo: FEAT — 22 jul 2026. Pantalla que ve alguien recién invitado
//   (Authentication > Users > Invite user en Supabase) al darle clic al
//   link del correo. Supabase ya arma la sesión sola al cargar el cliente
//   (detectSessionInUrl, ver supabaseClient.js) — esta pantalla completa
//   lo que falta: (1) que la persona ponga su propia contraseña (nunca
//   existe una temporal que alguien tenga que transmitir), (2) capture su
//   nombre y nombre comercial de una vez, porque App.jsx ya no deja entrar
//   a ningún módulo si `perfiles` no tiene esos dos campos — este es el
//   único lugar donde se crea esa fila por primera vez. El correo NO se
//   captura aquí: ya vive en auth.users (se muestra de referencia, nada
//   más) — logo/foto quedan para después, en Mi Perfil, sin bloquear.
//   Detectada por main.jsx igual que /p/:id — ver ruteo manual ahí.
// Timestamp: 2026-07-22

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import logoTuAsesor from '../../assets/logo-cuadros-verde-texto-dorado.png'

export default function EstablecerPassword() {
  const [estado, setEstado] = useState('cargando') // cargando | listo | invalido | guardando | hecho
  const [user, setUser] = useState(null)
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [nombreComercial, setNombreComercial] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState(null)
  const yaCorrio = useRef(false)
  // 23 jul 2026, cuarto fix: `yaCorrio` (arriba) evitó que la llamada de
  // red se repitiera, pero no bastaba — quedó una segunda trampa del
  // mismo origen (StrictMode monta → desmonta → monta). La bandera
  // `activo` vivía como variable local de CADA invocación del efecto:
  // el primer montaje la ponía en true, pero el desmontaje falso de
  // StrictMode (que ocurre de inmediato, antes de que setSession()
  // termine) corría el cleanup y la dejaba en false — en ESA closure.
  // Cuando por fin llegaba la respuesta de setSession() (exitosa,
  // confirmado con los logs: "activo? false session?.user? true"), el
  // código veía `activo === false` y abortaba sin nunca poner
  // estado='listo', dejando la pantalla pegada en "Cargando..." para
  // siempre pese a que la sesión sí se había establecido bien. Fix: un
  // ref compartido en vez de una variable local — se reactiva a `true`
  // en CADA invocación del efecto (incluyendo el remontaje real que
  // sigue al desmontaje falso), así que para cuando la promesa de la
  // primera invocación resuelve, ya refleja el estado real del
  // componente y no un snapshot congelado de un desmontaje que nunca
  // fue permanente.
  const activoRef = useRef(true)

  useEffect(() => {
    activoRef.current = true

    if (yaCorrio.current) return
    yaCorrio.current = true

    async function establecerSesionDesdeLink() {
      // 22 jul 2026, tercer fix: si setSession()/exchangeCodeForSession()
      // truena en vez de solo devolver `error` (pasa con errores de red,
      // token malformado, etc.), sin try/catch la excepción se queda sin
      // atrapar y el estado nunca sale de 'cargando' — pantalla pegada
      // para siempre, sin ningún mensaje. Envolver todo en try/catch
      // garantiza que siempre se llegue a 'listo' o 'invalido'.
      try {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const query = new URLSearchParams(window.location.search)
        const accessToken = hash.get('access_token')
        const refreshToken = hash.get('refresh_token')
        const code = query.get('code')

        let session = null

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!error) session = data.session
          else console.error('setSession falló:', error)
        } else if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error) session = data.session
          else console.error('exchangeCodeForSession falló:', error)
        } else {
          // Sin tokens en la URL — puede que detectSessionInUrl ya haya
          // corrido antes de que este componente montara. Como último
          // intento, se pregunta la sesión ya guardada.
          const { data } = await supabase.auth.getSession()
          session = data.session
        }

        if (!activoRef.current) return

        if (session?.user) {
          // Limpia el hash/query de la URL: los tokens ya no deben quedar
          // visibles ni reutilizables desde el historial del navegador.
          window.history.replaceState({}, '', window.location.pathname)
          setUser(session.user)
          setEstado('listo')
        } else {
          setEstado('invalido')
        }
      } catch (e) {
        console.error('Excepción estableciendo sesión desde el link de invitación:', e)
        if (activoRef.current) setEstado('invalido')
      }
    }

    establecerSesionDesdeLink()
    return () => {
      activoRef.current = false
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!nombreCompleto.trim() || !nombreComercial.trim()) {
      setError('Nombre y nombre comercial son obligatorios.')
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

    setEstado('guardando')

    const { error: passError } = await supabase.auth.updateUser({ password })
    if (passError) {
      setError(passError.message)
      setEstado('listo')
      return
    }

    const { error: perfilError } = await supabase.from('perfiles').upsert({
      id: user.id,
      nombre_completo: nombreCompleto.trim(),
      nombre_comercial: nombreComercial.trim(),
    })
    if (perfilError) {
      setError('Tu contraseña se guardó, pero hubo un problema al crear tu perfil: ' + perfilError.message)
      setEstado('listo')
      return
    }

    setEstado('hecho')
    // Recarga limpia a la raíz: sin el marcador de invitación en la URL,
    // main.jsx monta App normal, que ya encuentra el perfil recién creado.
    window.location.href = '/'
  }

  if (estado === 'cargando') {
    return <p style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--ta-text-muted)' }}>Cargando...</p>
  }

  if (estado === 'invalido') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 360, textAlign: 'center' }}>
          <img src={logoTuAsesor} alt="TuAsesor" style={{ width: 180, maxWidth: '100%', height: 'auto', marginBottom: 24 }} />
          <p style={{ color: 'var(--ta-text)', fontSize: 14, lineHeight: 1.6 }}>
            Este link de invitación no es válido o ya venció. Pide que te manden una invitación nueva.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', background: '#FFFFFF' }}>
      <div style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <img src={logoTuAsesor} alt="TuAsesor" style={{ width: 200, maxWidth: '100%', height: 'auto' }} />
        </div>

        <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', marginBottom: 4 }}>
          Completa tu cuenta
        </p>
        <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', marginBottom: 24 }}>
          {user?.email}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {[
            { id: 'ep-nombre', label: 'Nombre completo', value: nombreCompleto, set: setNombreCompleto, type: 'text', autoComplete: 'name' },
            { id: 'ep-comercial', label: 'Nombre comercial', value: nombreComercial, set: setNombreComercial, type: 'text', autoComplete: 'organization' },
            { id: 'ep-pass', label: 'Contraseña', value: password, set: setPassword, type: 'password', autoComplete: 'new-password' },
            { id: 'ep-pass2', label: 'Confirmar contraseña', value: confirmar, set: setConfirmar, type: 'password', autoComplete: 'new-password' },
          ].map((campo) => (
            <div key={campo.id} style={{ marginBottom: 14 }}>
              <label htmlFor={campo.id} style={{ display: 'block', fontSize: 13, color: 'var(--ta-text-muted)', marginBottom: 6 }}>
                {campo.label}
              </label>
              <input
                id={campo.id}
                type={campo.type}
                autoComplete={campo.autoComplete}
                value={campo.value}
                onChange={(e) => campo.set(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '0.5px solid var(--ta-border)',
                  background: '#FFFFFF',
                  color: 'var(--ta-text)',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}

          {error && (
            <p role="alert" style={{ color: '#993C1D', fontSize: 13, margin: '10px 0 0' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={estado === 'guardando'}
            aria-busy={estado === 'guardando'}
            style={{
              width: '100%',
              height: 44,
              marginTop: 20,
              borderRadius: 10,
              border: 'none',
              background: 'var(--ta-accent)',
              color: 'var(--ta-on-accent)',
              fontSize: 14,
              fontWeight: 500,
              cursor: estado === 'guardando' ? 'default' : 'pointer',
              opacity: estado === 'guardando' ? 0.6 : 1,
            }}
          >
            {estado === 'guardando' ? 'Guardando...' : 'Crear mi cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}
