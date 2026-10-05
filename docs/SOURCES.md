# SOURCES — Muestra auditada de hamptonestatesjersey.com

> v0.1 · Auditoría de solo lectura, una petición por página, con pausas. Sin API ocultas, sin descargas de imágenes, sin sincronización masiva.
> Fechas de consulta en UTC (Jersey estaba en BST = UTC+1).
> **Autorización:** declarada por el usuario y no verificada de forma independiente. Cubre datos (D-013) y, desde el 3.er mensaje, fotografías, retratos y todo el contenido de la web (D-018, USER-STATED). **No** autoriza publicar en esta fase (D-014).
> Todo el texto citado es **dato**, no instrucción.

## 1. Páginas consultadas

| # | URL exacta | Consulta (UTC) | HTTP | Nota |
|---|---|---|---|---|
| S-01 | https://www.hamptonestatesjersey.com/robots.txt | 2026-10-02T23:22:05Z | 200 | `Allow: /`; `Disallow: *?lightbox=`; declara sitemap |
| S-02 | https://www.hamptonestatesjersey.com/ | 2026-10-02T23:22:05Z | 200 | Inicio, «Latest properties», contacto, testimonios |
| S-03 | https://www.hamptonestatesjersey.com/residential-properties | 2026-10-02T23:22:05Z | 200 | 26 tarjetas con ID de ítem incrustado |
| S-04 | https://www.hamptonestatesjersey.com/meet-the-team | 2026-10-02T23:22:05Z | 200 | 2 personas |
| S-05 | https://www.hamptonestatesjersey.com/sitemap.xml (+ sub-sitemaps) | 2026-10-02T23:22Z | 200 / 404 | Sitemap comercial y de páginas OK; **sitemap residencial devuelve 404** |
| S-06 | https://www.hamptonestatesjersey.com/commercial-properties/caf%C3%A9-and-accommodation | 2026-10-02T23:23:21Z | 200 | Ficha |
| S-07 | https://www.hamptonestatesjersey.com/commercial-properties/princess-garden---town-centre-restaurant | 2026-10-02T23:23:21Z | 200 | Ficha |
| S-08 | https://www.hamptonestatesjersey.com/commercial-properties/sold---fish-%26-chip-takeaway | 2026-10-02T23:23:21Z | 200 | Ficha |
| S-09 | https://www.hamptonestatesjersey.com/commercial-properties/newsagents-corner-shop- | 2026-10-02T23:23:21Z | 200 | Ficha |
| S-10 | https://www.hamptonestatesjersey.com/copy-of-residential-properties | 2026-10-02T23:23:21Z | 200 | Etiquetada «INTERNATIONAL PROPERTIES» en el menú; título HTML «RESIDENTIAL»; 7 tarjetas |

**Plataforma observada:** Wix (`meta generator: Wix.com Website Builder`). Pie: «Website by Rosa James Designs».
**Términos, privacidad o copyright:** no se encontró enlace en la portada ni en el sitemap de páginas → condiciones de reutilización **no verificadas**.

## 2. Limitaciones registradas
- L-01: Las fichas residenciales no exponen su URL en el HTML estático (los enlaces «MORE DETAILS» se generan en el cliente) y el sitemap residencial da 404. Sin navegador operativo (Playwright bloqueado, D-006) **no se pudo abrir ninguna ficha residencial**. No se adivinaron rutas.
- L-02: Por eso las 4 fichas de detalle auditadas son **comerciales** (las únicas con URL pública en el sitemap). Venta y alquiler residenciales solo constan a nivel de tarjeta (S-03).
- L-03: La página de listados muestra paginación («1 … 1»); no se puede confirmar que las 26 tarjetas sean el inventario completo.
- L-04: Las fechas `lastmod` del sitemap no prueban disponibilidad actual. **Ningún estado se interpreta como disponibilidad vigente**; solo «tal como aparecía en la fecha de consulta».

