# Logs de Gianni

Registro de los cambios que hace Gianni (con su agente) en el proyecto. El más nuevo va arriba.
Lorenzo anota los suyos en `logsloren.md`.

Formato: fecha, qué se cambió, archivos tocados y algo a tener en cuenta si hace falta.

---

## 2026-11-05

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
