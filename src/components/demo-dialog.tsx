"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, Loader2, X } from "lucide-react";
import {
  capacities,
  eventsPerMonth,
  MAX,
  parseDemoRequest,
  seatingTypes,
  venueTypes,
} from "@/lib/demo-request";

export const DEMO_HASH = "#demo";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Formulario "Pedir demo". Se abre con cualquier link a #demo,
 * así los botones pueden seguir siendo <a> renderizados en el servidor.
 */
export function DemoDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const sync = () => {
      if (window.location.hash === DEMO_HASH && !dialog.open) {
        dialog.showModal();
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function close() {
    ref.current?.close();
  }

  function onClose() {
    if (window.location.hash === DEMO_HASH) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    if (status === "sent" || status === "error") setStatus("idle");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    const parsed = parseDemoRequest(payload);
    if (!parsed.ok) {
      setError(parsed.error);
      setStatus("error");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, website: payload.website ?? "" }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "No pudimos enviar el formulario.");
      form.reset();
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar el formulario.");
      setStatus("error");
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
      aria-labelledby="demo-title"
      className="m-auto max-h-[92vh] w-[min(640px,94vw)] overflow-y-auto rounded-2xl bg-white p-0 text-tinta shadow-2xl backdrop:bg-palco-950/60 backdrop:backdrop-blur-sm open:[animation:subir_0.35s_ease-out_both]"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-tinta/10 bg-white px-6 py-5 sm:px-8">
        <div>
          <h2 id="demo-title" className="text-2xl font-semibold tracking-tight">
            Pedí tu demo
          </h2>
          <p className="mt-1 text-sm text-tinta/60">
            Contanos sobre tu espacio y te mostramos Nightowl con tu plano y tu marca.
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="rounded-full p-1.5 text-tinta/50 transition hover:bg-tinta/5 hover:text-tinta"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {status === "sent" ? (
        <div className="flex flex-col items-center px-8 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Check className="h-7 w-7" />
          </span>
          <p className="mt-5 text-xl font-semibold">¡Recibimos tu pedido!</p>
          <p className="mt-2 max-w-sm text-tinta/60">
            Te vamos a escribir al email que nos dejaste para coordinar la demo.
          </p>
          <button
            type="button"
            onClick={close}
            className="mt-8 rounded-full bg-palco-800 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-palco-700"
          >
            Cerrar
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-7 px-6 py-6 sm:px-8">
          {/* Trampa para bots: oculta para personas */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              No completar
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <Fieldset legend="Tus datos">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre y apellido" required>
                <input name="name" required autoFocus maxLength={MAX.short} autoComplete="name" className={inputCls} />
              </Field>
              <Field label="Email" required>
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={MAX.short}
                  autoComplete="email"
                  className={inputCls}
                />
              </Field>
              <Field label="Teléfono / WhatsApp">
                <input name="phone" type="tel" maxLength={40} autoComplete="tel" className={inputCls} />
              </Field>
              <Field label="Nombre de tu sala o productora" required>
                <input name="venue" required maxLength={MAX.short} autoComplete="organization" className={inputCls} />
              </Field>
            </div>
          </Fieldset>

          <Fieldset legend="Tu espacio">
            <Choice name="venueType" label="¿Qué tipo de espacio es?" options={venueTypes} required />
            <Choice name="capacity" label="Capacidad aproximada" options={capacities} />
            <Choice name="seating" label="¿Cómo vendés las ubicaciones?" options={seatingTypes} />
            <Choice name="events" label="¿Cuántos eventos o funciones por mes?" options={eventsPerMonth} />
          </Fieldset>

          <Fieldset legend="Tu venta hoy">
            <Field label="¿Usás alguna ticketera actualmente? ¿Cuál?">
              <input
                name="currentTicketing"
                maxLength={MAX.short}
                placeholder="Ej. ninguna, vendo en boletería"
                className={inputCls}
              />
            </Field>
            <Field label="¿Qué necesitás o qué te gustaría resolver?">
              <textarea
                name="message"
                rows={4}
                maxLength={MAX.message}
                placeholder="Contanos lo que quieras: fechas, preventas, control en la puerta…"
                className={`${inputCls} h-auto resize-y py-2.5`}
              />
            </Field>
          </Fieldset>

          {status === "error" && error && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse items-stretch gap-3 border-t border-tinta/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-tinta/45">Solo usamos estos datos para contactarte por la demo.</p>
            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-palco-800 px-6 py-3 text-sm font-medium text-white transition hover:bg-palco-700 disabled:opacity-60"
            >
              {status === "sending" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : (
                "Enviar pedido"
              )}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

const inputCls =
  "h-11 w-full rounded-lg border border-tinta/15 bg-white px-3 text-sm outline-none transition placeholder:text-tinta/35 focus:border-palco-700 focus:ring-2 focus:ring-palco-700/15";

function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 text-xs font-semibold uppercase tracking-widest text-palco-600">{legend}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="text-palco-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Choice({
  name,
  label,
  options,
  required,
}: {
  name: string;
  label: string;
  options: readonly string[];
  required?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      <p className="mb-2 text-sm font-medium">
        {label}
        {required && <span className="text-palco-500"> *</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o} className="cursor-pointer">
            <input type="radio" name={name} value={o} required={required} className="peer sr-only" />
            <span className="block rounded-full border border-tinta/15 px-3.5 py-1.5 text-sm text-tinta/75 transition hover:border-palco-700/50 peer-checked:border-palco-800 peer-checked:bg-palco-800 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-palco-700/30">
              {o}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
