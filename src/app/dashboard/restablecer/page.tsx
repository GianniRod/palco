import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordForm } from "../_components/auth-forms";
import { AuthCard, Loading } from "../_components/shell";

export const metadata: Metadata = { title: "Elegir contraseña" };

async function Form({ searchParams }: { searchParams: PageProps<"/dashboard/restablecer">["searchParams"] }) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={typeof token === "string" ? token : ""} />;
}

export default function ResetPasswordPage({ searchParams }: PageProps<"/dashboard/restablecer">) {
  return (
    <AuthCard title="Elegí una contraseña nueva">
      <Suspense fallback={<Loading />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
