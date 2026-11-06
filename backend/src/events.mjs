// Eventos del panel: funciones, precios, lotes, publicación y butacas bloqueadas.
// Cada consulta filtra por la organización del tenant de la sesión.
import { ValidationError, withTransaction } from "./auth.mjs";
import { assertManager, audit, parseMap, SELLABLE_KINDS } from "./venues.mjs";

const MAX_IMAGE_LENGTH = (900 * 1024 * 4) / 3;
const MAX_PRICE = 100_000_000;
const BLOCK_REASONS = ["Invitación", "Producción", "Sin visión", "Otro"];

export { BLOCK_REASONS };

function parseDetails({ title, description, image }) {
  const parsedTitle = String(title ?? "").trim();
  if (!parsedTitle) throw new ValidationError("Falta el título");
  if (parsedTitle.length > 120) throw new ValidationError("El título puede tener hasta 120 caracteres");
  const parsedDescription = String(description ?? "").trim();
  if (parsedDescription.length > 3000) throw new ValidationError("La descripción puede tener hasta 3000 caracteres");
  const parsedImage = String(image ?? "");
  if (parsedImage) {
    if (!/^data:image\/(jpeg|webp);base64,[a-zA-Z0-9+/]+={0,2}$/.test(parsedImage)) {
      throw new ValidationError("La imagen tiene que ser JPG o WebP");
    }
    if (parsedImage.length > MAX_IMAGE_LENGTH) throw new ValidationError("La imagen es demasiado pesada");
  }
  return { title: parsedTitle, description: parsedDescription, image: parsedImage || null };
}

// Lo que llega de un input datetime-local no trae zona: es la hora de Argentina.
export function parseLocalDate(value, label = "La fecha") {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) throw new ValidationError(`${label} no es válida`);
  const date = new Date(`${text}:00-03:00`);
  if (Number.isNaN(date.getTime())) throw new ValidationError(`${label} no es válida`);
  return date;
}

function parseFutureDate(value) {
  const date = parseLocalDate(value, "La fecha de la función");
  if (date <= new Date()) throw new ValidationError("La función tiene que ser en el futuro");
  return date;
}

function parsePrice(value, label) {
  const text = String(value ?? "").trim();
  if (text === "") return null;
  const price = Number(text);
  if (!Number.isInteger(price) || price < 0 || price > MAX_PRICE) {
    throw new ValidationError(`${label} tiene que ser un número entero de pesos`);
  }
  return price;
}

export const rowLabel = (index) =>
  (index >= 26 ? String.fromCharCode(64 + Math.floor(index / 26)) : "") + String.fromCharCode(65 + (index % 26));

// Crea las butacas de una función a partir del mapa copiado en el evento.
async function generateSeats(tx, eventId, map, performanceIds) {
  const { rows: sectors } = await tx.query("select id, map_key from sectors where event_id = $1", [eventId]);
  const idByKey = new Map(sectors.map((sector) => [sector.map_key, sector.id]));
  const sectorIds = [];
  const labels = [];
  const numbers = [];
  for (const sector of map.sectors) {
    if (sector.kind !== "numbered") continue;
    sector.rows.forEach((count, rowIndex) => {
      for (let number = 1; number <= count; number += 1) {
        sectorIds.push(idByKey.get(sector.key));
        labels.push(rowLabel(rowIndex));
        numbers.push(number);
      }
    });
  }
  if (sectorIds.length === 0) return;
  await tx.query(
    `insert into seats (performance_id, sector_id, row_label, number)
     select performance_id, seat.sector_id, seat.row_label, seat.number
     from unnest($1::uuid[]) as performance_id
     cross join unnest($2::uuid[], $3::text[], $4::int[]) as seat (sector_id, row_label, number)`,
    [performanceIds, sectorIds, labels, numbers],
  );
}

// Copia el mapa de la sala al evento y crea sus sectores, conservando los precios ya cargados.
async function copyMap(tx, eventId, venueMap) {
  const map = parseMap(venueMap);
  const sellable = map.sectors.filter((sector) => SELLABLE_KINDS.includes(sector.kind));
  await tx.query("delete from sectors where event_id = $1 and map_key <> all($2::text[])", [
    eventId,
    sellable.map((sector) => sector.key),
  ]);
  for (const [position, sector] of sellable.entries()) {
    await tx.query(
      `insert into sectors (event_id, map_key, name, kind, capacity, position)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (event_id, name) do update
         set map_key = excluded.map_key, kind = excluded.kind, capacity = excluded.capacity, position = excluded.position`,
      [eventId, sector.key, sector.name, sector.kind, sector.capacity ?? null, position],
    );
  }
  await tx.query("update events set map = $2, updated_at = now() where id = $1", [eventId, map]);
}

