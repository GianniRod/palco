"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@backend/db.mjs";
import { ValidationError } from "@backend/auth.mjs";
import {
  createMember,
  createOrganization,
  resetMemberPassword,
  setCommission,
  setMemberDisabled,
  setOrganizationSuspended,
  startImpersonation,
  stopImpersonation,
  updateOrganization,
} from "@backend/admin.mjs";
import { requireAdmin } from "@/lib/dashboard/session";

export type AdminFormState = {
  error?: string;
  saved?: boolean;
  // React vacía el formulario al terminar la acción: con un error se devuelve lo que se había escrito.
  values?: Record<string, string>;
  // Se muestra una sola vez: es la única copia en texto de la contraseña.
  credentials?: { email: string; temporaryPassword: string };
};

const field = (data: FormData, name: string) => String(data.get(name) ?? "");
const refresh = () => revalidatePath("/dashboard/admin", "layout");
const failure = (error: ValidationError, data: FormData): AdminFormState => ({
  error: error.message,
  values: Object.fromEntries([...data].map(([key, value]) => [key, String(value)])),
});

function organizationFields(data: FormData) {
  return {
    name: field(data, "name"),
    contactName: field(data, "contactName"),
    contactEmail: field(data, "contactEmail"),
    contactPhone: field(data, "contactPhone"),
    taxId: field(data, "taxId"),
  };
}

// Corre la acción y convierte un error de validación en mensaje para el formulario.
async function attempt(data: FormData, run: () => Promise<AdminFormState | void>): Promise<AdminFormState> {
  try {
    const result = await run();
    refresh();
    return result ?? { saved: true };
  } catch (error) {
    if (error instanceof ValidationError) return failure(error, data);
    throw error;
  }
}

export async function createOrganizationAction(_: AdminFormState, data: FormData): Promise<AdminFormState> {
  const actor = await requireAdmin();
  let id: string;
  try {
    id = await createOrganization(getDb(), actor, {
      ...organizationFields(data),
      slug: field(data, "slug"),
      commissionPercent: field(data, "commissionPercent"),
    });
  } catch (error) {
    if (error instanceof ValidationError) return failure(error, data);
    throw error;
  }
  refresh();
  redirect(`/admin/clientes/${id}`);
}

export async function updateOrganizationAction(_: AdminFormState, data: FormData): Promise<AdminFormState> {
  const actor = await requireAdmin();
  return attempt(data, () => updateOrganization(getDb(), actor, field(data, "id"), organizationFields(data)));
}

export async function setCommissionAction(_: AdminFormState, data: FormData): Promise<AdminFormState> {
  const actor = await requireAdmin();
  return attempt(data, () => setCommission(getDb(), actor, field(data, "id"), field(data, "commissionPercent")));
}

export async function createMemberAction(_: AdminFormState, data: FormData): Promise<AdminFormState> {
  const actor = await requireAdmin();
  return attempt(data, async () => ({
    credentials: await createMember(getDb(), actor, {
      organizationId: field(data, "organizationId"),
      email: field(data, "email"),
      role: field(data, "role"),
    }),
  }));
}

export async function resetMemberPasswordAction(_: AdminFormState, data: FormData): Promise<AdminFormState> {
  const actor = await requireAdmin();
  return attempt(data, async () => ({ credentials: await resetMemberPassword(getDb(), actor, field(data, "userId")) }));
}

export async function setMemberDisabledAction(data: FormData) {
  const actor = await requireAdmin();
  await setMemberDisabled(getDb(), actor, field(data, "userId"), field(data, "disabled") === "true");
  refresh();
}

export async function setSuspendedAction(data: FormData) {
  const actor = await requireAdmin();
  await setOrganizationSuspended(getDb(), actor, field(data, "id"), field(data, "suspended") === "true");
  refresh();
}

export async function startImpersonationAction(data: FormData) {
  const actor = await requireAdmin();
  await startImpersonation(getDb(), actor, field(data, "id"));
  redirect("/panel");
}

export async function stopImpersonationAction() {
  const actor = await requireAdmin();
  await stopImpersonation(getDb(), actor);
  redirect(actor.actingOrganizationId ? `/admin/clientes/${actor.actingOrganizationId}` : "/admin");
}
