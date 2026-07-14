// src/features/interacciones/hooks/useInteraccion.js
// Motivo: Sprint 3 (Interacciones) — hook de CRUD, mismo patrón seguro que
//   useContacto.js/usePropiedad.js: whitelist explícita de columnas reales
//   antes de mandar el payload a Supabase, y guardar() nunca reemplaza el
//   estado local completo con la respuesta del servidor (solo sincroniza
//   `id` la primera vez).
// Timestamp: 2026-07-09, 19:10 hrs

import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export const INTERACCION_VACIA = {
  contacto_id: null,
  propiedad_id: null,
  canal: null,           // 'whatsapp' | 'llamada' | 'redes_sociales' | 'otro'
  direccion: 'entrante', // 'entrante' | 'saliente'
  fuente: null,          // 'letrero' | 'facebook' | 'instagram' | 'tiktok' | 'recomendacion' | 'otro'
  nota: null,
  fecha_hora: null,      // null = "ahora" (la columna tiene default now() en BD); se manda explícito solo si Nydia la edita
}

const COLUMNAS_INTERACCIONES = ['contacto_id', 'propiedad_id', 'canal', 'direccion', 'fuente', 'nota', 'fecha_hora']

function construirPayload(interaccion) {
  const payload = {}
  for (const columna of COLUMNAS_INTERACCIONES) {
    if (columna in interaccion && interaccion[columna] !== undefined) {
      payload[columna] = interaccion[columna]
    }
  }
  // fecha_hora: si quedó en null, no la mandamos — que la BD aplique su
  // default (now()) en vez de mandar un null explícito que la pisaría.
  if (payload.fecha_hora === null) delete payload.fecha_hora
  return payload
}

export function useInteraccion(interaccionInicial = INTERACCION_VACIA) {
  const [interaccion, setInteraccion] = useState(interaccionInicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const actualizar = useCallback((cambios) => {
    setInteraccion((prev) => ({ ...prev, ...cambios }))
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

    if (!interaccion.contacto_id) {
      setError('Falta el contacto.')
      setGuardando(false)
      return { ok: false }
    }
    if (!interaccion.canal) {
      setError('Falta el canal.')
      setGuardando(false)
      return { ok: false }
    }

    const payload = { ...construirPayload(interaccion), user_id: userData.user.id }

    const query = interaccion.id
      ? supabase.from('interacciones').update(payload).eq('id', interaccion.id).select().single()
      : supabase.from('interacciones').insert(payload).select().single()

    const { data, error: dbError } = await query

    setGuardando(false)

    if (dbError) {
      setError(dbError.message)
      return { ok: false, error: dbError }
    }

    if (!interaccion.id && data?.id) {
      setInteraccion((prev) => ({ ...prev, id: data.id }))
    }

    return { ok: true, data }
  }, [interaccion])

  return { interaccion, actualizar, guardar, guardando, error }
}
