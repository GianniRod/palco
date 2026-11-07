// PAGO-PRUEBA-ADMIN: temporal. Se saca antes de publicar (pasos en logsloren.md).
//
// Deja a un admin de Nightowl dar por pagada una orden sin pasar por Mercado Pago, también en producción.
// La sesión del panel no llega a las páginas de los clientes (cookie __Host-), así que el panel entrega
// un permiso aparte que solo sirve para esto: "usuario.vencimiento.firma". Se firma con el hash de la
// contraseña del admin, que no sale de la base: al cambiarla, el permiso deja de valer.
import { createHmac, timingSafeEqual } from "node:crypto";
import { recordAudit, ValidationError } from "./auth.mjs";
import { confirmPayment, getOrderByToken } from "./checkout.mjs";

export const TEST_PAY_HOURS = 12;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findAdmin(db, userId) {
  const { rows: [admin] } = await db.query(
    `select id, email, password_hash from users
     where id = $1 and is_platform_admin and disabled_at is null`,
    [userId],
  );
  return admin ?? null;
}

const sign = (admin, expires) =>
  createHmac("sha256", admin.password_hash).update(`pago-prueba:${admin.id}:${expires}`).digest("base64url");

export async function createTestPayPass(db, userId, now = Date.now()) {
  const admin = await findAdmin(db, userId);
  if (!admin) throw new ValidationError("Solo un admin puede activar el pago de prueba");
  const expires = now + TEST_PAY_HOURS * 60 * 60 * 1000;
  return `${admin.id}.${expires}.${sign(admin, expires)}`;
}

// El admin dueño del permiso, o null si el permiso no vale. Mira la base cada vez: un admin
// desactivado deja de poder usarlo en el momento.
export async function verifyTestPayPass(db, pass, now = Date.now()) {
  const [userId, expires, signature, ...rest] = String(pass ?? "").split(".");
  if (rest.length > 0 || !signature || !UUID.test(userId) || !/^\d+$/.test(expires) || Number(expires) <= now) return null;
  const admin = await findAdmin(db, userId);
  if (!admin) return null;
  const expected = Buffer.from(sign(admin, expires));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { userId: admin.id, email: admin.email };
}

export async function payWithTestPass(db, pass, slug, token) {
  const admin = await verifyTestPayPass(db, pass);
  if (!admin) throw new ValidationError("El pago de prueba no está disponible");
  const order = await getOrderByToken(db, slug, token);
  if (!order) throw new ValidationError("No encontramos esa orden");
  if (order.status === "expired") throw new ValidationError("La reserva venció. Volvé a elegir tus entradas");
  if (order.status !== "pending") return order.status;
  const status = await confirmPayment(db, {
    orderId: order.id,
    provider: "prueba_admin",
    reference: `prueba-${order.id}`,
    amount: order.amountDue,
  });
  await recordAudit(db, {
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "order.test_paid",
    details: { orderId: order.id, slug, status },
  });
  return status;
}
