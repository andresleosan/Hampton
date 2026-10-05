# MEMORY.md - Estado vivo

## Estado vigente — 2026-10-05

- La SQLite privada aceptada conserva 43 registros y el SHA-256 `201D531EF95ABE02ADEBAB25BF78ED02C84CEAE6967BCBF419AF133CAB216F01`; la proyección no la modifica.
- El snapshot público determinista contiene 42 fichas: 24 residenciales y 18 comerciales; excluye una confidencial y omite un precio pendiente. El equipo público son dos agentes curados por separado.
- La UI carga el snapshot final filtrado versionado en `src/data/public-snapshot.json`; las fixtures sintéticas quedan como fallback de desarrollo/pruebas. Sus 45 fotos autorizadas viven en `public/media/`; SQLite, informes y fuentes siguen fuera de Git.
- Portadas: 38 primeras imágenes descargadas en caché privada, cinco fotos verificadas preservadas en tres fichas y un placeholder por respuesta superior al límite. Solo se consultó la primera URL importada por ficha, con allowlist, robots, ritmo secuencial y caché.
- Demo editorial renovada bajo D-104: retratos reales locales de Gilberto y Joshua, calculadora con tipo inicial ilustrativo del 5.00 % y tour guiado de «Small Villa» con Play/Pause, estancias manuales, carga diferida, sin audio y respeto de movimiento reducido.
- Ritmo vertical optimizado bajo D-105 sin alterar contenido ni funciones: se eliminó el doble padding del equipo en fichas, se compactaron legal/footer y el placeholder de similares, y se redujo el alto de las vistas medidas sin overflow ni fallos de red.
- Evidencia: 257/257 pruebas, typecheck limpio y build de 45 páginas; revisión visual independiente en Chrome, escritorio y móvil, sin overflow ni fallos de red. El smoke funcional confirmó filtros, calculadora, reserva, carga diferida de 3D, Axe sin infracciones y móvil sin overflow.
- No se afirma disponibilidad actual. El repositorio público y la integración GitHub de Cloudflare Pages están autorizados (D-099); falta confirmar el primer despliegue HTTP. `.claude/` no se modificó.
- Sigue abierto el aviso conocido GHSA-ch52-4w7c-c8xp en la dependencia transitiva `http-cache-semantics` 4.2.0 de Astro 7.3.5; no se ejecutó `audit fix` ni se cambiaron dependencias.

## Historial anterior

## Estado actual — 2026-10-04

- Demo local funcional en Windows con pnpm: Home, Residential, Commercial y cinco fichas.
- Ficha demo: aérea ilustrativa, hipoteca, similares, tour 3D externo atribuido, reserva simulada y equipo.
- Importador real ejecutado con autorización: SQLite privada provisional con 43 inmuebles (26 residenciales y 17 comerciales), 308 medios, 42 cifras y un precio pendiente de revisión; `PRAGMA integrity_check = ok`.
- La página de equipo se validó durante la importación, pero el importador todavía no persiste agentes.
- El frontend **no usa la SQLite**: carga `data/private/demo-preview.json` y cae a datos sintéticos si falta.
- Evidencia de la demo: 227/227 pruebas, typecheck limpio, build de 8 páginas, 9 vistas sin overflow y 8 análisis Axe sin infracciones.
- Tour 3D: `Duplex` de SrMonteiro, CC BY 4.0, bajo demanda y rotulado como otra propiedad. La demo local no equivale a autorización de publicación.
- Commits locales previos: `301edd7` (demo) y `31c5ea4` (evidencia de embed). Sin push ni despliegue.

## Pendiente activo (histórico, superado)

La única lista de trabajo pendiente está en `specs/plan.md`. Primero debe diseñarse y probarse la proyección SQLite privada → snapshot público; una importación completa no conecta por sí sola la UI.

## Reglas que no deben perderse

- Nunca mezclar datos privados o campos bajo revisión con la salida pública.
- No afirmar disponibilidad actual de los inmuebles.
- No publicar ni hacer push sin autorización nueva.
- `.claude/` permanece fuera del flujo Codex y no se modifica.
