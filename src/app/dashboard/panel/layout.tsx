import { Suspense, type ReactNode } from "react";
import { CalendarDays, CreditCard, Globe, Home, Map, QrCode, Receipt } from "lucide-react";
import { requireTenant } from "@/lib/dashboard/session";
import { stopImpersonationAction } from "../admin/actions";
import { NavLink } from "../_components/nav-link";
import { Loading, Shell } from "../_components/shell";
import { SubmitButton } from "../_components/ui";

// Las secciones de las próximas etapas (docs/dashboard.md, sección 3).
const upcoming = [
  { label: "Salas y mapas", icon: Map },
  { label: "Eventos", icon: CalendarDays },
  { label: "Medios de pago", icon: CreditCard },
  { label: "Ventas", icon: Receipt },
  { label: "Puerta", icon: QrCode },
];

function Nav() {
  return (
    <>
      <NavLink href="/panel" segment={null}>
        <Home className="size-4" aria-hidden />
        Inicio
      </NavLink>
      <NavLink href="/panel/mi-pagina" segment="mi-pagina">
        <Globe className="size-4" aria-hidden />
        Mi página
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
  );
}

async function ImpersonationBanner() {
  const { impersonating, organization } = await requireTenant();
  if (!impersonating) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-palco-100 px-4 py-2 text-sm text-palco-950 md:px-10">
      <p>
        Estás viendo el panel de <strong>{organization.name}</strong> como soporte. Queda registrado en la auditoría.
      </p>
      <form action={stopImpersonationAction}>
        <SubmitButton variant="secondary">Volver a admin</SubmitButton>
      </form>
    </div>
  );
}

async function Guard({ children }: { children: ReactNode }) {
  await requireTenant();
  return children;
}

export default function PanelLayout({ children }: LayoutProps<"/dashboard/panel">) {
  return (
    <Shell
      nav={<Nav />}
      banner={
        <Suspense>
          <ImpersonationBanner />
        </Suspense>
      }
    >
      <Suspense fallback={<Loading />}>
        <Guard>{children}</Guard>
      </Suspense>
    </Shell>
  );
}
