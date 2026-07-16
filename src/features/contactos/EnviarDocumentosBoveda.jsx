// src/features/contactos/EnviarDocumentosBoveda.jsx
// Motivo: FEAT — pedido de Nydia (vía Okta): mandar correo a un contacto
//   interesado con documentos de la Bóveda de una propiedad (bucket
//   privado bucket-propiedad-vault, tabla documentos_propiedad, misma
//   infraestructura que FichaDocumentos.jsx). Flujo: 1) confirma/edita el
//   correo del contacto (mismo campo `correo` de tuasesor.contactos, el
//   guardado real lo hace ContactoForm.jsx vía su hook useContacto — este
//   modal solo dispara el callback); 2) checkbox opcional "Incluir
//   documentos de una propiedad"; 3) si se marca, buscador compacto de
//   propiedad (mismo patrón que BuscadorPropiedad en
//   InteraccionForm.jsx, duplicado aquí a propósito — componentes locales
//   por archivo); 4) al elegir propiedad, checklist de sus documentos
//   (default: ninguno marcado — son documentos privados, mejor que ella
//   elija a propósito cada uno en vez de un "seleccionar todo" accidental).
//   Al enviar: se genera un signed URL de 24 horas (decisión de Okta,
//   2026-07-13) por documento marcado y se arma un mailto: con esos links
//   en el cuerpo — NO son adjuntos reales (mailto no lo permite), son
//   links de descarga con vigencia. Mismo patrón mailto que ya usa el
//   resto de la app (ícono de correo en ContactoForm/FichaColaboradores):
//   cero servicio nuevo, cero costo, cero backend propio. Si el cuerpo del
//   correo queda muy largo (límite práctico de las URLs mailto: en varios
//   clientes, ~2000 caracteres), se avisa para que mande menos documentos
//   por correo en vez de fallar en silencio al abrir el cliente de correo.
// Timestamp: 2026-07-13, 23:55 hrs

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

const BUCKET = 'bucket-propiedad-vault'
const VIGENCIA_LINK_SEGUNDOS = 24 * 60 * 60 // 24 horas
const LARGO_MAILTO_SEGURO = 1800

const TODOS_LOS_TIPOS_LABEL = {
  identificacion: 'Identificación oficial',
  escritura: 'Escritura / Título de propiedad',
  antecedentes_registrales: 'Historial o antecedentes registrales',
  libertad_gravamen: 'Certificado de libertad de gravamen',
  uso_suelo: 'Certificado de zonificación y uso de suelo',
  planos: 'Planos arquitectónicos',
  regimen_condominio: 'Régimen de condominio',
  boleta_predial: 'Boleta predial',
  recibos_servicios: 'Recibos de servicios',
  no_adeudo_mantenimiento: 'Carta de no adeudo de mantenimiento',
  avaluo: 'Avalúo comercial',
  simulacion_credito: 'Simulación de crédito / financiamiento',
  ficha_exportada: 'Ficha exportada',
  otro: 'Otro',
}

function etiquetaTipo(doc) {
  if (doc.tipo_documento === 'otro') return doc.tipo_otro || 'Otro'
  return TODOS_LOS_TIPOS_LABEL[doc.tipo_documento] || doc.tipo_documento
}

function IconoX() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M18 6 6 18" /><path d="M6 6l12 12" />
    </svg>
  )
}

function IconoBuscar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  )
}

