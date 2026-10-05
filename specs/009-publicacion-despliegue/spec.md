# 009 · Construcción, comprobaciones, despliegue y rollback

> **APROBADOS PARA PLANIFICACIÓN el contrato público y el pipeline local**, 2026-10-03, revisión 03 (D-050, D-051). Prioridad P1 para el pipeline local. El despliegue real (AC-009-03, -04, -07 y -09) queda **pendiente** del proveedor, el presupuesto y el control de acceso.
> **Cambio 2026-10-04 (`/sdd-change`, P-S8, D-081):** los inmuebles y las personas del equipo marcados «no vistos en la última importación» no se exportan (D-079, D-073). AC nuevo AC-009-16. Ningún AC existente cambia.
> **Cambio 2026-10-04 (`/sdd-change`, P-S10, D-092):** los inmuebles con título vacío en la fuente y las personas del equipo con nombre vacío no se exportan. AC nuevo AC-009-17. Ningún AC existente cambia.

## Objetivo
Generar una versión independiente del sitio a partir de los campos públicos aprobados, comprobarla y publicarla solo si lo supera todo. Ante cualquier fallo, conservar lo último válido de cada estado (D-032, C-10).

## Alcance
- **Pipeline:**
  1. Exportación con el **contrato público** (lista canónica cerrada).
  2. Construcción en una carpeta nueva.
  3. Comprobaciones.
  4. Subida sin promocionar.
  5. Smoke test.
  6. Promoción.
- **Seguridad de la salida:**
  - CSP con los orígenes estrictamente necesarios;
  - cabeceras de seguridad;
  - `noindex` mientras sea demo.
- **Cierre:** regresión final con Playwright y revisión de seguridad (REQ-014), y cierre de la demo completa.
- Si la construcción copia imágenes de la fuente, lo hace con las mismas reglas de destino y límites que el importador (spec 001, AC-001-16 y -17).

**Fuera de alcance, pendiente de decisión:**
- el proveedor (Cloudflare frente a Vercel; brief §10);
- el acceso público o restringido (P-15);
- el dominio;
- el destino de las copias (BR-4).

No se despliega nada hasta que se decida. Tampoco se añade una transacción distribuida entre la base y la web.

## Dos estados independientes
| Estado | Qué es | Lo protege |
|---|---|---|
| **Conjunto de datos aceptado** | La última base SQLite aceptada (spec 001), con un identificador del conjunto (p. ej. el ImportRun aceptado y el hash de su contenido lógico) | Un fallo de importación conserva los datos aceptados (spec 001) |
| **Versión publicada de la web** | El artefacto completo servido (HTML, datos públicos, imágenes, fuentes y configuración de cabeceras) | Un fallo de construcción, comprobación o despliegue conserva la versión publicada |

- Cada versión registra en su manifiesto el identificador del conjunto de datos del que se generó.
- El rollback recupera **el artefacto completo y sus recursos**. **No** se presupone que haya que revertir también la base.

## Contrato público: lista canónica cerrada [aprobada, D-050]
Solo estos campos salen a la web. Todo campo nuevo o no enumerado, en cualquier nivel de anidamiento, se **excluye por defecto**, y la construcción lo informa (AC-009-10). Ningún objeto es de contenido libre: todas las estructuras anidadas tienen sus claves y tipos enumerados.

**Datos personales.** «Nunca públicos» se refiere a los datos que introducen los visitantes (que la aplicación no guarda; spec 004) y a los datos privados. Sí están autorizados, y solo estos, los datos profesionales de Hampton enumerados en `Agent`: nombre, cargo, retrato, y teléfono y email profesionales publicados (D-018, SOURCES §6).

