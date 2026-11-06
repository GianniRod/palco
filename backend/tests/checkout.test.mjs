// Corre contra un Postgres de verdad: reservas simultáneas, cupos y pagos repetidos.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import pg from "pg";
import { hashPassword, login, getSession, ValidationError } from "../src/auth.mjs";
import {
  cancelOrder,
  confirmPayment,
  getCheckout,
  getOrderByToken,
  isSimulatedPaymentAllowed,
  PaymentMismatchError,
  simulatePayment,
  startOrder,
  TicketsUnavailableError,
} from "../src/checkout.mjs";
import { createEvent, getEvent, publishEvent, savePricing, setEventStatus, setSeatsBlocked } from "../src/events.mjs";
import { getSigningKeys, scanTicket, verifyTicketCode } from "../src/qr.mjs";
import { publishSite } from "../src/sites.mjs";
import { createVenue, saveVenue } from "../src/venues.mjs";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Falta TEST_DATABASE_URL");

const db = new pg.Pool({ connectionString: url, max: 25 });
const created = [];
const PASSWORD = "contraseña-de-prueba";

const MAP = {
  sectors: [
    { key: "platea", kind: "numbered", name: "Platea", rows: [4, 4] },
    { key: "campo", kind: "general", name: "Campo", capacity: 5 },
  ],
};
const future = (days = 0) => new Date(Date.now() + (365 + days) * 86400000).toISOString().slice(0, 16);
const email = () => `${crypto.randomUUID().slice(0, 8)}@example.com`;

// Un cliente con su sitio y un evento publicado: Platea a $1000, Campo a $500.
async function setup({ lots = {}, capacity = 5 } = {}) {
  const slug = `co-${crypto.randomUUID().slice(0, 8)}`;
  const { rows: [organization] } = await db.query(
    "insert into organizations (slug, name, commission_percent) values ($1, 'Cliente', 10) returning id, slug, name",
    [slug],
  );
  created.push(organization.id);
  const tenant = { organization, role: "owner", impersonating: false, session: { userId: null, email: "prueba@example.com" } };
  await publishSite(db, tenant, { displayName: "Sitio", primaryColor: "#111111" });

  const venueId = await createVenue(db, tenant, { name: "Sala" });
  const map = { sectors: [MAP.sectors[0], { ...MAP.sectors[1], capacity }] };
  await saveVenue(db, tenant, venueId, { name: "Sala", map });
  const id = await createEvent(db, tenant, { venueId, title: "Evento", startsAt: future() });
  const draft = await getEvent(db, tenant, id);
  await savePricing(db, tenant, id, draft.sectors.map((sector) => ({
    id: sector.id,
    price: sector.kind === "numbered" ? 1000 : 500,
    lots: lots[sector.name] ?? [],
  })));
  await publishEvent(db, tenant, id);
  const event = await getEvent(db, tenant, id);
  const performanceId = event.performances[0].id;
  const checkout = await getCheckout(db, slug, id, performanceId);
  const sector = (name) => checkout.sectors.find((item) => item.name === name);
  return {
    tenant,
    slug,
    eventId: id,
    performanceId,
    seats: checkout.seats,
    platea: sector("Platea"),
    campo: sector("Campo"),
  };
}

const buy = (ctx, selection) =>
  startOrder(db, { performanceId: ctx.performanceId, buyerName: "Ana", buyerEmail: email(), ...selection });

after(async () => {
  await db.query("delete from organizations where id = any($1::uuid[])", [created]);
  await db.end();
});

test("una compra mezcla butacas y ubicación general, con su total y comisión", async () => {
  const ctx = await setup();
  const token = await buy(ctx, {
    seatIds: [ctx.seats[0].id, ctx.seats[1].id],
    general: [{ sectorId: ctx.campo.id, quantity: 2 }],
  });
  const order = await getOrderByToken(db, ctx.slug, token);
  assert.equal(order.status, "pending");
  assert.equal(order.total, 3000);
  assert.equal(order.items.length, 4);
  assert.deepEqual(order.items.map((item) => item.sector).sort(), ["Campo", "Campo", "Platea", "Platea"]);

  const { rows: [row] } = await db.query("select commission_percent, commission_amount from orders where id = $1", [order.id]);
  assert.equal(Number(row.commission_percent), 10);
  assert.equal(row.commission_amount, 300);
});

