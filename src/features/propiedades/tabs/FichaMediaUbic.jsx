// src/features/propiedades/tabs/Ficha-MediaUbic.jsx
// Motivo: (1) rename de FotosUbicacionTab.jsx a Ficha-MediaUbic.jsx —
//   unificación de nomenclatura de las 4 pestañas del wizard bajo el
//   prefijo "Ficha-*"; (2) recibe la sección "Zona y conectividad" que se
//   quitó de Ficha-Tecnica.jsx por redundante (colonia de referencia,
//   puntos de interés, escuelas/hospitales/transporte) — vive justo debajo
//   del mapa, ya que conceptualmente es información de ubicación. Nuevos
//   props: ubicacionConectividad / onUbicacionConectividadChange. Sigue
//   siendo el mismo jsonb ficha.ubicacion_conectividad, sin migración SQL
//   — solo cambia dónde se renderiza. REQUIERE actualizar PropiedadForm.jsx
//   para pasar los dos props nuevos.
// Timestamp: 2026-07-04, [confirma hora] hrs

import { useState, useEffect, useRef, useCallback } from 'react'
import * as exifr from 'exifr'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { supabase } from '../../../lib/supabaseClient'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix del icono default de Leaflet, que se rompe con bundlers como Vite.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const BUCKET = 'bucket-propiedad-media'
const MAX_VIDEO_MB = 30
const MAX_VIDEO_SECONDS = 20
const MAX_ARCHIVOS = 20

// Centro por defecto: Saltillo, para cuando no hay ninguna ubicacion aun.
const CENTRO_DEFAULT = { lat: 25.4232, lng: -101.0053 }

function compressImage(file, maxPx = 1920, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width > height) {
          height = Math.round((height * maxPx) / width)
          width = maxPx
        } else {
          width = Math.round((width * maxPx) / height)
          height = maxPx
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file)
            return
          }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

function obtenerDuracionVideo(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    const url = URL.createObjectURL(file)
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer el video'))
    }
    video.src = url
  })
}

// IMPORTANTE: se lee el EXIF del archivo ORIGINAL, antes de comprimir —
// el canvas de compressImage redibuja la imagen y destruye toda la metadata.
async function extraerGPS(file) {
  try {
    const gps = await exifr.gps(file)
    if (gps && gps.latitude && gps.longitude) {
      return { lat: gps.latitude, lng: gps.longitude }
    }
  } catch {
    // archivo sin EXIF o formato no soportado — no es un error, es normal
  }
  return null
}

// Geocoding por direccion via Nominatim (OpenStreetMap), gratuito, sin API key.
// Devuelve hasta 8 resultados para autocompletado. Antes se concatenaba
// ", Coahuila, Mexico" directo al texto de busqueda, lo cual sobre-restringe
// la consulta y en muchos casos Nominatim regresaba un solo match — se usa
// el parametro countrycodes=mx (sesgo de pais correcto) en su lugar.
// Caja aproximada que cubre Saltillo, Arteaga y Ramos Arizpe (con margen).
// Se usa SOLO como sesgo de relevancia (sin bounded=1) — Nydia también apoya
// ventas fuera de la región (Cancún, Monterrey, donde le pidan), así que no
// se puede restringir la búsqueda a esta caja, solo darle prioridad quand
// hay resultados ambiguos.
const VIEWBOX_REGION = '-101.15,25.65,-100.75,25.30'

