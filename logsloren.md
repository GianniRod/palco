# Logs de Lorenzo

Registro de los cambios que hace Lorenzo (con su agente) en el proyecto. El más nuevo va arriba.
Gianni anota los suyos en `logsgianni.md`.

Formato: fecha y hora, qué se cambió, archivos tocados y algo a tener en cuenta si hace falta.

---

## 2026-11-06 23:35: QR del cliente en el Inicio del panel

- El Inicio de la cuenta del cliente muestra cuántos QR tiene en total, usados y sin usar.
- Cuenta entradas vendidas y pagas del cliente de la sesión. No cuenta reservas sin pagar, devoluciones, eventos cancelados ni los QR de prueba de Puerta.
- Archivos: `backend/src/qr.mjs` (`getTicketCounts`), `src/app/dashboard/panel/page.tsx`, `backend/tests/checkout.test.mjs`. Sin migración.

## 2026-11-06 23:24: comisión por uso en el pago

- El comprador ahora paga entradas + comisión por uso. La pantalla de pago muestra la línea "Comisión por uso · 8%" y el total con la comisión. `confirmPayment` exige ese monto completo.
- El porcentaje sale del que tiene cada cliente en Admin → Clientes (ya existía; un cliente nuevo arranca en 8%). Cada orden guarda el suyo: cambiarlo no altera órdenes hechas.
- `orders.total` sigue siendo el valor de las entradas. Lo que paga el comprador es `amountDue` (total + `commission_amount`). Sin migración.
- Archivos: `backend/src/checkout.mjs`, `src/app/sites/[slug]/compra/[token]/page.tsx`, `backend/tests/checkout.test.mjs`.
- A tener en cuenta: al elegir entradas todavía se ve el total sin comisión. Mercado Pago tiene que cobrar `amountDue`, no `total`.

## 2026-11-06 19:25: el escáner muestra los datos de la entrada

- Con una entrada vendida, el resultado muestra sector, fila y butaca en grande, y abajo evento, función, titular y cuántas entradas tiene la compra. Las entradas de prueba de Puerta se ven como antes.
- Archivos: `backend/src/qr.mjs`, `src/app/scan/actions.ts`, `src/app/scan/_scanner.tsx`, `backend/tests/checkout.test.mjs`.
- A tener en cuenta: en `scan.palcotickets.com` se ve recién cuando esto llegue a main y Vercel lo publique. Sin migración nueva.

## 2026-11-06 18:51: compra de eventos solo por ubicación

- Merge de main en `dashboard/marca-nightowl` (eventos por ubicación y QR por evento de Gianni), sin conflictos.
- La compra de un evento `display: "list"` dibujaba un plano falso. Ahora muestra una lista de ubicaciones con precio y cantidad, sin plano, con los colores de la pestaña Compra. Una ubicación sin lugares dice "Agotado".
- La entrada, el resumen y el mail dicen solo el nombre de la ubicación ("VIP", "Campo"), sin ", ubicación general".
- Pruebas: dos del escáner seguían escaneando sin elegir evento, que ahora se rechaza. Se actualizaron y se sumó una entrada de otro evento del mismo cliente.
- Archivos: `src/components/checkout-scene.tsx`, `src/components/venue-map.tsx`, `src/app/sites/[slug]/compra/[token]/page.tsx`, `src/app/sites/[slug]/compra/[token]/actions.ts`, `backend/tests/checkout.test.mjs`.
- A tener en cuenta: falta confirmar si en Neon están aplicadas la 007, la 008 y la 009. No se tocó Neon.

## 2026-11-06 18:35: segunda memoria en `Memoria_EntreChats`

- Archivos nuevos para que Claude no pierda contexto entre chats: `STATUS.md`, `reglas-de-trabajo.md`, `preferencias-diseno.md`, `sistema-qr-gianni.md`, `mapa-del-proyecto.md`, `probar-en-local.md`, `errores-aprendidos.md` y carpeta `chats/`. Índice en el README.
- `CLAUDE.md` manda a leer `STATUS.md` al empezar.
- Sin cambios de código. La carpeta y `CLAUDE.md` siguen fuera del repo.

## 2026-11-06 00:51: rama actualizada con main y PR nueva

- Merge de main en `dashboard/marca-nightowl`. Se mantienen las formas libres de Gianni en el plano y el plano se puede tocar en la compra, también con forma libre.
- El pie de las páginas de cliente mantiene "Made by Nightowl" en lugar de "Tecnología de".
- No se suben `CLAUDE.md`, `Memoria_EntreChats/` ni `.claude/launch.json`.

