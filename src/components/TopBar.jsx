// src/components/TopBar.jsx
// Motivo: primer switcher real entre módulos raíz (Propiedades/Contactos,
//   Sprint 2) — se agregan como las 2 primeras entradas del menú, arriba
//   de "Mi perfil", resaltando cuál está activo según breadcrumb[0]. El
//   ícono/home de la esquina superior izquierda sigue yendo siempre a
//   Propiedades (comportamiento sin cambios).
//   [Actualización 2026-07-13] Tercer módulo raíz — Interacciones
//   (ListadoInteracciones.jsx). Misma convención: entrada en el menú,
//   resaltada vía breadcrumb[0] === 'Interacciones', prop onIrAInteracciones.
//   [Actualización 2026-07-13, más tarde]: ícono de "Interacciones" en el
//   menú cambia de globo de chat a teléfono (mismo path que IconoTelefono
//   en ContactoForm.jsx/InteraccionForm.jsx) — pedido de Okta, el nombre
//   del módulo se queda igual porque cubre WhatsApp/redes/otro, no solo
//   llamadas.
// Timestamp: 2026-07-13, 22:38 hrs

import { useState, useEffect, useRef } from 'react'
import logo from '../assets/branding/logo-isotipo-dorado.svg'
import { usePerfil } from '../hooks/usePerfil'

function formatearFechaHora(fecha) {
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
  const diaSemana = dias[fecha.getDay()]
  const fechaStr = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
  const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  return `${diaSemana} ${fechaStr}, ${horaStr}`
}

function IconoPropiedades() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 8.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V8.5" />
    </svg>
  )
}

function IconoContactos() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.3 3-6 7-6s7 2.7 7 6" />
      <path d="M17 8a3 3 0 1 1 4 2.8" />
      <path d="M22 20c0-2.4-1.7-4.5-4-5.4" />
    </svg>
  )
}

function IconoInteracciones() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

// Sprint N — Citas, cuarto módulo raíz (Sesión 13). Ícono de calendario,
// mismo trazo que IconoCalendario en InteraccionForm.jsx/ListadoCitas.jsx.
function IconoCitas() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconoUsuario() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  )
}

function IconoSalir() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

