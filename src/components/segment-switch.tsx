"use client";

import Link from "next/link";
import { saveSegment, segmentPath, type Segment } from "@/lib/segment";

const options: { id: Segment; label: string }[] = [
  { id: "boliche", label: "Boliches" },
  { id: "teatro", label: "Teatros" },
];

/** Selector de versión de la landing, para la barra superior (fondo oscuro). */
export function SegmentSwitch({ current }: { current: Segment }) {
  return (
    <div className="flex items-center rounded-full border border-white/15 p-0.5 text-xs font-medium sm:text-sm">
      {options.map((o) => {
        const active = o.id === current;
        return (
          <Link
            key={o.id}
            href={segmentPath[o.id]}
            onClick={() => saveSegment(o.id)}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 transition ${
              active ? "bg-white text-black" : "text-white/60 hover:text-white"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
