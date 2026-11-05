import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  alternates: { canonical: "/" },
  title: {
    default: "Nightowl — Venta de entradas con tu marca",
    template: "%s · Nightowl",
  },
  description: site.description,
  openGraph: {
    title: "Nightowl — Venta de entradas con tu marca",
    description: site.description,
    url: site.url,
    siteName: site.name,
    locale: "es_AR",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
