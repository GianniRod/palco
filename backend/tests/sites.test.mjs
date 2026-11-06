// Corre contra un Postgres de verdad. Crea sus propias organizaciones y las borra al terminar.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import pg from "pg";
import { ForbiddenError } from "../src/admin.mjs";
import { ValidationError } from "../src/auth.mjs";
import {
  canEditSite,
  getPublicSite,
  getPublicSiteContent,
  getSiteForEditing,
  publishSite,
  saveSiteDraft,
  unpublishSite,
} from "../src/sites.mjs";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Falta TEST_DATABASE_URL");

const db = new pg.Pool({ connectionString: url, max: 5 });
const created = [];

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const site = (overrides = {}) => ({
  template: "portada",
  displayName: "Teatro de prueba",
  primaryColor: "#7A1428",
  background: "oscuro",
  titleFont: "moderna",
  tagline: "Una frase",
  ...overrides,
});

// El mismo objeto que arma resolveTenant a partir de la sesión.
async function createTenant(role = "owner") {
  const slug = `sitio-${crypto.randomUUID().slice(0, 8)}`;
  const { rows: [organization] } = await db.query(
    "insert into organizations (slug, name, commission_percent) values ($1, 'Cliente', 7) returning id, slug, name",
    [slug],
  );
  created.push(organization.id);
  return {
    organization,
    role,
    impersonating: false,
    session: { userId: null, email: "prueba@example.com" },
  };
}

let tenant;

before(async () => {
  tenant = await createTenant();
});

after(async () => {
  await db.query("delete from organizations where id = any($1::uuid[])", [created]);
  await db.end();
});

test("sin guardar nada, el editor arranca con el nombre del cliente y no hay página pública", async () => {
  const fresh = await createTenant();
  const editing = await getSiteForEditing(db, fresh);
  assert.equal(editing.draft.displayName, "Cliente");
  assert.equal(editing.published, null);
  assert.equal(await getPublicSite(db, fresh.organization.slug), null);
});

test("guardar el borrador no publica ni cambia lo que ve el público", async () => {
  const fresh = await createTenant();
  await saveSiteDraft(db, fresh, site());
  assert.equal(await getPublicSite(db, fresh.organization.slug), null);

  await publishSite(db, fresh, site({ tagline: "Publicada" }));
  await saveSiteDraft(db, fresh, site({ tagline: "Cambio sin publicar" }));

  const { content } = await getPublicSite(db, fresh.organization.slug);
  assert.equal(content.tagline, "Publicada");
  assert.equal((await getSiteForEditing(db, fresh)).draft.tagline, "Cambio sin publicar");
});

test("publicar normaliza el contenido y queda en la auditoría; despublicar lo saca", async () => {
  const fresh = await createTenant();
  await publishSite(db, fresh, site({ website: "miteatro.com", instagram: "https://instagram.com/mi.teatro/" }));

  const { content } = await getPublicSite(db, fresh.organization.slug);
  assert.equal(content.primaryColor, "#7a1428");
  assert.equal(content.website, "https://miteatro.com/");
  assert.equal(content.instagram, "mi.teatro");

  await unpublishSite(db, fresh);
  assert.equal(await getPublicSite(db, fresh.organization.slug), null);

  const { rows } = await db.query("select action from audit_log where organization_id = $1 order by id", [
    fresh.organization.id,
  ]);
  assert.deepEqual(rows.map((r) => r.action), ["site.published", "site.unpublished"]);
});

test("un cliente nunca toca ni ve el sitio de otro", async () => {
  const first = await createTenant();
  const second = await createTenant();
  await publishSite(db, first, site({ tagline: "Del primero" }));
  await saveSiteDraft(db, second, site({ tagline: "Del segundo" }));

  assert.equal((await getSiteForEditing(db, first)).draft.tagline, "Del primero");
  assert.equal((await getSiteForEditing(db, second)).draft.tagline, "Del segundo");

  // Un organization_id colado en el formulario no cambia de quién es el sitio.
  await saveSiteDraft(db, second, site({ tagline: "Intruso", organization_id: first.organization.id }));
  const { content } = await getPublicSite(db, first.organization.slug);
  assert.equal(content.tagline, "Del primero");
  assert.equal((await getSiteForEditing(db, first)).draft.tagline, "Del primero");
});

test("ventas y portero no pueden editar; dueño, editor y soporte sí", async () => {
  for (const role of ["ventas", "portero"]) {
    const denied = await createTenant(role);
    assert.equal(canEditSite(denied), false);
    await assert.rejects(getSiteForEditing(db, denied), ForbiddenError);
    await assert.rejects(saveSiteDraft(db, denied, site()), ForbiddenError);
    await assert.rejects(publishSite(db, denied, site()), ForbiddenError);
    await assert.rejects(unpublishSite(db, denied), ForbiddenError);
  }
  for (const role of ["owner", "editor", "soporte"]) {
    await saveSiteDraft(db, await createTenant(role), site());
  }
  await assert.rejects(getSiteForEditing(db, null), ForbiddenError);
});

