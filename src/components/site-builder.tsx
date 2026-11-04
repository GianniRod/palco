"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Check, Loader2, MousePointer2, RotateCcw } from "lucide-react";
import { useInView, useReducedMotion } from "./hooks";

/* ------------------------------------------------------------------ */
/* Datos                                                               */
/* ------------------------------------------------------------------ */

type TemplateId = "clasica" | "nocturna" | "minimal";

const templates: Record<
  TemplateId,
  { name: string; bg: string; fg: string; muted: string; accent: string; onAccent: string; title: string }
> = {
  clasica: {
    name: "Clásica",
    bg: "#F6EFE3",
    fg: "#2A0A12",
    muted: "rgba(42,10,18,0.55)",
    accent: "#7A1428",
    onAccent: "#FFFFFF",
    title: "font-serif",
  },
  nocturna: {
    name: "Nocturna",
    bg: "#0E0B1A",
    fg: "#F4F0FF",
    muted: "rgba(244,240,255,0.55)",
    accent: "#FF4FA3",
    onAccent: "#0E0B1A",
    title: "font-sans font-black uppercase tracking-tight",
  },
  minimal: {
    name: "Minimal",
    bg: "#FFFFFF",
    fg: "#111111",
    muted: "rgba(17,17,17,0.5)",
    accent: "#2F5BFF",
    onAccent: "#FFFFFF",
    title: "font-sans font-semibold tracking-tight",
  },
};
const templateOrder: TemplateId[] = ["clasica", "nocturna", "minimal"];

type Group = "campo" | "tribuna" | "vip";
type SectorId = "escenario" | "campo" | "oeste" | "este" | "vip";

// Posiciones en % dentro del plano
const sectors: Record<
  SectorId,
  { label: string; group: Group | null; x: number; y: number; w: number; h: number }
> = {
  escenario: { label: "Escenario", group: null, x: 28, y: 4, w: 44, h: 13 },
  campo: { label: "Campo", group: "campo", x: 28, y: 23, w: 44, h: 38 },
  oeste: { label: "Tribuna Oeste", group: "tribuna", x: 4, y: 18, w: 18, h: 66 },
  este: { label: "Tribuna Este", group: "tribuna", x: 78, y: 18, w: 18, h: 66 },
  vip: { label: "VIP", group: "vip", x: 28, y: 67, w: 44, h: 22 },
};

const groups: { id: Group; label: string; price: string }[] = [
  { id: "campo", label: "Campo", price: "18000" },
  { id: "tribuna", label: "Tribunas", price: "12000" },
  { id: "vip", label: "VIP", price: "35000" },
];

const palette: { group: Group; label: string }[] = [
  { group: "campo", label: "Campo" },
  { group: "tribuna", label: "Tribuna" },
  { group: "vip", label: "VIP" },
];

const TITLE = "Festival de Primavera";
const DATE = "Sáb 21 de septiembre · 20:00";

type Tab = "plantilla" | "contenido" | "mapa" | "precios";
const tabs: { id: Tab; label: string }[] = [
  { id: "plantilla", label: "Plantilla" },
  { id: "contenido", label: "Contenido" },
  { id: "mapa", label: "Mapa" },
  { id: "precios", label: "Precios" },
];

/* ------------------------------------------------------------------ */
/* Estado y guion                                                      */
/* ------------------------------------------------------------------ */

type State = {
  tab: Tab;
  template: TemplateId;
  title: string;
  date: string;
  placed: SectorId[];
  prices: Partial<Record<Group, string>>;
  cursor: string | null;
  focus: string | null;
  dragging: string | null;
  pressed: boolean;
  publishing: boolean;
  published: boolean;
};

const initial: State = {
  tab: "plantilla",
  template: "clasica",
  title: "",
  date: "",
  placed: ["escenario"],
  prices: {},
  cursor: null,
  focus: null,
  dragging: null,
  pressed: false,
  publishing: false,
  published: false,
};

type Step = { wait: number; apply: (s: State) => State };

const move = (target: string, wait = 650): Step => ({
  wait,
  apply: (s) => ({ ...s, cursor: target }),
});

