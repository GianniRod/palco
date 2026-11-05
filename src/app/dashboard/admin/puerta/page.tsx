import { Suspense } from "react";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { Smartphone } from "lucide-react";
import { getDb } from "@backend/db.mjs";
import { listTestTickets } from "@backend/qr.mjs";
import { requireAdmin } from "@/lib/dashboard/session";
import { Card, formatDate, Loading, PageTitle } from "../../_components/shell";
import { SubmitButton } from "../../_components/ui";
import { deleteTestTicketsAction, resetTestTicketsAction } from "./actions";
import { CreateTestTicketsForm } from "./_forms";
import { Scanner } from "./_scanner";
import { AutoRefresh } from "./_auto-refresh";

export const metadata: Metadata = { title: "Puerta (prueba)" };

type TestTicket = {
  id: string;
  number: number;
  holder: string;
  checkedInAt: Date | null;
  checkedInBy: string | null;
  scans: number;
  code: string;
};

function Status({ ticket }: { ticket: TestTicket }) {
  return ticket.checkedInAt ? (
    <span className="rounded-full bg-palco-900 px-2 py-0.5 text-[11px] font-medium text-white">Usada</span>
  ) : (
    <span className="rounded-full bg-palco-100 px-2 py-0.5 text-[11px] font-medium text-palco-700">Sin usar</span>
  );
}

async function Content() {
  const actor = await requireAdmin();
  const tickets: TestTicket[] = await listTestTickets(getDb(), actor);
  const qrs = await Promise.all(
    tickets.map((t) => QRCode.toString(t.code, { type: "svg", margin: 1, errorCorrectionLevel: "M" })),
  );
  const used = tickets.filter((t) => t.checkedInAt).length;

  return (
    <>
      <PageTitle>Puerta (prueba)</PageTitle>

      {/* ---------- Celular: el escáner ---------- */}
      <div className="space-y-6 md:hidden">
        <Scanner />
        <Card title={`Entradas de prueba · ${used}/${tickets.length} usadas`}>
          {tickets.length === 0 ? (
            <p className="text-sm text-palco-600">
              Todavía no hay. Creálas desde la computadora en esta misma sección y escaneá el QR de la pantalla.
            </p>
          ) : (
            <ul className="divide-y divide-palco-50 text-sm">
              {tickets.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span>
                    <span className="font-medium text-palco-900">Prueba {t.number}</span>
                    {t.holder && <span className="text-palco-500"> · {t.holder}</span>}
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
        <AutoRefresh />
        <Card title="Cómo probar">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-palco-700">
            <li>Creá algunas entradas de prueba acá abajo: cada una tiene un QR real y firmado.</li>
            <li>
              En el celular entrá a <strong>dashboard.palcotickets.com</strong> con tu cuenta de admin y andá a{" "}
              <strong>Puerta</strong> (o tocá el botón <strong>Escanear QR</strong>).
            </li>
            <li>Escaneá un QR de esta pantalla: tiene que salir <strong>Entrada válida</strong> en verde.</li>
            <li>Escaneá el mismo otra vez: tiene que salir <strong>Ya fue usada</strong> en amarillo, con la hora.</li>
            <li>Cualquier otro QR (un link, un QR de otra cosa) sale <strong>Entrada inválida</strong> en rojo.</li>
          </ol>
          <p className="mt-4 flex items-center gap-2 text-xs text-palco-500">
            <Smartphone className="size-4" aria-hidden /> El escáner solo aparece en el celular: la cámara necesita
            https, así que no funciona en dashboard.localhost desde el teléfono.
          </p>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <Card title="Crear entradas de prueba">
            <CreateTestTicketsForm />
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
                  <div>
                    <p className="font-semibold text-palco-900">Prueba {t.number}</p>
                    {t.holder && <p className="text-xs text-palco-500">{t.holder}</p>}
                  </div>
                  <Status ticket={t} />
                </div>
                <div
                  className="mx-auto mt-3 w-full max-w-56 [&>svg]:h-auto [&>svg]:w-full"
                  // SVG generado acá mismo por la librería qrcode a partir de nuestro código firmado.
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
