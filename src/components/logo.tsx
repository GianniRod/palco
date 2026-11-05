import type { CSSProperties } from "react";

// El PNG del logo es blanco; con una máscara lo pintamos del color que haga falta.
export function Logo({ className = "", color = "white" }: { className?: string; color?: string }) {
  const style: CSSProperties = {
    backgroundColor: color,
    WebkitMask: "url(/logo-nightowl.png) center / contain no-repeat",
    mask: "url(/logo-nightowl.png) center / contain no-repeat",
    aspectRatio: "1200 / 255",
  };
  return <span role="img" aria-label="Nightowl" className={`inline-block ${className}`} style={style} />;
}
