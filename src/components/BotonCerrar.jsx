// src/components/BotonCerrar.jsx
// Motivo: unificación del ícono de cerrar (23 jul 2026, pedido de Okta —
//   "el ícono de cerrar no se ve o es poco intuitivo, y a veces está a la
//   izquierda y a veces a la derecha"). Antes había 9 copias distintas
//   repartidas en CitaForm, InteraccionForm, EnviarDocumentosBoveda,
//   GeneradorPostFacebook, ImportarContactos, EscanearDocumento,
//   PropiedadForm (cada una con su propio SVG local, 6 a la izquierda y
//   1 a la derecha) y ContactoForm/ExportaFicha (con el carácter de texto
//   "×", sin SVG, por eso se veían más débiles). Ahora: un solo componente,
//   siempre arriba a la derecha, con área tocable 44×44 (mismo estándar de
//   accesibilidad ya usado en Contactos/Propiedades).
//   Contraste (mismo día, segunda vuelta): la primera versión usaba
//   `var(--ta-bg)` de fondo — el mismo beige del lienzo general de la app,
//   así que sobre una ventana blanca (`var(--ta-surface)`) casi no se
//   notaba como botón. Se probaron 3 variantes con Okta (borde, gris
//   suave, círculo sólido) — eligió el círculo sólido oscuro
//   (`var(--ta-text)`) con la X en blanco, máximo contraste. Con el
//   círculo más oscuro la X de 18px se veía chica en proporción — subida
//   a 22px + trazo 2.4 para que se note bien dentro del círculo.
//   Variante "toolbar" (mismo día, tercera vuelta): en `PropiedadForm`/
//   `ExportaFicha` el círculo sólido se veía "burdo" — reglas de
//   `ui-ux-pro-max` (`icon-style-consistent`, `primary-action`): un botón
//   con más peso visual que sus 3-4 hermanos del mismo header (lápiz,
//   compartir, Facebook, liga) se lee como la acción principal cuando en
//   realidad es la más secundaria (cerrar). La variante "toolbar" adopta
//   el lenguaje visual de esos hermanos — cuadrado redondeado, fondo
//   `var(--ta-bg)` — en vez de destacar por contraste, se integra a la
//   fila; sigue siendo distinguible por su ícono/color, no por gritar más
//   fuerte que el resto.
export default function BotonCerrar({ onClick, label = 'Cerrar', style, disabled = false, variant = 'modal' }) {
  const esToolbar = variant === 'toolbar'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: esToolbar ? 32 : 44,
        height: esToolbar ? 32 : 44,
        flexShrink: 0,
        border: 'none',
        borderRadius: esToolbar ? 8 : '50%',
        background: esToolbar ? 'var(--ta-bg)' : 'var(--ta-text)',
        color: esToolbar ? 'var(--ta-text-muted)' : 'var(--ta-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <svg
        width={esToolbar ? 16 : 22}
        height={esToolbar ? 16 : 22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={esToolbar ? 1.8 : 2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  )
}
