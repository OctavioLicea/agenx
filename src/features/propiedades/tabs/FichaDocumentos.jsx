// src/features/propiedades/tabs/FichaDocumentos.jsx
// Motivo: FEAT — 5ª pestaña del wizard de Propiedades: pantalla completa de
//   la Bóveda de documentos (infraestructura ya existía desde Sesión 9:
//   tabla documentos_propiedad + bucket-propiedad-vault). Se cambió el
//   selector de tipo_documento de chips a <select> nativo (con 12 tipos +
//   "Otro" es demasiado para chips — regla del proyecto es "tap-buttons
//   para pocas variantes"). Se agregó campo "Descripción" (nota corta,
//   obligatoria) — columna nueva en BD. Los archivos .xlsm (Excel con
//   macros, común en simulaciones de crédito bancarias) sí se permiten mas
//   con un confirm() nativo de advertencia antes de subir (mismo patrón de
//   fricción deliberada que "Quitar" en Colaboradores/Contactos) — no se
//   bloquean de raíz porque romperían un documento real y frecuente del
//   negocio. Escaneo antivirus real queda en backlog de Fase 2, a
//   retomar cuando se construya "Enviar a cliente" (ahí es cuando el
//   riesgo deja de ser solo de Nydia). Subida de un archivo a la vez
//   (a diferencia de Fotos) porque cada documento necesita su propio
//   tipo + descripción antes de subirse, no después. Íconos por tipo de
//   archivo: PNG reales guardados por Okta en src/assets/doctypes/ (pdf,
//   word, excel, txt, jpeg, xml, mail, svg) en vez de un badge de texto o
//   pictograma dibujado a mano. Se agregaron XML, EML y SVG a los tipos
//   permitidos (bucket + validación de extensión) — SVG se permite pese al
//   riesgo teórico de XSS embebido porque el vault es privado y de un solo
//   usuario (Nydia sube y descarga sus propios archivos, no hay superficie
//   pública); no se descarta revisar esto si algún día existe "Enviar a
//   cliente" (mismo criterio que el escaneo antivirus, backlog de Fase 2).
//   Jerarquía visual de cada tarjeta reordenada (pedido de Okta): tipo de
//   documento primero y más grande (14px/500), descripción después (12px,
//   ahora con tope real de 30 caracteres en el input, antes 140),
//   nombre de archivo al final y más discreto (11px, muted) — antes el
//   nombre iba primero. Botón "Agregar documento" también se movió arriba
//   de la lista (antes vivía debajo de todo).
//   [Actualización 2026-07-13, 23:40 hrs]: candado de PIN — si Nydia
//   configuró un PIN en Perfil > Seguridad (tuasesor.perfiles,
//   boveda_pin_hash/salt), esta pestaña pide el PIN antes de mostrar nada
//   (ni siquiera la lista de tipos/descripciones). Desbloqueo dura toda la
//   pestaña del navegador (sessionStorage 'ta_boveda_unlocked'), no cada
//   propiedad — pedirlo por propiedad habría sido fricción sin beneficio
//   real (misma persona, mismo dispositivo). Si no hay PIN configurado, la
//   pestaña funciona igual que antes (sin candado, opt-in). "Olvidé mi
//   PIN": se genera un código de 6 dígitos EN MEMORIA (nunca se guarda en
//   BD) y se abre un mailto: dirigido al propio correo de Nydia (su email
//   de cuenta) con el código en el cuerpo — ella misma le da "Enviar" en
//   su cliente de correo y minutos después lo lee ahí. Se eligió mailto en
//   vez de un servicio de correo transaccional (Resend, etc.) porque es
//   exactamente el mismo patrón que ya usa el resto de la app (mailto en
//   ContactoForm/FichaColaboradores) — cero servicio nuevo, cero costo,
//   cero configuración adicional. Verificado el código, se pide PIN nuevo
//   y se guarda (mismo hash+salt que PerfilForm.jsx, vía
//   src/lib/bovedaPin.js).
// Timestamp: 2026-07-13, 23:40 hrs

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { verificarPin, generarSalt, hashPin, generarCodigo6, PIN_LARGO } from '../../../lib/bovedaPin'
import EscanearDocumento from './EscanearDocumento'
import iconoPdf from '../../../assets/doctypes/pdf.png'
import iconoWord from '../../../assets/doctypes/word.png'
import iconoExcel from '../../../assets/doctypes/excel.png'
import iconoTxt from '../../../assets/doctypes/txt.png'
import iconoImagen from '../../../assets/doctypes/jpeg.png'
import iconoXml from '../../../assets/doctypes/xml.png'
import iconoMail from '../../../assets/doctypes/mail.png'
import iconoSvg from '../../../assets/doctypes/svg.png'

