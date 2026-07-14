// src/features/contactos/ImportarContactos.jsx
// Motivo: Nydia ya tiene ~1000 contactos capturados fuera de TuAsesor —
//   pedido explícito de Okta (Sesión 11): importar desde CSV (exportable
//   de Google Contacts) o vCard/.vcf (exportable directo del Contactos
//   del celular). Se decidió soportar ambos.
//   Parser de CSV propio (RFC4180 básico: comillas, comas y saltos de
//   línea dentro de campos) en vez de agregar una dependencia nueva —
//   el proyecto no tiene ninguna librería de terceros para esto todavía
//   y el formato es simple de cubrir a mano con casos de prueba reales.
//   Parser de vCard también propio — formato de texto plano simple
//   (BEGIN/END:VCARD, FN/N/TEL/EMAIL/ORG), con "unfolding" de líneas
//   continuadas por si el export las envuelve.
//   CSV no tiene columnas fijas conocidas (Google Contacts exporta
//   decenas) — se muestra un paso de mapeo con auto-detección por
//   nombre de columna antes de la vista previa. vCard sí tiene campos
//   estándar, no necesita mapeo.
//   Deduplicación: por teléfono normalizado (solo dígitos) contra
//   `contacto_telefonos` ya existente del usuario — si CUALQUIER
//   teléfono del contacto a importar ya existe, se omite esa fila
//   completa (se asume que ya está en el sistema). Limitación conocida:
//   no deduplica contra otras filas del mismo archivo si vienen
//   repetidas — aceptable para un import ocasional, no un pipeline
//   recurrente (YAGNI).
//   Import secuencial (no bulk) — más lento para 1000 filas, pero cada
//   contacto + sus teléfonos quedan ligados sin depender de que Supabase
//   preserve el orden de un insert masivo.
//   [Actualización 2026-07-13, 22:56 hrs]: se agrega "Rol principal" al
//   paso de mapeo de CSV — Nydia va a asignar rol_principal a sus ~1000
//   contactos desde Excel antes de exportar a CSV, así que el import debe
//   poder tomar esa columna directo en vez de requerir edición manual
//   contacto por contacto después. rol_principal es texto libre (sin
//   enum en la tabla `contactos`), igual que en ContactoForm.jsx, así que
//   no hay validación de valores — se guarda tal cual venga la celda.
//   auto-detección de columna añadida (rol/role/puesto/cargo/title) y
//   soporte del campo ROLE en vCard como bono, aunque el caso principal
//   pedido es CSV desde Excel.
// Timestamp: 2026-07-13, 22:56 hrs

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const CAMPOS_MAPEO = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'empresa', label: 'Empresa' },
  { key: 'correo', label: 'Correo' },
  { key: 'rol', label: 'Rol principal' },
]

function soloDigitos(texto) {
  return (texto || '').replace(/\D/g, '')
}

// Parser CSV RFC4180 básico: comillas dobles, comas y saltos de línea
// dentro de campos citados, comillas escapadas como "".
function parseCSV(texto) {
  const filas = []
  let fila = []
  let campo = ''
  let dentroComillas = false
  let i = 0
  const largo = texto.length

  while (i < largo) {
    const c = texto[i]
    if (dentroComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i += 2; continue }
        dentroComillas = false; i++; continue
      }
      campo += c; i++; continue
    }
    if (c === '"') { dentroComillas = true; i++; continue }
    if (c === ',') { fila.push(campo); campo = ''; i++; continue }
    if (c === '\r') { i++; continue }
    if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; i++; continue }
    campo += c; i++
  }
  if (campo !== '' || fila.length > 0) { fila.push(campo); filas.push(fila) }

  const filasNoVacias = filas.filter((f) => f.length > 1 || (f.length === 1 && f[0].trim() !== ''))
  const [headers, ...resto] = filasNoVacias
  return { headers: headers || [], filas: resto }
}