const click = (fn: (s: State) => State, wait = 750): Step[] => [
  { wait, apply: (s) => ({ ...s, pressed: true }) },
  { wait: 160, apply: (s) => fn({ ...s, pressed: false }) },
];

const type = (text: string, set: (s: State, v: string) => State, speed = 55): Step[] =>
  Array.from(text, (_, i) => ({ wait: speed, apply: (s) => set(s, text.slice(0, i + 1)) }));

function buildScript(): Step[] {
  const steps: Step[] = [];
  const pickTemplate = (id: TemplateId) => [
    move(`tpl-${id}`),
    ...click((s) => ({ ...s, template: id })),
  ];
  const openTab = (id: Tab) => [
    move(`tab-${id}`),
    ...click((s) => ({ ...s, tab: id, focus: null })),
  ];

  // 1. Plantilla: prueba las tres y se queda con Nocturna
  steps.push({ wait: 700, apply: (s) => s });
  steps.push(...pickTemplate("nocturna"), ...pickTemplate("minimal"), ...pickTemplate("nocturna"));

  // 2. Contenido
  steps.push(...openTab("contenido"));
  steps.push(move("in-title"), ...click((s) => ({ ...s, focus: "in-title" })));
  steps.push(...type(TITLE, (s, v) => ({ ...s, title: v })));
  steps.push(move("in-date", 500), ...click((s) => ({ ...s, focus: "in-date" })));
  steps.push(...type(DATE, (s, v) => ({ ...s, date: v }), 40));

  // 3. Mapa: arrastrar sectores
  steps.push(...openTab("mapa"));
  const drops: [SectorId, string][] = [
    ["campo", "Campo"],
    ["oeste", "Tribuna"],
    ["este", "Tribuna"],
    ["vip", "VIP"],
  ];
  for (const [id, label] of drops) {
    const group = sectors[id].group!;
    steps.push(move(`pal-${group}`, 600));
    steps.push({ wait: 300, apply: (s) => ({ ...s, pressed: true, dragging: label }) });
    steps.push(move(`drop-${id}`, 120));
    steps.push({
      wait: 850,
      apply: (s) => ({ ...s, pressed: false, dragging: null, placed: [...s.placed, id] }),
    });
  }

  // 4. Precios
  steps.push(...openTab("precios"));
  for (const g of groups) {
    steps.push(move(`in-price-${g.id}`, 550), ...click((s) => ({ ...s, focus: `in-price-${g.id}` })));
    steps.push(
      ...type(g.price, (s, v) => ({ ...s, prices: { ...s.prices, [g.id]: v } }), 90),
    );
  }

  // 5. Publicar
  steps.push(move("btn-publicar", 700));
  steps.push(...click((s) => ({ ...s, focus: null, publishing: true })));
  steps.push({ wait: 1100, apply: (s) => ({ ...s, publishing: false, published: true, cursor: null }) });
  steps.push({ wait: 4200, apply: () => initial });
  return steps;
}

const script = buildScript();

const finalState: State = script.reduce((s, step, i) => (i === script.length - 1 ? s : step.apply(s)), initial);

const pesos = (digits?: string) =>
  digits ? `$ ${Number(digits).toLocaleString("es-AR")}` : "";

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