const CODIGO_VIGENCIA_MS = 10 * 60 * 1000 // 10 minutos

const BUCKET = 'bucket-propiedad-vault'
const MAX_DOCUMENTO_MB = 20

// Mapeo extensión → content-type explícito para el upload. No se confía en
// el file.type que reporta el navegador (poco confiable para .xlsm en
// particular — muchos SO lo reportan vacío u "octet-stream"), así que el
// content-type real que ve el bucket lo decidimos nosotros a partir de la
// extensión, no de lo que adivinó el navegador.
const EXTENSION_MIME = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
  txt: 'text/plain',
  xml: 'application/xml',
  eml: 'message/rfc822',
  svg: 'image/svg+xml',
}

// Únicas extensiones habilitadas hoy que traen macros (Word/PowerPoint con
// macros ni siquiera están en el allow-list del bucket, solo Excel).
const EXTENSIONES_CON_MACRO = new Set(['xlsm'])

// Tipos seleccionables en el alta manual — excluye 'ficha_exportada', que
// solo lo escribe ExportaFicha.jsx automáticamente al archivar un PDF.
const TIPOS = [
  { value: 'identificacion', label: 'Identificación oficial' },
  { value: 'escritura', label: 'Escritura / Título de propiedad' },
  { value: 'antecedentes_registrales', label: 'Historial o antecedentes registrales' },
  { value: 'libertad_gravamen', label: 'Certificado de libertad de gravamen' },
  { value: 'uso_suelo', label: 'Certificado de zonificación y uso de suelo' },
  { value: 'planos', label: 'Planos arquitectónicos' },
  { value: 'regimen_condominio', label: 'Régimen de condominio' },
  { value: 'boleta_predial', label: 'Boleta predial' },
  { value: 'recibos_servicios', label: 'Recibos de servicios' },
  { value: 'no_adeudo_mantenimiento', label: 'Carta de no adeudo de mantenimiento' },
  { value: 'avaluo', label: 'Avalúo comercial' },
  { value: 'simulacion_credito', label: 'Simulación de crédito / financiamiento' },
  { value: 'otro', label: 'Otro' },
]

// Incluye 'ficha_exportada' aparte, solo para poder mostrar su etiqueta en
// la lista de documentos ya subidos (nunca aparece en el <select> de alta).
const TODOS_LOS_TIPOS = [...TIPOS, { value: 'ficha_exportada', label: 'Ficha exportada' }]

function etiquetaTipo(doc) {
  if (doc.tipo_documento === 'otro') return doc.tipo_otro || 'Otro'
  return TODOS_LOS_TIPOS.find((t) => t.value === doc.tipo_documento)?.label || doc.tipo_documento
}

function extensionDe(nombre) {
  return nombre.split('.').pop().toLowerCase()
}

// Íconos reales por tipo de archivo (PNG guardados por Okta en
// src/assets/doctypes/) — reemplaza la insignia de texto de la primera
// vuelta, pedido explícito de usar íconos de verdad en vez de la extensión
// escrita. Varias extensiones comparten el mismo ícono de familia (doc/docx
// → Word, xls/xlsx/xlsm → Excel, jpg/jpeg/png → imagen).
const ICONOS_POR_EXTENSION = {
  pdf: iconoPdf,
  doc: iconoWord,
  docx: iconoWord,
  xls: iconoExcel,
  xlsx: iconoExcel,
  xlsm: iconoExcel,
  txt: iconoTxt,
  jpg: iconoImagen,
  jpeg: iconoImagen,
  png: iconoImagen,
  xml: iconoXml,
  eml: iconoMail,
  svg: iconoSvg,
}

// Etiqueta corta, solo como respaldo si algún día aparece una extensión sin
// ícono mapeado (no debería pasar con las extensiones permitidas hoy).
const EXTENSION_LABEL = {
  pdf: 'PDF',
  doc: 'DOC',
  docx: 'DOCX',
  xls: 'XLS',
  xlsx: 'XLSX',
  xlsm: 'XLSM',
  txt: 'TXT',
  jpg: 'JPG',
  jpeg: 'JPG',
  png: 'PNG',
  xml: 'XML',
  eml: 'EML',
  svg: 'SVG',
}

