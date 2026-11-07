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

// La firma de la agencia: va en todo lo que hacemos, también en la página de cada cliente.
export function MadeByNightowl({ color = "currentColor", className = "" }: { color?: string; className?: string }) {
  return (
    <a
      href={site.url}
      target="_blank"
      rel="noopener"
      aria-label="Made by Nightowl"
      style={{ color }}
      className={`group inline-flex items-center gap-1.5 text-xs font-medium opacity-70 transition hover:opacity-100 ${className}`}
    >
      <Owl className="h-4 transition-transform duration-300 group-hover:-rotate-12" />
      <span>Made by</span>
      <Logo className="h-3.5" color={color} />
    </a>
  );
}
