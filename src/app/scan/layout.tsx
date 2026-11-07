import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { MadeByNightowl } from "@/components/made-by";

export const metadata: Metadata = {
  title: { default: "Nightowl Scan", template: "%s · Nightowl Scan" },
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

// Pensado para el celular del portero: sin zoom accidental y con la barra del navegador en negro.
export const viewport: Viewport = { themeColor: "#050505", width: "device-width", initialScale: 1, maximumScale: 1 };

export default function ScanLayout({ children }: { children: ReactNode }) {
  return (
    <div className="minimal min-h-dvh">
      {children}
      <footer className="flex justify-center bg-palco-950 px-4 py-4">
        <MadeByNightowl color="#ffffff" />
      </footer>
    </div>
  );
}
