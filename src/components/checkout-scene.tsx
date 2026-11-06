"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { formatPrice, type SiteContent } from "@/components/public-site";
import { seatLayout, VenueMap, type MapSector, type VenueMapData } from "@/components/venue-map";

// El plano de la compra. Dibuja lo que se armó en Salas y mapas: mismas filas, mismos pasillos y
// el escenario donde está en la sala. Lo usan la compra real y la vista previa de Mi página.

export type CheckoutSector = { id: string; mapKey: string; name: string; kind: string; price: number; remaining: number | null };
export type CheckoutSeat = { id: string; sectorId: string; row: string; number: number; available: boolean };
type SeatShape = SiteContent["seatShape"];

const SEAT_SHAPES: Record<SeatShape, string> = {
  butaca: "rounded-t-[38%] rounded-b-[16%]",
  redonda: "rounded-full",
};

// Se separa para que tocar una butaca redibuje esa sola, no toda la sala.
const Seat = memo(function Seat({
  id,
  label,
  number,
  free,
  active,
  left,
  top,
  width,
  height,
  shape,
  onToggle,
}: {
  id: string;
  label: string;
  number: number;
  free: boolean;
  active: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
  shape: SeatShape;
  onToggle: (id: string) => void;
}) {
  const state = active
    ? "bg-[var(--plan-pick)] text-[var(--plan-on-pick)]"
    : free
      ? "cursor-pointer border border-[var(--plan-seat-line)] bg-[var(--plan-seat)] text-[var(--plan-fg)] hover:bg-[var(--plan-seat-hover)]"
      : "cursor-not-allowed bg-[var(--plan-sold)] text-transparent";
  return (
    <button
      type="button"
      disabled={!free}
      aria-pressed={active}
      aria-label={`${label}${free ? "" : ", ocupada"}`}
      title={label}
      onClick={() => onToggle(id)}
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`, fontSize: "var(--seat-font)" }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 font-bold leading-none transition-colors duration-100 ${SEAT_SHAPES[shape]} ${state}`}
    >
      {number}
    </button>
  );
});

const ROW_SPACE = 1.12; // las filas un poco más separadas que las butacas
const SIDE_UNITS = 2; // lugar para la letra de la fila a cada lado