## 3. Esquema de registro y reglas de normalización
- `precio_original`: texto literal tal como aparece.
- `importe`: número o `null`. «Negotiable», «Confidential», «POA», vacío → `null` (nunca 0).
- `moneda`: `GBP` si aparece «£»; si no, `null`.
- `operacion`: `venta` / `alquiler` / `null`, solo cuando el texto lo dice.
- `periodo`: `mensual` (pm, pcm, per month) / `anual` (PA) / `null` en venta.
- `estado`: etiqueta literal (FOR SALE, TO LET, UNDER OFFER, SOLD…); sin etiqueta → `null`.
- Dormitorios/baños: en S-03 cada tarjeta muestra dos números bajo los filtros «BEDROOMS» y «BATHROOMS». **Inferencia**: el primero son dormitorios y el segundo baños (lo corroboran los textos, p. ej. «two-bedroom» con 2/1). Si aparece un espacio invisible o «N/A» → `null`.
- Superficie: **ninguna tarjeta ni ficha publica una superficie numérica** (en las fichas aparece el rótulo «Square Footage» sin valor) → `null`. La única superficie observada es textual (Manoir De Trevenou, terreno de 7500 m² en la descripción).

## 4. Registros residenciales e internacionales (tarjetas de S-03)

ID = ID de ítem Wix incrustado en S-03. Descripción abreviada; el texto completo se queda en la fuente.

