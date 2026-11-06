// Operaciones del panel de administración. Todas reciben la sesión de quien actúa y
// la chequean acá, así ninguna ruta del panel depende de acordarse de hacerlo.
import {
  generateTemporaryPassword,
  hashPassword,
  normalizeEmail,
  recordAudit,
  ValidationError,
  withTransaction,
} from "./auth.mjs";

export const MEMBER_ROLES = ["owner", "editor", "ventas", "portero"];

// Son subdominios nuestros: ningún cliente puede tomarlos.
const RESERVED_SLUGS = new Set(["www", "dashboard", "api", "admin", "app", "mail", "static", "assets", "palco"]);

export class ForbiddenError extends Error {
  constructor() {
    super("No tenés permiso para hacer esto");
    this.name = "ForbiddenError";
  }
}

function assertAdmin(actor) {
  if (!actor?.isPlatformAdmin) throw new ForbiddenError();
}

const audit = (db, actor, action, organizationId, details) =>
  recordAudit(db, { actorUserId: actor.userId, actorEmail: actor.email, organizationId, action, details });

const optional = (value) => String(value ?? "").trim() || null;

function parseOrganization({ name, contactName, contactEmail, contactPhone, taxId }) {
  const parsedName = String(name ?? "").trim();
  if (!parsedName) throw new ValidationError("Falta el nombre");
  const email = normalizeEmail(contactEmail);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError("El email de contacto no es válido");
  }
  return {
    name: parsedName,
    contactName: optional(contactName),
    contactEmail: email || null,
    contactPhone: optional(contactPhone),
    taxId: optional(taxId),
  };
}

function parseCommission(value) {
  const percent = Number(String(value ?? "").replace(",", "."));
  if (String(value ?? "").trim() === "" || !Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new ValidationError("La comisión tiene que ser un número entre 0 y 100");
  }
  return Math.round(percent * 100) / 100;
}

function parseSlug(value) {
  const slug = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 63) {
    throw new ValidationError("El slug solo puede tener letras, números y guiones (ej. teatro-colon)");
  }
  if (RESERVED_SLUGS.has(slug)) throw new ValidationError("Ese slug está reservado");
  return slug;
}

export async function listOrganizations(db, actor, { query = "" } = {}) {
  assertAdmin(actor);
  const pattern = `%${query.trim().replace(/[\\%_]/g, "\\$&")}%`;
  const { rows } = await db.query(
    `select
       organizations.id, organizations.slug, organizations.name,
       organizations.commission_percent as "commissionPercent",
       organizations.suspended_at as "suspendedAt",
       count(memberships.user_id)::int as "userCount"
     from organizations
     left join memberships on memberships.organization_id = organizations.id
     where organizations.name ilike $1 or organizations.slug ilike $1
     group by organizations.id
     order by organizations.name`,
    [pattern],
  );
  return rows;
}

// El cliente con sus usuarios, o null si no existe.
export async function getOrganization(db, actor, id) {
  assertAdmin(actor);
  const { rows: [organization] } = await db.query(
    `select
       id, slug, name,
       contact_name as "contactName", contact_email as "contactEmail",
       contact_phone as "contactPhone", tax_id as "taxId",
       commission_percent as "commissionPercent", suspended_at as "suspendedAt",
       created_at as "createdAt"
     from organizations where id = $1`,
    [id],
  );
  if (!organization) return null;

  const { rows: users } = await db.query(
    `select
       users.id, users.email, memberships.role,
       (memberships.can_scan or memberships.role = 'portero') as "canScan",
       users.must_change_password as "mustChangePassword",
       users.disabled_at as "disabledAt", users.last_login_at as "lastLoginAt"
     from memberships
     join users on users.id = memberships.user_id
     where memberships.organization_id = $1
     order by memberships.created_at`,
    [id],
  );
  return { ...organization, users };
}

export async function createOrganization(db, actor, data) {
  assertAdmin(actor);
  const organization = parseOrganization(data);
  const slug = parseSlug(data.slug);
  const commission = parseCommission(data.commissionPercent);

  try {
    return await withTransaction(db, async (tx) => {
      const { rows: [{ id }] } = await tx.query(
        `insert into organizations
           (slug, name, contact_name, contact_email, contact_phone, tax_id, commission_percent)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id`,
        [
          slug,
          organization.name,
          organization.contactName,
          organization.contactEmail,
          organization.contactPhone,
          organization.taxId,
          commission,
        ],
      );
      await audit(tx, actor, "organization.created", id, { slug, name: organization.name, commission });
      return id;
    });
  } catch (error) {
    if (error.code === "23505") throw new ValidationError("Ya hay un cliente con ese slug");
    throw error;
  }
}

export async function updateOrganization(db, actor, id, data) {
  assertAdmin(actor);
  const organization = parseOrganization(data);
  await withTransaction(db, async (tx) => {
    await tx.query(
      `update organizations
       set name = $2, contact_name = $3, contact_email = $4, contact_phone = $5, tax_id = $6
       where id = $1`,
      [
        id,
        organization.name,
        organization.contactName,
        organization.contactEmail,
        organization.contactPhone,
        organization.taxId,
      ],
    );
    await audit(tx, actor, "organization.updated", id, organization);
  });
}