## 2026-11-06 00:28: las entradas usan el QR con búho de Gianni

- Las entradas compradas ahora usan `brandedQrSvg` (`src/lib/branded-qr.ts`), el mismo generador de /admin/puerta: módulos redondeados, búho en el medio y corrección alta. A 224 px.
- Traídos de main sin cambios: `src/lib/branded-qr.ts`, `src/lib/owl-mark.ts` y `src/app/dashboard/admin/puerta/page.tsx`.
- Probado: la librería del escáner (qr-scanner) lee el QR con búho de la entrada y la validación da entrada válida. Falta probar con cámara real.
- Archivo: `src/app/sites/[slug]/compra/[token]/page.tsx`.

## 2026-11-06 00:27: compra dentro de las plantillas, con el mapa de Salas

- El plano de la compra usa el mapa de Salas y mapas: mismas filas, pasillos y lado del escenario. Se sacó el abanico.
- Nueva pestaña Compra en Mi página, con vista previa: fondo del plano, forma de butaca, estilo de entrada y título. Sin migración.
- La plantilla también cambia la compra: banda grande en Portada, resumen a la izquierda en Cartelera, y la tipografía de títulos.
- Arreglos: los toques rápidos ya no se pierden, en el celular baja a las butacas, lo ocupado se actualiza cada 30 segundos y la compra no pide la lista de eventos.
- QR: comprobado que las entradas compradas pasan por la misma validación del escáner que los QR de /admin/puerta (válida, duplicada, alterada y de otro cliente). Falta probar con cámara real.
- Regla de memoria entre chats en `CLAUDE.md` y primer resumen en `Memoria_EntreChats`.
- Archivos: `src/components/checkout-scene.tsx`, `checkout-heading.tsx`, `checkout-preview.tsx`, `ticket-card.tsx`, `venue-map.tsx`, `public-site.tsx`, `src/app/sites/[slug]/eventos/[id]/comprar`, `src/app/sites/[slug]/compra/[token]`, `src/app/dashboard/panel/mi-pagina/_editor.tsx`, `backend/src/sites.mjs`, `backend/tests/sites.test.mjs`, `CLAUDE.md`.

## 2026-11-05 23:43: rediseño de la compra sobre el plano

- Elegir entradas: el plano de la sala se toca por sector; las butacas tienen forma de butaca, en abanico y sobre fondo oscuro, con leyenda y escenario. Ubicación general con contador grande.
- Resumen con forma de ticket, donde se puede quitar cada entrada. En el celular, una barra lleva hasta el resumen.
- Pago: reserva y medio de pago en dos tarjetas, con cuenta regresiva que se resalta en el último minuto.
- Entradas: diseño de ticket con troquel y talón con el QR.
- Firma "Made by Nightowl" a la vista en los pasos de compra, en la página del evento, en la lista de eventos y en cada entrada.
- Archivos: `src/components/checkout-steps.tsx`, `src/components/venue-map.tsx`, `src/components/public-site.tsx`, `src/app/sites/[slug]/eventos/[id]/page.tsx`, `src/app/sites/[slug]/eventos/[id]/comprar`, `src/app/sites/[slug]/compra/[token]`.

## 2026-11-05 23:35: personalidad de Nightowl y firma "Made by Nightowl"

- Firma "Made by Nightowl" con el búho en la página de cada cliente, login, panel, escáner y 404. Reemplaza al "Tecnología de" del pie.
- Mails rediseñados con la marca: cabecera negra con logo, tono de Nightowl y firma, también en la versión de texto.
- Textos con la voz de Nightowl en compra, confirmación, panel y login. Los mensajes sobre plata quedan claros y sin chistes.
- Archivos: `src/components/made-by.tsx`, `src/lib/dashboard/email-templates.ts`, `src/lib/dashboard/email.ts`, `src/components/public-site.tsx`, `src/app/dashboard/_components/shell.tsx`, `src/app/dashboard/login`, `src/app/dashboard/olvide-contrasena`, `src/app/dashboard/panel/eventos/page.tsx`, `src/app/scan/layout.tsx`, `src/app/not-found.tsx`, `src/app/sites/[slug]/compra`, `src/app/sites/[slug]/eventos/[id]/comprar/_picker.tsx`, `backend/src/checkout.mjs`.
- Tener en cuenta: la firma es más visible en la página de cada cliente, que antes tenía solo una mención chica. No se probó un envío real de mail.

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