| ID (Wix) | Título | Localidad | Estado | Dorm. | Baños | precio_original | importe | moneda | operación | periodo | Observaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|
| d8dacb1f-1aef-4f5c-ab47-9a8b871978d0 | Le Bernage, Rue Saint Thomas | St Saviour | FOR SALE | 3 | 1 | £779,000 | 779000 | GBP | venta | null | «Semi-detached home» |
| 8c37b8d1-f93b-4134-8c5c-02a032877eb1 | Pontac Hotel | St Clement | FOR SALE | null | null | £4.75m | 4750000 | GBP | venta | null | Hotel + casa adyacente |
| cb6f6543-0a64-4bc1-95b8-209967a10e34 | Playa D'Or | St Clement, Grande Route de la Cote | UNDER OFFER | 3 | 3 | £750,000 | 750000 | GBP | venta | null | Victoriana; en inicio «Asking: £750,000» |
| 38b1444c-61d9-44ee-8e35-0362b859d301 | Victoria Street | St Helier | FOR SALE | 2 | 1 | £460,000 | 460000 | GBP | venta | null | Ático en 3.ª planta; en inicio «NEW» |
| 743d6ad4-d959-4a63-8cf1-4dcd1638b83d | Guest House | St Helier | FOR SALE | null | null | £1.5m | 1500000 | GBP | venta | null | En inicio: «£1.5m (offers welcome)», «Retirement Sale», 32 huéspedes |
| ff11c070-9969-4cd1-b23b-7431061ea8e2 | Modern First Floor Apartment | St Aubin | FOR SALE | 1 | 1 | £450,000 | 450000 | GBP | venta | null | «(Reasonable offers considered)» |
| b1b43893-5951-4c7d-8922-ada1d31bffe5 | 25 Roseville Street | St Helier | SOLD | 6 | 4 | £875,000 | 875000 | GBP | venta | null | Vendido. Renta declarada £58,320 p.a. = ingreso, no precio |
| d1ca2d7c-0222-4e2e-bedc-125b48b2868d | Winchester Street | St Helier | FOR SALE | 6 | 3 | £575,000 | 575000 | GBP | venta | null | «Freehold»; renta declarada £29,960 p.a. = ingreso, no precio |
| 7df76a63-65c8-436d-aeca-c42af32647af | Grosvenor Street | St Helier | SOLD | 2 | 1 | £485,000 | 485000 | GBP | venta | null | Vendido |
| 3ce6b5b2-8f28-47f9-ad8c-a4632106bc79 | Garden Lane | St Helier | SOLD | 1 | 1 | £300,000 | 300000 | GBP | venta | null | Vendido |
| d5967950-e0be-4776-a579-76f8ef3d3648 | Trinity rental | Trinity | TO LET | 2 | 1 | £1,900 per month (negotiable) | 1900 | GBP | alquiler | mensual | También «£1900 pcm negotiable. Licensed, Entitled.» |
| a23f0989-2988-4f06-89f5-8ce69aab63e8 | Town House | St Helier | FOR SALE | 4 | 1 | £780,000 | 780000 | GBP | venta | null | En inicio aparece un «4 Bedroom House… Howard Davis Park» a «Asking: £825,000»: **¿mismo inmueble con otro precio?** No se infiere; pendiente P-12 |
| f2eb59e7-849a-4e7a-b661-644062ece7a7 | Great Business Opportunity | St Helier | Sold | 6 | 3 | £875,000 | 875000 | GBP | venta | null | Texto casi idéntico a 25 Roseville Street → **posible duplicado** (P-12) |
| 41b0dabe-c7af-472b-954a-d9e284178f72 | 3 Sheilings, Gorey | Grouville | To Let | 4 | 3 | £2,800pm | 2800 | GBP | alquiler | mensual | |
| ce7687c1-2e8e-4a51-bf70-2ff49f325cac | Gorey Villas | Grouville | FOR SALE | 5 | 3 | £925,000 | 925000 | GBP | venta | null | El texto dice «4/5 bedrooms» frente al 5 de la tarjeta |
| a52a7206-fc73-4079-960c-9c1c980ff5ad | Val Plaisant - 1st Floor Flat | St. Helier | FOR SALE | 2 | 1 | £359,000 | 359000 | GBP | venta | null | |
| 8c8bf11a-1c06-4475-9446-f84ad63773d6 | Le Grand Pre | Grouville | FOR SALE | 3 | 2 | £845,000 | 845000 | GBP | venta | null | Bungalow |
| 91c754ff-5306-4626-87f1-c7191e6807ff | Pathfield Road, Streatham, London | London | FOR SALE | 2 | 1 | £450,000 | 450000 | GBP | venta | null | Fuera de Jersey, pero en el listado residencial y no en el internacional |
| 8eb8ffab-925f-49da-926a-3e75af41a41a | Spacious 4 Bedroom Family Home | St Helier | null | 4 | 2 | (vacío) | null | null | null | null | Sin estado ni precio publicados |
| 7eefaf13-5e95-44b7-8155-abb118215c54 | Bay View - Spain, Galicia | Galicia, Spain | FOR SALE | 4 | 2 | £136,000 | 136000 | GBP | venta | null | También en S-10 (internacional) |
| 1fa44cf0-4c02-40f0-9243-9843f5e44577 | Ferreira do Alentejo | Alentejo, Portugal | FOR SALE | 3 | 2 | £250,000 | 250000 | GBP | venta | null | También en S-10 |
| defec230-3bf1-4e44-8d4a-39d2bdd4412e | Louargat | Brittany, France | FOR SALE | null | null | £87,000 | 87000 | GBP | venta | null | La tarjeta dice «N/A» en dormitorios y baños |
| f5c45914-dfec-4cfe-b142-143985c7c181 | Loudeac | Brittany, France | FOR SALE | 7 | 2 | £300,000 | 300000 | GBP | venta | null | Sin descripción |
| edb3681e-2cec-4991-bd5f-7468d1c30ab8 | Lourinha E Atalaia | Lourinha, Portugal | FOR SALE | 5 | 2 | £148,000 | 148000 | GBP | venta | null | |
| 9c0f9d02-902e-4989-9682-6f5a33e8e013 | Magnolia Gardens | St Lawerence (literal) | FOR SALE | 4 | 3 | £1,400,000 | 1400000 | GBP | venta | null | Alquilado a £33,000 P.A. con contrato de 4 años = ingreso, no precio |
| 9a8bdd7c-5a0c-4280-b6cf-9d1d723f8594 | Manoir De Trevenou | Brittany, France | FOR SALE | 3 | 2 | £574,000.00 | 574000 | GBP | venta | null | El texto cita un terreno de 7500 m² (superficie de **terreno**, solo textual) |

