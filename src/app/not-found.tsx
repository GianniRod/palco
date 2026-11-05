import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";

// Página 404 para cualquier ruta que no existe.
export default function NotFound() {
  return (
    <div className="minimal flex min-h-dvh flex-col bg-white text-tinta">
      <header className="mx-auto flex w-full max-w-6xl items-center px-6 pt-6">
        <Link href="/" aria-label="Nightowl, inicio">
          <Logo className="h-7" color="var(--color-tinta)" />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-6 text-center">
        {/* 4 🦉 4: el búho hace de cero y ladea la cabeza buscando la página */}
        <p
          aria-label="404"
          className="subir flex items-center gap-[0.12em] text-[clamp(4.5rem,min(22vw,17vh),11rem)] font-semibold leading-none tracking-tight"
        >
          <span aria-hidden>4</span>
          <span
            aria-hidden
            className="buho-404 inline-block h-[0.86em] w-[0.62em] bg-tinta"
            style={{
              WebkitMask: "url(/buho.png) center / contain no-repeat",
              mask: "url(/buho.png) center / contain no-repeat",
            }}
          />
          <span aria-hidden>4</span>
        </p>

        <h1 className="subir mt-5 text-3xl font-semibold tracking-tight sm:text-4xl" style={{ animationDelay: "0.1s" }}>
          Esta fiesta no existe.
        </h1>
        <p className="subir mt-3 max-w-md text-base leading-relaxed sm:text-lg text-tinta/55" style={{ animationDelay: "0.2s" }}>
          La página que buscás se fue del boliche antes de tiempo. Puede que el link esté mal o que el evento
          ya haya terminado.
        </p>

        {/* Entrada rechazada en la puerta */}
        <div
          className="subir mt-6 flex w-full max-w-sm drop-shadow-[0_20px_30px_rgba(0,0,0,0.12)]"
          style={{ animationDelay: "0.3s" }}
          aria-hidden
        >
          <div className="ticket-izq relative flex-1 rounded-l-2xl border border-r-0 border-tinta/10 bg-papel p-5 text-left">
            <p className="text-[10px] uppercase tracking-[0.3em] text-tinta/40">Entrada</p>
            <p className="mt-1.5 text-lg font-semibold tracking-tight">Página no encontrada</p>
            <p className="mt-1 text-xs text-tinta/45">Error 404 · Puerta principal</p>
            <span
              className="sello absolute right-3 top-4 rounded-md border-2 border-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-red-600"
              style={{ animationDelay: "0.9s" }}
            >
              No válida
            </span>
          </div>
          <div className="ticket-der relative flex w-20 flex-col items-center justify-center rounded-r-2xl bg-palco-900 text-white">
            <span className="troquel absolute inset-y-4 left-0 w-0.5 text-white/30" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">Admite</span>
            <span className="text-2xl font-semibold">0</span>
          </div>
        </div>

        <div className="subir mt-6 flex flex-wrap justify-center gap-3" style={{ animationDelay: "0.4s" }}>
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full bg-tinta px-6 py-3 font-medium text-white transition hover:bg-tinta/85"
          >
            Volver al inicio
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/#demo"
            className="inline-flex items-center rounded-full border border-tinta/20 px-6 py-3 font-medium transition hover:bg-tinta hover:text-white"
          >
            Pedir una demo
          </Link>
        </div>
      </main>
    </div>
  );
}
