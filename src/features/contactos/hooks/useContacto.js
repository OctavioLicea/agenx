// src/features/contactos/hooks/useContacto.js
// Motivo: Sprint 3 (Interacciones) — se mueve `telefono` fuera de la tabla
//   `contactos` hacia la tabla puente `contacto_telefonos` (un contacto
//   puede tener 0, 1 o varios teléfonos; un mismo teléfono puede
//   pertenecer a varios contactos, ej. pareja que comparte celular).
//   Este hook deja de conocer nada de teléfonos — esa responsabilidad
//   vive ahora en ContactoForm.jsx (mismo criterio que ya usaban ahí
//   propiedad_colaboradores y procesos_comerciales: relaciones fuera de
//   la tabla base se manejan en el componente, no en este hook).
//   Se quita también la validación "el teléfono es obligatorio" de
//   guardar() — ya no es columna de esta tabla, y la decisión de CUÁNDO
//   hay suficiente información para crear un contacto (nombre o primer
//   teléfono capturado) vive en el efecto de auto-creación de
//   ContactoForm.jsx.
// Timestamp: 2026-07-09, 19:05 hrs

import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export const CONTACTO_VACIO = {
  nombre: null,
  empresa: null,
  correo: null,
  rol_principal: null,
  nota_sin_propiedad: null,
}

const COLUMNAS_CONTACTOS = ['nombre', 'empresa', 'correo', 'rol_principal', 'nota_sin_propiedad']

function construirPayload(contacto) {
  const payload = {}
  for (const columna of COLUMNAS_CONTACTOS) {
    if (columna in contacto) payload[columna] = contacto[columna]
  }
  return payload
}

export function useContacto(contactoInicial = CONTACTO_VACIO) {
  const [contacto, setContacto] = useState(contactoInicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const actualizar = useCallback((cambios) => {
    setContacto((prev) => ({ ...prev, ...cambios }))
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

    const payload = { ...construirPayload(contacto), user_id: userData.user.id }

    const query = contacto.id
      ? supabase.from('contactos').update(payload).eq('id', contacto.id).select().single()
      : supabase.from('contactos').insert(payload).select().single()

    const { data, error: dbError } = await query

    setGuardando(false)

    if (dbError) {
      setError(dbError.message)
      return { ok: false, error: dbError }
    }

    if (!contacto.id && data?.id) {
      setContacto((prev) => ({ ...prev, id: data.id }))
    }

    return { ok: true, data }
  }, [contacto])

  return { contacto, actualizar, guardar, guardando, error }
}
