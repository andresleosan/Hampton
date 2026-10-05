# Plan 009 — Construcción y publicación

Estado: pipeline reproducible desde GitHub implementado; push público autorizado y configuración final de Cloudflare Pages pendiente de Luis.

## Componentes

- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vitest.config.ts` y `astro.config.ts`.
- Contrato público en `src/domain/public-contract.ts`, snapshot filtrado en `src/data/public-snapshot.json`, medios autorizados en `public/media/` y loader en `src/data/preview.ts`.
- `pnpm test`, `pnpm typecheck` y `pnpm build` como puertas locales.
- Smoke de navegador para navegación, reflow, accesibilidad e interacciones.

## Verificación

Un checkout limpio instala con el lockfile y genera 45 páginas sin SQLite, scraping ni rutas locales. Cloudflare Pages usa `main`, `pnpm build`, salida `dist` y raíz `/`. Proyección, revisión previa a publicación y rollback se controlan en `../plan.md` P1-P4.
