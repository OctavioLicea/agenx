// src/features/propiedades/GeneradorPostFacebook.jsx
// Motivo: FEAT — 18 jul 2026, pedido de Okta/Nydia: generar el texto de un
//   post de Facebook a partir de los datos ya capturados de la propiedad
//   (specs + título/descripción que Nydia ya escribe a mano en Básico).
//   Decisión explícita de Okta (18 jul): sin llamar a ningún modelo de IA
//   por HTTP — una Edge Function que llamara a la API de Claude por cada
//   propiedad tendría costo por llamada, rompiendo el principio de cero
//   costo que ya sigue el resto del proyecto (mailto: en vez de un
//   servicio de correo, Nominatim/OSM en vez de Google Maps de paga,
//   etc.). En vez de eso: un generador 100% local por plantillas. Nydia
//   elige qué datos incluir (checklist) y un estilo (3 layouts), el texto
//   sale editable con botón de "Regenerar" y "Copiar" — no publica directo
//   a Facebook (no hay integración con Meta API, fuera de alcance), se
//   copia y se pega a mano, mismo patrón que ya usa la liga pública.
//
//   [Actualización 2026-07-18, rebotado con mockup antes de tocar código
//   — regla ya establecida en el proyecto desde el incidente de Elegance]:
//   1) El estilo "Directo" dejó de re-listar recámaras/baños/m² por
//      separado: la descripción que Nydia ya escribe a mano (ver
//      FichaBasico.jsx) YA viene en formato post-listo (emojis, bullets,
//      precio, hasta su teléfono) — repetir specs habría sido redundante.
//      Esos campos del checklist quedan deshabilitados solo cuando el
//      estilo activo es "Directo"; "Elegante" y "Datos rápidos" sí arman
//      su propio resumen y sí los usan.
//   2) Nuevo campo "Gancho" (siempre visible, no depende del estilo):
//      recordatorio visual (borde e indicador con --ta-detail, NO rojo de
//      error) de que un post sin gancho no destaca en el feed — pero no
//      bloquea "Copiar" si se deja vacío, es una norma de buena práctica,
//      no una validación dura.
//   3) Nuevo campo "Llamado a la acción" (CTA), opcional, se agrega antes
//      de la liga/hashtags si se llena.
//   4) Paleta de emojis rápidos (inserta en la posición del cursor del
//      textarea) para cuando Nydia prefiera escribir el post ella misma
//      desde cero en vez de usar el generado automático.
// Timestamp: 2026-07-18

import { useMemo, useRef, useState } from 'react'
import BotonCerrar from '../../components/BotonCerrar'

// Mismos labels/listas que ya están duplicados en ExportaFicha.jsx y
// usePropiedadPublica.js — criterio ya establecido en el proyecto de
// constantes/componentes locales por archivo en vez de un módulo central.
const TIPOS_LABEL = { casa: 'Casa', depto: 'Departamento', terreno: 'Terreno', local: 'Local comercial', otro: 'Otro' }
const OPERACION_LABEL = { venta: 'Venta', renta: 'Renta' }
const ZONA_LABEL = { saltillo: 'Saltillo', arteaga: 'Arteaga', ramos_arizpe: 'Ramos Arizpe' }

const AMENIDADES_ITEMS = [
  ['servicios_generales_seguridad', 'seguridad_vigilancia', 'Seguridad y vigilancia'],
  ['servicios_generales_seguridad', 'estacionamiento_techado_visitas', 'Estacionamiento techado y de visitas'],
  ['servicios_generales_seguridad', 'elevador', 'Elevador'],
  ['servicios_generales_seguridad', 'motor_lobby', 'Motor lobby'],
  ['servicios_generales_seguridad', 'recepcion_paqueteria', 'Recepción de paquetería'],
  ['recreacion_bienestar', 'alberca_jacuzzi', 'Alberca y jacuzzi'],
  ['recreacion_bienestar', 'gimnasio', 'Gimnasio'],
  ['recreacion_bienestar', 'spa_sauna', 'Spa y sauna'],
  ['recreacion_bienestar', 'roof_garden', 'Roof garden'],
  ['recreacion_bienestar', 'salon_usos_multiples', 'Salón de usos múltiples'],
  ['recreacion_bienestar', 'areas_asador_terrazas', 'Áreas de asador (BBQ) y terrazas'],
  ['recreacion_bienestar', 'salon_juegos', 'Salón de juegos'],
  ['equipo_interior', 'cocina', 'Cocina equipada'],
  ['equipo_interior', 'banos', 'Baños equipados'],
  ['equipo_interior', 'almacenamiento', 'Almacenamiento'],
  ['equipo_interior', 'climatizacion', 'Climatización'],
]

