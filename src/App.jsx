// src/App.jsx
// Motivo: primer módulo raíz nuevo — Contactos (Sprint 2). Nuevas vistas
//   'contactos' (listado) y 'contacto-form' (ficha), con su propio
//   listadoContactosVersion (mismo patrón que listadoVersion de
//   Propiedades). TopBar recibe onIrAContactos para navegar entre los 2
//   módulos raíz — primera vez que el breadcrumb realmente lo necesita.
//   [Actualización 2026-07-13] Tercer módulo raíz — Interacciones: vista
//   'interacciones', listadoInteraccionesVersion (mismo patrón de
//   refreshKey), montado siempre y oculto con CSS igual que Propiedades/
//   Contactos (evita refetch/remount innecesario al navegar entre módulos).
// Timestamp: 2026-07-13, 21:41 hrs

import { useState, useEffect, lazy, Suspense } from 'react'
import { supabase } from './lib/supabaseClient'
import LoginForm from './features/auth/LoginForm'
import ListadoPropiedades from './features/propiedades/ListadoPropiedades'
import ListadoContactos from './features/contactos/ListadoContactos'
import ListadoInteracciones from './features/interacciones/ListadoInteracciones'
import ListadoCitas from './features/citas/ListadoCitas'
import TopBar from './components/TopBar'
import './App.css'

// Sesión 16: PropiedadForm, ContactoForm y PerfilForm se cargan solo
// cuando `vista` realmente los necesita (a diferencia de los 4 Listado*
// de arriba, que se quedan montados siempre a propósito — ver comentario
// más abajo — estos 3 SÍ se desmontan/remontan, así que lazy() no rompe
// ese patrón y sí saca su peso (incluye @react-pdf/renderer vía
// ExportaFicha) del bundle inicial. Bajó el aviso de Vite de "chunks
// larger than 500 kB" reportado en Sesión 12.
const PropiedadForm = lazy(() => import('./features/propiedades/PropiedadForm'))
const ContactoForm = lazy(() => import('./features/contactos/ContactoForm'))
const PerfilForm = lazy(() => import('./features/perfil/PerfilForm'))

