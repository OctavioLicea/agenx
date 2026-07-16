// src/features/citas/hooks/useCita.js
// Motivo: Sprint N (Citas) — hook de CRUD, mismo patrón que
//   useInteraccion.js: whitelist explícita de columnas reales antes de
//   mandar el payload a Supabase, guardar() nunca reemplaza el estado
//   local completo con la respuesta del servidor (solo sincroniza `id`
//   la primera vez). A diferencia de Interacciones, aquí contacto_id Y
//   propiedad_id son AMBOS obligatorios (columnas NOT NULL en `visitas`,
//   confirmado contra el schema real de Supabase antes de construir —
//   ver docs/bitacora/2026-07-14_2.md). La tabla también tiene un
//   trigger (`trg_visitas_requiere_nombre`) que bloquea el INSERT si el
//   contacto no tiene nombre — el error de Postgres llega tal cual en
//   `dbError.message` y se muestra en el formulario.
// Timestamp: 2026-07-14, 22:10 hrs

import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabaseClient'

// Estados reales permitidos por el CHECK constraint de `visitas.estado`
// en Supabase — confirmado contra el schema antes de construir. NO existe
// 'confirmada': los valores son programada | realizada | cancelada | no_asistio.
export const ESTADOS_CITA = ['programada', 'realizada', 'cancelada', 'no_asistio']

export const CITA_VACIA = {
  contacto_id: null,
  propiedad_id: null,
  fecha_hora: null, // null = "ahora" (la columna tiene default now() en BD); se manda explícito si Nydia la edita
  estado: 'programada',
  nota: null,
}

const COLUMNAS_CITA = ['contacto_id', 'propiedad_id', 'fecha_hora', 'estado', 'nota']

function construirPayload(cita) {
  const payload = {}
  for (const columna of COLUMNAS_CITA) {
    if (columna in cita && cita[columna] !== undefined) {
      payload[columna] = cita[columna]
    }
  }
  if (payload.fecha_hora === null) delete payload.fecha_hora
  return payload
}

export function useCita(citaInicial = CITA_VACIA) {
  const [cita, setCita] = useState(citaInicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const actualizar = useCallback((cambios) => {
    setCita((prev) => ({ ...prev, ...cambios }))
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

    if (!cita.contacto_id) {
      setError('Falta el contacto.')
      setGuardando(false)
      return { ok: false }
    }
    if (!cita.propiedad_id) {
      setError('Falta la propiedad.')
      setGuardando(false)
      return { ok: false }
    }

    const payload = { ...construirPayload(cita), user_id: userData.user.id }

    const query = cita.id
      ? supabase.from('visitas').update(payload).eq('id', cita.id).select().single()
      : supabase.from('visitas').insert(payload).select().single()

    const { data, error: dbError } = await query

    setGuardando(false)

    if (dbError) {
      // El trigger de BD (contacto sin nombre) llega aquí tal cual — es un
      // mensaje ya en español, no hace falta traducirlo.
      setError(dbError.message)
      return { ok: false, error: dbError }
    }

    if (!cita.id && data?.id) {
      setCita((prev) => ({ ...prev, id: data.id }))
    }

    return { ok: true, data }
  }, [cita])

  return { cita, actualizar, guardar, guardando, error }
}
