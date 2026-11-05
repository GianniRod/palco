# Dashboard de Nightowl: cómo tiene que ser

Documento para quien construya el panel. Resume lo que definimos para el producto y propone
cómo encararlo técnicamente. Lo marcado con **[A definir]** es una decisión que
tomé por defecto y conviene confirmar.

---

## 1. La idea en una frase

Todos entran por **`dashboard.palcotickets.com`** con usuario y contraseña.
Según quién sea, ve uno de dos paneles:

| Rol | Quién es | Qué ve |
|---|---|---|
| **Admin de Nightowl** | Nosotros, el equipo de Nightowl | Panel de administración: clientes, usuarios, todo el sistema |
| **Cliente** | Un teatro, sala, boliche, productora | Su panel: su página, sus eventos, sus ventas. **Nunca** ve datos de otro cliente |

- **No hay registro público.** Las cuentas de clientes las creamos nosotros desde el panel admin.
- Es el **mismo link y el mismo login** para los dos; el sistema decide qué panel mostrar según el rol del usuario.

---

## 2. Panel de administrador (nosotros)

Lo mínimo para operar:

1. **Clientes (organizaciones)**
   - Crear cliente: nombre, slug (ej. `teatro-colon`), datos de contacto, CUIT **[A definir]**.
   - Ver el listado, buscar, suspender / reactivar.
2. **Usuarios del cliente**
   - Crear el usuario del cliente: email + contraseña inicial.
   - Al primer ingreso, el cliente **está obligado a cambiar la contraseña**.
   - Resetear contraseña, desactivar usuario.
3. **Editar como el cliente** (soporte o trabajo delegado): el admin entra al panel de un cliente
   y puede hacer **todo lo que hace el dueño**: su página, salas y mapas, eventos, precios y lotes.
   Sirve para ayudarlo o cuando el cliente nos delega la carga. Queda registrado en la auditoría
   quién entró, cuándo y cada cambio que hizo.
   - Técnicamente: la sesión del admin guarda `acting_organization_id` y `resolveTenant` devuelve el
     rol `soporte`. Toda sección que edite datos del cliente usa `requireEditor()`
     (`src/lib/dashboard/session.ts`), que acepta `owner`, `editor` y `soporte`.
   - El `organization_id` sale siempre de la sesión (`requireTenant`/`requireEditor`), nunca del formulario.
   - En la auditoría se guarda el email real del admin (`session.email`), no el del cliente.
4. **Comisión de Nightowl por cliente** (el % que cobramos en cada venta, ver sección 6).
5. **Auditoría**: registro de acciones importantes (creación de clientes, cambios de precios, reembolsos, ingresos como otro usuario).
6. **Base de datos** *(Pronto, ya aparece en el menú)*: ver los datos del sistema sin entrar a Neon.
   - Tablas principales en solo lectura: clientes, usuarios, eventos, funciones, órdenes y entradas.
   - Buscar y filtrar (por cliente, email, fecha, estado) y exportar a CSV.
   - Cualquier corrección se hace desde las pantallas del panel (que auditan), no editando la tabla a mano.
7. **Estadísticas** *(Pronto, ya aparece en el menú)*: cómo va el negocio de Nightowl.
   - Totales: entradas vendidas, recaudación de los clientes, comisión cobrada por Nightowl, clientes activos.
   - Por cliente y por período (día, semana, mes), con gráficos de evolución.
   - Ranking de clientes y eventos que más venden.

Los admins deberían tener **doble factor (2FA)** porque pueden ver todo. **[A definir]**

---

## 3. Panel del cliente

Menú lateral con estas secciones:

### 3.1 Mi página
Configura su sitio público de venta. **No diseña desde cero**: elige una de nuestras
**3 plantillas de diseño** y la personaliza.

- **Diseño (plantilla)**: estructura de la página. Hoy proponemos:
  - **Dividida**: info del evento a un lado, plano y precios al otro.
  - **Portada**: banner grande con el evento principal.
  - **Cartelera**: grilla con varias funciones/fechas (teatros con temporada).
- **Identidad**: nombre, logo, color principal (muestra o código hex), fondo claro/oscuro, tipografía de títulos.
- **Contenido**: textos de presentación, redes, contacto, dirección.
- **Vista previa en vivo** mientras edita, y botón **Publicar**.

Es exactamente lo que muestra la animación de la sección "Editor" de la landing
(`src/components/site-builder.tsx`): sirve como referencia visual.

