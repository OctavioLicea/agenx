// src/features/publico/PropiedadPublica.jsx
// Motivo: FEAT — Sesión 20 (17 jul 2026, pedido de Nydia). Página pública
//   de presentación por propiedad ("modo presentación"), para mandarle al
//   cliente un link en vez de solo el PDF. Accede sin sesión — lee de las
//   vistas públicas (propiedades_publicas, fotos_propiedad_publicas,
//   perfiles_publicos), que ya vienen filtradas por `publicado = true` y
//   sin campos sensibles. No usa react-router: el ruteo es manual en
//   main.jsx.
//
//   [17 jul, refactor de arquitectura — parte 1 del sistema de temas]:
//   este archivo dejó de ser "la página" y pasó a ser un shell delgado.
//   Todo el fetch/formato de datos vive en `usePropiedadPublica.js`
//   (compartido por cualquier tema); todo el diseño visual que antes
//   estaba aquí se movió a `temas/estandar/PresentacionEstandar.jsx`.
//   Este archivo solo: llama al hook, maneja los estados genéricos
//   (cargando/no encontrada, iguales sin importar el tema), decide qué
//   tema pintar según `perfil.estilo_pagina_publica` (con fallback a
//   Estándar) y lo carga con `lazy()` vía `temas/registro.js` — así el
//   visitante solo descarga el CSS/JS del tema que en verdad ve.
// Timestamp: 2026-07-17

import { Suspense, useMemo } from 'react'
import '../../App.css'
import { usePropiedadPublica } from './usePropiedadPublica'
import { resolverTema, TEMA_DEFAULT } from './temas/registro'

export default function PropiedadPublica({ id }) {
  const datos = usePropiedadPublica(id)
  const estilo = datos.perfil?.estilo_pagina_publica || TEMA_DEFAULT
  // resolverTema solo elige entre componentes lazy() ya creados UNA VEZ a
  // nivel de módulo en temas/registro.js; nunca crea un lazy() nuevo en
  // cada render — es el patrón que recomienda React para lazy loading
  // dinámico. useMemo evita recalcular la selección si `estilo` no
  // cambió. El eslint-disable de abajo (en el JSX) es porque el linter no
  // puede verificar estáticamente que `Tema` sea siempre uno de esos
  // componentes ya estables.
  const Tema = useMemo(() => resolverTema(estilo), [estilo])

  if (datos.estado === 'cargando') {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <p style={{ color: 'var(--ta-text-muted)', fontSize: 14 }}>Cargando...</p>
      </div>
    )
  }

  if (datos.estado === 'no_encontrada') {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--ta-text)', margin: '0 0 8px' }}>Esta propiedad no está disponible</p>
        <p style={{ fontSize: 14, color: 'var(--ta-text-muted)', margin: 0 }}>El link puede haber cambiado o la propiedad ya no está publicada.</p>
      </div>
    )
  }

  return (
    <Suspense fallback={<div style={{ minHeight: '100svh', background: '#fff' }} />}>
      {/* eslint-disable-next-line react-hooks/static-components -- ver nota arriba de `const Tema` */}
      <Tema datos={datos} />
    </Suspense>
  )
}
