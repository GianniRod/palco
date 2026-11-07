// PAGO-PRUEBA-ADMIN: temporal, se borra junto con backend/src/test-payment.mjs.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import pg from "pg";
import { ValidationError } from "../src/auth.mjs";
import { getCheckout, getOrderByToken, startOrder } from "../src/checkout.mjs";
import { createEvent, getEvent, publishEvent, savePricing } from "../src/events.mjs";
import { publishSite } from "../src/sites.mjs";
import { createTestPayPass, payWithTestPass, TEST_PAY_HOURS, verifyTestPayPass } from "../src/test-payment.mjs";
import { createVenue, saveVenue } from "../src/venues.mjs";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Falta TEST_DATABASE_URL");

const db = new pg.Pool({ connectionString: url });
const organizations = [];
const users = [];
const email = () => `${crypto.randomUUID().slice(0, 8)}@example.com`;

async function createUser({ admin = true } = {}) {
  const { rows: [user] } = await db.query(
    "insert into users (email, password_hash, is_platform_admin) values ($1, 'hash-de-prueba', $2) returning id",
    [email(), admin],
  );
  users.push(user.id);
  return user.id;
}

// Una orden pendiente de $1000 con 10% de comisión.
async function pendingOrder() {
  const slug = `tp-${crypto.randomUUID().slice(0, 8)}`;
  const { rows: [organization] } = await db.query(
    "insert into organizations (slug, name, commission_percent) values ($1, 'Cliente', 10) returning id, slug, name",
    [slug],
  );
  organizations.push(organization.id);
  const tenant = { organization, role: "owner", impersonating: false, session: { userId: null, email: "prueba@example.com" } };
  await publishSite(db, tenant, { displayName: "Sitio", primaryColor: "#111111" });
  const venueId = await createVenue(db, tenant, { name: "Sala" });
  await saveVenue(db, tenant, venueId, { name: "Sala", map: { sectors: [{ key: "campo", kind: "general", name: "Campo", capacity: 5 }] } });
  const startsAt = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 16);
  const id = await createEvent(db, tenant, { venueId, title: "Evento", startsAt });
  const draft = await getEvent(db, tenant, id);
  await savePricing(db, tenant, id, draft.sectors.map((sector) => ({ id: sector.id, price: 1000, lots: [] })));
  await publishEvent(db, tenant, id);
  const performanceId = (await getEvent(db, tenant, id)).performances[0].id;
  const checkout = await getCheckout(db, slug, id, performanceId);
  const token = await startOrder(db, {
    performanceId,
    buyerName: "Ana",
    buyerEmail: email(),
    general: [{ sectorId: checkout.sectors[0].id, quantity: 1 }],
  });
  return { slug, token };
}

after(async () => {
  await db.query("delete from organizations where id = any($1::uuid[])", [organizations]);
  await db.query("delete from audit_log where actor_user_id = any($1::uuid[])", [users]);
  await db.query("delete from users where id = any($1::uuid[])", [users]);
  await db.end();
});

test("con el permiso de un admin, la orden queda paga, con QR y auditada", async () => {
  const adminId = await createUser();
  const { slug, token } = await pendingOrder();
  const pass = await createTestPayPass(db, adminId);

  assert.equal(await payWithTestPass(db, pass, slug, token), "paid");
  const order = await getOrderByToken(db, slug, token);
  assert.equal(order.status, "paid");
  assert.ok(order.items[0].code);

  const { rows: [row] } = await db.query("select payment_provider from orders where id = $1", [order.id]);
  assert.equal(row.payment_provider, "prueba_admin");
  const { rows } = await db.query("select details from audit_log where actor_user_id = $1 and action = 'order.test_paid'", [adminId]);
  assert.equal(rows[0].details.orderId, order.id);

  // Apretarlo dos veces no hace nada nuevo.
  assert.equal(await payWithTestPass(db, pass, slug, token), "paid");
});

test("sin permiso, o con uno falso, la orden sigue pendiente", async () => {
  const adminId = await createUser();
  const { slug, token } = await pendingOrder();
  const [user, expires, signature] = (await createTestPayPass(db, adminId)).split(".");
  const fakes = [
    undefined,
    "",
    "cualquier-cosa",
    `${user}.${expires}`,
    `${user}.${expires}.${signature}x`,
    `${user}.${Number(expires) + 1}.${signature}`,
    `${await createUser()}.${expires}.${signature}`,
    `no-es-uuid.${expires}.${signature}`,
  ];
  for (const fake of fakes) {
    await assert.rejects(payWithTestPass(db, fake, slug, token), ValidationError);
  }
  assert.equal((await getOrderByToken(db, slug, token)).status, "pending");
});

test("un usuario que no es admin no puede sacar el permiso", async () => {
  await assert.rejects(createTestPayPass(db, await createUser({ admin: false })), ValidationError);
});

test("el permiso vence, y se corta si el admin se desactiva, deja de ser admin o cambia la contraseña", async () => {
  const hours = TEST_PAY_HOURS * 60 * 60 * 1000;
  const expiring = await createUser();
  const pass = await createTestPayPass(db, expiring);
  assert.ok(await verifyTestPayPass(db, pass));
  assert.ok(await verifyTestPayPass(db, pass, Date.now() + hours - 60000));
  assert.equal(await verifyTestPayPass(db, pass, Date.now() + hours + 60000), null);

  const changes = [
    "update users set disabled_at = now() where id = $1",
    "update users set is_platform_admin = false where id = $1",
    "update users set password_hash = 'otro-hash' where id = $1",
  ];
  for (const change of changes) {
    const adminId = await createUser();
    const valid = await createTestPayPass(db, adminId);
    await db.query(change, [adminId]);
    assert.equal(await verifyTestPayPass(db, valid), null);
  }
});