**Dónde vive la página pública del cliente**: la idea es que quede **integrada en la web
del cliente**, por ejemplo `moscubuenosaires.com/tickets`. Formas de lograrlo (ver
`docs/negocio.md`, sección 3.1):
- **Ruta propia** (`suweb.com/tickets`): el hosting del cliente hace de proxy de `/tickets/*`
  hacia Nightowl. Nightowl tiene que poder servir el sitio del cliente bajo un **prefijo de ruta
  configurable** (`basePath` por cliente) y con URLs relativas a ese prefijo.
- **Widget embebido**: un `<script>` que inserta la compra en un iframe dentro de su web.
- **Subdominio propio** (`tickets.suweb.com`): CNAME hacia nosotros; Nightowl resuelve el cliente por el `Host`.
- **Por defecto / mientras tanto**: `slug.palcotickets.com`.

En el panel conviene una pantalla **"Conectar a mi web"** que muestre el estado de cada
opción y las instrucciones (registro DNS a crear, código del widget, etc.).

### 3.2 Salas y mapas
Una organización puede tener una o varias salas físicas. Para cada sala, un
**editor de mapa**:

- Sectores de **butacas numeradas** (filas, cantidad de butacas, pasillos, palcos).
- Sectores de **ubicación general** (campo, tribuna sin numerar) con **capacidad**.
- Escenario y referencias visuales.

El mapa de la sala es una **plantilla**: cuando se crea un evento, se copia al evento.
Así, si el teatro cambia el mapa, no se rompen las funciones ya vendidas.

### 3.3 Eventos
- Crear evento: título, descripción, imagen, sala, **una o varias funciones** (fecha y hora).
- Por evento/función: precio por sector y **lotes de preventa** (precio y cupo propios, fecha de inicio y fin).
- Bloquear butacas (invitaciones, producción, sin visión).
- Estados: borrador → publicado → finalizado / cancelado.

### 3.4 Medios de pago
- Botón **"Conectar Mercado Pago"**: el cliente vincula **su propia** cuenta (OAuth de Mercado Pago).
- Con eso su público paga con **tarjeta de crédito, débito o Mercado Pago**, y el dinero entra a la cuenta del cliente. Nightowl cobra su comisión automáticamente (ver sección 6).

### 3.5 Ventas
- Órdenes y entradas vendidas, ocupación por función, recaudación.
- Buscar una compra por email, reenviar entradas, reembolsar.
- Exportar a Excel/CSV.

### 3.6 Puerta (control de acceso)
- Crear usuarios "portero" que solo pueden escanear QR de ese cliente.
- La app de escaneo funciona sin internet y sincroniza después (ver la conversación sobre QR: token firmado + `checked_in_at` atómico).

### 3.7 Base de datos *(Pronto, ya aparece en el menú)*
Los datos propios del cliente, solo de su organización:
- Su público: compradores con email, entradas compradas y eventos a los que fue.
- Órdenes y entradas, con búsqueda y filtros (evento, fecha, estado).
- Exportar a Excel/CSV (por ejemplo, para mandar novedades a su público).
- Siempre filtrado por el `organization_id` de la sesión.

### 3.8 Estadísticas *(Pronto, ya aparece en el menú)*
- Entradas vendidas, recaudación y ocupación por evento y por función.
- Evolución de ventas por día, lotes que más venden y cuánto falta para agotar.
- Comparación entre eventos.

### 3.9 Equipo **[A definir, puede ir en una segunda etapa]**
Que el cliente sume usuarios propios con roles: dueño, editor, solo ventas, portero.

---

## 4. Arquitectura propuesta

### 4.1 Un solo proyecto Next.js, ruteado por dominio
La landing ya es Next.js 16 en Vercel. Propongo sumar el dashboard y las páginas
públicas **en el mismo proyecto**, separados por dominio:

| Dominio | Qué muestra |
|---|---|
| `www.palcotickets.com` | Landing (lo que ya existe) |
| `dashboard.palcotickets.com` | Login + panel admin + panel cliente |
| `*.palcotickets.com` (ej. `teatrocolon.palcotickets.com`) | Página pública de venta de cada cliente |

- En Next.js 16 el archivo `middleware` **se llama `proxy`** (`src/proxy.ts`). Ahí se
  mira el `Host` y se reescribe internamente a `/dashboard/...` o `/sites/[slug]/...`.
- En Vercel: agregar `dashboard.palcotickets.com` y el comodín `*.palcotickets.com` como dominios del proyecto.
  En Cloudflare, el registro comodín en **DNS only**.
