// src/features/propiedades/ExportaFicha.jsx
// Motivo: FEAT — nuevo componente, modal de exportación de la ficha
//   técnica a PDF para clientes. Checkboxes por sección (Fotos, Ficha
//   técnica, con Historial y Situación fiscal y legal como sub-checks
//   independientes — información sensible, apagados por default) + un
//   toggle único global de "incluir campos vacíos" (Básico siempre se
//   incluye completo, sin checkbox propio). Genera el PDF 100%
//   client-side con @react-pdf/renderer (sin Edge Function — YAGNI).
//   Comparte vía Web Share API cuando está disponible (manda directo a
//   WhatsApp en celular) con fallback a descarga normal, y siempre
//   archiva una copia en bucket-propiedad-vault + fila en
//   documentos_propiedad (tipo_documento: 'ficha_exportada') como
//   respaldo interno de qué se compartió y cuándo.
//
//   Requiere dependencia nueva: npm install @react-pdf/renderer
//
//   Nota: las listas de equipamiento (SERVICIOS_GENERALES_ITEMS,
//   RECREACION_ITEMS, etc.) están duplicadas de FichaTecnica.jsx a
//   propósito — mismo criterio ya usado en el proyecto de componentes
//   locales por archivo en vez de compartir un módulo central.
// Timestamp: 2026-07-07, 22:41 hrs — REVISIÓN: logo pasa de esquina a marca
//   de agua (grande, detrás del contenido, baja opacidad); se agrega
//   nombre_comercial/nombre_corto en grande arriba del título (masthead);
//   nuevo campo propiedad.descripcion (columna nueva, migración
//   agregar_descripcion_propiedades) como subtítulo/bajada bajo el
//   título; footer con atribución a TuAsesor (por ahora solo texto — el
//   isotipo real de TuAsesor pendiente de que Okta comparta el archivo).
//   PENDIENTE: usePropiedad.js necesita incluir "descripcion" en su
//   whitelist de columnas para que el autosave la guarde de verdad, y
//   FichaBasico.jsx necesita el campo de texto para capturarla — ninguno
//   de los dos se ha compartido todavía.

import { useState } from 'react'
import { Document, Page, Text, View, Image, Link, StyleSheet, pdf } from '@react-pdf/renderer'
import { supabase } from '../../lib/supabaseClient'
// Isotipo de TuAsesor (solo el ícono de cuadros, sin wordmark — el
// footer ya trae el texto "Generado con TuAsesor" al lado, el wordmark
// se vería redundante). Guarda el PNG del isotipo en esta ruta exacta
// (src/assets/logo-isotipo-tuasesor.png) — si usas otro nombre/carpeta,
// solo hay que ajustar esta línea de import.
import isotipoTuAsesor from '../../assets/logo-isotipo-tuasesor.png'

const TIPOS_LABEL = { casa: 'Casa', depto: 'Departamento', terreno: 'Terreno', local: 'Local comercial', otro: 'Otro' }
const OPERACION_LABEL = { venta: 'Venta', renta: 'Renta' }
const USO_LABEL = { residencial: 'Residencial', comercial: 'Comercial' }
const ZONA_LABEL = { saltillo: 'Saltillo', arteaga: 'Arteaga', ramos_arizpe: 'Ramos Arizpe' }
const ESQUEMAS_PAGO_LABEL = {
  credito_bancario: 'Crédito bancario',
  infonavit: 'Infonavit',
  cofinavit: 'Cofinavit',
  recursos_propios: 'Recursos propios',
}

const SERVICIOS_GENERALES_ITEMS = [
  { key: 'seguridad_vigilancia', label: 'Seguridad y vigilancia' },
  { key: 'estacionamiento_techado_visitas', label: 'Estacionamiento techado y de visitas' },
  { key: 'elevador', label: 'Elevador' },
  { key: 'motor_lobby', label: 'Motor lobby' },
  { key: 'recepcion_paqueteria', label: 'Recepción de paquetería' },
]

const RECREACION_ITEMS = [
  { key: 'alberca_jacuzzi', label: 'Alberca y jacuzzi' },
  { key: 'gimnasio', label: 'Gimnasio' },
  { key: 'spa_sauna', label: 'Spa y sauna' },
  { key: 'roof_garden', label: 'Roof garden' },
  { key: 'salon_usos_multiples', label: 'Salón de usos múltiples' },
  { key: 'areas_asador_terrazas', label: 'Áreas de asador (BBQ) y terrazas' },
  { key: 'salon_juegos', label: 'Salón de juegos' },
]

