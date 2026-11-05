"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Check, Mail } from "lucide-react";
import { FakeQr } from "./qr";
import { useInView, useInterval, useReducedMotion } from "./hooks";

const STEP_MS = 3200;

type Variant = "boliche" | "teatro";

// Textos y montos de cada versión. Cargo de servicio: 8% del valor de las entradas (comisión de Nightowl).
const content = {
  boliche: {
    choose: "Su lote y cuántas entradas, desde tu web.",
    venue: "Tu Boliche",
    item: "2 × Preventa 2",
    subtotal: "$ 22.000",
    fee: "$ 1.760",
    total: "$ 23.760",
    event: "Fiesta Aniversario",
    ticket: "Preventa 2 · Entrada 1 de 2",
  },
  teatro: {
    choose: "Su butaca en el plano de tu sala, desde tu web.",
    venue: "Tu Teatro",
    item: "2 × Platea",
    subtotal: "$ 44.000",
    fee: "$ 3.520",
    total: "$ 47.520",
    event: "Función de gala",
    ticket: "Platea · Fila D · 6",
  },
} satisfies Record<Variant, Record<string, string>>;

type Content = (typeof content)[Variant];

export function CheckoutFlow({ variant = "boliche" }: { variant?: Variant }) {
  const c = content[variant];
  const steps = [
    { title: "Elige", text: c.choose },
    { title: "Paga", text: "Con tarjeta o Mercado Pago. El dinero se acredita en tu cuenta." },
    { title: "Recibe", text: "Su entrada con QR por email, al instante." },
  ];
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const running = inView && !reduced;

  useInterval(() => setStep((s) => (s + 1) % steps.length), STEP_MS, running);

  return (
    <div ref={ref} className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`group relative w-full overflow-hidden py-5 text-left transition-opacity ${
                i === step ? "opacity-100" : "opacity-40 hover:opacity-70"
              }`}
            >
              <span className="flex items-baseline gap-5">
                <span className="font-display text-sm font-semibold tabular-nums text-palco-500">
                  0{i + 1}
                </span>
                <span>
                  <span className="block font-display text-3xl font-semibold tracking-tight sm:text-4xl">{s.title}</span>
                  <span className="mt-1 block text-palco-950/70">{s.text}</span>
                </span>
              </span>
              <span className="absolute inset-x-0 bottom-0 h-px bg-palco-800/15" />
              {i === step && (
                <span
                  key={`${step}-${running}`}
                  className={`absolute inset-x-0 bottom-0 h-px origin-left bg-palco-800 ${running ? "progreso" : ""}`}
                  style={{ "--dur": `${STEP_MS}ms` } as CSSProperties}
                />
              )}
            </button>
          </li>
        ))}
      </ol>

      {/* Teléfono */}
      <div className="mx-auto w-[280px] rounded-[2.6rem] border-[10px] border-tinta bg-tinta shadow-[0_40px_80px_-20px_rgba(31,3,10,0.55)]">
        <div className="relative h-[500px] overflow-hidden rounded-[1.9rem] bg-white">
          <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-tinta" />
          <Screen active={step === 0}>
            {variant === "teatro" ? <StepChooseTeatro /> : <StepChoose />}
          </Screen>
          <Screen active={step === 1}>
            <StepPay c={c} />
          </Screen>
          <Screen active={step === 2}>
            <StepReceive c={c} />
          </Screen>
        </div>
      </div>
    </div>
  );
}

