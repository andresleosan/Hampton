# Plan 008 — Sección comercial

Estado: corte de demo implementado con snapshot curado.

## Componentes

- `src/pages/commercial/index.astro`: entrada separada del residencial.
- `src/components/CommercialPreview.astro`: tarjetas y límites de las cifras.
- Datos de muestra pública con procedencia y aviso de disponibilidad no acreditada.
- Tests de contenido, etiquetas y layouts de escritorio/móvil.

## Verificación

Premium, turnover y precio no se mezclan; los estados cerrados conservan su significado. La conexión a los 17 registros importados pertenece a `../plan.md` P2–P3.
