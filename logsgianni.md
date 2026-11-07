# Logs de Gianni

Registro de los cambios que hace Gianni (con su agente) en el proyecto. El más nuevo va arriba.
Lorenzo anota los suyos en `logsloren.md`.

Formato: fecha, qué se cambió, archivos tocados y algo a tener en cuenta si hace falta.

---

## 2026-11-07

- **Logo de Mercado Pago en la compra + preferencia más completa**:
  - En la orden (`/compra/[token]`), el medio de pago muestra el **logo de Mercado Pago** (apretón de manos + "mercado pago") sobre fondo blanco fijo, así se lee también en webs oscuras, con "Tarjeta de crédito, débito o dinero en cuenta" y un aviso de pago seguro (hasta 12 cuotas). El botón "Pagar $X con Mercado Pago" lleva el apretón de manos. La demo de la landing (`checkout-flow.tsx`) pasa a mostrar un solo medio, Mercado Pago con su logo, igual que la compra real. Componente nuevo `src/components/mercado-pago-logo.tsx` (`MercadoPagoLogo`, `MercadoPagoMark`; el trazo es el de Simple Icons, CC0).
  - Preferencia (`createPreference`), según el checklist de calidad de Mercado Pago y los datos de la industria "tickets y entretenimiento": `items.category_id = "tickets"`, `description` (evento, lugar, ubicaciones), `event_date`, comprador con `name` y `surname` separados, y `statement_descriptor` con `NIGHTOWL` si el nombre del boliche no sirve. Mejora la aprobación y baja los desconocimientos.
  - **Webhook registrado** en Mercado Pago (app **nightowl**, 8362391169427133), producción y prueba: `https://www.nightowl.com.ar/api/webhooks/mercadopago?source_news=webhooks`. Temas: Pagos (más reclamos, contracargos y vinculación, que ya estaban; el endpoint les responde 200 y no hace nada). Falta copiar la clave secreta (panel → Webhooks, empieza con `532cfd7`) a `MP_WEBHOOK_SECRET` y el Access Token de prueba a `MP_ACCESS_TOKEN` (local y Vercel). Sin la clave, en producción todos los avisos se rechazan con 401.
  - Archivos: `src/components/mercado-pago-logo.tsx` (nuevo), `src/app/sites/[slug]/compra/[token]/_pay.tsx`, `src/components/checkout-flow.tsx`, `backend/src/mercadopago.mjs`, `.env.example`. Ojo Lorenzo: toqué `createPreference` (payer y items).
- **Sin "Made by Nightowl" y precios con tarifa de servicio**:
  - Se sacó la firma "Made by Nightowl" de todos lados (web del cliente, página del evento, pasos de la compra, entrada, panel, login, escáner y 404). El pie de la web del cliente vuelve a decir **"Tecnología de [logo Nightowl]"** (`PoweredByNightowl` en `src/components/made-by.tsx`); los mails firman "Tecnología de Nightowl". Fuera el búho a la izquierda de "¡Ya estás adentro!" y la firma de la tarjeta de la entrada.
  - La comisión se muestra como **"Tarifa de servicio"**, sin el porcentaje. Cada precio dice **"$10.000 + $800"** (precio + tarifa) en la tarjeta del evento ("Desde"), la lista de precios y el plano del evento, la lista de ubicaciones, el plano y el resumen de la compra, y la orden. El resumen de la compra ahora suma la tarifa al total (antes mostraba el total sin comisión) y coincide con lo que se cobra.
  - `backend/src/sites.mjs`: `getPublicSite` (en cada evento) y `getPublicEvent` devuelven `feePercent`. `serviceFee` y `formatPriceWithFee` en `src/components/public-site.tsx`.
  - Archivos: `src/components/made-by.tsx`, `public-site.tsx`, `checkout-scene.tsx`, `checkout-steps.tsx`, `ticket-card.tsx`, `src/app/sites/[slug]/eventos/[id]/page.tsx`, `comprar/page.tsx`, `comprar/_picker.tsx`, `src/app/sites/[slug]/compra/[token]/page.tsx`, `src/app/dashboard/_components/shell.tsx`, `src/app/not-found.tsx`, `src/app/scan/layout.tsx`, `src/lib/dashboard/email-templates.ts`, `backend/src/sites.mjs`. Ojo Lorenzo: toqué tu firma, tus plantillas de mail y `findPublishedSite`.
