# Plan 009 — Construcción y publicación

Estado: pipeline local de la demo implementado; publicación, push y despliegue no autorizados.

## Componentes

- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vitest.config.ts` y `astro.config.ts`.
- Contrato público en `src/domain/public-contract.ts` y loader en `src/data/preview.ts`.
- `pnpm test`, `pnpm typecheck` y `pnpm build` como puertas locales.
- Smoke de navegador para navegación, reflow, accesibilidad e interacciones.

## Verificación

El build genera 8 páginas. La SQLite privada no se incluye ni se sirve. Proyección, revisión previa a publicación y rollback se controlan en `../plan.md` P1–P4.
