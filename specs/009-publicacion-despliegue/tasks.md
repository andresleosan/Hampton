# Tareas 009 - Estado de la demo

## Actualización 2026-10-05

- [x] **T5. Construir la integración local.** `pnpm test` pasa 249 pruebas, `pnpm typecheck` no emite diagnósticos y `pnpm build` genera 45 páginas.
- [x] **T6. Verificar en navegador.** Cuatro rutas, filtros, hipoteca, similares, reserva simulada y 3D bajo demanda pasan; Axe informa cero infracciones y no hay overflow a 320 px.
- [x] **T7. Mantener artefactos privados fuera de Git.** SQLite, snapshot, informe, manifiesto, portadas y las cinco fotos verificadas continúan ignorados.
- [ ] **T8. Publicar.** No autorizado: no hubo push ni despliegue. El aviso GHSA conocido permanece documentado y no se aplicó `audit fix`.

Las cifras inferiores de ocho páginas corresponden al estado anterior y quedan superadas por esta actualización.

- [x] **T1. Fijar entorno reproducible.** Node/pnpm y dependencias exactas en lockfile.
- [x] **T2. Construir sitio estático local.** Ocho páginas generadas sin diagnósticos de tipos.
- [x] **T3. Excluir material privado.** SQLite, fotos privadas, `.ops/`, `dist/` y secretos fuera de Git.
- [x] **T4. Ejecutar regresión local.** Tests, build y smoke de navegador registrados.

Proyección pública, push, despliegue y rollback están únicamente en `../plan.md` P1–P4.