- **Mudanza a nightowl.com.ar**: el dominio de Nightowl pasa a ser `nightowl.com.ar` (DNS en Vercel). Panel en `dashboard.nightowl.com.ar`, escáner en `scan.nightowl.com.ar`, cada boliche en `slug.nightowl.com.ar`, landing en `www.nightowl.com.ar`. Todo lo de **palcotickets.com redirige** (308, misma ruta) a lo mismo en nightowl.com.ar desde `src/proxy.ts`; `/api` queda afuera, así los webhooks de Mercado Pago a la URL vieja siguen llegando y la vuelta de compras ya empezadas funciona. El dominio vive en una constante (`ROOT_DOMAIN` en `src/lib/dashboard/config.ts`, con `publicSiteHost` y `legacyRedirectHost`). La cookie de sesión pasa a `__Host-nightowl_session`: **hay que volver a iniciar sesión** (igual pasaba por cambiar de dominio). Los **mails siguen saliendo y llegando a palcotickets.com** (contacto@, no-responder@) hasta verificar nightowl.com.ar en Resend y armar el reenvío. Archivos: `src/lib/dashboard/config.ts`, `src/proxy.ts`, `src/lib/site.ts`, `src/lib/payments.ts`, `src/lib/dashboard/email.ts`, `src/app/api/demo/route.ts`, `src/app/page.tsx`, `src/app/teatros/page.tsx`, `src/app/dashboard/admin/_scan-fab.tsx`, `src/app/dashboard/admin/clientes/_forms.tsx`, `[id]/page.tsx`, `src/app/dashboard/panel/page.tsx`, docs, READMEs y `backend/scripts/create-admin.mjs`. Ojo Lorenzo: cambia el dominio del panel y el nombre de la cookie.
- **Cobro con Mercado Pago, etapa 1 (token de prueba de Nightowl)**: el botón "Pagar con Mercado Pago" crea una preferencia de Checkout Pro (una línea con el total, `external_reference` = id de la orden, vence con la reserva, `binary_mode`, sin Rapipago/Pago Fácil/cajeros) y lleva al comprador a Mercado Pago. Lo aprobado entra por dos lados y los dos llaman a `confirmPayment`: el **webhook** `POST /api/webhooks/mercadopago` (firma `x-signature` validada igual que el SDK oficial, consulta el pago a Mercado Pago) y la **vuelta** `GET /api/mercadopago/vuelta` en el dominio del cliente (consulta el pago y redirige a la orden; con rechazo muestra aviso). El mail con las entradas sale una sola vez (`orders.tickets_emailed_at`). Sin `MP_ACCESS_TOKEN` sigue el pago simulado en desarrollo. En producción la compra sigue apagada salvo `CHECKOUT_ENABLED=true`. Todavía sin split ni `marketplace_fee` (etapa 2: OAuth por boliche). Migración nueva `010_mercadopago.sql` (ya aplicada). Archivos: `backend/src/mercadopago.mjs` y `backend/tests/mercadopago.test.mjs` (nuevos), `src/app/api/webhooks/mercadopago/route.ts`, `src/app/api/mercadopago/vuelta/route.ts`, `src/lib/payments.ts` (nuevos), `src/app/sites/[slug]/compra/[token]/actions.ts`, `_pay.tsx`, `page.tsx`, `src/lib/checkout.ts`, `.env.example`. Ojo Lorenzo: no toqué `checkout.mjs`; el mail de compra ahora pasa por `sendTicketsOnce` (también el del pago simulado).

## 2026-11-06

