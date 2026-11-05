# Logs de Gianni

Registro de los cambios que hace Gianni (con su agente) en el proyecto. El más nuevo va arriba.
Lorenzo anota los suyos en `logsloren.md`.

Formato: fecha, qué se cambió, archivos tocados y algo a tener en cuenta si hace falta.

---

## 2026-11-05

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
