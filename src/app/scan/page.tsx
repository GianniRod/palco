import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, LogOut, Smartphone } from "lucide-react";
import { getDb } from "@backend/db.mjs";
import { getScanAccess, getScanEvent, listScanEvents } from "@backend/qr.mjs";
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

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type ScanEvent = { id: string; title: string; organizationName: string; nextAt: Date | null };

const eventDate = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Argentina/Buenos_Aires",
});

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
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

  // Antes de escanear se elige el evento: un QR de un evento no sirve para otro.
  // Un usuario de cliente tiene que elegir uno de los suyos; un admin también puede elegir "cualquier evento".
  const db = getDb();
  const events: ScanEvent[] = await listScanEvents(db, session);
  const requested = typeof params.evento === "string" ? params.evento : "";
  const choosing = params.elegir === "1";
  let event: ScanEvent | null = null;
  let any = false;
  if (!choosing && requested === "todos" && access.all) any = true;
  else if (!choosing && requested) {
    const found = await getScanEvent(db, session, requested);
    event = found ? (events.find((item) => item.id === found.id) ?? { id: found.id, title: found.title, organizationName: "", nextAt: null }) : null;
  } else if (!choosing && !access.all && events.length === 1) {
    event = events[0];
  }
  const ready = any || event !== null;

  return (
    <Frame email={session.email}>
      {/* Solo en el celular: en la compu no hay cámara trasera para apuntar a la entrada */}
      <div className="flex flex-1 flex-col md:hidden">
        {ready ? (
          <>
            <div className="mb-6 mt-2">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Escaneando</p>
              <p className="mt-1 text-xl font-semibold [overflow-wrap:anywhere]">{any ? "Cualquier evento (admin)" : event!.title}</p>
              <p className="mt-0.5 truncate text-sm text-white/45">
                {any ? "Todos los clientes" : access.all ? event!.organizationName : access.organizationName} · {session.email}
              </p>
              <Link href="/?elegir=1" className="mt-3 inline-block rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80">
                Cambiar evento
              </Link>
            </div>
            <div className="mt-auto">
              <Scanner key={any ? "todos" : event!.id} light eventId={any ? null : event!.id} />
            </div>
            <p className="mt-4 text-center text-xs text-white/35">
              {any
                ? "Como admin de Nightowl validás entradas de cualquier evento."
                : "Solo se validan las entradas de este evento: las de otro evento salen como inválidas."}
            </p>
          </>
        ) : (
          <div className="mt-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              {access.all ? "Todos los clientes (admin)" : access.organizationName}
            </p>
            <p className="mt-1 text-2xl font-semibold">¿Qué evento vas a escanear?</p>
            {requested && !choosing && <p className="mt-2 text-sm text-amber-300">Ese evento no está disponible. Elegí otro.</p>}
            <ul className="mt-5 space-y-2">
              {access.all && (
                <li>
                  <Link href="/?evento=todos" className="flex items-center justify-between gap-3 rounded-xl border border-white/15 px-4 py-3.5">
                    <span>
                      <span className="block font-semibold">Cualquier evento</span>
                      <span className="block text-sm text-white/50">Solo admins: valida entradas de todos los clientes</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-white/40" aria-hidden />
                  </Link>
                </li>
              )}
              {events.map((item) => (
                <li key={item.id}>
                  <Link href={`/?evento=${item.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.06] px-4 py-3.5">
                    <span className="min-w-0">
                      <span className="block font-semibold [overflow-wrap:anywhere]">{item.title}</span>
                      <span className="block text-sm capitalize text-white/50">
                        {[access.all ? item.organizationName : null, item.nextAt ? eventDate.format(new Date(item.nextAt)) : "Sin próxima función"]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-white/40" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            {events.length === 0 && !access.all && (
              <p className="mt-4 text-white/60">Todavía no hay eventos para escanear. Cuando el organizador cree uno, aparece acá.</p>
            )}
          </div>
        )}
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

export default function ScanPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-palco-950" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
