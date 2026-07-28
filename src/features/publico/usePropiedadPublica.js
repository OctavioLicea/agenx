// src/features/publico/usePropiedadPublica.js
// Motivo: FEAT — 17 jul 2026, parte 1 del sistema de temas de la página
//   pública. Todo el fetch a Supabase, formateo y lógica derivada que
//   antes vivía adentro de PropiedadPublica.jsx se saca a este hook
//   compartido, para que CUALQUIER tema (Estándar, Elegance, los que
//   vengan) lo use sin volver a tocar las vistas públicas por su cuenta.
//   Ningún componente de tema debe importar `supabase` directamente —
//   la seguridad (vistas `*_publicas` filtradas por `publicado=true`,
//   sin campos sensibles) vive en un solo lugar.
// Timestamp: 2026-07-17

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export const TIPOS_LABEL = { casa: 'Casa', depto: 'Departamento', terreno: 'Terreno', local: 'Local comercial', otro: 'Otro' }
export const OPERACION_LABEL = { venta: 'Venta', renta: 'Renta' }
export const ZONA_LABEL = { saltillo: 'Saltillo', arteaga: 'Arteaga', ramos_arizpe: 'Ramos Arizpe' }

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

export function tieneValor(v) {
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

// estilo_pagina_publica todavía no existe como columna en `perfiles_publicos`
// (pendiente, ver docs/BACKLOG.md — "Migración Supabase: columna
// estilo_pagina_publica"). Mientras tanto perfil.estilo_pagina_publica
// llega undefined y el registro de temas cae al default ("estandar") sin
// romper nada.

export function usePropiedadPublica(id) {
  const [estado, setEstado] = useState('cargando')
  const [propiedad, setPropiedad] = useState(null)
  const [fotos, setFotos] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [plano, setPlano] = useState(null)
  const [compartido, setCompartido] = useState(false)

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      const { data: propData, error: propError } = await supabase
        .from('propiedades_publicas')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (cancelado) return
      if (propError || !propData) {
        setEstado('no_encontrada')
        return
      }
      setPropiedad(propData)

      const [{ data: fotosData }, { data: perfilData }, { data: planoData }] = await Promise.all([
        supabase
          .from('fotos_propiedad_publicas')
          .select('storage_path, orden, es_portada')
          .eq('propiedad_id', id)
          .order('es_portada', { ascending: false })
          .order('orden', { ascending: true }),
        supabase
          .from('perfiles_publicos')
          .select('nombre_comercial, nombre_corto, logo_url, color_acento, telefonos, estilo_pagina_publica, correo_publico')
          .eq('id', propData.user_id)
          .maybeSingle(),
        // 27 jul 2026 — plano arquitectónico publicado. La vista
        // `planos_publicos` ya filtra por propiedad publicada + documento
        // marcado como publicado + tipo 'planos', y NUNCA expone
        // `storage_path` (la ruta del original dentro del vault privado):
        // solo `publico_storage_path`, que apunta a la copia en el bucket
        // público. Si Nydia no publicó nada, esto viene vacío y ningún
        // tema pinta la sección.
        supabase
          .from('planos_publicos')
          .select('publico_storage_path, nombre_original, descripcion')
          .eq('propiedad_id', id)
          .order('nombre_original', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ])

      if (cancelado) return
      setFotos(
        (fotosData || []).map((f) => ({
          ...f,
          url: supabase.storage.from('bucket-propiedad-media').getPublicUrl(f.storage_path).data.publicUrl,
        }))
      )
      setPerfil(perfilData)
      setPlano(
        planoData?.publico_storage_path
          ? {
              url: supabase.storage.from('bucket-propiedad-media').getPublicUrl(planoData.publico_storage_path).data.publicUrl,
              nombre: planoData.nombre_original,
              descripcion: planoData.descripcion,
              // Un PDF no se puede mostrar en un modal de forma confiable
              // en celular (iOS sobre todo: el iframe no hace scroll o no
              // renderiza), así que cada tema abre los PDF en pestaña
              // nueva y reserva el modal para las imágenes. Decisión de
              // Okta, 27 jul.
              esPdf: /\.pdf$/i.test(planoData.nombre_original || ''),
            }
          : null
      )
      setEstado('ok')
    }
    cargar()
    return () => { cancelado = true }
  }, [id])

  const acento = perfil?.color_acento || '#1F3A2C'
  const marcaTexto = perfil?.nombre_comercial || perfil?.nombre_corto
  const telefonoPrincipal = (perfil?.telefonos || [])[0]?.numero || null
  const telefonoWa = telefonoPrincipal ? telefonoPrincipal.replace(/[^\d]/g, '') : null
  const precioTexto = propiedad ? formatearPrecio(propiedad.precio, propiedad.moneda) : null
  const equipamiento = propiedad?.ficha?.equipamiento || {}
  const extras = equipamiento.extras || []
  // 24 jul — términos de renta (meses de depósito/contrato + requisitos
  // por tipo de persona), capturados en FichaBasico.jsx. Solo tienen
  // sentido cuando operacion === 'renta'; cada tema decide si los pinta.
  const terminosRenta = propiedad?.ficha?.terminos_renta || {}
  const tieneUbicacion = propiedad ? tieneValor(propiedad.lat) && tieneValor(propiedad.lng) : false

  // 27 jul 2026 — "Zona y conectividad" (capturado en FichaMediaUbic.jsx).
  // Ya viajaba dentro de `ficha` en la vista `propiedades_publicas`, solo
  // que ningún tema lo pintaba. Se expone aquí ya normalizado, con
  // `hayZonaConectividad` calculado sobre los 5 campos reales para que
  // ningún tema pinte una tarjeta vacía.
  const zonaConectividad = propiedad?.ficha?.ubicacion_conectividad || {}
  const serviciosZona = zonaConectividad.servicios || {}
  const hayZonaConectividad = [
    zonaConectividad.zona_colonia_referencia,
    zonaConectividad.puntos_interes_cercanos,
    serviciosZona.escuelas,
    serviciosZona.hospitales,
    serviciosZona.transporte,
  ].some(tieneValor)

  const amenidadesActivas = AMENIDADES_ITEMS
    .filter(([grupo, key]) => equipamiento[grupo]?.[key] === true)
    .map(([, , label]) => label)
    .concat(extras.filter((e) => tieneValor(e.nombre) && e.tipo === 'si_no' && e.valor === true).map((e) => e.nombre))

  // 27 jul 2026 (sesión 24) — distintivos de estado y "bajó de precio".
  // La vista `propiedades_publicas` ya hace el gating del lado del
  // servidor: `estado_publico` solo llega si Nydia prendió el toggle (y
  // solo con valores separada/cerrada), y `bajo_de_precio`/
  // `precio_anterior` solo cuando el estado no los vuelve irrelevantes.
  // Aquí solo se traduce a etiqueta: cerrada + renta → Rentada, cerrada +
  // venta → Vendida.
  const etiquetaEstado = propiedad?.estado_publico
    ? propiedad.estado_publico === 'separada'
      ? 'Separada'
      : propiedad.operacion === 'renta'
        ? 'Rentada'
        : 'Vendida'
    : null
  const bajoDePrecio = propiedad?.bajo_de_precio === true && !etiquetaEstado
  const precioAnteriorTexto =
    bajoDePrecio && tieneValor(propiedad?.precio_anterior)
      ? formatearPrecio(propiedad.precio_anterior, propiedad.moneda)
      : null

  const mensajeWa = propiedad
    ? encodeURIComponent(`Hola, me interesa la propiedad "${propiedad.titulo || 'Propiedad'}" que vi en tu página.`)
    : ''

  const compartirLiga = async () => {
    const url = window.location.href
    if (navigator.canShare && navigator.canShare({ title: propiedad?.titulo, url })) {
      try {
        await navigator.share({ title: propiedad?.titulo || 'Propiedad', url })
        return
      } catch {
        return // usuario canceló el share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCompartido(true)
      setTimeout(() => setCompartido(false), 2000)
    } catch {
      window.prompt('Copia la liga:', url)
    }
  }

  return {
    estado,
    propiedad,
    fotos,
    perfil,
    acento,
    marcaTexto,
    telefonoPrincipal,
    telefonoWa,
    precioTexto,
    tieneUbicacion,
    amenidadesActivas,
    terminosRenta,
    plano,
    zonaConectividad,
    serviciosZona,
    hayZonaConectividad,
    etiquetaEstado,
    bajoDePrecio,
    precioAnteriorTexto,
    mensajeWa,
    compartido,
    compartirLiga,
  }
}