async function findOwnEvent(db, tenant, id, { lock = false } = {}) {
  const { rows: [event] } = await db.query(
    `select id, status, title, map, venue_id as "venueId" from events
     where id = $1 and organization_id = $2 ${lock ? "for update" : ""}`,
    [id, tenant.organization.id],
  );
  if (!event) throw new ValidationError("No encontramos ese evento");
  return event;
}

export async function listEvents(db, tenant) {
  assertManager(tenant);
  const { rows } = await db.query(
    `select
       events.id, events.title, events.status, venues.name as venue,
       (select min(starts_at) from performances where event_id = events.id and starts_at >= now()) as "nextAt",
       (select count(*)::int from performances where event_id = events.id) as "performanceCount"
     from events
     join venues on venues.id = events.venue_id
     where events.organization_id = $1
     order by "nextAt" nulls last, events.created_at desc`,
    [tenant.organization.id],
  );
  return rows;
}

export async function getEvent(db, tenant, id) {
  assertManager(tenant);
  const { rows: [event] } = await db.query(
    `select
       events.id, events.title, events.description, events.image, events.status, events.map,
       events.venue_id as "venueId", venues.name as venue
     from events
     join venues on venues.id = events.venue_id
     where events.id = $1 and events.organization_id = $2`,
    [id, tenant.organization.id],
  );
  if (!event) return null;

  const { rows: performances } = await db.query(
    `select
       performances.id, performances.starts_at as "startsAt",
       (select count(*)::int from orders where orders.performance_id = performances.id) as "orderCount"
     from performances where event_id = $1 order by starts_at`,
    [id],
  );
  const { rows: sectors } = await db.query(
    `select
       sectors.id, sectors.map_key as "mapKey", sectors.name, sectors.kind, sectors.capacity, sectors.price,
       coalesce(
         (select json_agg(json_build_object(
            'id', l.id, 'name', l.name, 'price', l.price, 'quota', l.quota,
            'startsAt', l.starts_at, 'endsAt', l.ends_at) order by l.position)
          from price_lots l where l.sector_id = sectors.id),
         '[]'
       ) as lots
     from sectors where event_id = $1 order by position, name`,
    [id],
  );
  return { ...event, performances, sectors };
}

const MAX_LOCATIONS = 20;
const MAX_LOCATION_CAPACITY = 200000;

// Ubicaciones de un evento que se vende sin plano. Se guardan como un mapa de sectores
// generales marcado "list": así la compra, los cupos y el escáner funcionan igual que siempre.
export function locationsMap(input) {
  const list = (Array.isArray(input) ? input : []).filter((item) => String(item?.name ?? "").trim());
  if (list.length === 0) throw new ValidationError("Agregá al menos una ubicación (por ejemplo General)");
  if (list.length > MAX_LOCATIONS) throw new ValidationError(`Podés tener hasta ${MAX_LOCATIONS} ubicaciones`);
  const columns = Math.min(list.length, 3);
  const rows = Math.ceil(list.length / columns);
  const w = 100 / columns;
  const h = 100 / rows;
  return parseMap({
    display: "list",
    sectors: list.map((item, index) => ({
      key: String(item?.key ?? "").trim() || `u${index + 1}-${Math.random().toString(36).slice(2, 8)}`,
      kind: "general",
      name: item.name,
      capacity: Number(item.capacity),
      x: (index % columns) * w + 1,
      y: Math.floor(index / columns) * h + 1,
      w: w - 2,
      h: h - 2,
    })).map((sector) => {
      if (!Number.isInteger(sector.capacity) || sector.capacity < 1 || sector.capacity > MAX_LOCATION_CAPACITY) {
        throw new ValidationError(`La capacidad de "${String(sector.name).trim()}" tiene que ser un número entre 1 y ${MAX_LOCATION_CAPACITY}`);
      }
      return sector;
    }),
  });
}

// Lugar de un evento por ubicación: una sala existente o, si todavía no hay, una nueva con ese nombre.
async function venueForLocations(tx, tenant, venueId, venueName) {
  if (venueId) {
    const { rows: [venue] } = await tx.query("select id from venues where id = $1 and organization_id = $2", [
      venueId,
      tenant.organization.id,
    ]);
    if (!venue) throw new ValidationError("Elegí un lugar");
    return venue.id;
  }
  const name = String(venueName ?? "").trim();
  if (!name) throw new ValidationError("Escribí el nombre del lugar");
  if (name.length > 80) throw new ValidationError("El nombre del lugar puede tener hasta 80 caracteres");
  const { rows: [venue] } = await tx.query(
    "insert into venues (organization_id, name, map) values ($1, $2, $3) returning id",
    [tenant.organization.id, name, { sectors: [] }],
  );
  await audit(tx, tenant, "venue.created", { name });
  return venue.id;
}

