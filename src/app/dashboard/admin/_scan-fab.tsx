"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { ScanLine } from "lucide-react";

// En el celular, un botón fijo para ir a escanear desde cualquier pantalla del admin.
export function ScanFab() {
  if (useSelectedLayoutSegment() === "puerta") return null;
  return (
    <Link
      href="/admin/puerta"
      className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-center gap-2 rounded-full bg-palco-950 py-4 font-semibold text-white shadow-xl md:hidden"
    >
      <ScanLine className="size-5" aria-hidden />
      Escanear QR
    </Link>
  );
}
