// Corre contra un Postgres de verdad. Cada prueba arma sus propios usuarios y organizaciones.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import pg from "pg";
import {
  changePassword,
  getSession,
  hashPassword,
  InvalidCredentialsError,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  resolveTenant,
  TooManyAttemptsError,
  ValidationError,
} from "../src/auth.mjs";
import {
  createMember,
  createOrganization,
  ForbiddenError,
  getOrganization,
  listAudit,
  listOrganizations,
  resetMemberPassword,
  setCommission,
  setMemberDisabled,
  setOrganizationSuspended,
  startImpersonation,
  stopImpersonation,
  updateOrganization,
} from "../src/admin.mjs";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Falta TEST_DATABASE_URL");

const db = new pg.Pool({ connectionString: url, max: 10 });
const PASSWORD = "contraseña-de-prueba";
const unique = () => crypto.randomUUID().slice(0, 8);
const ip = () => `test-${unique()}`;

let admin;
const createdOrganizations = [];
const createdUsers = [];

async function createUser({ isPlatformAdmin = false, mustChange = false } = {}) {
  const email = `${unique()}@example.com`;
  const { rows: [user] } = await db.query(
    `insert into users (email, password_hash, is_platform_admin, must_change_password)
     values ($1, $2, $3, $4) returning id`,
    [email, await hashPassword(PASSWORD), isPlatformAdmin, mustChange],
  );
  createdUsers.push(user.id);
  return { id: user.id, email };
}

async function signIn(user, password = PASSWORD) {
  const token = await login(db, { email: user.email, password, ip: ip() });
  return { token, session: await getSession(db, token) };
}

async function createClient(name = "Cliente") {
  const slug = `org-${unique()}`;
  const id = await createOrganization(db, admin, { name, slug, commissionPercent: "5" });
  createdOrganizations.push(id);
  return { id, slug };
}

// Un cliente con un usuario ya logueado.
async function createClientWithMember() {
  const organization = await createClient();
  const email = `${unique()}@example.com`;
  const { temporaryPassword } = await createMember(db, admin, { organizationId: organization.id, email });
  const { rows: [{ id }] } = await db.query("select id from users where email = $1", [email]);
  createdUsers.push(id);
  const signedIn = await signIn({ email }, temporaryPassword);
  return { organization, email, userId: id, temporaryPassword, ...signedIn };
}

before(async () => {
  ({ session: admin } = await signIn(await createUser({ isPlatformAdmin: true })));
});

after(async () => {
  await db.query("delete from organizations where id = any($1::uuid[])", [createdOrganizations]);
  await db.query("delete from users where id = any($1::uuid[])", [createdUsers]);
  await db.end();
});

test("el login devuelve una sesión; la contraseña mal, no", async () => {
  const user = await createUser();
  const { session } = await signIn(user);
  assert.equal(session.email, user.email);

  await assert.rejects(login(db, { email: user.email, password: "otra-cosa", ip: ip() }), InvalidCredentialsError);
});

test("email inexistente da el mismo error que contraseña incorrecta", async () => {
  await assert.rejects(
    login(db, { email: `${unique()}@example.com`, password: "lo-que-sea", ip: ip() }),
    InvalidCredentialsError,
  );
});

test("el email se normaliza al entrar", async () => {
  const user = await createUser();
  const token = await login(db, { email: `  ${user.email.toUpperCase()} `, password: PASSWORD, ip: ip() });
  assert.ok(await getSession(db, token));
});

test("después de 5 intentos fallidos el email queda bloqueado, aun con la contraseña correcta", async () => {
  const user = await createUser();
  for (let i = 0; i < 5; i++) {
    await assert.rejects(login(db, { email: user.email, password: "mal", ip: ip() }), InvalidCredentialsError);
  }
  await assert.rejects(login(db, { email: user.email, password: PASSWORD, ip: ip() }), TooManyAttemptsError);
});

test("después de 20 intentos fallidos la IP queda bloqueada", async () => {
  const sameIp = ip();
  for (let i = 0; i < 20; i++) {
    await assert.rejects(
      login(db, { email: `${unique()}@example.com`, password: "mal", ip: sameIp }),
      InvalidCredentialsError,
    );
  }
  const user = await createUser();
  await assert.rejects(login(db, { email: user.email, password: PASSWORD, ip: sameIp }), TooManyAttemptsError);
});

test("un token inventado, vencido o de una sesión cerrada no sirve", async () => {
  assert.equal(await getSession(db, "inventado"), null);
  assert.equal(await getSession(db, undefined), null);

  const user = await createUser();
  const { token, session } = await signIn(user);
  await logout(db, token);
  assert.equal(await getSession(db, token), null);

  const second = await signIn(user);
  await db.query("update sessions set expires_at = now() - interval '1 second' where token_hash = $1", [
    second.session.tokenHash,
  ]);
  assert.equal(await getSession(db, second.token), null);
  assert.ok(session);
});

