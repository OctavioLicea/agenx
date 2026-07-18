// src/features/publico/temas/elegante/PresentacionElegante.jsx
// Motivo: FEAT — 17 jul 2026. Segundo tema de la página pública, reservado
//   por asesor (perfiles.acceso_tema_elegante — hoy solo Nydia). Basado en
//   la guía que compartió Okta (docs/gemini-code-EstiloPaginaPropiedad.md)
//   y el mockup "PRISE", con el alcance recortado a lo ya decidido:
//   - Header SIN menú de sitio completo (seguimos siendo 1 propiedad = 1
//     página) — en su lugar, marca "TuAsesor" + fecha/hora + "Solicitar
//     Tour".
//   - CTAs se quedan en WhatsApp directo por ahora (formulario a CRM
//     diferido a Fase 2, ver BACKLOG.md).
//   - Sin sección de logos de clientes ni newsletter (no aplican).
//   - Mapa: Leaflet embebido (ya decidido, gratis) + link a Google Maps.
//   Reusa el mismo hook de datos, íconos, Lightbox y marca de agua que
//   Estándar — nunca toca Supabase directamente.
// Timestamp: 2026-07-17

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { TIPOS_LABEL, OPERACION_LABEL, ZONA_LABEL, tieneValor } from '../../usePropiedadPublica'
import { Marca, Lightbox } from '../../componentesCompartidos'
import { resetBoton, crearIconoMapa } from '../../utilidadesUI'
import { IconoCama, IconoBano, IconoAuto, IconoRegla, IconoTerreno, IconoBrujula, IconoPin, IconoWhatsApp, IconoTelefono, IconoFoto } from '../../iconos'
import logoTuAsesor from '../../../../assets/branding/logo-isotipo-dorado.svg'
import './elegante.css'

function fechaHoraActual() {
  const ahora = new Date()
  const fecha = ahora.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const hora = ahora.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })
  return `${fecha.charAt(0).toUpperCase()}${fecha.slice(1)} · ${hora}`
}

function useRelojEnVivo() {
  const [texto, setTexto] = useState(fechaHoraActual)
  useEffect(() => {
    const id = setInterval(() => setTexto(fechaHoraActual()), 30000)
    return () => clearInterval(id)
  }, [])
  return texto
}

// --- carrusel principal + columna de miniaturas --------------------------

