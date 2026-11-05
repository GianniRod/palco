import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getDb } from "@backend/db.mjs";
import { listEvents } from "@backend/events.mjs";
import { requireEditor } from "@/lib/dashboard/session";
import { formatDate, Loading, PageTitle } from "../../_components/shell";
import { buttonClass } from "../../_components/styles";
import { StatusPill } from "./_status";

export const metadata: Metadata = { title: "Eventos" };

async function Content() {
  const tenant = await requireEditor();
  const events = await listEvents(getDb(), tenant);
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-palco-100 bg-white p-8 text-center text-sm text-palco-600">
        Todavía no creaste eventos. Primero armá el mapa de tu sala y después creá tu primer evento.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-palco-100 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-palco-100 text-palco-500">
          <tr>
            <th className="px-4 py-3 font-medium">Evento</th>
            <th className="px-4 py-3 font-medium">Sala</th>
            <th className="px-4 py-3 font-medium">Próxima función</th>
            <th className="px-4 py-3 text-right font-medium">Funciones</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event: (typeof events)[number]) => (
            <tr key={event.id} className="border-b border-palco-50 last:border-0 hover:bg-palco-50">
              <td className="px-4 py-3 font-medium">
                <Link href={`/panel/eventos/${event.id}`} className="text-palco-800 hover:underline">{event.title}</Link>
              </td>
              <td className="px-4 py-3 text-palco-600">{event.venue}</td>
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-palco-600">{formatDate(event.nextAt)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{event.performanceCount}</td>
              <td className="px-4 py-3"><StatusPill status={event.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EventsPage() {
  return (
    <>
      <PageTitle
        action={
          <Link href="/panel/eventos/nuevo" className={buttonClass()}>
            <Plus className="size-4" aria-hidden /> Nuevo evento
          </Link>
        }
      >
        Eventos
      </PageTitle>
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </>
  );
}
