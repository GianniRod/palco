"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Loader2, MousePointer2, RotateCcw } from "lucide-react";
import { useInView, useReducedMotion } from "./hooks";

/* ------------------------------------------------------------------ */
/* Datos                                                               */
/* ------------------------------------------------------------------ */

// Las plantillas son estructuras de diseño; los colores los elige el cliente.
type TemplateId = "dividida" | "portada" | "cartelera";
const templateList: { id: TemplateId; name: string; hint: string }[] = [
  { id: "dividida", name: "Dividida", hint: "Info y plano lado a lado" },
  { id: "portada", name: "Portada", hint: "Banner grande para un evento" },
  { id: "cartelera", name: "Cartelera", hint: "Todas tus fechas juntas" },
];

type Font = "clasica" | "moderna";
const fontClass: Record<Font, string> = {
  clasica: "font-serif",
  moderna: "font-sans font-black uppercase tracking-tight",
};

type Sector = {
  label: string;
  group: string | null;
  x: number; // posiciones en % dentro del plano
  y: number;
  w: number;
  h: number;
  vertical?: boolean;
  strength?: number; // intensidad del color en la web (0-100)
  tables?: number; // si está, el sector se dibuja como mesas redondas (en columna)
  firstTable?: number; // número de la primera mesa del sector
};

/** Ejemplo que recorre la animación: boliche (pista, mesas, VIP) o teatro (platea, palcos, pullman). */
type Scenario = {
  venue: string;
  url: string;
  title: string;
  date: string;
  titlePlaceholder: string;
  templates: TemplateId[]; // plantillas que prueba; se queda con la última
  swatches: string[];
  swatchPick: number;
  customHex: string;
  dark: boolean;
  initialFont: Font;
  finalFont: Font;
  sectors: Record<string, Sector>;
  groups: { id: string; label: string; price: string }[];
  palette: { group: string; label: string }[];
  drops: [string, string][]; // [sector, etiqueta que se arrastra]
  others: { t: string; d: string }[]; // otras fechas en la plantilla Cartelera
  /** Calendario desplegable para elegir la fecha (semana empieza el lunes: 0 = lunes). */
  cal: { month: string; firstWeekday: number; days: number; pick: number; time: string };
  /** Teatro: primero se arma la forma de la sala arrastrando la esquina. */
  room?: boolean;
  /** Teatro: sectores a los que se les cargan butacas (cantidad y columnas del dibujo). */
  seatPlan?: { id: string; count: number; cols: number }[];
};

export type ScenarioId = "boliche" | "teatro";

