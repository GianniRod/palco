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
const SIDE = 3; // butacas laterales antes de cada pasillo
const PRICE_PLATEA = 22000;
const PRICE_PULLMAN = 16000;
const STOP_AT = 0.94;
const TICK_MS = 900;

type Key = `${number}-${number}`;
const allSeats: Key[] = ROWS.flatMap((row, r) =>
  Array.from({ length: row.seats }, (_, s) => `${r}-${s}` as Key),
);

function initialSold(): Set<Key> {
  return new Set(
    allSeats.filter((k) => {
      const [r, s] = parse(k);
      return (r * 37 + s * 11 + r * s * 3) % 10 < (r < 3 ? 5 : 3);
    }),
  );
}

function parse(k: Key) {
  return k.split("-").map(Number) as [number, number];
}
const sector = (r: number) => (r < 5 ? "Platea" : "Pullman");
const price = (r: number) => (r < 5 ? PRICE_PLATEA : PRICE_PULLMAN);
const seatName = (k: Key) => {
  const [r, s] = parse(k);
  return `${ROWS[r].label}${s + 1}`;
};
const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

type Sale = { id: number; key: Key; qty: number };

export function SeatMap() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [sold, setSold] = useState<Set<Key>>(initialSold);
  const [feed, setFeed] = useState<Sale[]>([]);
  const [picked, setPicked] = useState<Key[]>([]);
  const [pause, setPause] = useState(0);
  const [tick, setTick] = useState(0);

  useInterval(
    () => {
      setTick((t) => t + 1);
      if (pause > 0) {
        setPause((p) => p - 1);
        if (pause === 1) {
          setSold(initialSold());
          setFeed([]);
        }
        return;
      }
      const free = allSeats.filter((k) => !sold.has(k) && !picked.includes(k));
      if (free.length < 2 || sold.size / allSeats.length >= STOP_AT) {
        setPause(4);
        return;
      }
      // A veces se compran dos butacas juntas
      const k = free[Math.floor(Math.random() * free.length)];
      const [r, s] = parse(k);
      const pair = `${r}-${s + 1}` as Key;
      const keys = Math.random() < 0.4 && free.includes(pair) ? [k, pair] : [k];
      setSold((prev) => {
        const next = new Set(prev);
        keys.forEach((x) => next.add(x));
        return next;
      });
      setFeed((f) => [{ id: tick, key: k, qty: keys.length }, ...f].slice(0, 5));
    },
    TICK_MS,
    inView && !reduced,
  );

  const total = useMemo(
    () => [...sold].reduce((acc, k) => acc + price(parse(k)[0]), 0),
    [sold],
  );
  const recent = new Set(
    feed.slice(0, 2).flatMap((s) => {
      const [r, c] = parse(s.key);
      return s.qty === 2 ? [s.key, `${r}-${c + 1}`] : [s.key];
    }),
  );

  function toggle(k: Key) {
    if (sold.has(k)) return;
    setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k].slice(-4)));
  }

  const pct = Math.round((sold.size / allSeats.length) * 100);
  const pickedTotal = picked.reduce((acc, k) => acc + price(parse(k)[0]), 0);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-2xl border border-white/10 bg-palco-950/60 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)] backdrop-blur"
    >
      {/* Barra superior del panel */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-medium text-white">Sala principal</span>
          <span className="text-white/40">Sábado 14 · 21:00</span>
        </div>
        <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/45">
          Simulación
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_250px]">
        {/* Plano */}
        <div className="flex flex-col justify-center px-4 pb-6 pt-6 sm:px-8">
          <div className="mx-auto h-9 w-[70%] rounded-b-[50%] border-b-2 border-white/25 bg-gradient-to-b from-transparent to-white/[0.04]">
            <span className="block pt-3 text-center text-[10px] font-medium uppercase tracking-[0.3em] text-white/35">
              Escenario
            </span>
          </div>

          <div className="mt-7 flex justify-center gap-3 sm:gap-6">
            <Palcos rotate="-rotate-6" />
            <div className="flex flex-col items-center gap-[5px] sm:gap-[7px]">
              {ROWS.map((row, r) => (
                <div key={row.label} className="flex items-center">
                  <span className="mr-2 w-3 text-[10px] text-white/30">{row.label}</span>
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
                              ? `bg-palco-500/40 ${recent.has(k) ? "butaca-vendida-ahora" : ""}`
                              : "cursor-pointer bg-white/80 hover:bg-dorado/80"
                        }`}
                      />
                    );
                  })}
                  <span className="ml-2 w-3 text-right text-[10px] text-white/30">{row.label}</span>
                </div>
              ))}
            </div>
            <Palcos rotate="rotate-6" />
          </div>

          <div className="mt-7 flex min-h-10 flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-white/45">
            {picked.length > 0 ? (
              <span className="flex items-center gap-3 text-sm text-white">
                Elegiste <strong className="font-semibold">{picked.map(seatName).join(", ")}</strong>
                <span className="rounded-full bg-dorado px-3 py-1 text-xs font-semibold text-palco-950">
                  {pesos.format(pickedTotal)}
                </span>
              </span>
            ) : (
              <>
                <Legend className="bg-white/80" label="Libre" />
                <Legend className="bg-palco-500/40" label="Vendida" />
                <Legend className="bg-dorado" label="Tu elección" />
                <span className="text-white/35">· Tocá una butaca libre</span>
              </>
            )}
          </div>
        </div>

        {/* Lateral: métricas y ventas en vivo */}
        <aside className="border-t border-white/10 p-5 text-white lg:border-l lg:border-t-0">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-white/40">Ocupación</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {pct}%
                <span className="ml-1.5 text-sm font-normal text-white/40">
                  {sold.size}/{allSeats.length}
                </span>
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-dorado transition-[width] duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-white/40">Recaudado</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{pesos.format(total)}</p>
            </div>
          </div>

          <p className="mt-6 text-[11px] uppercase tracking-widest text-white/40">Últimas ventas</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {feed.length === 0 && <li className="text-white/30">Esperando ventas…</li>}
            {feed.map((sale, i) => {
              const [r, c] = parse(sale.key);
              return (
                <li
                  key={sale.id}
                  className="entra-log flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2"
                  style={{ opacity: 1 - i * 0.16 }}
                >
                  <span>
                    <span className="font-medium">
                      {sale.qty === 2
                        ? `${seatName(sale.key)}–${c + 2}`
                        : seatName(sale.key)}
                    </span>
                    <span className="ml-2 text-white/40">{sector(r)}</span>
                  </span>
                  <span className="tabular-nums text-white/60">
                    {pesos.format(price(r) * sale.qty)}
                  </span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function Palcos({ rotate }: { rotate: string }) {
  return (
    <div aria-hidden="true" className={`hidden flex-col gap-3 pt-1 md:flex ${rotate}`}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-1 rounded-md border border-white/15 p-1.5">
          <span className="h-3 w-3 rounded-t-[5px] rounded-b-[2px] bg-palco-500/40" />
          <span
            className={`h-3 w-3 rounded-t-[5px] rounded-b-[2px] ${i === 1 ? "bg-white/80" : "bg-palco-500/40"}`}
          />
        </div>
      ))}
      <span className="text-center text-[10px] uppercase tracking-widest text-white/30">Palcos</span>
    </div>
  );
}
