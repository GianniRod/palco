import type { CSSProperties } from "react";

// El plano de una sala. Lo usan el editor del panel y la página pública.
// Las posiciones van en % para que se vea igual a cualquier tamaño.

// Punto de la forma libre, en % del recuadro del sector. (cx, cy) curva el lado que va al punto siguiente.
export type ShapePoint = { x: number; y: number; cx?: number; cy?: number };

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
  shape?: ShapePoint[];
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

export function shapePath(points: ShapePoint[]) {
  if (points.length < 3) return "";
  const parts = [`M${points[0].x} ${points[0].y}`];
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    parts.push(point.cx !== undefined && point.cy !== undefined ? `Q${point.cx} ${point.cy} ${next.x} ${next.y}` : `L${next.x} ${next.y}`);
  });
  return `${parts.join("")}Z`;
}

// El dibujo de la forma libre ocupa el recuadro del sector y se estira con él.
function ShapeFill({ points, fill, stroke }: { points: ShapePoint[]; fill: string; stroke?: string }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
      <path d={shapePath(points)} fill={fill} stroke={stroke ?? "none"} strokeWidth={stroke ? 1 : 0} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function SectorBody({ sector, price }: { sector: MapSector; price?: string }) {
  const shape = sector.shape && sector.shape.length >= 3 ? sector.shape : null;
  if (shape) return <ShapedBody sector={sector} shape={shape} price={price} />;
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

// Mismo contenido que el recuadro, pero el fondo sigue la forma que se dibujó con la pluma.
function ShapedBody({ sector, shape, price }: { sector: MapSector; shape: ShapePoint[]; price?: string }) {
  const sellable = sector.kind === "numbered" || sector.kind === "general";
  const fill =
    sector.kind === "stage"
      ? "var(--map-fg)"
      : sellable
        ? "color-mix(in srgb, var(--map-accent) 16%, transparent)"
        : "color-mix(in srgb, var(--map-fg) 6%, transparent)";
  const stroke = sellable ? "color-mix(in srgb, var(--map-accent) 45%, transparent)" : undefined;
  // Las butacas se recortan con la misma forma, así no quedan puntos afuera de la sala dibujada.
  const clipId = `forma-${sector.key.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const seats = sector.kind === "numbered" && sector.rows?.length;
  return (
    <span className="relative flex size-full flex-col items-center justify-center gap-0.5 p-1.5 text-center leading-tight">
      <ShapeFill points={shape} fill={fill} stroke={stroke} />
      {seats ? (
        <>
          <svg width="0" height="0" className="absolute" aria-hidden>
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              <path d={shapePath(shape.map((p) => ({ x: p.x / 100, y: p.y / 100, cx: p.cx === undefined ? undefined : p.cx / 100, cy: p.cy === undefined ? undefined : p.cy / 100 })))} />
            </clipPath>
          </svg>
          <span className="absolute inset-0 flex px-[4%] pb-[4%] pt-6" style={{ clipPath: `url(#${clipId})` }}>
            <SeatDots rows={sector.rows!} aisles={sector.aisles} />
          </span>
        </>
      ) : null}
      <span className={`relative text-[11px] font-bold ${sector.kind === "stage" ? "text-[var(--map-bg)]" : ""} ${sector.kind === "label" ? "font-medium opacity-70" : ""}`}>
        {sector.name}
      </span>
      {price && <span className="relative text-[11px] font-semibold opacity-80">{price}</span>}
      {seats ? <span className="min-h-0 w-full flex-1" /> : sector.kind === "general" && !price ? (
        <span className="relative text-[10px] opacity-70">Hasta {sector.capacity} personas</span>
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
