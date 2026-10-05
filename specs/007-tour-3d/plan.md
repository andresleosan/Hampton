# Plan 007 — Tour 3D

Estado: ejemplo externo implementado y verificado en la demo local; publicación no autorizada.

## Componentes

- `src/components/Tour3D.astro`: carga bajo demanda del iframe, estado y fallback.
- Modelo `Duplex` de SrMonteiro, CC BY 4.0, con enlace, autor y licencia visibles.
- El bloque y su salto solo aparecen cuando `listing.demo.tour3d` es verdadero.
- Tests de contenido/red y recorrido FPS observado en navegador.

## Verificación

No hay request a Sketchfab antes del clic y no se solicitan permisos de dispositivo. Las fuentes y la conclusión limitada del embed están en `docs/SOURCES.md`; esto no autoriza publicación.
