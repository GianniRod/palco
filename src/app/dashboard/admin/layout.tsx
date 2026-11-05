import { Suspense, type ReactNode } from "react";
import { BarChart3, Building2, Database, ScrollText } from "lucide-react";
import { requireAdmin } from "@/lib/dashboard/session";
import { NavLink } from "../_components/nav-link";
import { Loading, Shell } from "../_components/shell";

// Secciones de las próximas etapas (docs/dashboard.md, sección 2).
const upcoming = [
  { label: "Base de datos", icon: Database },
  { label: "Estadísticas", icon: BarChart3 },
];

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
          {upcoming.map(({ label, icon: Icon }) => (
            <span
              key={label}
              aria-disabled
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-palco-400"
            >
              <Icon className="size-4" aria-hidden />
              {label}
              <span className="ml-auto text-[10px] uppercase tracking-wide">Pronto</span>
            </span>
          ))}
        </>
      }
    >
      <Suspense fallback={<Loading />}>
        <Guard>{children}</Guard>
      </Suspense>
    </Shell>
  );
}
