"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@backend/db.mjs";
import { ValidationError } from "@backend/auth.mjs";
import { publishSite, saveSiteDraft, unpublishSite } from "@backend/sites.mjs";
import type { SiteContent } from "@/components/public-site";
import { requireTenant } from "@/lib/dashboard/session";

export type SiteFormState = { error?: string; done?: "saved" | "published"; site?: SiteContent };

const refresh = () => revalidatePath("/dashboard/panel", "layout");

// La organización sale de la sesión: lo único que se toma del formulario es el contenido.
export async function saveSiteAction(_: SiteFormState, data: FormData): Promise<SiteFormState> {
  const tenant = await requireTenant();
  const content = Object.fromEntries([...data].map(([key, value]) => [key, String(value)]));
  const publish = content.intent === "publish";

  try {
    const site = await (publish ? publishSite : saveSiteDraft)(getDb(), tenant, content);
    refresh();
    return { done: publish ? "published" : "saved", site };
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    throw error;
  }
}

export async function unpublishSiteAction() {
  await unpublishSite(getDb(), await requireTenant());
  refresh();
}