// Crea el evento en borrador: con una copia del mapa de la sala o, si se vende por ubicación, con sus ubicaciones.
export async function createEvent(db, tenant, { venueId, venueName, startsAt, mode, locations, ...details }) {
  assertManager(tenant);
  const parsed = parseDetails(details);
  const date = parseFutureDate(startsAt);
  const byLocation = mode === "ubicaciones";
  const listMap = byLocation ? locationsMap(locations) : null;

  return withTransaction(db, async (tx) => {
    const venue = byLocation
      ? { id: await venueForLocations(tx, tenant, venueId, venueName), map: listMap }
      : (await tx.query("select id, map from venues where id = $1 and organization_id = $2", [venueId, tenant.organization.id])).rows[0];
    if (!venue) throw new ValidationError("Elegí una sala");
    if (!venue.map.sectors.some((sector) => SELLABLE_KINDS.includes(sector.kind))) {
      throw new ValidationError("Esa sala todavía no tiene sectores para vender. Armá su mapa primero");
    }

    const { rows: [{ id }] } = await tx.query(
      `insert into events (organization_id, venue_id, title, description, image)
       values ($1, $2, $3, $4, $5) returning id`,
      [tenant.organization.id, venue.id, parsed.title, parsed.description, parsed.image],
    );
    await tx.query("insert into performances (event_id, starts_at) values ($1, $2)", [id, date]);
    await copyMap(tx, id, venue.map);
    await audit(tx, tenant, "event.created", { title: parsed.title });
    return id;
  });
}

export async function updateEventDetails(db, tenant, id, details) {
  assertManager(tenant);
  const parsed = parseDetails(details);
  const { rowCount } = await db.query(
    `update events set title = $3, description = $4, image = $5, updated_at = now()
     where id = $1 and organization_id = $2`,
    [id, tenant.organization.id, parsed.title, parsed.description, parsed.image],
  );
  if (!rowCount) throw new ValidationError("No encontramos ese evento");
}

// Solo en borrador: después de publicar, el mapa del evento queda fijo.
export async function refreshEventMap(db, tenant, id) {
  assertManager(tenant);
  await withTransaction(db, async (tx) => {
    const event = await findOwnEvent(tx, tenant, id, { lock: true });
    if (event.status !== "draft") throw new ValidationError("El mapa solo se puede actualizar en borrador");
    if (event.map?.display === "list") throw new ValidationError("Este evento se vende por ubicación: editá sus ubicaciones");
    const { rows: [venue] } = await tx.query("select map from venues where id = $1", [event.venueId]);
    if (!venue.map.sectors.some((sector) => SELLABLE_KINDS.includes(sector.kind))) {
      throw new ValidationError("Esa sala no tiene sectores para vender");
    }
    await copyMap(tx, id, venue.map);
  });
}

// Ubicaciones de un evento que se vende sin plano. Solo en borrador, igual que el mapa.
// Los precios ya cargados se conservan para las ubicaciones que siguen con el mismo nombre.
export async function saveEventLocations(db, tenant, id, locations) {
  assertManager(tenant);
  const map = locationsMap(locations);
  await withTransaction(db, async (tx) => {
    const event = await findOwnEvent(tx, tenant, id, { lock: true });
    if (event.map?.display !== "list") throw new ValidationError("Este evento se vende con mapa");
    if (event.status !== "draft") throw new ValidationError("Las ubicaciones solo se pueden cambiar en borrador");
    // Renombrar: los sectores se reconocen por su clave. En dos pasos, por si se intercambian nombres.
    const keys = map.sectors.map((sector) => sector.key);
    await tx.query("update sectors set name = id::text where event_id = $1 and map_key = any($2::text[])", [id, keys]);
    for (const sector of map.sectors) {
      await tx.query("update sectors set name = $3 where event_id = $1 and map_key = $2", [id, sector.key, sector.name]);
    }
    await copyMap(tx, id, map);
    await audit(tx, tenant, "event.locations_saved", { title: event.title, count: map.sectors.length });
  });
}

