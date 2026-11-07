"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getDb } from "@backend/db.mjs";
import { ValidationError } from "@backend/auth.mjs";
import { cancelOrder, simulatePayment } from "@backend/checkout.mjs";
import { createCheckout, isMercadoPagoConfigured, MercadoPagoError } from "@backend/mercadopago.mjs";
import { getPublicSiteContent } from "@backend/sites.mjs";
import { publicSiteUrl } from "@/lib/dashboard/config";
import { paymentsApiUrl, sendTicketsOnce } from "@/lib/payments";
import { payWithTestPass } from "@backend/test-payment.mjs";
import { readTestPayPass } from "@/lib/test-pay";

export type PayState = { error?: string };

const field = (data: FormData, name: string) => String(data.get(name) ?? "");
const refresh = () => revalidatePath("/sites/[slug]/compra/[token]", "page");

export async function payAction(_: PayState, data: FormData): Promise<PayState> {
  const slug = field(data, "slug");
  const token = field(data, "token");
  const db = getDb();

  // Con MP_ACCESS_TOKEN se cobra con Mercado Pago; sin él (solo en desarrollo), el pago simulado.
  if (isMercadoPagoConfigured()) {
    let url: string;
    try {
      const site = await getPublicSiteContent(db, slug);
      url = await createCheckout(db, slug, token, {
        siteUrl: publicSiteUrl(slug),
        apiUrl: paymentsApiUrl(slug),
        siteName: site?.displayName,
      });
    } catch (error) {
      if (error instanceof ValidationError) return { error: error.message };
      if (error instanceof MercadoPagoError) {
        console.error("[mercadopago] No se pudo crear el cobro", error.message);
        return { error: "No pudimos conectar con Mercado Pago. Probá de nuevo en un momento" };
      }
      throw error;
    }
    redirect(url);
  }

  try {
    const status = await simulatePayment(db, slug, token);
    if (status === "paid") after(() => sendTicketsOnce(slug, token));
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    throw error;
  }
  refresh();
  return {};
}

// PAGO-PRUEBA-ADMIN: temporal. Da la orden por pagada sin cobrar, solo con el permiso de un admin.
export async function testPayAction(_: PayState, data: FormData): Promise<PayState> {
  const slug = field(data, "slug");
  const token = field(data, "token");
  try {
    const status = await payWithTestPass(getDb(), await readTestPayPass(), slug, token);
    if (status === "paid") after(() => sendTicketsOnce(slug, token));
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    throw error;
  }
  refresh();
  return {};
}

export async function cancelAction(data: FormData) {
  await cancelOrder(getDb(), field(data, "slug"), field(data, "token"));
  refresh();
}
