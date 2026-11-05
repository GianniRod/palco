import type { CSSProperties } from "react";

// El plano de una sala. Lo usan el editor del panel y la página pública.
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

function SeatDots({ rows, aisles = [] }: { rows: number[]; aisles?: number[] }) {
  const longest = Math.max(...rows);
  const width = longest + aisles.length;
  return (
    <svg viewBox={`0 0 ${width} ${rows.length}`} className="min-h-0 w-full flex-1" aria-hidden>
      {rows.flatMap((count, row) => {
        const offset = (longest - count) / 2;
        return Array.from({ length: count }, (_, seat) => {
          const gaps = aisles.filter((aisle) => aisle <= seat + offset).length;
          return <circle key={`${row}-${seat}`} cx={seat + offset + gaps + 0.5} cy={row + 0.5} r={0.36} fill="currentColor" />;
        });
      })}
    </svg>
  );
}

export function SectorBody({ sector, price }: { sector: MapSector; price?: string }) {
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
      className="flex size-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md p-1.5 text-center leading-tight"
      style={{ background: "color-mix(in srgb, var(--map-accent) 16%, transparent)", border: "1px solid color-mix(in srgb, var(--map-accent) 45%, transparent)" }}
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
}: {
  map: VenueMapData;
  prices?: Record<string, string>;
  accent?: string;
  fg?: string;
  bg?: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`Plano: ${map.sectors.map((sector) => sector.name).join(", ")}`}
      style={{ ...mapStyle(accent, fg, bg), background: "color-mix(in srgb, var(--map-fg) 4%, transparent)", color: "var(--map-fg)" }}
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl ${className}`}
    >
      {map.sectors.map((sector) => (
        <div
          key={sector.key}
          className="absolute"
          style={{ left: `${sector.x}%`, top: `${sector.y}%`, width: `${sector.w}%`, height: `${sector.h}%` }}
        >
          <SectorBody sector={sector} price={prices[sector.key]} />
        </div>
      ))}
    </div>
  );
}
