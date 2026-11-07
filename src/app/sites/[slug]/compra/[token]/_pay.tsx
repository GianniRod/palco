"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { CreditCard, FlaskConical, Loader2, Lock } from "lucide-react";
import { MercadoPagoLogo, MercadoPagoMark } from "@/components/mercado-pago-logo";
import { payAction, testPayAction, type PayState } from "./actions";

function PayButton({ label, mercadoPago }: { label: string; mercadoPago: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--site-accent)] px-4 py-3.5 font-bold text-[var(--site-on-accent)] transition hover:opacity-90 disabled:opacity-60">
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : mercadoPago && <MercadoPagoMark className="size-6" />}
      {label}
    </button>
  );
}

export function PayForm({ slug, token, total, mercadoPago }: { slug: string; token: string; total: string; mercadoPago: boolean }) {
  const [state, action] = useActionState(payAction, {} as PayState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="token" value={token} />
      <p className="text-sm font-semibold">Medio de pago</p>
      {mercadoPago ? (
        <div className="rounded-lg border-2 border-[var(--site-accent-text)] p-3">
          {/* Fondo blanco fijo: el logo de Mercado Pago se tiene que leer igual en webs oscuras. */}
          <div className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2">
            <MercadoPagoLogo className="h-9 shrink-0" />
            <span className="text-right text-xs font-medium leading-snug text-neutral-600">Tarjeta de crédito, débito<br />o dinero en cuenta</span>
          </div>
          <p className="mt-2.5 flex items-start gap-1.5 text-xs text-[var(--site-muted)]">
            <Lock className="mt-px size-3.5 shrink-0" aria-hidden />
            Pagás en Mercado Pago: nunca vemos los datos de tu tarjeta. Hasta 12 cuotas según tu banco.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border-2 border-[var(--site-accent-text)] p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--site-line)]">
            <CreditCard className="size-4" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-semibold">Pago de prueba</span>
            <span className="block text-xs text-[var(--site-muted)]">Modo de prueba: no se cobra nada.</span>
          </span>
        </div>
      )}
      {state.error && <p role="alert" className="rounded-lg bg-[var(--site-line)] px-3 py-2 text-sm font-medium">{state.error}</p>}
      <PayButton mercadoPago={mercadoPago} label={mercadoPago ? `Pagar ${total} con Mercado Pago` : `Pagar ${total}`} />
    </form>
  );
}

function TestPayRow() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-[var(--site-line)] p-3 text-left transition hover:border-[var(--site-accent-text)] disabled:opacity-60">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--site-line)]">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FlaskConical className="size-4" aria-hidden />}
      </span>
      <span>
        <span className="block text-sm font-semibold">Prueba · solo admin</span>
        <span className="block text-xs text-[var(--site-muted)]">No se cobra nada. Te lleva directo a las entradas.</span>
      </span>
    </button>
  );
}

// PAGO-PRUEBA-ADMIN: temporal. Solo se muestra con el permiso activado desde el panel.
export function TestPayForm({ slug, token }: { slug: string; token: string }) {
  const [state, action] = useActionState(testPayAction, {} as PayState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="token" value={token} />
      <TestPayRow />
      {state.error && <p role="alert" className="rounded-lg bg-[var(--site-line)] px-3 py-2 text-sm font-medium">{state.error}</p>}
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
