"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@backend/db.mjs";
import { createTestTickets, deleteTestTickets, QrError, resetTestTickets } from "@backend/qr.mjs";
import { createTestPayPass } from "@backend/test-payment.mjs";
import { requireAdmin } from "@/lib/dashboard/session";
import { clearTestPayPass, saveTestPayPass } from "@/lib/test-pay";

export type TestTicketFormState = { error?: string };

const refresh = () => revalidatePath("/dashboard/admin/puerta");

export async function createTestTicketsAction(_: TestTicketFormState, data: FormData): Promise<TestTicketFormState> {
  const actor = await requireAdmin();
  try {
    await createTestTickets(getDb(), actor, {
      count: Number(data.get("count") ?? 1),
      holder: String(data.get("holder") ?? ""),
      eventId: String(data.get("eventId") ?? "") || null,
    });
  } catch (error) {
    if (error instanceof QrError) return { error: error.message };
    throw error;
  }
  refresh();
  return {};
}

export async function resetTestTicketsAction() {
  const actor = await requireAdmin();
  await resetTestTickets(getDb(), actor);
  refresh();
}

// PAGO-PRUEBA-ADMIN: temporal.
export async function activateTestPayAction() {
  const actor = await requireAdmin();
  await saveTestPayPass(await createTestPayPass(getDb(), actor.userId));
  refresh();
}

export async function deactivateTestPayAction() {
  await requireAdmin();
  await clearTestPayPass();
  refresh();
}

export async function deleteTestTicketsAction() {
  const actor = await requireAdmin();
  await deleteTestTickets(getDb(), actor);
  refresh();
}
