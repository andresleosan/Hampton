# 008 · Sección comercial y negocios

> **APROBADA PARA PLANIFICACIÓN** (reglas funcionales), 2026-10-03, revisión 03 (D-051). Prioridad P2: la interfaz llega **después** del recorrido residencial (D-026). Los datos se importan desde el principio (spec 001).
> **Cambio 2026-10-03 (`/sdd-change`, P-S2, P-S2-V y P-S5, D-076):** las cuestiones de clasificación y de etiquetas quedan resueltas (D-075, D-072); nota sobre las cifras de S-03; cambia la columna «Verificación» de AC-008-01 (P-S2-V). El criterio de ningún AC cambia.
> **Cambio 2026-10-04 (`/sdd-change`, higiene documental, D-090):** la tarjeta del listado con solo Premium o Turnover queda resuelta (D-088). El criterio de ningún AC cambia.

## Objetivo
Mostrar los comerciales y negocios en una sección independiente, con una ficha adaptada que respete la separación de cifras y la confidencialidad (D-027).

## Alcance
- **Listado comercial propio,** separado del residencial:
  - Las dimensiones son las de la spec 002: operación tal como se publica (venta, lease o traspaso), estado y localización.
  - Se conservan aparte la clasificación de origen y la de presentación.
  - Cada inmueble aparece una sola vez. Los de estado `cerrado` llevan su etiqueta **literal** («Sold», «Let»…; un alquiler o lease cerrado nunca se presenta como vendido) y nunca un estilo de disponible.
  - El orden es el de la spec 002.
- **Ficha adaptada:**
  - Cifras separadas: precio de venta, traspaso, renta con periodo y facturación.
  - Descripción según la política de confidencialidad de abajo.
  - Galería (1…N).
  - Aviso legal.

**Fuera de alcance:** la calculadora hipotecaria residencial (spec 005), comparar operaciones distintas, y la superficie aérea y el mapa en ubicaciones confidenciales.

## Confidencialidad frente a reproducción literal
- **En la salida pública, la confidencialidad prevalece sobre la reproducción literal** de los textos de Hampton (REQ-021).
- El original autorizado se conserva **en privado** en SQLite (spec 001). No se reescribe ni se resume en silencio.
- Un inmueble cuya ubicación se publica como «Confidential» no puede revelar su dirección ni su ubicación identificable por ninguna vía de la salida pública:
  - título, descripción, pies de foto o texto alternativo;
  - nombres de archivo o rutas de las imágenes;
  - el slug de la página o el enlace a la fuente;
  - metadatos exportados o EXIF.
- **Política pública aprobada (D-044):**
  1. **Por defecto,** la descripción de un inmueble confidencial **no se publica**. En su lugar se muestra el aviso «Full description withheld in this demo to protect the confidential location.».
  2. Tras una revisión humana, la descripción puede publicarse:
     - **literal**, si no contiene datos de ubicación;
     - **con omisiones visibles**, marcadas como «[location withheld]», si los contiene. Nunca se omite nada en silencio.
  3. Lo que esté pendiente de revisión no se publica completo por ser «texto original». El original completo permanece privado.
- **Revisión previa de los demás campos que puedan revelar la ubicación:**
  - Las **fotos** de un inmueble confidencial no se exportan hasta que se aprueban una a una, por si muestran rótulos o fachadas identificables. Se publican con rutas propias, sin el nombre de archivo de la fuente.
  - El **título** y el **texto alternativo** se revisan igual. Mientras el título no esté aprobado, el inmueble confidencial **no se exporta**: aparece en el informe de construcción y en pendientes, en lugar de publicarse con un título inventado.
  - La localidad, el enlace a la fuente y el slug de origen nunca se publican para un confidencial (spec 009).

Esto es una prevención; **no** afirma que exista hoy una filtración.

## Requisitos
- **Propietaria de:** REQ-020.
- **Consume y verifica:**
  - REQ-016 (propietaria 001), REQ-015 (propietaria 001) y REQ-017 (propietaria 003);
  - REQ-006 (no comparar operaciones; propietaria 003) y REQ-021 (propietaria 002).
- Principios C-2 y C-8. DESIGN §8.

