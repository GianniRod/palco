// Versión de la landing según el tipo de cliente: boliches (/) o teatros (/teatros).

export type Segment = "boliche" | "teatro";

export const SEGMENT_KEY = "palco_segmento";

export const segmentPath: Record<Segment, string> = {
  boliche: "/",
  teatro: "/teatros",
};

export function readSegment(): Segment | null {
  try {
    const v = window.localStorage.getItem(SEGMENT_KEY);
    return v === "boliche" || v === "teatro" ? v : null;
  } catch {
    return null;
  }
}

export function saveSegment(segment: Segment) {
  try {
    window.localStorage.setItem(SEGMENT_KEY, segment);
  } catch {
    // Sin almacenamiento (modo privado estricto): se vuelve a preguntar la próxima vez.
  }
}
