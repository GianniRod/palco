import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { LogOut, Smartphone } from "lucide-react";
import { getDb } from "@backend/db.mjs";
import { getScanAccess } from "@backend/qr.mjs";
import { Logo } from "@/components/logo";
import { getCurrentSession } from "@/lib/dashboard/session";
import { DASHBOARD_URL } from "@/lib/dashboard/config";
import { logoutAction } from "../dashboard/actions";
import { Scanner } from "./_scanner";

function Frame({ email, children }: { email?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-palco-950 text-white">
      <header className="flex items-center justify-between px-5 py-4">
        <Logo className="h-5" />
        {email && (
          <form action={logoutAction}>
            <button type="submit" className="flex items-center gap-1.5 text-sm text-white/60">
              <LogOut className="size-4" aria-hidden /> Salir
            </button>
          </form>
        )}
      </header>
      <main className="flex flex-1 flex-col px-5 pb-8">{children}</main>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="m-auto max-w-sm text-center">
      <p className="text-2xl font-semibold">{title}</p>
      <div className="mt-3 text-white/65">{children}</div>
    </div>
  );
}

async function Content() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  if (session.mustChangePassword) {
    return (
      <Frame email={session.email}>
        <Notice title="Primero cambiá tu contraseña">
          Entrá a{" "}
          <a href={DASHBOARD_URL} className="underline">
            {DASHBOARD_URL.replace(/^https?:\/\//, "")}
          </a>{" "}
          con tu contraseña inicial, elegí una nueva y volvé acá.
        </Notice>
      </Frame>
    );
  }

  const access = await getScanAccess(getDb(), session);
  if (!access) {
    return (
      <Frame email={session.email}>
        <Notice title="Tu cuenta no puede escanear">
          Pedile al dueño de la cuenta que te habilite <strong>Puede escanear QR</strong> en su panel, en Equipo.
        </Notice>
      </Frame>
    );
  }

  return (
    <Frame email={session.email}>
      {/* Solo en el celular: en la compu no hay cámara trasera para apuntar a la entrada */}
      <div className="flex flex-1 flex-col md:hidden">
        <div className="mb-6 mt-2">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Escaneando para</p>
          <p className="mt-1 text-xl font-semibold">
            {access.all ? "Todos los clientes (admin)" : access.organizationName}
          </p>
          <p className="mt-0.5 truncate text-sm text-white/45">{session.email}</p>
        </div>
        <div className="mt-auto">
          <Scanner light />
        </div>
        <p className="mt-4 text-center text-xs text-white/35">
          {access.all
            ? "Como admin de Nightowl podés validar entradas de cualquier evento."
            : `Solo se validan entradas de los eventos de ${access.organizationName}.`}
        </p>
      </div>
      <div className="hidden flex-1 md:flex">
        <Notice title="Abrilo desde el celular">
          <p className="flex items-center justify-center gap-2">
            <Smartphone className="size-5" aria-hidden /> El escáner usa la cámara del teléfono.
          </p>
        </Notice>
      </div>
    </Frame>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-palco-950" />}>
      <Content />
    </Suspense>
  );
}
