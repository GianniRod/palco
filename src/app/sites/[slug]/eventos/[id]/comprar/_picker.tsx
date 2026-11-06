"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus } from "lucide-react";
import { formatPrice } from "@/components/public-site";
import { startOrderAction, type CheckoutState } from "./actions";

type Sector = { id: string; name: string; kind: string; price: number; remaining: number | null };
type Seat = { id: string; sectorId: string; row: string; number: number; available: boolean };

const MAX_TICKETS = 8;

function ContinueButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--site-accent)] px-4 py-3 font-bold text-[var(--site-on-accent)] transition hover:opacity-90 disabled:opacity-50"
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      Reservar y continuar
    </button>
  );
}

const inputClass =
  "w-full rounded-md border border-[var(--site-line)] bg-[var(--site-bg)] px-3 py-2.5 text-[var(--site-fg)] outline-none focus:border-[var(--site-accent-text)]";

export function TicketPicker({
  performanceId,
  sectors,
  seats,
}: {
  performanceId: string;
  sectors: Sector[];
  seats: Seat[];
}) {
  const router = useRouter();
  const [state, action] = useActionState(startOrderAction, {} as CheckoutState);
  const [picked, setPicked] = useState<string[]>([]);
  const [places, setPlaces] = useState<Record<string, number>>({});
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");

  // Si alguien ganó las entradas, se vuelve a pedir el plano actualizado.
  useEffect(() => {
    if (state.attempt) router.refresh();
  }, [state.attempt, router]);

  // Lo elegido que ya no está libre se saca solo.
  const free = new Set(seats.filter((seat) => seat.available).map((seat) => seat.id));
  const selected = picked.filter((id) => free.has(id));
  const placeCount = Object.values(places).reduce((total, quantity) => total + quantity, 0);
  const count = selected.length + placeCount;

  const priceOf = (sectorId: string) => sectors.find((sector) => sector.id === sectorId)?.price ?? 0;
  const seatById = new Map(seats.map((seat) => [seat.id, seat]));
  const total =
    selected.reduce((sum, id) => sum + priceOf(seatById.get(id)?.sectorId ?? ""), 0) +
    Object.entries(places).reduce((sum, [sectorId, quantity]) => sum + priceOf(sectorId) * quantity, 0);

  function toggleSeat(id: string) {
    if (selected.includes(id)) setPicked(selected.filter((seat) => seat !== id));
    else if (count < MAX_TICKETS) setPicked([...selected, id]);
  }

  function changePlaces(sector: Sector, delta: number) {
    setPlaces((current) => {
      const next = Math.max(0, (current[sector.id] ?? 0) + delta);
      if (delta > 0 && (count >= MAX_TICKETS || next > (sector.remaining ?? 0))) return current;
      return { ...current, [sector.id]: next };
    });
  }

  return (
    <form action={action} className="grid items-start gap-8 @3xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <input type="hidden" name="performanceId" value={performanceId} />
      <input type="hidden" name="seatIds" value={JSON.stringify(selected)} />
      <input
        type="hidden"
        name="general"
        value={JSON.stringify(Object.entries(places).filter(([, quantity]) => quantity > 0).map(([sectorId, quantity]) => ({ sectorId, quantity })))}
      />

      <div className="min-w-0 space-y-5">
        {sectors.map((sector) => {
          const sectorSeats = seats.filter((seat) => seat.sectorId === sector.id);
          const rows = [...new Set(sectorSeats.map((seat) => seat.row))];
          const freeSeats = sectorSeats.filter((seat) => seat.available).length;
          return (
            <section key={sector.id} className="rounded-xl bg-[var(--site-surface)] p-5 [box-shadow:var(--site-shadow)]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold">{sector.name}</h2>
                <p className="font-semibold tabular-nums">{formatPrice(sector.price)}</p>
              </div>

              {sector.kind === "general" ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[var(--site-muted)]">
                    {(sector.remaining ?? 0) > 0 ? "Ubicación general, sin butaca asignada" : "Agotado"}
                  </p>
                  <div className="flex items-center gap-3">
                    <button type="button" aria-label={`Quitar una entrada de ${sector.name}`} disabled={!places[sector.id]} onClick={() => changePlaces(sector, -1)} className="flex size-10 items-center justify-center rounded-md border border-[var(--site-line)] disabled:opacity-40">
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <span aria-live="polite" className="w-6 text-center text-lg font-bold tabular-nums">{places[sector.id] ?? 0}</span>
                    <button type="button" aria-label={`Sumar una entrada de ${sector.name}`} disabled={count >= MAX_TICKETS || (places[sector.id] ?? 0) >= (sector.remaining ?? 0)} onClick={() => changePlaces(sector, 1)} className="flex size-10 items-center justify-center rounded-md border border-[var(--site-line)] disabled:opacity-40">
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-1 text-sm text-[var(--site-muted)]">{freeSeats > 0 ? `${freeSeats} butacas libres` : "Agotado"}</p>
                  <div className="mt-3 space-y-1.5 overflow-x-auto pb-1">
                    {rows.map((row) => (
                      <div key={row} className="flex w-max items-center gap-1.5">
                        <span className="w-6 shrink-0 text-xs font-semibold text-[var(--site-muted)]">{row}</span>
                        {sectorSeats.filter((seat) => seat.row === row).map((seat) => {
                          const active = selected.includes(seat.id);
                          return (
                            <button
                              key={seat.id}
                              type="button"
                              disabled={!seat.available}
                              aria-pressed={active}
                              aria-label={`${sector.name}, fila ${row}, butaca ${seat.number}${seat.available ? "" : ", ocupada"}`}
                              onClick={() => toggleSeat(seat.id)}
                              style={active ? { background: "var(--site-accent)", color: "var(--site-on-accent)", borderColor: "var(--site-accent)" } : undefined}
                              className={`size-8 shrink-0 rounded border text-[11px] font-semibold transition ${
                                seat.available ? "border-[var(--site-line)] hover:border-[var(--site-accent-text)]" : "cursor-not-allowed border-transparent bg-[var(--site-line)] text-[var(--site-muted)] opacity-60"
                              }`}
                            >
                              {seat.number}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          );
        })}
      </div>

      <aside className="min-w-0 space-y-4 rounded-xl bg-[var(--site-surface)] p-5 [box-shadow:var(--site-shadow)] @3xl:sticky @3xl:top-24">
        <h2 className="text-lg font-bold">Tu compra</h2>
        {count === 0 ? (
          <p className="text-sm text-[var(--site-muted)]">Elegí hasta {MAX_TICKETS} entradas.</p>
        ) : (
          <ul className="divide-y divide-[var(--site-line)] text-sm">
            {selected.map((id) => {
              const seat = seatById.get(id)!;
              return (
                <li key={id} className="flex justify-between gap-3 py-2">
                  <span>{sectors.find((sector) => sector.id === seat.sectorId)?.name}, fila {seat.row}, butaca {seat.number}</span>
                  <span className="tabular-nums">{formatPrice(priceOf(seat.sectorId))}</span>
                </li>
              );
            })}
            {sectors.filter((sector) => places[sector.id] > 0).map((sector) => (
              <li key={sector.id} className="flex justify-between gap-3 py-2">
                <span>{places[sector.id]} × {sector.name}</span>
                <span className="tabular-nums">{formatPrice(sector.price * places[sector.id])}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-baseline justify-between border-t border-[var(--site-line)] pt-3">
          <span className="font-semibold">Total</span>
          <span className="text-xl font-bold tabular-nums">{formatPrice(total)}</span>
        </div>

        <label className="block text-sm font-medium">
          Tu nombre
          <input name="buyerName" required maxLength={120} autoComplete="name" value={buyerName} onChange={(event) => setBuyerName(event.target.value)} className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm font-medium">
          Tu email
          <input name="buyerEmail" type="email" required maxLength={200} autoComplete="email" value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} className={`${inputClass} mt-1`} />
          <span className="mt-1 block text-xs font-normal text-[var(--site-muted)]">Te mandamos las entradas a este email.</span>
        </label>

        {state.error && <p role="alert" className="rounded-md bg-[var(--site-line)] px-3 py-2 text-sm font-medium">{state.error}</p>}
        <ContinueButton disabled={count === 0} />
        <p className="text-center text-xs text-[var(--site-muted)]">Te guardamos las entradas 10 minutos para que pagues.</p>
      </aside>
    </form>
  );
}
