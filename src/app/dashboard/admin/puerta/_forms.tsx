"use client";

import { useActionState } from "react";
import { createTestTicketsAction, type TestTicketFormState } from "./actions";
import { Field, FormError, SubmitButton } from "../../_components/ui";
import { inputClass } from "../../_components/styles";

const initial: TestTicketFormState = {};

type EventOption = { id: string; title: string; status: string; organizationName: string };

export function CreateTestTicketsForm({ events }: { events: EventOption[] }) {
  const [state, action] = useActionState(createTestTicketsAction, initial);
  // Agrupados por cliente: un QR de un evento solo sirve para ese evento.
  const byClient = Object.entries(
    events.reduce<Record<string, EventOption[]>>((groups, event) => {
      (groups[event.organizationName] ??= []).push(event);
      return groups;
    }, {}),
  );
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <Field label="Cantidad" name="count" type="number" min={1} max={10} defaultValue="3" required />
        <Field label="Nombre (opcional)" name="holder" maxLength={60} placeholder="Ej. Juan Pérez" />
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-palco-900">Evento</span>
        <select name="eventId" defaultValue="" className={inputClass}>
          <option value="">Prueba general (solo la escanean los admins)</option>
          {byClient.map(([client, list]) => (
            <optgroup key={client} label={client}>
              {list.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}{event.status === "draft" ? " (borrador)" : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="mt-1 block text-xs text-palco-500">
          El QR solo sirve para ese evento: escaneando otro evento sale como inválido.
        </span>
      </label>
      <FormError message={state.error} />
      <SubmitButton>Crear entradas de prueba</SubmitButton>
    </form>
  );
}
