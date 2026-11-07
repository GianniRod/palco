// La página pública de cada cliente. Las operaciones del panel reciben el tenant de la sesión
// (resolveTenant), así la organización nunca sale de la URL ni del formulario.
import { recordAudit, ValidationError, withTransaction } from "./auth.mjs";
import { ForbiddenError } from "./admin.mjs";

const TEMPLATES = ["dividida", "portada", "cartelera"];
const BACKGROUNDS = ["claro", "oscuro"];
const FONTS = ["clasica", "moderna"];
const PLAN_THEMES = ["oscuro", "claro", "marca"];
const SEAT_SHAPES = ["butaca", "redonda"];
const TICKET_STYLES = ["troquelado", "marca"];
const EDITOR_ROLES = ["owner", "editor", "soporte"];

// Un sitio publicado antes de que existieran estas opciones las toma de acá.
const CHECKOUT_DEFAULTS = {
  planTheme: PLAN_THEMES[0],
  seatShape: SEAT_SHAPES[0],
  ticketStyle: TICKET_STYLES[0],
  checkoutTitle: "",
};

const MAX_LOGO_BYTES = 400 * 1024;
const MAX_COVER_BYTES = 1600 * 1024; // portada nítida en pantallas grandes (hasta 2400 px)
const LIMITS = { displayName: 80, tagline: 140, about: 1000, address: 160, phone: 40, email: 120, checkoutTitle: 60 };

export const canEditSite = (tenant) => EDITOR_ROLES.includes(tenant?.role);

function assertEditor(tenant) {
  if (!canEditSite(tenant)) throw new ForbiddenError();
}

function text(value, field, label) {
  const parsed = String(value ?? "").trim();
  if (parsed.length > LIMITS[field]) {
    throw new ValidationError(`${label} puede tener hasta ${LIMITS[field]} caracteres`);
  }
  return parsed;
}

const oneOf = (value, options, fallback) => (options.includes(value) ? value : fallback);

// Solo http y https: este valor termina en un href de la página pública.
function parseWebsite(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url.href;
  } catch {
    throw new ValidationError("La web no es una dirección válida");
  }
}

function parseInstagram(value) {
  const handle = String(value ?? "")
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
  if (handle && !/^[a-zA-Z0-9._]{1,30}$/.test(handle)) {
    throw new ValidationError("El usuario de Instagram no es válido");
  }
  return handle;
}

// Queda guardado dentro del sitio. SVG no: es el único de estos formatos que puede traer código.
function parseLogo(value) {
  const logo = String(value ?? "");
  if (!logo) return "";
  if (!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/]+={0,2}$/.test(logo)) {
    throw new ValidationError("El logo tiene que ser una imagen PNG, JPG o WebP");
  }
  if (logo.length > (MAX_LOGO_BYTES * 4) / 3) throw new ValidationError("El logo es demasiado pesado");
  return logo;
}

function parseCover(value) {
  const cover = String(value ?? "");
  if (!cover) return "";
  if (!/^data:image\/(jpeg|webp);base64,[a-zA-Z0-9+/]+={0,2}$/.test(cover)) {
    throw new ValidationError("La portada tiene que ser una imagen JPG o WebP");
  }
  if (cover.length > (MAX_COVER_BYTES * 4) / 3) throw new ValidationError("La portada es demasiado pesada");
  return cover;
}

function parseColor(value) {
  const color = String(value ?? "").trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(color)) throw new ValidationError("El color tiene que tener el formato #RRGGBB");
  return color;
}

function parseEmail(value) {
  const email = text(value, "email", "El email").toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("El email no es válido");
  return email;
}

function parseSite(data) {
  const displayName = text(data.displayName, "displayName", "El nombre");
  if (!displayName) throw new ValidationError("Falta el nombre");
  return {
    template: oneOf(data.template, TEMPLATES, TEMPLATES[0]),
    displayName,
    logo: parseLogo(data.logo),
    cover: parseCover(data.cover),
    primaryColor: parseColor(data.primaryColor),
    background: oneOf(data.background, BACKGROUNDS, BACKGROUNDS[0]),
    titleFont: oneOf(data.titleFont, FONTS, FONTS[0]),
    tagline: text(data.tagline, "tagline", "La frase"),
    about: text(data.about, "about", "La presentación"),
    address: text(data.address, "address", "La dirección"),
    phone: text(data.phone, "phone", "El teléfono"),
    email: parseEmail(data.email),
    website: parseWebsite(data.website),
    instagram: parseInstagram(data.instagram),
    planTheme: oneOf(data.planTheme, PLAN_THEMES, CHECKOUT_DEFAULTS.planTheme),
    seatShape: oneOf(data.seatShape, SEAT_SHAPES, CHECKOUT_DEFAULTS.seatShape),
    ticketStyle: oneOf(data.ticketStyle, TICKET_STYLES, CHECKOUT_DEFAULTS.ticketStyle),
    checkoutTitle: text(data.checkoutTitle, "checkoutTitle", "El título de la compra"),
  };
}

const defaultDraft = (organization) => ({
  template: TEMPLATES[0],
  displayName: organization.name,
  logo: "",
  cover: "",
  primaryColor: "#111111",
  background: BACKGROUNDS[0],
  titleFont: FONTS[0],
  tagline: "",
  about: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  instagram: "",
  ...CHECKOUT_DEFAULTS,
});

