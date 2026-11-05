import { Suspense } from "react";
import type { Metadata } from "next";
import { getDb } from "@backend/db.mjs";
import { canEditSite, getSiteForEditing } from "@backend/sites.mjs";
import { requireTenant } from "@/lib/dashboard/session";
import { Loading, PageTitle } from "../../_components/shell";
import { SiteEditor } from "./_editor";

export const metadata: Metadata = { title: "Mi página" };

async function Content() {
  const tenant = await requireTenant();
  if (!canEditSite(tenant)) {
    return <p className="text-sm text-palco-700">Tu usuario no puede editar la página. Pedíselo al dueño de la cuenta.</p>;
  }

  const { draft, published, slug, events } = await getSiteForEditing(getDb(), tenant);
  return <SiteEditor slug={slug} initial={draft} published={published} events={events} />;
}

export default function MyPage() {
  return (
    <>
      <PageTitle>Mi página</PageTitle>
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </>
  );
}