// Parser vCard 2.1/3.0 básico: BEGIN/END:VCARD, unfolding de líneas
// continuadas (empiezan con espacio/tab), FN/N para nombre, TEL
// (puede repetirse), EMAIL, ORG.
function parseVCard(texto) {
  const lineasCrudas = texto.split(/\r\n|\r|\n/)
  const lineas = []
  for (const linea of lineasCrudas) {
    if ((linea.startsWith(' ') || linea.startsWith('\t')) && lineas.length > 0) {
      lineas[lineas.length - 1] += linea.slice(1)
    } else {
      lineas.push(linea)
    }
  }

  const contactos = []
  let actual = null
  for (const linea of lineas) {
    const l = linea.trim()
    if (!l) continue
    if (/^BEGIN:VCARD$/i.test(l)) { actual = { nombre: null, telefonos: [], correo: null, empresa: null, rol: null }; continue }
    if (/^END:VCARD$/i.test(l)) { if (actual) contactos.push(actual); actual = null; continue }
    if (!actual) continue

    const idx = l.indexOf(':')
    if (idx === -1) continue
    const clave = l.slice(0, idx).split(';')[0].toUpperCase()
    const valor = l.slice(idx + 1).trim()
    if (!valor) continue

    if (clave === 'FN') {
      actual.nombre = valor
    } else if (clave === 'N' && !actual.nombre) {
      const partes = valor.split(';')
      const compuesto = [partes[1], partes[0]].filter(Boolean).join(' ').trim()
      if (compuesto) actual.nombre = compuesto
    } else if (clave === 'TEL') {
      actual.telefonos.push(valor)
    } else if (clave === 'EMAIL' && !actual.correo) {
      actual.correo = valor
    } else if (clave === 'ORG' && !actual.empresa) {
      actual.empresa = valor.split(';')[0]
    } else if (clave === 'ROLE' && !actual.rol) {
      actual.rol = valor
    }
  }
  return contactos
}

function autoDetectarMapeo(headers) {
  const buscar = (candidatos) => headers.findIndex((h) => candidatos.some((c) => h.toLowerCase().includes(c)))
  return {
    nombre: buscar(['name', 'nombre']),
    telefono: buscar(['phone', 'tel', 'celular', 'móvil', 'movil']),
    empresa: buscar(['company', 'empresa', 'organization', 'organización']),
    correo: buscar(['email', 'correo', 'e-mail']),
    rol: buscar(['rol', 'role', 'puesto', 'cargo', 'title']),
  }
}

function IconoX() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M18 6 6 18" /><path d="M6 6l12 12" />
    </svg>
  )
}

