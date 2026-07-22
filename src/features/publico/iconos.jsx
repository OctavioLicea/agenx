// src/features/publico/iconos.jsx
// Motivo: FEAT — 17 jul 2026, parte 1 del sistema de temas. Íconos SVG
//   compartidos entre TODOS los temas de la página pública (Estándar,
//   Elegance, los que vengan). La forma de un ícono (cama, baño, auto...)
//   no cambia entre temas, solo su color/grosor — eso lo decide cada tema
//   con CSS (currentColor + su propia variable de acento), así que no
//   hay que duplicar el SVG por tema. Mismo trazo 1.8 que el resto de la
//   app (IconoCerrar/IconoExportar de PropiedadForm.jsx).
// Timestamp: 2026-07-17

const iconoProps = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function IconoCama() {
  return <svg {...iconoProps}><path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 18v2M21 18v2M3 13h18M7 13V9a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v4" /></svg>
}
export function IconoBano() {
  return <svg {...iconoProps}><path d="M4 12h16M6 12V6a2 2 0 0 1 2-2h1M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6M9 20v1M15 20v1" /></svg>
}
export function IconoAuto() {
  return <svg {...iconoProps}><path d="M5 17h14M5 17a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM19 17a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0zM3.5 17V12l2-5.5A2 2 0 0 1 7.4 5h9.2a2 2 0 0 1 1.9 1.5L20.5 12v5" /></svg>
}
export function IconoRegla() {
  return <svg {...iconoProps}><path d="M3 8h18v8H3zM7 8v3M11 8v3M15 8v3M19 8v3" /></svg>
}
export function IconoTerreno() {
  return <svg {...iconoProps}><path d="M3 9l9-6 9 6-9 6-9-6zM3 9v6l9 6 9-6V9" /></svg>
}
export function IconoBrujula() {
  return <svg {...iconoProps}><circle cx="12" cy="12" r="9" /><path d="M14.5 9.5l-1.8 5.3-5.2 1.7 1.8-5.3z" /></svg>
}
export function IconoPin({ width = 20, height = 20 }) {
  return <svg {...iconoProps} width={width} height={height}><path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
}
export function IconoWhatsApp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.28-1.38a9.87 9.87 0 0 0 4.7 1.2h.01c5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.79 14.1c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.11-1.81-.11-.42-.13-.95-.31-1.64-.61-2.9-1.25-4.79-4.17-4.93-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.78-.36.19 0 .39.002.56.01.18.008.42-.07.66.5.24.58.83 2.01.9 2.16.07.15.12.33.02.53-.09.19-.14.31-.28.48-.14.16-.29.36-.42.49-.14.14-.28.29-.12.57.16.28.71 1.17 1.52 1.9 1.05.94 1.93 1.23 2.21 1.37.28.14.44.12.61-.07.16-.19.7-.82.88-1.1.19-.28.37-.23.62-.14.25.09 1.6.75 1.87.89.28.14.46.21.53.32.07.12.07.66-.17 1.34z" />
    </svg>
  )
}
export function IconoCompartir() {
  return <svg {...iconoProps} width={16} height={16}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" /></svg>
}
export function IconoTelefono() {
  return <svg {...iconoProps} width={15} height={15}><path d="M4 5c0-.5.5-1 1-1h2.5c.4 0 .8.3.9.7l.9 2.9c.1.4 0 .8-.3 1.1L7.5 10c1 2.2 2.7 3.9 4.9 4.9l1.3-1.5c.3-.3.7-.4 1.1-.3l2.9.9c.4.1.7.5.7.9V18c0 .5-.5 1-1 1h-1C9.3 19 4 13.7 4 6z" /></svg>
}
// 21 jul 2026: botón de contacto "Correo" (mailto:) en los 3 temas —
// perfiles.correo_publico ya existía como dato, faltaba el botón.
export function IconoCorreo() {
  return <svg {...iconoProps} width={15} height={15}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 6.5l8 6 8-6" /></svg>
}
export function IconoFoto() {
  return <svg {...iconoProps} width={16} height={16}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M21 16l-5-4-4 3-3-2-6 5" /></svg>
}
// 18 jul 2026, a pedido de Okta: botón de código QR junto a "Compartir" en
// los 3 temas de la página pública.
export function IconoQR() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 17h2M14 14h3v3M20 14v3h-1M17 20h3v-3" />
    </svg>
  )
}
export function IconoCerrarLightbox() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
}
export function IconoFlecha({ direccion }) {
  const d = direccion === 'izq' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}
