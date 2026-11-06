"use client";

import type { KeyboardEvent, PointerEvent } from "react";
import { Minus, PenTool, Plus, RectangleHorizontal, Spline } from "lucide-react";
import type { MapSector, ShapePoint } from "@/components/venue-map";
import { edgeCurvature, edgeMiddle, MAX_POINTS, shapeOf, shortestEdge, toCanvas } from "./_shape";

export type PenSelection = { kind: "point" | "edge"; index: number } | null;
export type PenHandleKind = "point" | "edge";

const smallButton =
  "inline-flex items-center justify-center gap-1 rounded-lg border border-palco-200 bg-white px-2.5 py-1.5 text-xs font-medium text-palco-800 transition hover:bg-palco-50 disabled:cursor-not-allowed disabled:opacity-40";

// Manijas sobre el lienzo: cuadradas en las esquinas (mover) y redondas en el medio de cada lado (curvar).
export function PenHandles({
  sector,
  selection,
  onStart,
  onMove,
  onEnd,
  onSplit,
  onNudge,
}: {
  sector: MapSector;
  selection: PenSelection;
  onStart: (event: PointerEvent, kind: PenHandleKind, index: number) => void;
  onMove: (event: PointerEvent) => void;
  onEnd: () => void;
  onSplit: (index: number) => void;
  onNudge: (kind: PenHandleKind, index: number, dx: number, dy: number) => void;
}) {
  const shape = shapeOf(sector);
  const keys = (kind: PenHandleKind, index: number) => (event: KeyboardEvent) => {
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!delta) return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 2 : 0.5;
    onNudge(kind, index, delta[0] * step, delta[1] * step);
  };
  const handle = (kind: PenHandleKind, index: number, at: { x: number; y: number }, label: string) => {
    const active = selection?.kind === kind && selection.index === index;
    return (
      <button
        key={`${kind}-${index}`}
        type="button"
        aria-label={label}
        aria-pressed={active}
        onPointerDown={(event) => onStart(event, kind, index)}
        onPointerMove={onMove}
        onPointerUp={onEnd}
        onPointerCancel={onEnd}
        onDoubleClick={kind === "edge" ? () => onSplit(index) : undefined}
        onKeyDown={keys(kind, index)}
        // Zona táctil de 28px aunque el dibujo de la manija sea chico.
        className={`absolute z-20 flex size-7 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center outline-none ${kind === "point" ? "cursor-move" : "cursor-grab"}`}
        style={{ left: `${at.x}%`, top: `${at.y}%` }}
      >
        <span
          className={`block border-2 border-[#2563eb] shadow-sm ${kind === "point" ? "size-3 rounded-[3px]" : "size-2.5 rounded-full"} ${active ? "bg-[#2563eb]" : "bg-white"}`}
        />
      </button>
    );
  };

  return (
    <>
      {shape.map((_, index) => handle("edge", index, toCanvas(sector, edgeMiddle(shape, index)), `Lado ${index + 1}: arrastrá para curvarlo`))}
      {shape.map((point, index) => handle("point", index, toCanvas(sector, point), `Punto ${index + 1}: arrastrá para moverlo`))}
    </>
  );
}

// Panel "Forma" del elemento elegido: pluma, curvatura y puntos.
export function ShapePanel({
  sector,
  active,
  selection,
  onToggle,
  onCurvature,
  onAddPoint,
  onRemovePoint,
  onReset,
}: {
  sector: MapSector;
  active: boolean;
  selection: PenSelection;
  onToggle: () => void;
  onCurvature: (value: number) => void;
  onAddPoint: () => void;
  onRemovePoint: () => void;
  onReset: () => void;
}) {
  const shape: ShapePoint[] = shapeOf(sector);
  const edge = selection?.kind === "edge" ? selection.index : null;
  // Sin un lado elegido, la curvatura se aplica a todos: muestra la del primero como referencia.
  const curvature = edgeCurvature(sector, shape, edge ?? 0, edge === null ? shortestEdge(sector, shape) : undefined);
  const custom = Boolean(sector.shape);

  return (
    <div className="space-y-3 border-t border-palco-100 pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-palco-900">Forma</p>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={active}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-[#2563eb] text-white" : "border border-palco-200 bg-white text-palco-800 hover:bg-palco-50"}`}
        >
          <PenTool className="size-3.5" aria-hidden /> {active ? "Listo" : "Pluma"}
        </button>
      </div>

      {active && (
        <p className="text-xs leading-relaxed text-palco-600">
          Arrastrá los <strong>cuadrados</strong> para mover las esquinas y los <strong>círculos</strong> para curvar un lado.
          Doble clic en un círculo agrega un punto.
        </p>
      )}

      <label className="block">
        <span className="mb-1 flex items-center justify-between text-xs font-medium text-palco-800">
          <span className="inline-flex items-center gap-1">
            <Spline className="size-3.5" aria-hidden />
            Curvatura {edge === null ? "(todos los lados)" : `(lado ${edge + 1})`}
          </span>
          <span className="tabular-nums text-palco-500">{curvature}</span>
        </span>
        <input
          type="range"
          min={-100}
          max={100}
          step={1}
          value={curvature}
          onChange={(event) => onCurvature(Number(event.target.value))}
          className="w-full accent-[#2563eb]"
        />
        <span className="mt-0.5 flex justify-between text-[10px] text-palco-500">
          <span>Hacia adentro</span>
          <span>Recto</span>
          <span>Hacia afuera</span>
        </span>
      </label>

      {active && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onAddPoint} disabled={shape.length >= MAX_POINTS} className={smallButton}>
            <Plus className="size-3.5" aria-hidden /> Agregar punto
          </button>
          <button type="button" onClick={onRemovePoint} disabled={selection?.kind !== "point" || shape.length <= 3} className={smallButton}>
            <Minus className="size-3.5" aria-hidden /> Quitar punto
          </button>
        </div>
      )}
      {custom && (
        <button type="button" onClick={onReset} className={smallButton}>
          <RectangleHorizontal className="size-3.5" aria-hidden /> Volver a rectángulo
        </button>
      )}
    </div>
  );
}