const ACABADOS_ITEMS = [
  { key: 'pisos', label: 'Pisos' },
  { key: 'muros_techos', label: 'Muros y techos' },
  { key: 'fachadas', label: 'Fachadas' },
]

const EQUIPO_INTERIOR_ITEMS = [
  { key: 'cocina', label: 'Cocina' },
  { key: 'banos', label: 'Baños' },
  { key: 'almacenamiento', label: 'Almacenamiento' },
  { key: 'climatizacion', label: 'Climatización' },
]

// FIX — la marca de agua no aparecía en el PDF aunque perfil.logo_url sí
// tuviera valor. Sospecha: logo_url trae un query string de cache-busting
// (?v=timestamp, agregado en PerfilForm.jsx al subir el logo) — muchas
// librerías (react-pdf incluida) infieren el formato de la imagen por la
// extensión al final de la URL, y ese query string rompe esa detección.
// Las fotos de propiedades sí funcionan porque su storage_path no trae
// query string. Solución: convertir la imagen a data URI ANTES de
// pasarla a <Image>, evitando por completo que react-pdf tenga que
// interpretar la URL — de paso, cualquier problema de CORS/caché con el
// fetch remoto de react-pdf también queda descartado.
async function urlADataUri(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function tieneValor(v) {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim() !== ''
  if (Array.isArray(v)) return v.length > 0
  return true
}

function siNo(v) {
  if (v === true) return 'Sí'
  if (v === false) return 'No'
  return null
}

function formatearPrecio(precio, moneda) {
  if (!tieneValor(precio)) return null
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda || 'MXN', maximumFractionDigits: 0 }).format(precio)
  } catch {
    return `$${precio} ${moneda || 'MXN'}`
  }
}

// --- estilos del PDF ------------------------------------------------------

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica', color: '#2A2A28', paddingBottom: 56 },
  // FIX v2 — se veía casi invisible: el PNG del logo tiene bastante margen
  // transparente alrededor de la marca real, así que dentro de una caja de
  // 280×280 al 6% de opacidad, lo visible quedaba diminuto. Contenedor de
  // página completa + flexbox para centrar (más confiable que top/left en
  // porcentaje) y caja más grande para compensar el margen transparente
  // del PNG.
  marcaAguaContenedor: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  marcaAgua: { width: 420, height: 420, opacity: 0.14, objectFit: 'contain' },
  marcaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  marca: { fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' },
  marcaTelefono: { fontSize: 11, fontWeight: 700, textDecoration: 'none' },
  headerRow: { marginBottom: 14 },
  titulo: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  subtitulo: { fontSize: 11, color: '#6B6A63', marginBottom: 8 },
  descripcion: { fontSize: 10, fontStyle: 'italic', color: '#2A2A28', lineHeight: 1.5, marginBottom: 10 },
  precio: { fontSize: 16, fontWeight: 700, marginBottom: 14 },
  seccionTitulo: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 18, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  statBox: { width: '33%', marginBottom: 10 },
  statLabel: { fontSize: 8, color: '#6B6A63', textTransform: 'uppercase' },
  statValor: { fontSize: 12, fontWeight: 700, marginTop: 2 },
  fotoPortada: { width: '100%', height: 220, objectFit: 'cover', borderRadius: 4, marginBottom: 8 },
  galeria: { flexDirection: 'row', flexWrap: 'wrap' },
  fotoChica: { width: '24%', height: 68, objectFit: 'cover', borderRadius: 3, marginRight: '1.33%', marginBottom: 6 },
  filaDato: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#E2DDD0' },
  filaLabel: { fontSize: 9, color: '#6B6A63', width: '55%' },
  filaValor: { fontSize: 9, width: '45%', textAlign: 'right' },
  parrafo: { fontSize: 9, lineHeight: 1.5, marginBottom: 6 },
  footer: { position: 'absolute', bottom: 22, left: 32, right: 32, borderTopWidth: 0.5, borderTopColor: '#E2DDD0', paddingTop: 6 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  footerTexto: { fontSize: 8, color: '#6B6A63' },
  footerMarcaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  footerIsotipo: { width: 16, height: 16, objectFit: 'contain', marginRight: 5 },
  footerMarca: { fontSize: 10, fontWeight: 700, color: '#2A2A28' },
})

function SeccionTitulo({ children, acento }) {
  return <Text style={[styles.seccionTitulo, { color: acento, borderBottomColor: acento }]}>{children}</Text>
}

