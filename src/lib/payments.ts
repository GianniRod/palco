import "server-only";
import { getDb } from "@backend/db.mjs";
import { getOrderByToken } from "@backend/checkout.mjs";
import { claimTicketsEmail } from "@backend/mercadopago.mjs";
import { getPublicSite } from "@backend/sites.mjs";
import { publicSiteUrl } from "@/lib/dashboard/config";
import { sendTicketsEmail } from "@/lib/dashboard/email";

// Donde Mercado Pago manda los avisos de pago. Fuera de producción no hay URL pública
// (salvo un túnel en MP_WEBHOOK_BASE_URL): el pago se confirma cuando vuelve el comprador.
export function paymentsApiUrl(slug: string) {
  if (process.env.MP_WEBHOOK_BASE_URL) return process.env.MP_WEBHOOK_BASE_URL.replace(/\/$/, "");
  return process.env.NODE_ENV === "production" ? "https://www.palcotickets.com" : publicSiteUrl(slug);
}

// Manda el mail con las entradas una sola vez, lo pida quien lo pida (webhook, vuelta o pago de prueba).
export async function sendTicketsOnce(slug: string, token: string) {
  const db = getDb();
  const order = await getOrderByToken(db, slug, token);
  if (!order || order.status !== "paid") return;
  if (!(await claimTicketsEmail(db, order.id))) return;
  const site = await getPublicSite(db, slug);
  await sendTicketsEmail(order.buyerEmail, {
    title: order.title,
    siteName: site?.content.displayName ?? "",
    link: `${publicSiteUrl(slug)}/compra/${token}`,
  });
}
