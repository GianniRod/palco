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
      // Solo en entradas vendidas; las de prueba de Puerta no los tienen.
      sold: { eventTitle: string; sector: string; row: string | null; seat: number | null; startsAt: string; orderCount: number } | null;
    }
  | { result: "invalid"; reason: string };

type Scan =
  | { result: "invalid"; reason: string }
  | {
      result: "valid" | "duplicate";
      ticket: {
        number?: number;
        label?: string;
        holder: string;
        checkedInAt: Date | null;
        checkedInBy: string | null;
        eventTitle?: string;
        sector?: string;
        row?: string | null;
        seat?: number | null;
        startsAt?: Date;
        orderCount?: number;
      };
    };

// Lo llama el escáner del celular con el texto leído del QR. El permiso se chequea en scanTicket:
// admins de Nightowl → cualquier cliente; usuario con permiso → solo los eventos de su cliente.
// eventId: el evento elegido en la pantalla del escáner (vacío = cualquiera, solo admins).
export async function scanCodeAction(code: string, eventId: string | null = null): Promise<ScanResult> {
  const session = await requireSession();
  let scan: Scan;
  try {
    scan = (await scanTicket(getDb(), session, String(code ?? "").slice(0, 300), eventId ? String(eventId).slice(0, 40) : null)) as Scan;
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
    sold: ticket.sector && ticket.startsAt
      ? {
          eventTitle: ticket.eventTitle ?? "",
          sector: ticket.sector,
          row: ticket.row ?? null,
          seat: ticket.seat ?? null,
          startsAt: new Date(ticket.startsAt).toISOString(),
          orderCount: ticket.orderCount ?? 1,
        }
      : null,
  };
}
