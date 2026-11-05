// Corre contra un Postgres de verdad. Crea sus propias organizaciones y las borra al terminar.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import pg from "pg";
import { ForbiddenError } from "../src/admin.mjs";
import { ValidationError } from "../src/auth.mjs";
import {
  addPerformance,
  createEvent,
  getEvent,
  getPublicEventImage,
  listEvents,
  listPerformanceSeats,
  publishEvent,
  refreshEventMap,
  removePerformance,
  rowLabel,
  savePricing,
  setEventStatus,
  setSeatsBlocked,
  updateEventDetails,
} from "../src/events.mjs";
import { holdSeats, listSeats, SeatsUnavailableError } from "../src/seats.mjs";
import { getPublicEvent, getPublicSite, publishSite } from "../src/sites.mjs";
import { createVenue, deleteVenue, getVenue, listVenues, parseMap, saveVenue } from "../src/venues.mjs";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Falta TEST_DATABASE_URL");

const db = new pg.Pool({ connectionString: url, max: 5 });
const created = [];
const JPG = "data:image/jpeg;base64,/9j/4AAQ";

const MAP = {
  sectors: [
    { key: "escenario", kind: "stage", name: "Escenario", x: 20, y: 0, w: 60, h: 10 },
    { key: "platea", kind: "numbered", name: "Platea", x: 10, y: 20, w: 80, h: 40, rows: [4, 6], aisles: [2] },
    { key: "campo", kind: "general", name: "Campo", x: 10, y: 65, w: 80, h: 30, capacity: 100 },
  ],
};

// Dentro de un año, en el formato de un input datetime-local.
const future = (days = 0) => new Date(Date.now() + (365 + days) * 86400000).toISOString().slice(0, 16);

async function createTenant(role = "owner") {
  const slug = `ev-${crypto.randomUUID().slice(0, 8)}`;
  const { rows: [organization] } = await db.query(
    "insert into organizations (slug, name, commission_percent) values ($1, 'Cliente', 10) returning id, slug, name",
    [slug],
  );
  created.push(organization.id);
  return { organization, role, impersonating: false, session: { userId: null, email: "prueba@example.com" } };
}

async function createVenueWithMap(tenant) {
  const id = await createVenue(db, tenant, { name: "Sala" });
  await saveVenue(db, tenant, id, { name: "Sala", map: MAP });
  return id;
}

async function createDraft(tenant, overrides = {}) {
  const venueId = await createVenueWithMap(tenant);
  const id = await createEvent(db, tenant, { venueId, title: "Evento", startsAt: future(), ...overrides });
  return { id, venueId };
}

async function setPrices(tenant, id, price = 1000) {
  const { sectors } = await getEvent(db, tenant, id);
  await savePricing(db, tenant, id, sectors.map((sector) => ({ id: sector.id, price, lots: [] })));
}

async function createPublished(tenant) {
  const { id, venueId } = await createDraft(tenant);
  await setPrices(tenant, id);
  await publishEvent(db, tenant, id);
  return { id, venueId, event: await getEvent(db, tenant, id) };
}

after(async () => {
  await db.query("delete from organizations where id = any($1::uuid[])", [created]);
  await db.end();
});

test("el mapa se valida: filas, capacidad, nombres repetidos y límites", () => {
  const sector = (overrides) => ({ key: "a", kind: "numbered", name: "A", rows: [5], ...overrides });
  const invalid = [
    { sectors: [sector({ rows: [] })] },
    { sectors: [sector({ rows: [0] })] },
    { sectors: [sector({ rows: [500] })] },
    { sectors: [sector({ name: "" })] },
    { sectors: [{ key: "g", kind: "general", name: "G" }] },
    { sectors: [sector(), sector({ key: "b" })] },
    { sectors: [sector(), sector()] },
    { sectors: Array.from({ length: 61 }, (_, i) => ({ key: `l${i}`, kind: "label", name: "x" })) },
    { sectors: Array.from({ length: 2 }, (_, i) => sector({ key: `k${i}`, name: `N${i}`, rows: Array(100).fill(200) })) },
  ];
  for (const map of invalid) assert.throws(() => parseMap(map), ValidationError);
});

