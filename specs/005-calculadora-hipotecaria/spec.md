# 005 · Calculadora hipotecaria orientativa

> **APROBADA PARA PLANIFICACIÓN** (reglas funcionales), 2026-10-03, revisión 03 (D-051). Prioridad P2.
> **Cambio 2026-10-03 (`/sdd-change`, P-S6, D-076):** la cuestión de los valores iniciales queda resuelta (D-074). Ningún AC cambia.
> **Cambio 2026-10-05 (D-104):** AC-005-06 adopta un tipo inicial ilustrativo de demo del 5.00 %, editable y explícitamente separado de cualquier tipo actual, oferta o recomendación.

## Objetivo
Calcular **de verdad** la cuota mensual de capital e intereses con los valores introducidos, en GBP y en el contexto de Jersey, y presentarla como orientativa (D-022, C-6).

## Alcance
- **Entradas:**
  - precio (prellenado con el `sale_price` del inmueble residencial en venta);
  - entrada, en % o en £;
  - tipo de interés anual (%);
  - plazo (años).
- **Salida:**
  - cuota mensual de capital e intereses;
  - importe del préstamo;
  - total pagado y total de intereses;
  - supuestos visibles;
  - el aviso en-GB «Indicative only. Not a mortgage offer or financial advice.».
- Solo en fichas **residenciales en venta**.

**Fuera de alcance:**
- Property tax, seguros, HOA, PMI, FHA/VA y cualquier regla de EE. UU.
- Ofertas, prestamistas, scoring y asesoramiento.
- La calculadora en alquileres, vendidos o comerciales (D-027).

## Variables y fórmula
| Símbolo | Definición |
|---|---|
| `precio` | Precio en GBP introducido (o prellenado) |
| `a` | Tipo anual introducido, en **porcentaje** (p. ej. 12 significa 12 %) |
| `r` | Tipo mensual en tanto por uno: `r = a / 100 / 12` |
| `D` | Entrada en GBP. Si se introduce en %: `D = precio × porcentaje_de_entrada / 100`, redondeada al penique. Si se introduce en £: el importe introducido |
| `P` | Principal: `P = precio − D` |
| `n` | Número de mensualidades: `n = años × 12` |
| `M` | Cuota mensual: `M = P × r / (1 − (1 + r)^(−n))`. Si `r = 0`: `M = P / n` |

## Validez de las entradas [aprobada, D-047; límites de esta demo]
- **Todas:** números finitos. Un valor vacío, NaN, ±∞, con texto no numérico o **ambiguo** es inválido: se rechaza entero, nunca se interpreta en parte.
- **Gramática aceptada** (sin espacios internos):
  - Importes en £ (precio, entrada): `£` opcional; dígitos sin separadores, o con comas de miles en grupos exactos de 3 (`125000`, `125,000`); punto decimal opcional con **1 o 2** decimales (`125,000.5`, `125,000.50`). Se rechazan, entre otros: `1,00,000`, `125.000,50`, `12,5`, `125,000.505`, `1e5`, `-5`, `£ 5`.
  - Porcentajes (entrada en %, tipo): dígitos con punto decimal opcional y hasta 2 decimales; `%` final opcional. Se rechazan `12,5`, `5.125`, `£5`.
  - Años: entero sin decimales ni separadores.
- **Precio:** `0 < precio ≤ £100,000,000`.
- **Entrada en %:** `0 ≤ porcentaje ≤ 100`. **Entrada en £:** `0 ≤ D ≤ precio`, con un máximo de 2 decimales.
- **`D = precio` (tratamiento explícito, aprobado):** se da con una entrada del 100 % o con un importe igual al precio, y se trata igual en ambos modos. No es un error ni se pasa a la fórmula. Se muestra «No mortgage needed: the deposit covers the full price.», sin cuota ni totales.
- **`D > precio`:** error.
- **Tipo:** `0 ≤ a ≤ 20` (%), con hasta 2 decimales. **El 20 % es un tope de validez de la demo, no una recomendación financiera.**
- **Plazo:** un número entero de años, `1 ≤ años ≤ 40`, de modo que `n` va de 12 a 480.

## Precisión, redondeo y totales
- **Cálculo interno:** en coma flotante de doble precisión, sin redondeos intermedios. La única excepción es `D` derivada de un %, que se redondea al penique para que préstamo y entrada cuadren con lo mostrado.
- **Presentación:** cada importe se redondea al penique, con medio penique hacia arriba (lejos de cero), y se formatea en en-GB (`£8,884.88`).
- **Totales:** a partir del valor **sin redondear**. `total_pagado = M × n` y `total_intereses = total_pagado − P`, y cada uno se redondea solo al presentarlo. Por eso, la suma de n cuotas redondeadas puede diferir en unos peniques del total mostrado. Una nota visible lo explica: «Figures rounded to the nearest penny.».

