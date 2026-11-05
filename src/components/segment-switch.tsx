"use client";

import Link from "next/link";
import { saveSegment, segmentPath, type Segment } from "@/lib/segment";

const options: { id: Segment; label: string }[] = [
  { id: "boliche", label: "Boliches" },
  { id: "teatro", label: "Teatros" },
];

/** Selector de versión de la landing, para la barra superior. */
export function SegmentSwitch({ current, tone = "dark" }: { current: Segment; tone?: "dark" | "light" }) {
  const light = tone === "light";
  return (
    <div
      className={`flex items-center rounded-full border p-0.5 text-xs font-medium sm:text-sm ${
        light ? "border-tinta/15" : "border-white/15"
      }`}
    >
      {options.map((o) => {
        const active = o.id === current;
        return (
          <Link
            key={o.id}
            href={segmentPath[o.id]}
            onClick={() => saveSegment(o.id)}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 transition ${
              active
                ? light
                  ? "bg-tinta text-white"
                  : "bg-white text-black"
                : light
                  ? "text-tinta/55 hover:text-tinta"
                  : "text-white/60 hover:text-white"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
