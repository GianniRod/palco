"use server";

import { getDb } from "@backend/db.mjs";
import { QrError, scanTicket } from "@backend/qr.mjs";
import { requireSession } from "@/lib/dashboard/session";

export type ScanResult =
  | {
      result: "valid" | "duplicate";
      number: number | null;
      label: string | null;
      holder: string;
      checkedInAt: string | null;
      checkedInBy: string | null;
    }
  | { result: "invalid"; reason: string };

type Scan =
  | { result: "invalid"; reason: string }
  | {
      result: "valid" | "duplicate";
      ticket: { number?: number; label?: string; holder: string; checkedInAt: Date | null; checkedInBy: string | null };
    };

// Lo llama el escáner del celular con el texto leído del QR. El permiso se chequea en scanTicket:
// admins de Nightowl → cualquier cliente; usuario con permiso → solo los eventos de su cliente.
export async function scanCodeAction(code: string): Promise<ScanResult> {
  const session = await requireSession();
  let scan: Scan;
  try {
    scan = (await scanTicket(getDb(), session, String(code ?? "").slice(0, 300))) as Scan;
  } catch (error) {
    if (error instanceof QrError) return { result: "invalid", reason: error.message };
    throw error;
  }
  if (scan.result === "invalid") return { result: "invalid", reason: scan.reason };
  const { ticket } = scan;
  return {
    result: scan.result,
    number: ticket.number ?? null,
    label: ticket.label ?? null,
    holder: ticket.holder,
    checkedInAt: ticket.checkedInAt ? new Date(ticket.checkedInAt).toISOString() : null,
    checkedInBy: ticket.checkedInBy ?? null,
  };
}