## Requisitos
- **Propietaria de:** REQ-008.
- **Consume:** REQ-012 (propietaria 009) y REQ-021 (propietaria 002).
- Principio C-6. DESIGN §8.

## Criterios de aceptación
| ID | Criterio (EARS) | Verificación |
|---|---|---|
| AC-005-01 | El sistema *shall* calcular `M` con las variables y la fórmula de la tabla («Variables y fórmula»): `r = a/100/12`, `n = años × 12`, `P = precio − D` y la rama `M = P/n` cuando `r = 0` | Tests unitarios con las fixtures de AC-005-08 |
| AC-005-02 | *When* cambia cualquier entrada, la cuota *shall* recalcularse sin recargar | Test de componente |
| AC-005-03 | *If* una entrada incumple «Validez de las entradas» (no finita, ambigua o fuera de la gramática, más de 2 decimales, precio ≤ 0 o > £100,000,000, entrada negativa o mayor que el precio, porcentaje > 100, tipo fuera de 0–20 %, plazo no entero o fuera de 1–40), *shall* mostrarse un error en en-GB junto al campo y ningún resultado. Una entrada del 100 % o igual al precio **no** es un error (AC-005-09) | Tests en cada límite y justo fuera de él, y con la lista de entradas ambiguas de la gramática |
| AC-005-04 | Los importes *shall* mostrarse en GBP, en formato en-GB, redondeados al penique según «Precisión, redondeo y totales», y los totales *shall* calcularse desde `M` sin redondear | Tests: los totales de AC-005-08 + un caso de medio penique |
| AC-005-05 | La calculadora *shall not* mostrar conceptos de EE. UU. (property tax, insurance, HOA) | Test de contenido |
| AC-005-06 | Los supuestos y valores iniciales *shall* verse junto al resultado, rotulados como ilustrativos y editables. El tipo de interés *shall* empezar en **5.00 %** para mostrar una cuota útil desde la primera vista, rotulado de forma inmediata como «Illustrative demo rate — editable; not current, offered or recommended»; seguirá siendo editable y no se presentará como dato de mercado, oferta o recomendación | Test + revisión |
| AC-005-07 | La calculadora *shall* aparecer solo en fichas residenciales en venta, con estado `open` y con un `sale_price` en GBP fiable (no nulo ni en revisión); es la misma regla que el campo `calculator` de la spec 009 | Tests de la derivación en 009 (alquiler, vendido, comercial, precio nulo, cifra en revisión, otra moneda) + test de que el componente no aparece con `calculator = null` |
| AC-005-08 | Fixtures matemáticas (no son recomendaciones de tipos), con `P = £100,000` y 1 año (`n = 12`): (a) `a = 12` → `M ≈ £8,884.88`, total `£106,618.55`, intereses `£6,618.55`; (b) `a = 0` → `M = £8,333.33`, total `£100,000.00`, intereses `£0.00`; (c) precio `£125,000` con entrada del 20 % o de `£25,000`, `a = 12` y 1 año → `P = £100,000` y la misma cuota que (a) | Tests unitarios. Valores comprobados de forma independiente (ver evidencia) |
| AC-005-09 | *When* la entrada cubre el precio (100 % en modo porcentaje o importe igual al precio en modo £), *shall* mostrarse el mensaje «No mortgage needed…» sin cuota ni totales, y *shall not* evaluarse la fórmula | Test en ambos modos |

**Evidencia de las fixtures (2026-10-03).**
- Valor de referencia: con aritmética decimal de 50 dígitos, `M = 8884.87886783417…`.
- Comprobación 1: una simulación de amortización con ese `M` deja un saldo residual de `−4.5×10⁻⁴⁵`.
- Comprobación 2: una búsqueda por bisección de la cuota que salda el préstamo en 12 meses da el mismo valor.
- Con `a = 0`: `M = 100000/12 = 8333.333…`.
- Totales: `8884.8788… × 12 = 106,618.546…`, que se presenta como `£106,618.55`. Con cuotas ya redondeadas daría `£106,618.56`, lo que justifica la regla de totales.

## Dependencias
003 (ficha).

## Cuestiones pendientes
- Resuelto (D-047): límites, entrada de 0–100 % y mensaje «No mortgage needed» en ambos modos.
- Resuelto (D-104, que sustituye este punto de D-074): valores iniciales de entrada del 10 %, plazo de 25 años y tipo ilustrativo de demo del 5.00 %, todos editables y rotulados; el tipo no es actual, ofertado ni recomendado (AC-005-06). No se investigan aquí impuestos, ofertas de prestamistas ni asesoramiento.