// Emojis de uso frecuente en las descripciones que Nydia ya escribe a
// mano (ver FichaBasico.jsx) — pensados para insertarse en el cursor del
// textarea cuando prefiere escribir el post ella misma en vez de usar el
// generado automático.
const EMOJIS_RAPIDOS = ['🏡', '📍', '💰', '✨', '✔️', '📸', '📞', '📅', '🚗', '🛁', '🍳', '🌳', '🔑', '🔥', '❄️', '🏊', '🛋️', '🅿️']

function tieneValor(v) {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim() !== ''
  return true
}

function formatearPrecio(precio, moneda) {
  if (!tieneValor(precio)) return null
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda || 'MXN', maximumFractionDigits: 0 }).format(precio)
  } catch {
    return `$${precio} ${moneda || 'MXN'}`
  }
}

const LAYOUTS = [
  { key: 'directo', label: 'Directo', descripcion: 'Usa tu descripción completa tal cual' },
  { key: 'elegante', label: 'Elegante', descripcion: 'Texto corrido, tono más formal' },
  { key: 'rapido', label: 'Datos rápidos', descripcion: 'Caption corto + hashtags' },
]

// `soloEnResumen: true` = campo que solo aplica a "Elegante"/"Datos
// rápidos" (arman su propio resumen de specs). En "Directo" se
// deshabilita porque esa info ya está en la descripción que Nydia
// escribió a mano — repetirla se ve redundante.
const CAMPOS_DEF = [
  { key: 'zona', label: 'Zona' },
  { key: 'precio', label: 'Precio' },
  { key: 'recamaras', label: 'Recámaras', soloEnResumen: true },
  { key: 'banos', label: 'Baños', soloEnResumen: true },
  { key: 'estacionamientos', label: 'Estacionamiento', soloEnResumen: true },
  { key: 'm2Construccion', label: 'M² construcción', soloEnResumen: true },
  { key: 'm2Terreno', label: 'M² terreno', soloEnResumen: true },
  { key: 'amenidades', label: 'Amenidades destacadas', soloEnResumen: true },
  { key: 'hashtags', label: 'Hashtags' },
]