- **Plan de integración de Mercado Pago** (`docs/pagos-mercadopago.html`, nuevo): pasos a seguir para cobrar con Mercado Pago Marketplace (Checkout Pro + `marketplace_fee`): crear la app, tabla `payment_accounts`, OAuth "Conectar Mercado Pago", preferencia con el token del boliche, webhook con firma que llama a `confirmPayment`, página de vuelta, devoluciones, renovación de tokens, encendido y checklist de sandbox. Solo documentación, sin código.
- **Presentación: referencia de $819.000 por boliche y noche** (`src/components/pitch-deck.tsx`): Nightowl se lleva $819.000 por noche (8% de ≈ $10,2 M en entradas). Recupero: 6 noches, menos de 1 mes con 8 eventos (mínimo 4, máximo 7). Reemplaza el supuesto de 500 generales + 20 VIP.
- **Presentación: recupero con precios reales de boliche** (`src/components/pitch-deck.tsx`): la noche ya no es el supuesto fijo del Excel ($6,15 M) sino 500 generales a $11.000 de promedio (de $8.000 a $14.000 según la tanda) + 20 VIP a $42.500 = $6,35 M; Nightowl $508.000 por noche (8%). Recupero: 9 noches (≈ 1 mes), mínimo 7, máximo 11. La nota al pie explica el supuesto.
- **Presentación con el presupuesto de salida a mercado** (`src/components/pitch-deck.tsx`, datos de `assets/NIGHTOWL_Presupuesto_Salida_a_Mercado.xlsx`): en "Qué buscamos" el monto ahora es USD 2.638 (≈ $4,1 M, escenario base; rango USD 2.000 a 3.286) y hay una diapositiva nueva, "En qué se usa y cuándo vuelve": las 4 categorías con barras y el recupero (9 noches de un boliche, ≈ 1,1 meses; venta necesaria $51,8 M al 8%). Los números se calculan en el código a partir de los montos del Excel. La segunda pestaña del Excel no muestra nada porque el archivo nunca se calculó (fórmulas sin valor guardado) y el gráfico usa referencias numéricas para categorías de texto.
- **QR por evento: se elige el evento para generar y para escanear**: en Puerta (prueba) el admin elige el evento puntual del cliente (agrupado por cliente) o "Prueba general". En scan.palcotickets.com, antes de escanear se elige el evento: el usuario de cliente solo ve los de su cliente (con uno solo entra directo), el admin además tiene "Cualquier evento". Un QR (vendido o de prueba) de otro evento sale inválido: "Esta entrada es de otro evento: X". Migración nueva `009_qr_por_evento.sql` (`qr_test_tickets.event_id`), hay que aplicarla. Archivos: `backend/src/qr.mjs` (`listEventsForTests`, `listScanEvents`, `getScanEvent`, `scanTicket(..., eventId)`), `src/app/scan/page.tsx`, `actions.ts`, `_scanner.tsx`, `src/app/dashboard/admin/puerta/*`, `docs/dashboard.md`. Ojo Lorenzo: toqué `scanSoldTicket` (tu parte de entradas vendidas) para que también chequee el evento.
- **Eventos que se venden solo por ubicación (boliches)**: al crear un evento se elige "Con mapa de la sala" o "Solo por ubicación" (General, VIP, mesas… con capacidad, sin dibujar mapa; si no hay sala, se escribe el nombre del lugar y se crea). En la página del evento, en borrador, se editan las ubicaciones; la página pública no muestra plano. Se guarda como un mapa de sectores generales con `display: "list"`, así compra, cupos y escáner funcionan igual. Archivos: `backend/src/events.mjs` (`locationsMap`, `saveEventLocations`, `createEvent` con `mode`), `backend/src/venues.mjs` (`parseMap` conserva `display`), `backend/tests/locations.test.mjs` (nuevo), `src/app/dashboard/panel/eventos/_locations.tsx` (nuevo), `_forms.tsx`, `actions.ts`, `nuevo/page.tsx`, `[id]/page.tsx`, `src/app/sites/[slug]/eventos/[id]/page.tsx`, `docs/dashboard.md`. Ojo Lorenzo: `copyMap` empareja sectores por nombre; al renombrar una ubicación primero renombro por `map_key` para no duplicar (el mismo problema puede pasar al renombrar un sector de una sala y "Actualizar desde la sala").
- **Web del cliente impecable en celular y compu + pluma y curvatura en el editor de salas**:
  - Web pública (`src/components/public-site.tsx`, `src/app/sites/[slug]/eventos/[id]/page.tsx`): títulos con tamaños que siguen al ancho (`clamp` + `cqi`), textos largos que cortan en vez de salirse (`FIT`: overflow-wrap + hyphens), nombre del header con "…" sin empujar el botón Entradas, barrita de los títulos de sección alineada a la primera línea y portada de Cartelera con su proporción en el celular. Probado con textos extremos a 320, 390, 820 y 1366 px: nada se sale del ancho.
  - Editor de salas: botón **Pluma** en el panel Forma (cuadrados = mover esquinas, círculos = curvar el lado, doble clic = agregar punto, Quitar punto, Volver a rectángulo) y deslizador de **Curvatura** (un lado o todos). En el celular el mapa va arriba. Las butacas se recortan con la forma. Archivos: `salas/[id]/_pen.tsx` y `_shape.ts` (nuevos), `_editor.tsx`, `src/components/venue-map.tsx` (`shape` en `MapSector`, `shapePath`), `docs/dashboard.md`.
  - Backend: `backend/src/venues.mjs` acepta `shape` en cada sector (3 a 24 puntos, valores limitados); test nuevo `backend/tests/map-shape.test.mjs`. Sin migración: el mapa ya se guarda como JSON.

