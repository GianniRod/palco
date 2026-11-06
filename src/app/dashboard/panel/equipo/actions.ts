"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@backend/db.mjs";
import { ValidationError } from "@backend/auth.mjs";
import { createTeamMember, setTeamMemberScan } from "@backend/team.mjs";
import { requireTenant } from "@/lib/dashboard/session";

export type TeamFormState = {
  error?: string;
  values?: Record<string, string>;
  credentials?: { email: string; temporaryPassword: string };
};

const field = (data: FormData, name: string) => String(data.get(name) ?? "");

export async function createTeamMemberAction(_: TeamFormState, data: FormData): Promise<TeamFormState> {
  const { session, organization, role, impersonating } = await requireTenant();
  try {
    const credentials = await createTeamMember(getDb(), session, { organization, role, impersonating }, {
      email: field(data, "email"),
      role: field(data, "role"),
      canScan: data.get("canScan") === "on",
    });
    revalidatePath("/dashboard/panel/equipo");
    return { credentials };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message, values: { email: field(data, "email"), role: field(data, "role") } };
    }
    throw error;
  }
}

export async function setTeamMemberScanAction(data: FormData) {
  const { session, organization, role, impersonating } = await requireTenant();
  await setTeamMemberScan(
    getDb(),
    session,
    { organization, role, impersonating },
    field(data, "userId"),
    field(data, "canScan") === "true",
  );
  revalidatePath("/dashboard/panel/equipo");
}