const scenarios: Record<ScenarioId, Scenario> = {
  boliche: {
    venue: "Tu Boliche",
    url: "tuboliche.com/tickets",
    title: "Fiesta Aniversario",
    date: "Sáb 19 de septiembre · 00:30",
    titlePlaceholder: "Ej. Fiesta de los jueves",
    templates: ["portada", "cartelera", "portada"],
    swatches: ["#111111", "#52525B", "#A1A1AA", "#7A1428", "#1E3A8A"],
    swatchPick: 2,
    customHex: "#18181B", // con fondo claro, el color propio es casi negro
    dark: false,
    initialFont: "clasica",
    finalFont: "moderna",
    sectors: {
      escenario: { label: "DJ", group: null, x: 34, y: 4, w: 32, h: 13 },
      pista: { label: "Pista", group: "pista", x: 26, y: 23, w: 48, h: 44, strength: 55 },
      oeste: { label: "Mesas", group: "mesa", x: 4, y: 18, w: 18, h: 70, tables: 4, strength: 45 },
      este: { label: "Mesas", group: "mesa", x: 78, y: 18, w: 18, h: 70, tables: 4, firstTable: 5, strength: 45 },
      vip: { label: "VIP", group: "vip", x: 26, y: 72, w: 48, h: 17, strength: 90 },
    },
    groups: [
      { id: "pista", label: "Pista", price: "15000" },
      { id: "mesa", label: "Mesa (6 pers.)", price: "180000" },
      { id: "vip", label: "VIP", price: "30000" },
    ],
    palette: [
      { group: "pista", label: "Pista" },
      { group: "mesa", label: "Mesa" },
      { group: "vip", label: "VIP" },
    ],
    drops: [
      ["pista", "Pista"],
      ["oeste", "Mesa"],
      ["este", "Mesa"],
      ["vip", "VIP"],
    ],
    others: [
      { t: "Jueves universitario", d: "Jue 24" },
      { t: "Próxima fiesta", d: "Octubre" },
    ],
    cal: { month: "Septiembre 2026", firstWeekday: 1, days: 30, pick: 19, time: "00:30" },
  },
  teatro: {
    venue: "Tu Teatro",
    url: "tuteatro.com/tickets",
    title: "Función de gala",
    date: "Sáb 14 de marzo · 21:00",
    titlePlaceholder: "Ej. Temporada de otoño",
    templates: ["portada", "dividida", "cartelera"],
    swatches: ["#7A1428", "#2F5BFF", "#0F766E", "#F59E0B", "#111111"],
    swatchPick: 2,
    customHex: "#7A1428",
    dark: false,
    initialFont: "moderna",
    finalFont: "clasica",
    sectors: {
      escenario: { label: "Escenario", group: null, x: 28, y: 4, w: 44, h: 13 },
      platea: { label: "Platea", group: "platea", x: 26, y: 23, w: 48, h: 44, strength: 55 },
      palcoIzq: { label: "Palcos", group: "palco", x: 4, y: 18, w: 18, h: 52, vertical: true, strength: 85 },
      palcoDer: { label: "Palcos", group: "palco", x: 78, y: 18, w: 18, h: 52, vertical: true, strength: 85 },
      pullman: { label: "Pullman", group: "pullman", x: 26, y: 72, w: 48, h: 17, strength: 32 },
    },
    groups: [
      { id: "platea", label: "Platea", price: "22000" },
      { id: "palco", label: "Palcos", price: "35000" },
      { id: "pullman", label: "Pullman", price: "16000" },
    ],
    palette: [
      { group: "platea", label: "Platea" },
      { group: "palco", label: "Palco" },
      { group: "pullman", label: "Pullman" },
    ],
    drops: [
      ["platea", "Platea"],
      ["palcoIzq", "Palco"],
      ["palcoDer", "Palco"],
      ["pullman", "Pullman"],
    ],
    others: [
      { t: "Temporada de otoño", d: "Vie 20" },
      { t: "Próximo estreno", d: "Abril" },
    ],
    cal: { month: "Marzo 2026", firstWeekday: 6, days: 31, pick: 14, time: "21:00" },
    room: true,
    seatPlan: [
      { id: "platea", count: 120, cols: 15 },
      { id: "pullman", count: 48, cols: 16 },
    ],
  },
};

const ScenarioContext = createContext<Scenario>(scenarios.boliche);
const useScenario = () => useContext(ScenarioContext);

type Tab = "plantilla" | "colores" | "contenido" | "mapa" | "precios";
const tabs: { id: Tab; label: string }[] = [
  { id: "plantilla", label: "Diseño" },
  { id: "colores", label: "Colores" },
  { id: "contenido", label: "Textos" },
  { id: "mapa", label: "Mapa" },
  { id: "precios", label: "Precios" },
];

/* ------------------------------------------------------------------ */
/* Estado y guion                                                      */
/* ------------------------------------------------------------------ */

type State = {
  tab: Tab;
  template: TemplateId;
  dark: boolean;
  accent: string;
  hex: string;
  font: Font;
  title: string;
  date: string;
  calendar: boolean; // calendario de la fecha desplegado
  room: number; // 0 = sala chica, 1 = sala armada (solo teatro)
  seats: Record<string, number>; // butacas cargadas por sector
  seatEdit: string | null; // sector al que se le están cargando butacas
  seatValue: string;
  placed: string[];
  prices: Record<string, string>;
  cursor: string | null;
  focus: string | null;
  dragging: string | null;
  pressed: boolean;
  publishing: boolean;
  published: boolean;
};

function initialState(sc: Scenario): State {
  return {
    tab: "plantilla",
    template: "dividida",
    dark: false,
    accent: sc.swatches[0],
    hex: sc.swatches[0],
    font: sc.initialFont,
    title: "",
    date: "",
    calendar: false,
    room: sc.room ? 0 : 1,
    seats: {},
    seatEdit: null,
    seatValue: "",
    placed: sc.room ? [] : ["escenario"],
    prices: {},
    cursor: null,
    focus: null,
    dragging: null,
    pressed: false,
    publishing: false,
    published: false,
  };
}

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

