# Logs de Lorenzo

Registro de los cambios que hace Lorenzo (con su agente) en el proyecto. El más nuevo va arriba.
Gianni anota los suyos en `logsgianni.md`.

Formato: fecha, qué se cambió, archivos tocados y algo a tener en cuenta si hace falta.

---

## 2026-11-05: etapas 3 y 4, salas, mapas y eventos

- Salas con editor de mapa (`/panel/salas`): butacas numeradas con filas y pasillos, ubicación general, escenario y referencias.
- Eventos (`/panel/eventos`): varias funciones, imagen, precio por sector, lotes de preventa, publicar, finalizar, cancelar y bloquear butacas.
- Página pública: tarjetas con flyer y "Desde $", y página de cada evento (`/eventos/[id]`) con funciones, precios y plano.
- Archivos: `backend/db/migrations/005_salas_y_eventos.sql`, `backend/src/venues.mjs`, `backend/src/events.mjs`, `src/components/venue-map.tsx`, `src/app/dashboard/panel/salas`, `src/app/dashboard/panel/eventos`, `src/app/sites/[slug]/eventos`.
- Tener en cuenta: la migración 005 cambia el modelo (butacas y órdenes pasan de evento a función). Hay que aplicarla justo al mergear. La compra todavía no existe (etapa 5): los lotes se muestran pero su cupo no se descuenta.