function formatoFecha(iso) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function IconoSubir() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </svg>
  )
}

function IconoCamaraChica() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function IconoDescargar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 21h16" />
    </svg>
  )
}

function IconoQuitar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

// Ícono real por tipo de archivo — segunda vuelta: Okta pidió íconos de
// verdad en vez de la insignia de texto (PDF/XLSX/DOC...) de la primera.
// Respaldo de texto solo por si algún día llega una extensión sin ícono
// mapeado (no debería pasar con las extensiones permitidas hoy).
function IconoArchivo({ extension }) {
  const src = ICONOS_POR_EXTENSION[extension]
  if (src) {
    return <img src={src} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
  }
  const etiqueta = EXTENSION_LABEL[extension] || extension.slice(0, 4).toUpperCase()
  return (
    <span
      style={{
        fontSize: etiqueta.length > 3 ? 10 : 12,
        fontWeight: 500,
        letterSpacing: '0.02em',
        color: 'var(--ta-text)',
      }}
    >
      {etiqueta}
    </span>
  )
}

function IconoCandado() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function InputPinLocal({ value, onChange, autoFocus }) {
  return (
    <input
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={PIN_LARGO}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, PIN_LARGO))}
      placeholder="····"
      style={{
        width: '100%', height: 46, borderRadius: 10, border: '0.5px solid var(--ta-border)',
        background: '#FFFFFF', color: 'var(--ta-text)', fontSize: 22, letterSpacing: 8,
        textAlign: 'center', boxSizing: 'border-box',
      }}
    />
  )
}