function SeatPlan({
  seats,
  sector,
  sectorName,
  selected,
  onToggle,
  shape,
}: {
  seats: CheckoutSeat[];
  sector: MapSector | undefined;
  sectorName: string;
  selected: Set<string>;
  onToggle: (id: string) => void;
  shape: SeatShape;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const aisles = sector?.aisles;
  const { rows, layout, total } = useMemo(() => {
    const grouped = new Map<string, CheckoutSeat[]>();
    for (const seat of seats) grouped.set(seat.row, [...(grouped.get(seat.row) ?? []), seat]);
    const entries = [...grouped.entries()];
    const positions = seatLayout(entries.map(([, row]) => row.length), aisles);
    return { rows: entries, layout: positions, total: positions.width + SIDE_UNITS };
  }, [seats, aisles]);

  // Si en el celular la fila no entra, arranca desde el centro de la sala.
  useEffect(() => {
    const box = scroller.current;
    if (box) box.scrollLeft = (box.scrollWidth - box.clientWidth) / 2;
  }, [total]);

  const seatWidth = (86 / total);
  const seatHeight = 86 / ROW_SPACE / layout.height;
  return (
    <div ref={scroller} className="overflow-x-auto pb-2 [scrollbar-color:var(--plan-seat-line)_transparent] [scrollbar-width:thin]">
      <div
        style={{
          minWidth: total * 26,
          maxWidth: total * 38,
          aspectRatio: `${total} / ${layout.height * ROW_SPACE}`,
          "--seat-font": `calc(100cqw / ${total} * 0.34)`,
        } as React.CSSProperties}
        className="relative mx-auto w-full [container-type:inline-size]"
      >
        {rows.map(([row, rowSeats], rowIndex) => {
          const top = ((rowIndex + 0.5) / layout.height) * 100;
          return (
            <span key={row} className="contents">
              {[0.5, total - 0.5].map((x) => (
                <span
                  key={x}
                  aria-hidden
                  style={{ left: `${(x / total) * 100}%`, top: `${top}%`, fontSize: "var(--seat-font)" }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 font-semibold text-[var(--plan-muted)]"
                >
                  {row}
                </span>
              ))}
              {rowSeats.map((seat, index) => (
                <Seat
                  key={seat.id}
                  id={seat.id}
                  label={`${sectorName}, fila ${row}, butaca ${seat.number}`}
                  number={seat.number}
                  free={seat.available}
                  active={selected.has(seat.id)}
                  left={((layout.seats[rowIndex][index].x + SIDE_UNITS / 2) / total) * 100}
                  top={top}
                  width={seatWidth}
                  height={seatHeight}
                  shape={shape}
                  onToggle={onToggle}
                />
              ))}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// De qué lado queda el escenario visto desde este sector, según el plano de la sala.
function stageSide(map: VenueMapData, sector: MapSector | undefined) {
  const stage = map.sectors.find((item) => item.kind === "stage");
  if (!stage || !sector) return null;
  const dx = stage.x + stage.w / 2 - (sector.x + sector.w / 2);
  const dy = stage.y + stage.h / 2 - (sector.y + sector.h / 2);
  const side = Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? "arriba" : "abajo") : dx < 0 ? "izquierda" : "derecha";
  return { name: stage.name, side };
}

function Stage({ name, side }: { name: string; side: string }) {
  if (side === "izquierda" || side === "derecha") {
    return (
      <p className={`my-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--plan-muted)] ${side === "derecha" ? "text-right" : ""}`}>
        {side === "izquierda" ? `← ${name}` : `${name} →`}
      </p>
    );
  }
  const up = side === "arriba";
  return (
    <div
      className={`mx-auto my-3 flex h-8 w-[70%] items-center justify-center border-[var(--plan-seat-line)] ${
        up ? "rounded-b-[50%] border-b-2" : "rounded-t-[50%] border-t-2"
      }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--plan-muted)]">{name}</span>
    </div>
  );
}

function Legend({ shape }: { shape: SeatShape }) {
  const mark = `size-3 ${SEAT_SHAPES[shape]}`;
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[var(--plan-muted)]">
      <span className="flex items-center gap-1.5"><span aria-hidden className={`${mark} border border-[var(--plan-seat-line)] bg-[var(--plan-seat)]`} />Libre</span>
      <span className="flex items-center gap-1.5"><span aria-hidden className={`${mark} bg-[var(--plan-pick)]`} />Tu elección</span>
      <span className="flex items-center gap-1.5"><span aria-hidden className={`${mark} bg-[var(--plan-sold)]`} />Ocupada</span>
    </div>
  );
}

export function CheckoutScene({
  map,
  sectors,
  seats,
  activeId,
  selected,
  places,
  count,
  max,
  shape,
  onSelectSector,
  onToggleSeat,
  onChangePlaces,
}: {
  map: VenueMapData;
  sectors: CheckoutSector[];
  seats: CheckoutSeat[];
  activeId: string;
  selected: Set<string>;
  places: Record<string, number>;
  count: number;
  max: number;
  shape: SeatShape;
  onSelectSector: (id: string) => void;
  onToggleSeat: (id: string) => void;
  onChangePlaces: (sector: CheckoutSector, delta: number) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const active = sectors.find((sector) => sector.id === activeId) ?? sectors[0];
  const mapSector = map.sectors.find((sector) => sector.key === active?.mapKey);
  const activeSeats = useMemo(() => seats.filter((seat) => seat.sectorId === active?.id), [seats, active?.id]);
  const freeInActive = activeSeats.filter((seat) => seat.available).length;
  const stage = stageSide(map, mapSector);

  const freeBySector = new Map<string, number>();
  for (const seat of seats) if (seat.available) freeBySector.set(seat.sectorId, (freeBySector.get(seat.sectorId) ?? 0) + 1);
  const soldOut = (sector: CheckoutSector) => (sector.kind === "general" ? (sector.remaining ?? 0) <= 0 : !freeBySector.get(sector.id));
  const prices = Object.fromEntries(sectors.map((sector) => [sector.mapKey, soldOut(sector) ? "Agotado" : formatPrice(sector.price)]));

  const seatSector = new Map(seats.map((seat) => [seat.id, seat.sectorId]));
  const badges: Record<string, number> = {};
  for (const sector of sectors) {
    badges[sector.mapKey] = sector.kind === "general" ? places[sector.id] ?? 0 : 0;
  }
  for (const id of selected) {
    const sector = sectors.find((item) => item.id === seatSector.get(id));
    if (sector) badges[sector.mapKey] += 1;
  }

  function selectFromMap(key: string) {
    const sector = sectors.find((item) => item.mapKey === key);
    if (!sector) return;
    onSelectSector(sector.id);
    // En el celular las butacas quedan abajo del plano: se las lleva a la vista, sin moverse si ya se ven.
    const box = panel.current;
    if (box && box.getBoundingClientRect().top > window.innerHeight * 0.6) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      box.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
    }
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl bg-[var(--plan-bg)] text-[var(--plan-fg)] shadow-xl">
      <div className="border-b border-[var(--plan-line)] p-4 @xl:p-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--plan-muted)]">Tocá un sector del plano</p>
        <div className="mx-auto max-w-md">
          <VenueMap
            map={map}
            prices={prices}
            accent="var(--plan-pick)"
            fg="var(--plan-fg)"
            bg="var(--plan-bg)"
            selectedKey={active?.mapKey}
            badges={badges}
            onSelect={selectFromMap}
          />
        </div>
      </div>

      {active && (
        <div ref={panel} className="scroll-mt-24 p-4 @xl:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight">{active.name}</h2>
            <p className="text-lg font-bold tabular-nums">{formatPrice(active.price)}</p>
          </div>

          {active.kind === "general" ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[var(--plan-seat)] p-4">
              <div>
                <p className="font-semibold">{(active.remaining ?? 0) > 0 ? "Ubicación general" : "Agotado"}</p>
                <p className="text-sm text-[var(--plan-muted)]">Sin butaca asignada. Elegí cuántas querés.</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  aria-label={`Quitar una entrada de ${active.name}`}
                  disabled={!places[active.id]}
                  onClick={() => onChangePlaces(active, -1)}
                  className="flex size-11 items-center justify-center rounded-full border border-[var(--plan-seat-line)] transition hover:bg-[var(--plan-seat-hover)] disabled:opacity-30"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
                <span aria-live="polite" className="w-8 text-center text-3xl font-extrabold tabular-nums">{places[active.id] ?? 0}</span>
                <button
                  type="button"
                  aria-label={`Sumar una entrada de ${active.name}`}
                  disabled={count >= max || (places[active.id] ?? 0) >= (active.remaining ?? 0)}
                  onClick={() => onChangePlaces(active, 1)}
                  className="flex size-11 items-center justify-center rounded-full bg-[var(--plan-pick)] text-[var(--plan-on-pick)] transition hover:opacity-90 disabled:opacity-30"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-[var(--plan-muted)]">{freeInActive > 0 ? `${freeInActive} butacas libres` : "Agotado"}</p>
              {stage && stage.side !== "abajo" && <Stage {...stage} />}
              <SeatPlan seats={activeSeats} sector={mapSector} sectorName={active.name} selected={selected} onToggle={onToggleSeat} shape={shape} />
              {stage?.side === "abajo" && <Stage {...stage} />}
              <Legend shape={shape} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
