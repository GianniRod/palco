// Cobro con Mercado Pago (Checkout Pro).
// Etapa 1: todas las ventas se cobran con el token de Nightowl (MP_ACCESS_TOKEN, de prueba).
// Etapa 2: cada cliente conecta su cuenta por OAuth y se cobra con su token + marketplace_fee.
// Nada de acá emite entradas por su cuenta: lo aprobado pasa por confirmPayment.
import { createHmac, timingSafeEqual } from "node:crypto";
import { ValidationError } from "./auth.mjs";
import { confirmPayment, getOrderByToken } from "./checkout.mjs";

const API = "https://api.mercadopago.com";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class MercadoPagoError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "MercadoPagoError";
    this.status = status;
  }
}

export const isMercadoPagoConfigured = (env = process.env) => Boolean(env.MP_ACCESS_TOKEN);

// Etapa 1: un solo token para todos. En la etapa 2 esto busca el de la cuenta conectada del cliente.
function accessTokenFor(env) {
  const token = env.MP_ACCESS_TOKEN;
  if (!token) throw new ValidationError("El cobro con Mercado Pago no está configurado");
  return token;
}

async function mpFetch(path, { env, fetchImpl = fetch, method = "GET", body, idempotencyKey } = {}) {
  const res = await fetchImpl(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessTokenFor(env)}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new MercadoPagoError(`Mercado Pago respondió ${res.status}: ${data?.message ?? "sin detalle"}`, res.status);
  }
  return data;
}

// Mercado Pago no acepta localhost en notification_url ni auto_return con URLs que no sean https.
const isPublicHttps = (url) => /^https:\/\//.test(url) && !/^https:\/\/[^/]*localhost/.test(url);

// Crea la preferencia de una orden pendiente y devuelve el link de pago.
// siteUrl: la web del cliente (ahí vuelve el comprador). apiUrl: donde vive /api (webhook y vuelta).
export async function createPreference(db, slug, token, { siteUrl, apiUrl, siteName }, env = process.env, fetchImpl = fetch) {
  const order = await getOrderByToken(db, slug, token);
  if (!order) throw new ValidationError("No encontramos esa orden");
  if (order.status === "expired") throw new ValidationError("La reserva venció. Volvé a elegir tus entradas");
  if (order.status !== "pending") throw new ValidationError("Esta orden ya no se puede pagar");

  // La vuelta pasa por /api en el mismo dominio del cliente: confirma el pago y redirige a la orden.
  const back = `${siteUrl}/api/mercadopago/vuelta?token=${encodeURIComponent(token)}`;
  // source_news=webhooks: solo avisos nuevos (firmados), sin los IPN viejos duplicados.
  const notification = `${apiUrl}/api/webhooks/mercadopago?source_news=webhooks`;
  const count = order.items.length;

  const preference = await mpFetch("/checkout/preferences", {
    env,
    fetchImpl,
    method: "POST",
    idempotencyKey: `pref-${order.id}-${new Date(order.expiresAt).getTime()}`,
    body: {
      items: [
        {
          id: order.id,
          title: `${count} ${count === 1 ? "entrada" : "entradas"} · ${order.title}`.slice(0, 250),
          quantity: 1,
          // Entradas más comisión: es el monto que exige confirmPayment.
          unit_price: order.amountDue,
          currency_id: "ARS",
        },
      ],
      payer: { email: order.buyerEmail, name: order.buyerName },
      external_reference: order.id,
      back_urls: { success: back, failure: back, pending: back },
      ...(isPublicHttps(back) ? { auto_return: "approved" } : {}),
      ...(isPublicHttps(notification) ? { notification_url: notification } : {}),
      // Aprobado o rechazado al instante: nada de pagos "en proceso" que lleguen con la reserva vencida.
      binary_mode: true,
      expires: true,
      expiration_date_to: new Date(order.expiresAt).toISOString(),
      // Rapipago, Pago Fácil y cajeros tardan días; la reserva dura 10 minutos.
      payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }], installments: 12 },
      statement_descriptor: String(siteName ?? "").replace(/[^A-Za-z0-9 ]/g, "").slice(0, 22) || undefined,
    },
  });
  return preference.init_point;
}

export async function getPayment(paymentId, env = process.env, fetchImpl = fetch) {
  if (!/^\d+$/.test(String(paymentId))) throw new ValidationError("Pago no válido");
  return mpFetch(`/v1/payments/${paymentId}`, { env, fetchImpl });
}

// Aplica un pago ya consultado a Mercado Pago (nunca lo que dice el aviso o la URL).
// Devuelve el estado de la orden si el pago está aprobado; null si no corresponde hacer nada.
export async function applyPayment(db, payment) {
  const orderId = String(payment?.external_reference ?? "");
  if (!UUID.test(orderId)) return null;
  if (payment.status !== "approved" || payment.currency_id !== "ARS") return null;
  return confirmPayment(db, {
    orderId,
    provider: "mercadopago",
    reference: String(payment.id),
    amount: payment.transaction_amount,
  });
}

// Marca que el mail con las entradas ya salió. true solo para el primero que llega.
export async function claimTicketsEmail(db, orderId) {
  const { rowCount } = await db.query(
    "update orders set tickets_emailed_at = now() where id = $1 and status = 'paid' and tickets_emailed_at is null",
    [orderId],
  );
  return rowCount === 1;
}

// Firma de los webhooks, igual que WebhookSignatureValidator del SDK oficial:
// HMAC-SHA256 (hex) de "id:{data.id};request-id:{x-request-id};ts:{ts};" con la clave secreta.
// Sin ventana de tiempo: repetir un aviso viejo no hace daño, porque el pago se vuelve a consultar
// a Mercado Pago y confirmPayment ignora lo ya confirmado.
export function isValidWebhookSignature({ xSignature, xRequestId, dataId, secret }) {
  if (!xSignature || !secret) return false;
  let ts;
  let v1;
  for (const part of String(xSignature).split(",")) {
    const [key, ...rest] = part.split("=");
    const value = rest.join("=").trim();
    if (key.trim().toLowerCase() === "ts") ts = value;
    if (key.trim().toLowerCase() === "v1") v1 = value;
  }
  if (!ts || !/^\d+$/.test(ts) || !v1) return false;

  const parts = [];
  if (dataId) parts.push(`id:${String(dataId).trim()}`);
  if (xRequestId) parts.push(`request-id:${String(xRequestId).trim()}`);
  parts.push(`ts:${ts}`);
  const expected = createHmac("sha256", secret).update(`${parts.join(";")};`).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

// El link de una orden, para mandar el mail desde el webhook (que solo conoce el id).
export async function getOrderLink(db, orderId) {
  if (!UUID.test(String(orderId))) return null;
  const { rows: [row] } = await db.query(
    `select orders.access_token as token, organizations.slug
     from orders
     join performances on performances.id = orders.performance_id
     join events on events.id = performances.event_id
     join organizations on organizations.id = events.organization_id
     where orders.id = $1`,
    [orderId],
  );
  return row ?? null;
}
