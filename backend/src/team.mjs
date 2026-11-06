// Equipo de un cliente: el dueño crea las cuentas de su gente y elige quién puede escanear QR.
// Todo recibe el tenant de la sesión (requireTenant): el organization_id nunca sale del formulario.
import {
  generateTemporaryPassword,
  hashPassword,
  normalizeEmail,
  recordAudit,
  ValidationError,
  withTransaction,
} from "./auth.mjs";

export const TEAM_ROLES = ["owner", "editor", "ventas", "portero"];

// Solo el dueño (o un admin de Nightowl con "Editar como el cliente") maneja el equipo.
function assertCanManage(tenant) {
  if (!tenant || !["owner", "soporte"].includes(tenant.role)) {
    throw new ValidationError("Solo el dueño de la cuenta puede manejar el equipo");
  }
}

const audit = (db, session, tenant, action, details) =>
  recordAudit(db, {
    actorUserId: session.userId,
    actorEmail: session.email,
    organizationId: tenant.organization.id,
    action,
    details,
  });

export async function listTeam(db, tenant) {
  const { rows } = await db.query(
    `select u.id, u.email, m.role, (m.can_scan or m.role = 'portero') as "canScan",
            u.must_change_password as "mustChangePassword", u.disabled_at as "disabledAt",
            u.last_login_at as "lastLoginAt"
     from memberships m
     join users u on u.id = m.user_id
     where m.organization_id = $1 and not u.is_platform_admin
     order by m.created_at`,
    [tenant.organization.id],
  );
  return rows;
}

// Devuelve la contraseña inicial: es la única vez que existe en texto.
export async function createTeamMember(db, session, tenant, { email, role = "editor", canScan = false }) {
  assertCanManage(tenant);
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new ValidationError("El email no es válido");
  if (!TEAM_ROLES.includes(role)) throw new ValidationError("El rol no es válido");
  const scan = role === "portero" ? true : Boolean(canScan); // un portero existe para escanear

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
        [user.id, tenant.organization.id, role, scan],
      );
      await audit(tx, session, tenant, "user.created", { email: normalized, role, canScan: scan });
    });
  } catch (error) {
    if (error.code === "23505") throw new ValidationError("Ya existe un usuario con ese email");
    throw error;
  }
  return { email: normalized, temporaryPassword };
}

export async function setTeamMemberScan(db, session, tenant, userId, canScan) {
  assertCanManage(tenant);
  await withTransaction(db, async (tx) => {
    const { rows: [member] } = await tx.query(
      `update memberships m set can_scan = $3
       from users u
       where m.user_id = $1 and m.organization_id = $2 and u.id = m.user_id
         and not u.is_platform_admin and m.role <> 'portero'
       returning u.email`,
      [userId, tenant.organization.id, Boolean(canScan)],
    );
    if (!member) throw new ValidationError("No encontramos ese usuario en tu equipo");
    await audit(tx, session, tenant, canScan ? "user.scan_enabled" : "user.scan_disabled", { email: member.email });
  });
}
