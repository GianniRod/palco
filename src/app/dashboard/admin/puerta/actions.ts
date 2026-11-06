"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@backend/db.mjs";
import { createTestTickets, deleteTestTickets, QrError, resetTestTickets } from "@backend/qr.mjs";
import { requireAdmin } from "@/lib/dashboard/session";

export type TestTicketFormState = { error?: string };

const refresh = () => revalidatePath("/dashboard/admin/puerta");

export async function createTestTicketsAction(_: TestTicketFormState, data: FormData): Promise<TestTicketFormState> {
  const actor = await requireAdmin();
  try {
    await createTestTickets(getDb(), actor, {
      count: Number(data.get("count") ?? 1),
      holder: String(data.get("holder") ?? ""),
      organizationId: String(data.get("organizationId") ?? "") || null,
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

export async function deleteTestTicketsAction() {
  const actor = await requireAdmin();
  await deleteTestTickets(getDb(), actor);
  refresh();
}
