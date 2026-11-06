"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { payAction, type PayState } from "./actions";

function PayButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--site-accent)] px-4 py-3 font-bold text-[var(--site-on-accent)] transition hover:opacity-90 disabled:opacity-60">
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      Pagar (prueba)
    </button>
  );
}

export function PayForm({ slug, token }: { slug: string; token: string }) {
  const [state, action] = useActionState(payAction, {} as PayState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="token" value={token} />
      {state.error && <p role="alert" className="rounded-md bg-[var(--site-line)] px-3 py-2 text-sm font-medium">{state.error}</p>}
      <PayButton />
      <p className="text-center text-xs text-[var(--site-muted)]">Modo de prueba: no se cobra nada.</p>
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

  return (
    <p className="text-sm text-[var(--site-muted)]">
      Tu reserva vence en{" "}
      <strong role="timer" className="text-base tabular-nums text-[var(--site-fg)]">
        {left === null ? "--:--" : `${pad(Math.floor(left / 60))}:${pad(left % 60)}`}
      </strong>
    </p>
  );
}
