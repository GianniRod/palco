import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireTenant } from "@/lib/dashboard/session";
import { Card, Loading, PageTitle } from "../_components/shell";

export const metadata: Metadata = { title: "Inicio" };

async function Content() {
  const { organization } = await requireTenant();
  return (
    <>
      <PageTitle>{organization.name}</PageTitle>
      <Card title="Tu cuenta">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-palco-500">Dirección de tu página</dt>
            <dd className="font-medium text-palco-900">{organization.slug}.palcotickets.com</dd>
          </div>
          <div>
            <dt className="text-palco-500">Comisión de Nightowl por venta</dt>
            <dd className="font-medium text-palco-900">{Number(organization.commissionPercent)}%</dd>
          </div>
        </dl>
      </Card>
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
