// scripts/invitar-usuario.mjs
// Motivo: FIX del bug real encontrado 22-23 jul 2026 — el botón "Invite
//   user" del dashboard de Supabase siempre usa el "Site URL" del
//   proyecto como redirect_to, y ese Site URL está puesto para ivent (la
//   otra app en este mismo proyecto). Confirmado en los logs de Auth:
//   la sesión del invitado se crea, aterriza en la página de ivent, y
//   la propia app de ivent la cierra segundos después — para cuando se
//   alcanza a copiar el link a TuAsesor, la sesión ya no existe en el
//   servidor ("session not found" / "Auth session missing!").
//
//   Fix sin tocar el Site URL compartido (eso rompería los correos de
//   ivent): la Admin API sí permite pasar un `redirectTo` explícito por
//   invitación, distinto del Site URL — pero el dashboard de Supabase
//   Studio no expone ese campo en su botón "Invite user", solo la API
//   lo permite. Este script llama esa API directo con el redirect
//   correcto (TuAsesor, no ivent).
//
//   Requisito único: agregar las URLs de TuAsesor a la lista blanca de
//   Supabase (Authentication > URL Configuration > Redirect URLs) antes
//   de usar este script — si no están en la lista, Supabase ignora el
//   redirectTo y usa el Site URL de todas formas:
//     http://localhost:5173/**
//     https://tuasesor.eventosytech.com/**
//
// Uso:
//   node --env-file=.env.local scripts/invitar-usuario.mjs correo@ejemplo.com
//   node --env-file=.env.local scripts/invitar-usuario.mjs correo@ejemplo.com --local
//
//   Sin --local manda a producción (tuasesor.eventosytech.com). Con
//   --local manda a localhost:5173, para probar el flujo antes de
//   desplegar.
//
//   Necesita SUPABASE_SERVICE_ROLE_KEY en el .env.local (NUNCA en el
//   .env normal que usa la app en el navegador — esta llave tiene
//   permisos de administrador completos sobre auth.users, no debe
//   llegar nunca al bundle del cliente). .env* ya está en .gitignore.
//   La llave se copia una sola vez desde Supabase > Project Settings >
//   API > service_role — nunca se comparte fuera de tu máquina.
// Timestamp: 2026-07-22

import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]
const esLocal = process.argv.includes('--local')

if (!email) {
  console.error('Uso: node --env-file=.env.local scripts/invitar-usuario.mjs correo@ejemplo.com [--local]')
  process.exit(1)
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exitCode = 1
} else {
  const redirectTo = esLocal ? 'http://localhost:5173/' : 'https://tuasesor.eventosytech.com/'

  const admin = createClient(supabaseUrl, serviceRoleKey)

  // 23 jul 2026: --force borra primero cualquier cuenta existente con ese
  // correo antes de invitar — pensado para la cuenta de prueba
  // (octavioliceade@hotmail.com), que se re-invita muchas veces durante
  // QA y por default Supabase rechaza invitar un correo ya registrado.
  // Sin --force, si el correo ya existe se detiene y avisa (no borra
  // cuentas reales por accidente).
  if (process.argv.includes('--force')) {
    const { data: lista, error: errorLista } = await admin.auth.admin.listUsers()
    const existente = !errorLista && lista.users.find((u) => u.email === email)
    if (existente) {
      await admin.auth.admin.deleteUser(existente.id)
      console.log(`Cuenta existente (${existente.id}) borrada antes de re-invitar.`)
    }
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo })

  if (error) {
    console.error('Error al invitar:', error.message)
    if (error.message.includes('already been registered')) {
      console.error('Corre de nuevo agregando --force para borrar la cuenta existente primero.')
    }
    process.exitCode = 1
  } else {
    console.log(`Invitación enviada a ${email}, redirectTo = ${redirectTo}`)
    console.log('user id:', data.user.id)
  }
}

// process.exitCode (no process.exit()) a propósito: en Windows, forzar el
// cierre del proceso justo después de un fetch (inviteUserByEmail usa
// fetch por debajo) puede chocar con un handle async que aún no termina
// de cerrarse — "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)"
// es un bug conocido de Node/libuv en Windows con process.exit() usado
// así. Dejar que el proceso termine solo evita el choque.