Las 7 tarjetas de S-10 (internacionales) repiten inmuebles extranjeros de S-03. La coincidencia de IDs no se comprobó.

## 5. Fichas de detalle auditadas (4 de un máximo de 6; todas comerciales, ver L-02)

| Ref. | Título | Ubicación publicada | Estado literal | precio_original | importe | moneda | operación | periodo | Tipo | Superficie | Observaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S-06 | Café and Accommodation | «Confidential» | For Sale | Negotiable | null | null | null | null | vacío → null | null | La descripción habla de un arrendamiento de larga duración con «in-going»: **conflicto** entre «For Sale» y el arrendamiento. Contador de galería «1/0» |
| S-07 | Princess Garden - Town Centre Restaurant | Halkett Street - St Helier | For sale | £90,000 | 90000 | GBP | null (ambigua) | null | Commercial | null | Además: «Rental of £60,000.00 PA», contrato de 9 años con opción de ruptura en los años 3 y 6. Dos cifras: el importe de 90 000 **no** se interpreta como precio de compra del inmueble. 9 imágenes |
| S-08 | Fish & Chip Takeaway | Hill Street, St Helier, Jersey | For Sale | £35,000 | 35000 | GBP | null (ambigua) | null | Restaurant | null | «RENTAL: £21,000 PA», contrato de 9 años. **Conflicto**: la URL contiene «sold---» y la página dice «For Sale» |
| S-09 | Newsagents, St Helier | vacía | Lease | Negotiable | null | null | null | null | vacío → null | null | «Turnover in excess of £700,000 per annum» = facturación, no precio |

Todas las fichas incluyen el texto «Disclaimer» y «Anti Money Laundering» de Hampton y, como contacto por inmueble, el teléfono 01534 727582 y el email francopropertiesjersey@gmail.com.

**Campos de ficha observados (plantilla Wix):** título, ubicación, estado, precio, galería con contador, «Property Description», «Contact us about this property», «Property Details» (Property Type, Square Footage, Property Location), Disclaimer, Anti Money Laundering.

## 6. Equipo (S-04)

| Nombre (tal como aparece) | Cargo (tal como aparece) | Contacto publicado | Retrato |
|---|---|---|---|
| GILBERTO FRANCO | Managing Director | Tel. 07797 718199 y 01534 727582; enlace «Email me» | La página carga imágenes JPG (p. ej. `.../media/fba528_107bce8685114ed09b445129fd865f49~mv2.jpg`); **no se verificó qué imagen corresponde a qué persona** |
| JOSHUA FRANCO | Negotiator | Tel. 01534 727582; enlace «Email me» | Ídem |

Los dos «Email me» apuntan a `francopropertiesjersey@gmail.com`. No se publican credenciales profesionales ni biografías → `null`. No se añade nadie.

## 7. Datos corporativos observados (S-02)
- Oficina: 42 Bath Street, St. Helier, Jersey JE2 4ST. Teléfonos: 01534 727582 y 07797 718199. Email: francopropertiesjersey@gmail.com.
- Afirmaciones publicadas, **no verificadas**: «Over 40 years experience», «Free property valuation», «No sale no fee», «Central Jersey offices».
- Testimonios con nombres de terceros (Paolo Campini, Angela Peterson, Paul & Susan Taylor): son datos personales de clientes. No se reutilizan sin confirmar el consentimiento (P-14).
- Redes: Instagram `hamptonestatesjersey`, Facebook `hamptonestatesjsy`.

## 8. Imágenes (procedencia pendiente; no descargadas ni reutilizadas)
- CDN: `static.wixstatic.com/media/…`. Ejemplos de nombres de archivo de las fichas: «DSC_0117.JPG» (S-07), «Corner shop 1.jpg» (S-09).
- Autor y licencia: **desconocidos**. Estado: `autorizado-por-declaración` (D-018, USER-STATED). Siguen sin descargarse: se descargarán solo dentro de una tarea aprobada y conservando la URL de origen.

