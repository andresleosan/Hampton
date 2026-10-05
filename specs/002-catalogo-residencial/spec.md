# 002 · Inicio y catálogo residencial

> **APROBADA PARA PLANIFICACIÓN** (reglas funcionales), 2026-10-03, revisión 03 (D-045, D-051). Prioridad P1. Ningún criterio está superado sin evidencia de ejecución.
> **Cambio 2026-10-03 (`/sdd-change`, P-B3, D-067):** cambian AC-002-10 y la nota de operación desconocida en Jersey, que pasa a regla aprobada. Ningún otro AC cambia.
> **Cambio 2026-10-03 (`/sdd-change`, P-S1, P-S3 y P-S7, D-076):** la nota de clasificación de presentación recoge D-075; cambia la columna «Verificación» de AC-002-10 y AC-002-13; Pathfield Road London sale de las cuestiones pendientes. El criterio de ningún AC cambia.
> **Cambio 2026-10-04 (`/sdd-change`, P-S8, D-081):** la columna «Verificación» de AC-002-10 excluye del conjunto a los inmuebles «no vistos en la última importación» (AC-009-16). El criterio de ningún AC cambia.
> **Cambio 2026-10-04 (`/sdd-change`, D-083):** cambia la columna «Verificación» de AC-002-02: «nunca £0» se prueba con una fixture sintética, y «Spacious 4 Bedroom Family Home» (sin operación) se comprueba como excluido. El criterio de ningún AC cambia.
> **Cambio 2026-10-04 (`/sdd-change`, higiene documental, D-090):** se fija el criterio de los inmuebles destacados del inicio (D-087). El criterio de ningún AC cambia.
> **Cambio 2026-10-04 (`/sdd-change`, P-S10, D-092):** la columna «Verificación» de AC-002-10 excluye del conjunto a los inmuebles con título vacío en la fuente (AC-009-17). El criterio de ningún AC cambia.

## Objetivo
Que la dirección de Hampton recorra sus inmuebles reales en un catálogo editorial, claro en el móvil, sin compra ni checkout (D-002).

## Alcance
- **Inicio:**
  - Presentación de la agencia con datos publicados.
  - Inmuebles destacados: los 3 primeros de la pestaña For sale, en su orden de origen (D-087).
  - Acceso al catálogo y al equipo.
- **Catálogo residencial e internacional** organizado en pestañas, con una matriz de inclusión inequívoca (abajo).
- **Tarjeta:** según DESIGN §8, con el estado literal y el precio con su periodo.
- **Menú de navegación**, incluido el de móvil: según DESIGN §8.

**Fuera de alcance:** carrito, checkout y pagos (D-002); la sección comercial (spec 008); el mapa interactivo; filtros adicionales (dormitorios, precio).

## Dimensiones (separadas) y matriz de inclusión [aprobada, D-045]
Cada inmueble tiene tres dimensiones independientes, que vienen de 001:
- **Operación:** `venta` · `alquiler` · `desconocida`.
- **Estado:**
  - Se guarda el literal tal como se publica (FOR SALE, TO LET, UNDER OFFER, SOLD, Lease o sin estado).
  - Además, un normalizado: `abierto` · `cerrado` (SOLD en venta; LET o equivalente en alquiler) · `sin estado`. `cerrado` **no** equivale a «Sold»: la etiqueta mostrada es siempre la literal correspondiente («Sold», «Let»…), y un alquiler cerrado nunca se presenta como vendido.
  - El estado `abierto` **no** implica disponibilidad actual (C-3).
- **Geografía (localización):** `Jersey` · `internacional`.

Además se guardan, por separado:
- la **clasificación de origen**: la sección de la fuente donde apareció; nunca se modifica;
- la **clasificación de presentación**: la sección donde se muestra. Por defecto es igual a la de origen. Los tres casos ambiguos conocidos tienen la presentación decidida (D-075): Pontac Hotel y Guest House, en la sección comercial (spec 008), y Pathfield Road London, en la pestaña International. Su clasificación de origen (listado residencial) no cambia. Un caso ambiguo nuevo conserva la de origen y su ReviewItem hasta que se decida.