async function buscarDirecciones(texto) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=mx&viewbox=${VIEWBOX_REGION}&dedupe=1&q=${encodeURIComponent(texto)}`
  const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
  const data = await res.json()
  return data.map((r) => ({
    etiqueta: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }))
}

// Geocoding inverso: a partir de lat/lng obtiene la dirección legible.
// Se usa cada vez que el pin se mueve sin que ya tengamos el texto de la
// dirección a la mano (drag del pin, click en el mapa, GPS de EXIF).
async function direccionDesdeCoordenadas(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
    const data = await res.json()
    return data?.display_name || null
  } catch {
    return null
  }
}

// MapContainer solo lee la prop "center" al crear el mapa, no cuando cambia
// despues — sin esto, el mapa se queda en el centro default hasta que se
// desmonta/remonta (ej. cambiando de pestaña y regresando).
function RecentrarMapa({ posicion, tieneUbicacion }) {
  const map = useMap()
  const yaHizoZoomInicial = useRef(false)

  useEffect(() => {
    if (tieneUbicacion && !yaHizoZoomInicial.current) {
      map.setView(posicion, 16)
      yaHizoZoomInicial.current = true
    } else {
      map.setView(posicion, map.getZoom())
    }
  }, [posicion.lat, posicion.lng])

  return null
}

function MarcadorArrastrable({ posicion, onMover }) {
  const marcadorRef = useRef(null)

  useMapEvents({
    click(e) {
      onMover(e.latlng)
    },
  })

  return (
    <Marker
      position={posicion}
      draggable
      eventHandlers={{
        dragend: () => {
          const marker = marcadorRef.current
          if (marker) onMover(marker.getLatLng())
        },
      }}
      ref={marcadorRef}
    />
  )
}

// Icono de estrella (portada) — SVG inline, no emoji.
function IconoEstrella({ activa }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={activa ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8Z" />
    </svg>
  )
}

// Contenido del mapa, compartido entre el modo compacto y el de pantalla
// completa — evita duplicar el JSX de MapContainer en dos lugares.
function ContenidoMapa({ posicionMapa, tieneUbicacion, onMoverPin }) {
  return (
    <MapContainer center={posicionMapa} zoom={tieneUbicacion ? 16 : 13} style={{ height: '100%', width: '100%' }}>
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MarcadorArrastrable posicion={posicionMapa} onMover={onMoverPin} />
      <RecentrarMapa posicion={posicionMapa} tieneUbicacion={tieneUbicacion} />
    </MapContainer>
  )
}

// --- helpers de campo para la sección "Zona y conectividad" ------------
// (mismo lenguaje visual que el campo Dirección de este archivo, no los
// componentes de Ficha-Tecnica.jsx, para no acoplar ambos archivos)

function CampoTexto({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>{label}</p>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
          border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)',
          color: 'var(--ta-text)', fontSize: 13, boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

function CampoTextoArea({ label, value, onChange, rows = 2, placeholder }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>{label}</p>
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 8,
          border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)',
          color: 'var(--ta-text)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

export default function FichaMediaUbic({ propiedadId, ubicacion, onUbicacionChange, ubicacionConectividad = {}, onUbicacionConectividadChange }) {
  const [archivos, setArchivos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [progreso, setProgreso] = useState('')
  const [error, setError] = useState(null)

  const [direccionTexto, setDireccionTexto] = useState(ubicacion?.direccion || '')
  const [sugerencias, setSugerencias] = useState([])
  const [buscandoDireccion, setBuscandoDireccion] = useState(false)
  const [mapaCompleto, setMapaCompleto] = useState(false)

  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  // Solo se resincroniza al cambiar de propiedad — si lo hiciéramos en cada
  // cambio de "ubicacion", se le borraría lo que esté escribiendo a Nydia
  // cada vez que el pin se mueve y llega un nuevo valor por props.
  useEffect(() => {
    setDireccionTexto(ubicacion?.direccion || '')
  }, [propiedadId])

  const cargarArchivos = useCallback(async () => {
    setCargando(true)
    const { data, error: dbError } = await supabase
      .from('fotos_propiedad')
      .select('id, storage_path, orden, es_portada')
      .eq('propiedad_id', propiedadId)
      .order('orden', { ascending: true })

    if (dbError) {
      console.error('Error cargando fotos:', dbError.message)
      setCargando(false)
      return
    }

    const conUrl = data.map((f) => {
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(f.storage_path)
      const esVideo = /\.(mp4|mov|webm)$/i.test(f.storage_path)
      return { ...f, url: urlData.publicUrl, tipo: esVideo ? 'video' : 'foto' }
    })

    setArchivos(conUrl)
    setCargando(false)
  }, [propiedadId])

  useEffect(() => {
    if (propiedadId) cargarArchivos()
  }, [propiedadId, cargarArchivos])

  // Si no se pasa "direccionConocida" (ej. viene de una sugerencia del buscador,
  // que ya trae el texto), se hace geocoding inverso para rellenar el campo
  // de dirección automáticamente — antes no existía este campo y el pin no
  // actualizaba ninguna dirección visible.
  const guardarUbicacion = async (lat, lng, origen, direccionConocida = null) => {
    const direccion = direccionConocida ?? (await direccionDesdeCoordenadas(lat, lng))

    const { error: dbError } = await supabase
      .from('propiedades')
      .update({ lat, lng, ubicacion_origen: origen, direccion })
      .eq('id', propiedadId)

    if (dbError) {
      console.error('Error guardando ubicación:', dbError.message)
      return direccion
    }
    onUbicacionChange?.({ lat, lng, ubicacion_origen: origen, direccion })
    return direccion
  }

  // Edición manual del campo dirección, sin tocar lat/lng — para cuando el
  // geocoding inverso da un texto impreciso y Nydia lo quiere corregir a mano.
  const actualizarDireccionManual = async (texto) => {
    onUbicacionChange?.({ direccion: texto })
    const { error: dbError } = await supabase
      .from('propiedades')
      .update({ direccion: texto })
      .eq('id', propiedadId)
    if (dbError) console.error('Error guardando dirección:', dbError.message)
  }

  const handleSeleccion = async (e) => {
    const seleccionados = Array.from(e.target.files)
    e.target.value = ''

    if (archivos.length + seleccionados.length > MAX_ARCHIVOS) {
      setError(`Máximo ${MAX_ARCHIVOS} archivos por propiedad.`)
      return
    }

    setError(null)
    setSubiendo(true)

    let subidos = 0
    let gpsEncontrado = ubicacion?.lat ? true : false // ya hay ubicacion, no sobreescribir
    let yaHayPortada = archivos.some((a) => a.es_portada)
    const idsNuevos = []

    for (let i = 0; i < seleccionados.length; i++) {
      const file = seleccionados[i]
      const esVideo = file.type.startsWith('video/')
      const esFoto = file.type.startsWith('image/')

      if (!esVideo && !esFoto) continue

      // HEIC/HEIF no lo decodifican los navegadores de escritorio (Chrome,
      // Firefox, Edge) — el canvas de compresion se queda esperando un
      // onload que nunca llega. Se detecta explicito para no colgar el flujo.
      const esHeic = /\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif'
      if (esHeic) {
        setError(`"${file.name}" es HEIC — cambia el formato de la cámara a JPEG (Ajustes → Cámara → Formatos → Más compatible) o conviértela antes de subir.`)
        continue
      }

      setProgreso(`Procesando ${i + 1} de ${seleccionados.length}...`)

      if (esVideo) {
        if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
          setError(`Video "${file.name}" pesa más de ${MAX_VIDEO_MB} MB.`)
          continue
        }
        try {
          const duracion = await obtenerDuracionVideo(file)
          if (duracion > MAX_VIDEO_SECONDS) {
            setError(`Video "${file.name}" dura ${Math.round(duracion)}s (máximo ${MAX_VIDEO_SECONDS}s).`)
            continue
          }
        } catch {
          setError(`No se pudo leer el video "${file.name}".`)
          continue
        }
      }

      // GPS se extrae del archivo ORIGINAL, antes de comprimir.
      let gpsFoto = null
      if (esFoto) {
        gpsFoto = await extraerGPS(file)
        // La primera foto con GPS valido define el pin inicial de la propiedad.
        if (gpsFoto && !gpsEncontrado) {
          const direccion = await guardarUbicacion(gpsFoto.lat, gpsFoto.lng, 'exif')
          setDireccionTexto(direccion || '')
          gpsEncontrado = true
        }
      }

      const procesado = esFoto ? await compressImage(file) : file
      const carpeta = esVideo ? 'videos' : 'fotos'
      const ext = procesado.type === 'image/jpeg' ? 'jpg' : file.name.split('.').pop()
      const nombreArchivo = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
      const storagePath = `${propiedadId}/${carpeta}/${nombreArchivo}`

      setProgreso(`Subiendo ${i + 1} de ${seleccionados.length}...`)

      const { error: storageError } = await supabase.storage.from(BUCKET).upload(storagePath, procesado)

      if (storageError) {
        console.error('Error de storage:', storageError.message)
        setError(`Error al subir "${file.name}": ${storageError.message}`)
        continue
      }

      // La primera foto (no video) subida se marca como portada automáticamente
      // si todavía no hay ninguna — evita dejar la propiedad sin portada.
      const marcarComoPortada = esFoto && !yaHayPortada
      if (marcarComoPortada) yaHayPortada = true

      const { error: dbError } = await supabase.from('fotos_propiedad').insert({
        propiedad_id: propiedadId,
        storage_path: storagePath,
        lat: gpsFoto?.lat ?? null,
        lng: gpsFoto?.lng ?? null,
        gps_origen: gpsFoto ? 'exif' : null,
        orden: archivos.length + subidos,
        es_portada: marcarComoPortada,
      })

      if (dbError) {
        console.error('Error guardando referencia:', dbError.message)
        continue
      }

      subidos++
    }

    setSubiendo(false)
    setProgreso('')
    if (subidos > 0) cargarArchivos()
  }

  const eliminarArchivo = async (archivo) => {
    await supabase.storage.from(BUCKET).remove([archivo.storage_path])
    await supabase.from('fotos_propiedad').delete().eq('id', archivo.id)

    const restantes = archivos.filter((a) => a.id !== archivo.id)

    // Si se elimina la portada y quedan archivos, se promueve la primera foto restante.
    if (archivo.es_portada) {
      const primeraFoto = restantes.find((a) => a.tipo === 'foto')
      if (primeraFoto) {
        await supabase.from('fotos_propiedad').update({ es_portada: true }).eq('id', primeraFoto.id)
        primeraFoto.es_portada = true
      }
    }

    setArchivos(restantes)
  }

  const marcarPortada = async (archivo) => {
    if (archivo.tipo !== 'foto' || archivo.es_portada) return

    // Se desmarca la portada anterior y se marca la nueva — a nivel app,
    // no hay constraint de BD que garantice una sola portada (ver migración).
    await supabase.from('fotos_propiedad').update({ es_portada: false }).eq('propiedad_id', propiedadId).eq('es_portada', true)
    await supabase.from('fotos_propiedad').update({ es_portada: true }).eq('id', archivo.id)

    setArchivos((prev) => prev.map((a) => ({ ...a, es_portada: a.id === archivo.id })))
  }

  // Un solo campo hace dos cosas en paralelo, ambas con el mismo debounce:
  // (1) busca sugerencias para autocompletar, (2) guarda el texto tal cual
  // como "direccion" aunque no haga match con ninguna sugerencia — Nydia
  // vende en fraccionamientos nuevos que a veces no están en OpenStreetMap
  // todavía, y no debe quedar bloqueada esperando que el mapa "apruebe" el
  // texto para poder guardarlo.
  const handleCambioDireccion = (texto) => {
    setDireccionTexto(texto)
    clearTimeout(debounceRef.current)

    if (texto.trim().length < 4) {
      setSugerencias([])
    }

    debounceRef.current = setTimeout(async () => {
      if (texto.trim().length >= 4) {
        setBuscandoDireccion(true)
        try {
          const resultados = await buscarDirecciones(texto)
          setSugerencias(resultados)
        } catch {
          setSugerencias([])
        }
        setBuscandoDireccion(false)
      }

      if (texto !== (ubicacion?.direccion ?? '')) {
        actualizarDireccionManual(texto)
      }
    }, 600)
  }

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const seleccionarSugerencia = async (sug) => {
    setSugerencias([])
    setError(null)
    await guardarUbicacion(sug.lat, sug.lng, 'direccion', sug.etiqueta)
    setDireccionTexto(sug.etiqueta)
  }

  const handleMoverPin = async (latlng) => {
    const direccion = await guardarUbicacion(latlng.lat, latlng.lng, 'manual')
    // Es una sugerencia automática, no una imposición — Nydia la puede
    // sobreescribir de inmediato si no es exacta.
    setDireccionTexto(direccion || '')
  }

  const posicionMapa = ubicacion?.lat ? { lat: ubicacion.lat, lng: ubicacion.lng } : CENTRO_DEFAULT
  const tieneUbicacion = !!ubicacion?.lat

  // Zona y conectividad (movido desde Ficha-Tecnica.jsx) — mismo jsonb
  // ficha.ubicacion_conectividad, solo cambia dónde vive en la UI.
  const servicios = ubicacionConectividad.servicios || {}
  const setUC = (campo) => (v) => onUbicacionConectividadChange?.({ ...ubicacionConectividad, [campo]: v })
  const setServicio = (campo) => (v) => setUC('servicios')({ ...servicios, [campo]: v })

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 10px' }}>
        Fotos y video ({archivos.length}/{MAX_ARCHIVOS})
      </p>

      {cargando ? (
        <p style={{ fontSize: 13, color: 'var(--ta-text-muted)' }}>Cargando...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: '1rem' }}>
          {archivos.map((a) => (
            <div
              key={a.id}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 10,
                overflow: 'hidden',
                background: 'var(--ta-surface)',
                border: a.es_portada ? '2px solid var(--ta-accent)' : '0.5px solid var(--ta-border)',
              }}
            >
              {a.tipo === 'video' ? (
                <video src={a.url} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <img src={a.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              )}

              {a.tipo === 'foto' && (
                <button
                  type="button"
                  onClick={() => marcarPortada(a)}
                  aria-label={a.es_portada ? 'Foto de portada' : 'Marcar como portada'}
                  aria-pressed={a.es_portada}
                  style={{
                    position: 'absolute', top: 4, left: 4, width: 26, height: 26, borderRadius: '50%',
                    border: 'none', background: 'rgba(0,0,0,0.5)',
                    color: a.es_portada ? 'var(--ta-detail)' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <IconoEstrella activa={a.es_portada} />
                </button>
              )}

              <button
                type="button"
                onClick={() => eliminarArchivo(a)}
                aria-label="Eliminar"
                style={{
                  position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
                  border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 12, cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleSeleccion} />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo || archivos.length >= MAX_ARCHIVOS}
        style={{
          width: '100%', height: 44, borderRadius: 10, border: 'none',
          background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 14, fontWeight: 500,
          opacity: subiendo || archivos.length >= MAX_ARCHIVOS ? 0.6 : 1,
        }}
      >
        {subiendo ? progreso || 'Subiendo...' : '+ Agregar fotos o video'}
      </button>

      <p style={{ fontSize: 11, color: 'var(--ta-text-muted)', margin: '8px 0 0' }}>
        Video: máximo {MAX_VIDEO_SECONDS}s y {MAX_VIDEO_MB} MB. Toca la estrella de una foto para marcarla como portada.
      </p>

      {error && <p style={{ color: '#993C1D', fontSize: 13, marginTop: '0.75rem' }}>{error}</p>}

      {/* ── Ubicación ── */}
      <div style={{ marginTop: '1.5rem' }}>
        <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 8px' }}>
          Ubicación {ubicacion?.ubicacion_origen ? `(${ubicacion.ubicacion_origen})` : '(sin definir)'}
        </p>

        {/* Un solo campo: escribe libre (se guarda tal cual, aunque no haga
            match con el mapa) o elige una sugerencia (fija el pin también).
            Mover el pin sugiere una dirección aquí, pero no la impone. */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 6px' }}>Dirección</p>
          <input
            type="text"
            value={direccionTexto}
            onChange={(e) => handleCambioDireccion(e.target.value)}
            placeholder="Escribe la dirección..."
            style={{
              width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
              border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)',
              color: 'var(--ta-text)', fontSize: 13, boxSizing: 'border-box',
            }}
          />

          {(sugerencias.length > 0 || buscandoDireccion) && (
            <div
              role="listbox"
              style={{
                position: 'absolute', top: 68, left: 0, right: 0, zIndex: 1200,
                background: 'var(--ta-surface)', border: '0.5px solid var(--ta-border)',
                borderRadius: 8, boxShadow: '0 6px 16px rgba(42,42,40,0.18)', overflow: 'hidden',
                maxHeight: 220, overflowY: 'auto',
              }}
            >
              {buscandoDireccion && (
                <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: 0, padding: '8px 10px' }}>Buscando...</p>
              )}
              {sugerencias.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="option"
                  onClick={() => seleccionarSugerencia(sug)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '9px 10px',
                    border: 'none', borderBottom: idx < sugerencias.length - 1 ? '0.5px solid var(--ta-border)' : 'none',
                    background: 'var(--ta-surface)', color: 'var(--ta-text)', fontSize: 12.5, cursor: 'pointer',
                  }}
                >
                  {sug.etiqueta}
                </button>
              ))}
              {!buscandoDireccion && sugerencias.length === 0 && direccionTexto.trim().length >= 4 && (
                <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: 0, padding: '8px 10px' }}>
                  Sin coincidencias en el mapa — se guarda tal cual la escribas.
                </p>
              )}
            </div>
          )}
        </div>

        <p style={{ fontSize: 11, color: 'var(--ta-text-muted)', margin: '0 0 8px' }}>
          {tieneUbicacion ? 'Arrastra el pin para ajustar, o toca el mapa.' : 'Escribe la dirección arriba o toca el mapa para poner el pin manualmente — no dependen una de la otra.'}
        </p>

        <div style={{ position: 'relative', height: 380, borderRadius: 12, overflow: 'hidden', border: '0.5px solid var(--ta-border)' }}>
          <ContenidoMapa posicionMapa={posicionMapa} tieneUbicacion={tieneUbicacion} onMoverPin={handleMoverPin} />

          <button
            type="button"
            onClick={() => setMapaCompleto(true)}
            aria-label="Ver mapa en pantalla completa"
            style={{
              position: 'absolute', top: 8, right: 8, zIndex: 1100,
              width: 36, height: 36, borderRadius: 8, border: 'none',
              background: 'rgba(250,250,247,0.92)', color: 'var(--ta-text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(42,42,40,0.15)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H4v4M16 3h4v4M8 21H4v-4M16 21h4v-4" />
            </svg>
          </button>
        </div>

        {/* ── Zona y conectividad (movido desde Ficha técnica) ── */}
        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 8px' }}>
            Zona y conectividad
          </p>
          <CampoTexto
            label="Zona / colonia de referencia"
            value={ubicacionConectividad.zona_colonia_referencia}
            onChange={setUC('zona_colonia_referencia')}
          />
          <CampoTextoArea
            label="Puntos de interés cercanos"
            value={ubicacionConectividad.puntos_interes_cercanos}
            onChange={setUC('puntos_interes_cercanos')}
            rows={2}
          />
          <CampoTexto label="Escuelas" value={servicios.escuelas} onChange={setServicio('escuelas')} />
          <CampoTexto label="Hospitales" value={servicios.hospitales} onChange={setServicio('hospitales')} />
          <CampoTexto label="Transporte" value={servicios.transporte} onChange={setServicio('transporte')} />
        </div>
      </div>

      {mapaCompleto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--ta-bg)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', borderBottom: '0.5px solid var(--ta-border)' }}>
            <span style={{ fontSize: 13, color: 'var(--ta-text-muted)' }}>
              {tieneUbicacion ? 'Arrastra el pin para ajustar, o toca el mapa.' : 'Toca el mapa para poner el pin.'}
            </span>
            <button
              type="button"
              onClick={() => setMapaCompleto(false)}
              aria-label="Cerrar pantalla completa"
              style={{
                width: 36, height: 36, borderRadius: 8, border: 'none',
                background: 'var(--ta-surface)', color: 'var(--ta-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
          <div style={{ flex: 1 }}>
            <ContenidoMapa posicionMapa={posicionMapa} tieneUbicacion={tieneUbicacion} onMoverPin={handleMoverPin} />
          </div>
        </div>
      )}
    </div>
  )
}
