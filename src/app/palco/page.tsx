import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

// Easter egg: memorial del primer nombre del proyecto. No tiene links desde la web
// y no se indexa en buscadores.
export const metadata: Metadata = {
  title: "En memoria a Palco",
  robots: { index: false, follow: false },
};

// Partículas de polvo dorado (posiciones fijas para que el render sea estable)
const dust = [
  { x: 12, y: 92, s: 3, dur: 16, delay: 0, dx: 30, a: 0.5 },
  { x: 22, y: 98, s: 2, dur: 13, delay: 3, dx: -20, a: 0.6 },
  { x: 31, y: 90, s: 4, dur: 18, delay: 6, dx: 40, a: 0.35 },
  { x: 40, y: 96, s: 2, dur: 12, delay: 1.5, dx: 15, a: 0.7 },
  { x: 47, y: 94, s: 3, dur: 15, delay: 8, dx: -35, a: 0.5 },
  { x: 53, y: 99, s: 2, dur: 14, delay: 4, dx: 25, a: 0.6 },
  { x: 59, y: 91, s: 3, dur: 17, delay: 10, dx: -15, a: 0.45 },
  { x: 66, y: 97, s: 2, dur: 13, delay: 2, dx: 30, a: 0.65 },
  { x: 74, y: 93, s: 4, dur: 19, delay: 5, dx: -40, a: 0.3 },
  { x: 82, y: 98, s: 2, dur: 12, delay: 7, dx: 20, a: 0.6 },
  { x: 89, y: 95, s: 3, dur: 16, delay: 11, dx: -25, a: 0.45 },
  { x: 36, y: 100, s: 2, dur: 15, delay: 9, dx: 10, a: 0.55 },
  { x: 63, y: 100, s: 2, dur: 14, delay: 12, dx: -10, a: 0.55 },
];

const delay = (s: number) => ({ "--delay": `${s}s` }) as CSSProperties;

export default function PalcoMemorial() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-palco-950 text-papel">
      {/* Luz del escenario */}
      <div aria-hidden className="foco pointer-events-none absolute inset-0" />

      {/* Polvo dorado */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {dust.map((d, i) => (
          <span
            key={i}
            className="polvo absolute rounded-full bg-dorado"
            style={
              {
                left: `${d.x}%`,
                top: `${d.y}%`,
                width: d.s,
                height: d.s,
                "--dur": `${d.dur}s`,
                "--delay": `${d.delay + 2}s`,
                "--dx": `${d.dx}px`,
                "--alpha": d.a,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Escenario */}
      <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="aparecer text-xs uppercase tracking-[0.4em] text-dorado/70" style={delay(2.4)}>
          En memoria
        </p>

        {/* Logo de Palco, en dorado */}
        <span
          role="img"
          aria-label="Palco"
          className="aparecer mt-8 inline-block h-14 bg-dorado sm:h-20"
          style={{
            ...delay(2.9),
            WebkitMask: "url(/palco/logo-palco.png) center / contain no-repeat",
            mask: "url(/palco/logo-palco.png) center / contain no-repeat",
            aspectRatio: "906 / 264",
          }}
        />

        <p className="aparecer mt-6 text-sm tabular-nums tracking-wide text-papel/60" style={delay(3.5)}>
          4 de noviembre de 2026 — 5 de noviembre de 2026
        </p>

        {/* Vela */}
        <div className="aparecer relative mt-12 flex flex-col items-center" style={delay(4)} aria-hidden>
          <span className="halo absolute -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(255,200,110,0.35),transparent_65%)]" />
          <span className="llama relative h-9 w-4" />
          <span className="h-1.5 w-0.5 bg-black/70" />
          <span className="h-20 w-8 rounded-t-sm bg-gradient-to-r from-[#e9dcc4] via-[#fbf4e6] to-[#d8c7a8] shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
        </div>

        <div className="mt-12 space-y-5 text-lg leading-relaxed text-papel/80 sm:text-xl">
          <p className="aparecer" style={delay(5)}>
            Palco fue el primer nombre del proyecto. Con él soñamos, diseñamos y escribimos las
            primeras líneas de código.
          </p>
          <p className="aparecer" style={delay(5.8)}>
            Lo tuvimos que cambiar por fines comerciales. Aunque nuestra marca cambió, el proyecto, la
            visión y las ganas de construir algo grande siguen intactos.
          </p>
        </div>

        {/* Última entrada: función única */}
        <div className="aparecer mt-14 flex w-full max-w-md drop-shadow-[0_20px_30px_rgba(0,0,0,0.45)]" style={delay(6.4)}>
          <div className="ticket-izq flex-1 rounded-l-2xl bg-papel p-5 text-left text-tinta">
            <p className="text-[10px] uppercase tracking-[0.3em] text-tinta/50">Función única</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">Palco</p>
            <p className="mt-1 text-xs text-tinta/60">4 nov 2026 · Sala llena de ideas</p>
          </div>
          <div className="ticket-der talon-cae relative flex w-24 flex-col items-center justify-center rounded-r-2xl bg-dorado p-3 text-palco-950">
            <span className="troquel absolute inset-y-4 left-0 w-0.5 text-palco-950/40" />
            <span className="text-[10px] uppercase tracking-[0.2em]">Admite</span>
            <span className="text-2xl font-semibold">1</span>
          </div>
        </div>

        <p className="aparecer mt-16 flex items-center gap-2 text-papel/60" style={delay(8.6)}>
          y así nació
          <Logo className="h-6 align-middle" color="var(--color-papel)" />
        </p>

        <p className="aparecer mt-3 text-2xl" style={delay(9.2)}>
          💔
        </p>

        <Link
          href="/"
          className="aparecer mt-12 rounded-full border border-papel/20 px-5 py-2 text-sm text-papel/70 transition hover:bg-papel hover:text-palco-950"
          style={delay(9.8)}
        >
          Volver a Nightowl
        </Link>
      </section>

      {/* Telón que se abre */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20 flex">
        <div className="telon telon-izq h-full w-1/2" />
        <div className="telon telon-der h-full w-1/2" />
      </div>
      {/* Bambalina superior */}
      <div
        aria-hidden
        className="telon pointer-events-none absolute inset-x-0 top-0 z-30 h-14 rounded-b-[40%_100%] shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
      />
    </main>
  );
}
