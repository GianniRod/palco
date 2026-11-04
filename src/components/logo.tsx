import type { CSSProperties } from "react";

// El PNG del logo es blanco; con una máscara lo pintamos del color que haga falta.
export function Logo({ className = "", color = "white" }: { className?: string; color?: string }) {
  const style: CSSProperties = {
    backgroundColor: color,
    WebkitMask: "url(/logo-palco.png) center / contain no-repeat",
    mask: "url(/logo-palco.png) center / contain no-repeat",
    aspectRatio: "906 / 264",
  };
  return <span role="img" aria-label="Palco" className={`inline-block ${className}`} style={style} />;
}
