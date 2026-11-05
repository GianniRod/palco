import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@backend/db.mjs";
import { listVenues } from "@backend/venues.mjs";
import { VenueMap } from "@/components/venue-map";
import { requireEditor } from "@/lib/dashboard/session";
import { Card, Loading, PageTitle } from "../../_components/shell";
import { CreateVenueForm } from "./_create-form";

export const metadata: Metadata = { title: "Salas y mapas" };

async function Content() {
  const tenant = await requireEditor();
  const venues = await listVenues(getDb(), tenant);
  return (
    <div className="space-y-6">
      {venues.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue: (typeof venues)[number]) => (
            <li key={venue.id}>
              <Link href={`/panel/salas/${venue.id}`} className="block rounded-xl border border-palco-100 bg-white p-3 transition hover:border-palco-300">
                <VenueMap map={venue.map} />
                <p className="mt-3 font-semibold text-palco-900">{venue.name}</p>
                <p className="text-sm text-palco-600">
                  {venue.map.sectors.length === 0 ? "Sin mapa todavía" : `${venue.map.sectors.length} elementos en el mapa`}
                  {venue.eventCount > 0 ? ` · ${venue.eventCount} eventos` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Card title={venues.length === 0 ? "Creá tu primera sala" : "Nueva sala"}>
        <CreateVenueForm />
      </Card>
    </div>
  );
}

export default function VenuesPage() {
  return (
    <>
      <PageTitle>Salas y mapas</PageTitle>
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </>
  );
}
