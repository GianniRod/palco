# Cómo funciona el negocio de Palco

Documento interno para socios y equipo. Explica qué vendemos, a quién, cómo ganamos
plata y cómo operamos. Lo marcado **[A definir]** son decisiones pendientes: no son
datos, son propuestas para charlar.

---

## 1. Qué es Palco

Palco es una **plataforma de venta de entradas con marca propia** para teatros, salas,
boliches y productoras.

El cliente vende **con su nombre, su logo y sus colores**, en su propia página
(`teatro.palcotickets.com` o su dominio). El público compra ahí, elige su butaca o su
sector, paga y recibe una entrada con QR. En la puerta, su equipo valida el QR con el
celular, aunque no haya internet.

**No somos una ticketera.** No vendemos entradas a nuestro nombre ni nos quedamos con el
público de nuestros clientes. Ponemos la tecnología; la marca y la relación con el
público son del cliente.

---

## 2. A quién le vendemos

### Cliente ideal para arrancar
- **Teatros y salas independientes**: muchas funciones, planos con butacas numeradas, público fiel.
- **Boliches y fiestas**: lotes de preventa, campo general, control rápido en la puerta.
- **Productoras chicas y medianas**: varios eventos o salas, quieren su propia marca.

Volumen esperado al inicio: **bajo/medio por cliente** (de decenas a miles de entradas por evento).
Por eso no hace falta, por ahora, infraestructura para recitales masivos (fila virtual, etc.).

### Dónde nos paramos
| | Ticketeras de consumo (Passline y similares) | **Palco** | Infraestructura para ticketeras grandes (Crowder y similares) |
|---|---|---|---|
| Marca que ve el público | La de la ticketera | **La del cliente** | La del cliente |
| Para quién | Cualquier organizador | **Teatros, salas, boliches, productoras** | Ticketeras y eventos masivos |
| Datos del público | Quedan en la ticketera | **Del cliente** | Del cliente |
| Complejidad de uso | Baja | **Baja, con aspecto profesional** | Alta, requiere equipo técnico |

**Nuestro diferencial:** verse tan profesional como una ticketera grande, pero con la marca
del cliente y sin necesitar programadores.

---

## 3. Qué recibe el cliente

1. **Su página de venta** armada con una de nuestras 3 plantillas, con su logo, colores y tipografía.
2. **Mapa de su sala**: butacas numeradas, plateas, palcos, pasillos, o sectores de campo general.
3. **Eventos y funciones** con precios por sector y lotes de preventa.
4. **Cobro con tarjeta de crédito, débito y Mercado Pago**: la plata va a **su** cuenta.
5. **Entradas con QR** enviadas por email.
6. **Control de acceso**: app de puerta que valida cada QR una sola vez y funciona sin internet.
7. **Panel de ventas**: ocupación, recaudación, compradores, reembolsos, exportar.

---

## 4. Cómo se mueve la plata

```
Comprador paga la entrada (tarjeta o Mercado Pago)
        │
        ▼
Mercado Pago (Marketplace / split de pagos)
        │
        ├──► Cuenta de Mercado Pago del CLIENTE  → precio de la entrada (menos comisión de MP)
        │
        └──► Cuenta de Mercado Pago de PALCO      → comisión de Palco (marketplace_fee)
```

- **Palco nunca tiene en su poder la plata de las entradas.** Cada cliente conecta su
  propia cuenta de Mercado Pago y cobra directo. Esto nos ahorra riesgo, regulaciones de
  manejo de fondos de terceros y conflictos por pagos demorados.
- La **comisión de Palco** se separa sola en cada venta.
- La **comisión de Mercado Pago** la cobra Mercado Pago sobre cada pago. Quién la absorbe
  (cliente o comprador) se define por cliente. **[A definir]**
- Reembolsos y contracargos se gestionan desde Mercado Pago, sobre la cuenta del cliente.

---

## 5. Cómo ganamos plata

### Modelo principal: comisión por entrada vendida
Cobramos un **porcentaje o monto fijo por entrada** a través del split de Mercado Pago.

Dos formas de presentarlo al cliente **[A definir]**:
- **A cargo del comprador**: se suma como "cargo de servicio" al precio de la entrada. Para
  el cliente, Palco es "gratis". Es lo habitual en el mercado.
- **A cargo del cliente**: se descuenta de lo que cobra. Precio final más limpio para el público.

Se puede ofrecer cualquiera de las dos según el cliente.

