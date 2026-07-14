// src/lib/supabaseClient.js
// Motivo: actualizar db.schema de 'agenx' (eliminado) a 'tuasesor', tras el
//   rename del proyecto. Sin este cambio el cliente apunta a un schema que
//   ya no existe en la base de datos.
// Timestamp: 2026-06-20, hrs

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'tuasesor' },
})