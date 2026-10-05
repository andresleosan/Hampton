# Tareas 001 - Estado de la demo

## Actualización 2026-10-05

- [x] **T5. Aceptar y proyectar la fuente privada.** La SQLite autorizada se lee sin mutación; el hash se mantiene en `201D531EF95ABE02ADEBAB25BF78ED02C84CEAE6967BCBF419AF133CAB216F01` y pruebas de integración cubren salida determinista, exclusiones y omisiones.
- [x] **T6. Cachear portadas de forma acotada.** Solo se solicita la primera URL de imagen, secuencialmente y bajo la política HTTP existente; 38 descargas quedan privadas, un exceso de tamaño se registra por referencia opaca y la caché invalida una imagen si cambia su fuente.

Las notas inferiores describen el estado previo a esta actualización.

- [x] **T1. Implementar transporte controlado.** Allowlist, DNS, robots, límites, retries y redirects cubiertos por tests.
- [x] **T2. Interpretar listados Wix.** Residencial y tres páginas comerciales con señales positivas de final cubiertas por tests.
- [x] **T3. Escribir SQLite provisional de forma atómica.** Esquema, integridad y CLI cubiertos por tests.
- [x] **T4. Ejecutar importación autorizada.** 26 residenciales, 17 comerciales, un pendiente y cero errores de ejecución.

No hay otra lista pendiente aquí: persistencia del equipo, aceptación y proyección pública están en `../plan.md` P1–P2.