export default function TopBar({ user, userName, userEmail, perfilVersion, breadcrumb = ['Propiedades'], onHome, onIrAContactos, onIrAInteracciones, onIrACitas, onVerPerfil, onLogout }) {
  const [ahora, setAhora] = useState(new Date())
  const [menuAbierto, setMenuAbierto] = useState(false)
  const menuRef = useRef(null)

  // Prioridad: nombre_corto real del perfil > userName recibido > userEmail (fallback final).
  // perfilVersion permite forzar un refetch cuando App.jsx sabe que el perfil cambió.
  const { nombreCorto, avatarUrl } = usePerfil(user, perfilVersion)
  const nombreMostrado = nombreCorto || userName || userEmail || ''
  const inicialAvatar = (nombreMostrado || '?').trim().charAt(0).toUpperCase()

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 30000) // cada 30s, no necesita segundos exactos
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    if (!menuAbierto) return
    const cerrarSiAfuera = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false)
    }
    document.addEventListener('mousedown', cerrarSiAfuera)
    return () => document.removeEventListener('mousedown', cerrarSiAfuera)
  }, [menuAbierto])

  return (
    <header
      style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        background: 'var(--ta-surface)',
        borderBottom: '0.5px solid var(--ta-border)',
        position: 'sticky',
        top: 0,
        zIndex: 500,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <button
          type="button"
          onClick={onHome}
          aria-label="Ir al inicio"
          style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <img src={logo} alt="TuAsesor" style={{ height: 36, width: 'auto' }} />
        </button>

        <nav aria-label="Ruta de navegación" style={{ minWidth: 0, overflow: 'hidden' }}>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {breadcrumb.map((paso, idx) => (
              <span key={idx}>
                <span
                  style={{
                    color: idx === breadcrumb.length - 1 ? 'var(--ta-accent)' : 'var(--ta-text-muted)',
                    fontWeight: idx === breadcrumb.length - 1 ? 600 : 500,
                  }}
                >
                  {paso}
                </span>
                {idx < breadcrumb.length - 1 && (
                  <span style={{ margin: '0 6px', color: 'var(--ta-detail)' }}>/</span>
                )}
              </span>
            ))}
          </p>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, position: 'relative' }} ref={menuRef}>
        <div className="ta-topbar-info" style={{ textAlign: 'right', display: 'none' }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ta-text)', fontWeight: 500 }}>{nombreMostrado}</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--ta-text-muted)' }}>{formatearFechaHora(ahora)}</p>
        </div>

        <button
          type="button"
          onClick={() => setMenuAbierto((v) => !v)}
          aria-label="Menú de usuario"
          aria-expanded={menuAbierto}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: menuAbierto ? '2px solid var(--ta-accent)' : 'none',
            background: avatarUrl ? 'transparent' : 'var(--ta-accent)',
            color: 'var(--ta-on-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            fontSize: 15,
            fontWeight: 500,
            padding: 0,
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            inicialAvatar
          )}
        </button>

        {menuAbierto && (
          <div
            role="menu"
            style={{
              position: 'absolute',
              top: 52,
              right: 0,
              minWidth: 200,
              background: 'var(--ta-surface)',
              border: '0.5px solid var(--ta-border)',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(42,42,40,0.18)',
              overflow: 'hidden',
              zIndex: 600,
            }}
          >
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--ta-border)' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--ta-text)' }}>{nombreMostrado}</p>
              {nombreMostrado && (
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ta-text-muted)' }}>{userEmail}</p>
              )}
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuAbierto(false)
                onHome?.()
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                border: 'none',
                background: 'none',
                color: breadcrumb[0] === 'Propiedades' ? 'var(--ta-accent)' : 'var(--ta-text)',
                fontWeight: breadcrumb[0] === 'Propiedades' ? 500 : 400,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <IconoPropiedades />
              Propiedades
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuAbierto(false)
                onIrAContactos?.()
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                border: 'none',
                borderTop: '0.5px solid var(--ta-border)',
                background: 'none',
                color: breadcrumb[0] === 'Contactos' ? 'var(--ta-accent)' : 'var(--ta-text)',
                fontWeight: breadcrumb[0] === 'Contactos' ? 500 : 400,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <IconoContactos />
              Contactos
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuAbierto(false)
                onIrAInteracciones?.()
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                border: 'none',
                borderTop: '0.5px solid var(--ta-border)',
                background: 'none',
                color: breadcrumb[0] === 'Interacciones' ? 'var(--ta-accent)' : 'var(--ta-text)',
                fontWeight: breadcrumb[0] === 'Interacciones' ? 500 : 400,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <IconoInteracciones />
              Interacciones
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuAbierto(false)
                onIrACitas?.()
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                border: 'none',
                borderTop: '0.5px solid var(--ta-border)',
                background: 'none',
                color: breadcrumb[0] === 'Citas' ? 'var(--ta-accent)' : 'var(--ta-text)',
                fontWeight: breadcrumb[0] === 'Citas' ? 500 : 400,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <IconoCitas />
              Citas
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuAbierto(false)
                onVerPerfil?.()
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                border: 'none',
                borderTop: '0.5px solid var(--ta-border)',
                background: 'none',
                color: 'var(--ta-text)',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <IconoUsuario />
              Mi perfil
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuAbierto(false)
                onLogout?.()
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                border: 'none',
                borderTop: '0.5px solid var(--ta-border)',
                background: 'none',
                color: 'var(--ta-text)',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <IconoSalir />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 640px) {
          .ta-topbar-info { display: block !important; }
        }
      `}</style>
    </header>
  )
}
