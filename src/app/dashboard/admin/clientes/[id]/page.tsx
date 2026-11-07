import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilLine } from "lucide-react";
import { getDb } from "@backend/db.mjs";
import { getOrganization } from "@backend/admin.mjs";
import { requireAdmin } from "@/lib/dashboard/session";
import { setMemberDisabledAction, setSuspendedAction, startImpersonationAction } from "../../actions";
import { Card, formatDate, Loading, PageTitle } from "../../../_components/shell";
import { SubmitButton } from "../../../_components/ui";
import { publicSiteHost } from "@/lib/dashboard/config";
import {
  AddMemberForm,
  CommissionForm,
  EditOrganizationForm,
  ResetMemberPasswordForm,
} from "../_forms";

export const metadata: Metadata = { title: "Cliente" };

type Props = PageProps<"/dashboard/admin/clientes/[id]">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  mustChangePassword: boolean;
  canScan: boolean;
  disabledAt: Date | null;
  lastLoginAt: Date | null;
};

function MemberRow({ member }: { member: Member }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-48 flex-1">
        <p className="font-medium text-palco-900">{member.email}</p>
        <p className="text-xs text-palco-500">
          {ROLE_LABELS[member.role] ?? member.role}
          {member.canScan ? " · Puede escanear QR" : ""}
          {member.disabledAt ? " · Desactivado" : ""}
          {member.mustChangePassword ? " · Pendiente de cambiar contraseña" : ""}
          {" · Último ingreso: "}
          {formatDate(member.lastLoginAt)}
        </p>
      </div>
      <ResetMemberPasswordForm userId={member.id} email={member.email} />
      <form action={setMemberDisabledAction}>
        <input type="hidden" name="userId" value={member.id} />
        <input type="hidden" name="disabled" value={String(!member.disabledAt)} />
        <SubmitButton
          variant="danger"
          confirm={member.disabledAt ? undefined : `¿Desactivar a ${member.email}? Se le cierra la sesión.`}
        >
          {member.disabledAt ? "Reactivar" : "Desactivar"}
        </SubmitButton>
      </form>
    </li>
  );
}

async function Content({ params }: { params: Props["params"] }) {
  const actor = await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const organization = await getOrganization(getDb(), actor, id);
  if (!organization) notFound();
  const suspended = Boolean(organization.suspendedAt);

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/clientes" className="text-palco-600 hover:underline">
          ← Clientes
        </Link>
      </p>
      <PageTitle
        action={
          <div className="flex flex-wrap gap-2">
            <form action={startImpersonationAction}>
              <input type="hidden" name="id" value={organization.id} />
              <SubmitButton variant="secondary">
                <PencilLine className="size-4" aria-hidden />
                Editar como el cliente
              </SubmitButton>
            </form>
            <form action={setSuspendedAction}>
              <input type="hidden" name="id" value={organization.id} />
              <input type="hidden" name="suspended" value={String(!suspended)} />
              <SubmitButton
                variant="danger"
                confirm={suspended ? undefined : `¿Suspender a ${organization.name}? Sus usuarios no van a poder entrar.`}
              >
                {suspended ? "Reactivar" : "Suspender"}
              </SubmitButton>
            </form>
          </div>
        }
      >
        {organization.name}
      </PageTitle>

      {suspended && (
        <p className="mb-4 rounded-lg bg-palco-100 px-4 py-3 text-sm text-palco-800">
          Cliente suspendido desde el {formatDate(organization.suspendedAt)}. Sus usuarios no pueden entrar al panel.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Datos">
            <p className="mb-4 text-sm text-palco-600">
              Página: <strong>{publicSiteHost(organization.slug)}</strong>
            </p>
            <EditOrganizationForm organization={organization} />
          </Card>
        </div>
        <Card title="Comisión de Nightowl">
          <CommissionForm id={organization.id} percent={Number(organization.commissionPercent)} />
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Usuarios">
          {organization.users.length === 0 ? (
            <p className="mb-4 text-sm text-palco-600">Todavía no tiene usuarios. Creá el primero para que pueda entrar.</p>
          ) : (
            <ul className="mb-4 divide-y divide-palco-50 text-sm">
              {organization.users.map((member: Member) => (
                <MemberRow key={member.id} member={member} />
              ))}
            </ul>
          )}
          <AddMemberForm organizationId={organization.id} />
        </Card>
      </div>
    </>
  );
}

export default function OrganizationPage({ params }: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={params} />
    </Suspense>
  );
}
