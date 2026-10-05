# 004 · Equipo, contacto y visitas (simulados)

> **APROBADA PARA PLANIFICACIÓN** (reglas funcionales), 2026-10-03, revisión 03 (D-051). Prioridad: equipo y contacto P1; visitas P2.
> **Cambio 2026-10-03 (`/sdd-change`, P-S4, D-076):** AC nuevo AC-004-16 (persona del equipo que deja de aparecer, D-073). Ningún AC existente cambia.
> **Cambio 2026-10-04 (`/sdd-change`, higiene documental, D-090):** cambia la columna «Verificación» de AC-004-01 y AC-004-02 (D-063 por analogía, D-084). El criterio de ningún AC cambia.

## Objetivo
Presentar a las personas reales de Hampton y permitir un recorrido completo de contacto y de solicitud de visita, **sin enviar ni guardar datos personales** (D-021, C-5).

## Alcance
- **Equipo:** Gilberto Franco (Managing Director) y Joshua Franco (Negotiator), con sus retratos reales y el contacto publicado (SOURCES §6). Tratamiento según DESIGN §7.
- **Contacto y visita:** formularios con los campos, pasos y controles definidos abajo. La confirmación es ficticia: «Demo – nothing has been sent».
- **Horario de las visitas (D-048):** de lunes a viernes, franjas de 30 minutos de 09:00 a 16:30 (la última empieza a las 16:30; 16 franjas por día), en los 30 días siguientes empezando mañana (día 1 = mañana, día 30 incluido), calculados en `Europe/Jersey` con horario de verano e invierno. Son **horarios de demostración**, no horarios ni disponibilidad de Hampton, y van etiquetados.
- **Controles de contacto:** todo botón o enlace de contacto («Contact», «Email me», «Call», «Request a viewing») abre el recorrido simulado. Los contactos profesionales publicados (teléfono y email del equipo) pueden mostrarse como **texto**, no como enlaces que envíen o llamen.

**Fuera de alcance:** backend, envíos (email, SMS, API), calendario real, promesa de disponibilidad, analítica y cualquier almacenamiento de datos personales.

## Campos [aprobados, D-048]
| Formulario | Campo | Obligatorio | Regla |
|---|---|---|---|
| Contacto | Name | sí | 1–100 caracteres |
| Contacto | Email | sí | Formato de email |
| Contacto | Phone | no | 7–20 caracteres: dígitos, espacios, `+`, `(`, `)` y `-` |
| Contacto | Message | sí | 1–2000 caracteres |
| Contacto | Property | — | Prellenado y de solo lectura si se abre desde una ficha. Es un dato público, no personal |
| Visita | Agent | sí | Uno de los agentes de SOURCES §6 |
| Visita | Date | sí | Una fecha dentro de las reglas ficticias de franjas |
| Visita | Time | sí | Una franja ficticia válida para esa fecha en `Europe/Jersey` |
| Visita | Name, Email, Phone | como en contacto | Como en contacto |
| Visita | Note | no | 0–500 caracteres |

Los campos llevan atributos `autocomplete` (`name`, `email`, `tel`) para identificar su propósito (WCAG 1.3.5). Lo que el navegador del visitante decida recordar con su autocompletado queda fuera del control de la aplicación y no se promete.

## Recorrido y controles
- **Contacto:** rellenar → *Send (demo)* → validación → confirmación ficticia.
- **Visita:** 1 Agent → 2 Date and time → 3 Your details → 4 Review → *Confirm (demo)* → confirmación ficticia.
- **Back:** vuelve al paso anterior y conserva en memoria lo introducido.
- **Cancel:** descarta todos los valores, cierra el recorrido y devuelve el foco al control que lo abrió.
- **Limpieza de los valores en memoria:** ocurre al cancelar, al llegar a la confirmación y al salir de la página. No hay un botón propio.
- **Repetir:** desde la confirmación, «Start again» abre el recorrido vacío.

## Requisitos
- **Propietaria de:** REQ-010, REQ-011 y REQ-019.
- **Consume y verifica:** REQ-003 (retratos; propietaria 001), REQ-012 (propietaria 009) y REQ-021 (propietaria 002).
- Principios C-4, C-5 y C-6. DESIGN §7, §8 y §11.

