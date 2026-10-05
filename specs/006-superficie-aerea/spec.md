# 006 · Superficie aérea ilustrativa

> **Estado actual:** ejemplo original implementado y verificado en la demo local; no se declara cierre general de la spec ni se presenta como medición real.

> Base aprobada en D-051; la implementación local usa un recurso original y configuración acotada a la demo.

## Objetivo
Mostrar el patrón de DJ & Lindsey (imagen aérea con el contorno dibujado y la superficie en m²) como **demostración ilustrativa**, sin presentar medidas ni linderos como reales (D-023, C-6).

## Alcance
- Una imagen aérea con derechos de uso documentados, un polígono ilustrativo y **al menos un valor numérico ilustrativo en m²** asociado claramente al gráfico.
- **Superficie del terreno:** es la que representa el polígono.
- **Superficie interior/construida:** si se muestra, es una cifra aparte. No se dibuja como contorno de la parcela.
- Cada valor inventado lleva su propia etiqueta junto a él, por ejemplo:
  - «Plot area: 450 m² – illustrative, demo»;
  - «Internal floor area: 120 m² – illustrative, demo».
- Etiqueta junto al dibujo: «Illustrative boundary – demo. Not a legal boundary or survey.».
- Si la imagen no es del propio inmueble: «Example image – not this property».

**Fuera de alcance:**
- Deducir medidas de los píxeles o de las fotos.
- Presentar el contorno como medición, catastro o lindero real.
- Mostrar el bloque en inmuebles con ubicación confidencial.
- Mostrarlo en cualquier inmueble que no esté en la lista aprobada.

## Requisitos
- **Propietaria de:** REQ-007.
- **Consume y verifica:** REQ-003 (derechos de la imagen; propietaria 001) y REQ-012 (propietaria 009).
- Principios C-1 y C-6. DESIGN §8.

## Criterios de aceptación
| ID | Criterio (EARS) | Verificación |
|---|---|---|
| AC-006-01 | Cada polígono o cifra de superficie *shall* llevar la etiqueta «demo» junto al dato, no solo en un pie general | Test de contenido + captura |
| AC-006-02 | *If* la fuente no publica superficie, *shall not* mostrarse ninguna cifra como real; las cifras ilustrativas llevan «illustrative» | Test |
| AC-006-03 | La UI *shall* distinguir la superficie construida/interior de la superficie del terreno; si aparecen ambas, cada valor *shall* llevar su tipo y su etiqueta junto a él | Test + revisión |
| AC-006-04 | *Where* la ubicación es confidencial, el bloque *shall not* aparecer | Test (comerciales «Confidential») |
| AC-006-05 | La imagen aérea, también si es genérica, *shall* tener registrados en SOURCES su origen, su licencia o permiso de uso y su atribución | Revisión de procedencia |
| AC-006-06 | Al menos una demostración *shall* mostrar un valor numérico ilustrativo en m² asociado visual y programáticamente al gráfico (junto al polígono y referenciado por él) | Test de contenido + captura + comprobación de accesibilidad (el valor se anuncia con el gráfico) |
| AC-006-07 | Cada cifra mostrada *shall* proceder de un dato de demo declarado y marcado como inventado, nunca de un cálculo sobre la imagen o el polígono | Test de datos + revisión |
| AC-006-08 | El bloque *shall* aparecer solo en los inmuebles de la lista aprobada; con la lista vacía, no aparece en ninguno | Test con la lista vacía y con un inmueble |

## Dependencias
003 (ficha). Una imagen aérea con derechos documentados.

## Cuestiones pendientes (sin aprobar por omisión)
- Qué imagen se usa, con qué derechos y si es del propio inmueble o un ejemplo genérico.
- En qué inmuebles se muestra (la lista aprobada). Mientras no se apruebe, la lista está vacía.
- Los valores ilustrativos concretos en m².