**Regla 0 (prioridad sobre la matriz):** un caso ambiguo con ReviewItem de clasificación abierto se muestra según su clasificación de origen hasta que se revise; la matriz general no lo reclasifica.

Pestañas, cada una con un **único** destino por inmueble (nadie aparece en dos pestañas):

| Pestaña | Incluye | Etiqueta en la tarjeta |
|---|---|---|
| For sale | Jersey + venta + estado `abierto` o `sin estado` | Estado literal (p. ej. «Under offer») |
| To let | Jersey + alquiler + estado `abierto` o `sin estado` | Estado literal |
| Sold / Let | Jersey + estado `cerrado` (venta o alquiler) | El literal («Sold» o «Let»), nunca un estilo de disponible |
| International | Toda geografía internacional, de cualquier operación y estado (también los cerrados) | Estado literal; si está `cerrado`, su literal («Sold» o «Let») y nunca un estilo de disponible |

- Operación `desconocida` en Jersey: genera un ReviewItem y nunca se coloca por suposición. Queda fuera de las pestañas y figura en el informe de construcción y en pendientes hasta que una resolución le asigne una operación.
- **Orden [aprobado]:** el orden de aparición en el listado de la fuente en la última importación aceptada; en caso de empate, la clave estable. En International, primero los `abierto` y después los `cerrado`. La fuente no publica fechas fiables, así que no se ordena por «más reciente».
- **Sin resultados:** «No properties to show in this section.», con enlaces a las otras pestañas.
- **Restablecer:** «Show all for sale» vuelve a la pestaña por defecto (For sale) y al orden por defecto.
- La pestaña activa puede ir en la URL. No es un dato personal.

## Requisitos
- **Propietaria de:** REQ-004 y REQ-021 (en-GB; transversal, verificada también en 003–008).
- **Consume y verifica:** REQ-002 y REQ-015 (presentación; propietaria 001), y REQ-012 (avisos de demo; propietaria 009).
- SC-01 y SC-03. Principios C-1 y C-3. DESIGN §3–8 y §11.

