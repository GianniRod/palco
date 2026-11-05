import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Nightowl" },
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  // Blanco y negro, igual que la landing: .minimal pasa la paleta a grises
  return <div className="minimal min-h-dvh">{children}</div>;
}
