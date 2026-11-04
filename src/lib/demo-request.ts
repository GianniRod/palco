// Definición compartida (cliente y servidor) del formulario "Pedir demo".

export const venueTypes = [
  "Teatro",
  "Sala independiente",
  "Boliche / fiesta",
  "Productora",
  "Festival / estadio",
  "Otro",
] as const;

export const capacities = ["Hasta 200", "200 a 500", "500 a 2.000", "Más de 2.000"] as const;

export const seatingTypes = ["Butacas numeradas", "Campo / general", "Ambas"] as const;

export const eventsPerMonth = ["1 o 2", "3 a 10", "Más de 10", "Todavía no sé"] as const;

export type DemoRequest = {
  name: string;
  email: string;
  phone: string;
  venue: string;
  venueType: string;
  capacity: string;
  seating: string;
  events: string;
  currentTicketing: string;
  message: string;
};

export const MAX = {
  short: 120,
  message: 2000,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const oneOf = (list: readonly string[], v: string) => v === "" || list.includes(v);

/** Valida y normaliza. Devuelve los datos limpios o un mensaje de error para el usuario. */
export function parseDemoRequest(
  input: unknown,
): { ok: true; data: DemoRequest } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null) return { ok: false, error: "Datos inválidos." };
  const raw = input as Record<string, unknown>;
  const str = (k: string, max: number = MAX.short) =>
    typeof raw[k] === "string" ? (raw[k] as string).trim().slice(0, max) : "";

  const data: DemoRequest = {
    name: str("name"),
    email: str("email").toLowerCase(),
    phone: str("phone", 40),
    venue: str("venue"),
    venueType: str("venueType"),
    capacity: str("capacity"),
    seating: str("seating"),
    events: str("events"),
    currentTicketing: str("currentTicketing"),
    message: str("message", MAX.message),
  };

  if (!data.name) return { ok: false, error: "Contanos tu nombre." };
  if (!EMAIL_RE.test(data.email)) return { ok: false, error: "Revisá el email." };
  if (!data.venue) return { ok: false, error: "Contanos el nombre de tu sala o productora." };
  if (!data.venueType) return { ok: false, error: "Elegí qué tipo de espacio es." };
  if (
    !oneOf(venueTypes, data.venueType) ||
    !oneOf(capacities, data.capacity) ||
    !oneOf(seatingTypes, data.seating) ||
    !oneOf(eventsPerMonth, data.events)
  ) {
    return { ok: false, error: "Alguna de las opciones elegidas no es válida." };
  }
  return { ok: true, data };
}
