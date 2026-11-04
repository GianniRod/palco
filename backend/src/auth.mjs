import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

export const MIN_PASSWORD_LENGTH = 10;
export const SESSION_DAYS = 7;

const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 }; // Mínimo recomendado por OWASP.
const ATTEMPT_WINDOW = "15 minutes";
const MAX_ATTEMPTS_PER_EMAIL = 5;
const MAX_ATTEMPTS_PER_IP = 20;
const MAX_RESETS_PER_HOUR = 3;

// Se verifica contra esto cuando el email no existe, para tardar lo mismo que con uno real.
const DUMMY_HASH = await hash(randomBytes(16).toString("hex"), ARGON2);

// Un error pensado para mostrarle al usuario tal cual.
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Email o contraseña incorrectos");
    this.name = "InvalidCredentialsError";
  }
}

export class TooManyAttemptsError extends Error {
  constructor() {
    super("Demasiados intentos. Probá de nuevo en unos minutos");
    this.name = "TooManyAttemptsError";
  }
}

export const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();
export const hashPassword = (password) => hash(password, ARGON2);
export const generateTemporaryPassword = () => randomBytes(12).toString("base64url");

const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

function assertPassword(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`La contraseña tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }
  // Argon2 aguanta cualquier largo, pero hashear megas es una forma fácil de saturar el servidor.
  if (password.length > 200) {
    throw new ValidationError("La contraseña es demasiado larga");
  }
}

// Corre todo en una transacción sobre una sola conexión.
export async function withTransaction(db, fn) {
  const client = await db.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function recordAudit(db, { actorUserId, actorEmail, organizationId = null, action, details = {} }) {
  await db.query(
    `insert into audit_log (actor_user_id, actor_email, organization_id, action, details)
     values ($1, $2, $3, $4, $5)`,
    [actorUserId, actorEmail, organizationId, action, details],
  );
}

async function createSession(db, userId) {
  const token = newToken();
  await db.query(
    `insert into sessions (token_hash, user_id, expires_at)
     values ($1, $2, now() + make_interval(days => $3))`,
    [hashToken(token), userId, SESSION_DAYS],
  );
  return token;
}

// Devuelve el token de la sesión nueva o lanza si no se puede entrar.
export async function login(db, { email, password, ip }) {
  const normalized = normalizeEmail(email);

  const { rows: [attempts] } = await db.query(
    `select
       count(*) filter (where email = $1)::int as by_email,
       count(*) filter (where ip = $2)::int as by_ip
     from login_attempts
     where (email = $1 or ip = $2) and attempted_at > now() - $3::interval`,
    [normalized, ip, ATTEMPT_WINDOW],
  );
  if (attempts.by_email >= MAX_ATTEMPTS_PER_EMAIL || attempts.by_ip >= MAX_ATTEMPTS_PER_IP) {
    throw new TooManyAttemptsError();
  }

  const { rows: [user] } = await db.query(
    "select id, password_hash, disabled_at from users where email = $1",
    [normalized],
  );
  const valid = await verify(user?.password_hash ?? DUMMY_HASH, String(password ?? ""));

  if (!user || !valid || user.disabled_at) {
    await db.query("insert into login_attempts (email, ip) values ($1, $2)", [normalized, ip]);
    await db.query("delete from login_attempts where attempted_at < now() - interval '1 day'");
    throw new InvalidCredentialsError();
  }

  await db.query("delete from login_attempts where email = $1", [normalized]);
  await db.query("update users set last_login_at = now() where id = $1", [user.id]);
  return createSession(db, user.id);
}

// La sesión de un token, o null si no existe, venció o el usuario está desactivado.
export async function getSession(db, token) {
  if (!token) return null;
  const { rows: [session] } = await db.query(
    `select
       users.id as "userId",
       users.email,
       users.is_platform_admin as "isPlatformAdmin",
       users.must_change_password as "mustChangePassword",
       sessions.acting_organization_id as "actingOrganizationId",
       sessions.token_hash as "tokenHash"
     from sessions
     join users on users.id = sessions.user_id
     where sessions.token_hash = $1 and sessions.expires_at > now() and users.disabled_at is null`,
    [hashToken(token)],
  );
  return session ?? null;
}

export async function logout(db, token) {
  if (token) await db.query("delete from sessions where token_hash = $1", [hashToken(token)]);
}

// A qué organización entra esta sesión. Sale siempre de la sesión, nunca de la URL ni del formulario.
export async function resolveTenant(db, session) {
  const columns = `organizations.id, organizations.slug, organizations.name,
                   organizations.commission_percent as "commissionPercent",
                   organizations.suspended_at as "suspendedAt"`;

  if (session.isPlatformAdmin) {
    if (!session.actingOrganizationId) return null;
    const { rows: [organization] } = await db.query(
      `select ${columns} from organizations where id = $1`,
      [session.actingOrganizationId],
    );
    return organization ? { organization, role: "soporte", impersonating: true } : null;
  }

  const { rows: [row] } = await db.query(
    `select ${columns}, memberships.role
     from memberships
     join organizations on organizations.id = memberships.organization_id
     where memberships.user_id = $1
     order by memberships.created_at
     limit 1`,
    [session.userId],
  );
  if (!row) return null;
  const { role, ...organization } = row;
  return { organization, role, impersonating: false };
}

// Cambia la contraseña propia y cierra las demás sesiones del usuario.
export async function changePassword(db, session, { currentPassword, newPassword }) {
  assertPassword(newPassword);
  if (newPassword === currentPassword) {
    throw new ValidationError("La contraseña nueva tiene que ser distinta de la actual");
  }

  const { rows: [user] } = await db.query("select password_hash from users where id = $1", [session.userId]);
  if (!(await verify(user.password_hash, String(currentPassword ?? "")))) {
    throw new ValidationError("La contraseña actual no es correcta");
  }

  const passwordHash = await hashPassword(newPassword);
  await withTransaction(db, async (tx) => {
    await tx.query(
      "update users set password_hash = $1, must_change_password = false where id = $2",
      [passwordHash, session.userId],
    );
    await tx.query("delete from sessions where user_id = $1 and token_hash <> $2", [
      session.userId,
      session.tokenHash,
    ]);
    await recordAudit(tx, {
      actorUserId: session.userId,
      actorEmail: session.email,
      action: "password.changed",
    });
  });
}

// Devuelve el token para mandar por email, o null si no corresponde mandar nada.
// Quien pide nunca se entera de cuál de los dos casos fue.
export async function requestPasswordReset(db, email) {
  const { rows: [user] } = await db.query(
    "select id, email from users where email = $1 and disabled_at is null",
    [normalizeEmail(email)],
  );
  if (!user) return null;

  const { rows: [recent] } = await db.query(
    "select count(*)::int as n from password_resets where user_id = $1 and created_at > now() - interval '1 hour'",
    [user.id],
  );
  if (recent.n >= MAX_RESETS_PER_HOUR) return null;

  const token = newToken();
  // Solo sirve el último link pedido.
  await db.query(
    "update password_resets set used_at = now() where user_id = $1 and used_at is null",
    [user.id],
  );
  await db.query(
    `insert into password_resets (token_hash, user_id, expires_at)
     values ($1, $2, now() + interval '1 hour')`,
    [hashToken(token), user.id],
  );
  return { token, email: user.email };
}

export async function resetPassword(db, { token, password }) {
  assertPassword(password);
  const passwordHash = await hashPassword(password);

  await withTransaction(db, async (tx) => {
    // El update es atómico: dos usos del mismo link no pueden pasar los dos.
    const { rows: [reset] } = await tx.query(
      `update password_resets set used_at = now()
       where token_hash = $1 and used_at is null and expires_at > now()
       returning user_id`,
      [hashToken(String(token ?? ""))],
    );
    if (!reset) throw new ValidationError("El link venció o ya se usó. Pedí uno nuevo");

    const { rows: [user] } = await tx.query(
      `update users set password_hash = $1, must_change_password = false
       where id = $2 and disabled_at is null
       returning id, email`,
      [passwordHash, reset.user_id],
    );
    if (!user) throw new ValidationError("El link venció o ya se usó. Pedí uno nuevo");

    await tx.query("delete from sessions where user_id = $1", [user.id]);
    await tx.query("delete from login_attempts where email = $1", [user.email]);
    await recordAudit(tx, { actorUserId: user.id, actorEmail: user.email, action: "password.reset" });
  });
}
