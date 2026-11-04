// QR ilustrativo (no codifica nada): patrón determinístico con los tres marcadores de esquina.

const SIZE = 21;

function isFinder(x: number, y: number) {
  const inBox = (ox: number, oy: number) =>
    x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
  return inBox(0, 0) || inBox(SIZE - 7, 0) || inBox(0, SIZE - 7);
}

function finderCell(x: number, y: number) {
  const lx = x >= SIZE - 7 ? x - (SIZE - 7) : x;
  const ly = y >= SIZE - 7 ? y - (SIZE - 7) : y;
  const ring = Math.max(Math.abs(lx - 3), Math.abs(ly - 3));
  return ring !== 2;
}

function cells(seed: number) {
  const out: [number, number][] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const on = isFinder(x, y)
        ? finderCell(x, y)
        : (x * 7 + y * 13 + x * y * seed + seed) % 5 < 2;
      if (on) out.push([x, y]);
    }
  }
  return out;
}

export function FakeQr({ seed = 3, className }: { seed?: number; className?: string }) {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={className} shapeRendering="crispEdges" aria-hidden="true">
      {cells(seed).map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}
