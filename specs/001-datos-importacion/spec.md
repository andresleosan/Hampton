# 001 · Datos e importación

> **APROBADA PARA PLANIFICACIÓN** (reglas funcionales), 2026-10-03, revisión 03 (D-051). Prioridad P1. Base: enfoque A (D-032). Ningún criterio está superado sin evidencia de ejecución.
> **Cambio 2026-10-03 (`/sdd-change`, P-B2-L, D-066):** se añade a «Ejecución completa» la línea de imágenes (lectura literal de la decisión #20). El texto de ningún AC cambia.
> **Cambio 2026-10-04 (`/sdd-change`, P-S9, D-082):** la línea de imágenes de «Ejecución completa» admite también una respuesta 200 con un tipo de contenido no admitido y unos metadatos de imagen inválidos en la fuente (D-080). El texto de ningún AC cambia.
> **Cambio 2026-10-04 (`/sdd-change`, D-089):** la línea de imágenes de «Ejecución completa» admite también una imagen cuya URL prohíbe el `robots.txt` de su servidor, que no llega a pedirse (D-086). El texto de ningún AC cambia.
> **Cambio 2026-10-04 (`/sdd-change`, higiene documental, D-090):** la cuestión del número N de copias queda resuelta (D-085). El texto de ningún AC cambia.

## Objetivo
Obtener de hamptonestatesjersey.com los inmuebles (residenciales, internacionales y comerciales), el equipo y sus imágenes, y guardarlos en SQLite con procedencia y normalización fiel. Producir además la lista de pendientes y no perder nunca el último conjunto de datos aceptado.

## Alcance
- Importación **manual** (D-030), del lado servidor, respetando `robots.txt`, con límite de ritmo y caché (C-11).
- Flujo: zona provisional → validación → aceptación transaccional (D-032).
- Modelo conceptual (brief §11.3): Listing, MoneyFigure (1:N), Media (**1:N, sin límite de una foto**; D-041), Agent, ReviewItem e ImportRun.
- Lista de pendientes sencilla (REQ-023). Los campos de ReviewItem son **internos**: nunca se exportan (spec 009, AC-009-11).
- Las **resoluciones** de los pendientes (p. ej. aprobar el título, la descripción segura o las fotos de un inmueble confidencial, o fijar su clasificación) se registran en local y en privado, ligadas a la clave estable, y se conservan entre importaciones mientras el valor original no cambie. Si cambia, el pendiente se reabre. El formato lo fija el plan.
- Copias de SQLite antes de cada actualización. La copia a un destino privado se hará **cuando se apruebe** ese destino (BR-4).
- El original autorizado de cada texto (incluida la descripción de los inmuebles confidenciales) se guarda en privado. Lo que se publica de él lo deciden 008 y 009.

**Fuera de alcance:**
- Tareas programadas (D-030) y panel de administración.
- API ocultas sin autorización y scraping desde el cliente (D-003).
- Contactar a Hampton.
- Un subsistema nuevo de descargas: la biblioteca y los parámetros los fija el plan.

## Definiciones
- **Ejecución completa:** se cumplen todas estas condiciones:
  - El descubrimiento ha terminado sin error en cada sección configurada (listado residencial S-03, listado internacional S-10, sitemap comercial y equipo S-04), con una **señal positiva de final** propia de cada sección: el documento se ha leído entero (sin truncar por límite), tiene la estructura esperada (p. ej. el bloque de datos del listado y un XML de sitemap válido y cerrado) y no queda paginación ni enlace de continuación sin seguir. Un recuento distinto de cero **no** demuestra por sí solo que el descubrimiento haya terminado.
  - Cada página descubierta se ha descargado y procesado, o tiene una causa registrada que no afecta al conjunto: por ejemplo, una ficha comercial que devuelve 404 y genera un ReviewItem.
  - Cada imagen enlazada se ha descargado, o tiene una causa registrada que no afecta al conjunto: solo una respuesta definitiva 4xx recibida sin agotar ningún límite; una URL rechazada por la regla de destinos (AC-001-16); una respuesta 200 recibida sin agotar ningún límite cuyo tipo de contenido no es una imagen admitida (JPEG, PNG o WebP); una imagen cuyos datos en la fuente no la identifican (sin URL o sin dimensiones), que no llega a pedirse; o una imagen cuya URL prohíbe el `robots.txt` de su servidor (AC-001-11; D-086), que tampoco llega a pedirse. En todos estos casos se genera un ReviewItem y la imagen queda sin archivo. Una imagen que agota un límite de tiempo, tamaño o reintentos deja la ejecución incompleta (AC-001-17).
  - No queda ninguna página pendiente de descargar o reintentar.
  - La ejecución no se ha interrumpido.
  - Ninguna sección configurada ha devuelto 0 elementos.
- **Ejecución incompleta:** cualquier otra, incluidas las que agotan un límite de tiempo, tamaño o reintentos (AC-001-17). Sus datos **no** se aceptan.
- **Primera importación:** no existe ninguna base aceptada.
- **Actualización:** ya existe una base aceptada.
- **Igualdad lógica de dos bases:** coinciden las mismas identidades (clave estable), los mismos valores de los campos de dominio y las mismas relaciones (Listing ↔ MoneyFigure, Listing ↔ Media, Agent ↔ Media). Se excluyen los metadatos de la ejecución (ImportRun, fechas de consulta).

## Requisitos
- **Propietaria de:** REQ-001, 002 (modelo de datos), 003 (procedencia por recurso), 013, 015, 016, 022 y 023.
- **Contribuye a:** REQ-011 (datos del equipo; propietaria 004) y REQ-020 (datos comerciales; propietaria 008).
- Principios C-1, C-2, C-3, C-7, C-8, C-10 y C-11.

## Criterios de aceptación
| ID | Criterio (EARS) | Verificación |
|---|---|---|
| AC-001-01 | *When* se ejecuta la importación, el sistema *shall* escribir solo en una BD provisional nueva hasta que la validación termine bien | Test: la base aceptada conserva su contenido lógico y su estado estable (método fijado en el plan, ver nota 1) durante toda la ejecución |
| AC-001-02 | *If* la validación o la importación fallan, o la ejecución es incompleta, el sistema *shall* dejar la base aceptada sin cambios: mismo contenido lógico y mismo estado estable de sus archivos (principal y auxiliares, si los hay) | Tests con fallo inyectado: error de red, HTML inesperado, excepción, interrupción del proceso |
| AC-001-03 | *When* se repite la importación sin cambios en la fuente, la base resultante *shall* ser lógicamente igual a la anterior (mismas identidades, valores y relaciones), además de tener los mismos recuentos. Clave estable: ID de ítem Wix o URL | Test de idempotencia sobre fixtures guardados que compara identidades, valores y relaciones |
| AC-001-04 | *When* una ejecución **completa y validada** no encuentra un inmueble que estaba en la base aceptada, el sistema *shall* marcarlo «no visto en la última importación» y conservar el registro, su procedencia, sus fotos y su estado anterior. *Shall not* cambiar su estado a SOLD ni borrarlo. Una ejecución incompleta *shall not* marcar nada como no visto | Test «desaparición tras ejecución completa» + test de que una ejecución incompleta no marca nada |
| AC-001-05 | El sistema *shall* guardar el `precio_original` literal y, aparte, importe, moneda, operación y periodo. «Negotiable», «POA», «Confidential» o un precio vacío dan importe `null`, nunca 0 | Tests con los casos reales de SOURCES §4–5 (p. ej. Trinity rental «£1,900 per month (negotiable)» → 1900 GBP, alquiler mensual; Café → null) |
| AC-001-06 | *If* una ficha publica varias cifras (p. ej. Princess Garden: «£90,000» y «Rental of £60,000.00 PA»), el sistema *shall* guardar cada una en su tipo solo si el texto la identifica sin ambigüedad; *otherwise* crea un ReviewItem y no normaliza | Test con S-07, S-08 y S-09 |
| AC-001-07 | Cada ReviewItem *shall* incluir URL de origen, fecha de consulta, campo, valor original y motivo | Test de esquema |
| AC-001-08 | El sistema *shall* guardar para cada Media la URL de origen, las dimensiones originales y la procedencia; admite N fotos por inmueble | Test con una ficha comercial de 9 fotos y un inmueble residencial con 1 |
| AC-001-09 | El contenido importado *shall* guardarse como texto; ningún HTML de la fuente se ejecuta ni se inserta sin escapar | Test con HTML o script malicioso en un fixture |
| AC-001-10 | *When* hay una actualización, el sistema *shall* crear una copia de la base aceptada antes de sustituirla y conservar las últimas N. Restaurar una copia *shall* dar una base lógicamente igual a la copiada | Test de copia y restauración que compara el contenido lógico, no solo el hash |
| AC-001-11 | Las peticiones a la fuente *shall* respetar `robots.txt` y un ritmo ≤ 1 petición/s con un User-Agent identificable | Test con servidor simulado que mide el ritmo |
| AC-001-12 | *When* la importación termina, el sistema *shall* mostrar un resumen: completa o incompleta (con la causa), nuevos, cambiados, no vistos, pendientes y errores | Test de salida |
| AC-001-13 | *If* la ejecución es incompleta (respuesta vacía inesperada, error de descubrimiento, falta de señal de final, página pendiente o interrupción), el sistema *shall not* aceptar sus datos ni presentar un catálogo vacío o parcial como válido | Tests: (a) el listado residencial devuelve 200 con 0 tarjetas; (b) el sitemap comercial falla; (c) una ficha queda pendiente tras agotar los reintentos; (d) el proceso se interrumpe a mitad; (e) el listado devuelve tarjetas pero el documento está truncado o sin su bloque de datos completo; (f) el sitemap es XML incompleto con algunas URL |
| AC-001-14 | *When* no existe base aceptada (primera importación) y la ejecución es completa y validada, el sistema *shall* aceptarla sin copia previa. *If* la primera importación es incompleta, *shall not* crear ninguna base aceptada | Test de primera importación, completa e incompleta |
| AC-001-15 | *If* existe una base aceptada y su copia obligatoria falla, el sistema *shall not* sustituir los datos y *shall* terminar con error | Test con fallo inyectado en la copia |
| AC-001-16 | El importador *shall* descargar solo URL con esquema `https` y cuyo origen esté en la lista autorizada: `www.hamptonestatesjersey.com` (y su variante sin `www`) para páginas, y `static.wixstatic.com` para imágenes. Cada redirección *shall* validarse con la misma regla. *Shall* rechazar cualquier destino que, tras resolver el nombre, sea local, privado, de enlace local o reservado. Una URL rechazada genera un error registrado | Tests con URL de la fuente que apuntan a otro dominio, a `http`, a `localhost`, a una IP privada y a una redirección hacia un destino privado |
| AC-001-17 | Cada petición *shall* tener límites finitos de tiempo, de tamaño de respuesta y de reintentos (con espera, dentro del ritmo de AC-001-11), y la ejecución un tiempo total máximo. *If* se agota un límite, la ejecución es incompleta (AC-001-13) | Tests con servidor simulado lento, con respuesta enorme y con fallos repetidos. Los valores los fija el plan |
| AC-001-18 | *When* una actualización completa encuentra cambios reales en la fuente (precio, estado, fotos), la nueva base *shall* reflejarlos manteniendo la identidad de cada inmueble, sin duplicarlo, y el resumen *shall* contarlos como «cambiados» | Test con un fixture modificado (cambio de precio y de estado en un inmueble existente) |
| AC-001-19 | *When* se apruebe el destino externo privado (BR-4), el sistema *shall* copiar a él la base aceptada tras cada aceptación, verificar la copia (contenido lógico igual al de la base local) y documentar una restauración desde ese destino que dé una base lógicamente igual. Un fallo de la copia externa *shall* informarse sin alterar la base aceptada | **Condicionado** a aprobar el destino; no bloquea el plan local. Prueba real de copia y restauración con evidencia |

**Nota 1 (para el plan).** El plan debe concretar cómo se mide el «estado estable» de una base SQLite:
- Qué archivos forman la base: el principal y, si se usan, `-wal`, `-shm` o `-journal`.
- Cómo se obtiene un estado consistente antes de compararlo: por ejemplo, un checkpoint, la API de copia online o una conexión de solo lectura.
- Cómo se compara el contenido lógico: por ejemplo, un volcado ordenado por clave.

El hash del archivo principal por sí solo no basta.

## Dependencias
Ninguna previa. Alimenta a 002, 003, 004, 008 y 009.

## Cuestiones pendientes
- P-16: la vía para cada tipo de inmueble.
  - Hecho: el listado residencial lleva los campos de la tarjeta y la portada en el HTML, y las fichas comerciales están en el sitemap.
  - **Sin verificar:** si existen fichas residenciales con más fotos (muestra limitada; SOURCES §13).
- Resuelto (D-085): 5. Es el número N de copias de AC-001-10: se conservan las últimas 5 copias verificadas y las anteriores se borran en la limpieza posterior al rename.
- El destino privado (BR-4). Solo condiciona el criterio de copia externa, no AC-001-10.
- Sin umbral porcentual de caída del inventario por ahora (D-049): rigen la definición de ejecución completa y las comprobaciones de integridad.
- El equipo se importa de `/meet-the-team`. Los retratos se sirven a ≈ 284 px: falta comprobar si hay originales mayores.
