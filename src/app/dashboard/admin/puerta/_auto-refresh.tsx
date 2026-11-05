"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// La pantalla de la compu se actualiza sola: al escanear desde el celular, el QR pasa a "Usada".
// Solo mientras la pestaña está a la vista, para no consultar la base de más.
export function AutoRefresh({ seconds = 2 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      // Solo en pantallas de compu (en el celular está el escáner y no hace falta).
      if (document.visibilityState === "visible" && window.matchMedia("(min-width: 768px)").matches) router.refresh();
    };
    const id = setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);
  return null;
}