function IconoFlechaCarrusel({ direccion }) {
  const d = direccion === 'izq' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

function CarruselGaleria({ fotos, logoUrl, onAbrir }) {
  const [indice, setIndice] = useState(0)
  if (fotos.length === 0) return null
  const miniaturas = fotos.slice(1, 5)
  const extra = fotos.length - 5

  return (
    <div className="pe-galeria">
      <div className="pe-carrusel">
        <button
          type="button"
          onClick={() => onAbrir(indice)}
          aria-label="Ver foto ampliada"
          style={{ ...resetBoton, position: 'absolute', inset: 0 }}
        >
          <img src={fotos[indice].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <Marca logoUrl={logoUrl} />
        </button>

        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndice((i) => (i - 1 + fotos.length) % fotos.length)}
              aria-label="Foto anterior"
              style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.85)', color: '#212121', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <IconoFlechaCarrusel direccion="izq" />
            </button>
            <button
              type="button"
              onClick={() => setIndice((i) => (i + 1) % fotos.length)}
              aria-label="Foto siguiente"
              style={{ position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.85)', color: '#212121', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <IconoFlechaCarrusel direccion="der" />
            </button>
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
              {fotos.map((f, i) => (
                <button
                  key={f.url}
                  type="button"
                  onClick={() => setIndice(i)}
                  aria-label={`Ver foto ${i + 1}`}
                  style={{ width: 6, height: 6, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: i === indice ? '#fff' : 'rgba(255,255,255,0.5)' }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {miniaturas.length > 0 && (
        <div className="pe-galeria-grid">
          {miniaturas.map((f, i) => {
            const indiceReal = i + 1
            const esUltima = i === miniaturas.length - 1
            return (
              <button
                key={f.url}
                type="button"
                onClick={() => setIndice(indiceReal)}
                aria-label={esUltima && extra > 0 ? `Ver las ${extra} fotos restantes` : 'Ver esta foto'}
                style={{ ...resetBoton, position: 'relative', overflow: 'hidden', borderRadius: 4, aspectRatio: '1 / 1', outline: indiceReal === indice ? '2px solid var(--pe-accent)' : 'none' }}
              >
                <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {esUltima && extra > 0 && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(33,33,33,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#fff', fontSize: 12, fontWeight: 500 }}>
                    <IconoFoto />+{extra}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatItem({ icono, valor, label }) {
  return (
    <div className="pe-stat">
      <div style={{ color: 'var(--pe-accent)', marginBottom: 6, display: 'flex', justifyContent: 'center' }}>{icono}</div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--pe-text)' }}>{valor}</p>
      <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--pe-muted)' }}>{label}</p>
    </div>
  )
}

export default function PresentacionElegante({ datos }) {
  const {
    propiedad, fotos, perfil,
    marcaTexto, telefonoPrincipal, telefonoWa, precioTexto,
    tieneUbicacion, amenidadesActivas, mensajeWa,
  } = datos

  const [lightboxIndex, setLightboxIndex] = useState(null)
  const fechaHora = useRelojEnVivo()
  const iconoMapa = useMemo(() => crearIconoMapa('#B8963A'), [])

  const mensajeTour = encodeURIComponent(`Hola, me gustaría agendar un tour para ver "${propiedad.titulo || 'la propiedad'}".`)
  const mensajeFicha = encodeURIComponent(`Hola, me interesa la ficha técnica completa de "${propiedad.titulo || 'la propiedad'}".`)

  return (
    <div className="pe-root">
      <header className="pe-header">
        <div className="pe-header-marca">
          <img src={logoTuAsesor} alt="" style={{ height: 26, width: 'auto' }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--pe-text)', letterSpacing: '-0.01em' }}>TuAsesor</span>
        </div>
        <p className="pe-header-fecha">{fechaHora}</p>
        {telefonoWa ? (
          <a className="pe-header-cta" href={`https://wa.me/52${telefonoWa}?text=${mensajeTour}`} target="_blank" rel="noreferrer">
            Solicitar Tour
          </a>
        ) : <span />}
      </header>

      <CarruselGaleria fotos={fotos} logoUrl={perfil?.logo_url} onAbrir={setLightboxIndex} />
      <Lightbox
        fotos={fotos}
        indice={lightboxIndex}
        logoUrl={perfil?.logo_url}
        onCerrar={() => setLightboxIndex(null)}
        onAnterior={() => setLightboxIndex((i) => (i - 1 + fotos.length) % fotos.length)}
        onSiguiente={() => setLightboxIndex((i) => (i + 1) % fotos.length)}
      />

      <div className="pe-cuerpo">
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '4px 10px', border: '0.5px solid var(--pe-accent)', color: 'var(--pe-accent)' }}>
              {OPERACION_LABEL[propiedad.operacion]}
            </span>
            <span style={{ fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '4px 10px', border: '0.5px solid var(--pe-border)', color: 'var(--pe-muted)' }}>
              {propiedad.tipo === 'otro' ? propiedad.tipo_otro : TIPOS_LABEL[propiedad.tipo]}
            </span>
          </div>

          <h1 style={{ margin: '0 0 8px', fontSize: 27, fontWeight: 500, color: 'var(--pe-text)', lineHeight: 1.25 }}>
            {propiedad.titulo || 'Propiedad'}
          </h1>
          {propiedad.direccion && (
            <p style={{ margin: '0 0 22px', fontSize: 13.5, color: 'var(--pe-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconoPin width={15} height={15} /> {propiedad.direccion}
            </p>
          )}

          <div className="pe-stats">
            {tieneValor(propiedad.recamaras) && <StatItem icono={<IconoCama />} valor={propiedad.recamaras} label="Recámaras" />}
            {tieneValor(propiedad.banos) && <StatItem icono={<IconoBano />} valor={propiedad.banos} label="Baños" />}
            {tieneValor(propiedad.estacionamientos) && <StatItem icono={<IconoAuto />} valor={propiedad.estacionamientos} label="Estacionamiento" />}
            {tieneValor(propiedad.m2_construccion) && <StatItem icono={<IconoRegla />} valor={`${propiedad.m2_construccion} m²`} label="Construcción" />}
            {tieneValor(propiedad.m2_terreno) && <StatItem icono={<IconoTerreno />} valor={`${propiedad.m2_terreno} m²`} label="Terreno" />}
            {ZONA_LABEL[propiedad.zona] && <StatItem icono={<IconoBrujula />} valor={ZONA_LABEL[propiedad.zona]} label="Zona" />}
          </div>

          {tieneValor(propiedad.descripcion) && (
            <div className="pe-card">
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--pe-text)' }}>Descripción</p>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.8, color: 'var(--pe-muted)', whiteSpace: 'pre-line' }}>{propiedad.descripcion}</p>
            </div>
          )}

          {amenidadesActivas.length > 0 && (
            <div className="pe-card">
              <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--pe-text)' }}>Amenidades</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', columnGap: 16, rowGap: 9 }}>
                {amenidadesActivas.map((label) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--pe-text)' }}>
                    <span style={{ width: 4, height: 4, background: 'var(--pe-accent)', flexShrink: 0 }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tieneUbicacion && (
            <div className="pe-card" style={{ padding: 0, overflow: 'hidden' }}>
              <p style={{ margin: 0, padding: '18px 22px 12px', fontSize: 13, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--pe-text)' }}>Ubicación</p>
              <div className="pe-mapa">
                <MapContainer
                  center={[Number(propiedad.lat), Number(propiedad.lng)]}
                  zoom={15}
                  scrollWheelZoom={false}
                  style={{ height: '100%', width: '100%' }}
                  attributionControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[Number(propiedad.lat), Number(propiedad.lng)]} icon={iconoMapa} />
                </MapContainer>
              </div>
              <a
                href={`https://www.google.com/maps?q=${propiedad.lat},${propiedad.lng}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'block', padding: '10px 22px', fontSize: 12, color: 'var(--pe-accent)', textDecoration: 'none' }}
              >
                Ver en Google Maps
              </a>
            </div>
          )}
        </div>

        <div className="pe-sidebar">
          <div className="pe-card">
            {precioTexto && (
              <p className="pe-precio" style={{ margin: '0 0 18px', fontSize: 28, fontWeight: 700, color: 'var(--pe-text)' }}>
                {precioTexto}{propiedad.operacion === 'renta' ? ' /mes' : ''}
              </p>
            )}
            {telefonoWa && (
              <a
                href={`https://wa.me/52${telefonoWa}?text=${mensajeWa}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 6, background: 'var(--pe-dark)', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 10, letterSpacing: '0.02em' }}
              >
                <IconoWhatsApp />Contactar por WhatsApp
              </a>
            )}
            {telefonoWa && (
              <a
                href={`https://wa.me/52${telefonoWa}?text=${mensajeFicha}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 42, borderRadius: 6, border: '1px solid var(--pe-dark)', color: 'var(--pe-dark)', fontSize: 12.5, fontWeight: 600, textDecoration: 'none', letterSpacing: '0.02em' }}
              >
                Solicitar ficha técnica
              </a>
            )}

            <div className="pe-agente">
              {perfil?.logo_url ? (
                <img src={perfil.logo_url} alt={marcaTexto || 'Logo'} className="pe-agente-foto" />
              ) : (
                <div className="pe-agente-foto" style={{ background: '#f2f2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'var(--pe-accent)' }}>
                  {(marcaTexto || '?').slice(0, 2).toUpperCase()}
                </div>
              )}
              {marcaTexto && <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--pe-text)' }}>{marcaTexto}</p>}
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--pe-muted)' }}>Asesora inmobiliaria</p>

              {(telefonoWa || telefonoPrincipal) && (
                <div className="pe-contactos">
                  {telefonoWa && (
                    <a className="pe-contacto-btn" href={`https://wa.me/52${telefonoWa}?text=${mensajeWa}`} target="_blank" rel="noreferrer">
                      <IconoWhatsApp />WhatsApp
                    </a>
                  )}
                  {telefonoPrincipal && (
                    <a className="pe-contacto-btn" href={`tel:${telefonoPrincipal}`}>
                      <IconoTelefono />Llamar
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
