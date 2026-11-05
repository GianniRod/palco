// QR de las entradas: firma, verificación y escaneo con control de duplicados.
//
// El QR lleva "NO1.<id>.<firma>": el id de la entrada (16 bytes) y una firma Ed25519 de Nightowl.
// No lleva datos personales. Con la clave pública se puede verificar que el QR es nuestro,
// pero solo el servidor (que tiene la privada) puede fabricarlos: eso permite, más adelante,
// validar en la app de puerta sin internet sin que se puedan inventar entradas.
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";

const PREFIX = "NO1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TEST_TICKETS = 50;

export class QrError extends Error {
  constructor(message) {
    super(message);
    this.name = "QrError";
  }
}

function assertAdmin(actor) {
  if (!actor?.isPlatformAdmin) throw new QrError("No tenés permiso para hacer esto");
}

const uuidToBytes = (id) => Buffer.from(id.replace(/-/g, ""), "hex");
function bytesToUuid(bytes) {
  const h = bytes.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Lo firmado incluye el prefijo: si mañana cambia el formato, una firma vieja no sirve para el nuevo.
const signedData = (idBytes) => Buffer.concat([Buffer.from(`${PREFIX}.`), idBytes]);

export function generateSigningKeys() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privateKey: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
    publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
  };
}

export function keysFromBase64({ privateKey, publicKey }) {
  return {
    privateKey: privateKey
      ? createPrivateKey({ key: Buffer.from(privateKey, "base64"), format: "der", type: "pkcs8" })
      : null,
    publicKey: createPublicKey({ key: Buffer.from(publicKey, "base64"), format: "der", type: "spki" }),
  };
}

// Claves del entorno si están; si no, las de la base (se crean una sola vez).
let cached;
export async function getSigningKeys(db) {
  if (cached) return cached;
  const env = { privateKey: process.env.TICKET_SIGNING_PRIVATE_KEY, publicKey: process.env.TICKET_SIGNING_PUBLIC_KEY };
  if (env.privateKey && env.publicKey) return (cached = keysFromBase64(env));

  const fresh = generateSigningKeys();
  await db.query(
    "insert into qr_signing_keys (id, private_key, public_key) values (1, $1, $2) on conflict (id) do nothing",
    [fresh.privateKey, fresh.publicKey],
  );
  const { rows: [row] } = await db.query("select private_key, public_key from qr_signing_keys where id = 1");
  return (cached = keysFromBase64({ privateKey: row.private_key, publicKey: row.public_key }));
}

export function signTicketCode(keys, ticketId) {
  if (!UUID.test(ticketId)) throw new QrError("Id de entrada inválido");
  if (!keys.privateKey) throw new QrError("Falta la clave privada para firmar");
  const idBytes = uuidToBytes(ticketId);
  const signature = sign(null, signedData(idBytes), keys.privateKey);
  return `${PREFIX}.${idBytes.toString("base64url")}.${signature.toString("base64url")}`;
}

// Devuelve el id de la entrada si el código es nuestro y no fue tocado; si no, null.
export function verifyTicketCode(keys, code) {
  const parts = String(code ?? "").trim().split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const idBytes = Buffer.from(parts[1], "base64url");
  const signature = Buffer.from(parts[2], "base64url");
  if (idBytes.length !== 16 || signature.length !== 64) return null;
  // base64url acepta caracteres de más: se exige la forma exacta para que haya un solo código por entrada.
  if (idBytes.toString("base64url") !== parts[1] || signature.toString("base64url") !== parts[2]) return null;
  try {
    return verify(null, signedData(idBytes), keys.publicKey, signature) ? bytesToUuid(idBytes) : null;
  } catch {
    return null;
  }
}

/* ---------------------------- Entradas de prueba ---------------------------- */

export async function createTestTickets(db, actor, { count = 1, holder = "" } = {}) {
  assertAdmin(actor);
  const n = Math.min(Math.max(Math.trunc(Number(count)) || 1, 1), 10);
  const { rows: [{ total }] } = await db.query("select count(*)::int as total from qr_test_tickets");
  if (total + n > MAX_TEST_TICKETS) {
    throw new QrError(`Ya hay ${total} entradas de prueba. Borralas antes de crear más (máximo ${MAX_TEST_TICKETS}).`);
  }
  const name = String(holder ?? "").trim().slice(0, 60);
  for (let i = 0; i < n; i++) {
    await db.query(
      `insert into qr_test_tickets (number, holder, created_by)
       values ((select coalesce(max(number), 0) + 1 from qr_test_tickets), $1, $2)`,
      [name, actor.userId],
    );
  }
}

export async function listTestTickets(db, actor) {
  assertAdmin(actor);
  const keys = await getSigningKeys(db);
  const { rows } = await db.query(
    `select t.id, t.number, t.holder, t.checked_in_at as "checkedInAt", u.email as "checkedInBy",
            (select count(*)::int from qr_scans s where s.ticket_id = t.id) as scans
     from qr_test_tickets t
     left join users u on u.id = t.checked_in_by
     order by t.number desc`,
  );
  return rows.map((row) => ({ ...row, code: signTicketCode(keys, row.id) }));
}

// Vuelve todas a "sin usar" para poder probar de nuevo.
export async function resetTestTickets(db, actor) {
  assertAdmin(actor);
  await db.query("update qr_test_tickets set checked_in_at = null, checked_in_by = null");
}

export async function deleteTestTickets(db, actor) {
  assertAdmin(actor);
  await db.query("delete from qr_test_tickets");
}

const TICKET_COLUMNS = `t.id, t.number, t.holder, t.checked_in_at as "checkedInAt", u.email as "checkedInBy"`;

/**
 * Escanea un código. Resultados:
 * - valid: primera vez que entra (queda marcada).
 * - duplicate: ya había entrado; devuelve cuándo y quién la escaneó.
 * - invalid: el código no es nuestro, fue modificado o la entrada no existe.
 */
export async function scanTicket(db, actor, code) {
  assertAdmin(actor);
  const keys = await getSigningKeys(db);
  const id = verifyTicketCode(keys, code);
  if (!id) {
    await db.query("insert into qr_scans (result, scanned_by) values ('invalid', $1)", [actor.userId]);
    return { result: "invalid", reason: "Este QR no es una entrada de Nightowl o fue modificado." };
  }

  // Un solo update condicionado: si dos porteros escanean la misma entrada a la vez, entra uno solo.
  const { rowCount } = await db.query(
    "update qr_test_tickets set checked_in_at = now(), checked_in_by = $2 where id = $1 and checked_in_at is null",
    [id, actor.userId],
  );
  const { rows: [ticket] } = await db.query(
    `select ${TICKET_COLUMNS} from qr_test_tickets t left join users u on u.id = t.checked_in_by where t.id = $1`,
    [id],
  );
  if (!ticket) {
    await db.query("insert into qr_scans (result, scanned_by) values ('invalid', $1)", [actor.userId]);
    return { result: "invalid", reason: "La firma es válida pero la entrada ya no existe (fue borrada)." };
  }
  const result = rowCount === 1 ? "valid" : "duplicate";
  await db.query("insert into qr_scans (ticket_id, result, scanned_by) values ($1, $2, $3)", [id, result, actor.userId]);
  return { result, ticket };
}
