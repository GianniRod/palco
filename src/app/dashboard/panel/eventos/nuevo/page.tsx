import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@backend/db.mjs";
import { listVenues } from "@backend/venues.mjs";
import { requireEditor } from "@/lib/dashboard/session";
import { Card, Loading, PageTitle } from "../../../_components/shell";
import { CreateEventForm } from "../_forms";

export const metadata: Metadata = { title: "Nuevo evento" };

type Sector = { kind: string };

async function Content() {
  const tenant = await requireEditor();
  const venues = await listVenues(getDb(), tenant);
  const options = venues.map((venue: (typeof venues)[number]) => ({
    id: venue.id as string,
    name: venue.name as string,
    sellable: venue.map.sectors.some((sector: Sector) => sector.kind === "numbered" || sector.kind === "general"),
  }));

  // Sin sala con mapa igual se puede crear: se vende solo por ubicación (General, VIP...).
  return (
    <Card>
      <CreateEventForm venues={options} />
    </Card>
  );
}

export default function NewEventPage() {
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/panel/eventos" className="text-palco-600 hover:underline">← Eventos</Link>
      </p>
      <PageTitle>Nuevo evento</PageTitle>
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </>
  );
}