test("el mapa limita posiciones y descarta campos desconocidos", () => {
  const { sectors: [sector] } = parseMap({
    sectors: [{ key: "a", kind: "stage", name: "Escenario", x: -5, y: 900, w: 1, h: "x", evil: "<script>" }],
  });
  assert.deepEqual(sector, { key: "a", kind: "stage", name: "Escenario", x: 0, y: 100, w: 3, h: 3 });
});

test("las filas se nombran A, B... Z, AA", () => {
  assert.deepEqual([0, 1, 25, 26, 27, 52].map(rowLabel), ["A", "B", "Z", "AA", "AB", "BA"]);
});

test("un evento no se puede crear sin sectores ni en el pasado", async () => {
  const tenant = await createTenant();
  const empty = await createVenue(db, tenant, { name: "Vacía" });
  await assert.rejects(createEvent(db, tenant, { venueId: empty, title: "X", startsAt: future() }), /no tiene sectores/);

  const venueId = await createVenueWithMap(tenant);
  await assert.rejects(createEvent(db, tenant, { venueId, title: "X", startsAt: "2020-01-01T20:00" }), /futuro/);
  await assert.rejects(createEvent(db, tenant, { venueId, title: "", startsAt: future() }), /título/);
  await assert.rejects(createEvent(db, tenant, { venueId, title: "X", startsAt: "ayer" }), /no es válida/);
});

test("el evento copia el mapa: cambiar la sala después no lo toca", async () => {
  const tenant = await createTenant();
  const { id, venueId } = await createPublished(tenant);
  await saveVenue(db, tenant, venueId, { name: "Sala", map: { sectors: [] } });

  const event = await getEvent(db, tenant, id);
  assert.equal(event.map.sectors.length, 3);
  assert.deepEqual(event.sectors.map((s) => s.name), ["Platea", "Campo"]);
  assert.equal((await getVenue(db, tenant, venueId)).map.sectors.length, 0);
});

test("la fecha de una función se interpreta en hora de Argentina", async () => {
  const tenant = await createTenant();
  const { id } = await createDraft(tenant, { startsAt: "2099-03-10T21:30" });
  const { performances: [performance] } = await getEvent(db, tenant, id);
  assert.equal(new Date(performance.startsAt).toISOString(), "2099-03-11T00:30:00.000Z");
});

test("no se publica sin precios; al publicar se crean las butacas de cada función", async () => {
  const tenant = await createTenant();
  const { id } = await createDraft(tenant);
  await addPerformance(db, tenant, id, future(7));
  await assert.rejects(publishEvent(db, tenant, id), /Falta el precio de: Platea, Campo/);

  const before = await getEvent(db, tenant, id);
  assert.deepEqual(await listSeats(db, before.performances[0].id), []);

  await setPrices(tenant, id);
  await publishEvent(db, tenant, id);
  const event = await getEvent(db, tenant, id);
  assert.equal(event.status, "published");
  for (const performance of event.performances) {
    const seats = await listSeats(db, performance.id);
    assert.equal(seats.length, 10);
    assert.equal(seats.filter((s) => s.row === "B").length, 6);
  }
  await assert.rejects(publishEvent(db, tenant, id), /Solo se puede publicar/);
});

test("dos sectores numerados pueden tener la misma fila y número", async () => {
  const tenant = await createTenant();
  const venueId = await createVenue(db, tenant, { name: "Teatro" });
  await saveVenue(db, tenant, venueId, {
    name: "Teatro",
    map: {
      sectors: [
        { key: "platea", kind: "numbered", name: "Platea", rows: [2] },
        { key: "palco", kind: "numbered", name: "Palco", rows: [2] },
      ],
    },
  });
  const id = await createEvent(db, tenant, { venueId, title: "Doble", startsAt: future() });
  await setPrices(tenant, id);
  await publishEvent(db, tenant, id);

  const { performances: [performance] } = await getEvent(db, tenant, id);
  const seats = await listPerformanceSeats(db, tenant, id, performance.id);
  assert.deepEqual(seats.map((s) => `${s.sector} ${s.row}${s.number}`), [
    "Platea A1",
    "Platea A2",
    "Palco A1",
    "Palco A2",
  ]);
});

test("una función agregada a un evento publicado nace con sus butacas", async () => {
  const tenant = await createTenant();
  const { id } = await createPublished(tenant);
  await addPerformance(db, tenant, id, future(30));
  const { performances } = await getEvent(db, tenant, id);
  assert.equal(performances.length, 2);
  assert.equal((await listSeats(db, performances[1].id)).length, 10);
});