const estiloOverlay = { position: 'fixed', inset: 0, background: 'rgba(42,42,40,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16, boxSizing: 'border-box' }
const estiloCard = { width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', background: 'var(--ta-surface)', borderRadius: 20, padding: 16, boxSizing: 'border-box' }
const estiloSelect = { width: '100%', height: 38, borderRadius: 10, border: '0.5px solid var(--ta-border)', background: 'var(--ta-surface)', color: 'var(--ta-text)', fontSize: 13, padding: '0 8px', boxSizing: 'border-box' }
const estiloBotonPrimario = { width: '100%', height: 44, borderRadius: 10, border: 'none', background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }
const estiloBotonSecundario = { width: '100%', height: 40, borderRadius: 10, border: '0.5px solid var(--ta-border)', background: 'none', color: 'var(--ta-text)', fontSize: 13, cursor: 'pointer', marginTop: 8 }

export default function ImportarContactos({ onCerrar, onImportado }) {
  const [paso, setPaso] = useState('archivo') // 'archivo' | 'mapeo' | 'preview' | 'importando' | 'resultado'
  const [csvHeaders, setCsvHeaders] = useState([])
  const [csvFilas, setCsvFilas] = useState([])
  const [mapeo, setMapeo] = useState({ nombre: -1, telefono: -1, empresa: -1, correo: -1, rol: -1 })
  const [candidatos, setCandidatos] = useState([])
  const [progreso, setProgreso] = useState({ hecho: 0, total: 0 })
  const [resultado, setResultado] = useState(null)
  const [errorGlobal, setErrorGlobal] = useState(null)

  const prepararPreview = async (lista) => {
    setErrorGlobal(null)
    const validos = lista.filter((c) => c.nombre?.trim() || c.telefonos.length > 0)

    if (validos.length === 0) {
      setErrorGlobal('No se encontró ningún contacto con nombre o teléfono en el archivo.')
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id
    const { data: telefonosExistentes, error: fetchError } = await supabase
      .from('contacto_telefonos')
      .select('telefono')
      .eq('user_id', userId)

    if (fetchError) {
      setErrorGlobal(`No se pudo verificar contactos existentes: ${fetchError.message}`)
      return
    }

    const existentesSet = new Set((telefonosExistentes || []).map((t) => soloDigitos(t.telefono)).filter(Boolean))

    const conFlag = validos.map((c) => ({
      ...c,
      duplicado: c.telefonos.some((t) => existentesSet.has(soloDigitos(t))),
    }))
    setCandidatos(conFlag)
    setPaso('preview')
  }

  const onArchivo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorGlobal(null)
    const texto = await file.text()
    const pareceVCard = /\.vcf$|\.vcard$/i.test(file.name) || /BEGIN:VCARD/i.test(texto.slice(0, 300))

    if (pareceVCard) {
      const contactosVCard = parseVCard(texto)
      if (contactosVCard.length === 0) {
        setErrorGlobal('No se encontraron tarjetas VCARD en este archivo.')
        return
      }
      prepararPreview(contactosVCard.map((c) => ({ nombre: c.nombre, telefonos: c.telefonos, empresa: c.empresa, correo: c.correo, rol: c.rol })))
    } else {
      const { headers, filas } = parseCSV(texto)
      if (headers.length === 0 || filas.length === 0) {
        setErrorGlobal('No se pudo leer el CSV — revisa que tenga encabezados y al menos una fila de datos.')
        return
      }
      setCsvHeaders(headers)
      setCsvFilas(filas)
      setMapeo(autoDetectarMapeo(headers))
      setPaso('mapeo')
    }
  }

  const confirmarMapeo = () => {
    if (mapeo.nombre === -1 && mapeo.telefono === -1) {
      setErrorGlobal('Elige al menos una columna de Nombre o Teléfono para continuar.')
      return
    }
    const lista = csvFilas.map((fila) => ({
      nombre: mapeo.nombre >= 0 ? (fila[mapeo.nombre] || '').trim() || null : null,
      telefonos: mapeo.telefono >= 0 && (fila[mapeo.telefono] || '').trim() ? [fila[mapeo.telefono].trim()] : [],
      empresa: mapeo.empresa >= 0 ? (fila[mapeo.empresa] || '').trim() || null : null,
      correo: mapeo.correo >= 0 ? (fila[mapeo.correo] || '').trim() || null : null,
      rol: mapeo.rol >= 0 ? (fila[mapeo.rol] || '').trim() || null : null,
    }))
    prepararPreview(lista)
  }

  const importar = async () => {
    setPaso('importando')
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user.id
    const porImportar = candidatos.filter((c) => !c.duplicado)
    setProgreso({ hecho: 0, total: porImportar.length })

    let importados = 0
    for (const c of porImportar) {
      const { data: nuevoContacto, error: errC } = await supabase
        .from('contactos')
        .insert({ nombre: c.nombre || null, empresa: c.empresa || null, correo: c.correo || null, rol_principal: c.rol || null, user_id: userId })
        .select()
        .single()

      if (!errC && nuevoContacto) {
        for (let idx = 0; idx < c.telefonos.length; idx++) {
          await supabase.from('contacto_telefonos').insert({
            contacto_id: nuevoContacto.id,
            telefono: c.telefonos[idx],
            es_principal: idx === 0,
            user_id: userId,
          })
        }
        importados++
      }
      setProgreso((p) => ({ ...p, hecho: p.hecho + 1 }))
    }

    setResultado({ importados, omitidosDuplicado: candidatos.length - porImportar.length })
    setPaso('resultado')
  }

  const encabezado = (titulo, mostrarCerrar = true) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      {mostrarCerrar ? (
        <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, borderRadius: 8 }}>
          <IconoX />
        </button>
      ) : <span style={{ width: 44 }} />}
      <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--ta-text)' }}>{titulo}</span>
      <span style={{ width: 44 }} />
    </div>
  )

  return (
    <div style={estiloOverlay}>
      <div style={estiloCard}>

        {paso === 'archivo' && (
          <>
            {encabezado('Importar contactos')}
            <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', margin: '0 0 14px' }}>
              Sube un archivo CSV (exportado de Excel/Google Sheets o de Google
              Contacts) o vCard/.vcf (exportado directo del Contactos de tu
              celular). Si tu Excel tiene una columna de rol (ej. "Rol",
              "Puesto"), en el siguiente paso podrás asignarla a cada contacto.
            </p>
            <input
              type="file"
              accept=".csv,.vcf,.vcard,text/csv"
              onChange={onArchivo}
              style={{ width: '100%', fontSize: 13, color: 'var(--ta-text)' }}
            />
            {errorGlobal && <p style={{ color: '#993C1D', fontSize: 13, marginTop: 12 }}>{errorGlobal}</p>}
          </>
        )}

        {paso === 'mapeo' && (
          <>
            {encabezado('¿Qué columna es cuál?')}
            <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 14px' }}>
              {csvFilas.length} filas detectadas. Elige qué columna del CSV corresponde a cada campo.
            </p>
            {CAMPOS_MAPEO.map((campo) => (
              <div key={campo.key} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 4px' }}>{campo.label}</p>
                <select
                  value={mapeo[campo.key]}
                  onChange={(e) => setMapeo((prev) => ({ ...prev, [campo.key]: Number(e.target.value) }))}
                  style={estiloSelect}
                >
                  <option value={-1}>No importar</option>
                  {csvHeaders.map((h, idx) => (
                    <option key={idx} value={idx}>{h || `Columna ${idx + 1}`}</option>
                  ))}
                </select>
              </div>
            ))}
            {errorGlobal && <p style={{ color: '#993C1D', fontSize: 13, marginTop: 4 }}>{errorGlobal}</p>}
            <button type="button" onClick={confirmarMapeo} style={{ ...estiloBotonPrimario, marginTop: 10 }}>
              Continuar
            </button>
            <button type="button" onClick={() => setPaso('archivo')} style={estiloBotonSecundario}>
              Elegir otro archivo
            </button>
          </>
        )}

        {paso === 'preview' && (
          <>
            {encabezado('Vista previa')}
            <p style={{ fontSize: 13, color: 'var(--ta-text)', margin: '0 0 4px' }}>
              {candidatos.length} contacto{candidatos.length === 1 ? '' : 's'} en el archivo.
            </p>
            <p style={{ fontSize: 12, color: 'var(--ta-text-muted)', margin: '0 0 14px' }}>
              {candidatos.filter((c) => !c.duplicado).length} nuevo{candidatos.filter((c) => !c.duplicado).length === 1 ? '' : 's'}, {candidatos.filter((c) => c.duplicado).length} ya existen (mismo teléfono) y se omiten.
            </p>
            <div style={{ border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden', maxHeight: 260, overflowY: 'auto', marginBottom: 12 }}>
              {candidatos.slice(0, 60).map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 10px', borderTop: idx === 0 ? 'none' : '0.5px solid var(--ta-border)',
                    opacity: c.duplicado ? 0.5 : 1,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ta-text)' }}>
                    {c.nombre || 'Sin nombre'} {c.duplicado && <span style={{ fontSize: 10, color: 'var(--ta-text-muted)' }}>· ya existe</span>}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ta-text-muted)' }}>
                    {c.telefonos.join(', ') || 'Sin teléfono'}{c.empresa ? ` · ${c.empresa}` : ''}{c.rol ? ` · ${c.rol}` : ''}
                  </p>
                </div>
              ))}
              {candidatos.length > 60 && (
                <p style={{ margin: 0, padding: '8px 10px', fontSize: 11, color: 'var(--ta-text-muted)' }}>
                  y {candidatos.length - 60} más...
                </p>
              )}
            </div>
            {errorGlobal && <p style={{ color: '#993C1D', fontSize: 13, marginBottom: 10 }}>{errorGlobal}</p>}
            <button
              type="button"
              onClick={importar}
              disabled={candidatos.filter((c) => !c.duplicado).length === 0}
              style={{ ...estiloBotonPrimario, opacity: candidatos.filter((c) => !c.duplicado).length === 0 ? 0.5 : 1 }}
            >
              Importar {candidatos.filter((c) => !c.duplicado).length} contactos
            </button>
            <button type="button" onClick={() => setPaso('archivo')} style={estiloBotonSecundario}>
              Cancelar
            </button>
          </>
        )}

        {paso === 'importando' && (
          <>
            {encabezado('Importando...', false)}
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ta-text-muted)', margin: '20px 0 10px' }}>
              {progreso.hecho} de {progreso.total}
            </p>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--ta-bg)', overflow: 'hidden' }}>
              <div style={{
                height: