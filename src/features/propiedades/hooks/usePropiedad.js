// src/features/propiedades/hooks/usePropiedad.js
// Motivo: FIX — se agrega "descripcion" (columna nueva, migración
//   agregar_descripcion_propiedades) a la whitelist de columnas y a
//   PROPIEDAD_VACIA. Sin esto el campo se veía en el formulario pero el
//   autosave nunca lo mandaba a Supabase (construirPayload lo habría
//   ignorado en silencio, mismo bug que ya se documentó para
//   fotos_propiedad).
// Timestamp: 2026-07-07, 22:50 hrs

import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabaseClient'

const FICHA_DEFAULT = {
  equipamiento: {
    servicios_generales_seguridad: {
      seguridad_vigilancia: null,
      estacionamiento_techado_visitas: null,
      elevador: null,
      motor_lobby: null,
      recepcion_paqueteria: null,
    },
    recreacion_bienestar: {
      alberca_jacuzzi: null,
      gimnasio: null,
      spa_sauna: null,
      roof_garden: null,
      salon_usos_multiples: null,
      areas_asador_terrazas: null,
      salon_juegos: null,
    },
    acabados: {
      pisos: '',
      muros_techos: '',
      fachadas: '',
    },
    equipo_interior: {
      cocina: null,
      banos: null,
      almacenamiento: null,
      climatizacion: null,
    },
    extras: [],
  },
  historial_propiedad: '',
  situacion_fiscal_legal: {
    al_corriente: null,
    gravamenes: '',
    esquemas_pago_aceptados: [],
    notas: '',
  },
  ubicacion_conectividad: {
    zona_colonia_referencia: '',
    puntos_interes_cercanos: '',
    servicios: { escuelas: '', hospitales: '', transporte: '' },
  },
  comentarios: [],
}

export const PROPIEDAD_VACIA = {
  titulo: '',
  descripcion: null,
  tipo: null,
  tipo_otro: null,
  operacion: null,
  uso: null,
  zona: null,
  precio: null,
  moneda: 'MXN',
  recamaras: null,
  banos: null,
  estacionamientos: null,
  m2_construccion: null,
  m2_terreno: null,
  cuota_mantenimiento: null,
  estado: 'captacion',
  direccion: null,
  ficha_completa: false,
  ficha: FICHA_DEFAULT,
  redes_sociales: [],
}

// Whitelist de columnas REALES de tuasesor.propiedades. Cualquier otra
// llave que llegue a `propiedad` (ej. fotos_propiedad, relaciones
// embebidas de un select con join) se ignora al construir el payload —
// nunca se manda el objeto `propiedad` completo tal cual a Supabase.
const COLUMNAS_PROPIEDADES = [
  'titulo', 'descripcion', 'tipo', 'tipo_otro', 'operacion', 'uso', 'zona', 'precio', 'moneda',
  'recamaras', 'banos', 'estacionamientos', 'm2_construccion', 'm2_terreno',
  'cuota_mantenimiento', 'estado', 'direccion', 'ficha_completa', 'ficha',
  'redes_sociales', 'lat', 'lng', 'ubicacion_origen',
]

function construirPayload(propiedad) {
  const payload = {}
  for (const columna of COLUMNAS_PROPIEDADES) {
    if (columna in propiedad) payload[columna] = propiedad[columna]
  }
  return payload
}

export function usePropiedad(propiedadInicial = PROPIEDAD_VACIA) {
  const [propiedad, setPropiedad] = useState(propiedadInicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const actualizar = useCallback((cambios) => {
    setPropiedad((prev) => ({ ...prev, ...cambios }))
  }, [])

  const guardar = useCallback(async () => {
    setGuardando(true)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      setError('No hay sesión activa.')
      setGuardando(false)
      return { ok: false }
    }

    const payload = { ...construirPayload(propiedad), user_id: userData.user.id }

    const query = propiedad.id
      ? supabase.from('propiedades').update(payload).eq('id', propiedad.id).select().single()
      : supabase.from('propiedades').insert(payload).select().single()

    const { data, error: dbError } = await query

    setGuardando(false)

    if (dbError) {
      setError(dbError.message)
      return { ok: false, error: dbError }
    }

    // FIX de raíz del loop de autosave / "parpadeo" de Guardando / toggles
    // que "se resetean": antes se hacía setPropiedad(data), reemplazando
    // TODO el estado local con la respuesta de Supabase. Eso disparaba de
    // nuevo el efecto de autosave (propiedad "cambió"), que volvía a
    // guardar, que volvía a hacer setPropiedad(data)... loop infinito. Y
    // si el usuario tocaba algo mientras un guardado seguía en vuelo, el
    // setPropiedad(data) con la respuesta (ya desactualizada) "resetaba"
    // ese cambio reciente. Ahora solo se sincroniza `id` la primera vez
    // (tras el insert inicial) — el resto del estado local YA es la
    // fuente de verdad de lo que el usuario está editando, no hace falta
    // reemplazarlo con el snapshot que regresó el servidor.
    if (!propiedad.id && data?.id) {
      setPropiedad((prev) => ({ ...prev, id: data.id }))
    }

    return { ok: true, data }
  }, [propiedad])

  return { propiedad, actualizar, guardar, guardando, error }
}