export async function setCommission(db, actor, id, value) {
  assertAdmin(actor);
  const commission = parseCommission(value);
  await withTransaction(db, async (tx) => {
    const { rows: [previous] } = await tx.query(
      "select commission_percent as percent from organizations where id = $1 for update",
      [id],
    );
    await tx.query("update organizations set commission_percent = $2 where id = $1", [id, commission]);
    await audit(tx, actor, "organization.commission_changed", id, {
      from: Number(previous?.percent),
      to: commission,
    });
  });
}

export async function setOrganizationSuspended(db, actor, id, suspended) {
  assertAdmin(actor);
  await withTransaction(db, async (tx) => {
    await tx.query(
      "update organizations set suspended_at = case when $2::boolean then now() end where id = $1",
      [id, suspended],
    );
    await audit(tx, actor, suspended ? "organization.suspended" : "organization.reactivated", id);
  });
}

// Crea el usuario y devuelve su contraseña inicial: es la única vez que existe en texto.
export async function createMember(db, actor, { organizationId, email, role = "owner", canScan }) {
  assertAdmin(actor);
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new ValidationError("El email no es válido");
  if (!MEMBER_ROLES.includes(role)) throw new ValidationError("El rol no es válido");

  // Puede escanear los QR de su cliente. Sin elegir: el dueño y el portero sí, el resto no.
  const scan = role === "portero" || (canScan === undefined ? role === "owner" : Boolean(canScan));

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  try {
    await withTransaction(db, async (tx) => {
      const { rows: [user] } = await tx.query(
        "insert into users (email, password_hash) values ($1, $2) returning id",
        [normalized, passwordHash],
      );
      await tx.query(
        "insert into memberships (user_id, organization_id, role, can_scan) values ($1, $2, $3, $4)",
        [user.id, organizationId, role, scan],
      );
      await audit(tx, actor, "user.created", organizationId, { email: normalized, role, canScan: scan });
    });
  } catch (error) {
    if (error.code === "23505") throw new ValidationError("Ya existe un usuario con ese email");
    throw error;
  }
  return { email: normalized, temporaryPassword };
}

// Un usuario de cliente. Desde el panel no se puede tocar a otro admin de Palco.
async function findMember(db, userId) {
  const { rows: [user] } = await db.query(
    `select users.id, users.email, memberships.organization_id as "organizationId"
     from users
     join memberships on memberships.user_id = users.id
     where users.id = $1 and not users.is_platform_admin
     limit 1`,
    [userId],
  );
  if (!user) throw new ValidationError("No encontramos ese usuario");
  return user;
}

export async function resetMemberPassword(db, actor, userId) {
  assertAdmin(actor);
  const user = await findMember(db, userId);
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  await withTransaction(db, async (tx) => {
    await tx.query("update users set password_hash = $2, must_change_password = true where id = $1", [
      user.id,
      passwordHash,
    ]);
    await tx.query("delete from sessions where user_id = $1", [user.id]);
    await audit(tx, actor, "user.password_reset", user.organizationId, { email: user.email });
  });
  return { email: user.email, temporaryPassword };
}

export async function setMemberDisabled(db, actor, userId, disabled) {
  assertAdmin(actor);
  const user = await findMember(db, userId);

  await withTransaction(db, async (tx) => {
    await tx.query("update users set disabled_at = case when $2::boolean then now() end where id = $1", [
      user.id,
      disabled,
    ]);
    if (disabled) await tx.query("delete from sessions where user_id = $1", [user.id]);
    await audit(tx, actor, disabled ? "user.disabled" : "user.enabled", user.organizationId, {
      email: user.email,
    });
  });
}

// "Ver como el cliente": la sesión del admin pasa a actuar sobre esa organización.
export async function startImpersonation(db, actor, organizationId) {
  assertAdmin(actor);
  await withTransaction(db, async (tx) => {
    await tx.query("update sessions set acting_organization_id = $2 where token_hash = $1", [
      actor.tokenHash,
      organizationId,
    ]);
    await audit(tx, actor, "impersonation.started", organizationId);
  });
}

export async function stopImpersonation(db, actor) {
  assertAdmin(actor);
  await withTransaction(db, async (tx) => {
    await tx.query("update sessions set acting_organization_id = null where token_hash = $1", [actor.tokenHash]);
    await audit(tx, actor, "impersonation.stopped", actor.actingOrganizationId);
  });
}

export async function listAudit(db, actor, { limit = 100 } = {}) {
  assertAdmin(actor);
  const { rows } = await db.query(
    `select
       audit_log.id, audit_log.actor_email as "actorEmail", audit_log.action,
       audit_log.details, audit_log.created_at as "createdAt",
       organizations.name as "organizationName"
     from audit_log
     left join organizations on organizations.id = audit_log.organization_id
     order by audit_log.created_at desc, audit_log.id desc
     limit $1`,
    [limit],
  );
  return rows;
}
