"use client";

import { useActionState, useState, type ChangeEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { photoToDataUrl } from "../../_components/images";
import { buttonClass, inputClass } from "../../_components/styles";
import { Field, FormError, FormSaved, SubmitButton } from "../../_components/ui";
import {
  addPerformanceAction,
  createEventAction,
  savePricingAction,
  setSeatsBlockedAction,
  updateDetailsAction,
  type EventFormState,
} from "./actions";
import { DEFAULT_LOCATIONS, LocationsEditor, serializeLocations, type Location } from "./_locations";

const initial: EventFormState = {};

// Los inputs datetime-local no tienen zona: se muestran y se cargan en hora de Argentina.
function toLocalInput(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value)).replace(" ", "T");
}

function ImageField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [error, setError] = useState("");

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      onChange(await photoToDataUrl(file));
    } catch {
      setError("No pudimos usar esa imagen. Probá con un JPG más liviano.");
    }
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-palco-900">Imagen o flyer</span>
      <input type="hidden" name="image" value={value} />
      {value && (
        // eslint-disable-next-line @next/next/no-img-element -- es la imagen recién elegida, en data URL.
        <img src={value} alt="" className="mb-2 aspect-video w-full max-w-sm rounded-lg object-cover" />
      )}
      <div className="flex items-center gap-3">
        <label className={`${buttonClass("secondary")} cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-palco-300`}>
          <ImagePlus className="size-4" aria-hidden />
          {value ? "Cambiar imagen" : "Subir imagen"}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} className="sr-only" />
        </label>
        {value && (
          <button type="button" onClick={() => onChange("")} className="text-sm text-palco-600 underline">Quitar</button>
        )}
      </div>
      <FormError message={error} />
    </div>
  );
}

function DescriptionField({ defaultValue }: { defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-palco-900">Descripción</span>
      <textarea name="description" rows={4} maxLength={3000} defaultValue={defaultValue} className={inputClass} />
    </label>
  );
}

type VenueOption = { id: string; name: string; sellable: boolean };
type SaleMode = "mapa" | "ubicaciones";

const NEW_PLACE = "nuevo";

function ModeOption({ mode, current, onPick, disabled, title, text }: { mode: SaleMode; current: SaleMode; onPick: (mode: SaleMode) => void; disabled?: boolean; title: string; text: string }) {
  const active = mode === current;
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${active ? "border-palco-900 bg-palco-50" : "border-palco-200 bg-white hover:bg-palco-50"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <input type="radio" name="mode" value={mode} checked={active} disabled={disabled} onChange={() => onPick(mode)} className="mt-1 accent-palco-900" />
      <span>
        <span className="block text-sm font-semibold text-palco-900">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-palco-600">{text}</span>
      </span>
    </label>
  );
}

export function CreateEventForm({ venues }: { venues: VenueOption[] }) {
  const [state, action] = useActionState(createEventAction, initial);
  const [image, setImage] = useState("");
  const withMap = venues.filter((venue) => venue.sellable);
  // Sin una sala con mapa, la única forma de vender es por ubicación.
  const [mode, setMode] = useState<SaleMode>(withMap.length > 0 ? "mapa" : "ubicaciones");
  const [place, setPlace] = useState(venues[0]?.id ?? NEW_PLACE);
  const [locations, setLocations] = useState<Location[]>(DEFAULT_LOCATIONS);
  const byLocation = mode === "ubicaciones";

  return (
    <form action={action} className="space-y-4">
      <Field label="Título" name="title" required maxLength={120} />

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-palco-900">¿Cómo vendés las entradas?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <ModeOption
            mode="mapa"
            current={mode}
            onPick={setMode}
            disabled={withMap.length === 0}
            title="Con mapa de la sala"
            text={withMap.length === 0 ? "Primero armá una sala con su mapa en Salas y mapas." : "El público ve el plano y elige su butaca o su sector."}
          />
          <ModeOption
            mode="ubicaciones"
            current={mode}
            onPick={setMode}
            title="Solo por ubicación"
            text="Ideal para boliches: General, VIP, mesas... con su capacidad, sin dibujar un mapa."
          />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {byLocation ? (
          <div className="space-y-2">
            {venues.length > 0 && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-palco-900">Lugar</span>
                <select value={place} onChange={(event) => setPlace(event.target.value)} className={inputClass}>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>{venue.name}</option>
                  ))}
                  <option value={NEW_PLACE}>Otro lugar…</option>
                </select>
              </label>
            )}
            <input type="hidden" name="venueId" value={place === NEW_PLACE ? "" : place} />
            {place === NEW_PLACE && (
              <Field label={venues.length > 0 ? "Nombre del lugar nuevo" : "Lugar"} name="venueName" required maxLength={80} placeholder="Ej.: Moscú, Costanera" />
            )}
          </div>
        ) : (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-palco-900">Sala</span>
            <select name="venueId" required className={inputClass} defaultValue={withMap[0]?.id}>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id} disabled={!venue.sellable}>
                  {venue.name}{venue.sellable ? "" : " (sin mapa)"}
                </option>
              ))}
            </select>
          </label>
        )}
        <Field label="Primera función" name="startsAt" type="datetime-local" required hint="En hora de Argentina." />
      </div>

      {byLocation && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-palco-900">Ubicaciones</p>
          <input type="hidden" name="locations" value={serializeLocations(locations)} />
          <LocationsEditor value={locations} onChange={setLocations} />
          <p className="mt-1.5 text-xs text-palco-500">Los precios y los lotes de cada una los cargás en el paso siguiente.</p>
        </div>
      )}

      <DescriptionField />
      <ImageField value={image} onChange={setImage} />
      <FormError message={state.error} />
      <SubmitButton>Crear evento</SubmitButton>
    </form>
  );
}

