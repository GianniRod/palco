import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { site } from "@/lib/site";
import { getCurrentTenant, requireSession } from "@/lib/dashboard/session";
import { logoutAction } from "../actions";
import { AuthCard, Loading } from "../_components/shell";
import { SubmitButton } from "../_components/ui";

export const metadata: Metadata = { title: "Sin acceso" };

async function Content() {
  await requireSession();
  const tenant = await getCurrentTenant();
  if (tenant && !tenant.organization.suspendedAt) redirect("/panel");

  return (
    <>
      <p className="text-sm text-palco-900">
        {tenant
          ? `La cuenta de ${tenant.organization.name} está suspendida.`
          : "Tu usuario no está asociado a ningún cliente."}{" "}
        Escribinos a{" "}
        <a href={`mailto:${site.contactEmail}`} className="underline">
          {site.contactEmail}
        </a>
        .
      </p>
      <form action={logoutAction} className="mt-5">
        <SubmitButton variant="secondary" className="w-full">
          Salir
        </SubmitButton>
      </form>
    </>
  );
}

export default function NoAccessPage() {
  return (
    <AuthCard title="No podés entrar al panel">
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </AuthCard>
  );
}
