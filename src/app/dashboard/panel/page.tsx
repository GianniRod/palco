import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@backend/db.mjs";
import { getTicketCounts } from "@backend/qr.mjs";
import { requireTenant } from "@/lib/dashboard/session";
import { Card, Loading, PageTitle } from "../_components/shell";
import { publicSiteHost } from "@/lib/dashboard/config";

export const metadata: Metadata = { title: "Inicio" };

async function Content() {
  const tenant = await requireTenant();
  const { organization } = tenant;
  const counts = await getTicketCounts(getDb(), tenant);
  return (
    <>
      <PageTitle>{organization.name}</PageTitle>
      <Card title="Tu cuenta">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-palco-500">Dirección de tu página</dt>
            <dd className="font-medium text-palco-900">{publicSiteHost(organization.slug)}</dd>
          </div>
          <div>
            <dt className="text-palco-500">Comisión de Nightowl por venta</dt>
            <dd className="font-medium text-palco-900">{Number(organization.commissionPercent)}%</dd>
          </div>
        </dl>
      </Card>
      <div className="mt-6">
        <Card title="QR de tus entradas">
          <dl className="grid grid-cols-3 gap-3">
            {[
              ["En total", counts.total],
              ["Usados", counts.used],
              ["Sin usar", counts.unused],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-palco-500">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-palco-900 sm:text-3xl">{value.toLocaleString("es-AR")}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
      <p className="mt-6 text-sm text-palco-600">
        Empezá por{" "}
        <Link href="/panel/mi-pagina" className="underline">
          armar tu página
        </Link>
        , cargá tus{" "}
        <Link href="/panel/salas" className="underline">
          salas
        </Link>{" "}
        y publicá tus{" "}
        <Link href="/panel/eventos" className="underline">
          eventos
        </Link>
        . Estamos habilitando las demás secciones: pagos, ventas y control de acceso.
      </p>
    </>
  );
}

export default function PanelHome() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}
