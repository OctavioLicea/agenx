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

      const [{ data: fotosData }, { data: perfilData }] = await Promise.all([
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
      ])

      if (cancelado) return
      setFotos(
        (fotosData || []).map((f) => ({
          ...f,
          url: supabase.storage.from('bucket-propiedad-media').getPublicUrl(f.storage_path).data.publicUrl,
        }))
      )
      setPerfil(perfilData)
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

  const amenidadesActivas = AMENIDADES_ITEMS
    .filter(([grupo, key]) => equipamiento[grupo]?.[key] === true)
    .map(([, , label]) => label)
    .concat(extras.filter((e) => tieneValor(e.nombre) && e.tipo === 'si_no' && e.valor === true).map((e) => e.nombre))

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
    mensajeWa,
    compartido,
    compartirLiga,
  }
}
