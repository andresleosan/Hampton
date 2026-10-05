# Plan 002 — Inicio y catálogo residencial

Estado: corte de demo implementado con snapshot curado; migración al snapshot proyectado en `../plan.md` P3.

## Componentes

- `src/pages/index.astro` y `src/pages/residential/`: entrada editorial y catálogo.
- `src/data/preview.ts`: carga del contrato público actual.
- `src/layouts/SiteLayout.astro` y `src/styles/global.css`: navegación, retícula, foco y responsive.
- Pruebas de dominio/integración y smoke de navegador para contenido, accesibilidad y reflow.

## Verificación

La demo etiqueta procedencia y no garantiza disponibilidad. El catálogo completo de la SQLite no se considera conectado hasta P3.
