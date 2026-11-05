"use client";

import { useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { FakeQr } from "./qr";
import { useInView, useInterval, useReducedMotion } from "./hooks";

type Event =
  | { kind: "scan"; seat: string; time: string; ok: boolean; note?: string }
  | { kind: "offline" }
  | { kind: "online" };

// Guion de la demo: entradas válidas, un duplicado, un corte de internet y la resincronización.
const script: Event[] = [
  { kind: "scan", seat: "Preventa 2 · #0412", time: "01:12", ok: true },
  { kind: "scan", seat: "Preventa 2 · #0413", time: "01:12", ok: true },
  { kind: "scan", seat: "VIP · #0087", time: "01:13", ok: true },
  { kind: "scan", seat: "Preventa 2 · #0412", time: "01:14", ok: false, note: "Ya ingresó a las 01:12" },
  { kind: "offline" },
  { kind: "scan", seat: "General · #1031", time: "01:16", ok: true },
  { kind: "scan", seat: "Mesa 4 · #0009", time: "01:16", ok: true },
  { kind: "scan", seat: "General · #1031", time: "01:17", ok: false, note: "Ya ingresó a las 01:16" },
  { kind: "online" },
];
const HOLD = 3; // ticks de pausa al final antes de reiniciar

export function DoorScanner() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [i, setI] = useState(reduced ? script.length - 1 : 0);

  useInterval(
    () => setI((n) => (n + 1) % (script.length + HOLD)),
    1700,
    inView && !reduced,
  );

  const idx = Math.min(i, script.length - 1);
  const done = script.slice(0, idx + 1);
  const scans = done.flatMap((e, n) => (e.kind === "scan" ? [{ ...e, n }] : []));
  const current = script[idx];
  const offlineAt = done.findIndex((e) => e.kind === "offline");
  const online = offlineAt === -1 || done.some((e) => e.kind === "online");
  const synced = done.some((e) => e.kind === "online");
  const pending = offlineAt === -1 ? 0 : scans.filter((s) => s.n > offlineAt).length;
  const admitted = scans.filter((s) => s.ok).length;
  const last = scans.at(-1);

  return (
    <div ref={ref} className="grid items-center gap-12 lg:grid-cols-[auto_1fr]">
      {/* Teléfono del portero */}
      <div className="mx-auto w-[260px] rounded-[2.4rem] border-[10px] border-black bg-black shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)]">
        <div className="relative h-[460px] overflow-hidden rounded-[1.7rem] bg-neutral-900 text-white">
          <div
            className={`flex items-center justify-between px-5 pb-2 pt-4 text-[11px] transition-colors duration-500 ${
              online ? "bg-emerald-700/40" : "bg-amber-600/50"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {online ? "En línea" : "Sin conexión"}
            </span>
            <span className="tabular-nums">{admitted} ingresaron</span>
          </div>

          {/* Visor de cámara */}
          <div className="relative mx-5 mt-6 aspect-square rounded-2xl bg-neutral-800">
            {["left-2 top-2 border-l-2 border-t-2", "right-2 top-2 border-r-2 border-t-2", "bottom-2 left-2 border-b-2 border-l-2", "bottom-2 right-2 border-b-2 border-r-2"].map((c) => (
              <span key={c} className={`absolute h-6 w-6 rounded-sm border-white/80 ${c}`} />
            ))}
            {last && (
              <div key={`qr-${idx}`} className="absolute inset-8 rounded-md bg-white p-2 text-black [animation:subir_0.5s_ease-out_both]">
                <FakeQr seed={last.n + 2} className="h-full w-full" />
              </div>
            )}
            <span className="linea-escaner absolute inset-x-4 h-0.5 bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.7)]" />
            {current.kind === "scan" && (
              <span
                key={`sello-${idx}`}
                className={`sello absolute left-1/2 top-1/2 -ml-[4.5rem] -mt-6 w-36 rounded-md border-4 py-1.5 text-center font-sans text-sm font-black uppercase tracking-wider ${
                  current.ok
                    ? "border-emerald-500 bg-emerald-500/90 text-white"
                    : "border-red-500 bg-red-600/90 text-white"
                }`}
              >
                {current.ok ? "Válida" : "Ya ingresó"}
              </span>
            )}
          </div>

          <div className="mx-5 mt-5 min-h-16 rounded-xl bg-white/5 p-3 text-sm">
            {current.kind === "scan" ? (
              <>
                <p className="font-medium">{current.seat}</p>
                <p className="text-xs text-white/50">{current.ok ? "Entrada válida. Puede pasar." : current.note}</p>
              </>
            ) : current.kind === "offline" ? (
              <p className="text-amber-300">Se cortó internet. Seguimos validando en el teléfono.</p>
            ) : (
              <p className="flex items-center gap-2 text-emerald-300">
                <RefreshCw className="h-4 w-4" /> Conexión recuperada. Datos sincronizados.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Registro */}
      <div>
        <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/45">
          <span>Registro de la puerta</span>
          {pending > 0 && (
            <span className={`normal-case tracking-normal ${synced ? "text-emerald-300" : "text-amber-300"}`}>
              {synced ? `${pending} sincronizadas` : `${pending} pendientes de sincronizar`}
            </span>
          )}
        </div>
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {[...scans].reverse().slice(0, 6).map((s) => {
            const isPending = offlineAt !== -1 && s.n > offlineAt;
            return (
              <li key={s.n} className="entra-log flex items-center gap-4 py-3">
                <span className="w-12 font-display text-sm text-white/45 tabular-nums">{s.time}</span>
                <span className="flex-1">{s.seat}</span>
                {isPending && (
                  <span className={`text-[11px] ${synced ? "text-emerald-300/80" : "text-amber-300/80"}`}>
                    {synced ? "sincronizada" : "en el teléfono"}
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    s.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                  }`}
                >
                  {s.ok ? "válida" : "duplicada"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
