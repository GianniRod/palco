"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@backend/db.mjs";
import { ValidationError } from "@backend/auth.mjs";
import { createVenue, deleteVenue, saveVenue } from "@backend/venues.mjs";
import { requireEditor } from "@/lib/dashboard/session";

export type VenueFormState = { error?: string; saved?: boolean };

const field = (data: FormData, name: string) => String(data.get(name) ?? "");
const refresh = () => revalidatePath("/dashboard/panel", "layout");

export async function createVenueAction(_: VenueFormState, data: FormData): Promise<VenueFormState> {
  const tenant = await requireEditor();
  let id: string;
  try {
    id = await createVenue(getDb(), tenant, { name: field(data, "name"), address: field(data, "address") });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    throw error;
  }
  refresh();
  redirect(`/panel/salas/${id}`);
}

export async function saveVenueAction(_: VenueFormState, data: FormData): Promise<VenueFormState> {
  const tenant = await requireEditor();
  try {
    await saveVenue(getDb(), tenant, field(data, "id"), {
      name: field(data, "name"),
      address: field(data, "address"),
      map: JSON.parse(field(data, "map") || "{}"),
    });
    refresh();
    return { saved: true };
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    throw error;
  }
}

export async function deleteVenueAction(_: VenueFormState, data: FormData): Promise<VenueFormState> {
  const tenant = await requireEditor();
  try {
    await deleteVenue(getDb(), tenant, field(data, "id"));
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    throw error;
  }
  refresh();
  redirect("/panel/salas");
}
