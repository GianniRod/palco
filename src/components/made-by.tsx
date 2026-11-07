import { Logo } from "@/components/logo";
import { site } from "@/lib/site";

// El búho, pintado con el color que le toque: el PNG es blanco y se usa como máscara.
export function Owl({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block bg-current ${className}`}
      style={{
        aspectRatio: "174 / 240",
        WebkitMask: "url(/buho.png) center / contain no-repeat",
        mask: "url(/buho.png) center / contain no-repeat",
      }}
    />
  );
}

// Crédito chico de la plataforma en el pie de la web de cada cliente: lleva a la web de Nightowl.
export function PoweredByNightowl({ color = "currentColor", className = "" }: { color?: string; className?: string }) {
  return (
    <a
      href={site.url}
      target="_blank"
      rel="noopener"
      className={`flex items-center gap-2 opacity-80 transition hover:opacity-100 ${className}`}
    >
      Tecnología de
      <Logo className="h-4" color={color} />
    </a>
  );
}