test("valida comprador, cantidad y que haya algo elegido", async () => {
  const ctx = await setup();
  const seatIds = [ctx.seats[0].id];
  await assert.rejects(startOrder(db, { performanceId: ctx.performanceId, seatIds, buyerName: "", buyerEmail: email() }), ValidationError);
  await assert.rejects(startOrder(db, { performanceId: ctx.performanceId, seatIds, buyerName: "Ana", buyerEmail: "mal" }), ValidationError);
  await assert.rejects(buy(ctx, {}), /al menos una/);
  await assert.rejects(buy(ctx, { general: [{ sectorId: ctx.campo.id, quantity: 9 }] }), /hasta 8/);
  await assert.rejects(buy(ctx, { general: [{ sectorId: ctx.campo.id, quantity: -1 }] }), /no es válida/);
  await assert.rejects(buy(ctx, { general: [{ sectorId: ctx.campo.id, quantity: 1.5 }] }), /no es válida/);
  await assert.rejects(buy(ctx, { seatIds: ["no-es-un-uuid"] }), /no es válida/);
});

test("una butaca reservada no se vende dos veces, tampoco a la vez", async () => {
  const ctx = await setup();
  const results = await Promise.allSettled(
    Array.from({ length: 20 }, () => buy(ctx, { seatIds: [ctx.seats[0].id] })),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  for (const r of results.filter((item) => item.status === "rejected")) {
    assert.ok(r.reason instanceof TicketsUnavailableError);
  }
});

test("una butaca bloqueada no se compra", async () => {
  const ctx = await setup();
  await setSeatsBlocked(db, ctx.tenant, ctx.eventId, ctx.performanceId, { seatIds: [ctx.seats[0].id], blocked: true, reason: "Otro" });
  await assert.rejects(buy(ctx, { seatIds: [ctx.seats[0].id] }), TicketsUnavailableError);
});

test("la ubicación general respeta la capacidad, aun con 20 compras a la vez", async () => {
  const ctx = await setup({ capacity: 5 });
  const results = await Promise.allSettled(
    Array.from({ length: 20 }, () => buy(ctx, { general: [{ sectorId: ctx.campo.id, quantity: 1 }] })),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 5);
  const { sectors } = await getCheckout(db, ctx.slug, ctx.eventId, ctx.performanceId);
  assert.equal(sectors.find((s) => s.name === "Campo").remaining, 0);
  await assert.rejects(buy(ctx, { general: [{ sectorId: ctx.campo.id, quantity: 1 }] }), /No quedan tantos/);
});

test("un sector de otro evento o uno numerado no se compra como general", async () => {
  const ctx = await setup();
  const other = await setup();
  await assert.rejects(buy(ctx, { general: [{ sectorId: other.campo.id, quantity: 1 }] }), TicketsUnavailableError);
  await assert.rejects(buy(ctx, { general: [{ sectorId: ctx.platea.id, quantity: 1 }] }), TicketsUnavailableError);
});

test("el lote con cupo cobra su precio y, al agotarse, sigue el próximo", async () => {
  const ctx = await setup({
    lots: { Campo: [{ name: "Preventa", price: 100, quota: 2 }, { name: "Segundo", price: 200 }] },
    capacity: 50,
  });
  assert.equal(ctx.campo.price, 100);

  // Una misma orden puede cruzar de un lote al otro.
  const token = await buy(ctx, { general: [{ sectorId: ctx.campo.id, quantity: 3 }] });
  const order = await getOrderByToken(db, ctx.slug, token);
  assert.equal(order.total, 400);
  assert.deepEqual(order.items.map((item) => item.lot).sort(), ["Preventa", "Preventa", "Segundo"]);

  const after = await getCheckout(db, ctx.slug, ctx.eventId, ctx.performanceId);
  assert.equal(after.sectors.find((s) => s.name === "Campo").price, 200);

  // Cancelar devuelve el cupo.
  await cancelOrder(db, ctx.slug, token);
  const back = await getCheckout(db, ctx.slug, ctx.eventId, ctx.performanceId);
  assert.equal(back.sectors.find((s) => s.name === "Campo").price, 100);
});

test("el cupo de un lote no se pasa con compras simultáneas", async () => {
  const ctx = await setup({ lots: { Campo: [{ name: "Preventa", price: 100, quota: 3 }] }, capacity: 50 });
  await Promise.all(Array.from({ length: 12 }, () => buy(ctx, { general: [{ sectorId: ctx.campo.id, quantity: 1 }] })));
  const { rows: [{ n }] } = await db.query(
    "select count(*)::int as n from order_items i join price_lots l on l.id = i.lot_id where l.sector_id = $1",
    [ctx.campo.id],
  );
  assert.equal(n, 3);
});

test("una reserva vencida libera butacas, lugares y cupo", async () => {
  const ctx = await setup({ capacity: 1 });
  const token = await buy(ctx, { seatIds: [ctx.seats[0].id], general: [{ sectorId: ctx.campo.id, quantity: 1 }] });
  const { id } = await getOrderByToken(db, ctx.slug, token);

  await db.query("update orders set expires_at = now() - interval '1 second' where id = $1", [id]);
  await db.query("update seats set held_until = now() - interval '1 second' where order_id = $1", [id]);

  assert.equal((await getOrderByToken(db, ctx.slug, token)).status, "expired");
  await buy(ctx, { seatIds: [ctx.seats[0].id], general: [{ sectorId: ctx.campo.id, quantity: 1 }] });
});

test("cancelar libera todo al instante y no toca una orden pagada", async () => {
  const ctx = await setup({ capacity: 1 });
  const token = await buy(ctx, { seatIds: [ctx.seats[0].id], general: [{ sectorId: ctx.campo.id, quantity: 1 }] });
  await cancelOrder(db, ctx.slug, token);
  assert.equal((await getOrderByToken(db, ctx.slug, token)).status, "cancelled");

  const next = await buy(ctx, { seatIds: [ctx.seats[0].id], general: [{ sectorId: ctx.campo.id, quantity: 1 }] });
  await simulatePayment(db, ctx.slug, next);
  await cancelOrder(db, ctx.slug, next);
  assert.equal((await getOrderByToken(db, ctx.slug, next)).status, "paid");
});

test("al pagar, la butaca queda vendida y cada entrada tiene un QR firmado", async () => {
  const ctx = await setup();
  const token = await buy(ctx, { seatIds: [ctx.seats[0].id], general: [{ sectorId: ctx.campo.id, quantity: 1 }] });
  assert.equal(await simulatePayment(db, ctx.slug, token), "paid");

  const order = await getOrderByToken(db, ctx.slug, token);
  assert.equal(order.status, "paid");
  const keys = await getSigningKeys(db);
  for (const item of order.items) assert.ok(verifyTicketCode(keys, item.code));

  const { rows: [seat] } = await db.query("select status from seats where id = $1", [ctx.seats[0].id]);
  assert.equal(seat.status, "sold");
  await assert.rejects(buy(ctx, { seatIds: [ctx.seats[0].id] }), TicketsUnavailableError);
});

test("un aviso de pago repetido, aun a la vez, no duplica entradas", async () => {
  const ctx = await setup();
  const token = await buy(ctx, { seatIds: [ctx.seats[0].id, ctx.seats[1].id] });
  const { id, total } = await getOrderByToken(db, ctx.slug, token);
  const payment = { orderId: id, provider: "prueba", reference: `r-${id}`, amount: total };

  const results = await Promise.all(Array.from({ length: 10 }, () => confirmPayment(db, payment)));
  assert.deepEqual([...new Set(results)], ["paid"]);

  const { rows: [{ n }] } = await db.query("select count(*)::int as n from tickets where order_id = $1", [id]);
  assert.equal(n, 2);
});

test("un pago con otro monto no confirma la orden", async () => {
  const ctx = await setup();
  const token = await buy(ctx, { seatIds: [ctx.seats[0].id] });
  const { id } = await getOrderByToken(db, ctx.slug, token);
  await assert.rejects(confirmPayment(db, { orderId: id, provider: "prueba", reference: "x", amount: 1 }), PaymentMismatchError);
  assert.equal((await getOrderByToken(db, ctx.slug, token)).status, "pending");
});

test("un pago que llega tarde vale si lo reservado sigue libre; si no, queda para devolver", async () => {
  const ctx = await setup();
  const late = async (seat) => {
    const token = await buy(ctx, { seatIds: [seat.id] });
    const order = await getOrderByToken(db, ctx.slug, token);
    await db.query("update orders set expires_at = now() - interval '1 second' where id = $1", [order.id]);
    await db.query("update seats set held_until = now() - interval '1 second' where order_id = $1", [order.id]);
    return order;
  };

  const free = await late(ctx.seats[0]);
  assert.equal(await confirmPayment(db, { orderId: free.id, provider: "prueba", reference: `a-${free.id}`, amount: free.total }), "paid");

  const taken = await late(ctx.seats[1]);
  await buy(ctx, { seatIds: [ctx.seats[1].id] });
  assert.equal(await confirmPayment(db, { orderId: taken.id, provider: "prueba", reference: `b-${taken.id}`, amount: taken.total }), "refund_pending");
  const { rows: [{ n }] } = await db.query("select count(*)::int as n from tickets where order_id = $1", [taken.id]);
  assert.equal(n, 0);
});

test("una orden no se ve ni se cancela desde el subdominio de otro cliente", async () => {
  const ctx = await setup();
  const other = await setup();
  const token = await buy(ctx, { seatIds: [ctx.seats[0].id] });
  assert.equal(await getOrderByToken(db, other.slug, token), null);
  assert.equal(await getOrderByToken(db, ctx.slug, "inventado"), null);
  await cancelOrder(db, other.slug, token);
  await assert.rejects(simulatePayment(db, other.slug, token), ValidationError);
  assert.equal((await getOrderByToken(db, ctx.slug, token)).status, "pending");
});

test("el pago simulado no existe en producción", async () => {
  const ctx = await setup();
  const token = await buy(ctx, { seatIds: [ctx.seats[0].id] });
  assert.equal(isSimulatedPaymentAllowed({ NODE_ENV: "production" }), false);
  assert.equal(isSimulatedPaymentAllowed({ NODE_ENV: "development" }), true);
  await assert.rejects(simulatePayment(db, ctx.slug, token, { NODE_ENV: "production" }), /no está disponible/);
  assert.equal((await getOrderByToken(db, ctx.slug, token)).status, "pending");
});

test("no se compra un evento cancelado ni se puede dejar la función sin lugares con reservas", async () => {
  const ctx = await setup({ capacity: 50 });
  const buyer = email();
  for (let i = 0; i < 3; i += 1) {
    await startOrder(db, { performanceId: ctx.performanceId, buyerName: "Ana", buyerEmail: buyer, general: [{ sectorId: ctx.campo.id, quantity: 1 }] });
  }
  await assert.rejects(
    startOrder(db, { performanceId: ctx.performanceId, buyerName: "Ana", buyerEmail: buyer, general: [{ sectorId: ctx.campo.id, quantity: 1 }] }),
    /varias reservas/,
  );

  const ip = `ip-${crypto.randomUUID()}`;
  for (let i = 0; i < 6; i += 1) await buy(ctx, { ip, general: [{ sectorId: ctx.campo.id, quantity: 1 }] });
  await assert.rejects(buy(ctx, { ip, general: [{ sectorId: ctx.campo.id, quantity: 1 }] }), /varias reservas/);

  await setEventStatus(db, ctx.tenant, ctx.eventId, "cancelled");
  await assert.rejects(buy(ctx, { seatIds: [ctx.seats[0].id] }), TicketsUnavailableError);
});

async function scanner(organizationId) {
  const address = email();
  const { rows: [user] } = await db.query(
    "insert into users (email, password_hash, must_change_password) values ($1, $2, false) returning id",
    [address, await hashPassword(PASSWORD)],
  );
  await db.query("insert into memberships (user_id, organization_id, role, can_scan) values ($1, $2, 'portero', true)", [user.id, organizationId]);
  const token = await login(db, { email: address, password: PASSWORD, ip: `scan-${crypto.randomUUID()}` });
  return getSession(db, token);
}

test("el escáner valida una entrada comprada una sola vez, y solo el portero de ese cliente", async () => {
  const ctx = await setup();
  const other = await setup();
  const token = await buy(ctx, { seatIds: [ctx.seats[0].id] });
  await simulatePayment(db, ctx.slug, token);
  const { items: [{ code }] } = await getOrderByToken(db, ctx.slug, token);

  const foreign = await scanTicket(db, await scanner(other.tenant.organization.id), code);
  assert.equal(foreign.result, "invalid");
  assert.match(foreign.reason, /otro organizador/);

  const portero = await scanner(ctx.tenant.organization.id);
  const first = await scanTicket(db, portero, code);
  assert.equal(first.result, "valid");
  assert.equal(first.ticket.holder, "Ana");
  assert.match(first.ticket.label, /Evento · Platea · Fila A Butaca \d+/);

  const second = await scanTicket(db, portero, code);
  assert.equal(second.result, "duplicate");
  assert.equal(second.ticket.checkedInBy, portero.email);

  const results = await Promise.all(Array.from({ length: 5 }, () => scanTicket(db, portero, code)));
  assert.ok(results.every((result) => result.result === "duplicate"));
});

test("una entrada de un evento cancelado o devuelta no pasa por el escáner", async () => {
  const ctx = await setup();
  const portero = await scanner(ctx.tenant.organization.id);
  const token = await buy(ctx, { seatIds: [ctx.seats[0].id] });
  await simulatePayment(db, ctx.slug, token);
  const { id, items: [{ code }] } = await getOrderByToken(db, ctx.slug, token);

  await db.query("update orders set status = 'refund_pending' where id = $1", [id]);
  assert.match((await scanTicket(db, portero, code)).reason, /no está paga/);
  await db.query("update orders set status = 'paid' where id = $1", [id]);

  await setEventStatus(db, ctx.tenant, ctx.eventId, "cancelled");
  assert.match((await scanTicket(db, portero, code)).reason, /cancelado/);
});
