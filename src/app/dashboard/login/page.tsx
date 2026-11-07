import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/dashboard/session";
import { LoginForm } from "../_components/auth-forms";
import { AuthCard } from "../_components/shell";

export const metadata: Metadata = { title: "Ingresar" };

async function RedirectIfLoggedIn() {
  if (await getCurrentSession()) redirect("/");
  return null;
}

export default function LoginPage() {
  return (
    <AuthCard title="Ingresar a Nightowl" intro="Qué bueno verte de nuevo.">
      <Suspense>
        <RedirectIfLoggedIn />
      </Suspense>
      <LoginForm />
    </AuthCard>
  );
}
