"use client";

import { useActionState } from "react";
import { createTestTicketsAction, type TestTicketFormState } from "./actions";
import { Field, FormError, SubmitButton } from "../../_components/ui";
import { inputClass } from "../../_components/styles";

const initial: TestTicketFormState = {};

export function CreateTestTicketsForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createTestTicketsAction, initial);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <Field label="Cantidad" name="count" type="number" min={1} max={10} defaultValue="3" required />
        <Field label="Nombre (opcional)" name="holder" maxLength={60} placeholder="Ej. Juan Pérez" />
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-palco-900">Evento de</span>
        <select name="organizationId" defaultValue="" className={inputClass}>
          <option value="">Prueba general (solo la escanean los admins)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} (la escanean sus usuarios con permiso)
            </option>
          ))}
        </select>
      </label>
      <FormError message={state.error} />
      <SubmitButton>Crear entradas de prueba</SubmitButton>
    </form>
  );
}
