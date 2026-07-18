// src/features/publico/componentesCompartidos.jsx
// Motivo: FEAT — 17 jul 2026, parte 1 del sistema de temas. Piezas de UI
//   genéricas que CUALQUIER tema puede reusar tal cual: la marca de agua
//   (overlay del logo del asesor sobre una foto) y el lightbox (modal de
//   foto ampliada con navegación). Ninguna decisión de aquí depende de la
//   paleta/tipografía de un tema — si algún tema necesita un lightbox muy
//   distinto, se hace su propia versión, pero por ahora Estándar y
//   Elegance comparten éste.
// Timestamp: 2026-07-17

import { useEffect } from 'react'
import { IconoCerrarLightbox, IconoFlecha } from './iconos'
import './componentesCompartidos.css'

// --- marca de agua (logo del asesor superpuesto en cada foto) -----------

export function Marca({ logoUrl, maxAncho = 55 }) {
  if (!logoUrl) return null
  return (
    <img
      src={logoUrl}
      alt=""
      aria-hidden="true"
      style={{
        position: 'absolute',
        right: '5%',
        bottom: '5%',
        width: '18%',
        maxWidth: maxAncho,
        opacity: 0.6,
        pointerEvents: 'none',
        filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.45))',
      }}
    />
  )
}

// --- lightbox (ver foto ampliada, con navegación prev/siguiente) --------

export function Lightbox({ fotos, indice, logoUrl, onCerrar, onAnterior, onSiguiente }) {
  useEffect(() => {
    if (indice === null) return
    function alPresionar(e) {
      if (e.key === 'Escape') onCerrar()
      if (e.key === 'ArrowLeft') onAnterior()
      if (e.key === 'ArrowRight') onSiguiente()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [indice, onCerrar, onAnterior, onSiguiente])

  if (indice === null) return null
  const foto = fotos[indice]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto ampliada"
      onClick={onCerrar}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,15,12,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <button type="button" onClick={(e) => { e.stopPropagation(); onCerrar() }} aria-label="Cerrar" className="pp-lightbox-cerrar">
        <IconoCerrarLightbox />
      </button>

      {fotos.length > 1 && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onAnterior() }} aria-label="Foto anterior" className="pp-lightbox-nav pp-lightbox-nav-izq">
          <IconoFlecha direccion="izq" />
        </button>
      )}

      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '84vh' }}>
        <img src={foto.url} alt="" style={{ maxWidth: '90vw', maxHeight: '84vh', display: 'block', borderRadius: 4 }} />
        <Marca logoUrl={logoUrl} maxAncho={100} />
      </div>

      {fotos.length > 1 && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onSiguiente() }} aria-label="Foto siguiente" className="pp-lightbox-nav pp-lightbox-nav-der">
          <IconoFlecha direccion="der" />
        </button>
      )}

      {fotos.length > 1 && (
        <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: 13, opacity: 0.85 }}>
          {indice + 1} / {fotos.length}
        </div>
      )}
    </div>
  )
}
