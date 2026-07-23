// src/lib/supabaseClient.js
// Motivo: actualizar db.schema de 'agenx' (eliminado) a 'tuasesor', tras el
//   rename del proyecto. Sin este cambio el cliente apunta a un schema que
//   ya no existe en la base de datos.
// Timestamp: 2026-06-20, hrs
//
// [Actualización 22 jul 2026] auth.detectSessionInUrl: false — con el
// default (true), el propio SDK intenta procesar automáticamente los
// tokens del link de invitación apenas se crea el cliente, en paralelo a
// EstablecerPassword.jsx (que hace su propio setSession() manual desde el
// mismo hash). Confirmado en consola real: "Session as retrieved from
// URL was issued over 120s ago, URL could be stale" — advertencia propia
// del SDK, prueba de que su detección automática sí estaba corriendo y
// compitiendo con la nuestra por el mismo link, dejando la sesión en un
// estado inconsistente (hash limpiado, pero sesión no utilizable).
// EstablecerPassword.jsx es el único lugar de la app que necesita leer
// tokens de la URL — con detección automática apagada, es el único que
// los procesa, sin carrera.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'tuasesor' },
  auth: { detectSessionInUrl: false },
})