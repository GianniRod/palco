"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getDb } from "@backend/db.mjs";
import { ValidationError } from "@backend/auth.mjs";
import { cancelOrder, getOrderByToken, simulatePayment } from "@backend/checkout.mjs";
import { getPublicSiteContent } from "@backend/sites.mjs";
import { publicSiteUrl } from "@/lib/dashboard/config";
import { sendTicketsEmail } from "@/lib/dashboard/email";

export type PayState = { error?: string };
type Item = { sector: string; row: string | null; number: number | null };

const dateFormat = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Argentina/Buenos_Aires",
});

const field = (data: FormData, name: string) => String(data.get(name) ?? "");
const refresh = () => revalidatePath("/sites/[slug]/compra/[token]", "page");

export async function payAction(_: PayState, data: FormData): Promise<PayState> {
  const slug = field(data, "slug");
  const token = field(data, "token");
  const db = getDb();
  try {
    const status = await simulatePayment(db, slug, token);
    if (status === "paid") {
      after(async () => {
        const [order, site] = await Promise.all([getOrderByToken(db, slug, token), getPublicSiteContent(db, slug)]);
        if (!order || !site) return;
        await sendTicketsEmail(order.buyerEmail, {
          buyerName: order.buyerName,
          siteName: site.displayName,
          title: order.title,
          date: dateFormat.format(new Date(order.startsAt)),
          venue: order.address ? `${order.venue} · ${order.address}` : order.venue,
          tickets: order.items.map((item: Item) => (item.row ? `${item.sector}, fila ${item.row}, butaca ${item.number}` : `${item.sector}, ubicación general`)),
          link: `${publicSiteUrl(slug)}/compra/${token}`,
        });
      });
    }
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
