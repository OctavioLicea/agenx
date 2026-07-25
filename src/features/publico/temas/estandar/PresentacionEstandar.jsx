// src/features/publico/temas/estandar/PresentacionEstandar.jsx
// Motivo: FEAT — 17 jul 2026, parte 1 del sistema de temas. Diseño visual
//   de la página pública que ya estaba en producción (Sesión 18, 16 jul —
//   galería 1+4, tarjetas de stats, sidebar de precio/contacto) movido
//   tal cual a su propio "tema", sin cambios de diseño. Recibe todos los
//   datos ya resueltos por `usePropiedadPublica` — nunca toca Supabase
//   directamente.
// Timestamp: 2026-07-17

import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { TIPOS_LABEL, OPERACION_LABEL, ZONA_LABEL, tieneValor } from '../../usePropiedadPublica'
import { Marca, Lightbox, ModalQR, InvalidarTamanoMapa } from '../../componentesCompartidos'
import { resetBoton, crearIconoMapa } from '../../utilidadesUI'
import { IconoCama, IconoBano, IconoAuto, IconoRegla, IconoTerreno, IconoBrujula, IconoPin, IconoWhatsApp, IconoCompartir, IconoQR, IconoTelefono, IconoCorreo, IconoFoto } from '../../iconos'
import './estandar.css'

// --- galería (1 grande + hasta 4 chicas, "+N" en la última si sobran) ----
// Cada foto es un <button> real (no un <div onClick>) para que el anillo de
// foco global y la navegación por teclado funcionen — mismo criterio de
// accesibilidad ya usado en el resto de la app.