// Buscador compacto de propiedad — mismo patrón que BuscadorPropiedad en
// InteraccionForm.jsx (debounce 300ms, búsqueda por título, hasta 8
// resultados), duplicado aquí a propósito, misma convención del proyecto.
function BuscadorPropiedadCompacto({ propiedadElegida, onSeleccionar, onQuitar }) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    if (!texto.trim()) { setResultados([]); return }
    setBuscando(true)
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('propiedades')
        .select('id, titulo')
        .ilike('titulo', `%${texto.trim()}%`)
        .limit(8)
      setResultados(data || [])
      setBuscando(false)
    }, 300)
    return () => clearTimeout(t)
  }, [texto])

  if (propiedadElegida) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--ta-bg)', borderRadius: 10, padding: '8px 10px' }}>
        <span style={{ fontSize: 14, color: 'var(--ta-text)', flex: 1 }}>{propiedadElegida.titulo || 'Sin título'}</span>
        <button type="button" onClick={onQuitar} aria-label="Quitar propiedad" style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, minHeight: 32, borderRadius: 8, flexShrink: 0 }}>
          <IconoX />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '0.5px dashed var(--ta-border)', borderRadius: 10, padding: '9px 10px' }}>
        <IconoBuscar />
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar propiedad..."
          style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14, color: 'var(--ta-text)' }}
        />
      </div>
      {texto.trim() && (
        <div style={{ marginTop: 6, border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden' }}>
          {buscando ? (
            <p style={{ margin: 0, padding: 10, fontSize: 12, color: 'var(--ta-text-muted)' }}>Buscando...</p>
          ) : resultados.length > 0 ? (
            resultados.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => { onSeleccionar(p); setTexto('') }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSeleccionar(p); setTexto('') } }}
                style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 13, color: 'var(--ta-text)', minHeight: 40, boxSizing: 'border-box', display: 'flex', alignItems: 'center', borderTop: idx === 0 ? 'none' : '0.5px solid var(--ta-border)' }}
              >
                {p.titulo || 'Sin título'}
              </div>
            ))
          ) : (
            <p style={{ margin: 0, padding: 10, fontSize: 12, color: 'var(--ta-text-muted)' }}>Sin resultados.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function EnviarDocumentosBoveda({ contacto, onCerrar, onActualizarCorreo }) {
  const [correo, setCorreo] = useState(contacto?.correo || '')
  const [incluirDocs, setIncluirDocs] = useState(false)
  const [propiedadElegida, setPropiedadElegida] = useState(null)
  const [documentos, setDocumentos] = useState([])
  const [cargandoDocs, setCargandoDocs] = useState(false)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setCorreo(contacto?.correo || '')
  }, [contacto?.correo])

  useEffect(() => {
    if (!propiedadElegida) { setDocumentos([]); setSeleccionados(new Set()); return }
    setCargandoDocs(true)
    supabase
      .from('documentos_propiedad')
      .select('id, storage_path, tipo_documento, tipo_otro, nombre_original, descripcion, created_at')
      .eq('propiedad_id', propiedadElegida.id)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(`No se pudieron cargar los documentos: ${fetchError.message}`)
        } else {
          setDocumentos(data || [])
        }
        setSeleccionados(new Set())
        setCargandoDocs(false)
      })
  }, [propiedadElegida])

  const confirmarCorreo = () => {
    const limpio = correo.trim()
    if (limpio !== (contacto?.correo || '').trim()) {
      onActualizarCorreo?.(limpio || null)
    }
  }

  const alternarDoc = (id) => {
    setSeleccionados((prev) => {
      const copia = new Set(prev)
      if (copia.has(id)) copia.delete(id)
      else copia.add(id)
      return copia
    })
  }

  const seleccionarTodos = () => setSeleccionados(new Set(documentos.map((d) => d.id)))
  const quitarSeleccion = () => setSeleccionados(new Set())

  const largoEstimado = seleccionados.size * 220 // aprox. por link + etiqueta
  const cuerpoLargo = largoEstimado > LARGO_MAILTO_SEGURO

  const enviarCorreo = async () => {
    setError(null)
    const destino = correo.trim()
    if (!destino) {
      setError('Escribe un correo para el contacto.')
      return
    }

    setGenerando(true)

    const docsElegidos = documentos.filter((d) => seleccionados.has(d.id))
    const lineas = []

    for (const doc of docsElegidos) {
      const { data, error: urlError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, VIGENCIA_LINK_SEGUNDOS)

      if (urlError) {
        setError(`No se pudo generar el link de "${doc.nombre_original}": ${urlError.message}`)
        setGenerando(false)
        return
      }
      lineas.push(`${etiquetaTipo(doc)}${doc.descripcion ? ` (${doc.descripcion})` : ''}: ${data.signedUrl}`)
    }

    const asunto = incluirDocs && propiedadElegida
      ? `Documentos — ${propiedadElegida.titulo || 'propiedad'}`
      : 'Información — TuAsesor'

    const partesCuerpo = [`Hola ${contacto?.nombre || ''},`.trim(), '']
    if (lineas.length > 0) {
      partesCuerpo.push('Aquí tienes los documentos (los links vencen en 24 horas):', '', ...lineas, '')
    }
    partesCuerpo.push('Saludos.')

    const mailtoUrl = `mailto:${destino}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(partesCuerpo.join('\n'))}`

    setGenerando(false)
    window.location.href = mailtoUrl
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,42,40,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 65, padding: 16, boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', background: 'var(--ta-surface)', borderRadius: 20, padding: 16, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ border: 'none', background: 'none', color: 'var(--ta-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, borderRadius: 8 }}>
            <IconoX />
          </button>
          <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--ta-text)' }}>Enviar documentos</span>
          <span style={{ width: 44 }} />
        </div>

        <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--ta-text-muted)' }}>Correo del contacto</p>
        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          onBlur={confirmarCorreo}
          placeholder="correo@ejemplo.com"
          style={{
            width: '100%', height: 40, borderRadius: 10, border: '0.5px solid var(--ta-border)',
            background: 'var(--ta-surface)', color: 'var(--ta-text)', padding: '0 12px',
            fontSize: 13, boxSizing: 'border-box', marginBottom: 16,
          }}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={incluirDocs}
            onChange={(e) => { setIncluirDocs(e.target.checked); if (!e.target.checked) { setPropiedadElegida(null) } }}
            style={{ width: 18, height: 18 }}
          />
          <span style={{ fontSize: 13, color: 'var(--ta-text)' }}>Incluir documentos de una propiedad</span>
        </label>

        {incluirDocs && (
          <>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--ta-text-muted)' }}>Propiedad</p>
            <div style={{ marginBottom: 14 }}>
              <BuscadorPropiedadCompacto
                propiedadElegida={propiedadElegida}
                onSeleccionar={setPropiedadElegida}
                onQuitar={() => setPropiedadElegida(null)}
              />
            </div>

            {propiedadElegida && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--ta-text-muted)' }}>
                    Documentos de la bóveda ({documentos.length})
                  </p>
                  {documentos.length > 0 && (
                    <button
                      type="button"
                      onClick={seleccionados.size === documentos.length ? quitarSeleccion : seleccionarTodos}
                      style={{ border: 'none', background: 'none', color: 'var(--ta-accent)', fontSize: 11, cursor: 'pointer', padding: 0 }}
                    >
                      {seleccionados.size === documentos.length ? 'Ninguno' : 'Seleccionar todos'}
                    </button>
                  )}
                </div>

                {cargandoDocs ? (
                  <p style={{ fontSize: 13, color: 'var(--ta-text-muted)' }}>Cargando...</p>
                ) : documentos.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--ta-text-muted)', marginBottom: 10 }}>Esta propiedad no tiene documentos en la bóveda.</p>
                ) : (
                  <div style={{ border: '0.5px solid var(--ta-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                    {documentos.map((doc, idx) => (
                      <label
                        key={doc.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', cursor: 'pointer',
                          borderTop: idx === 0 ? 'none' : '0.5px solid var(--ta-border)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={seleccionados.has(doc.id)}
                          onChange={() => alternarDoc(doc.id)}
                          style={{ width: 18, height: 18, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--ta-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {etiquetaTipo(doc)}
                          </p>
                          {doc.descripcion && (
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ta-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.descripcion}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {cuerpoLargo && (
                  <p style={{ fontSize: 11, color: '#993C1D', margin: '0 0 10px' }}>
                    Seleccionaste muchos documentos — el correo podría no abrirse bien en algunos clientes. Considera mandar menos por correo.
                  </p>
                )}
              </>
            )}
          </>
        )}

        {error && <p style={{ color: '#993C1D', fontSize: 13, margin: '10px 0' }}>{error}</p>}

        <button
          type="button"
          onClick={enviarCorreo}
          disabled={generando}
          style={{
            width: '100%', height: 44, borderRadius: 10, border: 'none', marginTop: 6,
            background: 'var(--ta-accent)', color: 'var(--ta-on-accent)', fontSize: 14, fontWeight: 500,
            cursor: generando ? 'default' : 'pointer', opacity: generando ? 0.6 : 1,
          }}
        >
          {generando ? 'Generando links...' : 'Abrir correo'}
        </button>

        {/* Aviso sobre la limitación real de mailto: — decisión explícita de
            Okta (Sesión 13): se queda con mailto (cero costo/infra), pero se
            avisa por qué el remitente puede no verse como el correo de
            negocio de Nydia — es la app de correo predeterminada del
            dispositivo la que decide el "De:", no esta pantalla. */}
        <p style={{ fontSize: 10, color: 'var(--ta-text-muted)', textAlign: 'center', marginTop: 8 }}>
          Esto abre tu app de correo predeterminada — el remitente ("De:") es
          la cuenta configurada ahí, no algo que TuAsesor pueda cambiar.
        </p>
      </div>
    </div>
  )
}