test("rechaza valores peligrosos o inválidos", async () => {
  const invalid = [
    { website: "javascript:alert(1)" },
    { website: "data:text/html,hola" },
    { primaryColor: "red" },
    { primaryColor: "#123;background:url(x)" },
    { logo: "data:image/svg+xml;base64,PHN2Zz4=" },
    { logo: "https://otro.sitio/logo.png" },
    { logo: `data:image/png;base64,${"A".repeat(600 * 1024)}` },
    { cover: "data:image/svg+xml;base64,PHN2Zz4=" },
    { cover: "https://otro.sitio/portada.jpg" },
    { cover: `data:image/jpeg;base64,${"A".repeat(2200 * 1024)}` },
    { instagram: "no vale/con espacios" },
    { email: "sin-arroba" },
    { displayName: "   " },
    { tagline: "x".repeat(141) },
  ];
  for (const overrides of invalid) {
    await assert.rejects(saveSiteDraft(db, tenant, site(overrides)), ValidationError, JSON.stringify(overrides).slice(0, 60));
  }
  await saveSiteDraft(db, tenant, site({ logo: PNG }));
  assert.equal((await getSiteForEditing(db, tenant)).draft.logo, PNG);
});

test("un sitio guardado antes de existir la portada sigue funcionando", async () => {
  const fresh = await createTenant();
  await publishSite(db, fresh, site());
  await db.query(
    "update sites set draft = draft - 'cover', published = published - 'cover' where organization_id = $1",
    [fresh.organization.id],
  );
  assert.equal((await getSiteForEditing(db, fresh)).draft.cover, "");
  assert.equal((await getSiteForEditing(db, fresh)).published.cover, "");
  assert.equal((await getPublicSite(db, fresh.organization.slug)).content.cover, "");
});

test("una plantilla, fondo o tipografía desconocidos caen en el valor por defecto", async () => {
  const saved = await saveSiteDraft(db, tenant, site({ template: "x", background: "x", titleFont: "x" }));
  assert.deepEqual([saved.template, saved.background, saved.titleFont], ["dividida", "claro", "clasica"]);
});

test("la compra se personaliza con el sitio, y un sitio viejo toma los valores por defecto", async () => {
  const fresh = await createTenant();
  await publishSite(db, fresh, site({ planTheme: "marca", seatShape: "redonda", ticketStyle: "marca", checkoutTitle: "  Elegí tu lugar " }));
  const { content } = await getPublicSite(db, fresh.organization.slug);
  assert.deepEqual(
    [content.planTheme, content.seatShape, content.ticketStyle, content.checkoutTitle],
    ["marca", "redonda", "marca", "Elegí tu lugar"],
  );

  const raro = await saveSiteDraft(db, fresh, site({ planTheme: "<script>", seatShape: "x", ticketStyle: "y" }));
  assert.deepEqual([raro.planTheme, raro.seatShape, raro.ticketStyle], ["oscuro", "butaca", "troquelado"]);
  await assert.rejects(saveSiteDraft(db, fresh, site({ checkoutTitle: "x".repeat(61) })), ValidationError);

  await db.query("update sites set published = published - 'planTheme' - 'seatShape' - 'ticketStyle' - 'checkoutTitle' where organization_id = $1", [fresh.organization.id]);
  const viejo = (await getPublicSite(db, fresh.organization.slug)).content;
  assert.deepEqual([viejo.planTheme, viejo.seatShape, viejo.ticketStyle, viejo.checkoutTitle], ["oscuro", "butaca", "troquelado", ""]);
  assert.equal((await getPublicSiteContent(db, fresh.organization.slug)).planTheme, "oscuro");
});

test("el campo desconocido no se guarda", async () => {
  const saved = await saveSiteDraft(db, tenant, site({ evil: "<script>" }));
  assert.equal("evil" in saved, false);
});

test("un cliente suspendido deja de tener página pública y vuelve al reactivarlo", async () => {
  const fresh = await createTenant();
  await publishSite(db, fresh, site());
  await db.query("update organizations set suspended_at = now() where id = $1", [fresh.organization.id]);
  assert.equal(await getPublicSite(db, fresh.organization.slug), null);

  await db.query("update organizations set suspended_at = null where id = $1", [fresh.organization.id]);
  assert.ok(await getPublicSite(db, fresh.organization.slug));
});

test("la página pública trae solo fechas futuras de ese cliente, y ningún dato interno", async () => {
  const first = await createTenant();
  const other = await createTenant();
  await publishSite(db, first, site());

  const addEvent = async (owner, title, when) => {
    const { rows: [venue] } = await db.query(
      "insert into venues (organization_id, name) values ($1, 'Sala') returning id",
      [owner.organization.id],
    );
    const { rows: [event] } = await db.query(
      "insert into events (organization_id, venue_id, title, status) values ($1, $2, $3, 'published') returning id",
      [owner.organization.id, venue.id, title],
    );
    await db.query("insert into performances (event_id, starts_at) values ($1, now() + $2::interval)", [event.id, when]);
  };
  await addEvent(first, "Después", "2 days");
  await addEvent(first, "Antes", "1 day");
  await addEvent(first, "Vieja", "-1 day");
  await addEvent(other, "De otro", "1 day");

  const publicSite = await getPublicSite(db, first.organization.slug);
  assert.deepEqual(publicSite.events.map((e) => e.title), ["Antes", "Después"]);
  assert.deepEqual(Object.keys(publicSite).sort(), ["content", "events"]);
  assert.equal(JSON.stringify(publicSite).includes("commission"), false);

  // El editor muestra las mismas fechas, aunque el sitio todavía no esté publicado.
  await unpublishSite(db, first);
  const editing = await getSiteForEditing(db, first);
  assert.deepEqual(editing.events.map((e) => e.title), ["Antes", "Después"]);
});