function App() {
  const [sesion, setSesion] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [vista, setVista] = useState('buscador') // 'buscador' | 'form' | 'perfil' | 'contactos' | 'contacto-form' | 'interacciones' | 'citas'
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState(null)
  const [contactoSeleccionado, setContactoSeleccionado] = useState(null)
  const [perfilVersion, setPerfilVersion] = useState(0)
  const [listadoVersion, setListadoVersion] = useState(0)
  const [listadoContactosVersion, setListadoContactosVersion] = useState(0)
  const [listadoInteraccionesVersion, setListadoInteraccionesVersion] = useState(0)
  const [listadoCitasVersion, setListadoCitasVersion] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setSesion(nuevaSesion)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // onAuthStateChange ya actualiza sesion a null automaticamente
  }

  // Siempre sube listadoVersion al volver al buscador — sin importar si
  // vienes de "Cerrar" en el wizard o del ícono de Home del TopBar. Antes
  // solo "Cerrar" refrescaba, así que salir por Home dejaba el listado
  // con datos viejos en memoria (el fix de mantenerlo montado hizo esto
  // más notorio: reabrir la misma propiedad mostraba la versión de antes
  // de tus últimos cambios, aunque sí estuvieran guardados en BD).
  const irAlBuscador = () => {
    setListadoVersion((v) => v + 1)
    setVista('buscador')
    setPropiedadSeleccionada(null)
  }

  const seleccionarPropiedad = (propiedad) => {
    setPropiedadSeleccionada(propiedad)
    setVista('form')
  }

  const nuevaPropiedad = () => {
    setPropiedadSeleccionada(null)
    setVista('form')
  }

  const irAlPerfil = () => {
    setVista('perfil')
  }

  const alGuardarPerfil = () => {
    setPerfilVersion((v) => v + 1)
    irAlBuscador()
  }

  const irAContactos = () => {
    setListadoContactosVersion((v) => v + 1)
    setVista('contactos')
    setContactoSeleccionado(null)
  }

  const seleccionarContacto = (contacto) => {
    setContactoSeleccionado(contacto)
    setVista('contacto-form')
  }

  const nuevoContacto = () => {
    setContactoSeleccionado(null)
    setVista('contacto-form')
  }

  const alSalirDeContacto = () => {
    setListadoContactosVersion((v) => v + 1)
    setVista('contactos')
    setContactoSeleccionado(null)
  }

  const irAInteracciones = () => {
    setListadoInteraccionesVersion((v) => v + 1)
    setVista('interacciones')
  }

  const irACitas = () => {
    setListadoCitasVersion((v) => v + 1)
    setVista('citas')
  }

  if (cargando) {
    return <p style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--ta-text-muted)' }}>Cargando...</p>
  }

  if (!sesion) {
    return <LoginForm onLogin={setSesion} />
  }

  const breadcrumb =
    vista === 'buscador'
      ? ['Propiedades']
      : vista === 'perfil'
        ? ['Mi perfil']
        : vista === 'contactos'
          ? ['Contactos']
          : vista === 'contacto-form'
            ? ['Contactos', contactoSeleccionado ? 'Editar' : 'Nuevo']
            : vista === 'interacciones'
              ? ['Interacciones']
              : vista === 'citas'
                ? ['Citas']
                : ['Propiedades', propiedadSeleccionada ? 'Editar' : 'Nueva']

  return (
    <div>
      <TopBar
        user={sesion.user}
        userEmail={sesion.user.email}
        perfilVersion={perfilVersion}
        breadcrumb={breadcrumb}
        onHome={irAlBuscador}
        onIrAContactos={irAContactos}
        onIrAInteracciones={irAInteracciones}
        onIrACitas={irACitas}
        onVerPerfil={irAlPerfil}
        onLogout={handleLogout}
      />

      {/* ListadoPropiedades se queda montado siempre (oculto con display:none
          cuando no es la vista activa) — antes se desmontaba y remontaba en
          cada ida y vuelta, lo que forzaba: nueva consulta a Supabase,
          Leaflet re-inicializando con recarga de tiles, y fotos recargando.
          Eso causaba el retraso de ~4s reportado al volver al listado. */}
      <div style={{ display: vista === 'buscador' ? 'block' : 'none' }}>
        <ListadoPropiedades
          onSeleccionar={seleccionarPropiedad}
          onNueva={nuevaPropiedad}
          refreshKey={listadoVersion}
        />
      </div>

      <div style={{ display: vista === 'contactos' ? 'block' : 'none' }}>
        <ListadoContactos
          onSeleccionar={seleccionarContacto}
          onNuevo={nuevoContacto}
          refreshKey={listadoContactosVersion}
        />
      </div>

      <div style={{ display: vista === 'interacciones' ? 'block' : 'none' }}>
        <ListadoInteracciones refreshKey={listadoInteraccionesVersion} />
      </div>

      <div style={{ display: vista === 'citas' ? 'block' : 'none' }}>
        <ListadoCitas refreshKey={listadoCitasVersion} />
      </div>

      {vista === 'form' && (
        <Suspense fallback={<p style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--ta-text-muted)' }}>Cargando...</p>}>
          <PropiedadForm
            propiedadInicial={propiedadSeleccionada}
            onGuardado={irAlBuscador}
          />
        </Suspense>
      )}

      {vista === 'contacto-form' && (
        <Suspense fallback={<p style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--ta-text-muted)' }}>Cargando...</p>}>
          <ContactoForm
            contactoInicial={contactoSeleccionado}
            onGuardado={alSalirDeContacto}
          />
        </Suspense>
      )}

      {vista === 'perfil' && (
        <Suspense fallback={<p style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--ta-text-muted)' }}>Cargando...</p>}>
          <PerfilForm
            user={sesion.user}
            onGuardado={alGuardarPerfil}
            onPerfilActualizado={() => setPerfilVersion((v) => v + 1)}
          />
        </Suspense>
      )}
    </div>
  )
}

export default App