test("no se borra la única función ni una con órdenes", async () => {
  const tenant = await createTenant();
  const { id, event } = await createPublished(tenant);
  await assert.rejects(removePerformance(db, tenant, id, event.performances[0].id), /al menos una/);

  await addPerformance(db, tenant, id, future(1));
  const [first, second] = (await getEvent(db, tenant, id)).performances;
  const seats = await listSeats(db, first.id);
  await holdSeats(db, { performanceId: first.id, seatIds: [seats[0].id], buyerEmail: "a@example.com" });
  await assert.rejects(removePerformance(db, tenant, id, first.id), /con órdenes/);

  await removePerformance(db, tenant, id, second.id);
  assert.equal((await getEvent(db, tenant, id)).performances.length, 1);
});

test("el mapa solo se actualiza en borrador y conserva los precios", async () => {
  const tenant = await createTenant();
  const { id, venueId } = await createDraft(tenant);
  await setPrices(tenant, id, 5000);
  await saveVenue(db, tenant, venueId, {
    name: "Sala",
    map: { sectors: [MAP.sectors[1], { key: "vip", kind: "general", name: "VIP", capacity: 5 }] },
  });
  await refreshEventMap(db, tenant, id);
  const { sectors } = await getEvent(db, tenant, id);
  assert.deepEqual(sectors.map((s) => [s.name, s.price]), [["Platea", 5000], ["VIP", null]]);

  await setPrices(tenant, id);
  await publishEvent(db, tenant, id);
  await assert.rejects(refreshEventMap(db, tenant, id), /solo se puede actualizar en borrador/);
});

test("precios y lotes se guardan, validan y los cambios quedan en la auditoría", async () => {
  const tenant = await createTenant();
  const { id } = await createDraft(tenant);
  const { sectors: [platea] } = await getEvent(db, tenant, id);

  const lot = { name: "Preventa", price: "800", quota: "50", startsAt: "2099-01-01T10:00", endsAt: "2099-02-01T10:00" };
  await savePricing(db, tenant, id, [{ id: platea.id, price: "1500", lots: [lot] }]);
  let saved = (await getEvent(db, tenant, id)).sectors.find((s) => s.id === platea.id);
  assert.equal(saved.price, 1500);
  assert.equal(saved.lots[0].price, 800);
  assert.equal(saved.lots[0].quota, 50);

  // Editar conserva el lote; sacarlo de la lista lo borra.
  await savePricing(db, tenant, id, [{ id: platea.id, price: "1500", lots: [{ ...lot, id: saved.lots[0].id, price: "900" }] }]);
  saved = (await getEvent(db, tenant, id)).sectors.find((s) => s.id === platea.id);
  assert.equal(saved.lots.length, 1);
  assert.equal(saved.lots[0].price, 900);
  await savePricing(db, tenant, id, [{ id: platea.id, price: "1500", lots: [] }]);
  assert.equal((await getEvent(db, tenant, id)).sectors.find((s) => s.id === platea.id).lots.length, 0);

  const invalid = [
    { price: "-1" },
    { price: "12.5" },
    { lots: [{ name: "", price: "1" }] },
    { lots: [{ name: "L", price: "" }] },
    { lots: [{ name: "L", price: "1", quota: "0" }] },
    { lots: [{ name: "L", price: "1", startsAt: "2099-02-01T10:00", endsAt: "2099-01-01T10:00" }] },
  ];
  for (const overrides of invalid) {
    await assert.rejects(savePricing(db, tenant, id, [{ id: platea.id, price: "1", ...overrides }]), ValidationError);
  }

  const { rows } = await db.query(
    "select details from audit_log where organization_id = $1 and action = 'event.price_changed'",
    [tenant.organization.id],
  );
  assert.deepEqual(rows.map((r) => [r.details.sector, r.details.from, r.details.to]), [["Platea", null, 1500]]);
});

