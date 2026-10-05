# 007 · Tour 3D navegable

> **Estado actual:** «Small Villa» de RenderRite implementado para la demo local, con atribución, carga bajo demanda y recorrido guiado; publicación no autorizada y cierre general de la spec no declarado.

> Base aprobada en D-043 y D-051. La evidencia local no sustituye una revisión previa a publicación.

## Objetivo
Que el visitante pueda **entrar y recorrer el interior** de una vivienda en 3D, cambiando de habitación, con un modelo de uso permitido identificado como ejemplo ajeno a Hampton. No cumplen:
- un modelo que solo rota;
- una imagen de portada.

## Alcance
- Un modelo de ejemplo con crédito visible y la etiqueta «Example – not this property».
- **Dos evidencias separadas**, ambas obligatorias para el candidato elegido, según la forma de entrega:

| Forma de entrega | (A) Licencia del modelo | (B) Condiciones del visor / incrustación |
|---|---|---|
| Embed del proveedor | Que la licencia del modelo permita mostrarlo (p. ej. CC BY con atribución) | Que los términos del proveedor permitan incrustar su visor en esta web (añadiendo **solo** su origen a `frame-src`; spec 009, AC-009-05) |
| Modelo alojado con la web | Que la licencia permita descargarlo, redistribuirlo y servirlo | La licencia de la biblioteca del visor propio y que su peso quepa en los límites del proveedor (AC-009-07) |

- **Carga bajo demanda [aprobada, D-043]:** el visor no se carga hasta que el visitante pulsa «Load 3D tour (example)». Así, sin esa acción no hay tráfico hacia el proveedor (spec 004, AC-004-13) y se ahorra peso.
- **Recorrido guiado [aprobado, D-104]:** tras cargar y asentarse la cámara inicial, el recorrido pasa automáticamente por cinco estancias. Incluye Play/Pause y selección manual, no usa audio y no inicia el movimiento automático si el visitante prefiere movimiento reducido.

**Fuera de alcance:** un marcador o una imagen estática como resultado final; tours de terceros sin permiso; presentar el modelo como el inmueble; activar renderizado por software o cambiar permisos en este entorno (D-041).

## Requisitos
- **Propietaria de:** REQ-009.
- **Consume y verifica:** REQ-003 (licencias; propietaria 001) y REQ-012 (propietaria 009).
- Principios C-6 y C-9.

## Criterios de aceptación
| ID | Criterio (EARS) | Verificación |
|---|---|---|
| AC-007-01 | El visitante *shall* poder entrar en el interior, desplazarse y llegar a otra habitación desde el tour integrado en la ficha | **Protocolo de evidencia manual (abajo), en escritorio y en móvil, sobre la ficha final** (D-043). Sin esa evidencia, AC-007-01 queda **no ejecutado** |
| AC-007-02 | El bloque *shall* mostrar el autor, la licencia o las condiciones, y la etiqueta «Example – not this property» | Test de contenido |
| AC-007-03 | La CSP *shall* permitir solo el origen del proveedor elegido en `frame-src` (si es embed) | Test de cabeceras |
| AC-007-04 | *If* el visor no carga en el dispositivo del visitante, el bloque *shall* explicarlo sin romper la ficha | Test automatizado con WebGL desactivado y con el iframe bloqueado |
| AC-007-05 | El modelo *shall* quedar registrado en SOURCES con su URL, su autor, la evidencia (A) y la evidencia (B), y la fecha | Revisión |
| AC-007-06 | *Before* que el visitante active el visor, la página *shall not* hacer peticiones al origen del proveedor 3D | Playwright: registro de red antes y después de activarlo |
| AC-007-07 | La integración *shall* insertar el visor con el `src` del modelo registrado y los atributos acordados (título accesible, sin permisos de dispositivo innecesarios) | Test automatizado de integración |

## Protocolo de evidencia manual (V-3D)
- **Quién y dónde:** Luis, en su navegador normal, con WebGL 2 disponible. Una vez en escritorio y una vez en móvil.
- **Datos que se registran en cada prueba:**
  - URL exacta: la del modelo (elección del candidato) y la de la ficha de la demo donde está integrado (cierre), con el UID del modelo;
  - fecha y hora;
  - dispositivo, sistema operativo y versión del navegador;
  - si WebGL 2 está disponible (p. ej., según `https://get.webgl.org/webgl2/`);
  - tiempo de carga aproximado;
  - resultado de entrar, desplazarse y cambiar de habitación (sí/no);
  - captura o vídeo corto del cambio de habitación;
  - observaciones.
- **Dónde se guarda:** como evidencia interna en `docs/evidence/` (no se publica), con un resumen en esta spec y en SOURCES.
- Si el resultado de una prueba es «solo rota», el candidato no cumple.

## Verificación aprobada (D-043)
- El desplazamiento interior (entrar, desplazarse y cambiar de habitación) se acredita con el **protocolo de evidencia manual**, en escritorio y en móvil. Esto sustituye a la prueba automatizada de ese recorrido.
- La evidencia manual cubre **dos momentos**:
  1. la página del candidato, para elegir modelo;
  2. **el tour integrado en la ficha final de la demo**, que es la prueba que cierra AC-007-01.
- Playwright sigue siendo obligatorio para la integración, las etiquetas, la carga bajo demanda, las cabeceras y los fallos del visor (AC-007-02…07).
- Esta decisión **no** aprueba ningún modelo ni sus derechos. 007 no se puede cerrar con un marcador, con una imagen ni con un visor que solo rota.

## Dependencias
003 (ficha). V-3D.

## Cuestiones pendientes
- «Small Villa» quedó seleccionado para la demo local bajo D-104; enlace, licencia, Viewer API y estancias del recorrido constan en `docs/SOURCES.md` § «Actualización R-12».
- En qué fichas se muestra el bloque: una lista en la configuración local (`Demo.tour3d`, spec 009). Con la lista vacía no aparece en ninguna; no se aprueba por omisión.
- Evidencia (B) de Sketchfab verificada el 2026-10-04: oEmbed, Press, Terms efectivos el 12-08-2026 (§§3.3, 4.2.2 y 5) y la guía oficial de publicidad contemplan el iframe estándar en webs de terceros. Para esta demo se conservan marca, opciones permitidas, licencia, autor y rótulo de «otra propiedad». La conclusión no es garantía jurídica absoluta ni autorización de publicación; referencias en `docs/SOURCES.md` § «Actualización R-12».
- Matterport: solo con permiso del propietario del Space; no hay candidato verificado.
