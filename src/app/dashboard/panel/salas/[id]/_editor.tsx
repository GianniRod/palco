"use client";

import { useActionState, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Armchair, Copy, MicVocal, Tag, Trash2, Users } from "lucide-react";
import { mapStyle, SectorBody, type MapSector, type VenueMapData } from "@/components/venue-map";
import { Field, FormError, FormSaved, SubmitButton } from "../../../_components/ui";
import { deleteVenueAction, saveVenueAction, type VenueFormState } from "../actions";

type Venue = { id: string; name: string; address: string | null; map: VenueMapData; eventCount: number };
type Drag = { key: string; mode: "move" | "resize"; startX: number; startY: number; origin: MapSector };

const newKey = () => crypto.randomUUID();
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const snap = (value: number) => Math.round(value * 2) / 2;

const NEW_SECTOR: Record<MapSector["kind"], Omit<MapSector, "key">> = {
  numbered: { kind: "numbered", name: "Platea", x: 20, y: 25, w: 60, h: 35, rows: [10, 12, 14, 14], aisles: [] },
  general: { kind: "general", name: "Campo", x: 20, y: 40, w: 60, h: 35, capacity: 300 },
  stage: { kind: "stage", name: "Escenario", x: 25, y: 3, w: 50, h: 12 },
  label: { kind: "label", name: "Barra", x: 40, y: 85, w: 20, h: 10 },
};

const withKeys = (sectors: Omit<MapSector, "key">[]) => sectors.map((sector) => ({ ...sector, key: newKey() }));

const PRESETS: { name: string; sectors: Omit<MapSector, "key">[] }[] = [
  {
    name: "Teatro",
    sectors: [
      { kind: "stage", name: "Escenario", x: 25, y: 2, w: 50, h: 12 },
      { kind: "numbered", name: "Platea", x: 18, y: 20, w: 64, h: 42, rows: [10, 12, 14, 16, 16, 16], aisles: [] },
      { kind: "numbered", name: "Palco izquierdo", x: 2, y: 20, w: 13, h: 42, rows: [2, 2, 2, 2], aisles: [] },
      { kind: "numbered", name: "Palco derecho", x: 85, y: 20, w: 13, h: 42, rows: [2, 2, 2, 2], aisles: [] },
      { kind: "numbered", name: "Pullman", x: 12, y: 68, w: 76, h: 28, rows: [18, 20, 20], aisles: [] },
    ],
  },
  {
    name: "Boliche",
    sectors: [
      { kind: "stage", name: "Cabina", x: 35, y: 2, w: 30, h: 12 },
      { kind: "general", name: "Pista", x: 18, y: 18, w: 64, h: 50, capacity: 500 },
      { kind: "general", name: "VIP", x: 18, y: 72, w: 42, h: 24, capacity: 60 },
      { kind: "label", name: "Barra", x: 64, y: 76, w: 18, h: 14 },
      { kind: "label", name: "Entrada", x: 86, y: 44, w: 13, h: 10 },
    ],
  },
];

const parseList = (text: string) =>
  text.split(/[,\s]+/).filter(Boolean).map(Number).filter((value) => Number.isInteger(value) && value > 0);

