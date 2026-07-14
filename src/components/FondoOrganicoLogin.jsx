// src/components/FondoOrganicoLogin.jsx
// Motivo: se quita el grupo de líneas rosa-champán a pedido de Okta —
//   se ve mejor solo con el navy-carbón, menos ruido visual
// 2026-07-05, 13:10 hrs

export default function FondoOrganicoLogin() {
  return (
    <div className="fondo-organico-login" aria-hidden="true">
      <svg viewBox="0 0 400 340" preserveAspectRatio="none">
        <g className="fondo-organico-login__navy">
          <path d="M -20 340 C 40 200, 100 100, 160 -20" />
          <path d="M 20 340 C 80 210, 140 110, 210 -20" />
          <path d="M 60 340 C 120 220, 180 120, 260 -20" />
          <path d="M 100 340 C 160 230, 220 130, 310 -20" />
          <path d="M 140 340 C 200 240, 260 140, 360 -20" />
        </g>
      </svg>
    </div>
  );
}