test("el token no se guarda en texto en la base", async () => {
  const { token } = await signIn(await createUser());
  const { rows } = await db.query("select 1 from sessions where token_hash = $1", [token]);
  assert.equal(rows.length, 0);
});

test("un usuario nuevo tiene que cambiar la contraseña, y al hacerlo se cierran sus otras sesiones", async () => {
  const { session, email, temporaryPassword } = await createClientWithMember();
  assert.equal(session.mustChangePassword, true);

  const other = await signIn({ email }, temporaryPassword);
  await changePassword(db, session, { currentPassword: temporaryPassword, newPassword: PASSWORD });

  assert.equal((await getSession(db, session.tokenHash)), null, "el hash no sirve como token");
  assert.equal(await getSession(db, other.token), null);
  const { session: again } = await signIn({ email });
  assert.equal(again.mustChangePassword, false);
});

test("cambiar la contraseña exige la actual, largo mínimo y que sea distinta", async () => {
  const user = await createUser();
  const { session } = await signIn(user);
  const change = (currentPassword, newPassword) => changePassword(db, session, { currentPassword, newPassword });

  await assert.rejects(change("incorrecta", "una-contraseña-larga"), ValidationError);
  await assert.rejects(change(PASSWORD, "corta"), ValidationError);
  await assert.rejects(change(PASSWORD, PASSWORD), ValidationError);
});

test("el link de recupero sirve una sola vez y cierra todas las sesiones", async () => {
  const user = await createUser();
  const { token: sessionToken } = await signIn(user);
  const { token } = await requestPasswordReset(db, user.email);

  await resetPassword(db, { token, password: "contraseña-nueva-1" });
  assert.equal(await getSession(db, sessionToken), null);
  assert.ok(await signIn(user, "contraseña-nueva-1"));

  await assert.rejects(resetPassword(db, { token, password: "contraseña-nueva-2" }), ValidationError);
});

test("el link de recupero vencido no sirve, y pedir otro invalida el anterior", async () => {
  const user = await createUser();
  const first = await requestPasswordReset(db, user.email);
  const second = await requestPasswordReset(db, user.email);
  await assert.rejects(resetPassword(db, { token: first.token, password: "contraseña-nueva-1" }), ValidationError);

  await db.query("update password_resets set expires_at = now() - interval '1 second' where user_id = $1", [user.id]);
  await assert.rejects(resetPassword(db, { token: second.token, password: "contraseña-nueva-1" }), ValidationError);
});

test("el recupero no revela si el email existe y limita los pedidos por hora", async () => {
  assert.equal(await requestPasswordReset(db, `${unique()}@example.com`), null);

  const user = await createUser();
  for (let i = 0; i < 3; i++) assert.ok(await requestPasswordReset(db, user.email));
  assert.equal(await requestPasswordReset(db, user.email), null);
});

test("un cliente no puede usar ninguna operación de admin, ni sobre su propia organización", async () => {
  const { session, organization, userId } = await createClientWithMember();
  const other = await createClient();

  const attempts = [
    () => listOrganizations(db, session),
    () => getOrganization(db, session, other.id),
    () => getOrganization(db, session, organization.id),
    () => createOrganization(db, session, { name: "X", slug: `x-${unique()}`, commissionPercent: "0" }),
    () => updateOrganization(db, session, other.id, { name: "Hackeado" }),
    () => setCommission(db, session, organization.id, "0"),
    () => setOrganizationSuspended(db, session, other.id, true),
    () => createMember(db, session, { organizationId: other.id, email: `${unique()}@example.com` }),
    () => resetMemberPassword(db, session, userId),
    () => setMemberDisabled(db, session, userId, false),
    () => startImpersonation(db, session, other.id),
    () => stopImpersonation(db, session),
    () => listAudit(db, session),
  ];
  for (const attempt of attempts) await assert.rejects(attempt(), ForbiddenError);

  const { rows: [row] } = await db.query("select commission_percent, name from organizations where id = $1", [
    organization.id,
  ]);
  assert.equal(Number(row.commission_percent), 5);
});

test("sin sesión tampoco se puede usar ninguna operación de admin", async () => {
  await assert.rejects(listOrganizations(db, null), ForbiddenError);
  await assert.rejects(listAudit(db, undefined), ForbiddenError);
});