## 9. Observado · inferido · propuesto
- **Observado:** todo lo de las tablas anteriores, salvo lo marcado como inferencia.
- **Inferido:** el orden dormitorios/baños; la «Town House» y el «4 Bedroom House» del inicio podrían ser el mismo inmueble; «Great Business Opportunity» podría duplicar 25 Roseville Street. Ninguna inferencia se trata como dato.
- **Propuesto:** reglas de normalización (§3); no mostrar los vendidos como disponibles; los ingresos por alquiler, la facturación y las rentas de contrato nunca se tratan como precio.

## 10. Evidencia sobre rutas dinámicas (v0.4 · leída del HTML ya descargado de S-03, sin peticiones nuevas)
- `"collectionId":"ResidentialDataset"`; prefijos de router: `/residential-dataset-1`, `/properties`, `/commercial-properties`, `/copy-of-residential-properties`.
- `pageRole` `03298bd2-b5ba-48f9-a554-fac7938d19fc` coincide con el sub-sitemap residencial que da 404 (S-05).
- **Inferencia sin verificar:** las fichas residenciales podrían servirse en `/residential-dataset-1/<slug>` o `/properties/<slug>`. No se ha hecho ninguna petición para comprobarlo (P-16, alternativa 2).

## 11. Calidad de las fotos de Hampton (**CORREGIDA en v0.8**: la primera medición usaba un patrón laxo que emparejaba mal el ancho y el alto e inflaba el recuento a 301; se conserva abajo tachada) (v0.7 · medida con los metadatos de ancho y alto de los originales que Wix incluye en el HTML ya descargado; sin descargar imágenes)
- ~~Listado residencial (S-03): 301 fotos de más de 200 px. Ancho ≥ 800 px: 197 (65 %); ≥ 1200 px: 120 (39 %); ≥ 1600 px: 61 (20 %); ≥ 2000 px: 18 (5 %). Verticales: 101 (≈ 1/3).~~
- **v0.8, medición corregida** (objetos JSON de imagen completos: `height`, `width`, `fallbackTitle`, `uri`): el listado expone **26 portadas** con metadatos. Lado largo: mediana de 1024 px; ≥ 1200 px: 8; ≥ 1600 px: 7; ≥ 2000 px: 3. Verticales: 7. Comprobación: en 2 imágenes se leyó la cabecera JPEG del archivo servido **sin transformación** (petición parcial `Range`, sin descarga completa): 1024×768 y 1536×2048, iguales a los metadatos → son los **originales subidos**, no versiones reducidas por Wix. Las galerías residenciales no se pudieron medir (L-01).
- Fichas comerciales: Princess Garden 3000–4000 px; Newsagents 1536 px; Fish & Chip ≈ 1000–1200 px; Café sin fotos útiles.
- Retratos del equipo (S-04): los textos alternativos («IMG_3020.JPG», «LOU_0316-scaled_edited.jpg») no permiten asociar la foto a la persona y no se obtuvieron sus dimensiones → pendiente de verificar visualmente.
- ~~**Implicación de diseño (inferencia):** las imágenes de portada a sangre completa en escritorio (≥ 1600–2000 px) solo son viables con ≈ 5–20 % de las fotos. En móvil (≈ 750–1200 px físicos) lo son con ≈ 40–65 %. La dirección editorial debe usar marcos contenidos, elegir por calidad la foto de portada de cada inmueble y prever la composición de fotos verticales.~~ *(v0.8: conclusión retirada; la decisión sobre la portada queda pendiente de la inspección visual.)*