function buildScript(sc: Scenario): Step[] {
  const initial = initialState(sc);
  const steps: Step[] = [];
  const tap = (target: string, fn: (s: State) => State, wait?: number) => [
    move(target, wait),
    ...click(fn),
  ];
  const openTab = (id: Tab) => tap(`tab-${id}`, (s) => ({ ...s, tab: id, focus: null }));

  // 1. Diseño: prueba plantillas y se queda con la última
  steps.push({ wait: 700, apply: (s) => s });
  for (const id of sc.templates) {
    steps.push(...tap(`tpl-${id}`, (s) => ({ ...s, template: id })));
  }

  // 2. Colores: fondo (oscuro si el escenario lo pide), un color de la muestra y después uno propio
  steps.push(...openTab("colores"));
  if (sc.dark) steps.push(...tap("bg-dark", (s) => ({ ...s, dark: true })));
  const pick = sc.swatches[sc.swatchPick];
  steps.push(...tap(`sw-${sc.swatchPick}`, (s) => ({ ...s, accent: pick, hex: pick })));
  steps.push(...tap("in-hex", (s) => ({ ...s, focus: "in-hex", hex: "#" }), 600));
  steps.push(
    ...type(
      sc.customHex.slice(1),
      (s, v) => ({ ...s, hex: `#${v}`, accent: v.length === 6 ? `#${v}` : s.accent }),
      120,
    ),
  );
  steps.push(...tap(`font-${sc.finalFont}`, (s) => ({ ...s, focus: null, font: sc.finalFont })));

  // 3. Textos
  steps.push(...openTab("contenido"));
  steps.push(...tap("in-title", (s) => ({ ...s, focus: "in-title" })));
  steps.push(...type(sc.title, (s, v) => ({ ...s, title: v })));
  // La fecha se elige en un calendario desplegable; al tocar el día queda escrita
  steps.push(...tap("in-date", (s) => ({ ...s, focus: "in-date", calendar: true }), 500));
  steps.push(...tap(`day-${sc.cal.pick}`, (s) => ({ ...s, date: sc.date }), 700));
  steps.push({ wait: 650, apply: (s) => ({ ...s, calendar: false, focus: null }) });

  // 4. Mapa: (teatro) armar la forma de la sala, después arrastrar sectores
  steps.push(...openTab("mapa"));
  if (sc.room) {
    steps.push(move("room-handle", 600));
    steps.push({ wait: 650, apply: (s) => ({ ...s, pressed: true }) });
    for (let k = 1; k <= 10; k++) {
      steps.push({ wait: 70, apply: (s) => ({ ...s, room: k / 10 }) });
    }
    steps.push({ wait: 350, apply: (s) => ({ ...s, pressed: false }) });
    steps.push({ wait: 450, apply: (s) => ({ ...s, placed: ["escenario"] }) });
  }
  for (const [id, label] of sc.drops) {
    const group = sc.sectors[id].group!;
    steps.push(move(`pal-${group}`, 600));
    steps.push({ wait: 750, apply: (s) => ({ ...s, pressed: true, dragging: label }) });
    steps.push(move(`drop-${id}`, 120));
    steps.push({
      wait: 850,
      apply: (s) => ({ ...s, pressed: false, dragging: null, placed: [...s.placed, id] }),
    });
  }

  // Teatro: elegir un sector, cargar la cantidad de butacas y se dibujan solas
  for (const plan of sc.seatPlan ?? []) {
    steps.push(...tap(`drop-${plan.id}`, (s) => ({ ...s, seatEdit: plan.id, seatValue: "" }), 650));
    steps.push(...type(String(plan.count), (s, v) => ({ ...s, seatValue: v }), 130));
    steps.push(
      ...tap("seat-ok", (s) => ({ ...s, seatEdit: null, seats: { ...s.seats, [plan.id]: plan.count } }), 450),
    );
    steps.push({ wait: 1300, apply: (s) => s });
  }

  // 5. Precios
  steps.push(...openTab("precios"));
  for (const g of sc.groups) {
    steps.push(...tap(`in-price-${g.id}`, (s) => ({ ...s, focus: `in-price-${g.id}` }), 550));
    steps.push(...type(g.price, (s, v) => ({ ...s, prices: { ...s.prices, [g.id]: v } }), 90));
  }

  // 6. Publicar
  steps.push(...tap("btn-publicar", (s) => ({ ...s, focus: null, publishing: true }), 700));
  steps.push({ wait: 1100, apply: (s) => ({ ...s, publishing: false, published: true, cursor: null }) });
  steps.push({ wait: 4200, apply: () => initial });
  return steps;
}

const built = Object.fromEntries(
  (Object.keys(scenarios) as ScenarioId[]).map((id) => {
    const sc = scenarios[id];
    const script = buildScript(sc);
    const initial = initialState(sc);
    const final = script.slice(0, -1).reduce((s, step) => step.apply(s), initial);
    return [id, { script, initial, final }];
  }),
) as Record<ScenarioId, { script: Step[]; initial: State; final: State }>;

