import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getDb } from "@backend/db.mjs";
import { BLOCK_REASONS, getEvent, listPerformanceSeats } from "@backend/events.mjs";
import { VenueMap } from "@/components/venue-map";
import { publicSiteUrl } from "@/lib/dashboard/config";
import { requireEditor } from "@/lib/dashboard/session";
import { Card, formatDate, Loading, PageTitle } from "../../../_components/shell";
import {
  publishEventAction,
  refreshMapAction,
  removePerformanceAction,
  setStatusAction,
} from "../actions";
import { ActionButton, AddPerformanceForm, DetailsForm, PricingForm, SeatBlocker } from "../_forms";
import { StatusPill } from "../_status";

export const metadata: Metadata = { title: "Evento" };

type Props = PageProps<"/dashboard/panel/eventos/[id]">;
type Performance = { id: string; startsAt: Date; orderCount: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Content({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  const tenant = await requireEditor();
  const { id } = await params;
  const { funcion } = await searchParams;
  if (!UUID.test(id)) notFound();
  const db = getDb();
  const event = await getEvent(db, tenant, id);
  if (!event) notFound();

  const open = event.status === "draft" || event.status === "published";
  const published = event.status === "published";
  const performances: Performance[] = event.performances;
  const selected = performances.find((performance) => performance.id === funcion) ?? performances[0];
  const seats = published && selected ? await listPerformanceSeats(db, tenant, id, selected.id) : [];

  return (
    <>
      <PageTitle
        action={
          <div className="flex flex-wrap items-center gap-2">
            {published && (
              <a href={`${publicSiteUrl(tenant.organization.slug)}/eventos/${id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm underline">
                Ver en la página <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
            {event.status === "draft" && <ActionButton action={publishEventAction} fields={{ id }} variant="primary">Publicar evento</ActionButton>}
            {published && (
              <>
                <ActionButton action={setStatusAction} fields={{ id, status: "finished" }} confirm="¿Marcar el evento como finalizado? Deja de verse en tu página.">Finalizar</ActionButton>
                <ActionButton action={setStatusAction} fields={{ id, status: "cancelled" }} variant="danger" confirm="¿Cancelar el evento? Deja de verse en tu página y no se puede deshacer.">Cancelar evento</ActionButton>
              </>
            )}
          </div>
        }
      >
        <span className="mr-3">{event.title}</span>
        <StatusPill status={event.status} />
      </PageTitle>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title="Datos">
          <DetailsForm event={event} />
        </Card>

        <div className="grid gap-6">
          <Card title="Funciones">
            <ul className="mb-4 divide-y divide-palco-50 text-sm">
              {performances.map((performance) => (
                <li key={performance.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="tabular-nums text-palco-900">{formatDate(performance.startsAt)}</span>
                  {open && performances.length > 1 && performance.orderCount === 0 && (
                    <ActionButton action={removePerformanceAction} fields={{ id, performanceId: performance.id }} variant="danger" confirm="¿Quitar esta función?">Quitar</ActionButton>
                  )}
                </li>
              ))}
            </ul>
            {open && <AddPerformanceForm eventId={id} />}
          </Card>

          <Card title={`Mapa · ${event.venue}`}>
            <VenueMap map={event.map} />
            {event.status === "draft" ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <ActionButton action={refreshMapAction} fields={{ id }}>Actualizar desde la sala</ActionButton>
                <p className="text-xs text-palco-600">Cuando publiques, este mapa queda fijo para el evento.</p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-palco-600">El mapa queda fijo: cambiar la sala no afecta este evento.</p>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6">
        <Card title="Precios y lotes">
          {open ? (
            <PricingForm eventId={id} sectors={event.sectors} />
          ) : (
            <p className="text-sm text-palco-600">El evento está cerrado.</p>
          )}
        </Card>

        {published && selected && (
          <Card title="Bloquear butacas">
            {performances.length > 1 && (
              <nav aria-label="Función" className="mb-4 flex flex-wrap gap-2">
                {performances.map((performance) => (
                  <Link
                    key={performance.id}
                    href={`/panel/eventos/${id}?funcion=${performance.id}`}
                    aria-current={performance.id === selected.id ? "true" : undefined}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium tabular-nums ${performance.id === selected.id ? "border-palco-800 bg-palco-800 text-white" : "border-palco-200 bg-white text-palco-800"}`}
                  >
                    {formatDate(performance.startsAt)}
                  </Link>
                ))}
              </nav>
            )}
            <SeatBlocker key={selected.id} eventId={id} performanceId={selected.id} seats={seats} reasons={BLOCK_REASONS} />
          </Card>
        )}
      </div>
    </>
  );
}

export default function EventPage({ params, searchParams }: Props) {
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/panel/eventos" className="text-palco-600 hover:underline">← Eventos</Link>
      </p>
      <Suspense fallback={<Loading />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
