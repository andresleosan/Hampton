# Plan 003 — Ficha residencial

Estado: recorrido de ficha implementado para la demo local.

## Componentes

- `src/pages/property/[id].astro`: composición, procedencia y CTA.
- `src/components/`: aérea, hipoteca, similares, 3D, reserva y equipo.
- `src/domain/`: reglas puras de hipoteca, similares y reserva.
- Pruebas unitarias, integración de página y smoke en escritorio/móvil.

## Verificación

No existe Price History. Las herramientas ilustrativas se separan del snapshot publicado y el 3D solo aparece en fichas configuradas. La spec completa no se declara cerrada sin validación AC por AC.