// Lo que muestra el editor. Si el cliente nunca guardó, arranca con su nombre.
export async function getSiteForEditing(db, tenant) {
  assertEditor(tenant);
  const { rows: [site] } = await db.query(
    `select draft, published, published_at as "publishedAt", updated_at as "updatedAt"
     from sites where organization_id = $1`,
    [tenant.organization.id],
  );
  return {
    // Los sitios guardados antes de sumar un campo nuevo no lo tienen.
    draft: { ...defaultDraft(tenant.organization), ...site?.draft },
    published: site?.published ? { ...defaultDraft(tenant.organization), ...site.published } : null,
    publishedAt: site?.publishedAt ?? null,
    updatedAt: site?.updatedAt ?? null,
    slug: tenant.organization.slug,
    events: await upcomingEvents(db, tenant.organization.id),
  };
}

const upsertDraft = (db, organizationId, draft) =>
  db.query(
    `insert into sites (organization_id, draft) values ($1, $2)
     on conflict (organization_id) do update set draft = excluded.draft, updated_at = now()`,
    [organizationId, draft],
  );

export async function saveSiteDraft(db, tenant, data) {
  assertEditor(tenant);
  const draft = parseSite(data);
  await upsertDraft(db, tenant.organization.id, draft);
  return draft;
}

// Guarda lo que hay en el editor y lo deja visible para el público.
export async function publishSite(db, tenant, data) {
  assertEditor(tenant);
  const draft = parseSite(data);
  await withTransaction(db, async (tx) => {
    await upsertDraft(tx, tenant.organization.id, draft);
    await tx.query(
      "update sites set published = draft, published_at = now() where organization_id = $1",
      [tenant.organization.id],
    );
    await recordAudit(tx, {
      actorUserId: tenant.session.userId,
      actorEmail: tenant.session.email,
      organizationId: tenant.organization.id,
      action: "site.published",
    });
  });
  return draft;
}

export async function unpublishSite(db, tenant) {
  assertEditor(tenant);
  await withTransaction(db, async (tx) => {
    await tx.query(
      "update sites set published = null, published_at = null where organization_id = $1",
      [tenant.organization.id],
    );
    await recordAudit(tx, {
      actorUserId: tenant.session.userId,
      actorEmail: tenant.session.email,
      organizationId: tenant.organization.id,
      action: "site.unpublished",
    });
  });
}

// Solo el contenido del sitio: la compra y las entradas no necesitan la lista de eventos.
async function findPublishedSite(db, slug) {
  const { rows: [site] } = await db.query(
    `select sites.published as content, organizations.id as "organizationId"
     from sites
     join organizations on organizations.id = sites.organization_id
     where organizations.slug = $1
       and sites.published is not null
       and organizations.suspended_at is null`,
    [slug],
  );
  return site ? { organizationId: site.organizationId, content: { cover: "", ...CHECKOUT_DEFAULTS, ...site.content } } : null;
}

export async function getPublicSiteContent(db, slug) {
  return (await findPublishedSite(db, slug))?.content ?? null;
}

// La página que ve el público, o null si no existe, no se publicó o el cliente está suspendido.
// Solo devuelve datos públicos: nada de comisión ni contactos internos.
export async function getPublicSite(db, slug) {
  const site = await findPublishedSite(db, slug);
  if (!site) return null;
  return { content: site.content, events: await upcomingEvents(db, site.organizationId) };
}

// El precio que paga hoy el público: el del primer lote vigente con cupo o, si no hay, el del sector.
const CURRENT_PRICE = "(current_price(sectors.id)).price";

const imageUrl = (event) => (event.hasImage ? `/api/event-images/${event.id}?v=${new Date(event.updatedAt).getTime()}` : null);

async function upcomingEvents(db, organizationId) {
  const { rows } = await db.query(
    `select
       events.id, events.title, events.updated_at as "updatedAt", venues.name as venue,
       events.image is not null as "hasImage",
       next.starts_at as "startsAt", next.remaining,
       (select min(${CURRENT_PRICE}) from sectors where sectors.event_id = events.id) as "fromPrice"
     from events
     join venues on venues.id = events.venue_id
     cross join lateral (
       select min(starts_at) as starts_at, count(*)::int as remaining
       from performances where event_id = events.id and starts_at >= now()
     ) as next
     where events.organization_id = $1 and events.status = 'published' and next.starts_at is not null
     order by next.starts_at
     limit 24`,
    [organizationId],
  );
  return rows.map(({ hasImage, updatedAt, remaining, ...event }) => ({
    ...event,
    moreDates: remaining - 1,
    image: imageUrl({ id: event.id, hasImage, updatedAt }),
  }));
}

// La página de un evento: el sitio que lo enmarca, sus funciones y los precios por sector.
export async function getPublicEvent(db, slug, eventId) {
  const content = await getPublicSiteContent(db, slug);
  if (!content) return null;

  const { rows: [event] } = await db.query(
    `select
       events.id, events.title, events.description, events.map, events.updated_at as "updatedAt",
       events.image is not null as "hasImage", venues.name as venue, venues.address
     from events
     join venues on venues.id = events.venue_id
     join organizations on organizations.id = events.organization_id
     where events.id = $1 and organizations.slug = $2 and events.status = 'published'`,
    [eventId, slug],
  );
  if (!event) return null;

  const { rows: performances } = await db.query(
    `select id, starts_at as "startsAt" from performances
     where event_id = $1 and starts_at >= now() order by starts_at`,
    [eventId],
  );
  const { rows: sectors } = await db.query(
    `select map_key as "mapKey", name, kind, ${CURRENT_PRICE} as price
     from sectors where event_id = $1 order by position, name`,
    [eventId],
  );
  const { hasImage, updatedAt, ...rest } = event;
  return {
    content,
    event: { ...rest, image: imageUrl({ id: event.id, hasImage, updatedAt }), performances, sectors },
  };
}
