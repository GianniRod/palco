"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";

// Celular: barra arriba con el logo y un botón que despliega el menú completo (secciones y cuenta).
export function MobileNav({ nav, account }: { nav: ReactNode; account: ReactNode }) {
  const [open, setOpen] = useState(false);

  // Sin scroll de fondo mientras el menú está abierto.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between bg-palco-950 px-4 text-white">
        <Link href="/" aria-label="Inicio">
          <Logo className="h-5" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          className="-mr-2 rounded-lg p-2 transition hover:bg-palco-900"
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      {open && (
        <div
          // Al tocar una sección (un link) se cierra solo.
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
          className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto bg-palco-950 px-4 pb-8 pt-2 text-white"
        >
          {/* Las secciones en columna, grandes para tocar con el dedo */}
          <nav className="flex flex-col gap-1 [&_a]:py-3 [&_a]:text-base [&>span]:py-3 [&>span]:text-base">{nav}</nav>
          <div className="mt-4 border-t border-white/10 pt-4">{account}</div>
        </div>
      )}
    </div>
  );
}
