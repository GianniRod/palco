// Compra del público: reservar, ver la orden y confirmar el pago.
// El cobro está afuera de este archivo: quien cobre (hoy el simulado, mañana Mercado Pago)
// solo llama a confirmPayment, que se puede recibir varias veces sin duplicar nada.
import { randomBytes, randomUUID } from "node:crypto";
import { ValidationError, withTransaction } from "./auth.mjs";
import { getSigningKeys, signTicketCode } from "./qr.mjs";
import { getPublicEvent } from "./sites.mjs";

export const MAX_TICKETS_PER_ORDER = 8;
const MAX_PENDING_PER_IP = 6;
const MAX_PENDING_PER_EMAIL = 3;

export class TicketsUnavailableError extends Error {
  constructor(message = "Alguien te ganó de mano con esas entradas. Elegí otras") {
    super(message);
    this.name = "TicketsUnavailableError";
  }
}

export class PaymentMismatchError extends Error {
  constructor() {
    super("El monto del pago no coincide con el de la orden");
    this.name = "PaymentMismatchError";
  }
}

export const isSimulatedPaymentAllowed = (env = process.env) => env.NODE_ENV !== "production";

function parseBuyer({ buyerName, buyerEmail }) {
  const name = String(buyerName ?? "").trim();
  if (!name) throw new ValidationError("Falta tu nombre");
  if (name.length > 120) throw new ValidationError("El nombre es demasiado largo");
  const email = String(buyerEmail ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    throw new ValidationError("El email no es válido");
  }
  return { name, email };
}

function parseSelection({ seatIds, general }) {
  const seats = [...new Set(Array.isArray(seatIds) ? seatIds.map(String) : [])];
  const places = (Array.isArray(general) ? general : [])
    .map((item) => ({ sectorId: String(item?.sectorId), quantity: Number(item?.quantity) }))
    .filter((item) => item.quantity !== 0);
  if (places.some((item) => !Number.isInteger(item.quantity) || item.quantity < 0)) {
    throw new ValidationError("La cantidad no es válida");
  }
  const count = seats.length + places.reduce((total, item) => total + item.quantity, 0);
  if (count === 0) throw new ValidationError("Elegí al menos una entrada");
  if (count > MAX_TICKETS_PER_ORDER) {
    throw new ValidationError(`Podés comprar hasta ${MAX_TICKETS_PER_ORDER} entradas por vez`);
  }
  return { seats, places };
}

// Lo que necesita la pantalla de compra de una función: precios vigentes y lugares libres.
export async function getCheckout(db, slug, eventId, performanceId) {
  const data = await getPublicEvent(db, slug, eventId);
  if (!data || data.event.performances.length === 0) return null;
  const performance =
    data.event.performances.find((item) => item.id === performanceId) ?? data.event.performances[0];

  const { rows: sectors } = await db.query(
    `select
       sectors.id, sectors.map_key as "mapKey", sectors.name, sectors.kind,
       (current_price(sectors.id)).price as price,
       case when sectors.kind = 'general' then general_remaining($2, sectors.id) end as remaining
     from sectors where event_id = $1 order by position, name`,
    [eventId, performance.id],
  );
  const { rows: seats } = await db.query(
    `select
       seats.id, seats.sector_id as "sectorId", seats.row_label as row, seats.number,
       (seats.status = 'free' or (seats.status = 'held' and seats.held_until < now())) as available
     from seats where performance_id = $1
     order by length(seats.row_label), seats.row_label, seats.number`,
    [performance.id],
  );
  return { ...data, performance, sectors, seats };
}

// Reserva y devuelve el código del link de la orden. Lanza si algo ya no está disponible.
export async function startOrder(db, { performanceId, seatIds, general, buyerName, buyerEmail, ip }) {
  const buyer = parseBuyer({ buyerName, buyerEmail });
  const { seats, places } = parseSelection({ seatIds, general });
  const clientIp = ip && ip !== "desconocida" ? ip : null;

  // Frena a quien intenta dejar una función sin lugares con reservas que nunca paga.
  const { rows: [pending] } = await db.query(
    `select
       count(*) filter (where buyer_email = $1)::int as by_email,
       count(*) filter (where client_ip = $2)::int as by_ip
     from orders
     where status = 'pending' and expires_at > now() and (buyer_email = $1 or client_ip = $2)`,
    [buyer.email, clientIp],
  );
  if (pending.by_email >= MAX_PENDING_PER_EMAIL || pending.by_ip >= MAX_PENDING_PER_IP) {
    throw new ValidationError("Tenés varias reservas sin pagar. Pagalas o esperá a que venzan");
  }

  const token = randomBytes(32).toString("base64url");
  try {
    await db.query("select hold_order($1, $2::uuid[], $3::jsonb, $4, $5, $6, $7) as id", [
      performanceId,
      seats,
      JSON.stringify(places),
      buyer.email,
      buyer.name,
      token,
      clientIp,
    ]);
  } catch (error) {
    if (error.code === "PA001") throw new TicketsUnavailableError();
    if (error.code === "PA003") throw new TicketsUnavailableError("No quedan tantos lugares en ese sector");
    if (error.code === "22P02") throw new ValidationError("Esa selección no es válida");
    throw error;
  }
  return token;
}

