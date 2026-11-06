"use client";

import { ScanLine } from "lucide-react";
import { SCAN_URL } from "@/lib/dashboard/config";

// En el celular, un botón fijo que abre el escáner (scan.palcotickets.com) desde cualquier pantalla del admin.
export function ScanFab() {
  return (
    <a
      href={SCAN_URL}
      target="_blank"
      rel="noopener"
      className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-center gap-2 rounded-full bg-palco-950 py-4 font-semibold text-white shadow-xl md:hidden"
    >
      <ScanLine className="size-5" aria-hidden />
      Escanear QR
    </a>
  );
}
