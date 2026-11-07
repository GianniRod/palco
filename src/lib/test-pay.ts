// PAGO-PRUEBA-ADMIN: temporal. Se saca antes de publicar (pasos en logsloren.md).
import "server-only";
import { cookies } from "next/headers";
import { getDb } from "@backend/db.mjs";
import { TEST_PAY_HOURS, verifyTestPayPass } from "@backend/test-payment.mjs";
import { ROOT_DOMAIN } from "@/lib/dashboard/config";

const COOKIE = "nightowl_pago_prueba";
const isProduction = process.env.NODE_ENV === "production";

// A diferencia de la sesión, esta cookie sí llega a las páginas de los clientes. Solo sirve para el pago de prueba.
// En desarrollo se queda en dashboard.localhost: los navegadores rechazan Domain=localhost.
const options = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  domain: isProduction ? ROOT_DOMAIN : undefined,
} as const;

export async function readTestPayPass() {
  return (await cookies()).get(COOKIE)?.value;
}

export async function saveTestPayPass(pass: string) {
  (await cookies()).set(COOKIE, pass, { ...options, maxAge: TEST_PAY_HOURS * 60 * 60 });
}

export async function clearTestPayPass() {
  (await cookies()).set(COOKIE, "", { ...options, maxAge: 0 });
}

export async function testPayAdmin(): Promise<{ userId: string; email: string } | null> {
  return verifyTestPayPass(getDb(), await readTestPayPass());
}