function GaleriaFotos({ fotos, logoUrl, onAbrir }) {
  if (fotos.length === 0) return null
  const portada = fotos[0]
  const resto = fotos.slice(1, 5)
  const extra = fotos.length - 5

  return (
    <div className="pp-galeria">
      <button
        type="button"
        onClick={() => onAbrir(0)}
        aria-label="Ver foto ampliada"
        style={{ ...resetBoton, position: 'relative', borderRadius: resto.length > 0 ? '12px 0 0 12px' : 12, overflow: 'hidden' }}
      >
        <img src={portada.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', aspectRatio: '4 / 3' }} />
        <Marca logoUrl={logoUrl} />
      </button>
      {resto.length > 0 && (
        <div className="pp-galeria-grid">
          {resto.map((f, i) => {
            const esUltima = i === resto.length - 1
            const indiceReal = i + 1
            return (
              <button
                type="button"
                key={f.url}
                onClick={() => onAbrir(indiceReal)}
                aria-label={esUltima && extra > 0 ? `Ver las ${extra} fotos restantes` : 'Ver foto ampliada'}
                style={{ ...resetBoton, position: 'relative', overflow: 'hidden', aspectRatio: '1 / 1' }}
              >
                <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <Marca logoUrl={logoUrl} />
                {esUltima && extra > 0 && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(31,58,44,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#fff', fontSize: 13, fontWeight: 500 }}>
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

function StatCard({ icono, valor, label }) {
  return (
    <div style={{ background: 'var(--ta-bg)', border: '0.5px solid var(--ta-border)', borderRadius: 12, padding: '20px 10px', textAlign: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: 'var(--ta-accent)' }}>
        {icono}
      </div>
      <p style={{ margin: 0, fontSize: 19, fontWeight: 600, color: 'var(--ta-text)' }}>{valor}</p>
      <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--ta-text-muted)' }}>{label}</p>
    </div>
  )
}

export default function PresentacionEstandar({ datos }) {
  const {
    propiedad, fotos, perfil, acento,
    marcaTexto, telefonoPrincipal, telefonoWa, precioTexto,
    tieneUbicacion, amenidadesActivas, terminosRenta, mensajeWa,
    compartido, compartirLiga,
  } = datos

  // 24 jul — solo aplica a propiedades en renta; si no hay nada capturado
  // (ficha vieja o campos vacíos) la tarjeta ni se pinta.
  const hayTerminosRenta = propiedad.operacion === 'renta' && (
    tieneValor(terminosRenta.meses_deposito) ||
    tieneValor(terminosRenta.meses_minimo_contrato) ||
    tieneValor(terminosRenta.requisitos_fisica) ||
    tieneValor(terminosRenta.requisitos_moral)
  )

  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [mostrarQR, setMostrarQR] = useState(false)
  const iconoMapa = useMemo(() => crearIconoMapa(acento), [acento])

  return (
    <div style={{ minHeight: '100svh', background: '#fff' }}>
      <GaleriaFotos fotos={fotos} logoUrl={perfil?.logo_url} onAbrir={setLightboxIndex} />
      <Lightbox
        fotos={fotos}
        indice={lightboxIndex}
        logoUrl={perfil?.logo_url}
        onCerrar={() => setLightboxIndex(null)}
        onAnterior={() => setLightboxIndex((i) => (i - 1 + fotos.length) % fotos.length)}
        onSiguiente={() => setLightboxIndex((i) => (i + 1) % fotos.length)}
      />

      <div className="pp-cuerpo">
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 6, background: 'var(--ta-bg)', color: 'var(--ta-accent)' }}>
              {OPERACION_LABEL[propiedad.operacion]}
            </span>
            <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'var(--ta-bg)', color: 'var(--ta-text-muted)' }}>
              {propiedad.tipo === 'otro' ? propiedad.tipo_otro : TIPOS_LABEL[propiedad.tipo]}
            </span>
          </div>

          <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 500, color: 'var(--ta-text)', letterSpacing: -0.2, lineHeight: 1.3 }}>
            {propiedad.titulo || 'Propiedad'}
          </h1>
          {propiedad.direccion && (
            <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--ta-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconoPin width={15} height={15} /> {propiedad.direccion}
            </p>
          )}

          <div className="pp-stats" style={{ marginBottom: 24 }}>
            {tieneValor(propiedad.recamaras) && <StatCard icono={<IconoCama />} valor={propiedad.recamaras} label="Recámaras" />}
            {tieneValor(propiedad.banos) && <StatCard icono={<IconoBano />} valor={propiedad.banos} label="Baños" />}
            {tieneValor(propiedad.estacionamientos) && <StatCard icono={<IconoAuto />} valor={propiedad.estacionamientos} label="Estacionamiento" />}
            {tieneValor(propiedad.m2_construccion) && <StatCard icono={<IconoRegla />} valor={`${propiedad.m2_construccion} m²`} label="Construcción" />}
            {tieneValor(propiedad.m2_terreno) && <StatCard icono={<IconoTerreno />} valor={`${propiedad.m2_terreno} m²`} label="Terreno" />}
            {ZONA_LABEL[propiedad.zona] && <StatCard icono={<IconoBrujula />} valor={ZONA_LABEL[propiedad.zona]} label="Zona" />}
          </div>

          {tieneValor(propiedad.descripcion) && (
            <div style={{ background: '#fff', border: '0.5px solid var(--ta-border)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
              <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 500, color: 'var(--ta-text)' }}>Descripción</p>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.75, color: 'var(--ta-text-muted)', whiteSpace: 'pre-line' }}>{propiedad.descripcion}</p>
            </div>
          )}

          {amenidadesActivas.length > 0 && (
            <div style={{ background: '#fff', border: '0.5px solid var(--ta-border)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 500, color: 'var(--ta-text)' }}>Amenidades</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', columnGap: 16, rowGap: 8 }}>
                {amenidadesActivas.map((label) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ta-text)' }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ta-accent)', flexShrink: 0 }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {hayTerminosRenta && (
            <div style={{ background: '#fff', border: '0.5px solid var(--ta-border)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 500, color: 'var(--ta-text)' }}>Términos de renta</p>
              {(tieneValor(terminosRenta.meses_deposito) || tieneValor(terminosRenta.meses_minimo_contrato)) && (
                <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
                  {tieneValor(terminosRenta.meses_deposito) && (
                    <div>
                      <p style={{ margin: 0, fontSize: 19, fontWeight: 600, color: 'var(--ta-text)' }}>{terminosRenta.meses_deposito}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--ta-text-muted)' }}>Meses de depósito</p>
                    </div>
                  )}
                  {tieneValor(terminosRenta.meses_minimo_contrato) && (
                    <div>
                      <p style={{ margin: 0, fontSize: 19, fontWeight: 600, color: 'var(--ta-text)' }}>{terminosRenta.meses_minimo_contrato}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--ta-text-muted)' }}>Meses mín. de contrato</p>
                    </div>
                  )}
                </div>
              )}
              {tieneValor(terminosRenta.requisitos_fisica) && (
                <div style={{ marginBottom: tieneValor(terminosRenta.requisitos_moral) ? 14 : 0 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12.5, fontWeight: 500, color: 'var(--ta-text)' }}>Requisitos — persona física</p>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--ta-text-muted)', whiteSpace: 'pre-line' }}>{terminosRenta.requisitos_fisica}</p>
                </div>
              )}
              {tieneValor(terminosRenta.requisitos_moral) && (
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 12.5, fontWeight: 500, color: 'var(--ta-text)' }}>Requisitos — persona moral</p>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--ta-text-muted)', whiteSpace: 'pre-line' }}>{terminosRenta.requisitos_moral}</p>
                </div>
              )}
            </div>
          )}

          {tieneUbicacion && (
            <div style={{ background: '#fff', border: '0.5px solid var(--ta-border)', borderRadius: 12, overflow: 'hidden' }}>
              <p style={{ margin: 0, padding: '16px 20px 12px', fontSize: 14, fontWeight: 500, color: 'var(--ta-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--ta-accent)' }}><IconoPin width={16} height={16} /></span>Ubicación
              </p>
              <div className="pp-mapa">
                <MapContainer
                  center={[Number(propiedad.lat), Number(propiedad.lng)]}
                  zoom={15}
                  scrollWheelZoom={false}
                  style={{ height: '100%', width: '100%' }}
                  attributionControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[Number(propiedad.lat), Number(propiedad.lng)]} icon={iconoMapa} />
                  <InvalidarTamanoMapa />
                </MapContainer>
              </div>
            </div>
          )}
        </div>

        <div className="pp-sidebar">
          <div style={{ background: '#fff', border: '0.5px solid var(--ta-border)', borderRadius: 12, padding: '20px', marginBottom: 16 }}>
            {precioTexto && (
              <p style={{ margin: '0 0 16px', fontSize: 26, fontWeight: 500, color: 'var(--ta-accent)' }}>
                {precioTexto}{propiedad.operacion === 'renta' ? ' /mes' : ''}
              </p>
            )}
            {telefonoWa && (
              <a
                href={`https://wa.me/52${telefonoWa}?text=${mensajeWa}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 10, background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 14, fontWeight: 500, textDecoration: 'none', marginBottom: 8 }}
              >
                <IconoWhatsApp />Contactar por WhatsApp
              </a>
            )}
            {/* 18 jul 2026: fila de Compartir + QR — antes solo estaba
                "Compartir" (Web Share API con fallback a copiar liga). El
                botón de QR abre <ModalQR>, útil para tarjetas físicas o
                mostrarlo en persona sin depender de enviar el link. */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={compartirLiga}
                style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, border: '0.5px solid var(--ta-border)', borderRadius: 10, background: '#fff', color: 'var(--ta-text)', cursor: 'pointer' }}
              >
                <IconoCompartir />{compartido ? '¡Copiada!' : 'Compartir'}
              </button>
              <button
                type="button"
                onClick={() => setMostrarQR(true)}
                aria-label="Ver código QR de esta propiedad"
                title="Ver código QR"
                style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid var(--ta-border)', borderRadius: 10, background: '#fff', color: 'var(--ta-text-muted)', cursor: 'pointer' }}
              >
                <IconoQR />
              </button>
            </div>
          </div>

          <div style={{ background: '#fff', border: '0.5px solid var(--ta-border)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {perfil?.logo_url ? (
                <img src={perfil.logo_url} alt={marcaTexto || 'Logo'} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'contain', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--ta-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 500, color: 'var(--ta-accent)', flexShrink: 0 }}>
                  {(marcaTexto || '?').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                {marcaTexto && <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--ta-text)' }}>{marcaTexto}</p>}
              </div>
            </div>
            {/* 21 jul 2026: teléfono pasa de texto plano a link `tel:`
                real (mismo criterio que Elegance/Nocturno) + botón de
                Correo (`mailto:`, perfiles.correo_publico) debajo cuando
                el asesor lo tiene configurado en Perfil. */}
            {(telefonoPrincipal || perfil?.correo_publico) && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {telefonoPrincipal && (
                  <a href={`tel:${telefonoPrincipal}`} style={{ fontSize: 13, color: 'var(--ta-text-muted)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                    <IconoTelefono />{telefonoPrincipal}
                  </a>
                )}
                {perfil?.correo_publico && (
                  <a href={`mailto:${perfil.correo_publico}`} style={{ fontSize: 13, color: 'var(--ta-text-muted)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                    <IconoCorreo />{perfil.correo_publico}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {mostrarQR && (
        <ModalQR url={window.location.href} titulo={propiedad.titulo} onCerrar={() => setMostrarQR(false)} />
      )}
    </div>
  )
}