test("una butaca bloqueada no se vende; una vendida o reservada no se bloquea", async () => {
  const tenant = await createTenant();
  const { id, event } = await createPublished(tenant);
  const performanceId = event.performances[0].id;
  const seats = await listPerformanceSeats(db, tenant, id, performanceId);
  const [blocked, reserved] = seats;

  const count = await setSeatsBlocked(db, tenant, id, performanceId, {
    seatIds: [blocked.id],
    blocked: true,
    reason: "Invitación",
  });
  assert.equal(count, 1);
  await assert.rejects(
    holdSeats(db, { performanceId, seatIds: [blocked.id], buyerEmail: "a@example.com" }),
    SeatsUnavailableError,
  );
  assert.equal((await listSeats(db, performanceId)).find((s) => s.id === blocked.id).available, false);

  await holdSeats(db, { performanceId, seatIds: [reserved.id], buyerEmail: "a@example.com" });
  assert.equal(await setSeatsBlocked(db, tenant, id, performanceId, { seatIds: [reserved.id], blocked: true, reason: "Otro" }), 0);
  assert.equal(await setSeatsBlocked(db, tenant, id, performanceId, { seatIds: [reserved.id], blocked: false }), 0);

  await setSeatsBlocked(db, tenant, id, performanceId, { seatIds: [blocked.id], blocked: false });
  await holdSeats(db, { performanceId, seatIds: [blocked.id], buyerEmail: "a@example.com" });

  await assert.rejects(setSeatsBlocked(db, tenant, id, performanceId, { seatIds: [seats[2].id], blocked: true, reason: "x" }), /motivo/);
});

test("solo se reservan butacas de eventos publicados", async () => {
  const tenant = await createTenant();
  const { id, event } = await createPublished(tenant);
  const performanceId = event.performances[0].id;
  const seats = await listSeats(db, performanceId);
  await setEventStatus(db, tenant, id, "cancelled");
  await assert.rejects(
    holdSeats(db, { performanceId, seatIds: [seats[0].id], buyerEmail: "a@example.com" }),
    SeatsUnavailableError,
  );
});

test("un evento cerrado no se reabre ni acepta funciones", async () => {
  const tenant = await createTenant();
  const { id } = await createPublished(tenant);
  await setEventStatus(db, tenant, id, "finished");
  await assert.rejects(setEventStatus(db, tenant, id, "cancelled"), /Solo se puede cerrar/);
  await assert.rejects(addPerformance(db, tenant, id, future(1)), /terminó/);
  await assert.rejects(setEventStatus(db, tenant, id, "published"), /no es válido/);
});

test("un cliente no ve ni toca las salas, eventos ni butacas de otro", async () => {
  const owner = await createTenant();
  const intruder = await createTenant();
  const { id, venueId, event } = await createPublished(owner);
  const performanceId = event.performances[0].id;
  const sectorId = event.sectors[0].id;
  const seats = await listPerformanceSeats(db, owner, id, performanceId);

  assert.equal(await getVenue(db, intruder, venueId), null);
  assert.equal(await getEvent(db, intruder, id), null);
  assert.deepEqual(await listVenues(db, intruder), []);
  assert.deepEqual(await listEvents(db, intruder), []);
  assert.deepEqual(await listPerformanceSeats(db, intruder, id, performanceId), []);

  const ownVenue = await createVenueWithMap(intruder);
  const attempts = [
    () => saveVenue(db, intruder, venueId, { name: "Hackeada", map: { sectors: [] } }),
    () => deleteVenue(db, intruder, venueId),
    () => createEvent(db, intruder, { venueId, title: "X", startsAt: future() }),
    () => updateEventDetails(db, intruder, id, { title: "Hackeado" }),
    () => addPerformance(db, intruder, id, future(1)),
    () => removePerformance(db, intruder, id, performanceId),
    () => savePricing(db, intruder, id, [{ id: sectorId, price: 1 }]),
    () => publishEvent(db, intruder, id),
    () => setEventStatus(db, intruder, id, "cancelled"),
    () => refreshEventMap(db, intruder, id),
    () => setSeatsBlocked(db, intruder, id, performanceId, { seatIds: [seats[0].id], blocked: true, reason: "Otro" }),
  ];
  for (const attempt of attempts) await assert.rejects(attempt(), ValidationError);

  // Un sector de otro evento tampoco entra por un evento propio.
  const own = await createEvent(db, intruder, { venueId: ownVenue, title: "Mío", startsAt: future() });
  await assert.rejects(savePricing(db, intruder, own, [{ id: sectorId, price: 1 }]), /no es de este evento/);

  const untouched = await getEvent(db, owner, id);
  assert.equal(untouched.title, "Evento");
  assert.equal(untouched.status, "published");
  assert.equal(untouched.sectors[0].price, 1000);
  assert.equal((await getVenue(db, owner, venueId)).name, "Sala");
});

