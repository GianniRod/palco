"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getDb } from "@backend/db.mjs";
import { ValidationError } from "@backend/auth.mjs";
import { cancelOrder, simulatePayment } from "@backend/checkout.mjs";
import { createPreference, isMercadoPagoConfigured, MercadoPagoError } from "@backend/mercadopago.mjs";
import { getPublicSite } from "@backend/sites.mjs";
import { publicSiteUrl } from "@/lib/dashboard/config";
import { paymentsApiUrl, sendTicketsOnce } from "@/lib/payments";

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
      const site = await getPublicSite(db, slug);
      url = await createPreference(db, slug, token, {
        siteUrl: publicSiteUrl(slug),
        apiUrl: paymentsApiUrl(slug),
        siteName: site?.content.displayName,
      });
    } catch (error) {
      if (error instanceof ValidationError) return { error: error.message };
      if (error instanceof MercadoPagoError) {
        console.error("[mercadopago] No se pudo crear la preferencia", error.message);
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

export async function cancelAction(data: FormData) {
  await cancelOrder(getDb(), field(data, "slug"), field(data, "token"));
  refresh();
}
