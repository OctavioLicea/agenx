# Guía de Implementación para Página de Propiedad de Lujo en Plataformas No-Code

## Introducción

Esta guía proporciona los activos visules, las directrices de estilo y las instrucciones de construcción necesarias para replicar el diseño de alta fidelidad para la página de venta de propiedades en plataformas No-Code. La clave para lograr un aspecto profesional y elegante reside en la adhesión estricta a estas directrices.

**Nota Importante:** No se debe utilizar HTML estático para esta página. Se debe construir dinámicamente dentro del sistema No-Code para garantizar la escalabilidad, la facilidad de actualización y la optimización SEO.

## 1. Guía de Estilo y Tipografía

Esta sección define la estética visual de la página. Es crucial que el equipo No-Code configure estas directrices en el sistema antes de comenzar la construcción.

### Paleta de Colores

*   **Fondo Principal:** `#FFFFFF` (Blanco puro, limpio).
*   **Texto Principal/Cuerpo:** `#4A4A4A` (Gris oscuro, suave, más elegante que el negro puro).
*   **Títulos/Acentos:** `#212121` (Negro mate para los títulos y elementos destacados como el sidebar).
*   **Color de Acento (Branding/Iconos):** `#D4AF37` o `#C5A059` (Un dorado/bronce satinado. *Úselo con moderación para iconos y detalles, no para bloques grandes*).
*   **Bordes/Líneas Finas:** `#E0E0E0` (Gris muy claro).

### Tipografía (Fuentes)

La combinación de fuentes es fundamental para el aspecto de lujo. Ambas fuentes están disponibles en Google Fonts.

1.  **Fuente para Títulos (H1, H2, H3, Precio):** `Playfair Display` (Serif). Grado de peso: *Bold (700)* para el precio, *Regular (400)* o *Medium (500)* para los títulos de sección.
2.  **Fuente para Cuerpo, Iconos y Botones:** `Montserrat` o `Open Sans` (Sans-Serif). Peso: *Regular (400)* para texto, *Semi-Bold (600)* o *Bold (700)* para botones.

## 2. Instrucciones de Construcción No-Code

Estas instrucciones guían la construcción de la página siguiendo la jerarquía de contenedores y estilos establecida.

### A. Encabezado (Fijo/Sticky)

*   **Contenedor:** Fondo blanco, borde inferior muy fino (`#E0E0E0`).
*   **Logotipo:** Alineado a la izquierda.
*   **Menú:** Fuente `Montserrat` (Regular), color `#4A4A4A`.
*   **CTA (Solicitar Tour):** Botón con fondo `#212121`, texto blanco `Montserrat` (Bold).

### B. Sección Hero (Arriba del Fold)

*   **Estructura:** Grid de 2 columnas (proporción 70/30).
*   **Columna 1 (Galería):** Usar un módulo de galería de imágenes nativo del sistema No-Code. Asegurar que la imagen principal sea dominante y tenga las flechas de navegación integradas (`< >`). *Omitir el mosaico de 4 fotos pequeñas y usar un carrusel limpio.*
*   **Columna 2 (Sticky Sidebar):**
    *   **Contenedor:** Un bloque blanco con borde `#E0E0E0` y sombra muy suave para dar profundidad. *Hacer este bloque "Sticky" (fijo) al hacer scroll.*
    *   **Precio:** `Playfair Display` (Bold), `#212121`, tamaño grande.
    *   **Ubicación:** Texto `Montserrat` (Regular), `#4A4A4A`.
    *   **Módulo de Mapa:** Insertar el mapa interactivo (Google Maps) directamente aquí, con un pin elegante.
    *   **Botones (CTA):**
        *   **Primario (Contactar Asesor):** Fondo `#212121`, texto `Montserrat` (Bold).
        *   **Secundario (Solicitar Ficha):** Borde `#212121`, fondo blanco, texto `#212121` `Montserrat` (Semi-Bold).

### C. Resumen de Características

*   **Estructura:** Contenedor de ancho completo, grid de 6 columnas. Línea fina `#E0E0E0` arriba y abajo.
*   **Iconos:** Usar iconos de línea fina (outline) en color dorado `#D4AF37`. *El equipo No-Code puede usar FontAwesome (Outline) o subir SVGs.*
*   **Texto:** `Montserrat` (Semi-Bold), `#212121`.

### D. Descripción y Perfil (Cuerpo)

*   **Estructura:** Grid de 2 columnas (proporción 70/30) para mantener la alineación con el sidebar.
*   **Columna 1 (Texto):** Título H2 en `Playfair Display`. Texto de cuerpo en `Montserrat` (Regular), `#4A4A4A`. Usar listas con viñetas limpias.
*   **Columna 2 (Perfil del Agente):** Un contenedor blanco con borde y sombra suave, *justo debajo del sticky sidebar*.
    *   **Foto:** Foto profesional, alta resolución, esquinas ligeramente redondeadas.
    *   **Texto:** Nombre en `Playfair Display`, cargo en `Montserrat`.
    *   **Iconos de Contacto:** Color dorado `#D4AF37` o `#212121`.

## 3. Activos Visuales Requeridos

Pídale a su equipo No-Code acceso para subir estos activos visuales antes de la construcción.

1.  **Logotipo:** En formato SVG (preferiblemente) o PNG de alta resolución con fondo transparente.
2.  **Imágenes de la Propiedad:** Fotos de alta calidad, editadas profesionalmente, *optimizadas para web* (ej. formato WebP o JPEG comprimido, no más de 200-300KB por foto) para no afectar la velocidad (SEO).
3.  **Foto del Agente:** Foto profesional de estudio, alta resolución.
4.  **Iconos:** Si el sistema No-Code no tiene iconos de línea fina en dorado, suba iconos SVG personalizados para: Camas, Baños, Autos, Construcción, Terreno, Ubicación (Pin).

---

Este Markdown proporciona una guía clara y estructurada para que el equipo No-Code implemente el diseño de alta plusvalía de forma dinámica y profesional. Al seguir estas directrices, se asegurará de que la página de venta de propiedades transmita la elegancia y sofisticación deseadas.