### Ingresos adicionales posibles **[A definir, no para el lanzamiento]**
- **Abono mensual** para clientes grandes, a cambio de una comisión por entrada más baja.
- **Dominio propio** del cliente (`entradas.suteatro.com`) como extra.
- **Configuración inicial** (carga de un plano complejo, migración desde otra ticketera).
- **Eventos gratuitos**: entradas sin cargo con un costo fijo bajo o gratis, para captar clientes.

### Ejemplo para entender la mecánica (números inventados, solo ilustrativos)
> Entrada de $20.000 con un cargo de servicio de Palco del X% a cargo del comprador:
> el comprador paga $20.000 + cargo; el teatro recibe $20.000 menos la comisión de Mercado Pago;
> Palco recibe el cargo de servicio. Los porcentajes reales se definen al cerrar precios.

---

## 6. Cómo trabajamos con un cliente nuevo

1. **Contacto**: el teatro completa "Pedir demo" en palcotickets.com → llega a `contacto@palcotickets.com`.
2. **Demo**: le mostramos Palco con el plano de su sala y su marca.
3. **Alta**: desde nuestro panel de administrador creamos su organización y su usuario.
4. **Configuración**: el cliente (o nosotros con él) elige plantilla, sube logo y colores,
   carga el mapa de su sala y conecta su Mercado Pago.
5. **Primer evento**: crea la función, precios y lotes, y publica.
6. **Venta**: comparte su link; el público compra y recibe el QR.
7. **Día del evento**: sus porteros validan con la app.
8. **Después**: ve sus ventas y asistencia en el panel. Nosotros cobramos la comisión automáticamente.

---

## 7. Costos principales

| Costo | Qué es | Comentario |
|---|---|---|
| Hosting (Vercel) | Web, dashboard y páginas de clientes | Bajo al principio, crece con el tráfico |
| Base de datos (Neon / Postgres) | Eventos, butacas, órdenes, entradas | Bajo al principio |
| Emails (Resend) | Entradas, avisos, formulario | Gratis hasta 3.000 mails/mes, después pago |
| Dominio y DNS (Cloudflare) | palcotickets.com | Bajo, anual |
| Comisiones de Mercado Pago | Por cada pago | Las paga cliente o comprador, no Palco **[A definir]** |
| Personas | Desarrollo, ventas, soporte | El costo más grande |

No tenemos costos de procesamiento de pagos propios ni de guardar datos de tarjetas:
eso lo hace Mercado Pago.

---

## 8. Riesgos y cómo los cubrimos

| Riesgo | Qué hacemos |
|---|---|
| **Sobreventa** (vender la misma butaca dos veces) | Reserva temporal de butacas en la base de datos con reglas que lo impiden (ya está en `backend/`). |
| **Entradas falsas o duplicadas** | QR con token firmado; cada QR entra una sola vez. |
| **Se cae internet en la puerta** | App de puerta que valida sin conexión y sincroniza después. |
| **Un cliente ve datos de otro** | Aislamiento estricto por organización en todo el sistema. |
| **Dependencia de Mercado Pago** | Arquitectura preparada para sumar otro procesador (Payway, Mobbex). |
| **Picos de demanda (evento muy pedido)** | Al inicio no esperamos volúmenes masivos. Si aparece, se suma una fila virtual tercerizada (Queue-it), no se construye. |
| **Facturación e impuestos** | Palco factura su comisión; cada cliente factura sus entradas. Validar con contador. **[A definir]** |

---

## 9. Qué tenemos hoy y qué sigue

**Hoy**
- Landing en **www.palcotickets.com** con demo animada del producto y formulario "Pedir demo".
- Email de contacto `contacto@palcotickets.com`.
- Base del backend: salas, eventos, sectores, butacas, órdenes, entradas y reserva sin sobreventa.

**Próximos pasos** (detalle técnico en [`docs/dashboard.md`](dashboard.md))
1. Dashboard con login: panel admin y panel cliente.
2. Página pública del cliente con las plantillas.
3. Editor de mapas y eventos.
4. Cobro con Mercado Pago Marketplace.
5. Entradas con QR y app de puerta.
6. Primeros clientes piloto: 2 o 3 teatros/salas para usarlo en eventos reales y ajustar.

---

## 10. Decisiones pendientes (resumen)

- [ ] Comisión de Palco: porcentaje, monto fijo o mixto; ¿a cargo del comprador o del cliente?
- [ ] Quién absorbe la comisión de Mercado Pago.
- [ ] ¿Abono mensual para clientes grandes?
- [ ] Política para eventos gratuitos.
- [ ] Subdominio vs dominio propio del cliente (y si el dominio propio se cobra).
- [ ] Forma societaria y facturación (consultar contador).
- [ ] Primeros clientes piloto y condiciones especiales para ellos.
