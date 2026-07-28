// src/features/publico/useCerrarConBack.js
// Motivo: FEAT — 27 jul 2026 (sesión 23). Los modales de la página pública
//   (lightbox de fotos, QR y el nuevo de plano) solo se cerraban con
//   Escape o con su botón de cerrar. En celular, el botón físico de atrás
//   de Android no los cerraba: sacaba al prospecto de la página completa,
//   que es justo lo contrario de lo que espera. Este hook resuelve los
//   tres de una vez.
//
//   Cómo funciona: al abrirse el modal empuja una entrada al historial
//   (`pushState`); si el usuario da atrás, esa entrada se consume y el
//   `popstate` cierra el modal en vez de abandonar la página. Si el modal
//   se cierra por Escape o por el botón, el hook retira su propia entrada
//   con `history.back()` para no dejar basura acumulada en el historial
//   (si no, cada abrir/cerrar dejaría un "atrás" fantasma).
//
//   Mismo patrón de `pushState`/`popstate` que ya usa App.jsx para la
//   navegación del CRM — no se agrega react-router ni ninguna
//   dependencia nueva.
// Timestamp: 2026-07-27

import { useEffect, useRef } from 'react'

const MARCA = 'ta_modal_publico'

/**
 * @param {boolean} abierto  Si el modal está visible ahora mismo.
 * @param {() => void} onCerrar  Qué hacer cuando el usuario da "atrás".
 */
export function useCerrarConBack(abierto, onCerrar) {
  // El callback se guarda en un ref para que el efecto dependa solo de
  // `abierto`: si dependiera de `onCerrar` (que suele venir como arrow
  // function inline y cambia en cada render), el efecto se desmontaría y
  // remontaría constantemente, empujando entradas de historial de más.
  const onCerrarRef = useRef(onCerrar)
  useEffect(() => {
    onCerrarRef.current = onCerrar
  }, [onCerrar])

  // Distingue "se cerró porque el usuario dio atrás" (el historial ya
  // retrocedió solo) de "se cerró con Escape/botón" (hay que retroceder a
  // mano para limpiar la entrada que empujamos).
  const cerradoPorBackRef = useRef(false)

  useEffect(() => {
    if (!abierto) return

    cerradoPorBackRef.current = false
    window.history.pushState({ [MARCA]: true }, '')

    const alRetroceder = () => {
      cerradoPorBackRef.current = true
      onCerrarRef.current?.()
    }

    window.addEventListener('popstate', alRetroceder)

    return () => {
      window.removeEventListener('popstate', alRetroceder)
      // Cierre por Escape o por el botón: nuestra entrada sigue en el
      // historial, hay que consumirla. Solo si sigue siendo la nuestra —
      // si el usuario navegó a otro lado mientras el modal estaba abierto
      // (ej. abrió el PDF del plano en la misma pestaña), un back() a
      // ciegas lo sacaría de donde está.
      if (!cerradoPorBackRef.current && window.history.state?.[MARCA]) {
        window.history.back()
      }
    }
  }, [abierto])
}
