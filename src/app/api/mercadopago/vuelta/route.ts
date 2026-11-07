import { after, type NextRequest } from "next/server";
import { getDb } from "@backend/db.mjs";
import { getOrderByToken } from "@backend/checkout.mjs";
import { applyMercadoPagoOrder, applyPayment, getMercadoPagoOrder, getPayment, isMercadoPagoOrderId } from "@backend/mercadopago.mjs";
import { siteSlugFromHost } from "@/lib/dashboard/config";
import { sendTicketsOnce } from "@/lib/payments";

// El comprador vuelve de Mercado Pago a la web del cliente. Si trae un pago, se consulta y se
// confirma acá mismo: así ve sus entradas aunque el webhook se atrase (o no llegue, como en local).
// Lo que dice la URL no se cree: solo sirve para saber qué pago consultar.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token = params.get("token") ?? "";
  const forwarded = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const slug = siteSlugFromHost(forwarded.split(",")[0].trim().split(":")[0].toLowerCase());
  if (!slug || !token) return new Response(null, { status: 404 });

  const db = getDb();
  const order = await getOrderByToken(db, slug, token);
  if (!order) return new Response(null, { status: 404 });

  let notice = "";
  // Con Orders API vuelve order_id (ORD…); con preferencias, solo payment_id.
  const mpOrderId = params.get("order_id");
  const paymentId = params.get("payment_id");
  const reference = isMercadoPagoOrderId(mpOrderId) ? mpOrderId : paymentId && /^\d+$/.test(paymentId) ? paymentId : null;
  if (reference && order.status !== "paid") {
    try {
      if (reference === mpOrderId) {
        const mpOrder = await getMercadoPagoOrder(mpOrderId);
        if (mpOrder.external_reference === order.id) {
          const status = await applyMercadoPagoOrder(db, mpOrder);
          if (status === "paid") after(() => sendTicketsOnce(slug, token));
          if (mpOrder.status === "failed") notice = "rechazado";
        }
      } else {
        const payment = await getPayment(reference);
        if (payment.external_reference === order.id) {
          const status = await applyPayment(db, payment);
          if (status === "paid") after(() => sendTicketsOnce(slug, token));
          if (payment.status === "rejected") notice = "rechazado";
        }
      }
    } catch (error) {
      // Si Mercado Pago no responde, el webhook lo confirma después.
      console.error("[mercadopago] No se pudo consultar el pago al volver", reference, error);
      notice = "confirmando";
    }
  }

  // Relativa: el navegador se queda en el dominio del cliente.
  const location = `/compra/${encodeURIComponent(token)}${notice ? `?pago=${notice}` : ""}`;
  return new Response(null, { status: 303, headers: { Location: location } });
}