## 2026-11-05

- **Escáner en scan.palcotickets.com + permiso de escaneo por usuario**:
  - Nueva app `src/app/scan` (login propio con la misma cuenta, solo celular). `src/proxy.ts` rutea `scan.palcotickets.com`
    y `scan.localhost`; `scan` quedó reservado como subdominio (no puede ser slug de cliente).
  - Admins de Nightowl (Gianni y Lorenzo) escanean entradas de **todos** los clientes. Un usuario de cliente con
    "Puede escanear QR" (o portero) **solo las de su cliente**; las de otro organizador salen inválidas.
  - **Panel del cliente → Equipo** (nuevo): el dueño crea cuentas (portero, editor, ventas, dueño), elige si pueden escanear
    y lo puede cambiar después. También el admin con "Editar como el cliente". Auditado.
  - Admin → ficha del cliente: al crear usuario, casilla "Puede escanear QR"; la lista muestra quién puede.
  - Admin → **Puerta (prueba)**: ya no tiene el escáner; crea los QR de prueba eligiendo de qué cliente son
    (o generales, solo admins). El botón "Escanear QR" del celular abre scan.palcotickets.com.
  - **Migración nueva `007_escaneo.sql`**: `memberships.can_scan` (dueños y porteros existentes quedan en true) y
    `qr_test_tickets.organization_id`. **Hay que correr `npm run db:migrate` en `backend/`.**
  Archivos: `src/app/scan/*`, `src/app/dashboard/panel/equipo/*`, `backend/src/team.mjs` (nuevo), `backend/src/qr.mjs`,
  `backend/src/admin.mjs`, `src/lib/dashboard/config.ts`, `src/proxy.ts`, `admin/puerta/*`, `admin/clientes/*`,
  `admin/_scan-fab.tsx`, `panel/layout.tsx`, `_components/auth-forms.tsx`, `docs/dashboard.md`.
- **Landing con el zoom alejado / pantallas muy grandes**:
  - Si la pantalla es más alta que la página, el footer se estira (`flex-1`) en lugar de dejar un hueco blanco
    entre el contenido y el pie (antes el que crecía era `main`).
  - Teatros: la cinta que se desplaza tiene la lista 4 veces por mitad (y 160 s para la misma velocidad),
    así no queda un hueco a la derecha en pantallas anchas.
  Archivos: `src/app/page.tsx`, `src/app/teatros/page.tsx`, `src/app/globals.css`.
- **Landing responsive (celular)**, boliches y teatros:
  - Ticket final "Veamos Nightowl…": en el celular el talón "Pedir demo" va abajo con el troquel horizontal
    (antes el texto quedaba apretado en una columna angosta). Clase `.cierre` + reglas en `globals.css`.
  - Título principal: el chip que rota y la coma van juntos, así la coma no queda sola al principio del renglón.
  - Revisado a 390 px: editor, venta, comisiones, puerta, preguntas, footer y 404 ya se veían bien.
  Archivos: `src/app/page.tsx`, `src/app/teatros/page.tsx`, `src/app/globals.css`.