export function SiteBuilder() {
  const [viewRef, inView] = useInView<HTMLDivElement>("-15% 0px");
  const reduced = useReducedMotion();
  const [state, setState] = useState<State>(initial);
  const [stepIdx, setStepIdx] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const s = reduced ? finalState : state;

  // Avanza el guion mientras la sección está en pantalla
  useEffect(() => {
    if (!inView || reduced) return;
    const step = script[stepIdx];
    const id = setTimeout(() => {
      setState(step.apply);
      setStepIdx((i) => (i + 1) % script.length);
    }, step.wait);
    return () => clearTimeout(id);
  }, [stepIdx, inView, reduced]);

  // Ubica el cursor sobre el elemento objetivo
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || !s.cursor) return;
    const measure = () => {
      const el = box.querySelector<HTMLElement>(`[data-t="${s.cursor}"]`);
      if (!el) return;
      const b = box.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setPos({ x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [s.cursor, s.tab]);

  return (
    <div ref={viewRef}>
      <div
        ref={boxRef}
        className="relative overflow-hidden rounded-2xl border border-tinta/10 bg-white shadow-[0_40px_100px_-30px_rgba(31,3,10,0.45)]"
      >
        {/* Barra de la app */}
        <div className="flex items-center gap-2 border-b border-tinta/10 bg-papel/60 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-tinta/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-tinta/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-tinta/15" />
          <span className="ml-3 text-xs font-medium text-tinta/60">Palco · Editor de tu web</span>
          <button
            type="button"
            onClick={() => {
              setState(initial);
              setStepIdx(0);
            }}
            className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-tinta/50 transition hover:bg-tinta/5 hover:text-tinta"
          >
            <RotateCcw className="h-3 w-3" /> Repetir
          </button>
        </div>

        <div className="grid md:grid-cols-[300px_1fr]">
          {/* ---------- Panel del cliente ---------- */}
          <div className="flex flex-col border-b border-tinta/10 bg-papel/30 p-4 md:border-b-0 md:border-r">
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-tinta/5 p-1 text-[11px] font-medium">
              {tabs.map((tab) => (
                <span
                  key={tab.id}
                  data-t={`tab-${tab.id}`}
                  className={`rounded-md py-1.5 text-center transition ${
                    s.tab === tab.id ? "bg-white text-tinta shadow-sm" : "text-tinta/50"
                  }`}
                >
                  {tab.label}
                </span>
              ))}
            </div>

            <div className="relative mt-4 min-h-[300px] flex-1">
              {s.tab === "plantilla" && <PanelTemplates current={s.template} />}
              {s.tab === "contenido" && <PanelContent s={s} />}
              {s.tab === "mapa" && <PanelMap s={s} />}
              {s.tab === "precios" && <PanelPrices s={s} />}
            </div>

            <span
              data-t="btn-publicar"
              className={`mt-4 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition ${
                s.published ? "bg-emerald-600 text-white" : "bg-palco-800 text-white"
              }`}
            >
              {s.publishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Publicando…
                </>
              ) : s.published ? (
                <>
                  <Check className="h-4 w-4" /> Publicada
                </>
              ) : (
                "Publicar"
              )}
            </span>
          </div>

          {/* ---------- Vista previa ---------- */}
          <div className="bg-tinta/[0.03] p-4 sm:p-6">
            <div className="overflow-hidden rounded-xl border border-tinta/10 shadow-sm">
              <div className="flex items-center gap-2 border-b border-black/5 bg-white px-3 py-2">
                <span className="flex-1 truncate rounded-md bg-tinta/5 px-3 py-1 text-center text-[11px] text-tinta/50">
                  entradas.tuproductora.com
                </span>
              </div>
              <Preview s={s} />
            </div>
          </div>
        </div>

        {/* Cursor */}
        {pos && s.cursor && !reduced && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-30 transition-transform duration-[650ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
          >
            <span
              className={`absolute -left-3 -top-3 h-6 w-6 rounded-full bg-palco-500/30 transition-transform duration-150 ${
                s.pressed ? "scale-100" : "scale-0"
              }`}
            />
            <MousePointer2
              className="relative h-5 w-5 fill-tinta text-white drop-shadow-md"
              strokeWidth={1.5}
            />
            {s.dragging && (
              <span className="absolute left-4 top-4 whitespace-nowrap rounded-md bg-palco-800 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg">
                {s.dragging}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Paneles del editor                                                  */
/* ------------------------------------------------------------------ */

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-tinta/45">{children}</p>;
}

function PanelTemplates({ current }: { current: TemplateId }) {
  return (
    <div>
      <Label>Elegí una plantilla</Label>
      <div className="space-y-2">
        {templateOrder.map((id) => {
          const tp = templates[id];
          const active = id === current;
          return (
            <div
              key={id}
              data-t={`tpl-${id}`}
              className={`flex items-center gap-3 rounded-lg border bg-white p-2 transition ${
                active ? "border-palco-700 ring-2 ring-palco-700/20" : "border-tinta/10"
              }`}
            >
              <span
                className="flex h-12 w-16 shrink-0 flex-col justify-between overflow-hidden rounded-md p-1.5"
                style={{ background: tp.bg }}
              >
                <span className="h-1.5 w-8 rounded-full" style={{ background: tp.fg, opacity: 0.8 }} />
                <span className="flex gap-0.5">
                  <span className="h-3 flex-1 rounded-sm" style={{ background: tp.accent, opacity: 0.7 }} />
                  <span className="h-3 w-3 rounded-sm" style={{ background: tp.accent }} />
                </span>
              </span>
              <span className="flex-1 text-sm font-medium">{tp.name}</span>
              {active && <Check className="h-4 w-4 text-palco-700" />}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-tinta/45">
        Tres plantillas pensadas para teatros, fiestas y eventos. Los colores y el logo son los tuyos.
      </p>
    </div>
  );
}

function FakeInput({ id, value, placeholder, focus }: { id: string; value: string; placeholder: string; focus: string | null }) {
  const focused = focus === id;
  return (
    <div
      data-t={id}
      className={`flex h-9 items-center rounded-lg border bg-white px-3 text-sm transition ${
        focused ? "border-palco-700 ring-2 ring-palco-700/15" : "border-tinta/15"
      }`}
    >
      {value ? <span className="truncate">{value}</span> : <span className="text-tinta/35">{placeholder}</span>}
      {focused && <span className="ml-px h-4 w-px animate-pulse bg-tinta" />}
    </div>
  );
}

function PanelContent({ s }: { s: State }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Título del evento</Label>
        <FakeInput id="in-title" value={s.title} placeholder="Ej. Noche de gala" focus={s.focus} />
      </div>
      <div>
        <Label>Fecha y hora</Label>
        <FakeInput id="in-date" value={s.date} placeholder="Elegí una fecha" focus={s.focus} />
      </div>
      <div>
        <Label>Logo</Label>
        <div className="flex h-9 items-center gap-2 rounded-lg border border-dashed border-tinta/20 px-3 text-xs text-tinta/50">
          <span className="h-5 w-5 rounded bg-tinta/10" /> tu-logo.png
        </div>
      </div>
    </div>
  );
}

function PanelMap({ s }: { s: State }) {
  return (
    <div>
      <Label>Diseñá tu plano</Label>
      <div className="relative aspect-[4/3] rounded-lg border border-tinta/15 bg-white bg-[radial-gradient(rgba(31,3,10,0.12)_1px,transparent_1px)] [background-size:12px_12px]">
        {(Object.keys(sectors) as SectorId[]).map((id) => {
          const sc = sectors[id];
          const on = s.placed.includes(id);
          return (
            <span
              key={id}
              data-t={`drop-${id}`}
              className={`absolute flex items-center justify-center rounded-md border text-[9px] font-medium transition-all duration-300 ${
                on
                  ? id === "escenario"
                    ? "border-tinta/30 bg-tinta/80 text-white"
                    : "scale-100 border-palco-700 bg-palco-700/15 text-palco-800 opacity-100"
                  : "scale-90 border-dashed border-transparent opacity-0"
              }`}
              style={{ left: `${sc.x}%`, top: `${sc.y}%`, width: `${sc.w}%`, height: `${sc.h}%` }}
            >
              <span className={id === "oeste" || id === "este" ? "[writing-mode:vertical-rl]" : ""}>
                {sc.label}
              </span>
            </span>
          );
        })}
      </div>
      <p className="mb-1.5 mt-3 text-[11px] text-tinta/45">Arrastrá sectores al plano</p>
      <div className="flex flex-wrap gap-1.5">
        {palette.map((p) => (
          <span
            key={p.group}
            data-t={`pal-${p.group}`}
            className="rounded-md border border-tinta/15 bg-white px-2.5 py-1 text-xs font-medium text-tinta/70"
          >
            + {p.label}
          </span>
        ))}
        <span className="rounded-md border border-dashed border-tinta/15 px-2.5 py-1 text-xs text-tinta/35">
          + Butacas numeradas
        </span>
      </div>
    </div>
  );
}

function PanelPrices({ s }: { s: State }) {
  return (
    <div>
      <Label>Precios por sector</Label>
      <div className="space-y-2">
        {groups.map((g) => {
          const id = `in-price-${g.id}`;
          const focused = s.focus === id;
          return (
            <div key={g.id} className="flex items-center gap-3">
              <span className="w-20 text-sm">{g.label}</span>
              <div
                data-t={id}
                className={`flex h-9 flex-1 items-center rounded-lg border bg-white px-3 text-sm tabular-nums transition ${
                  focused ? "border-palco-700 ring-2 ring-palco-700/15" : "border-tinta/15"
                }`}
              >
                <span className="mr-1 text-tinta/40">$</span>
                {s.prices[g.id] ? Number(s.prices[g.id]).toLocaleString("es-AR") : ""}
                {focused && <span className="ml-px h-4 w-px animate-pulse bg-tinta" />}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-tinta/45">
        También podés crear lotes de preventa con precio y cupo propios.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vista previa de la web del cliente                                  */
/* ------------------------------------------------------------------ */

function Preview({ s }: { s: State }) {
  const t = templates[s.template];
  return (
    <div className="relative transition-colors duration-500" style={{ background: t.bg, color: t.fg }}>
      <div className="flex items-center justify-between px-5 py-3 text-xs">
        <span className={`text-sm ${t.title}`}>Tu Productora</span>
        <span style={{ color: t.muted }}>Eventos · Contacto</span>
      </div>

      <div className="grid gap-5 px-5 pb-6 pt-3 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col">
          <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: t.accent }}>
            {s.date || "Fecha a confirmar"}
          </p>
          <p
            className={`mt-2 min-h-[2.4em] text-3xl leading-[1.05] transition-all duration-500 ${t.title}`}
            style={{ opacity: s.title ? 1 : 0.3 }}
          >
            {s.title || "Título del evento"}
          </p>

          <ul className="mt-5 space-y-1.5 text-sm">
            {groups.map((g) => {
              const shown = s.placed.some((id) => sectors[id].group === g.id);
              return (
                <li
                  key={g.id}
                  className={`flex justify-between border-b pb-1.5 transition-all duration-500 ${
                    shown ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ borderColor: t.muted }}
                >
                  <span>{g.label}</span>
                  <span className="tabular-nums" style={{ color: s.prices[g.id] ? t.fg : t.muted }}>
                    {pesos(s.prices[g.id]) || "—"}
                  </span>
                </li>
              );
            })}
          </ul>

          <span
            className="mt-5 self-start rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-500"
            style={{ background: t.accent, color: t.onAccent }}
          >
            Comprar entradas
          </span>
        </div>

        {/* Plano en la web */}
        <div className="relative aspect-[4/3] rounded-lg" style={{ background: `color-mix(in srgb, ${t.fg} 5%, transparent)` }}>
          {s.placed.map((id) => {
            const sc = sectors[id];
            const price = sc.group ? s.prices[sc.group] : undefined;
            const strength = sc.group === "vip" ? 85 : sc.group === "campo" ? 55 : 35;
            return (
              <span
                key={id}
                className="absolute flex flex-col items-center justify-center rounded-md text-center text-[10px] font-semibold leading-tight [animation:subir_0.5s_ease-out_both] transition-colors duration-500"
                style={{
                  left: `${sc.x}%`,
                  top: `${sc.y}%`,
                  width: `${sc.w}%`,
                  height: `${sc.h}%`,
                  background:
                    id === "escenario" ? t.fg : `color-mix(in srgb, ${t.accent} ${strength}%, transparent)`,
                  color: id === "escenario" ? t.bg : sc.group === "vip" ? t.onAccent : t.fg,
                }}
              >
                <span
                  className={`flex flex-col items-center ${id === "oeste" || id === "este" ? "[writing-mode:vertical-rl]" : ""}`}
                >
                  <span>{sc.label}</span>
                  {price && <span className="mt-0.5 font-normal opacity-80">{pesos(price)}</span>}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {s.published && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center">
          <span className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-lg [animation:subir_0.5s_ease-out_both]">
            <Check className="h-3.5 w-3.5" /> Tu web está online
          </span>
        </div>
      )}
    </div>
  );
}
