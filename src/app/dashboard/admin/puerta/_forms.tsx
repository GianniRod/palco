"use client";

import { useActionState } from "react";
import { createTestTicketsAction, type TestTicketFormState } from "./actions";
import { Field, FormError, SubmitButton } from "../../_components/ui";

const initial: TestTicketFormState = {};

export function CreateTestTicketsForm() {
  const [state, action] = useActionState(createTestTicketsAction, initial);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <Field label="Cantidad" name="count" type="number" min={1} max={10} defaultValue="3" required />
        <Field label="Nombre (opcional)" name="holder" maxLength={60} placeholder="Ej. Juan Pérez" />
      </div>
      <FormError message={state.error} />
      <SubmitButton>Crear entradas de prueba</SubmitButton>
    </form>
  );
}
