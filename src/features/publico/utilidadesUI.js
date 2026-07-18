// src/features/publico/utilidadesUI.js
// Motivo: FEAT — 17 jul 2026. Helpers de UI que NO son componentes React
//   (estilos/objetos/funciones puras), separados de componentesCompartidos.jsx
//   por regla del linter (react-refresh/only-export-components: un archivo
//   de componentes no puede exportar también valores sueltos).
// Timestamp: 2026-07-17

import L from 'leaflet'

// Reset de estilos nativos de <button> para usarlo como contenedor de foto
// clicable sin que se vea a botón — mismo criterio de accesibilidad
// (foco, teclado) que ya usa el resto de la app.
export const resetBoton = { border: 'none', padding: 0, margin: 0, background: 'none', font: 'inherit', display: 'block', width: '100%', height: '100%', cursor: 'pointer', WebkitAppearance: 'none' }

export function crearIconoMapa(acento) {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${acento};border:2px solid #fff;box-shadow:0 0 0 1px ${acento}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}
