# Logs de Lorenzo

Registro de los cambios que hace Lorenzo (con su agente) en el proyecto. El más nuevo va arriba.
Gianni anota los suyos en `logsgianni.md`.

Formato: fecha y hora, qué se cambió, archivos tocados y algo a tener en cuenta si hace falta.

---

## 2026-11-05 22:39: etapa 5 sin Mercado Pago, compra con pago simulado

- Compra en la página del cliente: elegir función, butacas y ubicación general (`/eventos/[id]/comprar`), reserva de 10 minutos con cuenta regresiva y orden con sus QR (`/compra/[token]`).
- Lotes de preventa con cupo real: el precio pasa solo al lote siguiente, y una orden puede cruzar de un lote a otro.
- Confirmación de pago separada del cobro: un aviso repetido no duplica entradas, y un pago tardío queda para devolver si lo reservado ya se vendió.
- Escáner: ahora también reconoce entradas vendidas, con el mismo control de duplicados. Toqué `backend/src/qr.mjs` y `src/app/scan`, que venían de Gianni.
- Email con el link a las entradas (en local sale por consola).
- Archivos: `backend/db/migrations/008_compra.sql`, `backend/src/checkout.mjs`, `backend/src/seats.mjs`, `backend/src/sites.mjs`, `backend/src/qr.mjs`, `backend/tests/checkout.test.mjs`, `src/lib/checkout.ts`, `src/lib/dashboard/email.ts`, `src/app/scan`, `src/app/sites/[slug]/eventos/[id]/comprar`, `src/app/sites/[slug]/compra/[token]`.
- Tener en cuenta: **en producción la compra está apagada** hasta conectar un cobro real (`src/lib/checkout.ts`); el pago simulado no corre ahí. La migración 008 cambia `hold_seats` por `hold_order` y va después de la 007, que todavía no está en Neon. El cargo de servicio a cargo del comprador (`docs/negocio.md`) no está incluido en el total.

## 2026-11-05: etapas 3 y 4, salas, mapas y eventos

- Salas con editor de mapa (`/panel/salas`): butacas numeradas con filas y pasillos, ubicación general, escenario y referencias.
- Eventos (`/panel/eventos`): varias funciones, imagen, precio por sector, lotes de preventa, publicar, finalizar, cancelar y bloquear butacas.
- Página pública: tarjetas con flyer y "Desde $", y página de cada evento (`/eventos/[id]`) con funciones, precios y plano.
- Archivos: `backend/db/migrations/005_salas_y_eventos.sql`, `backend/src/venues.mjs`, `backend/src/events.mjs`, `src/components/venue-map.tsx`, `src/app/dashboard/panel/salas`, `src/app/dashboard/panel/eventos`, `src/app/sites/[slug]/eventos`.
- Tener en cuenta: la migración 005 cambia el modelo (butacas y órdenes pasan de evento a función). Hay que aplicarla justo al mergear. La compra todavía no existe (etapa 5): los lotes se muestran pero su cupo no se descuenta.
