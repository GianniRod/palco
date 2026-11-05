"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "../../_components/ui";
import { createVenueAction, type VenueFormState } from "./actions";

export function CreateVenueForm() {
  const [state, action] = useActionState(createVenueAction, {} as VenueFormState);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre de la sala" name="name" required maxLength={80} placeholder="Ej. Sala principal" />
        <Field label="Dirección" name="address" maxLength={160} />
      </div>
      <FormError message={state.error} />
      <SubmitButton>Crear sala</SubmitButton>
    </form>
  );
}
