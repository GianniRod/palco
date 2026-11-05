import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@backend/db.mjs";
import { getSession, resolveTenant, SESSION_DAYS } from "@backend/auth.mjs";
import { SESSION_COOKIE } from "./config";

// Una sola lectura por request. Sin "use cache": un usuario desactivado tiene que dejar de entrar ya.
export const getCurrentSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getSession(getDb(), token);
});

export const getCurrentTenant = cache(async () => {
  const session = await getCurrentSession();
  return session ? resolveTenant(getDb(), session) : null;
});

// Cualquier usuario logueado, salvo que todavía deba cambiar la contraseña.
export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.mustChangePassword) redirect("/cambiar-contrasena");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (!session.isPlatformAdmin) redirect("/");
  return session;
}

// La organización del panel de cliente. Es la única fuente de organization_id para las consultas.
export async function requireTenant() {
  const session = await requireSession();
  const tenant = await getCurrentTenant();
  if (!tenant) redirect(session.isPlatformAdmin ? "/admin" : "/sin-acceso");
  if (tenant.organization.suspendedAt && !tenant.impersonating) redirect("/sin-acceso");
  return { session, ...tenant };
}

// Quién puede editar la web del cliente (salas, mapas, eventos, precios, su página).
// Los admins de Nightowl entran con "Editar como el cliente" y pueden hacer lo mismo que el dueño,
// por si el cliente nos delega el trabajo. Cada cambio se audita con la sesión real (session.email).
export const EDITOR_ROLES = ["owner", "editor", "soporte"] as const;

export async function requireEditor() {
  const tenant = await requireTenant();
  if (!(EDITOR_ROLES as readonly string[]).includes(tenant.role)) redirect("/");
  return tenant;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function readSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function clientIp() {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";
}
