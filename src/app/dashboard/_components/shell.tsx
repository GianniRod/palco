import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { logoutAction } from "../actions";
import { getCurrentSession } from "@/lib/dashboard/session";

export function Loading() {
  return <p className="p-6 text-sm text-palco-500 md:p-10">Cargando…</p>;
}

async function Account() {
  const session = await getCurrentSession();
  if (!session) return null;
  return <p className="truncate px-3 text-xs text-palco-300">{session.email}</p>;
}

// Marco común de los dos paneles. Lo que lee la sesión queda detrás de un Suspense.
export function Shell({ nav, banner, children }: { nav: ReactNode; banner?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 bg-palco-950 p-4 text-white md:sticky md:top-0 md:h-screen md:w-60">
        <Link href="/" className="px-3 py-2">
          <Logo className="h-6" />
        </Link>
        <nav className="flex gap-1 overflow-x-auto md:flex-1 md:flex-col md:overflow-visible">{nav}</nav>
        <div className="hidden space-y-1 md:block">
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
        <div className="flex items-center gap-4 px-3 text-sm text-palco-200 md:hidden">
          <Link href="/cambiar-contrasena" className="underline">
            Cambiar contraseña
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="underline">
              Salir
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        {banner}
        <main className="mx-auto w-full max-w-5xl p-4 md:p-10">{children}</main>
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
      <div className="w-full max-w-sm rounded-xl bg-papel p-6 shadow-xl">
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
