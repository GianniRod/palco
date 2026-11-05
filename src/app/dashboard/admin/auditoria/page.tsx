import { Suspense } from "react";
import type { Metadata } from "next";
import { getDb } from "@backend/db.mjs";
import { listAudit } from "@backend/admin.mjs";
import { requireAdmin } from "@/lib/dashboard/session";
import { formatDate, Loading, PageTitle } from "../../_components/shell";

export const metadata: Metadata = { title: "Auditoría" };

const ACTION_LABELS: Record<string, string> = {
  "admin.created": "Creó un admin",
  "organization.created": "Creó el cliente",
  "organization.updated": "Editó los datos",
  "organization.commission_changed": "Cambió la comisión",
  "organization.suspended": "Suspendió el cliente",
  "organization.reactivated": "Reactivó el cliente",
  "user.created": "Creó un usuario",
  "user.password_reset": "Reseteó una contraseña",
  "user.disabled": "Desactivó un usuario",
  "user.enabled": "Reactivó un usuario",
  "impersonation.started": "Entró a editar como el cliente",
  "impersonation.stopped": "Salió de editar como el cliente",
  "password.changed": "Cambió su contraseña",
  "password.reset": "Recuperó su contraseña por email",
};

function describe(details: Record<string, unknown>) {
  if (typeof details.from === "number" && typeof details.to === "number") {
    return `${details.from}% → ${details.to}%`;
  }
  return typeof details.email === "string" ? details.email : "";
}

async function Content() {
  const actor = await requireAdmin();
  const entries = await listAudit(getDb(), actor);

  if (entries.length === 0) {
    return <p className="text-sm text-palco-600">Todavía no hay movimientos.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-palco-100 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-palco-100 text-palco-500">
          <tr>
            <th className="px-4 py-3 font-medium">Cuándo</th>
            <th className="px-4 py-3 font-medium">Quién</th>
            <th className="px-4 py-3 font-medium">Qué</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry: (typeof entries)[number]) => (
            <tr key={entry.id} className="border-b border-palco-50 last:border-0">
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-palco-600">{formatDate(entry.createdAt)}</td>
              <td className="px-4 py-3">{entry.actorEmail}</td>
              <td className="px-4 py-3">
                {ACTION_LABELS[entry.action] ?? entry.action}
                {describe(entry.details) && <span className="text-palco-500"> · {describe(entry.details)}</span>}
              </td>
              <td className="px-4 py-3">{entry.organizationName ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AuditPage() {
  return (
    <>
      <PageTitle>Auditoría</PageTitle>
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </>
  );
}
