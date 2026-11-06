import { memo, type CSSProperties } from "react";

// El plano de una sala. Lo usan el editor del panel, la página del evento y la compra.
// Las posiciones van en % para que se vea igual a cualquier tamaño.

export type MapSector = {
  key: string;
  kind: "numbered" | "general" | "stage" | "label";
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rows?: number[];
  aisles?: number[];
  capacity?: number;
};

export type VenueMapData = { sectors: MapSector[] };

// Dónde va cada butaca según la sala: filas centradas y pasillos. Una sola cuenta para todas las pantallas.
export function seatLayout(rows: number[], aisles: number[] = []) {
  const longest = Math.max(1, ...rows);
  return {
    width: longest + aisles.length,
    height: Math.max(1, rows.length),
    seats: rows.map((count, row) => {
      const offset = (longest - count) / 2;
      return Array.from({ length: count }, (_, seat) => ({
        x: seat + offset + aisles.filter((aisle) => aisle <= seat + offset).length + 0.5,
        y: row + 0.5,
      }));
    }),
  };
}

const SeatDots = memo(function SeatDots({ rows, aisles }: { rows: number[]; aisles?: number[] }) {
  const layout = seatLayout(rows, aisles);
  return (
    <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="min-h-0 w-full flex-1" aria-hidden>
      {layout.seats.flat().map((seat) => (
        <circle key={`${seat.x}-${seat.y}`} cx={seat.x} cy={seat.y} r={0.36} fill="currentColor" />
      ))}
    </svg>
  );
});

export function SectorBody({ sector, price, active = false }: { sector: MapSector; price?: string; active?: boolean }) {
  if (sector.kind === "label") {
    return <span className="flex size-full items-center justify-center text-center text-[11px] font-medium opacity-70">{sector.name}</span>;
  }
  if (sector.kind === "stage") {
    return (
      <span className="flex size-full items-center justify-center rounded-md bg-[var(--map-fg)] px-1 text-center text-xs font-bold text-[var(--map-bg)]">
        {sector.name}
      </span>
    );
  }
  return (
    <span
      className="flex size-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md p-1.5 text-center leading-tight transition-colors"
      style={{
        background: `color-mix(in srgb, var(--map-accent) ${active ? 38 : 16}%, transparent)`,
        border: `1px solid color-mix(in srgb, var(--map-accent) ${active ? 100 : 45}%, transparent)`,
      }}
    >
      <span className="text-[11px] font-bold">{sector.name}</span>
      {price && <span className="text-[11px] font-semibold opacity-80">{price}</span>}
      {sector.kind === "numbered" && sector.rows?.length ? (
        <SeatDots rows={sector.rows} aisles={sector.aisles} />
      ) : sector.kind === "general" && !price ? (
        <span className="text-[10px] opacity-70">Hasta {sector.capacity} personas</span>
      ) : null}
    </span>
  );
}

export const mapStyle = (accent: string, fg: string, bg: string) =>
  ({ "--map-accent": accent, "--map-fg": fg, "--map-bg": bg }) as CSSProperties;

export function VenueMap({
  map,
  prices = {},
  accent = "#111111",
  fg = "#16161a",
  bg = "#ffffff",
  className = "",
  selectedKey,
  onSelect,
  badges = {},
}: {
  map: VenueMapData;
  prices?: Record<string, string>;
  accent?: string;
  fg?: string;
  bg?: string;
  className?: string;
  // Con onSelect, los sectores que se venden se pueden tocar.
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  badges?: Record<string, number>;
}) {
  return (
    <div
      role={onSelect ? "group" : "img"}
      aria-label={`Plano: ${map.sectors.map((sector) => sector.name).join(", ")}`}
      style={{ ...mapStyle(accent, fg, bg), background: "color-mix(in srgb, var(--map-fg) 4%, transparent)", color: "var(--map-fg)" }}
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl ${className}`}
    >
      {map.sectors.map((sector) => {
        const position = { left: `${sector.x}%`, top: `${sector.y}%`, width: `${sector.w}%`, height: `${sector.h}%` };
        const sellable = sector.kind === "numbered" || sector.kind === "general";
        const active = selectedKey === sector.key;
        if (onSelect && sellable) {
          return (
            <button
              key={sector.key}
              type="button"
              onClick={() => onSelect(sector.key)}
              aria-pressed={active}
              aria-label={`Ver ${sector.name}${prices[sector.key] ? `, ${prices[sector.key]}` : ""}`}
              className="absolute cursor-pointer rounded-md outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-[var(--map-fg)]"
              style={position}
            >
              <SectorBody sector={sector} price={prices[sector.key]} active={active} />
              {badges[sector.key] > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: "var(--map-fg)", color: "var(--map-bg)" }}
                >
                  {badges[sector.key]}
                </span>
              )}
            </button>
          );
        }
        return (
          <div key={sector.key} className="absolute" style={position}>
            <SectorBody sector={sector} price={prices[sector.key]} />
          </div>
        );
      })}
    </div>
  );
}