function SectorProperties({
  sector,
  onChange,
  onDuplicate,
  onDelete,
}: {
  sector: MapSector;
  onChange: (patch: Partial<MapSector>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  // Se guarda el texto tal cual para poder escribir "10, " sin que se reformatee a mitad de camino.
  const [rowsText, setRowsText] = useState(sector.rows?.join(", ") ?? "");
  const [aislesText, setAislesText] = useState(sector.aisles?.join(", ") ?? "");
  const seats = (sector.rows ?? []).reduce((total, count) => total + count, 0);

  return (
    <div className="space-y-3">
      <Field label="Nombre" maxLength={40} value={sector.name} onChange={(event) => onChange({ name: event.target.value })} />
      {sector.kind === "numbered" && (
        <>
          <Field
            label="Butacas por fila"
            value={rowsText}
            onChange={(event) => {
              setRowsText(event.target.value);
              onChange({ rows: parseList(event.target.value) });
            }}
            hint={`Una cifra por fila, separadas por coma. ${sector.rows?.length ?? 0} filas y ${seats} butacas.`}
          />
          <Field
            label="Pasillos (opcional)"
            value={aislesText}
            onChange={(event) => {
              setAislesText(event.target.value);
              onChange({ aisles: parseList(event.target.value) });
            }}
            hint="Después de qué butaca hay un pasillo. Ej.: 7"
          />
        </>
      )}
      {sector.kind === "general" && (
        <Field
          label="Capacidad"
          type="number"
          min={1}
          value={sector.capacity ?? ""}
          onChange={(event) => onChange({ capacity: Number(event.target.value) })}
        />
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onDuplicate} className="inline-flex items-center gap-1 rounded-lg border border-palco-200 bg-white px-3 py-1.5 text-xs font-medium text-palco-800 hover:bg-palco-50">
          <Copy className="size-3.5" aria-hidden /> Duplicar
        </button>
        <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded-lg border border-palco-200 bg-white px-3 py-1.5 text-xs font-medium text-palco-800 hover:bg-palco-50">
          <Trash2 className="size-3.5" aria-hidden /> Quitar
        </button>
      </div>
    </div>
  );
}

export function VenueEditor({ venue }: { venue: Venue }) {
  const [saveState, saveAction] = useActionState(saveVenueAction, {} as VenueFormState);
  const [deleteState, deleteAction] = useActionState(deleteVenueAction, {} as VenueFormState);
  const [name, setName] = useState(venue.name);
  const [address, setAddress] = useState(venue.address ?? "");
  const [sectors, setSectors] = useState<MapSector[]>(venue.map.sectors);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  const selected = sectors.find((sector) => sector.key === selectedKey) ?? null;
  const update = (key: string, patch: Partial<MapSector>) =>
    setSectors((current) => current.map((sector) => (sector.key === key ? { ...sector, ...patch } : sector)));

  function add(kind: MapSector["kind"]) {
    const sector = { ...NEW_SECTOR[kind], key: newKey() };
    const taken = sectors.filter((other) => other.name.startsWith(sector.name)).length;
    if (taken > 0) sector.name = `${sector.name} ${taken + 1}`;
    setSectors((current) => [...current, sector]);
    setSelectedKey(sector.key);
  }

  function startDrag(event: PointerEvent, sector: MapSector, mode: Drag["mode"]) {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { key: sector.key, mode, startX: event.clientX, startY: event.clientY, origin: sector };
    setSelectedKey(sector.key);
  }

  function onDrag(event: PointerEvent) {
    const current = drag.current;
    const rect = canvas.current?.getBoundingClientRect();
    if (!current || !rect) return;
    const dx = ((event.clientX - current.startX) / rect.width) * 100;
    const dy = ((event.clientY - current.startY) / rect.height) * 100;
    const { origin } = current;
    update(
      current.key,
      current.mode === "move"
        ? { x: snap(clamp(origin.x + dx, 0, 100 - origin.w)), y: snap(clamp(origin.y + dy, 0, 100 - origin.h)) }
        : { w: snap(clamp(origin.w + dx, 3, 100 - origin.x)), h: snap(clamp(origin.h + dy, 3, 100 - origin.y)) },
    );
  }

  // También se mueve con el teclado: flechas para mover, Shift + flechas para cambiar el tamaño.
  function onKeyDown(event: KeyboardEvent, sector: MapSector) {
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!delta) return;
    event.preventDefault();
    update(
      sector.key,
      event.shiftKey
        ? { w: clamp(sector.w + delta[0], 3, 100 - sector.x), h: clamp(sector.h + delta[1], 3, 100 - sector.y) }
        : { x: clamp(sector.x + delta[0], 0, 100 - sector.w), y: clamp(sector.y + delta[1], 0, 100 - sector.h) },
    );
  }

  const addButtons = [
    { kind: "numbered", label: "Butacas", icon: Armchair },
    { kind: "general", label: "General", icon: Users },
    { kind: "stage", label: "Escenario", icon: MicVocal },
    { kind: "label", label: "Referencia", icon: Tag },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-palco-100 bg-white shadow-sm">
        <div className="grid md:grid-cols-[280px_minmax(0,1fr)]">
          <form action={saveAction} noValidate className="flex flex-col gap-4 border-b border-palco-100 p-4 md:border-b-0 md:border-r">
            <input type="hidden" name="id" value={venue.id} />
            <input type="hidden" name="map" value={JSON.stringify({ sectors })} />
            <Field label="Nombre de la sala" name="name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
            <Field label="Dirección" name="address" maxLength={160} value={address} onChange={(event) => setAddress(event.target.value)} />

            <div>
              <p className="mb-1.5 text-sm font-medium text-palco-900">Agregar al mapa</p>
              <div className="grid grid-cols-2 gap-2">
                {addButtons.map(({ kind, label, icon: Icon }) => (
                  <button key={kind} type="button" onClick={() => add(kind)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-palco-200 bg-white px-2 py-2 text-xs font-medium text-palco-800 transition hover:bg-palco-50">
                    <Icon className="size-3.5" aria-hidden /> {label}
                  </button>
                ))}
              </div>
            </div>

            {selected ? (
              <div className="border-t border-palco-100 pt-4">
                <p className="mb-2 text-sm font-medium text-palco-900">Elemento seleccionado</p>
                <SectorProperties
                  key={selected.key}
                  sector={selected}
                  onChange={(patch) => update(selected.key, patch)}
                  onDuplicate={() => {
                    const copy = { ...selected, key: newKey(), name: `${selected.name} copia`, x: clamp(selected.x + 3, 0, 100 - selected.w), y: clamp(selected.y + 3, 0, 100 - selected.h) };
                    setSectors((current) => [...current, copy]);
                    setSelectedKey(copy.key);
                  }}
                  onDelete={() => {
                    setSectors((current) => current.filter((sector) => sector.key !== selected.key));
                    setSelectedKey(null);
                  }}
                />
              </div>
            ) : (
              <p className="text-xs text-palco-600">Tocá un elemento del mapa para editarlo. Arrastralo para moverlo y usá la esquina para cambiar su tamaño.</p>
            )}

            <div className="mt-auto space-y-2 border-t border-palco-100 pt-4">
              <FormError message={saveState.error} />
              <div className="flex items-center gap-3">
                <SubmitButton className="flex-1">Guardar sala</SubmitButton>
                <FormSaved show={saveState.saved} />
              </div>
              {venue.eventCount > 0 && (
                <p className="text-xs text-palco-600">Los {venue.eventCount} eventos ya creados conservan el mapa que copiaron.</p>
              )}
            </div>
          </form>

          <div className="min-w-0 bg-palco-50 p-4 sm:p-6">
            <div
              ref={canvas}
              onPointerDown={() => setSelectedKey(null)}
              style={{ ...mapStyle("#111111", "#16161a", "#ffffff"), backgroundSize: "5% 6.667%", backgroundImage: "linear-gradient(to right, rgba(0,0,0,.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.05) 1px, transparent 1px)" }}
              className="relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-xl border border-palco-200 bg-white text-[#16161a]"
            >
              {sectors.map((sector) => (
                <div
                  key={sector.key}
                  role="button"
                  tabIndex={0}
                  aria-label={`${sector.name}. Flechas para mover, Shift y flechas para cambiar el tamaño.`}
                  aria-pressed={selectedKey === sector.key}
                  onPointerDown={(event) => startDrag(event, sector, "move")}
                  onPointerMove={onDrag}
                  onPointerUp={() => { drag.current = null; }}
                  onFocus={() => setSelectedKey(sector.key)}
                  onKeyDown={(event) => onKeyDown(event, sector)}
                  className={`absolute cursor-move rounded-md outline-none ${selectedKey === sector.key ? "z-10 ring-2 ring-offset-1 ring-[#2563eb]" : ""}`}
                  style={{ left: `${sector.x}%`, top: `${sector.y}%`, width: `${sector.w}%`, height: `${sector.h}%` }}
                >
                  <SectorBody sector={sector} />
                  {selectedKey === sector.key && (
                    <span
                      aria-hidden
                      onPointerDown={(event) => startDrag(event, sector, "resize")}
                      onPointerMove={onDrag}
                      onPointerUp={() => { drag.current = null; }}
                      className="absolute -bottom-1.5 -right-1.5 size-4 cursor-se-resize rounded-sm border-2 border-[#2563eb] bg-white"
                    />
                  )}
                </div>
              ))}
              {sectors.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="font-semibold">Empezá con un modelo o agregá elementos</p>
                  <div className="flex flex-wrap justify-center gap-2" onPointerDown={(event) => event.stopPropagation()}>
                    {PRESETS.map((preset) => (
                      <button key={preset.name} type="button" onClick={() => setSectors(withKeys(preset.sectors))} className="rounded-lg bg-[#16161a] px-4 py-2 text-sm font-medium text-white">
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {venue.eventCount === 0 && (
        <form action={deleteAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={venue.id} />
          <SubmitButton variant="danger" confirm={`¿Borrar la sala ${venue.name}?`}>Borrar sala</SubmitButton>
          <FormError message={deleteState.error} />
        </form>
      )}
    </div>
  );
}
