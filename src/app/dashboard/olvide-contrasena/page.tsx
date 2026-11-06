import type { Metadata } from "next";
import { ForgotPasswordForm } from "../_components/auth-forms";
import { AuthCard } from "../_components/shell";

export const metadata: Metadata = { title: "Olvidé mi contraseña" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Olvidé mi contraseña" intro="A cualquiera le pasa. Te mandamos un link para elegir otra.">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