// No pide "Estatus legal" todavía — la ficha técnica (Historial y
// Situación fiscal y legal) sigue sin construirse (ver docs/BACKLOG.md),
// así que esa sección del post simplemente no existe por ahora en vez de
// mostrar algo vacío o inventado.
function generarTexto({ propiedad, layout, campos, gancho, cta }) {
  const ficha = propiedad.ficha || {}
  const equipamiento = ficha.equipamiento || {}
  const extras = equipamiento.extras || []
  const amenidadesActivas = AMENIDADES_ITEMS
    .filter(([grupo, key]) => equipamiento[grupo]?.[key] === true)
    .map(([, , label]) => label)
    .concat(extras.filter((e) => tieneValor(e.nombre) && e.tipo === 'si_no' && e.valor === true).map((e) => e.nombre))

  const operacionTxt = OPERACION_LABEL[propiedad.operacion] || ''
  const tipoTxt = propiedad.tipo === 'otro' ? propiedad.tipo_otro : TIPOS_LABEL[propiedad.tipo]
  const zonaTxt = campos.zona ? (ZONA_LABEL[propiedad.zona] || propiedad.zona || null) : null
  const precioTxt = campos.precio ? formatearPrecio(propiedad.precio, propiedad.moneda) : null
  const precioSufijo = precioTxt && propiedad.operacion === 'renta' ? '/mes' : ''
  const liga = propiedad.publicado && propiedad.id ? `https://tuasesor.eventosytech.com/p/${propiedad.id}` : null

  // "Directo" ignora el resumen de specs/amenidades a propósito — ver
  // nota de cabecera. Solo Elegante/Datos rápidos arman ["Recámaras", 3]
  // etc. a partir del checklist.
  const usarResumen = layout !== 'directo'
  const specs = []
  if (usarResumen) {
    if (campos.recamaras && tieneValor(propiedad.recamaras)) specs.push(['Recámaras', propiedad.recamaras])
    if (campos.banos && tieneValor(propiedad.banos)) specs.push(['Baños', propiedad.banos])
    if (campos.estacionamientos && tieneValor(propiedad.estacionamientos)) specs.push(['Estacionamiento', propiedad.estacionamientos])
    if (campos.m2Construccion && tieneValor(propiedad.m2_construccion)) specs.push(['Construcción', `${propiedad.m2_construccion} m²`])
    if (campos.m2Terreno && tieneValor(propiedad.m2_terreno)) specs.push(['Terreno', `${propiedad.m2_terreno} m²`])
  }

  const hashtags = campos.hashtags
    ? ['#BienesRaicesCoahuila', '#TuAsesor', zonaTxt && `#${zonaTxt.replace(/\s+/g, '')}`, tipoTxt && operacionTxt && `#${tipoTxt.replace(/\s+/g, '')}En${operacionTxt.replace(/\s+/g, '')}`]
        .filter(Boolean).join(' ')
    : ''

  const titulo = propiedad.titulo || 'Propiedad'
  const encabezado = [operacionTxt, tipoTxt, zonaTxt].filter(Boolean).join(' · ')
  const ganchoTxt = tieneValor(gancho) ? gancho.trim() : null
  const ctaTxt = tieneValor(cta) ? cta.trim() : null

  const partes = []
  if (ganchoTxt) partes.push(ganchoTxt, '')

  if (layout === 'elegante') {
    partes.push(titulo.toUpperCase(), '')
    if (encabezado) partes.push(encabezado, '')
    if (tieneValor(propiedad.descripcion)) partes.push(propiedad.descripcion.trim(), '')
    if (specs.length > 0) partes.push(`Cuenta con ${specs.map(([l, v]) => `${v} ${l.toLowerCase()}`).join(', ')}.`, '')
    if (amenidadesActivas.length > 0 && campos.amenidades) partes.push(`Entre sus amenidades: ${amenidadesActivas.slice(0, 6).join(', ')}.`, '')
    if (precioTxt) partes.push(`Precio: ${precioTxt}${precioSufijo}`, '')
  } else if (layout === 'rapido') {
    partes.push(`${titulo}${precioTxt ? ` — ${precioTxt}${precioSufijo}` : ''}`)
    if (specs.length > 0) partes.push(specs.map(([, v]) => v).join(' | ') + (zonaTxt ? ` 📍 ${zonaTxt}` : ''))
    else if (zonaTxt) partes.push(`📍 ${zonaTxt}`)
    partes.push('')
  } else {
    // 'directo' — la descripción completa de Nydia hace el trabajo pesado
    partes.push(`🏡 ${titulo}`)
    if (encabezado) partes.push(encabezado)
    partes.push('')
    if (precioTxt) partes.push(`💰 ${precioTxt}${precioSufijo}`, '')
    if (tieneValor(propiedad.descripcion)) partes.push(propiedad.descripcion.trim(), '')
  }

  if (ctaTxt) partes.push(ctaTxt, '')
  if (liga) partes.push(layout === 'rapido' ? liga : `📲 Más fotos e info: ${liga}`, '')
  if (hashtags) partes.push(hashtags)

  return partes.join('\n').trim()
}

