// Corre contra un Postgres de verdad para probar compras simultáneas.
// Crea su propia función de prueba y la borra al terminar.
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import pg from "pg";
import { holdSeats, listSeats, SeatsUnavailableError } from "../src/seats.mjs";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Falta TEST_DATABASE_URL");

const db = new pg.Pool({ connectionString: url, max: 20 });
const email = "prueba@example.com";

let venueId;
let eventId;
let otherEventId;
let seatIds;
let otherEventSeatId;

async function createEvent(title, seats) {
  const { rows: [event] } = await db.query(
    "insert into events (venue_id, title, starts_at) values ($1, $2, now()) returning id",
    [venueId, title],
  );
  const { rows: [sector] } = await db.query(
    "insert into sectors (event_id, name, price) values ($1, 'Platea', 22000) returning id",
    [event.id],
  );
  const { rows } = await db.query(
    `insert into seats (event_id, sector_id, row_label, number)
     select $1, $2, 'A', n from generate_series(1, $3::int) as n
     returning id`,
    [event.id, sector.id, seats],
  );
  return { eventId: event.id, seatIds: rows.map((r) => r.id) };
}

const countOrders = async () =>
  (await db.query("select count(*)::int as n from orders where event_id = $1", [eventId])).rows[0].n;

before(async () => {
  const { rows } = await db.query(
    "insert into venues (slug, name) values ($1, 'Sala de prueba') returning id",
    [`test-${crypto.randomUUID()}`],
  );
  venueId = rows[0].id;
});

beforeEach(async () => {
  await db.query("delete from events where venue_id = $1", [venueId]);
  ({ eventId, seatIds } = await createEvent("Función", 6));
  const other = await createEvent("Otra función", 1);
  otherEventId = other.eventId;
  otherEventSeatId = other.seatIds[0];
});

after(async () => {
  await db.query("delete from venues where id = $1", [venueId]);
  await db.end();
});

test("reservar crea la orden con el total correcto", async () => {
  const orderId = await holdSeats(db, { eventId, seatIds: seatIds.slice(0, 2), buyerEmail: email });

  const { rows: [order] } = await db.query("select * from orders where id = $1", [orderId]);
  assert.equal(order.total, 44000);
  assert.equal(order.status, "pending");

  const seats = await listSeats(db, eventId);
  assert.equal(seats.filter((s) => !s.available).length, 2);
});

test("una butaca reservada no se puede volver a reservar", async () => {
  await holdSeats(db, { eventId, seatIds: [seatIds[0]], buyerEmail: email });

  await assert.rejects(
    holdSeats(db, { eventId, seatIds: [seatIds[0]], buyerEmail: "otro@example.com" }),
    SeatsUnavailableError,
  );
  assert.equal(await countOrders(), 1);
});

test("si una butaca está tomada no se reserva ninguna", async () => {
  await holdSeats(db, { eventId, seatIds: [seatIds[1]], buyerEmail: email });

  await assert.rejects(
    holdSeats(db, { eventId, seatIds: [seatIds[0], seatIds[1]], buyerEmail: email }),
    SeatsUnavailableError,
  );

  const seats = await listSeats(db, eventId);
  assert.equal(seats.find((s) => s.id === seatIds[0])?.available, true);
  assert.equal(await countOrders(), 1);
});

test("con 20 compras simultáneas por la misma butaca gana una sola", async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 20 }, (_, i) =>
      holdSeats(db, { eventId, seatIds: [seatIds[0]], buyerEmail: `c${i}@example.com` }),
    ),
  );

  const won = results.filter((r) => r.status === "fulfilled");
  const lost = results.filter((r) => r.status === "rejected");
  assert.equal(won.length, 1);
  assert.ok(lost.every((r) => r.reason instanceof SeatsUnavailableError));
  assert.equal(await countOrders(), 1);
});

test("compras cruzadas de varias butacas no se traban ni se pisan", async () => {
  const forward = seatIds.slice(0, 4);
  const backward = [...forward].reverse();

  const results = await Promise.allSettled(
    Array.from({ length: 20 }, (_, i) =>
      holdSeats(db, { eventId, seatIds: i % 2 ? forward : backward, buyerEmail: email }),
    ),
  );

  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  for (const r of results) {
    if (r.status === "rejected") assert.ok(r.reason instanceof SeatsUnavailableError, String(r.reason));
  }
});

test("una reserva vencida vuelve a estar disponible", async () => {
  await holdSeats(db, { eventId, seatIds: [seatIds[0]], buyerEmail: email });
  await db.query("update seats set held_until = now() - interval '1 second' where id = $1", [seatIds[0]]);

  const seats = await listSeats(db, eventId);
  assert.equal(seats.find((s) => s.id === seatIds[0])?.available, true);

  const orderId = await holdSeats(db, { eventId, seatIds: [seatIds[0]], buyerEmail: "otro@example.com" });
  const { rows: [seat] } = await db.query("select order_id from seats where id = $1", [seatIds[0]]);
  assert.equal(seat.order_id, orderId);
});

test("una butaca vendida no se puede reservar", async () => {
  const orderId = await holdSeats(db, { eventId, seatIds: [seatIds[0]], buyerEmail: email });
  await db.query("update seats set status = 'sold', held_until = null where order_id = $1", [orderId]);

  await assert.rejects(
    holdSeats(db, { eventId, seatIds: [seatIds[0]], buyerEmail: email }),
    SeatsUnavailableError,
  );
});

test("no se puede reservar una butaca de otra función", async () => {
  await assert.rejects(
    holdSeats(db, { eventId, seatIds: [otherEventSeatId], buyerEmail: email }),
    SeatsUnavailableError,
  );
  assert.equal(await countOrders(), 0);
  assert.equal((await listSeats(db, otherEventId))[0].available, true);
});

test("pedir la misma butaca dos veces cuenta como una", async () => {
  const orderId = await holdSeats(db, { eventId, seatIds: [seatIds[0], seatIds[0]], buyerEmail: email });
  const { rows: [order] } = await db.query("select total from orders where id = $1", [orderId]);
  assert.equal(order.total, 22000);
});

test("se rechaza un pedido vacío o demasiado grande", async () => {
  await assert.rejects(holdSeats(db, { eventId, seatIds: [], buyerEmail: email }), RangeError);
  await assert.rejects(
    holdSeats(db, { eventId, seatIds: Array(9).fill(seatIds[0]), buyerEmail: email }),
    RangeError,
  );
});