## Criterios de aceptación
| ID | Criterio (EARS) | Verificación |
|---|---|---|
| AC-004-01 | La sección de equipo *shall* mostrar solo personas registradas en SOURCES §6, con el nombre y el cargo publicados | Test contra los datos: prueba sintética versionada + prueba privada con los casos reales (D-063 por analogía, D-084) |
| AC-004-02 | Los retratos *shall* ser los publicados, sin alterar rasgos, con un tratamiento coherente entre ambos (mismo recorte, tamaño y tono entre sí; DESIGN §7, se elige con las maquetas) | Revisión visual + test de origen de la imagen: prueba sintética versionada + prueba privada con los casos reales (D-063 por analogía, D-084) |
| AC-004-03 | Durante todo el recorrido (escribir, validar, confirmar, cancelar, volver y navegar), el formulario *shall not* disparar ningún envío ni transmitir datos personales: sin `action` de envío, sin peticiones `fetch`, XHR, `sendBeacon` o WebSocket iniciadas por él y sin navegación de envío | Playwright: se escriben valores centinela y se recorren todos los pasos y controles. Ninguna petición, de ningún origen, lleva un centinela en la URL, las cabeceras o el cuerpo, y el formulario no inicia ninguna petición |
| AC-004-04 | La aplicación *shall not* escribir datos personales en `localStorage`, `sessionStorage`, cookies, IndexedDB, Cache Storage, la URL (consulta, fragmento o estado del historial), la consola, los logs ni la analítica, **en ningún momento** del recorrido. Su presencia transitoria en la memoria de la página para validar es necesaria y está permitida | Playwright con instrumentación desde la carga de la página (antes de escribir): se registran las llamadas de escritura a cada almacenamiento, a `history` y a `console`, y se buscan los centinelas tras cada paso y control, no solo al final |
| AC-004-05 | *If* un campo es inválido, el formulario *shall* mostrar el error en línea en en-GB, anunciado a tecnologías de apoyo, y no avanzar | Test de componente + auditoría de accesibilidad |
| AC-004-06 | *When* se elige una fecha, las horas *shall* mostrarse en hora de Jersey: en una fecha de BST (p. ej. 15 Jul) y en una de GMT (p. ej. 15 Jan), la misma franja local *shall* corresponder a horas UTC distintas (UTC+1 y UTC+0) | Test unitario con fechas a ambos lados del cambio de hora |
| AC-004-07 | En los días de cambio de hora, *shall not* ofrecerse horas locales inexistentes ni duplicadas | Test (último domingo de marzo y de octubre) |
| AC-004-08 | Toda la UI del recorrido *shall* llevar la insignia «Demo» y no prometer disponibilidad | Test de contenido |
| AC-004-09 | El recorrido completo, incluidos Back, Cancel y Start again, *shall* poder hacerse solo con teclado | Playwright con teclado |
| AC-004-10 | Los campos *shall* cumplir la tabla «Campos»: obligatoriedad y límites aprobados | Tests de componente con valores en el límite y fuera de él |
| AC-004-11 | Back *shall* conservar los valores; Cancel y la confirmación *shall* descartarlos; Start again *shall* empezar con todos los campos vacíos | Test de componente + Playwright |
| AC-004-12 | *When* cambia el paso, el foco *shall* ir al encabezado del paso nuevo. *When* hay errores al enviar, *shall* ir al primer campo inválido. *When* se confirma, *shall* ir al encabezado de la confirmación. *When* se cancela, *shall* volver al control que abrió el recorrido | Playwright con teclado |
| AC-004-13 | *Where* la página carga recursos de un tercero autorizado (p. ej. el visor 3D, spec 007), sus peticiones *shall* estar documentadas por origen y *shall not* contener datos personales | Playwright: ficha con el visor activado + recorrido completo con centinelas |
| AC-004-14 | Las franjas ofrecidas *shall* ser exactamente: lunes a viernes, de 09:00 a 16:30 cada 30 min, en los días 1–30 a partir de mañana según la fecha de `Europe/Jersey`; nunca fines de semana, ni hoy, ni el día 31. Cada franja lleva la etiqueta de demostración | Test unitario con reloj fijo (incluidos un viernes por la tarde, una medianoche UTC distinta de la de Jersey y un cambio de hora dentro de la ventana) |
| AC-004-15 | Todo control de contacto *shall* abrir el recorrido simulado y *shall not* ser un enlace `mailto:`, `tel:` o `sms:`; los contactos profesionales publicados se muestran como texto | Test de contenido + Playwright |
| AC-004-16 | *When* una ejecución **completa y validada** de la importación (spec 001) no encuentra a una persona del equipo que estaba en la base aceptada, el sistema *shall* conservarla marcada «no vista en la última importación», sin borrarla, y la salida pública *shall not* incluirla (ni en la sección de equipo ni como agente del recorrido de visita) mientras no vuelva a aparecer. Una ejecución incompleta *shall not* marcar a nadie como no visto (D-073) | Test de fusión de 001 con una persona ausente tras una ejecución completa y tras una incompleta + test de exportación de 009 que la excluye y lo registra en el informe + test de componente del equipo y de la lista de agentes |

## Dependencias
001 (equipo) y 003 (CTA de la ficha). Sin dependencias externas.

## Cuestiones pendientes
- El tratamiento final de los retratos (propuesta: ambos en B/N; DESIGN §7).
- Resuelto (D-048): campos y límites, franjas de demostración y controles de contacto hacia el recorrido simulado.
- Resuelto (D-073): una persona del equipo que deja de aparecer en la web de origen se conserva marcada «no vista» y no se publica mientras no vuelva a aparecer (AC-004-16).
