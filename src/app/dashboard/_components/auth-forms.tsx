"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  changePasswordAction,
  forgotPasswordAction,
  loginAction,
  resetPasswordAction,
  type AuthFormState,
} from "../actions";
import { Field, FormError, SubmitButton } from "./ui";

const MIN_LENGTH = 10;
const initial: AuthFormState = {};

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4">
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        required
        autoFocus
        defaultValue={state.email}
      />
      <Field label="Contraseña" name="password" type="password" autoComplete="current-password" required />
      <FormError message={state.error} />
      <SubmitButton className="w-full">Entrar</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/olvide-contrasena" className="text-palco-600 hover:underline">
          Olvidé mi contraseña
        </Link>
      </p>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="space-y-4">
      <Field
        label="Contraseña actual"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
      />
      <Field
        label="Contraseña nueva"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        minLength={MIN_LENGTH}
        hint={`Al menos ${MIN_LENGTH} caracteres.`}
        required
      />
      <Field
        label="Repetí la contraseña nueva"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
      />
      <FormError message={state.error} />
      <SubmitButton className="w-full">Guardar contraseña</SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initial);
  if (state.sent) {
    return (
      <div className="space-y-4 text-sm text-palco-900">
        <p role="status">Si ese email tiene una cuenta, en unos minutos te llega un link para elegir otra contraseña.</p>
        <Link href="/login" className="block text-center text-palco-600 hover:underline">
          Volver al ingreso
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="username" required autoFocus />
      <SubmitButton className="w-full">Enviar link</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/login" className="text-palco-600 hover:underline">
          Volver al ingreso
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field
        label="Contraseña nueva"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={MIN_LENGTH}
        hint={`Al menos ${MIN_LENGTH} caracteres.`}
        required
        autoFocus
      />
      <Field
        label="Repetí la contraseña"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
      />
      <FormError message={state.error} />
      <SubmitButton className="w-full">Guardar contraseña</SubmitButton>
    </form>
  );
}
