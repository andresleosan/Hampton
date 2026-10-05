# DESIGN.md — Hampton Estates Jersey (demo)

> 2026-10-05, revisión 04. D-104 aprueba para la demo local la dirección editorial implementada: paleta cálida, jerarquía serif/sans de sistema, fotografía contenida sin ampliación, retratos reales en blanco y negro y superficies operativas integradas. Las reglas de accesibilidad y comportamiento aprobadas por D-051 se mantienen.
> Los valores marcados **[medido]** proceden de la web actual de Hampton (estilos computados, SOURCES §13). **[implementado]** describe la demo local revisable; no autoriza publicación.
> Lo que no hay que duplicar: las reglas de datos y seguridad viven en `docs/constitution.md`; los criterios verificables, en `specs/`. Aquí solo se define el aspecto y el comportamiento visual.

## 1. Intención
Una agencia familiar de Jersey con 40 años, presentada con calma editorial: la fotografía y los datos claros mandan; la marca se reconoce por el azul de Hampton y su casa en línea. Inspiración: **principios** de Heider (una foto por tarjeta, jerarquía tipográfica, mucho aire, un solo acento), **sin copiar** su identidad, fuentes, colores ni recursos.

Modos de cada superficie (vocabulario de impeccable):
| Superficie | Modo | Qué significa éxito |
|---|---|---|
| Inicio, catálogo | Persuade | El visitante encuentra un inmueble que le interesa y abre su ficha |
| Ficha | Persuade + Read | Entiende el inmueble y sabe cómo dar el siguiente paso |
| Visitas, contacto, calculadora | Operate | Completa la tarea sin fricción y entiende que es una demo |
| Equipo | Read | Conoce a las personas reales y cómo contactarlas |

## 2. Identidad
- **Logo**: el de Hampton (casa en línea + «Hampton Estates»), reutilizado bajo D-018. No se redibuja ni se altera.
- **Voz**: inglés británico (en-GB), sobria y concreta. Sin superlativos inventados; los textos de Hampton se citan literalmente.

## 3. Color
| Token | Valor | Origen | Uso | Contraste verificado |
|---|---|---|---|---|
| `brand` | `#2B6CA3` | [medido] cabecera Hampton | Marca, enlaces, botones primarios | 5.56:1 sobre blanco; 5.06:1 sobre `paper` (AA texto normal) |
| `brand-deep` | `#1F4E78` | [implementado] | Hover/pressed, texto de marca sobre fondos claros y banner de demo | 7.90:1 sobre `paper` |
| `ink` | `#323644` | [medido] texto Hampton | Texto principal | 12.02:1 sobre blanco; 10.94:1 sobre `paper` |
| `ink-2` | `#5B6170` | [implementado] | Texto secundario | 5.64:1 sobre `paper` |
| `paper` | `#F6F4EF` | [implementado] | Fondo editorial cálido | — |
| `white` | `#FFFFFF` | — | Tarjetas, superficies | — |
| `sky` | `#769CCD` | [medido] precio Hampton | **Solo decoración no esencial** (filetes, fondos de adorno). **No** para texto, iconos, foco ni bordes necesarios para reconocer un control o su estado: el tamaño grande de un icono no exime del 3:1 | 2.84:1 sobre `white`; 2.58:1 sobre `paper`: **no apto para texto ni para indicadores no textuales** |
| `accent` | `#9A6B3F` | [documentado; no usado como texto pequeño] acento cálido propio (granito/arena), distinto del cobre de Heider | Detalles; texto normal solo sobre `white` | 4.62:1 sobre `white` (AA); 4.20:1 sobre `paper`: sobre `paper` solo texto grande (≥ 24 px, o negrita ≥ 18,66 px) |
| `demo` | `brand-deep` / `white` | [implementado] | Banner global y avisos textuales de demo | 8.68:1 |

