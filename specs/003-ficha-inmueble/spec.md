# 003 · Ficha de inmueble (residencial)

> **APROBADA PARA PLANIFICACIÓN** (reglas funcionales), 2026-10-03, revisión 03 (D-051). Prioridad P1. Ningún criterio está superado sin evidencia de ejecución.
> **Cambio 2026-10-04 (`/sdd-change`, higiene documental, D-090):** cambia la columna «Verificación» de AC-003-06 (D-063 por analogía, D-084). El criterio de ningún AC cambia.

## Objetivo
Una ficha con la estructura y la profundidad inspiradas en DJ & Lindsey, adaptada a los datos reales de Hampton y completa tanto con 1 foto como con N fotos.

## Alcance
- **Orden de la ficha:**
  1. Cabecera: precio con periodo, estado, título y localidad.
  2. Foto(s).
  3. Datos clave.
  4. Descripción original.
  5. CTA de visita y contacto (demo).
  6. Calculadora (solo venta residencial; spec 005).
  7. Superficie aérea (spec 006).
  8. Tour 3D (spec 007).
  9. Precio similar.
  10. Aviso legal de Hampton.
- **Sin Price History ni Listing history** (D-003, D-041).
- «Precio similar» en lugar de «cercanos» (REQ-006), con las reglas de abajo.
- Galería con apertura, cierre y retorno del foco según DESIGN §8.

**Fuera de alcance:** mapa con dirección exacta si la fuente no la publica; colegios, impuestos y registros públicos de EE. UU.; proximidad geográfica como criterio de recomendación.

## Precio similar [aprobado, D-046]
| Aspecto | Regla aprobada (D-046) |
|---|---|
| Cifra comparable | Solo `sale_price` (venta) o `rent` (alquiler, con periodo). Nunca ingresos, renta de contrato, traspaso ni facturación (AC-003-06) |
| Inmueble de referencia | Necesita una cifra comparable fiable: no nula y sin ReviewItem abierto sobre ella. Si su estado es `cerrado` (vendido o alquilado), la sección no se muestra |
| Candidatos elegibles | Misma operación, misma moneda, mismo periodo (alquiler) y misma sección de presentación (residencial Jersey, internacional y comercial nunca se mezclan). Se excluyen: el propio inmueble, los de estado `cerrado`, los que no tienen precio y los que tienen la cifra en revisión |
| Margen | Incluido si `abs(precio_candidato − precio_ref) ≤ margen × precio_ref`, **con los extremos incluidos**. Se calcula con enteros (peniques), sin coma flotante: `100·abs(c − ref) ≤ m·ref`, con `m` en puntos porcentuales. Margen: **±20 %** |
| Máximo | 3 resultados |
| Orden | Menor diferencia absoluta primero; en caso de empate, menor precio y después la clave estable |
| Sin referencia o sin candidatos | Se oculta la sección. El criterio **nunca** se relaja |

## Requisitos
- **Propietaria de:** REQ-005, REQ-006 y REQ-017.
- **Consume y verifica:** REQ-002 y REQ-016 (presentación; propietaria 001), REQ-012 (propietaria 009), REQ-013 (escapado al presentar; propietaria 001) y REQ-021 (propietaria 002).
- Principios C-1, C-2 y C-6. DESIGN §6, §8, §9 y §11.

## Criterios de aceptación
| ID | Criterio (EARS) | Verificación |
|---|---|---|
| AC-003-01 | *Where* un inmueble tiene 1 foto, la ficha *shall* mostrarla sin miniaturas duplicadas, sin flechas, sin contador «1/1», sin controles vacíos y sin abrir una galería vacía | Playwright + captura (inmueble con 1 foto) |
| AC-003-02 | *Where* tiene N > 1 fotos, la ficha *shall* mostrar el mosaico y el acceso a la galería con contador | Playwright con una ficha de N fotos (datos de prueba o comercial) |
| AC-003-03 | La ficha *shall not* contener secciones Price History ni Listing history | Test de contenido |
| AC-003-04 | *If* un campo no se publica, la ficha *shall* mostrar «Not published» y *shall not* rellenarlo | Test con la superficie (siempre null en la muestra) |
| AC-003-05 | La lista de precio similar *shall* aplicar la tabla «Precio similar» con el margen, el máximo y el orden **aprobados**. *If* no hay referencia válida o candidatos, *shall* ocultar la sección en lugar de relajar el criterio | Tests con fixtures mixtos (venta y alquiler, mensual y anual, GBP y otra moneda, vendidos, sin precio y en revisión). Con ref = £500,000 y ±20 %: £400,000 y £600,000 entran; £399,999 y £600,001 no. Se comprueba la exclusión del propio inmueble y el caso sin candidatos |
| AC-003-06 | Solo los importes de tipo `sale_price` o `rent` *shall* usarse en precio similar; ingresos, renta de contrato y facturación nunca | Test con Winchester Street y Magnolia Gardens (ingresos declarados): prueba sintética versionada + prueba privada con los casos reales (D-063 por analogía, D-084) |
| AC-003-07 | *Where* la ficha procede de Hampton, *shall* mostrar al final el Disclaimer y el AML literales con su procedencia | Test |
| AC-003-08 | En móvil, la barra fija *shall not* tapar contenido, controles, avisos ni el teclado; el último elemento de la página *shall* verse por completo al hacer scroll hasta el final | Playwright a 320 y 390 px: posición del último elemento frente a la barra; al abrir un formulario, la barra se oculta |
| AC-003-09 | La portada *shall* elegirse según DESIGN §6 (calidad, recorte, tamaño real de presentación) y ninguna imagen *shall* servirse por encima de su tamaño original | Test de variantes + revisión visual |
| AC-003-10 | 0 px de desbordamiento horizontal a 320, 390 y 1280 px, y reflujo al 400 % de zoom (DESIGN §5) | Playwright |
| AC-003-11 | *When* se abre la galería, el foco *shall* pasar a ella; *when* se cierra (botón o Esc), el foco *shall* volver al control que la abrió. Mientras está abierta, el contenido de fondo no es alcanzable con el teclado | Playwright con teclado |
| AC-003-12 | *When* se repite el cálculo de precio similar con los mismos datos, el resultado y su orden *shall* ser idénticos | Test |

## Dependencias
001, 002 y DESIGN.md. Integra 005, 006 y 007 como bloques independientes: si uno no está listo, la ficha funciona sin él.

## Cuestiones pendientes
- Resuelto (D-046): ±20 % con extremos incluidos, máximo 3, orden propuesto y ocultación si la referencia está cerrada, no tiene cifra fiable o no hay candidatos.
- Qué datos clave son «esperables» (se muestran con «Not published» si faltan) y cuáles se omiten cuando no existen.
