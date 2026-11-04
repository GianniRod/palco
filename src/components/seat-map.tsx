"use client";

import { useMemo, useState } from "react";
import { useInView, useInterval, useReducedMotion } from "./hooks";

// Sala ilustrativa: las filas se abren en abanico hacia el fondo, con dos pasillos.
const ROWS = [
  { label: "A", seats: 10 },
  { label: "B", seats: 12 },
  { label: "C", seats: 14 },
  { label: "D", seats: 16 },
  { label: "E", seats: 16 },
  { label: "F", seats: 18 },
  { label: "G", seats: 18 },
  { label: "H", seats: 20 },
];
const SIDE = 3; // butacas laterales antes/después de cada pasillo
const PRICE_PLATEA = 22000;
const PRICE_PULLMAN = 16000;
const STOP_AT = 0.94;

type Key = `${number}-${number}`;
const allSeats: Key[] = ROWS.flatMap((row, r) =>
  Array.from({ length: row.seats }, (_, s) => `${r}-${s}` as Key),
);

function initialSold(): Set<Key> {
  return new Set(
    allSeats.filter((k) => {
      const [r, s] = k.split("-").map(Number);
      return (r * 37 + s * 11 + r * s * 3) % 10 < (r < 3 ? 5 : 3);
    }),
  );
}

const price = (r: number) => (r < 5 ? PRICE_PLATEA : PRICE_PULLMAN);
const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function SeatMap() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [sold, setSold] = useState<Set<Key>>(initialSold);
  const [lastSold, setLastSold] = useState<Key | null>(null);
  const [picked, setPicked] = useState<Key[]>([]);
  const [pause, setPause] = useState(0);

  useInterval(
    () => {
      if (pause > 0) {
        setPause((p) => p - 1);
        if (pause === 1) {
          setSold(initialSold());
          setLastSold(null);
        }
        return;
      }
      const free = allSeats.filter((k) => !sold.has(k) && !picked.includes(k));
      if (free.length === 0 || sold.size / allSeats.length >= STOP_AT) {
        setPause(6);
        return;
      }
      const k = free[Math.floor(Math.random() * free.length)];
      setSold((prev) => new Set(prev).add(k));
      setLastSold(k);
    },
    520,
    inView && !reduced,
  );

  const total = useMemo(
    () =>
      [...sold].reduce((acc, k) => acc + price(Number(k.split("-")[0])), 0),
    [sold],
  );

  function toggle(k: Key) {
    if (sold.has(k)) return;
    setPicked((p) =>
      p.includes(k) ? p.filter((x) => x !== k) : [...p, k].slice(-4),
    );
  }

  const pickedLabel = picked
    .map((k) => {
      const [r, s] = k.split("-").map(Number);
      return `${ROWS[r].label}${s + 1}`;
    })
    .join(" · ");
  const pickedTotal = picked.reduce(
    (acc, k) => acc + price(Number(k.split("-")[0])),
    0,
  );

  return (
    <div ref={ref} className="relative">
      {/* Escenario */}
      <div className="relative mx-auto h-14 w-[78%] overflow-hidden rounded-b-[50%] border-b-2 border-dorado/60 bg-gradient-to-b from-palco-950/0 to-palco-950/70">
        <span className="absolute inset-x-0 bottom-2 text-center font-serif text-xs italic tracking-[0.35em] text-dorado/80">
          escenario
        </span>
      </div>

      <div className="relative mt-8 flex gap-3 sm:gap-6">
        <Palcos side="izq" />

        <div className="flex flex-1 flex-col items-center gap-[5px] sm:gap-[7px]">
          {ROWS.map((row, r) => (
            <div key={row.label} className="flex items-center">
              <span className="mr-2 w-3 font-serif text-[10px] italic text-white/35">
                {row.label}
              </span>
              {Array.from({ length: row.seats }, (_, s) => {
                const k = `${r}-${s}` as Key;
                const half = (row.seats - 1) / 2;
                const dx = (s - half) / half; // -1 … 1
                const isSold = sold.has(k);
                const isPicked = picked.includes(k);
                const aisle = s === SIDE - 1 || s === row.seats - SIDE - 1;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggle(k)}
                    disabled={isSold}
                    aria-label={`Fila ${row.label}, butaca ${s + 1}${isSold ? ", vendida" : ""}`}
                    aria-pressed={isPicked}
                    style={{
                      transform: `translateY(${-dx * dx * (5 + r * 0.6)}px) rotate(${dx * 9}deg)`,
                    }}
                    className={`relative mx-px h-[9px] w-[9px] rounded-t-[5px] rounded-b-[2px] transition-colors duration-500 sm:mx-[2px] sm:h-[14px] sm:w-[14px] ${
                      aisle ? "mr-2.5 sm:mr-4" : ""
                    } ${
                      isPicked
                        ? "bg-dorado shadow-[0_0_14px_rgba(217,178,111,0.75)]"
                        : isSold
                          ? `bg-palco-500/45 ${lastSold === k ? "butaca-vendida-ahora" : ""}`
                          : "cursor-pointer bg-white/80 hover:bg-dorado/80"
                    }`}
                  />
                );
              })}
              <span className="ml-2 w-3 text-right font-serif text-[10px] italic text-white/35">
                {row.label}
              </span>
            </div>
          ))}
        </div>

        <Palcos side="der" />
      </div>

      {/* Barra inferior */}
      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden border-y border-white/15 text-white sm:grid-cols-3">
        <Stat
          label="Vendidas"
          value={`${sold.size}`}
          sub={`de ${allSeats.length}`}
        />
        <Stat label="Recaudado" value={pesos.format(total)} />
        <div className="col-span-2 flex items-center justify-between gap-3 py-3 sm:col-span-1 sm:justify-end sm:pl-4">
          {picked.length > 0 ? (
            <>
              <div className="sm:text-right">
                <p className="text-[11px] uppercase tracking-widest text-white/45">
                  Tu elección
                </p>
                <p className="font-serif text-lg">{pickedLabel}</p>
              </div>
              <span className="rounded-full bg-dorado px-4 py-2 text-sm font-medium text-palco-950">
                {pesos.format(pickedTotal)}
              </span>
            </>
          ) : (
            <p className="text-sm text-white/55 sm:text-right">
              Tocá una butaca libre para elegirla.
            </p>
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-white/35">
        Simulación de venta en vivo
      </p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="py-3">
      <p className="text-[11px] uppercase tracking-widest text-white/45">{label}</p>
      <p className="font-serif text-2xl tabular-nums">
        {value}
        {sub && <span className="ml-1.5 font-sans text-sm text-white/45">{sub}</span>}
      </p>
    </div>
  );
}

function Palcos({ side }: { side: "izq" | "der" }) {
  return (
    <div
      aria-hidden="true"
      className={`hidden flex-col gap-3 pt-1 sm:flex ${side === "izq" ? "-rotate-6" : "rotate-6"}`}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex gap-1 rounded-md border border-dorado/40 bg-palco-950/40 p-1.5"
        >
          <span className="h-3 w-3 rounded-t-[5px] rounded-b-[2px] bg-palco-500/45" />
          <span
            className={`h-3 w-3 rounded-t-[5px] rounded-b-[2px] ${i === 1 ? "bg-white/80" : "bg-palco-500/45"}`}
          />
        </div>
      ))}
      <span className="text-center font-serif text-[10px] italic text-dorado/70">
        palcos
      </span>
    </div>
  );
}
