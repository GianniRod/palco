"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { getDb } from "@backend/db.mjs";
import {
  changePassword,
  InvalidCredentialsError,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  TooManyAttemptsError,
  ValidationError,
} from "@backend/auth.mjs";
import { sendPasswordResetEmail } from "@/lib/dashboard/email";
import {
  clearSessionCookie,
  clientIp,
  getCurrentSession,
  readSessionToken,
  setSessionCookie,
} from "@/lib/dashboard/session";

export type AuthFormState = { error?: string; sent?: boolean; email?: string };

const field = (data: FormData, name: string) => String(data.get(name) ?? "");

export async function loginAction(_: AuthFormState, data: FormData): Promise<AuthFormState> {
  try {
    const token = await login(getDb(), {
      email: field(data, "email"),
      password: field(data, "password"),
      ip: await clientIp(),
    });
    await setSessionCookie(token);
  } catch (error) {
    if (error instanceof InvalidCredentialsError || error instanceof TooManyAttemptsError) {
      return { error: error.message, email: field(data, "email") };
    }
    throw error;
  }
  redirect("/");
}

export async function logoutAction() {
  await logout(getDb(), await readSessionToken());
  await clearSessionCookie();
  redirect("/login");
}

export async function changePasswordAction(_: AuthFormState, data: FormData): Promise<AuthFormState> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const newPassword = field(data, "newPassword");
  if (newPassword !== field(data, "confirmPassword")) {
    return { error: "Las contraseñas nuevas no coinciden" };
  }

  try {
    await changePassword(getDb(), session, { currentPassword: field(data, "currentPassword"), newPassword });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    throw error;
  }
  redirect("/");
}

// La respuesta es igual exista o no el email, y el envío va después para que tampoco lo delate el tiempo.
export async function forgotPasswordAction(_: AuthFormState, data: FormData): Promise<AuthFormState> {
  const email = field(data, "email");
  after(async () => {
    const reset = await requestPasswordReset(getDb(), email);
    if (reset) await sendPasswordResetEmail(reset.email, reset.token);
  });
  return { sent: true };
}

export async function resetPasswordAction(_: AuthFormState, data: FormData): Promise<AuthFormState> {
  const password = field(data, "password");
  if (password !== field(data, "confirmPassword")) {
    return { error: "Las contraseñas no coinciden" };
  }

  try {
    await resetPassword(getDb(), { token: field(data, "token"), password });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    throw error;
  }
  redirect("/login");
}