function FilaDato({ label, valor, incluirVacios, acento }) {
  if (!tieneValor(valor) && !incluirVacios) return null
  return (
    <View style={styles.filaDato}>
      <Text style={styles.filaLabel}>{label}</Text>
      <Text style={[styles.filaValor, { color: tieneValor(valor) ? '#2A2A28' : '#6B6A63' }]}>
        {tieneValor(valor) ? valor : 'No especificado'}
      </Text>
    </View>
  )
}

// --- documento PDF ---------------------------------------------------------

function FichaPDFDocument({ propiedad, fotos, perfil, opciones }) {
  const acento = perfil?.color_acento || '#1F3A2C'
  const ficha = propiedad.ficha || {}
  const equipamiento = ficha.equipamiento || {}
  const situacion = ficha.situacion_fiscal_legal || {}
  const extras = equipamiento.extras || []

  const precioTexto = formatearPrecio(propiedad.precio, propiedad.moneda)
  const [portada, ...galeria] = fotos

  const statsBasicos = [
    ['Recámaras', propiedad.recamaras],
    ['Baños', propiedad.banos],
    ['Estacionamientos', propiedad.estacionamientos],
    ['M² construcción', propiedad.m2_construccion],
    ['M² terreno', propiedad.m2_terreno],
    ['Zona', ZONA_LABEL[propiedad.zona] || propiedad.zona],
  ].filter(([, valor]) => tieneValor(valor) || opciones.incluirVacios)

  const marcaTexto = perfil?.nombre_comercial || perfil?.nombre_corto
  const telefonoPrincipal = (perfil?.telefonos || [])[0]?.numero || null
  const telefonoLimpio = telefonoPrincipal ? telefonoPrincipal.replace(/[^\d+]/g, '') : null

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Marca de agua: logo grande, detrás del contenido, opacidad baja.
            Va primero en el orden de pintado (Document/Page pintan en orden,
            y position:'absolute' lo saca del flujo) para quedar debajo.
            "fixed" para que se repita en todas las páginas si la ficha se
            desborda a una página 2 (igual que el footer). Si perfil.logo_url
            viene vacío (todavía no se subió un logo) esto no pinta nada —
            no es bug, es el estado esperado sin logo cargado. */}
        {perfil?.logo_url && (
          <View style={styles.marcaAguaContenedor} fixed>
            <Image src={perfil.logo_url} style={styles.marcaAgua} />
          </View>
        )}

        <View style={styles.headerRow}>
          <View style={styles.marcaRow}>
            {marcaTexto && <Text style={[styles.marca, { color: acento }]}>{marcaTexto}</Text>}
            {telefonoLimpio && (
              <Link src={`tel:${telefonoLimpio}`} style={[styles.marcaTelefono, { color: acento }]}>
                {telefonoPrincipal}
              </Link>
            )}
          </View>
          <Text style={styles.titulo}>{propiedad.titulo || 'Propiedad'}</Text>
          <Text style={styles.subtitulo}>
            {[
              OPERACION_LABEL[propiedad.operacion],
              propiedad.tipo === 'otro' ? propiedad.tipo_otro : TIPOS_LABEL[propiedad.tipo],
              USO_LABEL[propiedad.uso],
            ].filter(Boolean).join(' · ')}
          </Text>
          {tieneValor(propiedad.descripcion) && (
            <Text style={styles.descripcion}>{propiedad.descripcion}</Text>
          )}
        </View>

        {precioTexto && (
          <Text style={[styles.precio, { color: acento }]}>
            {precioTexto}{propiedad.operacion === 'renta' ? ' /mes' : ''}
          </Text>
        )}

        <View style={styles.statsGrid}>
          {statsBasicos.map(([label, valor]) => (
            <View key={label} style={styles.statBox}>
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={styles.statValor}>{tieneValor(valor) ? String(valor) : '—'}</Text>
            </View>
          ))}
        </View>

        <FilaDato label="Dirección" valor={propiedad.direccion} incluirVacios={opciones.incluirVacios} acento={acento} />
        <FilaDato
          label="Cuota de mantenimiento"
          valor={formatearPrecio(propiedad.cuota_mantenimiento, propiedad.moneda)}
          incluirVacios={opciones.incluirVacios}
          acento={acento}
        />

        {opciones.incluirFotos && portada && (
          <>
            <SeccionTitulo acento={acento}>Fotografías</SeccionTitulo>
            <Image src={portada.url} style={styles.fotoPortada} />
            {galeria.length > 0 && (
              <View style={styles.galeria}>
                {galeria.map((f) => <Image key={f.url} src={f.url} style={styles.fotoChica} />)}
              </View>
            )}
          </>
        )}

        {opciones.incluirFicha && (
          <>
            <SeccionTitulo acento={acento}>Equipamiento y amenidades</SeccionTitulo>
            {SERVICIOS_GENERALES_ITEMS.map((item) => (
              <FilaDato
                key={item.key}
                label={item.label}
                valor={siNo(equipamiento.servicios_generales_seguridad?.[item.key])}
                incluirVacios={opciones.incluirVacios}
                acento={acento}
              />
            ))}
            {RECREACION_ITEMS.map((item) => (
              <FilaDato
                key={item.key}
                label={item.label}
                valor={siNo(equipamiento.recreacion_bienestar?.[item.key])}
                incluirVacios={opciones.incluirVacios}
                acento={acento}
              />
            ))}
            {ACABADOS_ITEMS.map((item) => (
              <FilaDato
                key={item.key}
                label={item.label}
                valor={equipamiento.acabados?.[item.key]}
                incluirVacios={opciones.incluirVacios}
                acento={acento}
              />
            ))}
            {EQUIPO_INTERIOR_ITEMS.map((item) => (
              <FilaDato
                key={item.key}
                label={item.label}
                valor={siNo(equipamiento.equipo_interior?.[item.key])}
                incluirVacios={opciones.incluirVacios}
                acento={acento}
              />
            ))}
            {extras.filter((e) => tieneValor(e.nombre)).map((extra, idx) => (
              <FilaDato
                key={idx}
                label={extra.nombre}
                valor={extra.tipo === 'si_no' ? siNo(extra.valor) : extra.valor}
                incluirVacios={opciones.incluirVacios}
                acento={acento}
              />
            ))}
          </>
        )}

        {opciones.incluirHistorial && tieneValor(ficha.historial_propiedad) && (
          <>
            <SeccionTitulo acento={acento}>Historial de la propiedad</SeccionTitulo>
            <Text style={styles.parrafo}>{ficha.historial_propiedad}</Text>
          </>
        )}

        {opciones.incluirSituacion && (
          <>
            <SeccionTitulo acento={acento}>Situación fiscal y legal</SeccionTitulo>
            <FilaDato label="Al corriente de pagos/impuestos" valor={siNo(situacion.al_corriente)} incluirVacios={opciones.incluirVacios} acento={acento} />
            <FilaDato label="Gravámenes" valor={situacion.gravamenes} incluirVacios={opciones.incluirVacios} acento={acento} />
            <FilaDato
              label="Esquemas de pago aceptados"
              valor={(situacion.esquemas_pago_aceptados || []).map((v) => ESQUEMAS_PAGO_LABEL[v] || v).join(', ')}
              incluirVacios={opciones.incluirVacios}
              acento={acento}
            />
            <FilaDato label="Notas" valor={situacion.notas} incluirVacios={opciones.incluirVacios} acento={acento} />
          </>
        )}

        {/* Atribución a TuAsesor — isotipo (solo el ícono, sin wordmark,
            para no repetir el texto que va al lado) + texto. */}
        <View style={styles.footer} fixed>
          <View style={styles.footerRow}>
            <Text style={styles.footerTexto}>{marcaTexto || ''}</Text>
            <Text style={styles.footerTexto}>{(perfil?.telefonos || [])[0]?.numero || ''}</Text>
          </View>
          <View style={styles.footerMarcaRow}>
            <Image src={isotipoTuAsesor} style={styles.footerIsotipo} />
            <Text style={styles.footerMarca}>Generado con TuAsesor</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