### `Listing`
| Campo | Tipo | Notas |
|---|---|---|
| `public_id` | string `[a-z0-9-]` | Propio; no deriva del título, la dirección ni el slug de origen |
| `section` | `"residential"` \| `"commercial"` | Clasificación de presentación (Regla 0 de 002) |
| `geography` | `"jersey"` \| `"international"` | |
| `tab` | `"for-sale"` \| `"to-let"` \| `"sold-let"` \| `"international"` \| `null` | Calculado en la construcción (matriz de 002); `null` en comercial |
| `source_order` | entero ≥ 0, **único dentro de su pestaña o sección** | Rango calculado en la construcción con `sortForTab` (orden de la fuente y desempate por la clave estable). El sitio ordena solo por este campo, sin desempates propios |
| `operation` | `"sale"` \| `"rent"` \| `"lease"` \| `"premium"` \| `"unknown"` | |
| `status_literal` | string | Tal como se publica |
| `status_normalised` | `"open"` \| `"closed"` \| `"none"` | |
| `title` | string | Para un confidencial, solo si está aprobado (008) |
| `locality` | string \| `null` | `null` si es confidencial |
| `description_public` | string \| `null` | Literal (no confidencial), texto seguro aprobado o `null` con aviso (008) |
| `description_withheld` | boolean | Activa el aviso de retención |
| `bedrooms`, `bathrooms` | entero \| `null` | Solo si se publican |
| `figures` | `Figure[]` | |
| `media` | `Media[]` | Para un confidencial, solo las fotos aprobadas |
| `legal_notice` | `{ "disclaimer": string, "aml": string }` \| `null` | Literales de Hampton |
| `source` | `{ "url": string, "retrieved_on": "YYYY-MM-DD" }` \| `null` | `null` si es confidencial |
| `similar_ids` | string[] (0–3), con valores `public_id` | Calculado en la construcción (003) solo entre inmuebles exportados; vacío → la sección se oculta |
| `calculator` | `{ "price_gbp": number }` \| `null` | Calculado en la construcción: solo residencial, en venta, `open`, con `sale_price` en GBP fiable (005, AC-005-07). `price_gbp` en libras, con hasta 2 decimales |
| `demo` | `Demo` | |

### `Figure`
| Campo | Tipo |
|---|---|
| `type` | `"sale_price"` \| `"rent"` \| `"premium"` \| `"turnover"` \| `"other"` |
| `amount` | number \| `null` (unidades principales de `currency`, p. ej. libras, con hasta 2 decimales) |
| `currency` | `"GBP"` \| otro código ISO 4217 \| `null` |
| `period` | `"month"` \| `"week"` \| `"year"` \| `null` |
| `label_en` | string (de `figureLabelEn`, propiedad de 008) |
| `display_text` | string (texto público aprobado; para una cifra en revisión, el original público según AC-008-05) |
| `under_review` | boolean (sin motivo ni detalle) |

### Raíz `PublicData`
`{ "listings": Listing[], "agents": Agent[], "tour3d": Tour3D | null }`.

### `Media`
`public_path` (string, ruta propia sin el nombre de archivo de la fuente) · `width`, `height` (enteros) · `alt` (string).

### `Demo` (lista cerrada de claves)
| Clave | Tipo | Significado |
|---|---|---|
| `aerial` | `AerialRef` \| `null` | Bloque 006 para este inmueble (solo si está en la lista aprobada; siempre `null` si es confidencial) |
| `tour3d` | boolean | Mostrar el bloque 007 en la ficha |

### `Agent`
`public_id` · `name` · `role` · `phones` (string[], los publicados para esa persona) · `email` (string \| `null`) · `portrait` (`Media` \| `null`). Solo los profesionales publicados, y nunca una persona marcada «no vista en la última importación» (D-073, AC-004-16) ni una persona cuyo nombre la fuente publica vacío (AC-009-17).

### Recursos ilustrativos (006 y 007), desde configuración local
Proceden de archivos de configuración del proyecto, no de SQLite, y siguen la misma regla de lista cerrada. Si su configuración no existe o está vacía, el bloque no se muestra; un error de esquema hace fallar la construcción, en lugar de ocultar el bloque en silencio.

- **`AerialRef`:**
  - `image` (`Media`) y `image_is_this_property` (boolean; si es `false`, «Example image – not this property»).
  - `credit`, `licence`, `licence_url` y `source_url` (string).
  - `polygon`: lista de `[x, y]`, normalizados de 0 a 1.
  - `areas`: lista de `{ "kind": "plot" | "internal", "value_m2": number, "label_en": string }`, con valores declarados e inventados (006).
  - `boundary_label_en` (string).
