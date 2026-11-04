import type { Metadata } from "next";
import { ForgotPasswordForm } from "../_components/auth-forms";
import { AuthCard } from "../_components/shell";

export const metadata: Metadata = { title: "Olvidé mi contraseña" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Olvidé mi contraseña" intro="Te mandamos por email un link para elegir otra.">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
