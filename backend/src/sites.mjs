// La página pública de cada cliente. Las operaciones del panel reciben el tenant de la sesión
// (resolveTenant), así la organización nunca sale de la URL ni del formulario.
import { recordAudit, ValidationError, withTransaction } from "./auth.mjs";
import { ForbiddenError } from "./admin.mjs";

const TEMPLATES = ["dividida", "portada", "cartelera"];
const BACKGROUNDS = ["claro", "oscuro"];
const FONTS = ["clasica", "moderna"];
const EDITOR_ROLES = ["owner", "editor", "soporte"];

const MAX_LOGO_BYTES = 400 * 1024;
const MAX_COVER_BYTES = 900 * 1024;
const LIMITS = { displayName: 80, tagline: 140, about: 1000, address: 160, phone: 40, email: 120 };

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

// La página que ve el público, o null si no existe, no se publicó o el cliente está suspendido.
// Solo devuelve datos públicos: nada de comisión ni contactos internos.
export async function getPublicSite(db, slug) {
  const { rows: [site] } = await db.query(
    `select sites.published as content, organizations.id as "organizationId"
     from sites
     join organizations on organizations.id = sites.organization_id
     where organizations.slug = $1
       and sites.published is not null
       and organizations.suspended_at is null`,
    [slug],
  );
  if (!site) return null;
  return { content: { cover: "", ...site.content }, events: await upcomingEvents(db, site.organizationId) };
}

async function upcomingEvents(db, organizationId) {
  const { rows } = await db.query(
    `select events.id, events.title, events.starts_at as "startsAt", venues.name as venue
     from events
     join venues on venues.id = events.venue_id
     where venues.organization_id = $1 and events.starts_at >= now()
     order by events.starts_at
     limit 24`,
    [organizationId],
  );
  return rows;
}