Regla: ningún color de texto por debajo de 4.5:1 (3:1 para texto grande). Los indicadores no textuales necesarios para entender un control o su estado (iconos sin texto, bordes de campos, foco, estado seleccionado) ≥ 3:1 frente a **cada** fondo adyacente (WCAG 2.2, 1.4.11: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Se verifica con cálculo y con un test automático.

Combinaciones reales verificadas (cálculo de luminancia relativa WCAG, 2026-10-03):

| Uso | Primer plano / fondo | Contraste | Resultado |
|---|---|---|---|
| Texto principal | `ink` / `paper` · `ink` / `white` | 10.94 · 12.02 | AA |
| Texto secundario | `ink-2` / `paper` · `ink-2` / `white` | 5.64 · 6.20 | AA |
| Enlaces | `brand` / `paper` · `brand` / `white` | 5.06 · 5.56 | AA |
| Botón primario | `white` / `brand` · `white` / `brand-deep` (hover) | 5.56 · 8.68 | AA |
| Texto de marca | `brand-deep` / `paper` | 7.90 | AA |
| Acento | `accent` / `white` · `accent` / `paper` | 4.62 · 4.20 | AA · solo texto grande |
| Borde de campo | `ink-2` / `paper` · `ink-2` / `white` | 5.64 · 6.20 | ≥ 3:1 |
| Indicador de foco | `brand-deep` / `paper` · `brand-deep` / `white` | 7.90 · 8.68 | ≥ 3:1 |
| Decoración | `sky` / `paper` · `sky` / `white` | 2.58 · 2.84 | solo decoración no esencial |

- **Foco:** contorno de 2 px de `brand-deep` con 2 px de separación, de modo que el contorno queda sobre el fondo de la página y no sobre el botón. Sobre fotos (tarjetas, galería), doble anillo: interior `white` y exterior `brand-deep`, de manera que uno de los dos supera 3:1 frente a cualquier imagen.
- **Texto sobre fotos:** solo sobre un panel opaco que cumpla el contraste de texto; nunca directamente sobre la imagen.

## 4. Tipografía [implementado]
- **Etiquetas y navegación**: `Aptos`, `Segoe UI`, `Helvetica Neue`, Arial y fallback sans-serif, en mayúsculas espaciadas cuando corresponde.
- **Titulares**: `Iowan Old Style`, Baskerville, `Times New Roman` y fallback serif. **No** se copian fuentes de Heider ni se hace una petición tipográfica externa.
- **Cuerpo**: la misma pila sans de sistema.
- Medida de línea de 60–75 caracteres e interlineado del cuerpo 1.6.

## 5. Retícula y espaciado [implementado]
- Diseño mobile-first. Puntos de corte orientativos: 600 / 900 / 1200 px. Contenedor máximo ≈ 1280 px.
- **Cobertura que se comprueba:** móvil estrecho a 320 px, móvil a 390 px y escritorio a 1280 px. Además, **reflujo** (WCAG 1.4.10): a 1280 px con zoom del 400 % (equivale a 320 px CSS), sin pérdida de contenido ni función y sin scroll en dos direcciones. Excepción: el marco del visor 3D, que se escala.
- Catálogo: 1 columna (móvil) → 2 → 3 (escritorio). Escala de espaciado 4/8/12/16/24/32/48/64/96.
- **0 px de desbordamiento horizontal a 320, 390 y 1280 px** (hoy Hampton mide 980 px a 390 px; SOURCES §13).

## 6. Fotografía
- **Proporciones fijas**: tarjeta 4:3; foto principal de la ficha 3:2 (o 4:3 para verticales). Recorte con `object-fit: cover` y punto focal centrado por defecto (ajustable por foto).
- **Nunca se amplía** una imagen por encima de su tamaño original. Variantes responsivas solo hasta el original.
- **Portada a sangre**: se decide por **calidad visual, recorte y tamaño real de presentación** (D-041). Los 2000 px orientan, no son una regla. Si ninguna foto sirve, portada tipográfica o compuesta.
- **1 foto**: composición completa, sin miniaturas duplicadas, sin flechas ni contador «1/1», sin controles vacíos.
- **N fotos**: mosaico (1 grande + hasta 4) con acceso a la galería completa; el contador solo aparece si N > 1.
- **Verticales**: marco 4:3 con recorte cuidadoso, o pareja de verticales lado a lado en el mosaico.
- **Texto alternativo**: descriptivo y basado solo en lo visible o publicado. Nunca se atribuyen cámara, autor ni ubicación sin evidencia.

## 7. Retratos del equipo
- Solo los retratos reales publicados por Hampton (SOURCES §13). Tratamiento **coherente** para los dos: mismo recorte y blanco y negro; los archivos se guardan localmente como material privado ignorado por Git.
- **Prohibido**: retocar rasgos, generar o «mejorar» imágenes con IA, cambiar el fondo de la persona o usar fotos de stock como si fueran del equipo.

## 8. Componentes
| Componente | Reglas clave |
|---|---|
| Cabecera | Logo + navegación (Residential · Commercial · Team · Contact). En móvil, menú desplegable no modal: botón con `aria-expanded` y `aria-controls`; al abrirse, el panel empuja el contenido (no lo cubre); Esc o el mismo botón lo cierran y el foco vuelve al botón; elegir un enlace lo cierra. Sin megamenú |
| Tarjeta de inmueble | Foto 4:3 → etiqueta de estado literal → título → localidad → «3 bed · 1 bath» (solo si se publica) → precio con periodo. Toda la tarjeta enlaza a la ficha. Zoom suave de la foto al pasar el ratón (desactivado con `prefers-reduced-motion`) |
| Cabecera de ficha | Precio (con periodo si es alquiler) · estado · título · localidad |
| Fila de datos clave | Solo los campos publicados; si falta uno, «Not published» (no se oculta en silencio el que es esperable) |
| Galería | Según §6 (1 o N fotos). Con N > 1: se abre desde el mosaico o desde «View all N photos» como diálogo modal; el foco pasa al diálogo; las flechas ← → cambian de foto y se muestra el contador «3 of 9»; Esc o «Close» la cierran y el foco vuelve al control que la abrió; el fondo queda inerte y sin scroll. Con 1 foto, no hay diálogo |
| CTA de ficha | Escritorio: tarjeta lateral «Request a viewing (demo)» / «Contact (demo)». Móvil: barra inferior fija **que no tapa** contenido, controles, avisos ni el teclado (§9) |
| Insignia «Demo» | Junto a cada dato o función simulada/ilustrativa |
| Aviso legal Hampton | Disclaimer y AML literales, al final de la ficha, con su procedencia |
| Calculadora | Cuota mensual grande + barra de capital e intereses; 4 entradas; supuestos visibles; aviso «Indicative only…» |
| Superficie aérea | Imagen + polígono con la etiqueta «Illustrative boundary – demo» junto al dibujo; sin cifras inferidas |
| Tour 3D | Visor bajo demanda con crédito, licencia y «Example – not this property»; recorrido guiado automático con Play/Pause y saltos manuales por estancia, sin audio y sin autoplay si se prefiere movimiento reducido |
| Formularios | Etiquetas visibles, errores en línea en en-GB, foco gestionado, confirmación ficticia clara |

## 9. Barra fija móvil
- Ocupa el área segura (`env(safe-area-inset-bottom)`) y el contenido reserva su altura (padding inferior), así que **nunca tapa** el último contenido.
- Se oculta cuando hay un formulario abierto o el teclado virtual está visible, y cuando el aviso de cookies o un diálogo están activos.
- No aparece si en la vista ya está visible el mismo CTA.

## 10. Movimiento
Transiciones de 150–250 ms y solo opacidad/transform. Todo se desactiva con `prefers-reduced-motion: reduce`. Sin parallax ni animaciones de entrada en cascada.

## 11. Accesibilidad
WCAG 2.2 AA: contraste de texto y no textual (§3), foco visible (§3), reflujo (§5), apertura y cierre con retorno del foco en la galería y el menú (§8), navegación completa por teclado, objetivos táctiles ≥ 44 × 44 px, estados de error anunciados (`aria-live`) y textos alternativos (§6). Idioma del documento `en-GB`.

## 12. Prohibido (antislop)
Degradados decorativos sin propósito, glassmorphism, iconos genéricos de relleno, testimonios o cifras inventados, insignias de «premium» sin fuente, carruseles automáticos, tipografía por defecto sin elección, sombras pesadas, emojis en la interfaz.

## 13. Evidencia y pendientes
- Evidencia: `docs/evidence/2026-10-03/` (capturas de Hampton y de las referencias; uso interno).
- La revisión 04 fija la dirección usada por esta demo local. Una futura identidad de producción o la publicación siguen fuera de alcance y requerirían su propia revisión.
- Skills de la fase de implementación: `impeccable` (craft-floor, polish, audit), `antislop` y `antislop-ui`, `web-performance-optimization`, `frontend-security-coder`, `security-best-practices`.
