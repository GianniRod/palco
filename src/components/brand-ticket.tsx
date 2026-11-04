"use client";

import { useState } from "react";
import { FakeQr } from "./qr";
import { useInView, useInterval, useReducedMotion } from "./hooks";

// Ejemplos ficticios para mostrar que la entrada adopta la marca de cada cliente.
const themes = [
  {
    id: "teatro",
    tab: "Teatro",
    venue: "Tu Teatro",
    show: "Función de gala",
    bg: "#480A17",
    fg: "#FBF3F4",
    accent: "#D9B26F",
    serif: true,
  },
  {
    id: "sala",
    tab: "Sala independiente",
    venue: "Tu Sala",
    show: "Temporada de otoño",
    bg: "#123236",
    fg: "#EAF4F1",
    accent: "#F2C14E",
    serif: true,
  },
  {
    id: "fiesta",
    tab: "Fiesta",
    venue: "TU FIESTA",
    show: "Noche de apertura",
    bg: "#16112A",
    fg: "#F5F0FF",
    accent: "#FF5CA8",
    serif: false,
  },
  {
    id: "productora",
    tab: "Productora",
    venue: "Tu Productora",
    show: "Gira nacional",
    bg: "#EFE6D2",
    fg: "#1E1A14",
    accent: "#C2410C",
    serif: false,
  },
];

export function BrandTicket() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const t = themes[i];

  useInterval(() => setI((n) => (n + 1) % themes.length), 2800, inView && auto && !reduced);

  const font = t.serif ? "font-serif" : "font-sans font-semibold tracking-tight";
  const colors = "transition-colors duration-700";

  return (
    <div ref={ref}>
      <div className="flex justify-center [perspective:1200px]">
        <div
          key={t.id}
          className="group flex w-full max-w-lg drop-shadow-[0_30px_40px_rgba(31,3,10,0.35)] [animation:subir_0.7s_cubic-bezier(0.2,0.7,0.2,1)_both]"
        >
          <div
            className={`ticket-izq flex-1 rounded-l-2xl p-6 sm:p-7 ${colors}`}
            style={{ background: t.bg, color: t.fg }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-60">
              {t.venue} presenta
            </p>
            <p className={`mt-3 text-3xl leading-none sm:text-4xl ${font}`}>{t.show}</p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
              <Field label="Fecha" value="Sáb 14" />
              <Field label="Hora" value="21:00" />
              <Field label="Ubicación" value="D · 7" />
            </div>
            <div className="mt-6 h-1 w-16 rounded-full" style={{ background: t.accent }} />
          </div>
          <div
            className={`ticket-der talon relative flex w-32 flex-col items-center justify-center gap-2 rounded-r-2xl p-4 sm:w-36 ${colors}`}
            style={{ background: t.bg, color: t.fg }}
          >
            <span
              className="troquel absolute inset-y-4 left-0 w-0.5 opacity-40"
              style={{ color: t.fg }}
            />
            <div className="rounded-md bg-white p-1.5 text-black">
              <FakeQr seed={i + 2} className="h-16 w-16 sm:h-20 sm:w-20" />
            </div>
            <span className="text-[10px] tracking-widest opacity-60">N.º 000{i + 1}48</span>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {themes.map((th, n) => (
          <button
            key={th.id}
            type="button"
            onClick={() => {
              setI(n);
              setAuto(false);
            }}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              n === i
                ? "border-palco-800 bg-palco-800 text-white"
                : "border-palco-800/20 text-palco-800 hover:border-palco-800/60"
            }`}
          >
            <span
              className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
              style={{ background: th.accent }}
            />
            {th.tab}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.2em] opacity-50">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
