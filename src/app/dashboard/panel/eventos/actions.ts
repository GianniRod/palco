"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@backend/db.mjs";
import { ValidationError } from "@backend/auth.mjs";
import {
  addPerformance,
  createEvent,
  publishEvent,
  refreshEventMap,
  removePerformance,
  savePricing,
  setEventStatus,
  setSeatsBlocked,
  updateEventDetails,
} from "@backend/events.mjs";
import { requireEditor } from "@/lib/dashboard/session";

export type EventFormState = { error?: string; saved?: boolean; message?: string };

const field = (data: FormData, name: string) => String(data.get(name) ?? "");
const refresh = () => revalidatePath("/dashboard/panel", "layout");

// La organización sale siempre de la sesión. Un error de validación vuelve como mensaje al formulario.
async function attempt(run: (tenant: Awaited<ReturnType<typeof requireEditor>>) => Promise<string | void>): Promise<EventFormState> {
  const tenant = await requireEditor();
  try {
    const message = await run(tenant);
    refresh();
    return { saved: true, message: message ?? undefined };
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    throw error;
  }
}

const details = (data: FormData) => ({
  title: field(data, "title"),
  description: field(data, "description"),
  image: field(data, "image"),
});

export async function createEventAction(_: EventFormState, data: FormData): Promise<EventFormState> {
  const tenant = await requireEditor();
  let id: string;
  try {
    id = await createEvent(getDb(), tenant, {
      ...details(data),
      venueId: field(data, "venueId"),
      startsAt: field(data, "startsAt"),
    });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    throw error;
  }
  refresh();
  redirect(`/panel/eventos/${id}`);
}

export async function updateDetailsAction(_: EventFormState, data: FormData): Promise<EventFormState> {
  return attempt((tenant) => updateEventDetails(getDb(), tenant, field(data, "id"), details(data)));
}

export async function addPerformanceAction(_: EventFormState, data: FormData): Promise<EventFormState> {
  return attempt((tenant) => addPerformance(getDb(), tenant, field(data, "id"), field(data, "startsAt")));
}

export async function removePerformanceAction(_: EventFormState, data: FormData): Promise<EventFormState> {
  return attempt((tenant) => removePerformance(getDb(), tenant, field(data, "id"), field(data, "performanceId")));
}

export async function savePricingAction(_: EventFormState, data: FormData): Promise<EventFormState> {
  return attempt((tenant) => savePricing(getDb(), tenant, field(data, "id"), JSON.parse(field(data, "sectors") || "[]")));
}

export async function publishEventAction(_: EventFormState, data: FormData): Promise<EventFormState> {
  return attempt((tenant) => publishEvent(getDb(), tenant, field(data, "id")));
}

export async function setStatusAction(_: EventFormState, data: FormData): Promise<EventFormState> {
  return attempt((tenant) => setEventStatus(getDb(), tenant, field(data, "id"), field(data, "status")));
}

export async function refreshMapAction(_: EventFormState, data: FormData): Promise<EventFormState> {
  return attempt((tenant) => refreshEventMap(getDb(), tenant, field(data, "id")));
}

export async function setSeatsBlockedAction(_: EventFormState, data: FormData): Promise<EventFormState> {
  const blocked = field(data, "intent") === "block";
  return attempt(async (tenant) => {
    const count = await setSeatsBlocked(getDb(), tenant, field(data, "id"), field(data, "performanceId"), {
      seatIds: JSON.parse(field(data, "seatIds") || "[]"),
      blocked,
      reason: field(data, "reason"),
    });
    return `${blocked ? "Bloqueadas" : "Liberadas"}: ${count}`;
  });
}
