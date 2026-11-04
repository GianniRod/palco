import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/dashboard/session";
import { ChangePasswordForm } from "../_components/auth-forms";
import { AuthCard, Loading } from "../_components/shell";

export const metadata: Metadata = { title: "Cambiar contraseña" };

async function Content() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return (
    <>
      {session.mustChangePassword ? (
        <p className="mb-4 text-sm text-palco-600">
          Es tu primer ingreso o te reseteamos la contraseña. Elegí una propia para seguir.
        </p>
      ) : null}
      <ChangePasswordForm />
      {!session.mustChangePassword && (
        <p className="mt-4 text-center text-sm">
          <Link href="/" className="text-palco-600 hover:underline">
            Volver al panel
          </Link>
        </p>
      )}
    </>
  );
}

export default function ChangePasswordPage() {
  return (
    <AuthCard title="Cambiar contraseña">
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </AuthCard>
  );
}
