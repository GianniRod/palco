import type { MapSector, ShapePoint } from "@/components/venue-map";

// Geometría de la pluma del editor de salas.
// La forma se guarda en % del recuadro del sector; el lienzo es 4:3, así que para medir
// distancias y curvaturas "como se ven" pasamos a un espacio con esa proporción.

type Point = { x: number; y: number };

const ASPECT = 4 / 3;
export const MAX_POINTS = 24;
export const RECTANGLE: ShapePoint[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

const round = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const shapeOf = (sector: MapSector) => (sector.shape && sector.shape.length >= 3 ? sector.shape : RECTANGLE);

// Del recuadro del sector al lienzo (los dos en %) y al revés.
export const toCanvas = (sector: MapSector, point: Point): Point => ({
  x: sector.x + (point.x / 100) * sector.w,
  y: sector.y + (point.y / 100) * sector.h,
});
export const toLocal = (sector: MapSector, point: Point): Point => ({
  x: ((point.x - sector.x) / sector.w) * 100,
  y: ((point.y - sector.y) / sector.h) * 100,
});

const ends = (shape: ShapePoint[], index: number) => [shape[index], shape[(index + 1) % shape.length]] as const;
const hasCurve = (point: ShapePoint) => point.cx !== undefined && point.cy !== undefined;

// Punto del medio del lado (t = 0,5 de la curva): ahí va la manija para curvarlo.
export function edgeMiddle(shape: ShapePoint[], index: number): Point {
  const [a, b] = ends(shape, index);
  if (!hasCurve(a)) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return { x: (a.x + 2 * a.cx! + b.x) / 4, y: (a.y + 2 * a.cy! + b.y) / 4 };
}

// Escala de % del recuadro a unidades "de pantalla" del lienzo.
const scaleOf = (sector: MapSector) => ({ sx: (sector.w / 100) * ASPECT, sy: sector.h / 100 });

function edgeFrame(sector: MapSector, shape: ShapePoint[], index: number) {
  const { sx, sy } = scaleOf(sector);
  const [a, b] = ends(shape, index);
  const dx = (b.x - a.x) * sx;
  const dy = (b.y - a.y) * sy;
  const length = Math.hypot(dx, dy) || 1;
  // Normal hacia "afuera" si los puntos van en sentido horario, como el rectángulo inicial.
  // (En pantalla la y crece hacia abajo: para el lado de arriba del rectángulo esto apunta hacia arriba.)
  return { a, b, sx, sy, length, nx: dy / length, ny: -dx / length };
}

// Largo del lado más corto: con "todos los lados" la curvatura se mide contra él, así una forma
// ancha no se infla en un óvalo gigante.
export function shortestEdge(sector: MapSector, shape: ShapePoint[]) {
  return Math.min(...shape.map((_, index) => edgeFrame(sector, shape, index).length));
}

// Curvatura de -100 a 100: cuánto se aleja el control del medio del lado. 100 = la mitad del largo
// del lado (o del lado más corto, si se pasa `reference`).
const reach = (length: number, reference?: number) => Math.min(length, reference ?? length) / 2;

export function edgeCurvature(sector: MapSector, shape: ShapePoint[], index: number, reference?: number) {
  const point = shape[index];
  if (!hasCurve(point)) return 0;
  const { a, b, sx, sy, length, nx, ny } = edgeFrame(sector, shape, index);
  const ox = (point.cx! - (a.x + b.x) / 2) * sx;
  const oy = (point.cy! - (a.y + b.y) / 2) * sy;
  return clamp(Math.round(((ox * nx + oy * ny) / reach(length, reference)) * 100), -100, 100);
}

export function withCurvature(sector: MapSector, shape: ShapePoint[], index: number, value: number, reference?: number): ShapePoint[] {
  return shape.map((point, i) => {
    if (i !== index) return point;
    const { x, y } = point;
    if (value === 0) return { x, y };
    const { a, b, sx, sy, length, nx, ny } = edgeFrame(sector, shape, index);
    const offset = (value / 100) * reach(length, reference);
    return { x, y, cx: round((a.x + b.x) / 2 + (nx * offset) / sx), cy: round((a.y + b.y) / 2 + (ny * offset) / sy) };
  });
}

// Arrastrar la manija del medio: el control queda de modo que la curva pase por donde está el dedo.
export function bendEdgeTo(shape: ShapePoint[], index: number, middle: Point): ShapePoint[] {
  const [a, b] = ends(shape, index);
  const cx = 2 * middle.x - (a.x + b.x) / 2;
  const cy = 2 * middle.y - (a.y + b.y) / 2;
  return shape.map((point, i) => (i === index ? { x: point.x, y: point.y, cx: round(cx), cy: round(cy) } : point));
}

// Parte un lado en dos por la mitad, conservando la curva.
export function splitEdge(shape: ShapePoint[], index: number): ShapePoint[] {
  if (shape.length >= MAX_POINTS) return shape;
  const [a, b] = ends(shape, index);
  const middle = edgeMiddle(shape, index);
  const inserted: ShapePoint = { x: round(middle.x), y: round(middle.y) };
  let first: ShapePoint = { x: a.x, y: a.y };
  if (hasCurve(a)) {
    first = { ...first, cx: round((a.x + a.cx!) / 2), cy: round((a.y + a.cy!) / 2) };
    inserted.cx = round((a.cx! + b.x) / 2);
    inserted.cy = round((a.cy! + b.y) / 2);
  }
  return [...shape.slice(0, index), first, inserted, ...shape.slice(index + 1)];
}

export function removePoint(shape: ShapePoint[], index: number): ShapePoint[] {
  if (shape.length <= 3) return shape;
  return shape.filter((_, i) => i !== index);
}

// El lado más largo, para "Agregar punto" sin nada elegido.
export function longestEdge(sector: MapSector, shape: ShapePoint[]) {
  let best = 0;
  let bestLength = -1;
  shape.forEach((_, index) => {
    const { length } = edgeFrame(sector, shape, index);
    if (length > bestLength) [best, bestLength] = [index, length];
  });
  return best;
}

// Después de mover puntos, el recuadro del sector vuelve a abrazar las esquinas:
// así se puede seguir arrastrando y cambiando el tamaño como cualquier otro elemento.
export function fitToShape(sector: MapSector, shape: ShapePoint[]): Partial<MapSector> {
  const corners = shape.map((point) => toCanvas(sector, point));
  const xs = corners.map((point) => clamp(point.x, 0, 100));
  const ys = corners.map((point) => clamp(point.y, 0, 100));
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(3, Math.max(...xs) - x);
  const h = Math.max(3, Math.max(...ys) - y);
  const box = { ...sector, x: Math.min(x, 100 - w), y: Math.min(y, 100 - h), w, h };
  const local = (point: Point) => {
    const p = toLocal(box, toCanvas(sector, point));
    return { x: round(p.x), y: round(p.y) };
  };
  return {
    x: round(box.x),
    y: round(box.y),
    w: round(w),
    h: round(h),
    shape: shape.map((point) => {
      const corner = local(point);
      if (!hasCurve(point)) return corner;
      const control = local({ x: point.cx!, y: point.cy! });
      return { ...corner, cx: control.x, cy: control.y };
    }),
  };
}

// Mismo cálculo en el lienzo, para arrastrar puntos con el puntero.
export const clampCanvas = (point: Point): Point => ({ x: clamp(point.x, 0, 100), y: clamp(point.y, 0, 100) });