export async function addPerformance(db, tenant, id, startsAt) {
  assertManager(tenant);
  const date = parseFutureDate(startsAt);
  await withTransaction(db, async (tx) => {
    const event = await findOwnEvent(tx, tenant, id, { lock: true });
    if (event.status === "finished" || event.status === "cancelled") {
      throw new ValidationError("El evento ya terminó o está cancelado");
    }
    const { rows: [performance] } = await tx.query(
      "insert into performances (event_id, starts_at) values ($1, $2) returning id",
      [id, date],
    );
    // Publicado, las butacas ya existen en las demás funciones: esta las necesita ahora.
    if (event.status === "published") await generateSeats(tx, id, event.map, [performance.id]);
    await audit(tx, tenant, "event.performance_added", { title: event.title, startsAt: date });
  });
}

export async function removePerformance(db, tenant, eventId, performanceId) {
  assertManager(tenant);
  await withTransaction(db, async (tx) => {
    const event = await findOwnEvent(tx, tenant, eventId, { lock: true });
    const { rows: [performance] } = await tx.query(
      `select performances.id, performances.starts_at as "startsAt",
         (select count(*)::int from orders where orders.performance_id = performances.id) as orders,
         (select count(*)::int from performances p where p.event_id = $1) as total
       from performances where id = $2 and event_id = $1`,
      [eventId, performanceId],
    );
    if (!performance) throw new ValidationError("No encontramos esa función");
    if (performance.orders > 0) throw new ValidationError("No se puede borrar una función con órdenes");
    if (performance.total === 1) throw new ValidationError("El evento tiene que tener al menos una función");
    await tx.query("delete from performances where id = $1", [performanceId]);
    await audit(tx, tenant, "event.performance_removed", { title: event.title, startsAt: performance.startsAt });
  });
}

function parseLot(raw, sectorName) {
  const label = `el lote de "${sectorName}"`;
  const name = String(raw?.name ?? "").trim();
  if (!name) throw new ValidationError(`Falta el nombre en ${label}`);
  if (name.length > 60) throw new ValidationError(`El nombre de ${label} es demasiado largo`);
  const price = parsePrice(raw?.price, `El precio de ${label}`);
  if (price === null) throw new ValidationError(`Falta el precio en ${label}`);
  const quotaText = String(raw?.quota ?? "").trim();
  const quota = quotaText === "" ? null : Number(quotaText);
  if (quota !== null && (!Number.isInteger(quota) || quota < 1)) {
    throw new ValidationError(`El cupo de ${label} tiene que ser un número entero`);
  }
  const startsAt = raw?.startsAt ? parseLocalDate(raw.startsAt, `El inicio de ${label}`) : null;
  const endsAt = raw?.endsAt ? parseLocalDate(raw.endsAt, `El fin de ${label}`) : null;
  if (startsAt && endsAt && endsAt <= startsAt) throw new ValidationError(`El fin de ${label} tiene que ser posterior al inicio`);
  return { id: raw?.id || null, name, price, quota, startsAt, endsAt };
}

// Guarda el precio y los lotes de cada sector. Los cambios de precio quedan en la auditoría.
export async function savePricing(db, tenant, eventId, sectorsInput) {
  assertManager(tenant);
  if (!Array.isArray(sectorsInput)) throw new ValidationError("Faltan los precios");

  await withTransaction(db, async (tx) => {
    const event = await findOwnEvent(tx, tenant, eventId, { lock: true });
    const { rows: sectors } = await tx.query("select id, name, price from sectors where event_id = $1", [eventId]);
    const byId = new Map(sectors.map((sector) => [sector.id, sector]));

    for (const input of sectorsInput) {
      const sector = byId.get(input?.id);
      if (!sector) throw new ValidationError("Ese sector no es de este evento");
      const price = parsePrice(input.price, `El precio de "${sector.name}"`);
      const lots = (Array.isArray(input.lots) ? input.lots : []).map((lot) => parseLot(lot, sector.name));

      if (price !== sector.price) {
        await tx.query("update sectors set price = $2 where id = $1", [sector.id, price]);
        await audit(tx, tenant, "event.price_changed", {
          title: event.title,
          sector: sector.name,
          from: sector.price,
          to: price,
        });
      }

      const keptIds = lots.map((lot) => lot.id).filter(Boolean);
      await tx.query("delete from price_lots where sector_id = $1 and id <> all($2::uuid[])", [sector.id, keptIds]);
      for (const [position, lot] of lots.entries()) {
        await tx.query(
          lot.id
            ? `update price_lots set name = $3, price = $4, quota = $5, starts_at = $6, ends_at = $7, position = $8
               where id = $1 and sector_id = $2`
            : `insert into price_lots (sector_id, name, price, quota, starts_at, ends_at, position)
               values ($1, $2, $3, $4, $5, $6, $7)`,
          lot.id
            ? [lot.id, sector.id, lot.name, lot.price, lot.quota, lot.startsAt, lot.endsAt, position]
            : [sector.id, lot.name, lot.price, lot.quota, lot.startsAt, lot.endsAt, position],
        );
      }
    }
  });
}

