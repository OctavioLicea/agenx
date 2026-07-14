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

import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import LoginForm from './features/auth/LoginForm'
import PropiedadForm from './features/propiedades/PropiedadForm'
import ListadoPropiedades from './features/propiedades/ListadoPropiedades'
import PerfilForm from './features/perfil/PerfilForm'
import ListadoContactos from './features/contactos/ListadoContactos'
import ContactoForm from './features/contactos/ContactoForm'
import ListadoInteracciones from './features/interacciones/ListadoInteracciones'
import TopBar from './components/TopBar'
import './App.css'

function App() {
  const [sesion, setSesion] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [vista, setVista] = useState('buscador') // 'buscador' | 'form' | 'perfil' | 'contactos' | 'contacto-form' | 'interacciones'
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState(null)
  const [contactoSeleccionado, setContactoSeleccionado] = useState(null)
  const [perfilVersion, setPerfilVersion] = useState(0)
  const [listadoVersion, setListadoVersion] = useState(0)
  const [listadoContactosVersion, setListadoContactosVersion] = useState(0)
  const [listadoInteraccionesVersion, setListadoInteraccionesVersion] = useState(0)

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

      {vista === 'form' && (
        <PropiedadForm
          propiedadInicial={propiedadSeleccionada}
          onGuardado={irAlBuscador}
        />
      )}

      {vista === 'contacto-form' && (
        <ContactoForm
          contactoInicial={contactoSeleccionado}
          onGuardado={alSalirDeContacto}
        />
      )}

      {vista === 'perfil' && (
        <PerfilForm
          user={sesion.user}
          onGuardado={alGuardarPerfil}
          onPerfilActualizado={() => setPerfilVersion((v) => v + 1)}
        />
      )}
    </div>
  )
}

export default App
