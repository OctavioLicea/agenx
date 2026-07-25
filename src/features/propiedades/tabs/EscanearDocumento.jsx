// src/features/propiedades/tabs/EscanearDocumento.jsx
// Motivo: FEAT — pedido de Okta (Sesión 16): botón "Escanear documento" en
//   la Bóveda (FichaDocumentos.jsx). Flujo: 1) abre la cámara directo
//   (input file con capture="environment", sin librería nueva); 2) muestra
//   la foto con 4 puntos arrastrables sobre las esquinas del documento;
//   3) mientras se arrastran, un canvas de salida muestra en vivo el
//   resultado "enderezado" — perspectiva corregida partiendo el cuadrilátero
//   en 2 triángulos y aplicando una transformación afín a cada uno (truco
//   estándar sin dependencias, ya prototipado y aprobado por Okta antes de
//   escribir esto); 4) "Usar esta versión" convierte el canvas de salida a
//   un Blob JPEG y lo entrega vía onEscaneado(file) — el padre
//   (FichaDocumentos.jsx) lo mete a `archivoSeleccionado` y reutiliza el
//   mismo flujo de subida que ya existía (tipo/descripción/subir), sin
//   duplicar lógica de Storage. Nivel 2 de 3 discutidos con Okta (cámara +
//   recorte manual, sin auto-detección de bordes tipo CamScanner — eso
//   requeriría una librería pesada, Nivel 3, descartado por el principio de
//   cero costo/infra del proyecto).
// Timestamp: 2026-07-15, 23:10 hrs

import { useState, useRef, useEffect, useCallback } from 'react'
import BotonCerrar from '../../../components/BotonCerrar'

const ANCHO_DISPLAY_MAX = 320
const ALTO_DISPLAY_MAX = 440
const LADO_SALIDA_MAX = 1600
const LADO_SALIDA_MIN = 200

