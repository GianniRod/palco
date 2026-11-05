// Salas físicas y su mapa. Todas las consultas filtran por la organización del tenant de la sesión.
import { recordAudit, ValidationError, withTransaction } from "./auth.mjs";
import { ForbiddenError } from "./admin.mjs";

const EDITOR_ROLES = ["owner", "editor", "soporte"];
const KINDS = ["numbered", "general", "stage", "label"];
const MAX_SECTORS = 60;
const MAX_ROWS = 100;
const MAX_SEATS_PER_ROW = 200;
const MAX_SEATS = 20000;

export const SELLABLE_KINDS = ["numbered", "general"];
export const canManage = (tenant) => EDITOR_ROLES.includes(tenant?.role);

export function assertManager(tenant) {
  if (!canManage(tenant)) throw new ForbiddenError();
}

export function audit(db, tenant, action, details = {}) {
  return recordAudit(db, {
    actorUserId: tenant.session.userId,
    actorEmail: tenant.session.email,
    organizationId: tenant.organization.id,
    action,
    details,
  });
}

function requiredText(value, label, max) {
  const text = String(value ?? "").trim();
  if (!text) throw new ValidationError(`Falta ${label}`);
  if (text.length > max) throw new ValidationError(`${label} puede tener hasta ${max} caracteres`);
  return text;
}

const percent = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(Math.min(100, Math.max(0, number)) * 10) / 10 : 0;
};

function parseCount(value, label, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > max) {
    throw new ValidationError(`${label} tiene que ser un número entre 1 y ${max}`);
  }
  return number;
}

function parseSector(raw, index) {
  const kind = KINDS.includes(raw?.kind) ? raw.kind : "label";
  const sector = {
    key: requiredText(raw?.key ?? `s${index}`, "el identificador del sector", 64),
    kind,
    name: requiredText(raw?.name, "el nombre del sector", 40),
    x: percent(raw?.x),
    y: percent(raw?.y),
    w: Math.max(3, percent(raw?.w)),
    h: Math.max(3, percent(raw?.h)),
  };
  if (kind === "numbered") {
    if (!Array.isArray(raw?.rows) || raw.rows.length === 0 || raw.rows.length > MAX_ROWS) {
      throw new ValidationError(`"${sector.name}" tiene que tener entre 1 y ${MAX_ROWS} filas`);
    }
    sector.rows = raw.rows.map((seats) => parseCount(seats, `Las butacas por fila de "${sector.name}"`, MAX_SEATS_PER_ROW));
    const longest = Math.max(...sector.rows);
    sector.aisles = (Array.isArray(raw?.aisles) ? raw.aisles : [])
      .map(Number)
      .filter((seat) => Number.isInteger(seat) && seat >= 1 && seat < longest);
  }
  if (kind === "general") {
    sector.capacity = parseCount(raw?.capacity, `La capacidad de "${sector.name}"`, 200000);
  }
  return sector;
}

export function parseMap(raw) {
  const sectors = Array.isArray(raw?.sectors) ? raw.sectors : [];
  if (sectors.length > MAX_SECTORS) throw new ValidationError(`El mapa puede tener hasta ${MAX_SECTORS} sectores`);
  const parsed = sectors.map(parseSector);

  const sellable = parsed.filter((sector) => SELLABLE_KINDS.includes(sector.kind));
  const names = new Set(sellable.map((sector) => sector.name.toLowerCase()));
  if (names.size !== sellable.length) throw new ValidationError("Dos sectores no pueden tener el mismo nombre");
  if (new Set(parsed.map((sector) => sector.key)).size !== parsed.length) {
    throw new ValidationError("El mapa tiene sectores repetidos");
  }
  const seats = parsed.reduce((total, sector) => total + (sector.rows ?? []).reduce((a, b) => a + b, 0), 0);
  if (seats > MAX_SEATS) throw new ValidationError(`El mapa puede tener hasta ${MAX_SEATS} butacas`);
  return { sectors: parsed };
}

export async function listVenues(db, tenant) {
  assertManager(tenant);
  const { rows } = await db.query(
    `select
       venues.id, venues.name, venues.address, venues.map,
       (select count(*)::int from events where events.venue_id = venues.id) as "eventCount"
     from venues
     where venues.organization_id = $1
     order by venues.name`,
    [tenant.organization.id],
  );
  return rows;
}

export async function getVenue(db, tenant, id) {
  assertManager(tenant);
  const { rows: [venue] } = await db.query(
    `select id, name, address, map,
       (select count(*)::int from events where events.venue_id = venues.id) as "eventCount"
     from venues where id = $1 and organization_id = $2`,
    [id, tenant.organization.id],
  );
  return venue ?? null;
}

export async function createVenue(db, tenant, { name, address }) {
  assertManager(tenant);
  const parsedName = requiredText(name, "el nombre de la sala", 80);
  return withTransaction(db, async (tx) => {
    const { rows: [{ id }] } = await tx.query(
      "insert into venues (organization_id, name, address) values ($1, $2, $3) returning id",
      [tenant.organization.id, parsedName, String(address ?? "").trim() || null],
    );
    await audit(tx, tenant, "venue.created", { name: parsedName });
    return id;
  });
}

// El mapa es la plantilla: cambiarlo no toca los eventos que ya lo copiaron.
export async function saveVenue(db, tenant, id, { name, address, map }) {
  assertManager(tenant);
  const parsedName = requiredText(name, "el nombre de la sala", 80);
  const parsedMap = parseMap(map);
  const { rowCount } = await db.query(
    `update venues set name = $3, address = $4, map = $5, updated_at = now()
     where id = $1 and organization_id = $2`,
    [id, tenant.organization.id, parsedName, String(address ?? "").trim() || null, parsedMap],
  );
  if (!rowCount) throw new ValidationError("No encontramos esa sala");
  return parsedMap;
}

export async function deleteVenue(db, tenant, id) {
  assertManager(tenant);
  await withTransaction(db, async (tx) => {
    const venue = await getVenue(tx, tenant, id);
    if (!venue) throw new ValidationError("No encontramos esa sala");
    if (venue.eventCount > 0) throw new ValidationError("No se puede borrar una sala que tiene eventos");
    await tx.query("delete from venues where id = $1 and organization_id = $2", [id, tenant.organization.id]);
    await audit(tx, tenant, "venue.deleted", { name: venue.name });
  });
}
