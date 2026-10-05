# Plan 004 — Equipo, contacto y visitas

Estado: experiencia simulada implementada; el equipo todavía no se persiste en SQLite.

## Componentes

- `src/components/TeamSection.astro`: datos profesionales publicados, sin retratos inventados.
- `BookingFlow.astro` y `booking-flow.ts`: interfaz progresiva y manejo de foco.
- `src/domain/booking.ts`: fechas de Jersey, días laborables y franjas de 30 minutos.
- Tests de dominio, controlador, componentes e interacción completa en navegador.

## Verificación

Nada se envía, reserva ni guarda. La decisión sobre persistir/proyectar agentes pertenece a `../plan.md` P1.
