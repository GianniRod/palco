"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { payAction, type PayState } from "./actions";

function PayButton({ total }: { total: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--site-accent)] px-4 py-3.5 font-bold text-[var(--site-on-accent)] transition hover:opacity-90 disabled:opacity-60">
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      Pagar {total}
    </button>
  );
}

export function PayForm({ slug, token, total }: { slug: string; token: string; total: string }) {
  const [state, action] = useActionState(payAction, {} as PayState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="token" value={token} />
      <p className="text-sm font-semibold">Medio de pago</p>
      <div className="flex items-center gap-3 rounded-lg border-2 border-[var(--site-accent-text)] p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--site-line)]">
          <CreditCard className="size-4" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-semibold">Pago de prueba</span>
          <span className="block text-xs text-[var(--site-muted)]">Modo de prueba: no se cobra nada.</span>
        </span>
      </div>
      {state.error && <p role="alert" className="rounded-lg bg-[var(--site-line)] px-3 py-2 text-sm font-medium">{state.error}</p>}
      <PayButton total={total} />
    </form>
  );
}

const pad = (value: number) => String(value).padStart(2, "0");

// Cuenta regresiva de la reserva. Al llegar a cero, se vuelve a pedir la página: ya figura vencida.
export function Countdown({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(expiresAt).getTime();
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(seconds);
      if (seconds === 0) {
        clearInterval(timer);
        router.refresh();
      }
    };
    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, [expiresAt, router]);

  const urgent = left !== null && left <= 60;
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg px-4 py-2.5"
      style={urgent ? { background: "var(--site-accent)", color: "var(--site-on-accent)" } : { background: "var(--site-bg)" }}
    >
      <span className="text-sm font-medium">Te las guardamos</span>
      <strong role="timer" className="text-xl font-extrabold tabular-nums">
        {left === null ? "--:--" : `${pad(Math.floor(left / 60))}:${pad(left % 60)}`}
      </strong>
    </div>
  );
}
