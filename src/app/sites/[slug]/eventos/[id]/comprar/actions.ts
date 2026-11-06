"use server";

import { redirect } from "next/navigation";
import { getDb } from "@backend/db.mjs";
import { ValidationError } from "@backend/auth.mjs";
import { startOrder, TicketsUnavailableError } from "@backend/checkout.mjs";
import { checkoutEnabled } from "@/lib/checkout";
import { clientIp } from "@/lib/dashboard/session";

export type CheckoutState = { error?: string; attempt?: number };

const field = (data: FormData, name: string) => String(data.get(name) ?? "");

export async function startOrderAction(state: CheckoutState, data: FormData): Promise<CheckoutState> {
  if (!checkoutEnabled) return { error: "La venta todavía no está abierta" };

  let token: string;
  try {
    token = await startOrder(getDb(), {
      performanceId: field(data, "performanceId"),
      seatIds: JSON.parse(field(data, "seatIds") || "[]"),
      general: JSON.parse(field(data, "general") || "[]"),
      buyerName: field(data, "buyerName"),
      buyerEmail: field(data, "buyerEmail"),
      ip: await clientIp(),
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof TicketsUnavailableError) {
      return { error: error.message, attempt: (state.attempt ?? 0) + 1 };
    }
    throw error;
  }
  redirect(`/compra/${token}`);
}
