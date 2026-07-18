// src/features/publico/temas/registro.js
// Motivo: FEAT — 17 jul 2026, parte 1 del sistema de temas. Mapa único de
//   estilo → componente de presentación. Agregar un tema nuevo (ej.
//   "elegante") es: crear su carpeta en temas/, sumar una línea aquí.
//   Nunca se importa el tema completo de un jalón (lazy) — así cada
//   visitante solo descarga el CSS/fuentes/JS del tema que en verdad ve.
// Timestamp: 2026-07-17

import { lazy } from 'react'

export const TEMA_DEFAULT = 'estandar'

const TEMAS = {
  estandar: lazy(() => import('./estandar/PresentacionEstandar.jsx')),
  elegante: lazy(() => import('./elegante/PresentacionElegante.jsx')),
}

// Si `estilo` no existe en el registro (tema borrado, dato viejo, o el
// asesor nunca eligió uno), cae seguro a Estándar en vez de romper la
// página.
export function resolverTema(estilo) {
  return TEMAS[estilo] || TEMAS[TEMA_DEFAULT]
}
