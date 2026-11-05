"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@backend/db.mjs";
import { createTestTickets, deleteTestTickets, QrError, resetTestTickets, scanTicket } from "@backend/qr.mjs";
import { requireAdmin } from "@/lib/dashboard/session";

export type TestTicketFormState = { error?: string };

export type ScanResult =
  | { result: "valid" | "duplicate"; number: number; holder: string; checkedInAt: string | null; checkedInBy: string | null }
  | { result: "invalid"; reason: string };

const refresh = () => revalidatePath("/dashboard/admin/puerta");

export async function createTestTicketsAction(_: TestTicketFormState, data: FormData): Promise<TestTicketFormState> {
  const actor = await requireAdmin();
  try {
    await createTestTickets(getDb(), actor, {
      count: Number(data.get("count") ?? 1),
      holder: String(data.get("holder") ?? ""),
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

// Lo llama el escáner del celular con el texto leído del QR.
export async function scanCodeAction(code: string): Promise<ScanResult> {
  const actor = await requireAdmin();
  type Scan =
    | { result: "invalid"; reason: string }
    | {
        result: "valid" | "duplicate";
        ticket: { number: number; holder: string; checkedInAt: Date | null; checkedInBy: string | null };
      };
  const scan = (await scanTicket(getDb(), actor, String(code ?? "").slice(0, 300))) as Scan;
  refresh();
  if (scan.result === "invalid") return { result: "invalid", reason: scan.reason };
  const { ticket } = scan;
  return {
    result: scan.result,
    number: ticket.number,
    holder: ticket.holder,
    checkedInAt: ticket.checkedInAt ? new Date(ticket.checkedInAt).toISOString() : null,
    checkedInBy: ticket.checkedInBy ?? null,
  };
}
