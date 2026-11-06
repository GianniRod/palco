import { Suspense } from "react";
import type { Metadata } from "next";
import { ExternalLink, ScanLine } from "lucide-react";
import { getDb } from "@backend/db.mjs";
import { listEventsForTests, listTestTickets } from "@backend/qr.mjs";
import { requireAdmin } from "@/lib/dashboard/session";
import { brandedQrSvg } from "@/lib/branded-qr";
import { SCAN_URL } from "@/lib/dashboard/config";
import { Card, formatDate, Loading, PageTitle } from "../../_components/shell";
import { SubmitButton } from "../../_components/ui";
import { deleteTestTicketsAction, resetTestTicketsAction } from "./actions";
import { CreateTestTicketsForm } from "./_forms";
import { AutoRefresh } from "./_auto-refresh";

export const metadata: Metadata = { title: "Puerta (prueba)" };

const scanHost = SCAN_URL.replace(/^https?:\/\//, "");

type TestTicket = {
  id: string;
  number: number;
  holder: string;
  organizationName: string | null;
  eventTitle: string | null;
  checkedInAt: Date | null;
  checkedInBy: string | null;
  scans: number;
  code: string;
};

function Status({ ticket }: { ticket: TestTicket }) {
  return ticket.checkedInAt ? (
    <span className="shrink-0 rounded-full bg-palco-900 px-2 py-0.5 text-[11px] font-medium text-white">Usada</span>
  ) : (
    <span className="shrink-0 rounded-full bg-palco-100 px-2 py-0.5 text-[11px] font-medium text-palco-700">
      Sin usar
    </span>
  );
}

function ScanLink() {
  return (
    <a
      href={SCAN_URL}
      target="_blank"
      rel="noopener"
      className="flex items-center justify-center gap-2 rounded-2xl bg-palco-950 px-6 py-6 font-semibold text-white"
    >
      <ScanLine className="size-6" aria-hidden />
      Abrir el escáner en {scanHost}
      <ExternalLink className="size-4 opacity-60" aria-hidden />
    </a>
  );
}

async function Content() {
  const actor = await requireAdmin();
  const db = getDb();
  type EventOption = { id: string; title: string; status: string; organizationName: string };
  const [tickets, events]: [TestTicket[], EventOption[]] = await Promise.all([
    listTestTickets(db, actor),
    listEventsForTests(db, actor),
  ]);
  const qrs = tickets.map((t) => brandedQrSvg(t.code));
  const used = tickets.filter((t) => t.checkedInAt).length;

  return (
    <>
      <PageTitle>Puerta (prueba)</PageTitle>
      <AutoRefresh />

      {/* ---------- Celular: el escáner está en su propio subdominio ---------- */}
      <div className="space-y-6 md:hidden">
        <ScanLink />
        <Card title={`Entradas de prueba · ${used}/${tickets.length} usadas`}>
          {tickets.length === 0 ? (
            <p className="text-sm text-palco-600">Todavía no hay. Creálas desde la computadora en esta sección.</p>
          ) : (
            <ul className="divide-y divide-palco-50 text-sm">
              {tickets.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="font-medium text-palco-900">Prueba {t.number}</span>
                    <span className="block truncate text-xs text-palco-500">
                      {t.organizationName ? `${t.organizationName} · ${t.eventTitle ?? "sin evento"}` : "General (admins)"}
                      {t.holder && ` · ${t.holder}`}
                    </span>
                  </span>
                  <Status ticket={t} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ---------- Computadora: crear entradas y mostrar los QR ---------- */}
      <div className="hidden space-y-6 md:block">
        <Card title="Cómo probar">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-palco-700">
            <li>
              Creá entradas de prueba acá abajo. Elegí de qué cliente son: cada QR solo lo valida la gente de ese
              cliente con permiso de escaneo (y ustedes, los admins, que validan todo).
            </li>
            <li>
              En el celular abrí <strong>{scanHost}</strong> e ingresá con tu cuenta (o con la de un usuario del cliente
              que tenga <strong>Puede escanear QR</strong>).
            </li>
            <li>Escaneá un QR de esta pantalla: tiene que salir <strong>Entrada válida</strong> en verde.</li>
            <li>El mismo otra vez: <strong>Ya fue usada</strong> en amarillo, con la hora.</li>
            <li>
              Un QR de otro cliente con un usuario de cliente, o cualquier otro QR: <strong>Entrada inválida</strong> en
              rojo.
            </li>
          </ol>
          <p className="mt-4 text-xs text-palco-500">Esta pantalla se actualiza sola mientras escaneás.</p>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <Card title="Crear entradas de prueba">
            <CreateTestTicketsForm events={events} />
          </Card>
          {tickets.length > 0 && (
            <Card title={`${used} de ${tickets.length} usadas`}>
              <div className="flex flex-col gap-2">
                <form action={resetTestTicketsAction}>
                  <SubmitButton variant="secondary" className="w-full">
                    Marcar todas sin usar
                  </SubmitButton>
                </form>
                <form action={deleteTestTicketsAction}>
                  <SubmitButton variant="danger" className="w-full" confirm="¿Borrar todas las entradas de prueba?">
                    Borrar todas
                  </SubmitButton>
                </form>
              </div>
            </Card>
          )}
        </div>

        {tickets.length > 0 && (
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {tickets.map((t, i) => (
              <li key={t.id} className="rounded-xl border border-palco-100 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-palco-900">Prueba {t.number}</p>
                    <p className="truncate text-xs text-palco-500">
                      {t.organizationName ? `${t.organizationName} · ${t.eventTitle ?? "sin evento"}` : "General (solo admins)"}
                      {t.holder && ` · ${t.holder}`}
                    </p>
                  </div>
                  <Status ticket={t} />
                </div>
                <div
                  className="mx-auto mt-3 w-full max-w-56 [&>svg]:h-auto [&>svg]:w-full"
                  // SVG con el búho generado acá mismo (src/lib/branded-qr.ts) a partir de nuestro código firmado.
                  dangerouslySetInnerHTML={{ __html: qrs[i] }}
                />
                <p className="mt-2 text-xs text-palco-500">
                  {t.checkedInAt
                    ? `Entró ${formatDate(t.checkedInAt)}${t.checkedInBy ? ` · ${t.checkedInBy}` : ""}`
                    : "Todavía no entró"}
                  {t.scans > 1 && ` · ${t.scans} escaneos`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default function PuertaPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}
