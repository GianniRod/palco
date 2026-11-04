import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/dashboard/session";

// Mismo link para todos: acá se decide qué panel ve cada uno.
async function RedirectByRole() {
  const session = await requireSession();
  redirect(session.isPlatformAdmin ? "/admin" : "/panel");
  return null;
}

export default function DashboardHome() {
  return (
    <Suspense>
      <RedirectByRole />
    </Suspense>
  );
}
