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
  "site.published": "Publicó la página",
  "site.unpublished": "Despublicó la página",
  "venue.created": "Creó una sala",
  "venue.deleted": "Borró una sala",
  "event.created": "Creó un evento",
  "event.published": "Publicó un evento",
  "event.finished": "Finalizó un evento",
  "event.cancelled": "Canceló un evento",
  "event.performance_added": "Agregó una función",
  "event.performance_removed": "Quitó una función",
  "event.price_changed": "Cambió un precio",
  "event.seats_blocked": "Bloqueó butacas",
  "event.seats_released": "Liberó butacas",
};

function describe(details: Record<string, unknown>) {
  if (typeof details.from === "number" && typeof details.to === "number") {
    return `${details.from}% → ${details.to}%`;
  }
  if (typeof details.sector === "string") {
    return `${details.title}: ${details.sector}, $${details.from ?? "—"} → $${details.to ?? "—"}`;
  }
  if (typeof details.count === "number")
    return `${details.title}: ${details.count} butacas`;
  if (typeof details.title === "string") return details.title;
  if (typeof details.name === "string") return details.name;
  return typeof details.email === "string" ? details.email : "";
}

async function Content() {
  const actor = await requireAdmin();
  const entries = await listAudit(getDb(), actor);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-palco-600">Todavía no hay movimientos.</p>
    );
  }

  return (
    <>
      {/* Celular: una tarjeta por movimiento */}
      <ul className="space-y-2 md:hidden">
        {entries.map((entry: (typeof entries)[number]) => (
          <li
            key={entry.id}
            className="rounded-xl border border-palco-100 bg-white p-4 text-sm"
          >
            <p className="font-medium text-palco-900">
              {ACTION_LABELS[entry.action] ?? entry.action}
              {describe(entry.details) && (
                <span className="font-normal text-palco-500">
                  {" "}
                  · {describe(entry.details)}
                </span>
              )}
            </p>
            <p className="mt-1 break-all text-palco-600">{entry.actorEmail}</p>
            <p className="mt-1 text-xs text-palco-500">
              <span className="tabular-nums">
                {formatDate(entry.createdAt)}
              </span>
              {entry.organizationName && <> · {entry.organizationName}</>}
            </p>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-xl border border-palco-100 bg-white md:block">
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
              <tr
                key={entry.id}
                className="border-b border-palco-50 last:border-0"
              >
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-palco-600">
                  {formatDate(entry.createdAt)}
                </td>
                <td className="px-4 py-3">{entry.actorEmail}</td>
                <td className="px-4 py-3">
                  {ACTION_LABELS[entry.action] ?? entry.action}
                  {describe(entry.details) && (
                    <span className="text-palco-500">
                      {" "}
                      · {describe(entry.details)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{entry.organizationName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
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