// Flujo "olvidé mi PIN" — 3 pasos, todo en memoria del componente (el
// código de 6 dígitos JAMÁS toca la BD). Ver nota de cabecera del archivo
// para la justificación de usar mailto en vez de un servicio de correo.
function ModalOlvidoPin({ userId, userEmail, onCerrar, onPinRestablecido }) {
  const [paso, setPaso] = useState('inicio') // 'inicio' | 'codigo' | 'nuevoPin'
  const [codigoGenerado, setCodigoGenerado] = useState(null)
  const [expiraEn, setExpiraEn] = useState(null)
  const [codigoIngresado, setCodigoIngresado] = useState('')
  const [pinNuevo, setPinNuevo] = useState('')
  const [pinConfirmar, setPinConfirmar] = useState('')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const enviarCodigo = () => {
    const codigo = generarCodigo6()
    setCodigoGenerado(codigo)
    setExpiraEn(Date.now() + CODIGO_VIGENCIA_MS)
    setError(null)

    const asunto = 'Código de acceso a la Bóveda — TuAsesor'
    const cuerpo = `Tu código para restablecer el PIN de la Bóveda es: ${codigo}\n\nEste código vence en 10 minutos. Si tú no lo pediste, ignora este correo.`
    window.location.href = `mailto:${userEmail}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`

    setPaso('codigo')
  }

  const verificarCodigo = () => {
    setError(null)
    if (!codigoGenerado || Date.now() > expiraEn) {
      setError('El código venció. Pide uno nuevo.')
      return
    }
    if (codigoIngresado.trim() !== codigoGenerado) {
      setError('El código no coincide.')
      return
    }
    setPaso('nuevoPin')
  }

  const guardarNuevoPin = async () => {
    setError(null)
    if (pinNuevo.length !== PIN_LARGO) {
      setError(`El PIN debe tener ${PIN_LARGO} dígitos.`)
      return
    }
    if (pinNuevo !== pinConfirmar) {
      setError('Los dos PIN no coinciden.')
      return
    }

    setGuardando(true)
    const salt = generarSalt()
    const hash = await hashPin(pinNuevo, salt)

    const { error: saveError } = await supabase.from('perfiles').upsert({
      id: userId,
      boveda_pin_hash: hash,
      boveda_pin_salt: salt,
    })
    setGuardando(false)

    if (saveError) {
      setError('No se pudo guardar el nuevo PIN. Intenta de nuevo.')
      return
    }

    onPinRestablecido(hash, salt)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,40,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 16, boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--ta-surface)', borderRadius: 20, padding: 20, boxSizing: 'border-box' }}>
        <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: 'var(--ta-text)' }}>
          Olvidé mi PIN
        </p>

        {paso === 'inicio' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--ta-text)', margin: '0 0 16px' }}>
              Se abrirá un correo dirigido a <strong>{userEmail}</strong> con un código de verificación. Dale "Enviar" en tu app de correo y luego regresa aquí para escribirlo.
            </p>
            <button
              type="button"
              onClick={enviarCodigo}
              style={{ width: '100%', height: 44, borderRadius: 10, border: 'none', background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 8 }}
            >
              Enviar código a mi correo
            </button>
          </>
        )}

        {paso === 'codigo' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--ta-text)', margin: '0 0 10px' }}>
              Escribe el código de 6 dígitos que te llegó a {userEmail}:
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={codigoIngresado}
              onChange={(e) => setCodigoIngresado(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="······"
              style={{ width: '100%', height: 46, borderRadius: 10, border: '0.5px solid var(--ta-border)', background: '#FFFFFF', color: 'var(--ta-text)', fontSize: 20, letterSpacing: 6, textAlign: 'center', boxSizing: 'border-box', marginBottom: 10 }}
            />
            {error && <p style={{ color: '#993C1D', fontSize: 12, margin: '0 0 10px' }}>{error}</p>}
            <button
              type="button"
              onClick={verificarCodigo}
              style={{ width: '100%', height: 44, borderRadius: 10, border: 'none', background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 8 }}
            >
              Verificar código
            </button>
            <button
              type="button"
              onClick={enviarCodigo}
              style={{ width: '100%', height: 36, border: 'none', background: 'none', color: 'var(--ta-text-muted)', fontSize: 12, cursor: 'pointer' }}
            >
              Reenviar código
            </button>
          </>
        )}

        {paso === 'nuevoPin' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--ta-text)', margin: '0 0 10px' }}>
              Código verificado. Escribe tu nuevo PIN de 4 dígitos:
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--ta-text-muted)' }}>PIN nuevo</p>
                <InputPinLocal value={pinNuevo} onChange={setPinNuevo} autoFocus />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--ta-text-muted)' }}>Confirmar</p>
                <InputPinLocal value={pinConfirmar} onChange={setPinConfirmar} />
              </div>
            </div>
            {error && <p style={{ color: '#993C1D', fontSize: 12, margin: '0 0 10px' }}>{error}</p>}
            <button
              type="button"
              onClick={guardarNuevoPin}
              disabled={guardando}
              style={{ width: '100%', height: 44, borderRadius: 10, border: 'none', background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: guardando ? 0.6 : 1 }}
            >
              {guardando ? 'Guardando...' : 'Guardar y entrar'}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onCerrar}
          style={{ width: '100%', height: 36, border: 'none', background: 'none', color: 'var(--ta-text-muted)', fontSize: 12, cursor: 'pointer', marginTop: 4 }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// Pantalla de candado — se muestra en vez del contenido normal de la
// pestaña mientras no se desbloquee. El desbloqueo dura toda la sesión de
// la pestaña del navegador (sessionStorage), no hay que repetirlo por
// cada propiedad que se abra.
function GateBoveda({ pinHash, pinSalt, userId, userEmail, onDesbloqueado }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [verificando, setVerificando] = useState(false)
  const [mostrarOlvido, setMostrarOlvido] = useState(false)

  const intentar = async () => {
    setError(null)
    if (pin.length !== PIN_LARGO) {
      setError(`Escribe los ${PIN_LARGO} dígitos.`)
      return
    }
    setVerificando(true)
    const ok = await verificarPin(pin, pinSalt, pinHash)
    setVerificando(false)
    if (!ok) {
      setError('PIN incorrecto.')
      return
    }
    sessionStorage.setItem('ta_boveda_unlocked', 'true')
    onDesbloqueado()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 1rem', textAlign: 'center' }}>
      <div style={{ color: 'var(--ta-text-muted)', marginBottom: 10 }}>
        <IconoCandado />
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--ta-text)' }}>
        Escribe el PIN para ver los documentos de esta propiedad.
      </p>
      <div style={{ width: '100%', maxWidth: 220, marginBottom: 10 }}>
        <InputPinLocal value={pin} onChange={setPin} autoFocus />
      </div>
      {error && <p style={{ color: '#993C1D', fontSize: 12, margin: '0 0 10px' }}>{error}</p>}
      <button
        type="button"
        onClick={intentar}
        disabled={verificando}
        style={{ width: '100%', maxWidth: 220, height: 42, borderRadius: 10, border: 'none', background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: verificando ? 0.6 : 1, marginBottom: 10 }}
      >
        {verificando ? 'Verificando...' : 'Entrar'}
      </button>
      <button
        type="button"
        onClick={() => setMostrarOlvido(true)}
        style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', fontSize: 12, cursor: 'pointer' }}
      >
        Olvidé mi PIN
      </button>

      {mostrarOlvido && (
        <ModalOlvidoPin
          userId={userId}
          userEmail={userEmail}
          onCerrar={() => setMostrarOlvido(false)}
          onPinRestablecido={() => {
            sessionStorage.setItem('ta_boveda_unlocked', 'true')
            setMostrarOlvido(false)
            onDesbloqueado()
          }}
        />
      )}
    </div>
  )
}