function IconoCamara() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function distancia(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// Dimensiones de salida a partir del tamaño real (en px de la foto original,
// no del canvas chico de preview) del cuadrilátero marcado — así el escaneo
// final no queda con menos resolución de la que la foto ya traía.
function calcularDimensionesSalida(puntosNaturales) {
  const [tl, tr, br, bl] = puntosNaturales
  const anchoArriba = distancia(tl, tr)
  const anchoAbajo = distancia(bl, br)
  const altoIzq = distancia(tl, bl)
  const altoDer = distancia(tr, br)
  let ancho = Math.round((anchoArriba + anchoAbajo) / 2)
  let alto = Math.round((altoIzq + altoDer) / 2)
  const escalaMax = Math.min(1, LADO_SALIDA_MAX / Math.max(ancho, alto, 1))
  ancho = Math.max(LADO_SALIDA_MIN, Math.round(ancho * escalaMax))
  alto = Math.max(LADO_SALIDA_MIN, Math.round(alto * escalaMax))
  return { ancho, alto }
}

// Transformación afín exacta a partir de 3 pares de puntos correspondientes
// (x,y) -> (u,v). Con eso se resuelve el sistema u = a*x+c*y+e, v = b*x+d*y+f.
function calcularAfin(s, d) {
  const [[x0, y0], [x1, y1], [x2, y2]] = s
  const [[u0, v0], [u1, v1], [u2, v2]] = d
  const den = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1)
  const a = (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / den
  const c = (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / den
  const e = (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / den
  const b = (v0 * (y1 - y2) + v1 * (y2 - y0) + v2 * (y0 - y1)) / den
  const dd = (v0 * (x2 - x1) + v1 * (x0 - x2) + v2 * (x1 - x0)) / den
  const f = (v0 * (x1 * y2 - x2 * y1) + v1 * (x2 * y0 - x0 * y2) + v2 * (x0 * y1 - x1 * y0)) / den
  return [a, b, c, dd, e, f]
}

// Endereza la imagen fuente al canvas de salida. Divide el cuadrilátero
// (orden TL, TR, BR, BL) en 2 triángulos y aplica una transformación afín
// distinta a cada uno — no es una perspectiva matemáticamente perfecta
// (eso requiere una homografía real, sin soporte nativo en canvas 2D), pero
// para enderezar la foto de un documento el resultado es indistinguible.
function aplicarWarp(imagenFuente, puntosNaturales, canvasSalida) {
  const { ancho, alto } = calcularDimensionesSalida(puntosNaturales)
  canvasSalida.width = ancho
  canvasSalida.height = alto
  const ctx = canvasSalida.getContext('2d')
  ctx.clearRect(0, 0, ancho, alto)
  const destino = [[0, 0], [ancho, 0], [ancho, alto], [0, alto]]
  const triangulos = [[0, 1, 3], [2, 3, 1]]
  triangulos.forEach((tri) => {
    const s = tri.map((i) => [puntosNaturales[i].x, puntosNaturales[i].y])
    const d = tri.map((i) => destino[i])
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(d[0][0], d[0][1])
    ctx.lineTo(d[1][0], d[1][1])
    ctx.lineTo(d[2][0], d[2][1])
    ctx.closePath()
    ctx.clip()
    const m = calcularAfin(s, d)
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5])
    ctx.drawImage(imagenFuente, 0, 0)
    ctx.restore()
  })
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

export default function EscanearDocumento({ onCerrar, onEscaneado }) {
  const inputRef = useRef(null)
  const imagenRef = useRef(null)
  const displayCanvasRef = useRef(null)
  const outputCanvasRef = useRef(null)
  const contenedorRef = useRef(null)

  const [imagenLista, setImagenLista] = useState(false)
  const [escala, setEscala] = useState(1)
  const [dimensionesDisplay, setDimensionesDisplay] = useState({ ancho: 0, alto: 0 })
  const [puntos, setPuntos] = useState([])
  const [arrastrando, setArrastrando] = useState(null)
  const [procesando, setProcesando] = useState(false)

  const handleFoto = (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const escalaCalc = Math.min(1, ANCHO_DISPLAY_MAX / img.naturalWidth, ALTO_DISPLAY_MAX / img.naturalHeight)
      const ancho = Math.round(img.naturalWidth * escalaCalc)
      const alto = Math.round(img.naturalHeight * escalaCalc)
      imagenRef.current = img
      setEscala(escalaCalc)
      setDimensionesDisplay({ ancho, alto })
      const m = 0.08
      setPuntos([
        { x: ancho * m, y: alto * m },
        { x: ancho * (1 - m), y: alto * m },
        { x: ancho * (1 - m), y: alto * (1 - m) },
        { x: ancho * m, y: alto * (1 - m) },
      ])
      setImagenLista(true)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  // Dibuja la foto base una sola vez (no depende de los puntos).
  useEffect(() => {
    if (!imagenLista) return
    const canvas = displayCanvasRef.current
    canvas.width = dimensionesDisplay.ancho
    canvas.height = dimensionesDisplay.alto
    canvas.getContext('2d').drawImage(imagenRef.current, 0, 0, canvas.width, canvas.height)
  }, [imagenLista, dimensionesDisplay])

  // Recalcula el resultado enderezado cada vez que se mueve una esquina.
  useEffect(() => {
    if (!imagenLista || puntos.length !== 4 || !escala) return
    const puntosNaturales = puntos.map((p) => ({ x: p.x / escala, y: p.y / escala }))
    aplicarWarp(imagenRef.current, puntosNaturales, outputCanvasRef.current)
  }, [puntos, imagenLista, escala])

  const manejarPointerDown = (i) => (e) => {
    e.preventDefault()
    setArrastrando(i)
    e.target.setPointerCapture(e.pointerId)
  }

  const manejarPointerMove = useCallback((e) => {
    if (arrastrando === null) return
    const rect = contenedorRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(dimensionesDisplay.ancho, e.clientX - rect.left))
    const y = Math.max(0, Math.min(dimensionesDisplay.alto, e.clientY - rect.top))
    setPuntos((prev) => prev.map((p, idx) => (idx === arrastrando ? { x, y } : p)))
  }, [arrastrando, dimensionesDisplay])

  const manejarPointerUp = () => setArrastrando(null)

  const reintentar = () => {
    setImagenLista(false)
    setPuntos([])
  }

  const confirmar = () => {
    setProcesando(true)
    outputCanvasRef.current.toBlob((blob) => {
      setProcesando(false)
      if (!blob) return
      const file = new File([blob], `escaneo_${Date.now()}.jpg`, { type: 'image/jpeg' })
      onEscaneado(file)
    }, 'image/jpeg', 0.92)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,40,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 16, boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto', background: 'var(--ta-surface)', borderRadius: 20, padding: 16, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ width: 44 }} />
          <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--ta-text)' }}>Escanear documento</span>
          <BotonCerrar onClick={onCerrar} />
        </div>

        <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFoto} />

        {!imagenLista ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              width: '100%', height: 120, borderRadius: 12, border: '1.5px dashed var(--ta-border)',
              background: 'none', color: 'var(--ta-text-muted)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, cursor: 'pointer',
            }}
          >
            <IconoCamara />
            Tomar foto del documento
          </button>
        ) : (
          <>
            <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 8px' }}>
              Ajusta las 4 esquinas sobre el documento
            </p>
            <div
              ref={contenedorRef}
              onPointerMove={manejarPointerMove}
              onPointerUp={manejarPointerUp}
              style={{ position: 'relative', width: dimensionesDisplay.ancho, height: dimensionesDisplay.alto, margin: '0 auto', touchAction: 'none' }}
            >
              <canvas ref={displayCanvasRef} style={{ position: 'absolute', top: 0, left: 0, borderRadius: 8 }} />
              {puntos.map((p, i) => (
                <div
                  key={i}
                  onPointerDown={manejarPointerDown(i)}
                  style={{
                    position: 'absolute', left: p.x, top: p.y, width: 26, height: 26, margin: '-13px',
                    borderRadius: '50%', background: 'var(--ta-accent)', border: '2px solid var(--ta-on-accent)',
                    touchAction: 'none', cursor: 'grab', boxSizing: 'border-box',
                  }}
                />
              ))}
            </div>

            <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '14px 0 8px' }}>Resultado</p>
            <canvas
              ref={outputCanvasRef}
              style={{ width: '100%', maxWidth: 260, display: 'block', margin: '0 auto', borderRadius: 8, background: 'var(--ta-bg)' }}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={reintentar}
                style={{ flex: 1, height: 44, borderRadius: 10, border: '0.5px solid var(--ta-border)', background: 'none', color: 'var(--ta-text)', fontSize: 14 }}
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={procesando}
                style={{ flex: 1, height: 44, borderRadius: 10, border: 'none', background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 14, fontWeight: 500, opacity: procesando ? 0.6 : 1 }}
              >
                {procesando ? 'Procesando...' : 'Usar esta versión'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
