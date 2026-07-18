# TuAsesor — Guía de estilo de marca

## Isotipo
Cuatro cuadrados en escalera, cada uno tocando al siguiente solo por una esquina (sin traslape). Lado = 1 unidad; desplazamiento diagonal = 1 unidad por cuadrado.
- Esquinas redondeadas (radius ≈ 9% del lado) para rimar con la tipografía redondeada.
- El primer cuadrado (superior) siempre toma el color del texto; los otros tres toman el color de acento.

## Colores
| Nombre | Hex | Uso |
|---|---|---|
| Verde Carbón | `#1A3A2C` | Texto (versión principal), isotipo (versión invertida), fondo de favicon |
| Dorado | `#B8963A` | Isotipo (versión principal), texto (versión invertida) |
| Blanco cálido | `oklch(0.98 0.005 90)` | Fondo de tarjeta / lockup |

Colores similares de referencia (paleta original):
- Verde Bosque Profundo — `#1A3A2C`
- Verde Esmeralda Oscuro — `#0F412B`
- Gris Carbón Oscuro con matiz — `#2C3E36`

## Tipografía
**Baloo 2** (Google Fonts), peso Semi-Bold (600).
- Geométrica redondeada, terminales suaves — la más cercana disponible libremente al estilo del logo original (que usa una fuente redondeada tipo Gilroy/Poppins Rounded, no confirmada/no incluida por ser de pago).
- Import: `https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&display=swap`
- El archivo de fuente (.ttf/.woff2) puede descargarse directo desde fonts.google.com/specimen/Baloo+2 — no se incluye el binario en este paquete por licencia de distribución de Google Fonts (se usa vía link, no requiere descarga).

## Versiones del logo
- `TuAsesor-logo-principal.png` — isotipo dorado (1er cuadro verde) + texto verde. Uso por defecto sobre fondos claros.
- `TuAsesor-logo-invertido.png` — isotipo verde (1er cuadro dorado) + texto dorado. Uso alternativo / fondos claros con énfasis en dorado.
- `favicon-16.png` / `favicon-32.png` / `favicon-64.png` / `favicon-128.png` — variante compacta de 2 cuadros superpuestos sobre fondo verde carbón, para favicon / ícono de app. El isotipo completo de 4 cuadros con espacio negativo no es legible a estos tamaños.

## Reglas de uso
- Mantener el espacio negativo entre cuadros en el logotipo completo (isotipo + texto) — no comprimir para "verse más sólido".
- Para usos aislados como icono (favicon, avatar, app icon), usar siempre la variante compacta, nunca el isotipo de 4 cuadros.
- No usar degradados en los cuadros; mantener color sólido con sombra interior sutil para dar volumen.
