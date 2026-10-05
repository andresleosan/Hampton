# Plan transversal activo

## Cierre vigente — 2026-10-05

Esta sección sustituye el estado y la lista P1–P3 conservados más abajo como historial. No hay publicación autorizada.

- [x] **P1. Límite privado → público.** Se acepta como fuente inmutable `data/private/hampton-source-20261004.sqlite`; el equipo verificado sigue siendo una fuente curada separada. La proyección usa un contrato cerrado y omite registros confidenciales y valores pendientes.
- [x] **P2. Proyección determinista.** `pnpm snapshot:local` genera el snapshot y el informe privados sin modificar SQLite. Resultado: 42 fichas públicas, una exclusión confidencial y un precio omitido por revisión.
- [x] **P3. UI y portadas.** Home, Residential, Commercial y las fichas cargan el snapshot proyectado. La caché acotada obtuvo 38 primeras imágenes; tres fichas conservan cinco fotos verificadas y una usa placeholder por límite de tamaño. No se recorrieron las demás imágenes.
- [ ] **P4. Publicación.** Requiere autorización nueva, revisión de seguridad/acceso/proveedor y rollback. Push y despliegue siguen fuera de alcance.

Evidencia final: 255/255 pruebas, typecheck sin diagnósticos y 45 páginas construidas. La revisión visual independiente en Chrome cubrió escritorio y móvil sin overflow ni fallos de red, confirmó ambos retratos por píxeles, calculadora y reserva, y el recorrido de «Small Villa» con autoplay, Pause/Resume y salto manual a Kitchen. P4 continúa fuera de alcance.

## Historial anterior

Estado: demo local verificada; integración de la fuente real con la UI pendiente. No hay publicación autorizada.

## Arquitectura vigente

1. `src/importer/` consulta fuentes autorizadas y escribe una SQLite privada provisional solo si la ejecución queda completa.
2. La SQLite conserva datos de origen, normalización y revisiones; nunca se sirve al navegador.
3. `src/data/preview.ts` carga hoy `data/private/demo-preview.json`, un snapshot curado, con fallback sintético.
4. Astro genera páginas estáticas desde el contrato público de `src/domain/public-contract.ts`.

## Resultado disponible

- Importación real: 43 inmuebles, tres secciones de origen completas, un precio pendiente y SQLite íntegra.
- Demo: 8 páginas, recorridos de hipoteca y reserva, tour 3D bajo demanda y layouts responsive.
- Verificación: `pnpm test`, `pnpm typecheck`, `pnpm build` y smoke de navegador.

## Pendientes — lista única

- [ ] **P1. Definir el límite privado→público.** Decidir qué ejecución SQLite se acepta, persistir el equipo o declarar su fuente curada, y especificar la proyección al contrato público. Hecho cuando ningún campo privado, pendiente o no aprobado puede llegar al JSON público.
- [ ] **P2. Implementar la proyección SQLite→snapshot público.** Generar un artefacto público determinista; el frontend no debe consultar SQLite directamente. Hecho cuando pruebas de integración comparan la base aceptada, el informe de exclusiones y el JSON producido.
- [ ] **P3. Conectar y validar la UI.** Cambiar el loader al snapshot proyectado, mantener etiquetas de procedencia y repetir tests, typecheck, build y navegador. Hecho cuando la UI ya no depende del `demo-preview.json` manual y no afirma disponibilidad actual.
- [ ] **P4. Publicación.** Solo tras autorización nueva: revisar seguridad, acceso, proveedor y rollback. Push y despliegue permanecen fuera de alcance.

## Regla de ejecución

Para cada pendiente: actualizar primero la spec afectada si cambia un requisito, ajustar su plan/tareas, implementar pruebas primero cuando haya lógica nueva y registrar evidencia real. No reabrir documentos históricos ni crear informes paralelos.
