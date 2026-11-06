"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { inputClass } from "../../_components/styles";
import { FormError, FormSaved, SubmitButton } from "../../_components/ui";
import { saveLocationsAction, type EventFormState } from "./actions";

// Venta "solo por ubicación": General, VIP... con su capacidad, sin dibujar un plano.
// El precio de cada una se carga después, en "Precios y lotes", igual que con mapa.

export type Location = { key?: string; name: string; capacity: string };

export const DEFAULT_LOCATIONS: Location[] = [
  { name: "General", capacity: "300" },
  { name: "VIP", capacity: "50" },
];

const MAX = 20;

export function LocationsEditor({ value, onChange }: { value: Location[]; onChange: (value: Location[]) => void }) {
  const set = (index: number, patch: Partial<Location>) =>
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const total = value.reduce((sum, item) => sum + (Number(item.capacity) || 0), 0);

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[minmax(0,1fr)_120px_36px] gap-2 text-xs font-medium text-palco-600 sm:grid">
        <span>Ubicación</span>
        <span>Capacidad</span>
      </div>
      {value.map((item, index) => (
        <div key={item.key ?? index} className="grid grid-cols-[minmax(0,1fr)_96px_36px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_120px_36px]">
          <input
            aria-label={`Nombre de la ubicación ${index + 1}`}
            value={item.name}
            maxLength={40}
            placeholder="Ej.: General, VIP, Mesa"
            onChange={(event) => set(index, { name: event.target.value })}
            className={inputClass}
          />
          <input
            aria-label={`Capacidad de ${item.name || `la ubicación ${index + 1}`}`}
            type="number"
            inputMode="numeric"
            min={1}
            value={item.capacity}
            placeholder="Personas"
            onChange={(event) => set(index, { capacity: event.target.value })}
            className={inputClass}
          />
          <button
            type="button"
            aria-label={`Quitar ${item.name || "ubicación"}`}
            disabled={value.length <= 1}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            className="flex size-9 items-center justify-center rounded-lg text-palco-500 transition hover:bg-palco-50 hover:text-palco-900 disabled:opacity-30"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          disabled={value.length >= MAX}
          onClick={() => onChange([...value, { name: "", capacity: "" }])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-palco-200 bg-white px-3 py-1.5 text-xs font-medium text-palco-800 transition hover:bg-palco-50 disabled:opacity-40"
        >
          <Plus className="size-3.5" aria-hidden /> Agregar ubicación
        </button>
        <span className="text-xs text-palco-500">Capacidad total: {total.toLocaleString("es-AR")} personas</span>
      </div>
    </div>
  );
}

export const serializeLocations = (value: Location[]) =>
  JSON.stringify(value.map((item) => ({ key: item.key, name: item.name, capacity: item.capacity })));

// En la página del evento: cambiar las ubicaciones mientras está en borrador.
export function LocationsForm({ eventId, initial }: { eventId: string; initial: Location[] }) {
  const [state, action] = useActionState(saveLocationsAction, {} as EventFormState);
  const [locations, setLocations] = useState(initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="locations" value={serializeLocations(locations)} />
      <LocationsEditor value={locations} onChange={setLocations} />
      <FormError message={state.error} />
      <div className="flex items-center gap-3">
        <SubmitButton>Guardar ubicaciones</SubmitButton>
        <FormSaved show={state.saved} />
      </div>
    </form>
  );
}
