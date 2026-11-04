"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const reducedQuery = "(prefers-reduced-motion: reduce)";

function subscribeReduced(cb: () => void) {
  const mql = window.matchMedia(reducedQuery);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

/** true si el usuario pidió reducir animaciones. */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
}

/** Indica si el elemento está en pantalla (para pausar animaciones fuera de vista). */
export function useInView<T extends Element>(rootMargin = "0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return [ref, inView] as const;
}

/** Ejecuta `tick` cada `ms` mientras `active` sea true. */
export function useInterval(tick: () => void, ms: number, active: boolean) {
  const saved = useRef(tick);
  useEffect(() => {
    saved.current = tick;
  });
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [ms, active]);
}
