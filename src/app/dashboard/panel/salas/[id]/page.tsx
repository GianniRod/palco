import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@backend/db.mjs";
import { getVenue } from "@backend/venues.mjs";
import { requireEditor } from "@/lib/dashboard/session";
import { Loading } from "../../../_components/shell";
import { VenueEditor } from "./_editor";

export const metadata: Metadata = { title: "Editar sala" };

type Props = PageProps<"/dashboard/panel/salas/[id]">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Content({ params }: { params: Props["params"] }) {
  const tenant = await requireEditor();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const venue = await getVenue(getDb(), tenant, id);
  if (!venue) notFound();
  return <VenueEditor venue={venue} />;
}

export default function VenuePage({ params }: Props) {
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/panel/salas" className="text-palco-600 hover:underline">← Salas y mapas</Link>
      </p>
      <Suspense fallback={<Loading />}>
        <Content params={params} />
      </Suspense>
    </>
  );
}
