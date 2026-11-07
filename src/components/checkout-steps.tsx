import { Check } from "lucide-react";

const STEPS = ["Elegí", "Pagá", "Entrá"];

// Dónde está parado el comprador.
export function CheckoutSteps({ current }: { current: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <ol aria-label="Pasos de la compra" className="flex items-center gap-2 text-sm font-semibold">
        {STEPS.map((step, index) => {
          const done = index < current || current === STEPS.length - 1;
          const active = index === current;
          return (
            <li key={step} aria-current={active ? "step" : undefined} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden className="h-px w-5 bg-[var(--site-line)] @md:w-8" />}
              <span
                className="flex size-6 items-center justify-center rounded-full text-xs font-bold"
                style={
                  active || done
                    ? { background: "var(--site-accent)", color: "var(--site-on-accent)" }
                    : { background: "var(--site-line)", color: "var(--site-muted)" }
                }
              >
                {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
              </span>
              <span className={active ? "" : "text-[var(--site-muted)]"}>{step}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
