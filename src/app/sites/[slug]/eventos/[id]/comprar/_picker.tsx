"use client";

import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { CheckoutScene, type CheckoutSeat, type CheckoutSector } from "@/components/checkout-scene";
import { formatPrice, type SiteContent } from "@/components/public-site";
import type { VenueMapData } from "@/components/venue-map";
import { startOrderAction, type CheckoutState } from "./actions";

const MAX_TICKETS = 8;
// Cada cuánto se vuelve a pedir qué sigue libre, para no elegir algo que ya se vendió.
const REFRESH_MS = 30_000;

type Cart = { seats: string[]; places: Record<string, number> };

const placeTotal = (places: Cart["places"]) => Object.values(places).reduce((total, quantity) => total + quantity, 0);

function ContinueButton({ disabled, total }: { disabled: boolean; total: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--site-accent)] px-4 py-3.5 font-bold text-[var(--site-on-accent)] transition hover:opacity-90 disabled:opacity-40"
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {disabled ? "Elegí tus entradas" : `Continuar · ${formatPrice(total)}`}
    </button>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--site-line)] bg-[var(--site-bg)] px-3 py-2.5 font-normal text-[var(--site-fg)] outline-none transition focus:border-[var(--site-accent-text)]";

export function TicketPicker({
  performanceId,
  sectors,
  seats,
  map,
  site,
  titleClass,
  summary,
}: {
  performanceId: string;
  sectors: CheckoutSector[];
  seats: CheckoutSeat[];
  map: VenueMapData;
  site: Pick<SiteContent, "seatShape" | "ticketStyle" | "template">;
  titleClass: string;
  summary: { title: string; date: string; venue: string };
}) {
  const router = useRouter();
  const [state, action] = useActionState(startOrderAction, {} as CheckoutState);
  const [cart, setCart] = useState<Cart>({ seats: [], places: {} });
  const [lost, setLost] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [activeId, setActiveId] = useState(() => {
    const free = new Set(seats.filter((seat) => seat.available).map((seat) => seat.sectorId));
    return (sectors.find((sector) => free.has(sector.id) || (sector.remaining ?? 0) > 0) ?? sectors[0])?.id ?? "";
  });

  // Si alguien ganó las entradas, se vuelve a pedir el plano actualizado.
  useEffect(() => {
    if (state.attempt) router.refresh();
  }, [state.attempt, router]);

  // Lo ocupado se actualiza solo mientras la pestaña está a la vista.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  const seatById = useMemo(() => new Map(seats.map((seat) => [seat.id, seat])), [seats]);
  const sectorById = useMemo(() => new Map(sectors.map((sector) => [sector.id, sector])), [sectors]);

  // Una butaca elegida que se acaba de ocupar se saca y se avisa.
  const stillFree = cart.seats.filter((id) => seatById.get(id)?.available);
  if (stillFree.length !== cart.seats.length) {
    setCart({ ...cart, seats: stillFree });
    setLost(true);
  }

  const selected = useMemo(() => new Set(cart.seats), [cart.seats]);
  const count = cart.seats.length + placeTotal(cart.places);
  const priceOf = (sectorId: string) => sectorById.get(sectorId)?.price ?? 0;
  const total =
    cart.seats.reduce((sum, id) => sum + priceOf(seatById.get(id)?.sectorId ?? ""), 0) +
    Object.entries(cart.places).reduce((sum, [sectorId, quantity]) => sum + priceOf(sectorId) * quantity, 0);

  // Se actualiza a partir del valor más nuevo: dos toques seguidos cuentan los dos.
  const toggleSeat = useCallback((id: string) => {
    setLost(false);
    setCart((current) => {
      if (current.seats.includes(id)) return { ...current, seats: current.seats.filter((seat) => seat !== id) };
      if (current.seats.length + placeTotal(current.places) >= MAX_TICKETS) return current;
      return { ...current, seats: [...current.seats, id] };
    });
  }, []);

  const changePlaces = useCallback((sector: CheckoutSector, delta: number) => {
    setCart((current) => {
      const next = Math.max(0, (current.places[sector.id] ?? 0) + delta);
      if (delta > 0 && (current.seats.length + placeTotal(current.places) >= MAX_TICKETS || next > (sector.remaining ?? 0))) return current;
      return { ...current, places: { ...current.places, [sector.id]: next } };
    });
  }, []);

  const brandHead = site.ticketStyle === "marca";
  // Cartelera lleva el resumen a la izquierda; las otras dos, a la derecha.
  const flip = site.template === "cartelera";

  return (
    <form
      action={action}
      className={`grid items-start gap-6 ${flip ? "@4xl:grid-cols-[360px_minmax(0,1fr)]" : "@4xl:grid-cols-[minmax(0,1fr)_360px]"}`}
    >
      <input type="hidden" name="performanceId" value={performanceId} />
      <input type="hidden" name="seatIds" value={JSON.stringify(cart.seats)} />
      <input
        type="hidden"
        name="general"
        value={JSON.stringify(Object.entries(cart.places).filter(([, quantity]) => quantity > 0).map(([sectorId, quantity]) => ({ sectorId, quantity })))}
      />

      <CheckoutScene
        map={map}
        sectors={sectors}
        seats={seats}
        activeId={activeId}
        selected={selected}
        places={cart.places}
        count={count}
        max={MAX_TICKETS}
        shape={site.seatShape}
        onSelectSector={setActiveId}
        onToggleSeat={toggleSeat}
        onChangePlaces={changePlaces}
      />

      <aside id="resumen" className={`min-w-0 scroll-mt-24 overflow-hidden rounded-2xl bg-[var(--site-surface)] [box-shadow:var(--site-shadow)] @4xl:sticky @4xl:top-24 ${flip ? "@4xl:order-first" : ""}`}>
        <div className="p-5" style={brandHead ? { background: "var(--site-accent)", color: "var(--site-on-accent)" } : undefined}>
          <p className={`text-xs font-bold uppercase tracking-[0.18em] ${brandHead ? "" : "text-[var(--site-accent-text)]"}`}>Tu entrada</p>
          <h2 className={`mt-1 text-xl leading-tight ${titleClass}`}>{summary.title}</h2>
          <p className={`mt-1 text-sm first-letter:uppercase ${brandHead ? "opacity-80" : "text-[var(--site-muted)]"}`}>{summary.date}</p>
          <p className={`text-sm ${brandHead ? "opacity-80" : "text-[var(--site-muted)]"}`}>{summary.venue}</p>
        </div>

        {/* Troquel del ticket */}
        <div aria-hidden className="relative h-0 border-t-2 border-dashed border-[var(--site-line)]">
          <span className="absolute -left-2.5 -top-2.5 size-5 rounded-full bg-[var(--site-bg)]" />
          <span className="absolute -right-2.5 -top-2.5 size-5 rounded-full bg-[var(--site-bg)]" />
        </div>

        <div className="space-y-4 p-5">
          {lost && <p role="status" className="rounded-lg bg-[var(--site-line)] px-3 py-2 text-sm font-medium">Una butaca que habías elegido se acaba de ocupar. Elegí otra.</p>}
          {count === 0 ? (
            <p className="text-sm text-[var(--site-muted)]">Elegí hasta {MAX_TICKETS}. La noche es mejor con amigos.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {cart.seats.map((id) => {
                const seat = seatById.get(id);
                if (!seat) return null;
                return (
                  <li key={id} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--site-bg)] px-3 py-2">
                    <span className="min-w-0">
                      <strong className="font-semibold">{sectorById.get(seat.sectorId)?.name}</strong>
                      <span className="text-[var(--site-muted)]"> · Fila {seat.row}, butaca {seat.number}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-semibold tabular-nums">{formatPrice(priceOf(seat.sectorId))}</span>
                      <button type="button" aria-label={`Quitar fila ${seat.row}, butaca ${seat.number}`} onClick={() => toggleSeat(id)} className="rounded p-0.5 text-[var(--site-muted)] transition hover:text-[var(--site-fg)]">
                        <X className="size-4" aria-hidden />
                      </button>
                    </span>
                  </li>
                );
              })}
              {sectors.filter((sector) => cart.places[sector.id] > 0).map((sector) => (
                <li key={sector.id} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--site-bg)] px-3 py-2">
                  <span className="min-w-0"><strong className="font-semibold">{cart.places[sector.id]} × {sector.name}</strong></span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold tabular-nums">{formatPrice(sector.price * cart.places[sector.id])}</span>
                    <button type="button" aria-label={`Quitar ${sector.name}`} onClick={() => changePlaces(sector, -cart.places[sector.id])} className="rounded p-0.5 text-[var(--site-muted)] transition hover:text-[var(--site-fg)]">
                      <X className="size-4" aria-hidden />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-baseline justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-2xl font-extrabold tabular-nums">{formatPrice(total)}</span>
          </div>

          <label className="block text-sm font-semibold">
            Tu nombre
            <input name="buyerName" required maxLength={120} autoComplete="name" value={buyerName} onChange={(event) => setBuyerName(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm font-semibold">
            Tu email
            <input name="buyerEmail" type="email" required maxLength={200} autoComplete="email" value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} className={inputClass} />
            <span className="mt-1 block text-xs font-normal text-[var(--site-muted)]">Tus entradas llegan a este email.</span>
          </label>

          {state.error && <p role="alert" className="rounded-lg bg-[var(--site-line)] px-3 py-2 text-sm font-medium">{state.error}</p>}
          <ContinueButton disabled={count === 0} total={total} />
          <p className="text-center text-xs text-[var(--site-muted)]">Te las guardamos 10 minutos. Después vuelven a la pista.</p>
        </div>
      </aside>

      {/* En el celular el resumen queda lejos: esta barra lleva hasta ahí. */}
      {count > 0 && (
        <a
          href="#resumen"
          className="sticky bottom-3 z-10 flex items-center justify-between rounded-xl bg-[var(--site-accent)] px-4 py-3 font-bold text-[var(--site-on-accent)] shadow-lg @4xl:hidden"
        >
          <span>{count} {count === 1 ? "entrada" : "entradas"} · {formatPrice(total)}</span>
          <span>Continuar →</span>
        </a>
      )}
    </form>
  );
}
