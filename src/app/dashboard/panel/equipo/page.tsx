import { Suspense } from "react";
import type { Metadata } from "next";
import { ScanLine } from "lucide-react";
import { getDb } from "@backend/db.mjs";
import { listTeam } from "@backend/team.mjs";
import { requireTenant } from "@/lib/dashboard/session";
import { SCAN_URL } from "@/lib/dashboard/config";
import { Card, formatDate, Loading, PageTitle } from "../../_components/shell";
import { SubmitButton } from "../../_components/ui";
import { setTeamMemberScanAction } from "./actions";
import { AddTeamMemberForm } from "./_forms";

export const metadata: Metadata = { title: "Equipo" };

const ROLE_LABELS: Record<string, string> = {
  owner: "Dueño",
  editor: "Editor",
  ventas: "Solo ventas",
  portero: "Portero",
};

type Member = {
  id: string;
  email: string;
  role: string;
  canScan: boolean;
  mustChangePassword: boolean;
  disabledAt: Date | null;
  lastLoginAt: Date | null;
};

async function Content() {
  const tenant = await requireTenant();
  const members: Member[] = await listTeam(getDb(), tenant);
  const canManage = tenant.role === "owner" || tenant.role === "soporte";
  const scanHost = SCAN_URL.replace(/^https?:\/\//, "");

  return (
    <>
      <PageTitle>Equipo</PageTitle>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-palco-100 bg-white p-4 text-sm text-palco-700">
        <ScanLine className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>
          Quien tenga <strong>Puede escanear QR</strong> valida las entradas en la puerta desde el celular, en{" "}
          <a href={SCAN_URL} target="_blank" rel="noopener" className="font-medium underline">
            {scanHost}
          </a>
          , con su mismo email y contraseña. Solo puede validar entradas de los eventos de{" "}
          <strong>{tenant.organization.name}</strong>.
        </p>
      </div>

      <Card title="Cuentas">
        {members.length === 0 ? (
          <p className="text-sm text-palco-600">Todavía no hay cuentas.</p>
        ) : (
          <ul className="divide-y divide-palco-50 text-sm">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-48 flex-1">
                  <p className="break-all font-medium text-palco-900">{m.email}</p>
                  <p className="text-xs text-palco-500">
                    {ROLE_LABELS[m.role] ?? m.role}
                    {m.disabledAt ? " · Desactivada" : ""}
                    {m.mustChangePassword ? " · Todavía no entró" : ` · Último ingreso: ${formatDate(m.lastLoginAt)}`}
                  </p>
                </div>
                {m.canScan ? (
                  <span className="rounded-full bg-palco-900 px-2.5 py-1 text-xs font-medium text-white">
                    Puede escanear
                  </span>
                ) : (
                  <span className="rounded-full bg-palco-100 px-2.5 py-1 text-xs font-medium text-palco-600">
                    No escanea
                  </span>
                )}
                {canManage && m.role !== "portero" && (
                  <form action={setTeamMemberScanAction}>
                    <input type="hidden" name="userId" value={m.id} />
                    <input type="hidden" name="canScan" value={String(!m.canScan)} />
                    <SubmitButton variant="secondary">{m.canScan ? "Quitar escaneo" : "Permitir escanear"}</SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {canManage ? (
        <div className="mt-6">
          <Card title="Crear una cuenta">
            <p className="mb-4 text-sm text-palco-600">
              Para tus porteros, tu equipo de ventas o quien te ayude con la web. Le pasás el email y la contraseña
              inicial: al entrar por primera vez elige una propia.
            </p>
            <AddTeamMemberForm />
          </Card>
        </div>
      ) : (
        <p className="mt-6 text-sm text-palco-600">Solo el dueño de la cuenta puede crear cuentas y cambiar permisos.</p>
      )}
    </>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}
