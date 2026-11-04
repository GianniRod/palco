import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getDb } from "@backend/db.mjs";
import { listOrganizations } from "@backend/admin.mjs";
import { requireAdmin } from "@/lib/dashboard/session";
import { Loading, PageTitle } from "../../_components/shell";
import { buttonClass, inputClass } from "../../_components/styles";

export const metadata: Metadata = { title: "Clientes" };

type Props = PageProps<"/dashboard/admin/clientes">;

async function Content({ searchParams }: { searchParams: Props["searchParams"] }) {
  const actor = await requireAdmin();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const organizations = await listOrganizations(getDb(), actor, { query });

  return (
    <>
      <form method="get" action="/admin/clientes" className="mb-4">
        <label className="sr-only" htmlFor="q">
          Buscar cliente
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Buscar por nombre o slug"
          className={`${inputClass} max-w-sm`}
        />
      </form>

      {organizations.length === 0 ? (
        <p className="rounded-xl border border-palco-100 bg-white p-8 text-center text-sm text-palco-600">
          {query ? "Ningún cliente coincide con la búsqueda." : "Todavía no hay clientes."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-palco-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-palco-100 text-palco-500">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Página</th>
                <th className="px-4 py-3 text-right font-medium">Comisión</th>
                <th className="px-4 py-3 text-right font-medium">Usuarios</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((organization: (typeof organizations)[number]) => (
                <tr key={organization.id} className="border-b border-palco-50 last:border-0 hover:bg-palco-50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/clientes/${organization.id}`} className="text-palco-800 hover:underline">
                      {organization.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-palco-600">{organization.slug}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(organization.commissionPercent)}%</td>
                  <td className="px-4 py-3 text-right tabular-nums">{organization.userCount}</td>
                  <td className="px-4 py-3">{organization.suspendedAt ? "Suspendido" : "Activo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function OrganizationsPage({ searchParams }: Props) {
  return (
    <>
      <PageTitle
        action={
          <Link href="/admin/clientes/nuevo" className={buttonClass()}>
            <Plus className="size-4" aria-hidden />
            Nuevo cliente
          </Link>
        }
      >
        Clientes
      </PageTitle>
      <Suspense fallback={<Loading />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