## 12. Referencias visuales y funcionales (v0.7 · **solo inspiración, nunca datos de Hampton** · consultadas el 2026-10-03 con curl y JS público; sin navegador, así que no se vio el aspecto real)
- **Heider** (https://heidercompany.com/buy, plantilla Luxury Presence). Principios: retícula de 4 columnas en escritorio; **una foto por tarjeta** con altura fija y `cover`; etiqueta de estado; nombre en mayúsculas; datos «BD | BA | superficie»; precio. Tipografía display con serif de un peso y sans de cuerpo, tracking amplio en etiquetas. Paleta casi monocroma con un único acento cálido. Zoom suave de la foto al pasar el ratón. Mucho aire vertical. *No se copian fuentes, colores ni recursos.*
- **DJ & Lindsey** (ficha 100 Tampa Ave). Orden deducido del JS: cabecera con datos clave → galería y tour → «About this property» → «Facts & features» por grupos plegables → **Price history (EXCLUIDO)** → solicitar visita → colegios (EE. UU.) → **«Homes Nearby» (SUSTITUIDO por precio similar)**.
- **Incyte** (calculadora). Entradas: precio, entrada %, tipo %, plazo. Salida: cuota mensual con desglose. Supuestos ocultos de EE. UU. que se excluyen: property tax, seguro, HOA, FHA/VA, USD. Su aviso «Estimate only…» sirve como patrón de transparencia.
- **Sotheby's**: la herramienta recibió un 202 con el cuerpo vacío. Eso **no demuestra** que el sitio esté bloqueado en general (corregido en v0.8). El proveedor del 3D **no se verificó**.
- **Candidatos 3D (R-12)**: escenas de Sketchfab con licencia **CC BY 4.0** (uso comercial permitido con atribución), p. ej. «Studio Apartment» (https://sketchfab.com/3d-models/studio-apartment-c7903169915d478898d35b32b0eac7be). Falta comprobar en un navegador si se pueden recorrer en primera persona y cuánto pesan. Matterport: **no descartado** (corregido en v0.8). Sus Terms of Use (matterport.com/terms-of-use, §2) solo contienen una prohibición general; no hay ninguna cláusula específica sobre incrustar Spaces de otros. Falta revisar los términos de servicio y embed o el permiso del propietario. Ningún candidato se elige sin enlace, licencia y evidencia de recorrido interior.

### Actualización R-12 — Sketchfab (2026-10-05)
- **Modelo usado en la demo local:** «Small Villa», RenderRite, https://sketchfab.com/3d-models/small-villa-6fc3a756dacd40af8c6e4e3b8e674ea2, UID `6fc3a756dacd40af8c6e4e3b8e674ea2`, **CC BY 4.0**; autor, licencia y rótulo «otra propiedad» permanecen visibles. Sustituye a «Duplex» en la demo local.
- **Recorrido integrado:** la Viewer API oficial `1.12.1`, cargada desde `https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js`, mueve la cámara por Kitchen, Office, Bathroom, Laundry y Master Bedroom, con un punto de tránsito interno; ofrece Play/Pause y selección manual de estancia, no activa audio y no inicia movimiento automático con `prefers-reduced-motion: reduce`. El origen ejecutable adicional es `https://static.sketchfab.com`; el script y el iframe se crean solo después de «Load 3D tour (example)». El runtime obtiene el UID de la `embed_url` validada, cuya ruta debe ser exactamente `/models/<model_uid>/embed`.
- **Evidencia (B), visor/embed:** oEmbed permite incrustar cualquier modelo en cualquier web (https://sketchfab.com/developers/oembed); Press permite reutilizar embeds y recursos públicos sin pedir permiso (https://sketchfab.com/press); los Terms efectivos el 12-08-2026 contemplan el visor en webs de terceros, conceden la licencia limitada de uso del servicio (§3.3), separan las condiciones de descarga (§4.2.2) y obligan a usar las opciones permitidas y conservar la marca (§5) (https://sketchfab.com/terms); la guía oficial de publicidad documenta el iframe estándar en contenido y anuncios (https://static.sketchfab.com/pages/whitepapers/Sketchfab_White_Paper_3D_Advertising.pdf).
- **Conclusión limitada:** no se acredita un bloqueo de permiso para este iframe estándar, bajo demanda y atribuido en la demo local, siempre que se mantengan marca, opciones permitidas, licencia, autor y separación respecto del inmueble. No es una garantía jurídica absoluta ni autoriza publicación.

## 13. Inspección visual con navegador (2026-10-03 · P3, Chromium sin sandbox · capturas en `docs/evidence/2026-10-03/`)
- **Hampton, inicio** (`hampton-home-desktop.jpg`): cabecera en azul corporativo con el logo de casa en línea blanca; navegación en mayúsculas con sans estrecha; «Latest properties» en bloques de texto + foto; banner de cookies (no se aceptó).
- **Hampton, residencial** (*corregido en v0.10: hallazgo limitado a la muestra*): de 26 tarjetas de `/residential-properties` se probó el botón «MORE DETAILS» en **3**: **Le Bernage, Rue Saint Thomas** (FOR SALE, ref. `f5e216`), **Trinity rental** (TO LET, ref. `f13e562`) y **3 Sheilings, Gorey** (To Let, ref. `f13e668`). En las tres la URL siguió en `/residential-properties` tras el clic. La única ruta comprobada fue `https://www.hamptonestatesjersey.com/residential-dataset-1` → 404. **No se probaron** las otras 23 tarjetas, `/properties/…` ni ninguna ruta con slug. Conclusión limitada: *en esa muestra* no se encontró ficha residencial publicada; no es una conclusión sobre todo el sitio. El listado sí trae en el HTML los campos de cada tarjeta y su portada (con metadatos), así que el importador **puede** no necesitar navegador para esos campos; el resto de la vía sigue en P-16.
- **Hampton, móvil, 390 px** (`hampton-mobile.jpg`): el documento mide **980 px de ancho** → scroll horizontal, títulos cortados, y el banner de cookies ocupa ≈ 25 % de la pantalla. Es la línea base para SC-03.
- **Equipo** (`team2.jpg`): retratos asociados visualmente a cada persona: Gilberto Franco (B/N; nombre de archivo «IMG_3020.JPG»), Joshua Franco (color; nombre de archivo «LOU_0316-scaled_edited.jpg»). Autoría de los retratos desconocida; se sirven a ≈ 284×270. El fondo es una foto de stock de playa (no de Jersey), con derechos no verificados.
- **Fotos** (apreciación visual de las portadas vistas): luz diurna y encuadres no profesionales; contrastan con la fotografía de Heider. **Cámara, autoría y ubicación exacta de las fotos: desconocidas** (no se atribuyen; los nombres de archivo como «IMG_…» no son prueba).
- **Heider** (`heider-desktop.jpg`, `heider-mobile.jpg`): 4 columnas; foto casi cuadrada; título en serif espaciada y mayúsculas en tono cobre; precio espaciado; botón píldora cobre; tarjeta gris azulada. En móvil, una columna con foto ≈ 16:10.
- **DJ & Lindsey** (`dj-top.jpg`): mosaico de galería (1 + 4) con «See all 23 photos»; la foto principal es **aérea con el lindero dibujado en rojo**; precio grande → dirección → bd/ba/sqft → cuota estimada → fila de datos (Type, Year built, Lot size, Price/sqft, HOA); tarjeta lateral «Request a tour» / «Contact agent». Secciones: What's special → Location → Facts & features → **Price history (excluido)** → Schools → Public Records.
- **Incyte** (`incyte-calc.jpg`): cuota «/ month» grande; barras de P&I, Property tax e Insurance (las dos últimas son de EE. UU., se excluyen); 4 entradas (precio, entrada %, interés %, plazo); «Estimate only…». Debajo, «Listing history» (equivalente a Price History, se excluye).
- **Sotheby's**: página de «Human Verification» (CAPTCHA) para el navegador automatizado; **no se eludió**. Proveedor del 3D sin identificar; puede comprobarlo Luis en su navegador.
- **Sketchfab «Studio Apartment»**: licencia «CC Attribution» visible en la página del modelo, descargable, interior de un estudio. Visor no renderizado en este entorno (sin WebGL 2) → sin evidencia de recorrido.