- **Dashboard responsive (celular)**:
  - El menú lateral pasa a una barra arriba con logo y botón ☰ que despliega todas las secciones en columna
    (grandes para el dedo) más la cuenta (email, cambiar contraseña, salir). Se cierra al tocar una sección.
    Antes las secciones quedaban en una fila cortada de costado y no se veían todas.
  - Lugar libre abajo en el admin para que el botón fijo "Escanear QR" no tape el final de las páginas (`fabSpace` en `Shell`).
  - Auditoría: en el celular, una tarjeta por movimiento (la tabla no entraba).
  - `backend/src/qr.mjs`: lee las claves de la base antes de generar unas nuevas.
  Archivos: `_components/shell.tsx`, `_components/mobile-nav.tsx` (nuevo), `admin/layout.tsx`, `admin/auditoria/page.tsx`.
- **Puerta (prueba): la pantalla de la compu se actualiza sola** cada 2 s mientras está a la vista, así al escanear
  desde el celular el QR pasa a "Usada" sin recargar. Archivo: `src/app/dashboard/admin/puerta/_auto-refresh.tsx`.
- **Sistema de prueba de QR (escaneo con control de duplicados)**: panel admin → "Puerta (prueba)".
  - Compu: crear entradas de prueba (con nombre opcional), ver sus QR reales, marcarlas sin usar o borrarlas.
  - Celular (solo celu): botón grande "Escanear QR" (también flotante en todo el admin). Abre la cámara (`qr-scanner`),
    valida en el servidor y muestra pantalla completa: verde "Entrada válida", amarillo "Ya fue usada" (hora y quién),
    rojo "Entrada inválida". Vibra distinto según el resultado.
  - QR firmado con Ed25519: `NO1.<id>.<firma>` (`backend/src/qr.mjs`, tests en `backend/tests/qr.test.mjs`, sin base).
  - **Migración nueva `backend/db/migrations/006_qr_prueba.sql`**: tablas `qr_signing_keys`, `qr_test_tickets`, `qr_scans`.
    No toca `tickets`. **Hay que correr `npm run db:migrate` en `backend/`** (no la pude aplicar yo).
  - Dependencias nuevas: `qrcode`, `qr-scanner`, `@types/qrcode`.
  Archivos: `src/app/dashboard/admin/puerta/*`, `src/app/dashboard/admin/_scan-fab.tsx`, `admin/layout.tsx`, `docs/dashboard.md`.
- **Portada: recorte automático de bordes negros** al subirla (capturas de Instagram o de video con franjas).
  Una fila o columna es borde si casi no tiene píxeles con luz; nunca recorta más del 35% por lado.
  El aviso ahora explica que se recortó y pide la foto original (no una captura) de al menos 1920 px.
  Archivo: `src/app/dashboard/panel/mi-pagina/_editor.tsx`.
- **Portada de la web del cliente con más calidad.** La de Moscu se veía mal porque la imagen subida mide 725×311 px.
  - El editor ahora la guarda hasta 2400 px de ancho, en WebP (o JPG) con calidad 0.9, y solo la achica si no entra.
  - Avisa cuando la imagen mide menos de 1600 px de ancho y pide una de al menos 1920 px.
  - Límite de portada en el servidor: de 900 KB a 1,6 MB (`backend/src/sites.mjs`, con su test actualizado).
    `bodySizeLimit` de las Server Actions: de 2 MB a 4 MB (`next.config.ts`).
  Archivos: `src/app/dashboard/panel/mi-pagina/_editor.tsx`, `backend/src/sites.mjs`, `backend/tests/sites.test.mjs`, `next.config.ts`.
  **Lorenzo:** no pude correr los tests del backend (no tengo `TEST_DATABASE_URL`); conviene correrlos.