function Screen({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden={!active}
      className={`absolute inset-0 px-5 pb-6 pt-12 transition-all duration-700 ${
        active ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-8 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

function StepChoose() {
  const lots = [
    { name: "Preventa 1", price: "$ 8.000", state: "Agotado" },
    { name: "Preventa 2", price: "$ 11.000", state: "selected" },
    { name: "General", price: "$ 15.000", state: "Próximamente" },
    { name: "VIP", price: "$ 25.000", state: "" },
  ];
  return (
    <div className="flex h-full flex-col">
      <p className="text-[10px] uppercase tracking-[0.25em] text-palco-500">Tu Boliche</p>
      <p className="mt-1 font-display text-2xl font-semibold leading-tight tracking-tight">Fiesta Aniversario</p>
      <p className="text-xs text-black/50">Sábado 21 · 00:30</p>
      <div className="mt-6 space-y-2">
        {lots.map((l) => {
          const selected = l.state === "selected";
          const off = l.state === "Agotado" || l.state === "Próximamente";
          return (
            <div
              key={l.name}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${
                selected ? "border-palco-800 bg-palco-50" : "border-black/10"
              } ${off ? "opacity-45" : ""}`}
            >
              <span>
                <span className={`block font-medium ${l.state === "Agotado" ? "line-through" : ""}`}>{l.name}</span>
                <span className="block text-[11px] text-black/50">{off ? l.state : l.price}</span>
              </span>
              {selected ? (
                <span className="flex items-center gap-2.5 text-sm font-semibold">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-black/15">−</span>
                  2
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-palco-800 text-white">+</span>
                </span>
              ) : (
                !off && <span className="flex h-6 w-6 items-center justify-center rounded-full border border-black/15 text-sm">+</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-auto rounded-xl bg-papel p-3 text-sm">
        <div className="flex justify-between">
          <span>2 × Preventa 2</span>
          <span className="font-medium">$ 22.000</span>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-palco-800 py-3 text-center text-sm font-medium text-white">Continuar</div>
    </div>
  );
}

function StepChooseTeatro() {
  return (
    <div className="flex h-full flex-col">
      <p className="text-[10px] uppercase tracking-[0.25em] text-palco-500">Tu Teatro</p>
      <p className="mt-1 font-display text-2xl font-semibold tracking-tight leading-tight">Función de gala</p>
      <p className="text-xs text-black/50">Sábado 14 · 21:00</p>
      <div className="mx-auto mt-6 h-2 w-2/3 rounded-b-full bg-palco-800/20" />
      <div className="mt-4 flex flex-col items-center gap-1.5">
        {[8, 10, 10, 12, 12, 12].map((n, r) => (
          <div key={r} className="flex gap-1">
            {Array.from({ length: n }, (_, s) => {
              const chosen = r === 3 && (s === 5 || s === 6);
              const sold = (r * 5 + s * 3) % 7 < 3;
              return (
                <span
                  key={s}
                  className={`h-3 w-3 rounded-t-[4px] rounded-b-[1px] ${
                    chosen ? "bg-dorado" : sold ? "bg-black/10" : "bg-palco-800/70"
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-auto rounded-xl bg-papel p-3 text-sm">
        <div className="flex justify-between">
          <span>Platea · D6, D7</span>
          <span className="font-medium">$ 44.000</span>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-palco-800 py-3 text-center text-sm font-medium text-white">
        Continuar
      </div>
    </div>
  );
}

function StepPay({ c }: { c: Content }) {
  return (
    <div className="flex h-full flex-col">
      <p className="text-[10px] uppercase tracking-[0.25em] text-palco-500">{c.venue}</p>
      <p className="mt-1 font-display text-2xl font-semibold tracking-tight">Pago</p>
      <div className="mt-6 space-y-2 text-sm">
        <Row l={c.item} r={c.subtotal} />
        <Row l="Cargo de servicio" r={c.fee} />
        <div className="border-t border-black/10 pt-2">
          <Row l="Total" r={c.total} bold />
        </div>
      </div>
      <p className="mt-6 text-xs text-black/50">Medio de pago</p>
      <div className="mt-2 space-y-2">
        <PayOption selected title="Tarjeta de crédito o débito" sub="Visa · Mastercard · Amex · Cabal" />
        <PayOption title="Mercado Pago" sub="Dinero en cuenta o tarjetas guardadas" />
      </div>
      <div className="mt-auto rounded-xl bg-palco-800 py-3 text-center text-sm font-medium text-white">
        Pagar {c.total}
      </div>
    </div>
  );
}

function StepReceive({ c }: { c: Content }) {
  return (
    <div className="flex h-full flex-col items-center text-center">
      <span className="mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
        <Check className="h-6 w-6" />
      </span>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight">¡Listo!</p>
      <p className="flex items-center gap-1.5 text-xs text-black/50">
        <Mail className="h-3.5 w-3.5" /> Te enviamos tus entradas
      </p>
      <div className="mt-6 w-full rounded-2xl bg-palco-800 p-4 text-left text-white">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">{c.event}</p>
        <p className="font-display text-lg font-medium">{c.ticket}</p>
        <div className="mt-3 flex justify-center rounded-lg bg-white p-3 text-black">
          <FakeQr seed={5} className="h-32 w-32" />
        </div>
      </div>
      <p className="mt-auto text-xs text-black/40">Mostrá este QR en la entrada</p>
    </div>
  );
}

function PayOption({ title, sub, selected }: { title: string; sub: string; selected?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 ${
        selected ? "border-palco-800 bg-palco-50" : "border-black/10"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-palco-800" : "border-black/25"
        }`}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-palco-800" />}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-[11px] text-black/50">{sub}</span>
      </span>
    </div>
  );
}

function Row({ l, r, bold }: { l: string; r: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : "text-black/70"}`}>
      <span>{l}</span>
      <span>{r}</span>
    </div>
  );
}
