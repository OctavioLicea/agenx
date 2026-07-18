// src/features/auth/LoginForm.jsx
// Motivo: integra FondoOrganicoLogin (deriva ambiental lenta, estático en
//   móvil, respeta prefers-reduced-motion) dentro del panel blanco, y
//   aplica el degradado sutil acordado para el botón "Entrar" (mismo verde,
//   sin blanco encima — evita el look "glossy" 2008). Se quita el grupo de
//   líneas rosa-champán a pedido de Okta, queda solo navy-carbón (opacidad
//   subida ligeramente de 0.15 a 0.18 al quedar como único acento).
// Timestamp: 2026-07-05, 13:10 hrs

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import logoTuAsesor from '../../assets/logo-cuadros-verde-texto-dorado.png' // 17 jul, rebranding — antes branding/*.svg (diseño viejo)
import loginBg from '../../assets/login-bg.jpg'
import FondoOrganicoLogin from '../../components/FondoOrganicoLogin'

function IconoOjo({ visible }) {
  return visible ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A11 11 0 0 1 12 5c7 0 11 7 11 7a13.2 13.2 0 0 1-3.4 4.1M6.6 6.6C3.6 8.4 1 12 1 12s4 7 11 7a10.9 10.9 0 0 0 4.2-.8" />
      <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
    </svg>
  )
}

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setCargando(false)

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos.'
          : authError.message
      )
      return
    }

    onLogin?.(data.session)
  }

  return (
    <div className="ta-login-split">
      <style>{`
        .ta-login-split {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #FFFFFF;
        }
        .ta-login-photo {
          width: 100%;
          height: 200px;
          object-fit: cover;
          display: block;
          flex-shrink: 0;
        }
        .ta-login-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem 3rem;
          background: #FFFFFF;
          position: relative;
          overflow: hidden;
        }
        .ta-login-form-wrap {
          width: 100%;
          max-width: 320px;
          position: relative;
          z-index: 1;
        }

        @media (min-width: 860px) {
          .ta-login-split {
            flex-direction: row;
          }
          .ta-login-photo {
            width: 50%;
            height: 100vh;
          }
          .ta-login-panel {
            width: 50%;
            padding: 2rem;
          }
        }

        /* --- Fondo orgánico del panel blanco --- */
        .fondo-organico-login {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
        }
        .fondo-organico-login svg {
          width: 100%;
          height: 100%;
        }
        .fondo-organico-login__navy {
          fill: none;
          stroke: #0B3041;
          stroke-width: 0.75;
          opacity: 0.18;
        }
        @media (min-width: 860px) {
          .fondo-organico-login__navy { animation: ta-deriva-navy 18s ease-in-out infinite; }
        }
        @keyframes ta-deriva-navy {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-3px, 4px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fondo-organico-login__navy {
            animation: none;
          }
        }

        @keyframes ta-form-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ta-login-form-wrap { animation: none !important; }
        }
        .ta-login-form-wrap {
          animation: ta-form-in 300ms ease-out;
        }

        .ta-login-input:focus-visible,
        .ta-login-input:focus {
          outline: none;
          border-color: var(--ta-accent) !important;
          box-shadow: 0 0 0 3px rgba(31, 58, 44, 0.12);
        }
        .ta-login-input:-webkit-autofill,
        .ta-login-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #FFFFFF inset;
          -webkit-text-fill-color: var(--ta-text);
          transition: background-color 9999s ease-in-out 0s;
        }
        .ta-login-submit:hover:not(:disabled) {
          background: #16291e;
        }
        .ta-login-submit:active:not(:disabled) {
          transform: scale(0.98);
        }
        .ta-login-eye:hover {
          color: var(--ta-text);
        }
      `}</style>

      <img src={loginBg} alt="" aria-hidden="true" className="ta-login-photo" />

      <div className="ta-login-panel">
        <FondoOrganicoLogin />

        <div className="ta-login-form-wrap">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <img
              src={logoTuAsesor}
              alt="TuAsesor"
              style={{ width: 220, maxWidth: '100%', height: 'auto' }}
            />
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="ta-email"
                style={{ display: 'block', fontSize: 13, color: 'var(--ta-text-muted)', marginBottom: 6 }}
              >
                Correo electrónico
              </label>
              <input
                id="ta-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="ta-login-input"
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

            <div style={{ marginBottom: 8 }}>
              <label
                htmlFor="ta-password"
                style={{ display: 'block', fontSize: 13, color: 'var(--ta-text-muted)', marginBottom: 6 }}
              >
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="ta-password"
                  type={verPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="ta-login-input"
                  style={{
                    width: '100%',
                    height: 44,
                    padding: '0 44px 0 12px',
                    borderRadius: 10,
                    border: '0.5px solid var(--ta-border)',
                    background: '#FFFFFF',
                    color: 'var(--ta-text)',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="ta-login-eye"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    height: 44,
                    width: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--ta-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <IconoOjo visible={verPassword} />
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" style={{ color: '#993C1D', fontSize: 13, margin: '10px 0 0' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              aria-busy={cargando}
              className="ta-login-submit"
              style={{
                width: '100%',
                height: 44,
                marginTop: 20,
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(160deg, color-mix(in srgb, var(--ta-accent) 82%, white 18%), var(--ta-accent) 55%, color-mix(in srgb, var(--ta-accent) 85%, black 15%))',
                color: 'var(--ta-on-accent)',
                fontSize: 14,
                fontWeight: 500,
                cursor: cargando ? 'default' : 'pointer',
                opacity: cargando ? 0.6 : 1,
                transition: 'background 150ms ease, transform 80ms ease',
              }}
            >
              {cargando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
