# AGENTS.md — Hampton Estates demo

Demo local de Hampton Estates Jersey. El objetivo inmediato es una experiencia navegable y verificable, sin publicación ni afirmaciones de disponibilidad actual.

## Lee primero

- `MEMORY.md`: estado y siguiente trabajo.
- `specs/NNN-*/spec.md`: requisitos de la feature afectada.
- `docs/constitution.md`: principios permanentes.
- `DESIGN.md`: reglas visuales y de accesibilidad.
- `docs/DECISIONS.md`: aprobaciones humanas; no las inventes.

## Stack, estructura y comandos

- Windows, Node `>=24`, pnpm `11.23.0`, Astro `7.3.5`, TypeScript y Vitest.
- Producto en `src/`; pruebas en `tests/`; assets públicos en `public/`.
- Datos privados en `data/private/` y `public/preview-private/`: nunca van a Git.
- Cada feature vive en `specs/NNN-nombre/{spec,plan,tasks}.md`.
- Comprobación base: `pnpm test`, `pnpm typecheck` y `pnpm build`; vista local con `pnpm dev` o `pnpm preview`.

## Forma de trabajar

- Cambio pequeño: implementa, prueba y resume. Cambio de requisitos: actualiza primero spec, después plan/tareas y código.
- `spec.md` dice qué y por qué; `plan.md`, cómo; `tasks.md`, pasos verificables. Máximo diez tareas activas por feature.
- Mantén separados dato publicado, dato desconocido y ejemplo sintético; no rellenes huecos con hechos inventados.
- Revisor y autor no editan el mismo archivo a la vez. La separación de roles coordina trabajo; no demuestra aislamiento técnico.

## Límites

- Pregunta antes de nuevas dependencias, cambios del contrato de datos, otra importación real, push, publicación o despliegue.
- No modificar `.claude/`, configuración global, permisos del sistema, otros proyectos ni el VPS.
- No versionar secretos, SQLite, copias, fotos privadas ni artefactos de `.ops/`.
- No afirmar cierre general de specs sin validación requisito por requisito.

## Verificación y memoria

- Ejecuta pruebas proporcionales al cambio; para UI incluye build y navegador cuando corresponda.
- Un cambio visual amplio no se cierra solo con tests: un revisor distinto del implementador recorre desde Home las superficies renderizadas en escritorio y móvil, comprueba contenido real e interacciones y registra capturas comparables.
- Registra fallos y comprobaciones no ejecutadas.
- Mantén `MEMORY.md` breve (aprox. 50 líneas) y sin datos sensibles.
