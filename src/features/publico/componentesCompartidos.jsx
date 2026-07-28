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
import { useMap } from 'react-leaflet'
import { IconoCerrarLightbox, IconoFlecha } from './iconos'
import { useCerrarConBack } from './useCerrarConBack'
import './componentesCompartidos.css'

// --- fix de tamaño del mapa (Leaflet) -------------------------------------
// 24 jul 2026, reportado por Okta en el tema Elegance ("el mapa no responde
// al mouse hasta que doy clic"): mismo bug ya conocido y resuelto en
// ListadoPropiedades.jsx (CRM) — si el contenedor del mapa no tenía su alto
// final calculado cuando Leaflet se montó (aquí `.pe-mapa`/`.pp-mapa` usan
// `aspect-ratio` en CSS, que a veces resuelve después del primer render),
// Leaflet cachea un tamaño interno equivocado y el drag/pan no funciona
// bien hasta que algo fuerza un recálculo. `invalidateSize()` en un
// timeout corto tras montar corrige el tamaño cacheado sin depender de que
// el usuario interactúe primero. Compartido entre los 3 temas.
export function InvalidarTamanoMapa() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 250)
    return () => clearTimeout(t)
  }, [map])
  return null
}

// --- modal de código QR (liga a la página pública) -----------------------
// 18 jul 2026, a pedido de Okta: opción de compartir la liga como código
// QR, además del botón "Compartir"/copiar que ya existía (que solo servía
// para WhatsApp/copiar — un QR sirve para tarjetas físicas, letreros o
// mostrarlo en persona). Generado con la API pública y gratuita de
// api.qrserver.com (sin key, sin dependencia nueva) — mismo criterio de
// "servicio externo sin costo" que ya usa el mapa (OpenStreetMap/
// Nominatim) en vez de agregar una librería de generación de QR al
// bundle. Reusable por los 3 temas: mismo patrón de overlay oscuro que
// ya usa <Lightbox> arriba.
export function ModalQR({ url, titulo, onCerrar }) {
  // 27 jul 2026: el botón físico de atrás cierra el modal en vez de sacar
  // al prospecto de la página. <ModalQR> solo se monta cuando está
  // abierto, así que el hook recibe `true` fijo.
  useCerrarConBack(true, onCerrar)

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(url)}`
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Código QR de la liga"
      onClick={onCerrar}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,15,12,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 14, padding: 24, maxWidth: 320, width: '100%', textAlign: 'center', position: 'relative' }}
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, border: 'none', borderRadius: 8, background: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <IconoCerrarLightbox />
        </button>
        <p style={{ margin: '0 0 14px', fontSize: 13.5, fontWeight: 600, color: '#1a1a1a' }}>Código QR</p>
        <img src={qrSrc} alt={`Código QR de ${titulo || 'la propiedad'}`} width={260} height={260} style={{ display: 'block', margin: '0 auto 14px', borderRadius: 6, width: '100%', height: 'auto', maxWidth: 260 }} />
        <p style={{ margin: 0, fontSize: 12, color: '#666', wordBreak: 'break-all' }}>{url}</p>
      </div>
    </div>
  )
}

// --- modal del plano arquitectónico -------------------------------------
// 27 jul 2026, a pedido de Okta. Solo se usa cuando el plano publicado es
// una IMAGEN: los PDF se abren en pestaña nueva desde el propio botón del
// tema (un <iframe> de PDF no es confiable en celular — en iOS a menudo no
// hace scroll o no renderiza). Un plano se lee acercándose, así que el
// modal permite hacer zoom con el gesto normal del navegador: la imagen se
// muestra a su ancho natural dentro de un contenedor con scroll en ambos
// ejes, en vez de encogerse para caber en pantalla.
// Cierra con Escape, con el botón, tocando el fondo, o con el botón físico
// de atrás (useCerrarConBack) — mismo comportamiento que el lightbox.
export function ModalPlano({ plano, onCerrar }) {
  useCerrarConBack(true, onCerrar)

  useEffect(() => {
    function alPresionar(e) {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  if (!plano) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Plano de la propiedad"
      onClick={onCerrar}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,15,12,0.94)', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {plano.descripcion || 'Plano'}
        </p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCerrar() }}
          aria-label="Cerrar"
          className="pp-lightbox-cerrar"
          style={{ position: 'static', flexShrink: 0 }}
        >
          <IconoCerrarLightbox />
        </button>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{ flex: 1, overflow: 'auto', padding: '0 14px 14px', WebkitOverflowScrolling: 'touch' }}
      >
        <img
          src={plano.url}
          alt={plano.descripcion || 'Plano de la propiedad'}
          style={{ display: 'block', margin: '0 auto', maxWidth: 'none', minWidth: '100%', height: 'auto', borderRadius: 6, background: '#fff' }}
        />
      </div>
    </div>
  )
}

// --- pie con la liga al CRM ---------------------------------------------
// 27 jul 2026, a pedido de Okta ("¿cómo ligamos la página pública con la
// app?"). Liga discreta al pie que abre esta misma propiedad dentro de
// TuAsesor para quien tenga credenciales — App.jsx consume el parámetro
// `?propiedad=<id>` y abre la ficha directo.
//
// Deliberadamente sobrio: esta página la ven CLIENTES, y un botón grande
// que los manda a un login sería confuso y le quitaría peso a los CTAs
// reales (WhatsApp, ficha técnica). La pregunta "¿Eres asesor?" filtra
// sola: el prospecto lee eso y sabe que no es para él. Va después de una
// línea divisoria, con tipografía chica y color apagado.
//
// No expone nada nuevo: el id de la propiedad ya viaja en la URL pública.
// Quién puede abrirla la decide RLS, no esta liga.
export function PieTuAsesor({ propiedadId, colorTexto, colorLiga, colorBorde }) {
  if (!propiedadId) return null
  return (
    <div
      style={{
        borderTop: `0.5px solid ${colorBorde}`,
        margin: '8px auto 0',
        padding: '18px 20px 28px',
        maxWidth: 980,
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: 11.5, color: colorTexto, letterSpacing: '0.01em' }}>
        ¿Eres asesor?{' '}
        <a
          href={`${window.location.origin}/?propiedad=${propiedadId}`}
          style={{ color: colorLiga, textDecoration: 'none', fontWeight: 600, borderBottom: `1px solid ${colorLiga}`, paddingBottom: 1 }}
        >
          Abrir en TuAsesor
        </a>
      </p>
    </div>
  )
}

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
  // 27 jul 2026: a diferencia de <ModalQR>, este componente se monta
  // siempre (aunque `indice` sea null) — por eso el hook recibe el estado
  // real de apertura en vez de `true` fijo.
  useCerrarConBack(indice !== null, onCerrar)

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
