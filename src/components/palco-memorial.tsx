import { Info } from "lucide-react";

/**
 * Despedida del primer nombre del proyecto, en el footer.
 * Temporal: sacar el día del lanzamiento.
 */
export function PalcoMemorial() {
  return (
    <div className="mt-1 flex items-center justify-center gap-1.5 text-xs sm:justify-end">
      <span>En memoria a Palco 💔 4 noviembre 2026 – 5 noviembre 2026</span>
      <details className="group relative">
        <summary
          aria-label="¿Por qué este mensaje?"
          className="flex cursor-pointer list-none items-center rounded-full p-0.5 transition hover:text-current [&::-webkit-details-marker]:hidden"
        >
          <Info className="h-3.5 w-3.5" />
        </summary>
        <div className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-xl border border-black/10 bg-white p-4 text-left text-xs leading-relaxed text-[#09090b] shadow-xl">
          <p>
            Palco fue el primer nombre del proyecto. Lo tuvimos que cambiar por fines comerciales, y
            así nació Nightowl.
          </p>
          <p className="mt-2">
            Aunque nuestra marca cambió, el proyecto, la visión y las ganas de construir algo grande
            siguen intactos.
          </p>
        </div>
      </details>
    </div>
  );
}