// La orden de un link. Solo existe bajo el subdominio del cliente que vendió.
export async function getOrderByToken(db, slug, token) {
  const { rows: [order] } = await db.query(
    `select
       orders.id, orders.status, orders.total, orders.buyer_name as "buyerName", orders.buyer_email as "buyerEmail",
       orders.expires_at as "expiresAt", (orders.status = 'pending' and orders.expires_at <= now()) as lapsed,
       performances.starts_at as "startsAt", events.id as "eventId", events.title, venues.name as venue,
       venues.address, organizations.slug
     from orders
     join performances on performances.id = orders.performance_id
     join events on events.id = performances.event_id
     join venues on venues.id = events.venue_id
     join organizations on organizations.id = events.organization_id
     where orders.access_token = $1 and organizations.slug = $2`,
    [String(token), slug],
  );
  if (!order) return null;

  const { rows: items } = await db.query(
    `select
       order_items.id, order_items.unit_price as "unitPrice", sectors.name as sector,
       seats.row_label as row, seats.number, price_lots.name as lot,
       tickets.token as code, tickets.checked_in_at as "checkedInAt"
     from order_items
     join sectors on sectors.id = order_items.sector_id
     left join seats on seats.id = order_items.seat_id
     left join price_lots on price_lots.id = order_items.lot_id
     left join tickets on tickets.order_item_id = order_items.id
     where order_items.order_id = $1
     order by sectors.position, length(seats.row_label), seats.row_label, seats.number, order_items.id`,
    [order.id],
  );
  const { lapsed, ...rest } = order;
  return { ...rest, status: lapsed ? "expired" : order.status, items };
}

// El comprador se arrepiente antes de pagar: libera lo reservado al instante.
export async function cancelOrder(db, slug, token) {
  await withTransaction(db, async (tx) => {
    const { rows: [order] } = await tx.query(
      `select orders.id from orders
       join performances on performances.id = orders.performance_id
       join events on events.id = performances.event_id
       join organizations on organizations.id = events.organization_id
       where orders.access_token = $1 and organizations.slug = $2 and orders.status = 'pending'
       for update of orders`,
      [String(token), slug],
    );
    if (!order) return;
    await tx.query(
      "update seats set status = 'free', held_until = null, order_id = null where order_id = $1 and status = 'held'",
      [order.id],
    );
    await tx.query("update orders set status = 'cancelled' where id = $1", [order.id]);
  });
}

// ¿Lo reservado sigue siendo de esta orden? Hace falta si el pago llega después de vencer.
async function stillHolds(tx, order) {
  const { rows: [seats] } = await tx.query(
    `select
       (select count(*)::int from order_items where order_id = $1 and seat_id is not null) as wanted,
       (select count(*)::int from seats where order_id = $1 and status = 'held') as held`,
    [order.id],
  );
  if (seats.wanted !== seats.held) return false;

  const { rows: general } = await tx.query(
    `select sector_id as "sectorId", count(*)::int as quantity
     from order_items where order_id = $1 and seat_id is null group by sector_id`,
    [order.id],
  );
  for (const { sectorId, quantity } of general) {
    const { rows: [{ remaining }] } = await tx.query(
      "select general_remaining($1, $2) as remaining",
      [order.performance_id, sectorId],
    );
    if (remaining < quantity) return false;
  }
  return true;
}

// Confirma un pago. Se puede llamar varias veces con lo mismo: el segundo aviso no hace nada.
// Si el pago llegó tarde y lo reservado ya se vendió, la orden queda para devolver el dinero.
export async function confirmPayment(db, { orderId, provider, reference, amount }) {
  const keys = await getSigningKeys(db);
  return withTransaction(db, async (tx) => {
    const { rows: [order] } = await tx.query(
      `select orders.id, orders.status, orders.total, orders.expires_at <= now() as lapsed,
         orders.performance_id, performances.event_id
       from orders join performances on performances.id = orders.performance_id
       where orders.id = $1 for update of orders`,
      [orderId],
    );
    if (!order) throw new ValidationError("No encontramos esa orden");
    if (order.status === "paid" || order.status === "refund_pending") return order.status;
    if (Number(amount) !== order.total) throw new PaymentMismatchError();

    // Mismo orden de bloqueo que hold_order: los lugares se cuentan sin que nadie los cambie.
    await tx.query("select 1 from sectors where event_id = $1 order by id for update", [order.event_id]);

    const late = order.lapsed || order.status !== "pending";
    const status = !late || (await stillHolds(tx, order)) ? "paid" : "refund_pending";

    await tx.query(
      `update orders set status = $2, paid_at = now(), payment_provider = $3, payment_reference = $4 where id = $1`,
      [order.id, status, provider, reference],
    );
    if (status !== "paid") return status;

    await tx.query(
      "update seats set status = 'sold', held_until = null where order_id = $1 and status = 'held'",
      [order.id],
    );
    const { rows: items } = await tx.query(
      "select id, sector_id, seat_id from order_items where order_id = $1",
      [order.id],
    );
    for (const item of items) {
      const id = randomUUID();
      await tx.query(
        `insert into tickets (id, order_id, order_item_id, sector_id, seat_id, token)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (order_item_id) do nothing`,
        [id, order.id, item.id, item.sector_id, item.seat_id, signTicketCode(keys, id)],
      );
    }
    return status;
  });
}

// Reemplaza al cobro mientras no hay proveedor real. Nunca corre en producción.
export async function simulatePayment(db, slug, token, env = process.env) {
  if (!isSimulatedPaymentAllowed(env)) throw new ValidationError("El pago de prueba no está disponible");
  const order = await getOrderByToken(db, slug, token);
  if (!order) throw new ValidationError("No encontramos esa orden");
  if (order.status === "expired") throw new ValidationError("La reserva venció. Volvé a elegir tus entradas");
  if (order.status !== "pending") return order.status;
  return confirmPayment(db, {
    orderId: order.id,
    provider: "simulated",
    reference: `sim-${order.id}`,
    amount: order.total,
  });
}