test("ventas y portero no pueden administrar salas ni eventos", async () => {
  const owner = await createTenant();
  const { id } = await createDraft(owner);
  for (const role of ["ventas", "portero"]) {
    const denied = { ...owner, role };
    await assert.rejects(listVenues(db, denied), ForbiddenError);
    await assert.rejects(createVenue(db, denied, { name: "X" }), ForbiddenError);
    await assert.rejects(listEvents(db, denied), ForbiddenError);
    await assert.rejects(getEvent(db, denied, id), ForbiddenError);
    await assert.rejects(publishEvent(db, denied, id), ForbiddenError);
  }
});

test("una sala con eventos no se borra; una sin eventos sí", async () => {
  const tenant = await createTenant();
  const { venueId } = await createDraft(tenant);
  await assert.rejects(deleteVenue(db, tenant, venueId), /tiene eventos/);
  const free = await createVenue(db, tenant, { name: "Libre" });
  await deleteVenue(db, tenant, free);
  assert.equal(await getVenue(db, tenant, free), null);
});

test("el público ve solo eventos publicados y futuros, con el precio vigente", async () => {
  const tenant = await createTenant();
  await publishSite(db, tenant, { displayName: "Sitio", primaryColor: "#111111" });
  const { id: draft } = await createDraft(tenant, { title: "Borrador" });
  const { id, event } = await createPublished(tenant);
  await updateEventDetails(db, tenant, id, { title: "Visible", image: JPG });

  const [platea, campo] = event.sectors;
  await savePricing(db, tenant, id, [
    { id: platea.id, price: 3000, lots: [
      { name: "Vencido", price: 100, endsAt: "2020-01-01T10:00" },
      { name: "Vigente", price: 500 },
    ] },
    { id: campo.id, price: 2000, lots: [] },
  ]);
  await addPerformance(db, tenant, id, future(1));

  const site = await getPublicSite(db, tenant.organization.slug);
  assert.deepEqual(site.events.map((e) => e.title), ["Visible"]);
  assert.equal(site.events[0].fromPrice, 500);
  assert.equal(site.events[0].moreDates, 1);
  assert.match(site.events[0].image, new RegExp(`^/api/event-images/${id}\\?v=\\d+$`));
  assert.equal(JSON.stringify(site.events).includes("base64"), false);

  const detail = await getPublicEvent(db, tenant.organization.slug, id);
  assert.equal(detail.event.sectors.find((s) => s.name === "Platea").price, 500);
  assert.equal(detail.event.performances.length, 2);
  assert.equal(await getPublicEvent(db, tenant.organization.slug, draft), null);

  const other = await createTenant();
  await publishSite(db, other, { displayName: "Otro", primaryColor: "#111111" });
  assert.equal(await getPublicEvent(db, other.organization.slug, id), null);

  await setEventStatus(db, tenant, id, "cancelled");
  assert.deepEqual((await getPublicSite(db, tenant.organization.slug)).events, []);
  assert.equal(await getPublicEvent(db, tenant.organization.slug, id), null);
});

test("la imagen de un evento solo se sirve si está publicado y el cliente activo", async () => {
  const tenant = await createTenant();
  const { id } = await createDraft(tenant, { image: JPG });
  assert.equal(await getPublicEventImage(db, id), null);

  await setPrices(tenant, id);
  await publishEvent(db, tenant, id);
  const image = await getPublicEventImage(db, id);
  assert.equal(image.type, "image/jpeg");
  assert.equal(image.bytes.subarray(0, 3).toString("hex"), "ffd8ff");

  await db.query("update organizations set suspended_at = now() where id = $1", [tenant.organization.id]);
  assert.equal(await getPublicEventImage(db, id), null);
});

test("rechaza imágenes que no son JPG o WebP, o demasiado pesadas", async () => {
  const tenant = await createTenant();
  const { id } = await createDraft(tenant);
  const invalid = ["data:image/svg+xml;base64,PHN2Zz4=", "https://otro.sitio/a.jpg", `data:image/jpeg;base64,${"A".repeat(1300 * 1024)}`];
  for (const image of invalid) {
    await assert.rejects(updateEventDetails(db, tenant, id, { title: "X", image }), ValidationError);
  }
});
