"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, Loader2 } from "lucide-react";
import { buttonClass, inputClass, type ButtonVariant } from "./styles";

export function SubmitButton({
  children,
  variant = "primary",
  className = "",
  confirm,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${buttonClass(variant)} ${className}`}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  ...input
}: { label: string; hint?: string } & ComponentProps<"input">) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-palco-900">{label}</span>
      <input {...input} className={inputClass} />
      {hint && <span className="mt-1 block text-xs text-palco-500">{hint}</span>}
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-palco-100 px-3 py-2 text-sm text-palco-800">
      {message}
    </p>
  );
}

export function FormSaved({ show, children = "Guardado" }: { show?: boolean; children?: ReactNode }) {
  if (!show) return null;
  return (
    <p role="status" className="inline-flex items-center gap-1 text-sm text-palco-600">
      <Check className="size-4" aria-hidden />
      {children}
    </p>
  );
}

// La contraseña inicial se ve una sola vez: al recargar ya no se puede recuperar.
export function TemporaryCredentials({ email, password }: { email: string; password: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-palco-900 bg-white p-4 text-sm">
      <p className="font-medium text-palco-900">Pasale estos datos a {email}</p>
      <p className="mt-1 text-palco-600">
        Se muestran una sola vez. Al primer ingreso va a tener que elegir una contraseña propia.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded bg-palco-50 px-3 py-2 font-mono text-palco-900">
          {password}
        </code>
        <button
          type="button"
          className={buttonClass("secondary")}
          onClick={async () => {
            await navigator.clipboard.writeText(password);
            setCopied(true);
          }}
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Copiada" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
