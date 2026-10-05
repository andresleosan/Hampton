# Plan 005 — Calculadora hipotecaria

Estado: implementada en la demo local.

## Componentes

- `src/domain/mortgage.ts`: validación y fórmula de amortización.
- `src/components/MortgageCalculator.astro`: entradas, resultados, errores y avisos.
- La ficha solo la habilita para venta abierta con precio GBP publicable.
- Tests de dominio, estructura e interacción en navegador.

## Verificación

La salida es orientativa, en GBP, y no incluye impuestos, seguro ni supuestos estadounidenses. La spec completa requiere validación AC por AC antes de declararse cerrada.
