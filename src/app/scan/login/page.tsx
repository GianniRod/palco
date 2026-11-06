import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/dashboard/session";
import { DASHBOARD_URL } from "@/lib/dashboard/config";
import { LoginForm } from "../../dashboard/_components/auth-forms";
import { AuthCard } from "../../dashboard/_components/shell";

export const metadata: Metadata = { title: "Ingresar" };

async function RedirectIfLoggedIn() {
  if (await getCurrentSession()) redirect("/");
  return null;
}

// Mismo usuario y contraseña que el panel. La sesión es aparte: hay que ingresar en cada subdominio.
export default function ScanLoginPage() {
  return (
    <AuthCard title="Escanear entradas" intro="Ingresá con tu cuenta de Nightowl.">
      <Suspense>
        <RedirectIfLoggedIn />
      </Suspense>
      <LoginForm forgotHref={`${DASHBOARD_URL}/olvide-contrasena`} />
    </AuthCard>
  );
}