- **`Tour3D`** (global, uno solo):
  - `provider_origin` (origen https, que alimenta `frame-src`) y `embed_url`.
  - `model_title`, `author`, `author_url`, `licence`, `licence_url` y `evidence_ref` (string; referencia a la evidencia A/B en SOURCES).
  - `label_en`: «Example – not this property».

### Nunca públicos
- ReviewItem (motivo interno, valor original y metadatos) e ImportRun.
- El HTML de la fuente y el original privado de los textos retenidos.
- Las URL de origen de las imágenes, las rutas internas y las resoluciones de revisión.
- Los datos introducidos por visitantes.

### Qué se calcula antes de generar la web y qué necesita el navegador
- **En la construcción**, a partir de SQLite y de las resoluciones privadas, sin exportar ReviewItem:
  - `tab`, `geography` y `source_order`;
  - la exclusión de cifras en revisión del precio similar y de la calculadora (`similar_ids`, `calculator`);
  - el filtrado de confidenciales (título, fotos y descripción);
  - la exclusión de los inmuebles y de las personas del equipo marcados «no vistos en la última importación» (spec 001, AC-001-04; D-079, D-073): se conservan en SQLite, no se exportan (tampoco como `similar_ids` ni sus imágenes) y constan en el informe de construcción con su motivo, hasta que vuelvan a aparecer en una ejecución completa;
  - la exclusión de los inmuebles cuyo título y de las personas del equipo cuyo nombre la fuente publica vacíos (spec 001 los guarda vacíos, con su pendiente): se conservan en SQLite, no se exportan (tampoco como `similar_ids`, ni sus imágenes ni su retrato) y constan en el informe de construcción con su motivo, hasta que la fuente publique el valor en una ejecución completa;
  - `under_review` como un simple booleano.
- **En el navegador**, solo:
  - la calculadora (a partir de `calculator.price_gbp` y lo que introduce el visitante);
  - los formularios simulados;
  - la galería y el menú;
  - la carga bajo demanda del 3D (a partir de `Tour3D`).
- El navegador no recibe nada que no esté en este contrato.

## Requisitos
- **Propietaria de:** REQ-014, REQ-018 y REQ-012 (verificación transversal de los avisos de demo; cada spec 004–007 verifica los suyos).
- **Consume y verifica:** REQ-022 (publicación; propietaria 001), REQ-013 (propietaria 001) y REQ-009 (CSP; propietaria 007).
- Principios C-8, C-9, C-10 y C-13.

