import { after, type NextRequest } from "next/server";
import { getDb } from "@backend/db.mjs";
import {
  applyMercadoPagoOrder,
  applyPayment,
  getMercadoPagoOrder,
  getOrderLink,
  getPayment,
  isMercadoPagoOrderId,
  isValidWebhookSignature,
} from "@backend/mercadopago.mjs";
import { sendTicketsOnce } from "@/lib/payments";

// Avisos de Mercado Pago. El aviso solo dice "cambió el pago X" (preferencias, tema "payment") o
// "cambió la order X" (Orders API, tema "order"): el recurso se consulta a Mercado Pago y lo aprobado
// pasa por confirmPayment, que ignora lo ya confirmado. Responder rápido (espera 22 s); un error
// devuelve 500 y Mercado Pago reintenta.
export async function POST(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const body = await request.json().catch(() => null);
  const type = params.get("type") ?? body?.type;
  const dataId = params.get("data.id") ?? body?.data?.id;

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret || process.env.NODE_ENV === "production") {
    const valid = isValidWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId: params.get("data.id"),
      secret,
    });
    if (!valid) {
      console.warn("[mercadopago] Aviso con firma inválida", request.headers.get("x-request-id"));
      return new Response(null, { status: 401 });
    }
  }

  if (!dataId) return new Response(null, { status: 200 });
  const isOrder = type === "order" && isMercadoPagoOrderId(dataId);
  if (type !== "payment" && !isOrder) return new Response(null, { status: 200 });

  const db = getDb();
  try {
    let status: string | null;
    let orderId: string;
    if (isOrder) {
      const mpOrder = await getMercadoPagoOrder(dataId);
      status = await applyMercadoPagoOrder(db, mpOrder);
      orderId = mpOrder.external_reference;
    } else {
      const payment = await getPayment(dataId);
      status = await applyPayment(db, payment);
      orderId = payment.external_reference;
    }
    if (status === "paid") {
      const link = await getOrderLink(db, orderId);
      if (link) after(() => sendTicketsOnce(link.slug, link.token));
    }
    if (status === "refund_pending") {
      console.warn("[mercadopago] Pago tardío sin lugar, hay que devolverlo", dataId);
    }
  } catch (error) {
    console.error("[mercadopago] No se pudo procesar el aviso", dataId, error);
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 200 });
}