export function DetailsForm({ event }: { event: { id: string; title: string; description: string; image: string | null } }) {
  const [state, action] = useActionState(updateDetailsAction, initial);
  const [image, setImage] = useState(event.image ?? "");
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={event.id} />
      <Field label="Título" name="title" required maxLength={120} defaultValue={event.title} />
      <DescriptionField defaultValue={event.description} />
      <ImageField value={image} onChange={setImage} />
      <FormError message={state.error} />
      <div className="flex items-center gap-3">
        <SubmitButton>Guardar datos</SubmitButton>
        <FormSaved show={state.saved} />
      </div>
    </form>
  );
}

export function AddPerformanceForm({ eventId }: { eventId: string }) {
  const [state, action] = useActionState(addPerformanceAction, initial);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={eventId} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Field label="Nueva función" name="startsAt" type="datetime-local" required hint="En hora de Argentina." />
        </div>
        <SubmitButton variant="secondary">Agregar función</SubmitButton>
      </div>
      <FormError message={state.error} />
    </form>
  );
}

// Un botón con su propio mensaje de error: publicar, cerrar, quitar una función.
export function ActionButton({
  action,
  fields,
  variant = "secondary",
  confirm,
  children,
}: {
  action: (state: EventFormState, data: FormData) => Promise<EventFormState>;
  fields: Record<string, string>;
  variant?: "primary" | "secondary" | "danger";
  confirm?: string;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState(action, initial);
  return (
    <form action={formAction} className="contents">
      {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <SubmitButton variant={variant} confirm={confirm}>{children}</SubmitButton>
      {state.error && <span className="basis-full"><FormError message={state.error} /></span>}
    </form>
  );
}

type Lot = { id?: string; name: string; price: string; quota: string; startsAt: string; endsAt: string };
type SectorInput = {
  id: string;
  name: string;
  kind: string;
  capacity: number | null;
  price: number | null;
  lots: { id: string; name: string; price: number; quota: number | null; startsAt: string | null; endsAt: string | null }[];
};

export function PricingForm({ eventId, sectors }: { eventId: string; sectors: SectorInput[] }) {
  const [state, action] = useActionState(savePricingAction, initial);
  const [values, setValues] = useState(() =>
    sectors.map((sector) => ({
      id: sector.id,
      price: sector.price === null ? "" : String(sector.price),
      lots: sector.lots.map((lot): Lot => ({
        id: lot.id,
        name: lot.name,
        price: String(lot.price),
        quota: lot.quota === null ? "" : String(lot.quota),
        startsAt: toLocalInput(lot.startsAt),
        endsAt: toLocalInput(lot.endsAt),
      })),
    })),
  );

  const setSector = (index: number, patch: Partial<(typeof values)[number]>) =>
    setValues((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const setLot = (index: number, lotIndex: number, patch: Partial<Lot>) =>
    setSector(index, { lots: values[index].lots.map((lot, i) => (i === lotIndex ? { ...lot, ...patch } : lot)) });

  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="sectors" value={JSON.stringify(values)} />
      {sectors.map((sector, index) => (
        <div key={sector.id} className="rounded-lg border border-palco-100 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-semibold text-palco-900">{sector.name}</p>
              <p className="text-xs text-palco-600">{sector.kind === "general" ? `Ubicación general · hasta ${sector.capacity} personas` : "Butacas numeradas"}</p>
            </div>
            <div className="w-40">
              <Field
                label="Precio ($)"
                inputMode="numeric"
                value={values[index].price}
                onChange={(event) => setSector(index, { price: event.target.value })}
              />
            </div>
          </div>
          {values[index].lots.map((lot, lotIndex) => (
            <div key={lot.id ?? lotIndex} className="mt-3 grid items-end gap-2 rounded-lg bg-palco-50 p-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.7fr_1.2fr_1.2fr_auto]">
              <Field label="Lote" placeholder="Preventa" value={lot.name} onChange={(event) => setLot(index, lotIndex, { name: event.target.value })} />
              <Field label="Precio" inputMode="numeric" value={lot.price} onChange={(event) => setLot(index, lotIndex, { price: event.target.value })} />
              <Field label="Cupo" inputMode="numeric" value={lot.quota} onChange={(event) => setLot(index, lotIndex, { quota: event.target.value })} />
              <Field label="Desde" type="datetime-local" value={lot.startsAt} onChange={(event) => setLot(index, lotIndex, { startsAt: event.target.value })} />
              <Field label="Hasta" type="datetime-local" value={lot.endsAt} onChange={(event) => setLot(index, lotIndex, { endsAt: event.target.value })} />
              <button
                type="button"
                aria-label={`Quitar el lote ${lot.name}`}
                onClick={() => setSector(index, { lots: values[index].lots.filter((_, i) => i !== lotIndex) })}
                className="rounded-lg p-2 text-palco-600 hover:bg-palco-100"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSector(index, { lots: [...values[index].lots, { name: "", price: "", quota: "", startsAt: "", endsAt: "" }] })}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-palco-700 hover:underline"
          >
            <Plus className="size-4" aria-hidden /> Agregar lote de preventa
          </button>
        </div>
      ))}
      <FormError message={state.error} />
      <div className="flex items-center gap-3">
        <SubmitButton>Guardar precios</SubmitButton>
        <FormSaved show={state.saved} />
      </div>
    </form>
  );
}

type Seat = { id: string; sector: string; row: string; number: number; status: string; blockReason: string | null; expired: boolean };

const SEAT_STYLES: Record<string, string> = {
  free: "bg-white border-palco-300 text-palco-800 hover:bg-palco-100",
  blocked: "bg-palco-700 border-palco-700 text-white",
  taken: "bg-palco-200 border-palco-200 text-palco-500 cursor-not-allowed",
};

function IntentButton({ intent, disabled, children }: { intent: string; disabled: boolean; children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="intent" value={intent} disabled={disabled || pending} className={buttonClass(intent === "block" ? "primary" : "secondary")}>
      {children}
    </button>
  );
}

export function SeatBlocker({
  eventId,
  performanceId,
  seats,
  reasons,
}: {
  eventId: string;
  performanceId: string;
  seats: Seat[];
  reasons: string[];
}) {
  const [state, action] = useActionState(setSeatsBlockedAction, initial);
  const [selected, setSelected] = useState<string[]>([]);
  const [handled, setHandled] = useState(state);

  if (state !== handled) {
    setHandled(state);
    if (state.saved) setSelected([]);
  }

  if (seats.length === 0) {
    return <p className="text-sm text-palco-600">Esta función no tiene butacas numeradas.</p>;
  }

  const bySector = new Map<string, Map<string, Seat[]>>();
  for (const seat of seats) {
    const rows = bySector.get(seat.sector) ?? new Map<string, Seat[]>();
    rows.set(seat.row, [...(rows.get(seat.row) ?? []), seat]);
    bySector.set(seat.sector, rows);
  }
  const isTaken = (seat: Seat) => seat.status === "sold" || (seat.status === "held" && !seat.expired);
  const blockedCount = seats.filter((seat) => seat.status === "blocked").length;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="performanceId" value={performanceId} />
      <input type="hidden" name="seatIds" value={JSON.stringify(selected)} />
      <p className="text-sm text-palco-600">
        Tocá las butacas para elegirlas. {blockedCount} bloqueadas de {seats.length}.
      </p>
      <div className="max-h-[420px] space-y-5 overflow-auto rounded-lg border border-palco-100 p-3">
        {[...bySector].map(([sector, rows]) => (
          <div key={sector}>
            <p className="mb-2 text-sm font-semibold text-palco-900">{sector}</p>
            <div className="space-y-1">
              {[...rows].map(([row, rowSeats]) => (
                <div key={row} className="flex items-center gap-1">
                  <span className="w-6 shrink-0 text-xs font-medium text-palco-600">{row}</span>
                  {rowSeats.map((seat) => {
                    const taken = isTaken(seat);
                    const active = selected.includes(seat.id);
                    return (
                      <button
                        key={seat.id}
                        type="button"
                        disabled={taken}
                        aria-pressed={active}
                        aria-label={`Fila ${row}, butaca ${seat.number}${seat.blockReason ? `, bloqueada: ${seat.blockReason}` : taken ? ", ocupada" : ""}`}
                        title={seat.blockReason ?? undefined}
                        onClick={() => setSelected((current) => (active ? current.filter((id) => id !== seat.id) : [...current, seat.id]))}
                        className={`size-6 shrink-0 rounded border text-[9px] font-medium transition ${SEAT_STYLES[taken ? "taken" : seat.status === "blocked" ? "blocked" : "free"]} ${active ? "ring-2 ring-offset-1 ring-[#2563eb]" : ""}`}
                      >
                        {seat.number}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-palco-900">Motivo</span>
          <select name="reason" defaultValue={reasons[0]} className={inputClass}>
            {reasons.map((reason) => <option key={reason}>{reason}</option>)}
          </select>
        </label>
        <IntentButton intent="block" disabled={selected.length === 0}>Bloquear {selected.length || ""}</IntentButton>
        <IntentButton intent="release" disabled={selected.length === 0}>Liberar</IntentButton>
        <FormSaved show={Boolean(state.saved)}>{state.message}</FormSaved>
      </div>
      <FormError message={state.error} />
    </form>
  );
}