- Alternativa válida: una app aparte para el dashboard. Más aislamiento, pero dos deploys. **[A definir]**

### 4.2 Base de datos
Postgres en Neon, que ya usa `backend/`. Para el dashboard hay que sumar:

```
organizations      cliente (teatro, productora…). Es el "tenant".
users              email, password_hash, is_platform_admin, must_change_password, 2FA
memberships        user ↔ organization + rol (owner, editor, ventas, portero)
sessions           sesiones de login (o JWT firmado en cookie httpOnly)
sites              1 por organización: template, branding (json: logo, colores, fuente), textos, publicado
venues             salas físicas de la organización
venue_maps         plantilla de mapa de cada sala (sectores, filas, butacas, capacidad)
events             evento → pertenece a organization y venue
performances       funciones (fecha/hora) de un evento        [hoy events tiene starts_at]
sectors            por función: tipo 'numbered' | 'general', capacidad, precio
price_lots         lotes de preventa por sector
seats / orders / tickets    lo que ya armó Lorenzo
payment_accounts   cuenta MP conectada (tokens OAuth cifrados)
audit_log          quién hizo qué y cuándo
```

**Ajustes sobre el esquema actual de `backend/`:**
- La tabla `venues` hoy guarda marca (`logo_url`, `primary_color`). Eso pasa a `organizations`/`sites`; `venues` queda como sala física.
- `tickets.seat_id` es obligatorio: para **ubicación general** una entrada tiene que poder tener sector sin butaca.
- Todas las tablas del cliente llevan `organization_id`.

### 4.3 Aislamiento entre clientes (lo más importante)
Un cliente **jamás** puede ver ni tocar datos de otro.

- Cada consulta filtra por `organization_id` **tomado de la sesión**, nunca de la URL ni del formulario.
- Recomendado además: **Row Level Security** de Postgres como segunda barrera.
- Tests automáticos que intenten leer datos de otra organización y esperen error.

### 4.4 Login y seguridad
- Contraseñas con **argon2id** (o bcrypt). Nunca guardar contraseñas en texto.
- Sesión en **cookie httpOnly, Secure, SameSite=Lax**.
- **Límite de intentos** de login por IP y por email.
- "Olvidé mi contraseña" por email (ya tenemos **Resend** configurado con `palcotickets.com`).
- Validar todo en el servidor; los permisos se chequean en cada acción, no solo ocultando botones.
- Se puede usar una librería de auth (Auth.js, Better Auth, Lucia) en modo email+contraseña sin registro público. **[A definir]**

---

## 5. Orden sugerido de trabajo

1. **Login + roles**: tablas `organizations`, `users`, `memberships`; login en `dashboard.palcotickets.com`; admin crea cliente y usuario; cambio de contraseña obligatorio.
2. **Mi página**: plantillas + branding + publicar; página pública en `slug.palcotickets.com`.
3. **Salas y mapas**: editor de mapa (numerado y general).
4. **Eventos**: funciones, precios, lotes, publicar.
5. **Pagos**: conectar Mercado Pago (Marketplace / split), checkout, webhooks, idempotencia.
6. **Entradas y puerta**: QR firmado, envío por email, app de escaneo offline.
7. **Ventas y reportes** (del cliente).
8. **Base de datos y Estadísticas** (en los dos paneles: admin ve todo el sistema, cliente solo lo suyo):
   ya están en el menú como "Pronto";
   se completan cuando haya ventas reales (después de las etapas 5 y 6).

Cada etapa se puede mostrar a un cliente real antes de pasar a la siguiente.

---

## 6. Pagos (resumen de lo decidido)

- **Mercado Pago en modo Marketplace (split de pagos)**: cada cliente conecta su cuenta;
  el comprador paga con tarjeta de crédito, débito o Mercado Pago; el dinero va al cliente
  y la comisión de Nightowl se descuenta sola (`marketplace_fee`).
- Nightowl **no toca la plata** de las entradas ni guarda datos de tarjetas.
- Más adelante se pueden sumar otros procesadores (Payway, Mobbex) detrás de la misma interfaz.

---

## 7. Lo que ya existe y sirve de referencia

- `src/components/site-builder.tsx`: maqueta animada del editor de página (plantillas, colores, mapa, precios, publicar).
- `src/components/seat-map.tsx`: plano de butacas con selección.
- `src/components/door-scanner.tsx`: cómo debería sentirse la app de puerta (válida, duplicada, sin conexión).
- `backend/`: esquema de base y reserva de butacas con tests (Lorenzo).
