import { Suspense, type ReactNode } from "react";
import { Building2, ScrollText } from "lucide-react";
import { requireAdmin } from "@/lib/dashboard/session";
import { NavLink } from "../_components/nav-link";
import { Loading, Shell } from "../_components/shell";

// El layout no vuelve a correr al navegar: cada página y acción chequea por su cuenta.
async function Guard({ children }: { children: ReactNode }) {
  await requireAdmin();
  return children;
}

export default function AdminLayout({ children }: LayoutProps<"/dashboard/admin">) {
  return (
    <Shell
      nav={
        <>
          <NavLink href="/admin/clientes" segment="clientes">
            <Building2 className="size-4" aria-hidden />
            Clientes
          </NavLink>
          <NavLink href="/admin/auditoria" segment="auditoria">
            <ScrollText className="size-4" aria-hidden />
            Auditoría
          </NavLink>
        </>
      }
    >
      <Suspense fallback={<Loading />}>
        <Guard>{children}</Guard>
      </Suspense>
    </Shell>
  );
}