export default function GeneradorPostFacebook({ propiedad, onCerrar }) {
  const [layout, setLayout] = useState('directo')
  const [campos, setCampos] = useState({
    zona: true, precio: true, recamaras: true, banos: true, estacionamientos: true,
    m2Construccion: true, m2Terreno: true, amenidades: true, hashtags: true,
  })
  const [gancho, setGancho] = useState('')
  const [cta, setCta] = useState('')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- solo se usa para el valor inicial del textarea
  const textoInicial = useMemo(() => generarTexto({ propiedad, layout, campos, gancho, cta }), [])
  const [texto, setTexto] = useState(textoInicial)
  const [tocado, setTocado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const textareaRef = useRef(null)

  const regenerar = (overrides = {}) => {
    const args = { propiedad, layout, campos, gancho, cta, ...overrides }
    setTexto(generarTexto(args))
    setTocado(false)
  }

  const cambiarLayout = (key) => {
    setLayout(key)
    regenerar({ layout: key })
  }

  // Mientras Nydia no haya tocado el texto a mano, cada cambio de
  // checkbox/gancho/CTA regenera de inmediato (feedback directo). En
  // cuanto edita el textarea directo (o inserta un emoji), se detiene el
  // auto-regenerado para no pisar su edición — "Regenerar" sigue
  // disponible si quiere empezar de nuevo.
  const alternarCampo = (key) => {
    const nuevos = { ...campos, [key]: !campos[key] }
    setCampos(nuevos)
    if (!tocado) regenerar({ campos: nuevos })
  }

  const cambiarGancho = (valor) => {
    setGancho(valor)
    if (!tocado) regenerar({ gancho: valor })
  }

  const cambiarCta = (valor) => {
    setCta(valor)
    if (!tocado) regenerar({ cta: valor })
  }

  const insertarEmoji = (emoji) => {
    const ta = textareaRef.current
    const inicio = ta?.selectionStart ?? texto.length
    const fin = ta?.selectionEnd ?? texto.length
    const nuevo = texto.slice(0, inicio) + emoji + texto.slice(fin)
    setTexto(nuevo)
    setTocado(true)
    requestAnimationFrame(() => {
      if (!ta) return
      const pos = inicio + emoji.length
      ta.focus()
      ta.setSelectionRange(pos, pos)
    })
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      window.prompt('Copia el texto:', texto)
      return
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,40,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 65, padding: 16, boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', background: 'var(--ta-surface)', borderRadius: 20, padding: 16, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ width: 44 }} />
          <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--ta-text)' }}>Post para Facebook</span>
          <BotonCerrar onClick={onCerrar} />
        </div>

        <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--ta-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
          Gancho <span style={{ color: 'var(--ta-detail)', fontSize: 13 }}>*</span>
        </p>
        <input
          type="text"
          value={gancho}
          onChange={(e) => cambiarGancho(e.target.value)}
          placeholder="Ej. ¿Buscas tu próxima casa en Arteaga?"
          style={{
            width: '100%', height: 38, borderRadius: 10, border: '1px solid var(--ta-detail)',
            background: 'var(--ta-surface)', color: 'var(--ta-text)', padding: '0 12px',
            fontSize: 13, boxSizing: 'border-box', marginBottom: 4,
          }}
        />
        <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--ta-text-muted)' }}>
          La primera línea que se lee en Facebook — sin ella, el post no destaca en el feed. Se recomienda llenarla siempre (no bloquea copiar si la dejas vacía).
        </p>

        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ta-text-muted)' }}>Estilo</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {LAYOUTS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => cambiarLayout(l.key)}
              title={l.descripcion}
              style={{
                flex: 1, height: 40, borderRadius: 10, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                border: layout === l.key ? '1.5px solid var(--ta-accent)' : '0.5px solid var(--ta-border)',
                background: layout === l.key ? 'var(--ta-accent)' : 'var(--ta-bg)',
                color: layout === l.key ? 'var(--ta-on-accent)' : 'var(--ta-text)',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ta-text-muted)' }}>Datos a incluir</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
          {CAMPOS_DEF.map((c) => {
            const deshabilitado = c.soloEnResumen && layout === 'directo'
            return (
              <label
                key={c.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 20,
                  border: '0.5px solid var(--ta-border)', background: campos[c.key] && !deshabilitado ? 'var(--ta-bg)' : 'transparent',
                  fontSize: 12, color: deshabilitado ? 'var(--ta-border)' : 'var(--ta-text)',
                  cursor: deshabilitado ? 'not-allowed' : 'pointer', opacity: deshabilitado ? 0.6 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={campos[c.key]}
                  disabled={deshabilitado}
                  onChange={() => alternarCampo(c.key)}
                  style={{ width: 14, height: 14 }}
                />
                {c.label}
              </label>
            )
          })}
        </div>
        {layout === 'directo' && (
          <p style={{ margin: '0 0 16px', fontSize: 11, color: 'var(--ta-text-muted)' }}>
            En "Directo" tu descripción ya trae recámaras/baños/m²/amenidades — no se repiten aquí. Ese checklist aplica en "Elegante" y "Datos rápidos".
          </p>
        )}
        {layout !== 'directo' && <div style={{ marginBottom: 16 }} />}

        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ta-text-muted)' }}>Emojis rápidos — para cuando escribas tú misma</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {EMOJIS_RAPIDOS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => insertarEmoji(emoji)}
              aria-label={`Insertar ${emoji}`}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '0.5px solid var(--ta-border)',
                background: 'var(--ta-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, cursor: 'pointer', padding: 0,
              }}
            >
              {emoji}
            </button>
          ))}
        </div>

        <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--ta-text-muted)' }}>Llamado a la acción (opcional)</p>
        <input
          type="text"
          value={cta}
          onChange={(e) => cambiarCta(e.target.value)}
          placeholder="Ej. Escríbeme por WhatsApp y agenda tu visita"
          style={{
            width: '100%', height: 38, borderRadius: 10, border: '0.5px solid var(--ta-border)',
            background: 'var(--ta-surface)', color: 'var(--ta-text)', padding: '0 12px',
            fontSize: 13, boxSizing: 'border-box', marginBottom: 16,
          }}
        />

        {!propiedad.publicado && (
          <p style={{ margin: '0 0 12px', fontSize: 11.5, color: 'var(--ta-text-muted)' }}>
            Esta propiedad no está publicada — el post no va a incluir la liga a la página pública. Actívala en "Básico" si quieres que el post enlace ahí.
          </p>
        )}

        {tocado && (
          <p style={{ margin: '0 0 8px', fontSize: 11.5, color: 'var(--ta-detail)' }}>
            Editaste el texto a mano — cambiar el estilo o los datos de arriba ya no lo va a sobreescribir. Usa "Regenerar" si quieres empezar de nuevo.
          </p>
        )}

        <textarea
          ref={textareaRef}
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setTocado(true) }}
          rows={12}
          style={{
            width: '100%', borderRadius: 12, border: '0.5px solid var(--ta-border)', background: 'var(--ta-bg)',
            color: 'var(--ta-text)', padding: 12, fontSize: 13, lineHeight: 1.6, boxSizing: 'border-box',
            resize: 'vertical', fontFamily: 'inherit', marginBottom: 12,
          }}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => regenerar()}
            style={{ flex: 1, height: 44, borderRadius: 10, border: '0.5px solid var(--ta-border)', background: 'var(--ta-bg)', color: 'var(--ta-text)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            Reiniciar texto
          </button>
          <button
            type="button"
            onClick={copiar}
            style={{ flex: 1, height: 44, borderRadius: 10, border: 'none', background: copiado ? 'var(--ta-accent)' : 'var(--ta-text)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            {copiado ? '¡Copiado!' : 'Copiar texto'}
          </button>
        </div>
      </div>
    </div>
  )
}