## Criterios de aceptación
| ID | Criterio (EARS) | Verificación |
|---|---|---|
| AC-009-01 | La salida de la construcción *shall not* contener ficheros SQLite, informes de pendientes, credenciales ni campos fuera de la lista canónica | Escaneo automático de la carpeta generada: nombres, extensiones y cadenas centinela |
| AC-009-02 | *If* la construcción falla, la versión publicada *shall* seguir siendo la anterior | Test con fallo inyectado |
| AC-009-03 | *If* el despliegue o el smoke test fallan, la versión servida *shall* seguir siendo la anterior | Prueba real en el proveedor elegido, documentada con evidencia (cuando se apruebe) |
| AC-009-04 | Un rollback a la versión anterior *shall* poder hacerse con un comando documentado y verificarse: el artefacto completo y sus recursos vuelven a ser los de esa versión | Prueba en el proveedor (cuando se apruebe), comparando los manifiestos de los archivos |
| AC-009-05 | La CSP *shall* incluir `default-src 'self'`, `connect-src 'self'`, `form-action 'none'` y `frame-ancestors 'none'`, y en `frame-src` solo el proveedor 3D, si lo hay (sin 3D, `frame-src 'none'`). La salida *shall not* contener scripts ni estilos en línea, que la CSP bloquearía | Test de cabeceras + escaneo de `dist/` |
| AC-009-06 | Las páginas *shall* llevar `noindex` mientras la demo no se apruebe para indexación | Test |
| AC-009-07 | El número y el peso de los archivos *shall* estar dentro de los límites del proveedor elegido | Comprobación automática previa a la subida |
| AC-009-08 | La regresión final *shall* ejecutar con Playwright los recorridos de las specs 002–008 y adjuntar la evidencia, incluida la presencia de los avisos de demo junto a cada función simulada o ilustrativa (REQ-012). Para 007, Playwright cubre la integración, las etiquetas, la carga bajo demanda, las cabeceras y los fallos, y el informe *shall* adjuntar la **evidencia manual** (escritorio y móvil) del recorrido interior en la ficha final (D-043). Las pruebas no ejecutadas *shall* quedar listadas y **no cuentan como superadas** | Informe de QA |
| AC-009-09 | *If* el acceso se decide restringido, una URL «difícil de adivinar» *shall not* contar como privada; las URL de versión o preview *shall* protegerse o desactivarse | Prueba de acceso anónimo (cuando se apruebe) |
| AC-009-10 | Un campo no enumerado, sea de primer nivel o anidado (p. ej. `figures[].internal_note`, `demo.extra`, `areas[].source`), *shall* quedar fuera de la salida y aparecer en el informe de construcción | Test con campos centinela en varios niveles, incluidos `Demo`, `AerialRef` y `Tour3D` |
| AC-009-11 | Los campos de ReviewItem y los originales privados *shall not* aparecer en la salida, aunque el mismo inmueble tenga un `display_text` público | Test con centinelas en el motivo, en el valor original y en la descripción retenida |
| AC-009-12 | La demo completa *shall* darse por cerrada solo cuando todos los criterios obligatorios de 001–009, incluido 007, estén superados o sustituidos por un criterio aprobado. Una versión anterior al cierre *shall* identificarse como «Partial preview» y publicarse solo con autorización expresa | Revisión del informe de QA + test de contenido de la etiqueta |
| AC-009-13 | Cada versión *shall* registrar el identificador del conjunto de datos aceptado del que se generó | Test del manifiesto |
| AC-009-14 | *When* una importación válida va seguida de una construcción fallida, el conjunto aceptado *shall* ser el nuevo, la versión publicada *shall* seguir siendo la anterior (con el identificador de datos anterior) y una construcción posterior correcta *shall* publicar el nuevo conjunto | Test de integración local con fallo inyectado en la construcción |
| AC-009-15 | Con configuraciones de 006 y 007 válidas, sus bloques *shall* aparecer con sus etiquetas, créditos y licencias; sin configuración, *shall not* aparecer; con una configuración inválida, la construcción *shall* fallar | Test de construcción con los tres casos |
| AC-009-16 | *While* un inmueble está marcado «no visto en la última importación» (AC-001-04), la exportación *shall not* incluirlo en la salida pública (ni como ficha, ni en una pestaña o en la sección comercial, ni en `similar_ids`, ni sus imágenes) y *shall* registrarlo en el informe de construcción con su motivo. *When* vuelve a aparecer en una ejecución completa, *shall* exportarse de nuevo (D-079) | Test de exportación con un inmueble no visto (excluido, con su motivo en el informe, fuera de `similar_ids` y de las copias de imágenes) y con el mismo inmueble ya desmarcado (exportado) |
| AC-009-17 | *While* el título de un inmueble o el nombre de una persona del equipo están vacíos en la fuente, la exportación *shall not* incluirlos en la salida pública (ni como ficha o persona del equipo, ni en una pestaña o en la sección comercial, ni en `similar_ids`, ni sus imágenes o su retrato) y *shall* registrarlos en el informe de construcción con su motivo. *When* la fuente publica el valor en una ejecución completa, *shall* exportarse de nuevo | Test de exportación con un inmueble de título vacío y una persona de nombre vacío (excluidos, con su motivo en el informe, fuera de `similar_ids` y de las copias de imágenes) y con los mismos registros ya con valor (exportados) |

## Dependencias
Como mínimo 001, 002 y 003. Para AC-009-12, todas. Decisiones pendientes: proveedor, acceso y dominio.

## Cuestiones pendientes
- El proveedor y el presupuesto (recomendación previa: Cloudflare Workers Free; no aprobada).
- Acceso público o restringido.
- El destino privado de las copias de SQLite (spec 001).
