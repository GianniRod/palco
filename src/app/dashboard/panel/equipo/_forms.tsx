"use client";

import { useActionState, useState } from "react";
import { createTeamMemberAction, type TeamFormState } from "./actions";
import { Field, FormError, SubmitButton, TemporaryCredentials } from "../../_components/ui";
import { inputClass } from "../../_components/styles";

const initial: TeamFormState = {};

export function AddTeamMemberForm() {
  const [state, action] = useActionState(createTeamMemberAction, initial);
  const [role, setRole] = useState(state.values?.role ?? "portero");
  const portero = role === "portero";

  return (
    <div className="space-y-3">
      <form action={action} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <Field label="Email" name="email" type="email" required defaultValue={state.values?.email} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-palco-900">Rol</span>
            <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
              <option value="portero">Portero (solo escanea)</option>
              <option value="editor">Editor</option>
              <option value="ventas">Solo ventas</option>
              <option value="owner">Dueño</option>
            </select>
          </label>
        </div>
        <label className={`flex items-center gap-2 text-sm ${portero ? "text-palco-500" : "text-palco-800"}`}>
          {/* El portero existe para escanear: siempre tiene el permiso */}
          <input
            key={portero ? "p" : "o"}
            type="checkbox"
            name="canScan"
            defaultChecked={portero}
            disabled={portero}
            className="size-4 accent-palco-900"
          />
          Puede escanear QR de tus eventos
          {portero && <span className="text-xs">(los porteros siempre pueden)</span>}
        </label>
        {portero && <input type="hidden" name="canScan" value="on" />}
        <FormError message={state.error} />
        <SubmitButton>Crear cuenta</SubmitButton>
      </form>
      {state.credentials && (
        <TemporaryCredentials email={state.credentials.email} password={state.credentials.temporaryPassword} />
      )}
    </div>
  );
}
