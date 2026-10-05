# Plan 001 — Datos e importación

Estado: importador mínimo implementado y ejecutado contra la fuente real; la aceptación/proyección pública sigue en `../plan.md` P1–P2.

## Componentes

- `src/importer/policy.ts` y `http.ts`: allowlist, DNS público, robots, ritmo, límites, redirects y presupuesto total.
- `parser.ts` y `normalise.ts`: Wix residencial/comercial y normalización conservadora.
- `sqlite.ts`, `run.ts` y `cli.ts`: ejecución secuencial, escritura transaccional provisional y resumen.
- `tests/unit/importer/` y `tests/integration/importer/`: política, parser, HTTP, ejecución, CLI e integridad SQLite.

## Verificación

La ejecución del 2026-10-04 produjo 43 inmuebles y una SQLite íntegra. La página de equipo se comprobó pero aún no se persiste. No se declara cumplida la spec completa hasta resolver P1–P2 y validarla criterio por criterio.