export default function FichaDocumentos({ propiedadId }) {
  const [documentos, setDocumentos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [mostrarEscaner, setMostrarEscaner] = useState(false)
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null)
  const [tipoDocumento, setTipoDocumento] = useState(TIPOS[0].value)
  const [tipoOtro, setTipoOtro] = useState('')
  const [descripcion, setDescripcion] = useState('')

  // Candado de la Bóveda — ver nota de cabecera del archivo. cargandoGate
  // en true hasta resolver si hay PIN configurado; desbloqueada arranca
  // en false y solo se vuelve true si no hay PIN, o si sessionStorage ya
  // traía el desbloqueo de esta pestaña del navegador, o al verificar el
  // PIN correctamente en GateBoveda.
  const [usuario, setUsuario] = useState(null)
  const [bovedaPinHash, setBovedaPinHash] = useState(null)
  const [bovedaPinSalt, setBovedaPinSalt] = useState(null)
  const [cargandoGate, setCargandoGate] = useState(true)
  const [desbloqueada, setDesbloqueada] = useState(false)

  const inputRef = useRef(null)

  useEffect(() => {
    let activo = true
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user
      if (!user) return
      supabase
        .from('perfiles')
        .select('boveda_pin_hash, boveda_pin_salt')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data: perfil }) => {
          if (!activo) return
          setUsuario(user)
          const hash = perfil?.boveda_pin_hash || null
          setBovedaPinHash(hash)
          setBovedaPinSalt(perfil?.boveda_pin_salt || null)
          const yaDesbloqueada = !hash || sessionStorage.getItem('ta_boveda_unlocked') === 'true'
          setDesbloqueada(yaDesbloqueada)
          setCargandoGate(false)
        })
    })
    return () => { activo = false }
  }, [])

  const cargarDocumentos = useCallback(async () => {
    setCargando(true)
    const { data, error: dbError } = await supabase
      .from('documentos_propiedad')
      .select('id, storage_path, tipo_documento, tipo_otro, nombre_original, descripcion, created_at')
      .eq('propiedad_id', propiedadId)
      .order('created_at', { ascending: false })

    if (dbError) {
      console.error('Error cargando documentos:', dbError.message)
      setCargando(false)
      return
    }

    setDocumentos(data)
    setCargando(false)
  }, [propiedadId])

  useEffect(() => {
    if (propiedadId && desbloqueada) cargarDocumentos()
  }, [propiedadId, desbloqueada, cargarDocumentos])

  const resetForm = () => {
    setMostrarForm(false)
    setArchivoSeleccionado(null)
    setTipoDocumento(TIPOS[0].value)
    setTipoOtro('')
    setDescripcion('')
    setError(null)
  }

  const handleSeleccion = (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return

    const ext = extensionDe(file.name)
    if (!EXTENSION_MIME[ext]) {
      setError(`"${file.name}" no es un tipo de archivo permitido (PDF, Word, Excel, TXT, JPG, PNG, XML, EML o SVG).`)
      return
    }
    if (file.size > MAX_DOCUMENTO_MB * 1024 * 1024) {
      setError(`"${file.name}" pesa más de ${MAX_DOCUMENTO_MB} MB.`)
      return
    }

    setError(null)
    setArchivoSeleccionado(file)
  }

  const subirDocumento = async () => {
    if (!archivoSeleccionado) {
      setError('Selecciona un archivo primero.')
      return
    }
    if (tipoDocumento === 'otro' && !tipoOtro.trim()) {
      setError('Especifica el tipo de documento.')
      return
    }
    if (!descripcion.trim()) {
      setError('La descripción es obligatoria.')
      return
    }

    const ext = extensionDe(archivoSeleccionado.name)

    // Fricción deliberada, no bloqueo: las simulaciones de crédito de los
    // bancos vienen legítimamente en .xlsm (Excel con macros) — en vez de
    // rechazar el archivo, se pide confirmar que la fuente es de confianza.
    if (EXTENSIONES_CON_MACRO.has(ext)) {
      const ok = window.confirm(
        `"${archivoSeleccionado.name}" es un archivo con macros. Solo continúa si confías en quién te lo envió (banco, notaría, etc.).`
      )
      if (!ok) return
    }

    setSubiendo(true)
    setError(null)

    const nombreArchivo = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
    const storagePath = `${propiedadId}/${nombreArchivo}`

    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, archivoSeleccionado, { contentType: EXTENSION_MIME[ext] })

    if (storageError) {
      console.error('Error de storage:', storageError.message)
      setError(`Error al subir el archivo: ${storageError.message}`)
      setSubiendo(false)
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const { error: dbError } = await supabase.from('documentos_propiedad').insert({
      propiedad_id: propiedadId,
      storage_path: storagePath,
      tipo_documento: tipoDocumento,
      tipo_otro: tipoDocumento === 'otro' ? tipoOtro.trim() : null,
      nombre_original: archivoSeleccionado.name,
      descripcion: descripcion.trim(),
      user_id: userData.user.id,
    })

    setSubiendo(false)

    if (dbError) {
      console.error('Error guardando referencia:', dbError.message)
      setError(`Error al guardar el documento: ${dbError.message}`)
      // No se revierte el archivo ya subido a Storage — Nydia puede volver
      // a intentar el registro; huérfanos en el bucket no son un riesgo real
      // (privado, sin costo relevante al volumen de uso).
      return
    }

    resetForm()
    cargarDocumentos()
  }

  const descargarDocumento = async (doc) => {
    const { data, error: urlError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 60)

    if (urlError) {
      console.error('Error generando link de descarga:', urlError.message)
      setError('No se pudo generar el link de descarga.')
      return
    }

    window.open(data.signedUrl, '_blank')
  }

  const eliminarDocumento = async (doc) => {
    const ok = window.confirm(`¿Eliminar "${doc.nombre_original}"? Esta acción no se puede deshacer.`)
    if (!ok) return

    await supabase.storage.from(BUCKET).remove([doc.storage_path])
    const { error: dbError } = await supabase.from('documentos_propiedad').delete().eq('id', doc.id)

    if (dbError) {
      console.error('Error al eliminar documento:', dbError.message)
      return
    }

    setDocumentos((prev) => prev.filter((d) => d.id !== doc.id))
  }

  if (cargandoGate) {
    return <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ta-text-muted)', padding: '2rem 0' }}>Verificando acceso...</p>
  }

  if (!desbloqueada) {
    return (
      <GateBoveda
        pinHash={bovedaPinHash}
        pinSalt={bovedaPinSalt}
        userId={usuario?.id}
        userEmail={usuario?.email}
        onDesbloqueado={() => setDesbloqueada(true)}
      />
    )
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 10px' }}>
        Documentos ({documentos.length})
      </p>

      {!mostrarForm ? (
        <button
          type="button"
          onClick={() => setMostrarForm(true)}
          style={{
            width: '100%', height: 44, borderRadius: 10, border: 'none',
            background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 14, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: '1rem',
          }}
        >
          <IconoSubir /> Agregar documento
        </button>
      ) : (
        <div style={{ background: 'var(--ta-surface)', border: '0.5px solid var(--ta-border)', borderRadius: 12, padding: '0.9rem', marginBottom: '1rem' }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 500, color: 'var(--ta-text-muted)' }}>
            NUEVO DOCUMENTO
          </p>

          <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.txt,.jpg,.jpeg,.png,.xml,.eml,.svg" style={{ display: 'none' }} onChange={handleSeleccion} />

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{
                flex: 1, height: 40, borderRadius: 8,
                border: '1.5px dashed var(--ta-border)', background: 'none', color: 'var(--ta-text-muted)',
                fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 0,
              }}
            >
              <IconoSubir />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {archivoSeleccionado ? archivoSeleccionado.name : 'Elegir archivo...'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMostrarEscaner(true)}
              aria-label="Escanear documento"
              title="Escanear documento"
              style={{
                width: 44, height: 40, borderRadius: 8, flexShrink: 0,
                border: '1.5px dashed var(--ta-border)', background: 'none', color: 'var(--ta-text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IconoCamaraChica />
            </button>
          </div>

          <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--ta-text-muted)' }}>Tipo de documento</p>
          <select
            value={tipoDocumento}
            onChange={(e) => setTipoDocumento(e.target.value)}
            style={{
              width: '100%', height: 38, padding: '0 10px', borderRadius: 8,
              border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)',
              color: 'var(--ta-text)', fontSize: 13, marginBottom: 10,
            }}
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {tipoDocumento === 'otro' && (
            <input
              type="text"
              placeholder="Especifica el tipo..."
              value={tipoOtro}
              onChange={(e) => setTipoOtro(e.target.value)}
              style={{
                width: '100%', height: 34, padding: '0 10px', borderRadius: 8,
                border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)',
                fontSize: 13, marginBottom: 10,
              }}
            />
          )}

          <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--ta-text-muted)' }}>Descripción (máx. 30 caracteres)</p>
          <input
            type="text"
            placeholder="Ej. Falta firma, dice notaría"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={30}
            style={{
              width: '100%', height: 36, padding: '0 10px', borderRadius: 8,
              border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)',
              color: 'var(--ta-text)', fontSize: 13, marginBottom: 12, boxSizing: 'border-box',
            }}
          />

          {error && <p style={{ color: '#993C1D', fontSize: 12, margin: '0 0 10px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={resetForm}
              disabled={subiendo}
              style={{
                flex: 1, height: 40, borderRadius: 8, border: '0.5px solid var(--ta-border)',
                background: 'var(--ta-surface)', color: 'var(--ta-text)', fontSize: 13,
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={subirDocumento}
              disabled={subiendo}
              style={{
                flex: 2, height: 40, borderRadius: 8, border: 'none',
                background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 13, fontWeight: 500,
                opacity: subiendo ? 0.6 : 1,
              }}
            >
              {subiendo ? 'Subiendo...' : 'Subir documento'}
            </button>
          </div>
        </div>
      )}

      {cargando ? (
        <p style={{ fontSize: 13, color: 'var(--ta-text-muted)' }}>Cargando...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem' }}>
          {documentos.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--ta-text-muted)' }}>Sin documentos todavía.</p>
          )}

          {documentos.map((doc) => {
            const extension = extensionDe(doc.nombre_original)
            return (
              <div
                key={doc.id}
                style={{
                  background: 'var(--ta-surface)',
                  border: '0.5px solid var(--ta-border)',
                  borderRadius: 12,
                  padding: '0.75rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 44, height: 44, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <IconoArchivo extension={extension} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--ta-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {etiquetaTipo(doc)}{' '}
                    <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ta-text-muted)' }}>
                      · {formatoFecha(doc.created_at)}
                    </span>
                  </p>
                  {doc.descripcion && (
                    <p style={{
                      margin: '2px 0 0', fontSize: 12, color: 'var(--ta-text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {doc.descripcion}
                    </p>
                  )}
                  <p style={{
                    margin: '2px 0 0', fontSize: 11, color: 'var(--ta-text-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {doc.nombre_original}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => descargarDocumento(doc)}
                  aria-label={`Descargar ${doc.nombre_original}`}
                  style={{ width: 32, height: 32, flexShrink: 0, border: 'none', borderRadius: 8, background: 'var(--ta-bg)', color: 'var(--ta-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <IconoDescargar />
                </button>
                <button
                  type="button"
                  onClick={() => eliminarDocumento(doc)}
                  aria-label={`Eliminar ${doc.nombre_original}`}
                  style={{ width: 32, height: 32, flexShrink: 0, border: 'none', borderRadius: 8, background: 'var(--ta-bg)', color: 'var(--ta-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <IconoQuitar />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--ta-text-muted)', margin: '10px 0 0' }}>
        Máximo {MAX_DOCUMENTO_MB} MB por archivo. PDF, Word, Excel, TXT, JPG, PNG, XML, EML o SVG.
      </p>

      {mostrarEscaner && (
        <EscanearDocumento
          onCerrar={() => setMostrarEscaner(false)}
          onEscaneado={(file) => {
            setArchivoSeleccionado(file)
            setMostrarEscaner(false)
          }}
        />
      )}
    </div>
  )
}