- **Web pública del cliente (plantillas de Lorenzo) más prolija**, en `src/components/public-site.tsx`:
  - Header: la marca es clickeable (vuelve al inicio), botón "Entradas" con el color del cliente,
    fondo semitransparente con desenfoque y se sacó la franja de color de abajo (con colores claros parecía una línea gris).
  - Títulos de sección más grandes con una barrita del color del cliente; más aire entre secciones;
    el aviso de "sin fechas" pasó a recuadro punteado.
  - Footer: franja final con "© año + nombre" y **"Tecnología de [logo Nightowl]"** que lleva a www.palcotickets.com.
  Afecta a las 3 plantillas y a la vista previa del editor de Mi página.
- **Tamaño del logo editable**: en la animación del editor (pestaña Textos) el cliente sube su logo y lo agranda
  con un deslizador "Tamaño"; en la vista previa el logo crece en vivo. Especificado para "Mi página" en
  `docs/dashboard.md` (3.1, Identidad). Archivo: `src/components/site-builder.tsx`.
- **"Base de datos" y "Estadísticas" también en el panel del cliente** (como "Pronto"), con solo sus datos.
  Docs: `docs/dashboard.md` secciones 3.7 y 3.8 (Equipo pasó a 3.9) y `docs/negocio.md`. Archivo: `src/app/dashboard/panel/layout.tsx`.
- **Panel admin: "Base de datos" y "Estadísticas" en el menú como "Pronto"** (todavía no abren nada).
  Qué va a tener cada una, en `docs/dashboard.md` (sección 2, puntos 6 y 7, y orden de trabajo punto 8)
  y en los próximos pasos de `docs/negocio.md`. Archivo: `src/app/dashboard/admin/layout.tsx`.
- **Los admins pueden editar la web del cliente** (salas, precios, eventos, su página) por si el cliente
  delega el trabajo. "Ver como el cliente" pasó a llamarse **"Editar como el cliente"** y la franja del panel lo aclara.
  Nuevo helper `requireEditor()` en `src/lib/dashboard/session.ts` (acepta owner, editor y soporte):
  **Lorenzo, usalo en cada sección del panel que edite datos** (salas, eventos, precios) para que los admins también puedan.
  Regla documentada en `docs/dashboard.md` (punto 3 del panel admin). También corregí "Comisión de Palco" → Nightowl en el inicio del panel.
  Archivos: `session.ts`, `admin/clientes/[id]/page.tsx`, `panel/layout.tsx`, `panel/page.tsx`, `admin/auditoria/page.tsx`, `docs/dashboard.md`.
- **Comisión por defecto al crear cliente: 8%** (antes 5%). Se puede cambiar en el formulario.
  Archivo: `src/app/dashboard/admin/clientes/_forms.tsx`.
- **Dashboard en blanco y negro**, igual que la landing (clase `.minimal` en el layout del panel).
  La franja de "ver como el cliente" pasó de dorado a gris y el recuadro de contraseña inicial a borde negro.
  Archivos: `src/app/dashboard/layout.tsx`, `panel/layout.tsx`, `_components/shell.tsx`, `_components/ui.tsx`, `src/app/globals.css`.
  Solo clases de color, nada de lógica.
- **Conexión a Neon**: el proyecto local apunta a la base "Palco" de Lorenzo (rama production) con
  `.env.local` en la raíz y en `backend/` (no se suben a git). No se tocaron datos ni migraciones.
- **Skills de Neon para agentes** en `.claude/skills/` y `skills-lock.json` (`npx neon skills`).
- **Rebrand a Nightowl** (antes Palco): logo, favicon, textos de la web y del panel. Los tokens
  `palco-*` de CSS y el tipo de butaca "Palco" se mantienen. El dominio sigue siendo palcotickets.com por ahora.
- **Web**: calculadora de comisiones (Nightowl 8% vs Passline/Passify 15%), cargo por servicio del checkout al 8%,
  búho que se asoma en los botones "Pedir demo", memorial de Palco en el footer y página `/palco`,
  página 404, animación del editor (mesas, calendario, pluma, imagen, barra de progreso y velocidad),
  notas de "animación de referencia" y de "web a medida".
- **Presentación para inversores** en `/presentacion` (13 diapositivas, no indexada).