// Publicar genera las butacas de cada función y deja el mapa fijo.
export async function publishEvent(db, tenant, id) {
  assertManager(tenant);
  await withTransaction(db, async (tx) => {
    const event = await findOwnEvent(tx, tenant, id, { lock: true });
    if (event.status !== "draft") throw new ValidationError("Solo se puede publicar un borrador");

    const { rows: sectors } = await tx.query("select name, price from sectors where event_id = $1", [id]);
    if (sectors.length === 0) throw new ValidationError("El evento no tiene sectores para vender");
    const missing = sectors.filter((sector) => sector.price === null).map((sector) => sector.name);
    if (missing.length > 0) throw new ValidationError(`Falta el precio de: ${missing.join(", ")}`);

    const { rows: performances } = await tx.query(
      "select id, starts_at > now() as future from performances where event_id = $1",
      [id],
    );
    if (!performances.some((performance) => performance.future)) {
      throw new ValidationError("El evento tiene que tener al menos una función futura");
    }

    await generateSeats(tx, id, event.map, performances.map((performance) => performance.id));
    await tx.query("update events set status = 'published', updated_at = now() where id = $1", [id]);
    await audit(tx, tenant, "event.published", { title: event.title });
  });
}

export async function setEventStatus(db, tenant, id, status) {
  assertManager(tenant);
  if (status !== "finished" && status !== "cancelled") throw new ValidationError("Ese estado no es válido");
  await withTransaction(db, async (tx) => {
    const event = await findOwnEvent(tx, tenant, id, { lock: true });
    if (event.status !== "published") throw new ValidationError("Solo se puede cerrar un evento publicado");
    await tx.query("update events set status = $2, updated_at = now() where id = $1", [id, status]);
    await audit(tx, tenant, status === "finished" ? "event.finished" : "event.cancelled", { title: event.title });
  });
}

export async function listPerformanceSeats(db, tenant, eventId, performanceId) {
  assertManager(tenant);
  const { rows } = await db.query(
    `select
       seats.id, sectors.name as sector, seats.row_label as row, seats.number,
       seats.status, seats.block_reason as "blockReason",
       (seats.status = 'held' and seats.held_until < now()) as expired
     from seats
     join sectors on sectors.id = seats.sector_id
     join performances on performances.id = seats.performance_id
     join events on events.id = performances.event_id
     where performances.id = $1 and events.id = $2 and events.organization_id = $3
     order by sectors.position, length(seats.row_label), seats.row_label, seats.number`,
    [performanceId, eventId, tenant.organization.id],
  );
  return rows;
}

// Bloquea o libera butacas. Una butaca reservada o vendida nunca se toca desde acá.
export async function setSeatsBlocked(db, tenant, eventId, performanceId, { seatIds, blocked, reason }) {
  assertManager(tenant);
  if (!Array.isArray(seatIds) || seatIds.length === 0) throw new ValidationError("Elegí al menos una butaca");
  if (blocked && !BLOCK_REASONS.includes(reason)) throw new ValidationError("Elegí un motivo");

  return withTransaction(db, async (tx) => {
    const event = await findOwnEvent(tx, tenant, eventId);
    const { rowCount } = await tx.query(
      `update seats
       set status = $4, block_reason = $5
       from performances
       where seats.id = any($1::uuid[])
         and seats.performance_id = $2
         and performances.id = seats.performance_id
         and performances.event_id = $3
         and seats.status = $6`,
      [seatIds, performanceId, eventId, blocked ? "blocked" : "free", blocked ? reason : null, blocked ? "free" : "blocked"],
    );
    await audit(tx, tenant, blocked ? "event.seats_blocked" : "event.seats_released", {
      title: event.title,
      count: rowCount,
      reason: blocked ? reason : undefined,
    });
    return rowCount;
  });
}

// Imagen pública de un evento publicado. Devuelve null si no corresponde mostrarla.
export async function getPublicEventImage(db, id) {
  const { rows: [event] } = await db.query(
    `select events.image
     from events
     join organizations on organizations.id = events.organization_id
     where events.id = $1 and events.status = 'published' and events.image is not null
       and organizations.suspended_at is null`,
    [id],
  );
  if (!event) return null;
  const [, type, base64] = event.image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  return { type, bytes: Buffer.from(base64, "base64") };
}
