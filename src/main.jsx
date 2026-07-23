import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Sesión 20 (17 jul 2026): ruteo manual para la página pública de
// presentación (/p/:id, sin login). La app no usa react-router — es un
// solo módulo raíz con `vista` como estado interno, todo detrás del
// login. Agregar una dependencia de routing solo para esta única ruta
// pública sería de más (YAGNI); en vez de eso se revisa el pathname una
// vez, antes de montar nada, y se decide qué árbol de componentes
// renderizar. Si algún día hay más rutas públicas, ahí sí vale la pena
// migrar a react-router-dom.
const PropiedadPublica = lazy(() => import('./features/publico/PropiedadPublica.jsx'))

// 22 jul 2026: mismo criterio para el link de invitación de Supabase
// (Authentication > Users > Invite user). El endpoint /auth/v1/verify de
// Supabase redirige de vuelta a la raíz con la sesión ya armada y
// `type=invite` como marcador — a veces en el hash (#...&type=invite,
// flujo clásico) y a veces en la query (?...&type=invite, si el proyecto
// tiene PKCE para email links) — se revisan los dos por seguridad, sin
// asumir cuál usa este proyecto. Si aparece, se manda a
// EstablecerPassword en vez del CRM normal.
const EstablecerPassword = lazy(() => import('./features/auth/EstablecerPassword.jsx'))

const matchPropiedadPublica = window.location.pathname.match(/^\/p\/([^/]+)\/?$/)
const esInvitacion = /type=invite/.test(window.location.hash) || /type=invite/.test(window.location.search)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {matchPropiedadPublica ? (
      <Suspense fallback={null}>
        <PropiedadPublica id={matchPropiedadPublica[1]} />
      </Suspense>
    ) : esInvitacion ? (
      <Suspense fallback={null}>
        <EstablecerPassword />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
