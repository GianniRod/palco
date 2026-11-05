"use client";

import { useState } from "react";
import { useInView, useInterval, useReducedMotion } from "./hooks";

// Panel ilustrativo de una fiesta: los lotes se van agotando y se abre el siguiente.

type Item = { id: string; name: string; price: number; cap: number; unit?: string };

const LOTS: Item[] = [
  { id: "p1", name: "Preventa 1", price: 8000, cap: 150 },
  { id: "p2", name: "Preventa 2", price: 11000, cap: 200 },
  { id: "gen", name: "General", price: 15000, cap: 250 },
];
const EXTRAS: Item[] = [
  { id: "vip", name: "VIP", price: 25000, cap: 60 },
  { id: "mesa", name: "Mesa para 6", price: 180000, cap: 12, unit: "mesas" },
];
const ALL = [...LOTS, ...EXTRAS];
const SOURCES = ["Web", "RRPP · Sofi", "RRPP · Nico", "Instagram", "RRPP · Tomi"];
const TICK_MS = 750;
const RESET_AT = 0.8; // reinicia cuando General llega al 80%

const initialSold = (): Record<string, number> => ({ p1: 138, p2: 0, gen: 0, vip: 21, mesa: 5 });

type Sale = { id: number; item: string; qty: number; source: string };

const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function LotsPanel() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [sold, setSold] = useState(initialSold);
  const [feed, setFeed] = useState<Sale[]>([]);
  const [tick, setTick] = useState(0);
  const [pause, setPause] = useState(0);

  const current = LOTS.find((l) => sold[l.id] < l.cap) ?? LOTS[LOTS.length - 1];

  useInterval(
    () => {
      setTick((t) => t + 1);
      if (pause > 0) {
        if (pause === 1) {
          setSold(initialSold());
          setFeed([]);
        }
        setPause((p) => p - 1);
        return;
      }
      if (sold.gen / LOTS[2].cap >= RESET_AT) {
        setPause(5);
        return;
      }
      // La mayoría compra el lote vigente; a veces VIP o una mesa.
      const r = Math.random();
      let item: Item = current;
      if (r < 0.14 && sold.vip < EXTRAS[0].cap) item = EXTRAS[0];
      else if (r < 0.19 && sold.mesa < EXTRAS[1].cap) item = EXTRAS[1];
      const qty = item.id === "mesa" ? 1 : 1 + Math.floor(Math.random() * 4);
      const room = item.cap - sold[item.id];
      const take = Math.min(qty, room);
      if (take <= 0) return;
      setSold((s) => ({ ...s, [item.id]: s[item.id] + take }));
      setFeed((f) =>
        [{ id: tick, item: item.id, qty: take, source: SOURCES[Math.floor(Math.random() * SOURCES.length)] }, ...f].slice(0, 5),
      );
    },
    TICK_MS,
    inView && !reduced,
  );

  const totalTickets = LOTS.reduce((a, l) => a + sold[l.id], 0) + sold.vip + sold.mesa * 6;
  const capacity = LOTS.reduce((a, l) => a + l.cap, 0) + EXTRAS[0].cap + EXTRAS[1].cap * 6;
  const revenue = ALL.reduce((a, it) => a + sold[it.id] * it.price, 0);
  const byId = Object.fromEntries(ALL.map((it) => [it.id, it]));

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-white shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="font-medium">Fiesta Aniversario</span>
          <span className="text-white/40">Sáb 19 · 00:30</span>
        </div>
        <span className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-white/40">Simulación</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px]">
        {/* Lotes */}
        <div className="p-5 sm:p-7">
          <p className="text-[11px] uppercase tracking-widest text-white/40">Lotes</p>
          <ul className="mt-3 divide-y divide-white/10 border-y border-white/10">
            {LOTS.map((l) => {
              const n = sold[l.id];
              const soldOut = n >= l.cap;
              const live = l.id === current.id && !soldOut;
              const upcoming = !soldOut && !live;
              return (
                <Row
                  key={l.id}
                  item={l}
                  n={n}
                  state={soldOut ? "agotado" : live ? "venta" : upcoming ? "proximo" : "venta"}
                />
              );
            })}
          </ul>

          <p className="mt-7 text-[11px] uppercase tracking-widest text-white/40">VIP y mesas</p>
          <ul className="mt-3 divide-y divide-white/10 border-y border-white/10">
            {EXTRAS.map((e) => (
              <Row key={e.id} item={e} n={sold[e.id]} state={sold[e.id] >= e.cap ? "agotado" : "venta"} />
            ))}
          </ul>
        </div>

        {/* Métricas y ventas */}
        <aside className="border-t border-white/10 p-5 lg:border-l lg:border-t-0">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-white/40">Vendidas</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {totalTickets}
                <span className="ml-1.5 text-sm font-normal text-white/40">/ {capacity}</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-white/40">Recaudado</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{pesos.format(revenue)}</p>
            </div>
          </div>

          <p className="mt-6 text-[11px] uppercase tracking-widest text-white/40">Últimas ventas</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {feed.length === 0 && <li className="text-white/30">Esperando ventas…</li>}
            {feed.map((s, i) => {
              const it = byId[s.item];
              return (
                <li
                  key={s.id}
                  className="entra-log flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2"
                  style={{ opacity: 1 - i * 0.16 }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {s.qty} × {it.name}
                    </span>
                    <span className="block text-[11px] text-white/40">{s.source}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-white/60">{pesos.format(it.price * s.qty)}</span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function Row({ item, n, state }: { item: Item; n: number; state: "venta" | "agotado" | "proximo" }) {
  const pct = Math.min(100, Math.round((n / item.cap) * 100));
  return (
    <li className={`py-3 transition-opacity duration-500 ${state === "proximo" ? "opacity-40" : ""}`}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2.5">
          <span className={`font-medium ${state === "agotado" ? "text-white/40 line-through" : ""}`}>{item.name}</span>
          {state === "venta" && (
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black">
              En venta
            </span>
          )}
          {state === "agotado" && (
            <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/50">
              Agotado
            </span>
          )}
          {state === "proximo" && <span className="text-[11px] text-white/50">Próximo lote</span>}
        </span>
        <span className="tabular-nums text-white/70">{pesos.format(item.price)}</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${state === "agotado" ? "bg-white/30" : "bg-white"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-20 text-right text-[11px] tabular-nums text-white/40">
          {n}/{item.cap} {item.unit ?? ""}
        </span>
      </div>
    </li>
  );
}
