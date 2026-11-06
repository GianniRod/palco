"use client";

import { useActionState, useState } from "react";
import {
  createMemberAction,
  createOrganizationAction,
  resetMemberPasswordAction,
  setCommissionAction,
  updateOrganizationAction,
  type AdminFormState,
} from "../actions";
import { inputClass } from "../../_components/styles";
import { Field, FormError, FormSaved, SubmitButton, TemporaryCredentials } from "../../_components/ui";

const initial: AdminFormState = {};

type OrganizationValues = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  taxId: string | null;
};

function ContactFields({ values, submitted }: { values?: OrganizationValues; submitted?: Record<string, string> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Persona de contacto" name="contactName" defaultValue={submitted?.contactName ?? values?.contactName ?? ""} />
      <Field label="Email de contacto" name="contactEmail" type="email" defaultValue={submitted?.contactEmail ?? values?.contactEmail ?? ""} />
      <Field label="Teléfono" name="contactPhone" defaultValue={submitted?.contactPhone ?? values?.contactPhone ?? ""} />
      <Field label="CUIT" name="taxId" defaultValue={submitted?.taxId ?? values?.taxId ?? ""} />
    </div>
  );
}

// Sugiere el slug a partir del nombre hasta que lo editan a mano.
const toSlug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function CreateOrganizationForm() {
  const [state, action] = useActionState(createOrganizationAction, initial);
  const [name, setName] = useState("");
  const [customSlug, setCustomSlug] = useState<string | null>(null);

  return (
    <form action={action} className="space-y-4">
      <Field label="Nombre" name="name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Slug"
          name="slug"
          required
          value={customSlug ?? toSlug(name)}
          onChange={(e) => setCustomSlug(e.target.value)}
          hint="Va a ser la dirección de su página: slug.palcotickets.com. No se puede cambiar después."
        />
        <Field
          label="Comisión de Nightowl (%)"
          name="commissionPercent"
          inputMode="decimal"
          required
          defaultValue={state.values?.commissionPercent ?? "8"}
        />
      </div>
      <ContactFields submitted={state.values} />
      <FormError message={state.error} />
      <SubmitButton>Crear cliente</SubmitButton>
    </form>
  );
}

export function EditOrganizationForm({ organization }: { organization: OrganizationValues }) {
  const [state, action] = useActionState(updateOrganizationAction, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={organization.id} />
      <Field label="Nombre" name="name" required defaultValue={state.values?.name ?? organization.name} />
      <ContactFields values={organization} submitted={state.values} />
      <FormError message={state.error} />
      <div className="flex items-center gap-3">
        <SubmitButton>Guardar</SubmitButton>
        <FormSaved show={state.saved} />
      </div>
    </form>
  );
}

export function CommissionForm({ id, percent }: { id: string; percent: number }) {
  const [state, action] = useActionState(setCommissionAction, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <Field
        label="Porcentaje por venta"
        name="commissionPercent"
        inputMode="decimal"
        required
        defaultValue={state.values?.commissionPercent ?? String(percent)}
        hint="Solo afecta a las ventas nuevas: cada orden guarda la comisión con la que se hizo."
      />
      <FormError message={state.error} />
      <div className="flex items-center gap-3">
        <SubmitButton>Guardar comisión</SubmitButton>
        <FormSaved show={state.saved} />
      </div>
    </form>
  );
}

export function AddMemberForm({ organizationId }: { organizationId: string }) {
  const [state, action] = useActionState(createMemberAction, initial);
  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="organizationId" value={organizationId} />
        <div className="min-w-56 flex-1">
          <Field label="Email del usuario" name="email" type="email" required defaultValue={state.values?.email} />
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-palco-900">Rol</span>
          <select name="role" defaultValue={state.values?.role ?? "owner"} className={inputClass}>
            <option value="owner">Dueño</option>
            <option value="editor">Editor</option>
            <option value="ventas">Solo ventas</option>
            <option value="portero">Portero</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-palco-800">
          <input type="checkbox" name="canScan" defaultChecked className="size-4 accent-palco-900" />
          Puede escanear QR
        </label>
        <SubmitButton>Crear usuario</SubmitButton>
      </form>
      <FormError message={state.error} />
      {state.credentials && (
        <TemporaryCredentials email={state.credentials.email} password={state.credentials.temporaryPassword} />
      )}
    </div>
  );
}

export function ResetMemberPasswordForm({ userId, email }: { userId: string; email: string }) {
  const [state, action] = useActionState(resetMemberPasswordAction, initial);
  return (
    <>
      <form action={action}>
        <input type="hidden" name="userId" value={userId} />
        <SubmitButton variant="secondary" confirm={`¿Resetear la contraseña de ${email}? Se le cierra la sesión.`}>
          Resetear contraseña
        </SubmitButton>
      </form>
      <FormError message={state.error} />
      {state.credentials && (
        <div className="basis-full">
          <TemporaryCredentials email={state.credentials.email} password={state.credentials.temporaryPassword} />
        </div>
      )}
    </>
  );
}
