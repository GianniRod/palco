import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { logoutAction } from "../actions";
import { getCurrentSession } from "@/lib/dashboard/session";
import { MobileNav } from "./mobile-nav";

export function Loading() {
  return <p className="p-6 text-sm text-palco-500 md:p-10">Cargando…</p>;
}

async function Account() {
  const session = await getCurrentSession();
  if (!session) return null;
  return <p className="truncate px-3 text-xs text-palco-300">{session.email}</p>;
}

function AccountLinks() {
  return (
    <div className="space-y-1">
      <Suspense>
        <Account />
      </Suspense>
      <Link
        href="/cambiar-contrasena"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-palco-200 transition hover:bg-palco-900"
      >
        <KeyRound className="size-4" aria-hidden />
        Cambiar contraseña
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-palco-200 transition hover:bg-palco-900"
        >
          <LogOut className="size-4" aria-hidden />
          Salir
        </button>
      </form>
    </div>
  );
}

// Marco común de los dos paneles. Lo que lee la sesión queda detrás de un Suspense.
// En el celular el menú lateral pasa a una barra arriba con un botón que lo despliega.
// fabSpace: deja lugar abajo para un botón fijo (el "Escanear QR" del admin en el celular).
export function Shell({
  nav,
  banner,
  children,
  fabSpace = false,
}: {
  nav: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
  fabSpace?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <MobileNav nav={nav} account={<AccountLinks />} />
      <aside className="hidden shrink-0 flex-col gap-4 bg-palco-950 p-4 text-white md:sticky md:top-0 md:flex md:h-screen md:w-60">
        <Link href="/" className="px-3 py-2">
          <Logo className="h-6" />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">{nav}</nav>
        <AccountLinks />
      </aside>
      <div className="min-w-0 flex-1">
        {banner}
        <main className={`mx-auto w-full max-w-5xl p-4 md:p-10 ${fabSpace ? "pb-28 md:pb-10" : ""}`}>{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold text-palco-900">{children}</h1>
      {action}
    </div>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-palco-100 bg-white p-5">
      {title && <h2 className="mb-4 font-semibold text-palco-900">{title}</h2>}
      {children}
    </section>
  );
}

// Pantalla angosta y centrada del login y las de contraseña.
export function AuthCard({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-palco-950 p-4">
      <Logo className="mb-8 h-8" />
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-palco-900">{title}</h1>
        {intro && <p className="mt-1 text-sm text-palco-600">{intro}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </main>
  );
}

const dateFormat = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

export const formatDate = (date: Date | null | undefined) => (date ? dateFormat.format(date) : "—");