test("cada usuario resuelve solo su organización, aunque su sesión diga otra", async () => {
  const first = await createClientWithMember();
  const second = await createClientWithMember();

  assert.equal((await resolveTenant(db, first.session)).organization.id, first.organization.id);
  assert.equal((await resolveTenant(db, second.session)).organization.id, second.organization.id);

  // Ni tocando la sesión en la base: acting_organization_id solo vale para admins.
  await db.query("update sessions set acting_organization_id = $1 where token_hash = $2", [
    second.organization.id,
    first.session.tokenHash,
  ]);
  const tampered = await getSession(db, first.token);
  assert.equal((await resolveTenant(db, tampered)).organization.id, first.organization.id);
});

test("un admin solo entra a una organización con ver como cliente, y queda en la auditoría", async () => {
  const { session } = await signIn(await createUser({ isPlatformAdmin: true }));
  const { token } = await signIn({ email: session.email });
  assert.equal(await resolveTenant(db, session), null);

  const organization = await createClient();
  const signedIn = await getSession(db, token);
  await startImpersonation(db, signedIn, organization.id);

  const acting = await getSession(db, token);
  const tenant = await resolveTenant(db, acting);
  assert.equal(tenant.organization.id, organization.id);
  assert.equal(tenant.impersonating, true);

  await stopImpersonation(db, acting);
  assert.equal(await resolveTenant(db, await getSession(db, token)), null);

  const { rows } = await db.query(
    "select action, actor_email from audit_log where organization_id = $1 order by id",
    [organization.id],
  );
  const actions = rows.filter((r) => r.actor_email === session.email).map((r) => r.action);
  assert.deepEqual(actions, ["impersonation.started", "impersonation.stopped"]);
});

test("desactivar un usuario corta su sesión y su login; reactivarlo lo deja entrar", async () => {
  const { email, userId, token, temporaryPassword } = await createClientWithMember();

  await setMemberDisabled(db, admin, userId, true);
  assert.equal(await getSession(db, token), null);
  await assert.rejects(login(db, { email, password: temporaryPassword, ip: ip() }), InvalidCredentialsError);

  await setMemberDisabled(db, admin, userId, false);
  assert.ok(await signIn({ email }, temporaryPassword));
});

test("resetear la contraseña corta la sesión y obliga a cambiarla otra vez", async () => {
  const { email, userId, token, temporaryPassword } = await createClientWithMember();

  const reset = await resetMemberPassword(db, admin, userId);
  assert.equal(await getSession(db, token), null);
  await assert.rejects(login(db, { email, password: temporaryPassword, ip: ip() }), InvalidCredentialsError);

  const { session } = await signIn({ email }, reset.temporaryPassword);
  assert.equal(session.mustChangePassword, true);
});

test("desde el panel no se puede tocar a otro admin de Palco", async () => {
  const other = await createUser({ isPlatformAdmin: true });
  await assert.rejects(resetMemberPassword(db, admin, other.id), ValidationError);
  await assert.rejects(setMemberDisabled(db, admin, other.id, true), ValidationError);
});

test("el slug se valida: formato, reservados y repetidos", async () => {
  const create = (slug) => createOrganization(db, admin, { name: "X", slug, commissionPercent: "0" });
  for (const slug of ["Con Espacios", "-guion", "dashboard", "www", ""]) {
    await assert.rejects(create(slug), ValidationError, slug);
  }
  const { slug } = await createClient();
  await assert.rejects(create(slug), /Ya hay un cliente/);
});

test("la comisión se valida y su cambio queda en la auditoría", async () => {
  const { id } = await createClient();
  for (const value of ["-1", "101", "abc", ""]) {
    await assert.rejects(setCommission(db, admin, id, value), ValidationError, value);
  }

  await setCommission(db, admin, id, "7,5");
  const organization = await getOrganization(db, admin, id);
  assert.equal(Number(organization.commissionPercent), 7.5);

  const { rows: [entry] } = await db.query(
    "select details from audit_log where organization_id = $1 and action = 'organization.commission_changed'",
    [id],
  );
  assert.deepEqual(entry.details, { from: 5, to: 7.5 });
});

test("suspender y reactivar queda reflejado en la organización del cliente", async () => {
  const { session, organization } = await createClientWithMember();

  await setOrganizationSuspended(db, admin, organization.id, true);
  assert.ok((await resolveTenant(db, session)).organization.suspendedAt);

  await setOrganizationSuspended(db, admin, organization.id, false);
  assert.equal((await resolveTenant(db, session)).organization.suspendedAt, null);
});

test("la búsqueda de clientes filtra por nombre y trata los comodines como texto", async () => {
  const tag = unique();
  const id = await createOrganization(db, admin, {
    name: `Teatro ${tag}`,
    slug: `teatro-${tag}`,
    commissionPercent: "5",
  });
  createdOrganizations.push(id);

  assert.deepEqual((await listOrganizations(db, admin, { query: tag })).map((o) => o.id), [id]);
  assert.equal((await listOrganizations(db, admin, { query: `${tag}%` })).length, 0);
});