const pesos = (digits?: string) =>
  digits ? `$ ${Number(digits).toLocaleString("es-AR")}` : "";

/* ------------------------------------------------------------------ */
/* Colores derivados de lo que eligió el cliente                       */
/* ------------------------------------------------------------------ */

type Look = {
  bg: string;
  fg: string;
  muted: string;
  line: string;
  accent: string;
  onAccent: string;
  title: string;
};

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function lookOf(s: State): Look {
  return {
    bg: s.dark ? "#0E0C14" : "#FAF8F4",
    fg: s.dark ? "#F5F3FA" : "#16141C",
    muted: s.dark ? "rgba(245,243,250,0.5)" : "rgba(22,20,28,0.5)",
    line: s.dark ? "rgba(245,243,250,0.14)" : "rgba(22,20,28,0.12)",
    accent: s.accent,
    onAccent: luminance(s.accent) > 0.45 ? "#111111" : "#FFFFFF",
    title: fontClass[s.font],
  };
}

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

export function SiteBuilder({ scenario = "boliche" }: { scenario?: ScenarioId }) {
  const { script, initial, final } = built[scenario];
  const sc = scenarios[scenario];
  const [viewRef, inView] = useInView<HTMLDivElement>("-15% 0px");
  const reduced = useReducedMotion();
  const [state, setState] = useState<State>(initial);
  const [stepIdx, setStepIdx] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const s = reduced ? final : state;

  // Avanza el guion mientras la sección está en pantalla
  useEffect(() => {
    if (!inView || reduced) return;
    const step = script[stepIdx];
    const id = setTimeout(() => {
      setState(step.apply);
      setStepIdx((i) => (i + 1) % script.length);
    }, step.wait);
    return () => clearTimeout(id);
  }, [stepIdx, inView, reduced, script]);

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
  }, [s.cursor, s.tab, s.room, s.seatEdit]);

  return (
    <ScenarioContext.Provider value={sc}>
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
          <span className="ml-3 text-xs font-medium text-tinta/60">Nightowl · Editor de tu web</span>
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

        <div className="grid md:grid-cols-[310px_1fr]">
          {/* ---------- Panel del cliente ---------- */}
          <div className="flex flex-col border-b border-tinta/10 bg-papel/30 p-4 md:border-b-0 md:border-r">
            <div className="grid grid-cols-5 gap-0.5 rounded-lg bg-tinta/5 p-1 text-[11px] font-medium">
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

            <div className="relative mt-4 min-h-[330px] flex-1">
              {s.tab === "plantilla" && <PanelTemplates current={s.template} />}
              {s.tab === "colores" && <PanelColors s={s} />}
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
                  {sc.url}
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
            <MousePointer2 className="relative h-5 w-5 fill-tinta text-white drop-shadow-md" strokeWidth={1.5} />
            {s.dragging && (
              <span className="absolute left-4 top-4 whitespace-nowrap rounded-md bg-palco-800 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg">
                {s.dragging}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
    </ScenarioContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Paneles del editor                                                  */
/* ------------------------------------------------------------------ */

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-tinta/45">{children}</p>;
}

/** Miniatura en gris: muestra solo la estructura de la plantilla. */
function Wireframe({ id }: { id: TemplateId }) {
  const block = "rounded-[2px] bg-tinta/20";
  const strong = "rounded-[2px] bg-tinta/45";
  return (
    <span className="flex h-12 w-16 shrink-0 flex-col gap-[3px] overflow-hidden rounded-md border border-tinta/10 bg-white p-1.5">
      {id === "dividida" && (
        <span className="flex flex-1 gap-[3px]">
          <span className="flex w-1/2 flex-col gap-[3px]">
            <span className={`h-1.5 w-full ${strong}`} />
            <span className={`h-1 w-2/3 ${block}`} />
            <span className={`mt-auto h-1.5 w-1/2 ${strong}`} />
          </span>
          <span className={`flex-1 ${block}`} />
        </span>
      )}
      {id === "portada" && (
        <>
          <span className={`flex h-1/2 items-center justify-center ${strong}`}>
            <span className="h-1 w-1/2 rounded-full bg-white/80" />
          </span>
          <span className="flex flex-1 gap-[3px]">
            <span className={`flex-1 ${block}`} />
            <span className={`w-1/3 ${block}`} />
          </span>
        </>
      )}
      {id === "cartelera" && (
        <>
          <span className="grid flex-1 grid-cols-3 gap-[3px]">
            <span className={strong} />
            <span className={block} />
            <span className={block} />
          </span>
          <span className="flex h-1/3 gap-[3px]">
            <span className={`flex-1 ${block}`} />
            <span className={`w-1/3 ${block}`} />
          </span>
        </>
      )}
    </span>
  );
}

function PanelTemplates({ current }: { current: TemplateId }) {
  return (
    <div>
      <Label>Elegí un diseño</Label>
      <div className="space-y-2">
        {templateList.map((tp) => {
          const active = tp.id === current;
          return (
            <div
              key={tp.id}
              data-t={`tpl-${tp.id}`}
              className={`flex items-center gap-3 rounded-lg border bg-white p-2 transition ${
                active ? "border-palco-700 ring-2 ring-palco-700/20" : "border-tinta/10"
              }`}
            >
              <Wireframe id={tp.id} />
              <span className="flex-1">
                <span className="block text-sm font-medium">{tp.name}</span>
                <span className="block text-[11px] text-tinta/45">{tp.hint}</span>
              </span>
              {active && <Check className="h-4 w-4 text-palco-700" />}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-tinta/45">
        Tres diseños base. Colores, tipografía y logo los elegís vos.
      </p>
    </div>
  );
}

function Segmented({ options }: { options: { target: string; label: ReactNode; active: boolean }[] }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-tinta/5 p-1 text-xs font-medium">
      {options.map((o) => (
        <span
          key={o.target}
          data-t={o.target}
          className={`rounded-md py-1.5 text-center transition ${
            o.active ? "bg-white text-tinta shadow-sm" : "text-tinta/50"
          }`}
        >
          {o.label}
        </span>
      ))}
    </div>
  );
}

function PanelColors({ s }: { s: State }) {
  const { swatches } = useScenario();
  const hexFocused = s.focus === "in-hex";
  return (
    <div className="space-y-5">
      <div>
        <Label>Fondo</Label>
        <Segmented
          options={[
            { target: "bg-light", label: "Claro", active: !s.dark },
            { target: "bg-dark", label: "Oscuro", active: s.dark },
          ]}
        />
      </div>
      <div>
        <Label>Color principal</Label>
        <div className="flex items-center gap-2">
          {swatches.map((c, i) => (
            <span
              key={c}
              data-t={`sw-${i}`}
              className={`h-7 w-7 rounded-full transition ${s.accent === c ? "ring-2 ring-tinta ring-offset-2" : ""}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <div
          data-t="in-hex"
          className={`mt-2.5 flex h-9 items-center gap-2 rounded-lg border bg-white px-2 text-sm transition ${
            hexFocused ? "border-palco-700 ring-2 ring-palco-700/15" : "border-tinta/15"
          }`}
        >
          <span className="h-5 w-5 rounded-md border border-tinta/10" style={{ background: s.accent }} />
          <span className="font-mono text-xs uppercase">{s.hex}</span>
          {hexFocused && <span className="-ml-1.5 h-4 w-px animate-pulse bg-tinta" />}
          <span className="ml-auto text-[10px] text-tinta/40">o el de tu marca</span>
        </div>
      </div>
      <div>
        <Label>Tipografía de títulos</Label>
        <Segmented
          options={[
            {
              target: "font-clasica",
              label: <span className="font-serif text-[13px]">Clásica</span>,
              active: s.font === "clasica",
            },
            {
              target: "font-moderna",
              label: <span className="font-black uppercase tracking-tight">Moderna</span>,
              active: s.font === "moderna",
            },
          ]}
        />
      </div>
    </div>
  );
}

function FakeInput({
  id,
  value,
  placeholder,
  focus,
}: {
  id: string;
  value: string;
  placeholder: string;
  focus: string | null;
}) {
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

const weekdays = ["L", "M", "M", "J", "V", "S", "D"];

/** Calendario desplegable, como el selector de fecha de una app. */
function DatePicker({ s }: { s: State }) {
  const { cal, date } = useScenario();
  const picked = s.date === date;
  return (
    <div className="absolute inset-x-0 top-full z-30 mt-1.5 rounded-xl border border-tinta/10 bg-white p-3 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.3)] [animation:subir_0.25s_ease-out_both]">
      <div className="flex items-center justify-between px-1 text-sm font-semibold">
        <ChevronLeft className="h-4 w-4 text-tinta/35" />
        {cal.month}
        <ChevronRight className="h-4 w-4 text-tinta/35" />
      </div>
      <div className="mt-2 grid grid-cols-7 text-center text-[10px] text-tinta/40">
        {weekdays.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-y-0.5 text-center text-[11px] tabular-nums">
        {Array.from({ length: cal.firstWeekday }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: cal.days }, (_, i) => {
          const day = i + 1;
          const selected = picked && day === cal.pick;
          return (
            <span key={day} className="flex justify-center">
              <span
                data-t={`day-${day}`}
                className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
                  selected ? "bg-palco-700 font-semibold text-white" : "text-tinta/75"
                }`}
              >
                {day}
              </span>
            </span>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-tinta/10 px-1 pt-2 text-[11px] text-tinta/55">
        <span>Hora</span>
        <span className="rounded-md bg-tinta/5 px-2 py-0.5 font-medium tabular-nums text-tinta">{cal.time}</span>
      </div>
    </div>
  );
}

function PanelContent({ s }: { s: State }) {
  const scn = useScenario();
  return (
    <div className="space-y-4">
      <div>
        <Label>Título del evento</Label>
        <FakeInput id="in-title" value={s.title} placeholder={scn.titlePlaceholder} focus={s.focus} />
      </div>
      <div className="relative">
        <Label>Fecha y hora</Label>
        <div
          data-t="in-date"
          className={`flex h-9 items-center justify-between rounded-lg border bg-white px-3 text-sm transition ${
            s.focus === "in-date" ? "border-palco-700 ring-2 ring-palco-700/15" : "border-tinta/15"
          }`}
        >
          {s.date ? <span className="truncate">{s.date}</span> : <span className="text-tinta/35">Elegí una fecha</span>}
          <CalendarDays className="h-4 w-4 shrink-0 text-tinta/40" />
        </div>
        {s.calendar && <DatePicker s={s} />}
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

/** Rectángulo de la sala según cuánto se arrastró la esquina (0 = chica, 1 = armada). */
function roomRect(t: number) {
  const lerp = (a: number, b: number) => a + (b - a) * t;
  return { left: lerp(24, 1.5), top: lerp(26, 1.5), width: lerp(40, 97), height: lerp(36, 97) };
}

/** Butacas dibujadas como una grilla de puntos que aparecen de a una. */
function SeatDots({ count, cols, color }: { count: number; cols: number; color: string }) {
  return (
    <span className="grid w-full gap-[2px] p-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="butaca-aparece aspect-square rounded-full"
          style={{ background: color, animationDelay: `${i * 9}ms` }}
        />
      ))}
    </span>
  );
}

function PanelMap({ s }: { s: State }) {
  const scn = useScenario();
  const { sectors, palette } = scn;
  const room = roomRect(s.room);
  const editing = s.seatEdit ? sectors[s.seatEdit] : null;
  const colsOf = (id: string) => scn.seatPlan?.find((p) => p.id === id)?.cols ?? 12;
  return (
    <div>
      <Label>{scn.room ? "Armá tu sala" : "Diseñá tu plano"}</Label>
      <div className="relative aspect-[4/3] rounded-lg border border-tinta/15 bg-white bg-[radial-gradient(rgba(31,3,10,0.12)_1px,transparent_1px)] [background-size:12px_12px]">
        {scn.room && (
          <span
            className="absolute rounded-md border-2 border-tinta/35 bg-papel/40"
            style={{ left: `${room.left}%`, top: `${room.top}%`, width: `${room.width}%`, height: `${room.height}%` }}
          >
            {s.room < 1 && (
              <span className="absolute left-1.5 top-1 text-[9px] font-medium text-tinta/45">Tu sala</span>
            )}
            <span
              data-t="room-handle"
              className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-sm border-2 border-palco-700 bg-white"
            />
          </span>
        )}
        {Object.keys(sectors).map((id) => {
          const sc = sectors[id];
          const on = s.placed.includes(id);
          if (sc.tables) {
            return (
              <span
                key={id}
                data-t={`drop-${id}`}
                className={`absolute flex flex-col items-center justify-around transition-all duration-300 ${
                  on ? "scale-100 opacity-100" : "scale-90 opacity-0"
                }`}
                style={{ left: `${sc.x}%`, top: `${sc.y}%`, width: `${sc.w}%`, height: `${sc.h}%` }}
              >
                {Array.from({ length: sc.tables }, (_, i) => (
                  <span
                    key={i}
                    className="flex aspect-square w-[62%] items-center justify-center rounded-full border border-palco-700 bg-palco-700/15 text-[8px] font-medium text-palco-800"
                  >
                    {(sc.firstTable ?? 1) + i}
                  </span>
                ))}
              </span>
            );
          }
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
              {s.seats[id] ? (
                <SeatDots count={s.seats[id]} cols={colsOf(id)} color="var(--color-palco-700)" />
              ) : (
                <span className={sc.vertical ? "[writing-mode:vertical-rl]" : ""}>{sc.label}</span>
              )}
              {s.seatEdit === id && (
                <span className="pointer-events-none absolute -inset-1 rounded-lg ring-2 ring-palco-700" />
              )}
            </span>
          );
        })}
      </div>
      {editing ? (
        <div className="mt-3 rounded-lg border border-tinta/10 bg-white p-2.5 shadow-sm [animation:subir_0.25s_ease-out_both]">
          <p className="text-[11px] text-tinta/50">Butacas en {editing.label}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex h-8 flex-1 items-center rounded-md border border-palco-700 px-2.5 text-sm tabular-nums ring-2 ring-palco-700/15">
              {s.seatValue}
              <span className="ml-px h-4 w-px animate-pulse bg-tinta" />
            </div>
            <span data-t="seat-ok" className="rounded-md bg-palco-700 px-3 py-1.5 text-xs font-medium text-white">
              Listo
            </span>
          </div>
        </div>
      ) : (
        <>
      <p className="mb-1.5 mt-3 text-[11px] text-tinta/45">
        {scn.seatPlan ? "Arrastrá sectores y tocá uno para cargarle butacas" : "Arrastrá sectores al plano"}
      </p>
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
        </>
      )}
    </div>
  );
}

function PanelPrices({ s }: { s: State }) {
  const { groups } = useScenario();
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
  const l = lookOf(s);
  return (
    <div className="relative min-h-[390px] transition-colors duration-500" style={{ background: l.bg, color: l.fg }}>
      <div className="flex items-center justify-between px-5 py-3 text-xs">
        <span className={`text-sm transition-all ${l.title}`}>{useScenario().venue}</span>
        <span style={{ color: l.muted }}>Eventos · Contacto</span>
      </div>

      <div key={s.template} className="[animation:subir_0.5s_ease-out_both]">
        {s.template === "dividida" && <LayoutDividida s={s} l={l} />}
        {s.template === "portada" && <LayoutPortada s={s} l={l} />}
        {s.template === "cartelera" && <LayoutCartelera s={s} l={l} />}
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

type LP = { s: State; l: Look };

function Title({ s, l, className = "" }: LP & { className?: string }) {
  return (
    <p
      className={`leading-[1.05] transition-all duration-500 ${l.title} ${className}`}
      style={{ opacity: s.title ? 1 : 0.35 }}
    >
      {s.title || "Título del evento"}
    </p>
  );
}

function BuyButton({ l, className = "" }: { l: Look; className?: string }) {
  return (
    <span
      className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-500 ${className}`}
      style={{ background: l.accent, color: l.onAccent }}
    >
      Comprar entradas
    </span>
  );
}

function PriceList({ s, l }: LP) {
  const { groups, sectors } = useScenario();
  return (
    <ul className="space-y-1.5 text-sm">
      {groups.map((g) => {
        const shown = s.placed.some((id) => sectors[id].group === g.id);
        return (
          <li
            key={g.id}
            className={`flex justify-between border-b pb-1.5 transition-all duration-500 ${
              shown ? "opacity-100" : "opacity-0"
            }`}
            style={{ borderColor: l.line }}
          >
            <span>{g.label}</span>
            <span className="tabular-nums" style={{ color: s.prices[g.id] ? l.fg : l.muted }}>
              {pesos(s.prices[g.id]) || "—"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function VenueMap({ s, l, className = "" }: LP & { className?: string }) {
  const { sectors, seatPlan } = useScenario();
  return (
    <div
      className={`relative aspect-[4/3] rounded-lg ${className}`}
      style={{ background: `color-mix(in srgb, ${l.fg} 5%, transparent)` }}
    >
      {s.placed.map((id) => {
        const sc = sectors[id];
        const price = sc.group ? s.prices[sc.group] : undefined;
        const strength = sc.strength ?? 40;
        const vertical = sc.vertical;
        if (sc.tables) {
          return (
            <span
              key={id}
              className="absolute flex flex-col items-center justify-around [animation:subir_0.5s_ease-out_both]"
              style={{ left: `${sc.x}%`, top: `${sc.y}%`, width: `${sc.w}%`, height: `${sc.h}%` }}
            >
              {Array.from({ length: sc.tables }, (_, i) => (
                <span
                  key={i}
                  className="flex aspect-square w-[62%] items-center justify-center rounded-full text-[9px] font-semibold transition-colors duration-500"
                  style={{
                    background: `color-mix(in srgb, ${l.accent} ${strength}%, transparent)`,
                    color: l.fg,
                  }}
                >
                  {(sc.firstTable ?? 1) + i}
                </span>
              ))}
            </span>
          );
        }
        return (
          <span
            key={id}
            className="absolute flex items-center justify-center rounded-md text-center text-[10px] font-semibold leading-tight transition-colors duration-500 [animation:subir_0.5s_ease-out_both]"
            style={{
              left: `${sc.x}%`,
              top: `${sc.y}%`,
              width: `${sc.w}%`,
              height: `${sc.h}%`,
              background: id === "escenario" ? l.fg : `color-mix(in srgb, ${l.accent} ${strength}%, transparent)`,
              color: id === "escenario" ? l.bg : strength >= 80 ? l.onAccent : l.fg,
            }}
          >
            {s.seats[id] ? (
              <span className="flex w-full flex-col items-center">
                <SeatDots
                  count={s.seats[id]}
                  cols={seatPlan?.find((p) => p.id === id)?.cols ?? 12}
                  color={strength >= 80 ? l.onAccent : l.fg}
                />
                <span className="text-[9px]">
                  {sc.label}
                  {price && <span className="font-normal opacity-80"> · {pesos(price)}</span>}
                </span>
              </span>
            ) : (
              <span className={`flex flex-col items-center ${vertical ? "[writing-mode:vertical-rl]" : ""}`}>
                <span>{sc.label}</span>
                {price && <span className="mt-0.5 font-normal opacity-80">{pesos(price)}</span>}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function DateLine({ s, l }: LP) {
  return (
    <p className="text-[11px] uppercase tracking-[0.2em] transition-colors duration-500" style={{ color: l.accent }}>
      {s.date || "Fecha a confirmar"}
    </p>
  );
}

function LayoutDividida({ s, l }: LP) {
  return (
    <div className="grid gap-5 px-5 pb-6 pt-3 lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col">
        <DateLine s={s} l={l} />
        <Title s={s} l={l} className="mt-2 min-h-[2.2em] text-3xl" />
        <div className="mt-5">
          <PriceList s={s} l={l} />
        </div>
        <BuyButton l={l} className="mt-5 self-start" />
      </div>
      <VenueMap s={s} l={l} />
    </div>
  );
}

function LayoutPortada({ s, l }: LP) {
  return (
    <div className="pb-6">
      <div
        className="mx-5 flex flex-col items-center rounded-xl px-6 py-7 text-center transition-colors duration-500"
        style={{ background: l.accent, color: l.onAccent }}
      >
        <p className="text-[11px] uppercase tracking-[0.2em] opacity-75">{s.date || "Fecha a confirmar"}</p>
        <Title s={s} l={l} className="mt-2 text-4xl" />
        <span
          className="mt-4 rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-500"
          style={{ background: l.onAccent, color: l.accent }}
        >
          Comprar entradas
        </span>
      </div>
      <div className="mt-5 grid items-start gap-5 px-5 lg:grid-cols-[1.2fr_1fr]">
        <VenueMap s={s} l={l} className="mx-auto max-h-44 w-full max-w-[16rem]" />
        <PriceList s={s} l={l} />
      </div>
    </div>
  );
}

function LayoutCartelera({ s, l }: LP) {
  const { others } = useScenario();
  return (
    <div className="px-5 pb-6 pt-1">
      <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: l.muted }}>
        Cartelera
      </p>
      <div className="mt-2 grid grid-cols-3 gap-3">
        <div
          className="flex aspect-[4/3] flex-col justify-end rounded-lg p-3 transition-colors duration-500"
          style={{ background: l.accent, color: l.onAccent }}
        >
          <p className="text-[9px] uppercase tracking-widest opacity-75">
            {s.date ? s.date.split("·")[0] : "Fecha"}
          </p>
          <Title s={s} l={l} className="mt-1 text-sm" />
        </div>
        {others.map((o) => (
          <div
            key={o.t}
            className="flex aspect-[4/3] flex-col justify-end rounded-lg p-3"
            style={{ background: `color-mix(in srgb, ${l.fg} 7%, transparent)` }}
          >
            <p className="text-[9px] uppercase tracking-widest" style={{ color: l.muted }}>
              {o.d}
            </p>
            <p className={`mt-1 text-sm leading-tight ${l.title}`} style={{ color: l.muted }}>
              {o.t}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid items-center gap-4 lg:grid-cols-[1fr_1fr]">
        <VenueMap s={s} l={l} className="mx-auto max-h-36 w-full max-w-[13rem]" />
        <div className="flex flex-col gap-3">
          <PriceList s={s} l={l} />
          <BuyButton l={l} className="self-start" />
        </div>
      </div>
    </div>
  );
}