// --- UI del modal (checkboxes + botón) -------------------------------------

function CheckRow({ label, descripcion, checked, onChange, sangria }) {
  return (
    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', paddingLeft: sangria ? 22 : 0, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--ta-accent)', flexShrink: 0, cursor: 'pointer' }}
      />
      <div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ta-text)' }}>{label}</p>
        {descripcion && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ta-text-muted)' }}>{descripcion}</p>}
      </div>
    </label>
  )
}

export default function ExportaFicha({ propiedad, onCerrar }) {
  const [incluirFotos, setIncluirFotos] = useState(true)
  const [incluirFicha, setIncluirFicha] = useState(true)
  const [incluirHistorial, setIncluirHistorial] = useState(false)
  const [incluirSituacion, setIncluirSituacion] = useState(false)
  const [incluirVacios, setIncluirVacios] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState(null)

  const generar = async () => {
    setGenerando(true)
    setError(null)
    try {
      const { data: userData } = await supabase.auth.getUser()

      const { data: perfilData } = await supabase
        .from('perfiles')
        .select('nombre_comercial, nombre_corto, logo_url, color_acento, telefonos')
        .eq('id', userData.user.id)
        .maybeSingle()

      // Logo convertido a data URI — ver nota en urlADataUri() más arriba.
      // Si falla (red, CORS, lo que sea), se degrada a "sin logo" en vez
      // de tronar la exportación completa.
      const perfil = perfilData?.logo_url
        ? { ...perfilData, logo_url: (await urlADataUri(perfilData.logo_url)) || null }
        : perfilData

      let fotos = []
      if (incluirFotos) {
        const { data: fotosData } = await supabase
          .from('fotos_propiedad')
          .select('storage_path, es_portada, orden')
          .eq('propiedad_id', propiedad.id)
          .order('es_portada', { ascending: false })
          .order('orden', { ascending: true })
          .limit(8)

        fotos = (fotosData || []).map((f) => ({
          ...f,
          url: supabase.storage.from('bucket-propiedad-media').getPublicUrl(f.storage_path).data.publicUrl,
        }))
      }

      const opciones = { incluirFotos, incluirFicha, incluirHistorial, incluirSituacion, incluirVacios }

      const blob = await pdf(
        <FichaPDFDocument propiedad={propiedad} fotos={fotos} perfil={perfil} opciones={opciones} />
      ).toBlob()

      const nombreArchivo = `Ficha - ${propiedad.titulo || 'Propiedad'}.pdf`
      const file = new File([blob], nombreArchivo, { type: 'application/pdf' })

      // Compartir/descargar — Web Share API primero (manda directo a
      // WhatsApp en celular), fallback a descarga normal en desktop o si
      // el navegador no soporta compartir archivos.
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: nombreArchivo })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = nombreArchivo
        a.click()
        URL.revokeObjectURL(url)
      }

      // Archivar copia en el vault — respaldo interno de qué se exportó y
      // cuándo, independiente de si se compartió o solo se descargó.
      const storagePath = `${propiedad.id}/${Date.now()}-ficha-exportada.pdf`
      const { error: uploadError } = await supabase.storage
        .from('bucket-propiedad-vault')
        .upload(storagePath, blob, { contentType: 'application/pdf' })

      if (!uploadError) {
        await supabase.from('documentos_propiedad').insert({
          propiedad_id: propiedad.id,
          storage_path: storagePath,
          tipo_documento: 'ficha_exportada',
          nombre_original: nombreArchivo,
          user_id: userData.user.id,
        })
      }

      setGenerando(false)
      onCerrar?.()
    } catch (err) {
      // AbortError: el usuario canceló el share sheet — no es un error real.
      if (err?.name === 'AbortError') {
        setGenerando(false)
        return
      }
      console.error('Error generando PDF:', err)
      setGenerando(false)
      setError('No se pudo generar el PDF. Intenta de nuevo.')
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{ width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', background: 'var(--ta-surface)', borderRadius: 16, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: 'var(--ta-text)' }}>Exportar ficha</p>
          <button
            type="button"
            onClick={onCerrar}
            disabled={generando}
            aria-label="Cerrar"
            style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'var(--ta-bg)', color: 'var(--ta-text-muted)', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--ta-text-muted)' }}>
          Básico siempre se incluye. Elige qué más va en el PDF.
        </p>

        <CheckRow label="Fotos" descripcion="Portada + hasta 7 fotos de galería." checked={incluirFotos} onChange={setIncluirFotos} />
        <CheckRow label="Ficha técnica" descripcion="Equipamiento y amenidades." checked={incluirFicha} onChange={setIncluirFicha} />
        <CheckRow label="Historial de la propiedad" descripcion="Información sensible — revisa antes de compartir." checked={incluirHistorial} onChange={setIncluirHistorial} sangria />
        <CheckRow label="Situación fiscal y legal" descripcion="Información sensible — revisa antes de compartir." checked={incluirSituacion} onChange={setIncluirSituacion} sangria />

        <div style={{ borderTop: '0.5px solid var(--ta-border)', margin: '14px 0' }} />

        <CheckRow label="Incluir campos vacíos" descripcion="Muestra 'No especificado' en vez de omitir el dato." checked={incluirVacios} onChange={setIncluirVacios} />

        {error && <p style={{ color: '#993C1D', fontSize: 12, marginTop: 12 }}>{error}</p>}

        <button
          type="button"
          onClick={generar}
          disabled={generando}
          style={{
            width: '100%', height: 44, marginTop: 20, borderRadius: 10, border: 'none',
            background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 14, fontWeight: 500,
            cursor: generando ? 'default' : 'pointer', opacity: generando ? 0.6 : 1,
          }}
        >
          {generando ? 'Generando...' : 'Generar y compartir'}
        </button>
      </div>
    </div>
  )
}
