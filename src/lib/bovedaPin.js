// src/lib/bovedaPin.js
// Motivo: FEAT — PIN de acceso a la Bóveda de documentos (pedido de Okta:
//   Nydia comparte su teléfono/laptop a veces y quiere una traba rápida
//   antes de INE/escrituras/contratos). No es "seguridad real" contra un
//   atacante remoto — eso ya lo cubre RLS + Supabase Auth + bucket privado
//   (bucket-propiedad-vault). Es una traba de UI local: un PIN de 4 dígitos
//   guardado hasheado (SHA-256 + salt aleatorio) en tuasesor.perfiles
//   (columnas boveda_pin_hash, boveda_pin_salt — migración aplicada
//   2026-07-13). Web Crypto API nativa del navegador, sin dependencia
//   nueva — suficiente para un PIN corto de un solo usuario, YAGNI.
// Timestamp: 2026-07-13, 23:40 hrs

const encoder = new TextEncoder()

function bytesAHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function generarSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return bytesAHex(bytes)
}

export async function hashPin(pin, saltHex) {
  const data = encoder.encode(`${saltHex}:${pin}`)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return bytesAHex(new Uint8Array(buffer))
}

export async function verificarPin(pin, saltHex, hashEsperado) {
  const hash = await hashPin(pin, saltHex)
  return hash === hashEsperado
}

// Código de 6 dígitos para el flujo "olvidé mi PIN" — vive solo en memoria
// del componente que lo genera (nunca se guarda en BD), se manda por
// mailto a su propio correo y se compara al vuelo. Ver ModalOlvidoPin en
// FichaDocumentos.jsx.
export function generarCodigo6() {
  const bytes = crypto.getRandomValues(new Uint32Array(1))
  return String(100000 + (bytes[0] % 900000))
}

export const PIN_LARGO = 4