## Criterios de aceptación
| ID | Criterio (EARS) | Verificación |
|---|---|---|
| AC-002-01 | *When* un inmueble es de alquiler, la tarjeta *shall* mostrar el importe con su periodo en formato en-GB («£1,900 per month») | Playwright sobre Trinity rental y 3 Sheilings |
| AC-002-02 | *If* el precio es `null`, la tarjeta *shall* mostrar el texto original o «Price not published», nunca «£0» | Test de componente con fixtures sintéticas de un inmueble sin precio (importe `null`) y con operación conocida, una con texto original no numérico y otra con el precio vacío: en ambos casos la tarjeta muestra el texto original o «Price not published», nunca «£0» (D-063). SOURCES §4 no registra otro caso real sin precio y con operación conocida. Prueba privada con «Spacious 4 Bedroom Family Home» (D-063; «no ejecutada» hasta la importación real): sin operación, no aparece en ninguna pestaña y consta como excluido (`no-tab`) en el informe de construcción y en pendientes (AC-002-10, D-067) |
| AC-002-03 | *When* se elige una pestaña, el catálogo *shall* mostrar exactamente los inmuebles que le asigna la matriz de inclusión, sin mezclar alquiler con venta | Test de componente con fixtures que cubren cada combinación de operación, estado y localización + Playwright |
| AC-002-04 | Un inmueble con estado `cerrado` *shall not* aparecer en For sale ni en To let, ni con estilo de disponible. Uno de Jersey aparece en «Sold / Let» y uno internacional en International, siempre con su etiqueta literal: un alquiler cerrado *shall not* mostrarse como «Sold» | Test con 4 fixtures: venta vendida y alquiler alquilado, de Jersey y de fuera |
| AC-002-05 | El documento *shall* tener 0 px de desbordamiento horizontal a 320, 390 y 1280 px de ancho, y *shall* refluir al 400 % de zoom sobre 1280 px sin pérdida de contenido ni función (DESIGN §5) | Playwright: `scrollWidth == clientWidth` en cada ancho + comprobación de reflujo |
| AC-002-06 | El catálogo *shall not* contener carrito, checkout, «buy now» ni campos de pago | Test de contenido |
| AC-002-07 | Toda la interfaz *shall* estar en en-GB y los textos de Hampton *shall* mostrarse literalmente, salvo lo que retenga la confidencialidad (spec 008, AC-008-07) | Test de cadenas + revisión |
| AC-002-08 | Las tarjetas *shall* cumplir DESIGN §11: contraste AA de texto, contraste ≥ 3:1 de los indicadores no textuales, foco visible y objetivo táctil ≥ 44 px | Auditoría automática de accesibilidad + revisión manual |
| AC-002-09 | Los datos de las tarjetas *shall* coincidir con SQLite y con SOURCES en estado, operación, precio y periodo (SC-02) | Test de contraste de datos |
| AC-002-10 | Cada inmueble *shall* aparecer en una sola pestaña y una sola vez, salvo el residencial de Jersey con operación desconocida, que *shall not* aparecer en ninguna y *shall* figurar en el informe de construcción y en pendientes | Test: la unión de las pestañas es igual al conjunto residencial e internacional menos los de operación desconocida en Jersey, sin duplicados; cada excluido consta en el informe. El conjunto se cuenta por la clasificación de presentación vigente (la de origen mientras rija la Regla 0), no por la de origen: un inmueble con presentación comercial (p. ej. Pontac Hotel tras D-075) no forma parte de él. Tampoco forman parte de él los inmuebles «no vistos en la última importación», que no se exportan (AC-009-16), ni los inmuebles cuyo título la fuente publica vacío, que tampoco se exportan (AC-009-17) |
| AC-002-11 | El orden de cada pestaña *shall* ser determinista: dos construcciones con los mismos datos aceptados dan el mismo orden | Test |
| AC-002-12 | *If* una pestaña no tiene inmuebles, *shall* mostrar el mensaje sin resultados y los enlaces a las demás. «Show all for sale» *shall* restablecer la pestaña y el orden por defecto | Test de componente + Playwright |
| AC-002-13 | La clasificación de origen *shall* conservarse aparte de la de presentación. Un caso en revisión *shall* mostrarse según su origen (Regla 0, con prioridad sobre la matriz), sin reclasificarse por suposición | Test con fixtures sintéticas con la forma de los casos ambiguos (D-063): una con ReviewItem de clasificación abierto que la matriz colocaría en otra pestaña se muestra según su origen, y el registro conserva aparte origen y presentación. Prueba privada con los casos reales (D-063; «no ejecutada» hasta la importación real): con la clasificación decidida (D-075), Pathfield Road London aparece en International, y Pontac Hotel y Guest House no aparecen en ninguna pestaña residencial |
| AC-002-14 | El menú *shall* abrirse y cerrarse con teclado, indicar su estado (`aria-expanded`) y devolver el foco al botón al cerrarse con Esc (DESIGN §8) | Playwright con teclado a 390 px |

## Dependencias
001 (datos). DESIGN.md aprobado.

## Cuestiones pendientes
- Resuelto (D-045): matriz con International para todos los internacionales, pestaña «Sold / Let» y orden de la fuente con desempate estable.
- Resuelto (D-075): «Pathfield Road, London» se muestra en la pestaña International. Su origen (listado residencial; SOURCES §4) se conserva aparte.
- Resuelto (D-087): los inmuebles destacados del inicio son los 3 primeros de For sale, en su orden de origen. Es un criterio determinista que sale de los datos, sin selección editorial; se puede revisar con las maquetas (#6).
- Textos del inicio: solo afirmaciones publicadas por Hampton (p. ej. «Over 40 years experience», marcada como afirmación de Hampton).