## Criterios de aceptación
| ID | Criterio (EARS) | Verificación |
|---|---|---|
| AC-008-01 | La ficha *shall* mostrar cada cifra con su etiqueta y su periodo propios (p. ej. «Premium £90,000» solo si la fuente lo identifica; si no, el texto original con la marca de revisión) | Tests con S-06…S-09 y con fixtures sintéticas con la forma de Pontac Hotel y Guest House (cifras de S-03), más su prueba privada con los casos reales (D-063) |
| AC-008-02 | *Where* la ubicación es «Confidential», *shall not* mostrarse dirección, mapa, vista aérea, enlace a la fuente ni ningún identificador de ubicación por las vías enumeradas en «Confidencialidad» | Test con Café and Accommodation sobre todos los archivos de la salida |
| AC-008-03 | La sección comercial *shall not* mostrar la calculadora hipotecaria residencial | Test |
| AC-008-04 | Las recomendaciones *shall not* comparar operaciones distintas (venta frente a lease, traspaso frente a precio) | Test |
| AC-008-05 | Un dato marcado `para_revision` *shall* mostrarse como texto original sin normalizar solo si ese campo está en la lista pública (spec 009) y no está retenido por confidencialidad; *otherwise*, *shall* mostrarse el aviso de retención | Test con una cifra en revisión de un inmueble normal y con la descripción de uno confidencial |
| AC-008-06 | *If* el estado literal entra en conflicto con la URL (p. ej. slug «sold» y estado «For Sale»), *shall* mostrarse el estado publicado en la página y el conflicto *shall* quedar en pendientes | Test con S-08 |
| AC-008-07 | *Where* el inmueble es confidencial y su descripción no está aprobada tras revisión, *shall* mostrarse el aviso de retención en lugar de la descripción | Test |
| AC-008-08 | Con un fixture de inmueble confidencial que contiene una dirección centinela (p. ej. «12 Example Street, St Helier») en la descripción, en el título original, en el texto alternativo y en el nombre de archivo de una foto, y cuyo slug y enlace de origen la incluyen, esa dirección (y su forma en slug, p. ej. `12-example-street`) *shall not* aparecer en ningún archivo de la salida pública: HTML, datos, rutas, nombres de imagen, enlaces, texto alternativo, manifiesto ni metadatos de imagen | Escaneo de la carpeta generada (contenido, nombres de archivo y metadatos EXIF/XMP) en busca de las cadenas |
| AC-008-09 | Cada inmueble comercial *shall* aparecer una sola vez en el listado, con un orden determinista; los `cerrado` *shall* llevar su etiqueta literal y *shall not* tener estilo de disponible | Test con una venta vendida y un lease cerrado |
| AC-008-10 | Una fotografía de un inmueble confidencial sin revisión aprobada *shall not* exportarse (ni el archivo ni ninguna referencia a ella); y un inmueble confidencial sin título aprobado *shall not* exportarse | Test de construcción con una foto aprobada y otra sin revisar, y con un título sin aprobar |

## Dependencias
001 (datos), 002 y 003 (componentes compartidos), 009 (lista pública), y el recorrido residencial terminado.

## Cuestiones pendientes
- Resuelto (D-075): Pontac Hotel y Guest House se presentan en la sección comercial. Su clasificación de origen (listado residencial) se conserva aparte. Sus cifras vienen del listado residencial (S-03) y siguen la regla de AC-008-01: la etiqueta de su tipo solo si la fuente lo identifica; si no, el texto original con la marca de revisión. El cambio de sección no cambia el tipo de una cifra por suposición.
- Resuelto (D-044): retención por defecto y revisión previa de fotos y campos identificativos.
- Resuelto (D-072): etiquetas en-GB de las cifras: `sale_price` «Sale price», `rent` «Rent», `premium` «Premium», `turnover` «Turnover» y `other` «Figure as published»; periodicidad «per month», «per week» y «per annum»; cifra dudosa «As published – under review». Se usan tal cual en 008 y en 009.
- Resuelto (D-088): si un inmueble comercial solo publica un Premium o un Turnover, sin precio de venta ni renta, su tarjeta del listado muestra la primera cifra con su etiqueta de D-072 (p. ej. «Premium £150,000»). No se oculta un dato publicado.
