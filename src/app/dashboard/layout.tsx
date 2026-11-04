import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Palco" },
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return children;
}
