// src/features/publico/temas/nocturno/PresentacionNocturna.jsx
// Motivo: FEAT — 18 jul 2026. Tercer tema de la página pública ("Nocturno"),
//   reservado por asesor (perfiles.acceso_tema_nocturno — hoy solo Nydia,
//   mismo patrón de acceso que Elegance). Construido a partir de un
//   mockup interactivo iterado y aprobado por Okta:
//   - Header: logo/foto + nombre comercial de la ASESORA (no de TuAsesor),
//     porque en este tema la marca visible es 100% de quien vende.
//   - Precio + CTAs + tabla de datos van arriba, junto a la galería (no
//     hasta abajo del cuerpo) — mismo pedido que ya se aplicó y luego se
//     revirtió en Elegance el 18 jul; aquí se construye desde cero con
//     ese layout ya resuelto.
//   - Specs en tabla de datos (no tarjetas con ícono) — estilo portal
//     inmobiliario de referencia que compartió Okta.
//   - Vitrina de ubicación chica (mapa no interactivo, enlaza a Google
//     Maps) en vez de un mapa grande embebido — mantiene el tema sobrio.
//   Reusa el mismo hook de datos, íconos y Lightbox que Estándar/Elegance
//   — nunca toca Supabase directamente. Todos los colores del tema viven
//   en las variables --no-* de nocturna.css, nada de hex sueltos aquí.
// Timestamp: 2026-07-18

import { useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { TIPOS_LABEL, OPERACION_LABEL, ZONA_LABEL, tieneValor } from '../../usePropiedadPublica'
import { Marca, Lightbox } from '../../componentesCompartidos'
import { crearIconoMapa } from '../../utilidadesUI'
import { IconoWhatsApp, IconoTelefono, IconoFlecha, IconoFoto, IconoPin } from '../../iconos'
import './nocturna.css'

function FilaDato({ label, valor }) {
  if (!tieneValor(valor)) return null
  return (
    <div className="no-fila">
      <span className="no-fila-label">{label}</span>
      <span className="no-fila-valor">{valor}</span>
    </div>
  )
}

function GaleriaNocturna({ fotos, logoUrl, onAbrir }) {
  const [indice, setIndice] = useState(0)
  if (fotos.length === 0) return null
  const miniaturas = fotos.slice(1, 5)
  const extra = fotos.length - 5
  const anterior = () => setIndice((i) => (i - 1 + fotos.length) % fotos.length)
  const siguiente = () => setIndice((i) => (i + 1) % fotos.length)

  return (
    <div>
      <button
        type="button"
        onClick={() => onAbrir(indice)}
        aria-label="Ver foto ampliada"
        className="no-carrusel"
        style={{ border: 'none', padding: 0, width: '100%', display: 'block', cursor: 'pointer' }}
      >
        <img src={fotos[indice].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <Marca logoUrl={logoUrl} />
      </button>

      {fotos.length > 1 && (
        <div className="no-filmstrip">
          <button type="button" onClick={anterior} aria-label="Foto anterior" className="no-filmstrip-flecha">
            <IconoFlecha direccion="izq" />
          </button>

          {miniaturas.map((f, i) => {
            const indiceReal = i + 1
            const esUltima = i === miniaturas.length - 1
            return (
              <button
                key={f.url}
                type="button"
                onClick={() => setIndice(indiceReal)}
                aria-label={esUltima && extra > 0 ? `Ver las ${extra} fotos restantes` : 'Ver esta foto'}
                className={`no-filmstrip-item${indiceReal === indice ? ' activo' : ''}`}
              >
                <img src={f.url} alt="" />
                {esUltima && extra > 0 && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,19,16,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: 'var(--no-text)', fontSize: 11 }}>
                    <IconoFoto />+{extra}
                  </div>
                )}
              </button>
            )
          })}

          <button type="button" onClick={siguiente} aria-label="Foto siguiente" className="no-filmstrip-flecha">
            <IconoFlecha direccion="der" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function PresentacionNocturna({ datos }) {
  const {
    propiedad, fotos, perfil,
    marcaTexto, telefonoPrincipal, telefonoWa, precioTexto,
    tieneUbicacion, amenidadesActivas, mensajeWa,
  } = datos

  const [lightboxIndex, setLightboxIndex] = useState(null)
  const iconoMapa = crearIconoMapa('var(--no-accent)')

  const mensajeTour = encodeURIComponent(`Hola, me gustaría agendar un tour para ver "${propiedad.titulo || 'la propiedad'}".`)
  const mensajeFicha = encodeURIComponent(`Hola, me interesa la ficha técnica completa de "${propiedad.titulo || 'la propiedad'}".`)

  return (
    <div className="no-root">
      <header className="no-header">
        <div className="no-header-inner">
          <div className="no-header-marca">
            {perfil?.logo_url ? (
              <img src={perfil.logo_url} alt="" className="no-header-avatar" />
            ) : (
              <div className="no-header-avatar-fallback">{(marcaTexto || '?').slice(0, 2).toUpperCase()}</div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{marcaTexto || 'Asesora inmobiliaria'}</p>
            </div>
          </div>
          {telefonoWa ? (
            <a className="no-header-cta" href={`https://wa.me/52${telefonoWa}?text=${mensajeTour}`} target="_blank" rel="noreferrer">
              Solicitar Tour
            </a>
          ) : <span />}
        </div>
      </header>

      <Lightbox
        fotos={fotos}
        indice={lightboxIndex}
        logoUrl={perfil?.logo_url}
        onCerrar={() => setLightboxIndex(null)}
        onAnterior={() => setLightboxIndex((i) => (i - 1 + fotos.length) % fotos.length)}
        onSiguiente={() => setLightboxIndex((i) => (i + 1) % fotos.length)}
      />

      <div className="no-hero">
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <span className="no-badge" style={{ border: '0.5px solid var(--no-accent)', color: 'var(--no-accent)' }}>
              {OPERACION_LABEL[propiedad.operacion]}
            </span>
            <span className="no-badge" style={{ border: '0.5px solid var(--no-border-strong)', color: 'var(--no-muted)' }}>
              {propiedad.tipo === 'otro' ? propiedad.tipo_otro : TIPOS_LABEL[propiedad.tipo]}
            </span>
          </div>

          <h1 className="no-titulo">{propiedad.titulo || 'Propiedad'}</h1>
          {precioTexto && (
            <p className="no-precio">{precioTexto}{propiedad.operacion === 'renta' ? ' /mes' : ''}</p>
          )}

          <div className="no-tabla">
            <FilaDato label="Zona" valor={ZONA_LABEL[propiedad.zona]} />
            <FilaDato label="Recámaras" valor={propiedad.recamaras} />
            <FilaDato label="Baños" valor={propiedad.banos} />
            <FilaDato label="Estacionamiento" valor={propiedad.estacionamientos} />
            <FilaDato label="Construcción" valor={tieneValor(propiedad.m2_construccion) ? `${propiedad.m2_construccion} m²` : null} />
            <FilaDato label="Terreno" valor={tieneValor(propiedad.m2_terreno) ? `${propiedad.m2_terreno} m²` : null} />
          </div>

          <div className="no-ctas">
            {telefonoWa && (
              <a className="no-cta-principal" href={`https://wa.me/52${telefonoWa}?text=${mensajeWa}`} target="_blank" rel="noreferrer">
                <IconoWhatsApp />WhatsApp
              </a>
            )}
            {telefonoWa && (
              <a className="no-cta-secundaria" href={`https://wa.me/52${telefonoWa}?text=${mensajeFicha}`} target="_blank" rel="noreferrer">
                Ficha técnica
              </a>
            )}
            {telefonoPrincipal && !telefonoWa && (
              <a className="no-cta-principal" href={`tel:${telefonoPrincipal}`}>
                <IconoTelefono />Llamar
              </a>
            )}
          </div>
        </div>

        <div>
          <GaleriaNocturna fotos={fotos} logoUrl={perfil?.logo_url} onAbrir={setLightboxIndex} />

          {tieneUbicacion && (
            <a
              className="no-ubicacion"
              href={`https://www.google.com/maps?q=${propiedad.lat},${propiedad.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              <div className="no-ubicacion-mapa">
                <MapContainer
                  center={[Number(propiedad.lat), Number(propiedad.lng)]}
                  zoom={14}
                  dragging={false}
                  scrollWheelZoom={false}
                  doubleClickZoom={false}
                  zoomControl={false}
                  touchZoom={false}
                  boxZoom={false}
                  keyboard={false}
                  attributionControl={false}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[Number(propiedad.lat), Number(propiedad.lng)]} icon={iconoMapa} />
                </MapContainer>
              </div>
              <div className="no-ubicacion-texto">
                <p style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {ZONA_LABEL[propiedad.zona] || propiedad.direccion || 'Ver ubicación'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--no-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IconoPin width={12} height={12} />Ver mapa completo
                </p>
              </div>
            </a>
          )}

          {amenidadesActivas.length > 0 && (
            <div className="no-amenidades">
              {amenidadesActivas.map((label) => (
                <span key={label} className="no-chip">{label}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="no-cuerpo">
        {propiedad.direccion && (
          <p style={{ margin: '-8px 0 20px', fontSize: 13, color: 'var(--no-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconoPin width={14} height={14} />{propiedad.direccion}
          </p>
        )}

        {tieneValor(propiedad.descripcion) && (
          <div className="no-card">
            <p className="no-card-titulo">Descripción</p>
            <p className="no-card-texto">{propiedad.descripcion}</p>
          </div>
        )}
      </div>
    </div>
  )
}
