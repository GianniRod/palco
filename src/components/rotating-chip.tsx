"use client";

import { useState } from "react";
import { Armchair, Ticket } from "lucide-react";
import { useInterval, useReducedMotion } from "./hooks";


/** Chip dentro del título que rota entre tipos de entrada o ubicación. */
export function RotatingChip({
  options,
  icon = "ticket",
  tone = "light",
}: {
  options: string[];
  icon?: "ticket" | "seat";
  /** light: chip claro (para fondos oscuros). dark: chip oscuro (para fondos claros). */
  tone?: "light" | "dark";
}) {
  const Icon = icon === "seat" ? Armchair : Ticket;
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);

  useInterval(() => setI((n) => (n + 1) % options.length), 2200, !reduced);

  return (
    <span className={`relative mx-1 inline-flex -translate-y-[0.06em] items-center gap-[0.3em] rounded-[0.3em] px-[0.35em] py-[0.14em] leading-none align-middle text-[0.8em] ${
        tone === "dark"
          ? "bg-palco-950 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]"
          : "bg-dorado text-palco-950 shadow-[0_8px_30px_-8px_rgba(255,255,255,0.35)]"
      }`}>
      <Icon className="h-[0.8em] w-[0.8em] shrink-0" strokeWidth={2.4} />
      {/* Todas las opciones ocupan la misma celda para que el ancho no salte */}
      <span className="inline-grid justify-items-center overflow-hidden leading-[1.1]">
        {options.map((o, n) => (
          <span
            key={o}
            aria-hidden={n !== i}
            className={`col-start-1 row-start-1 whitespace-nowrap transition-all duration-500 ${
              n === i ? "translate-y-0 opacity-100" : n === (i + options.length - 1) % options.length ? "-translate-y-full opacity-0" : "translate-y-full opacity-0"
            }`}
          >
            {o}
          </span>
        ))}
      </span>
    </span>
  );
}
