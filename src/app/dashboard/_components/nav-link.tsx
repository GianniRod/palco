"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

type Props = { href: string; segment: string | null; children: ReactNode };

function Item({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
        active ? "bg-palco-800 font-medium text-white" : "text-palco-200 hover:bg-palco-900"
      }`}
    >
      {children}
    </Link>
  );
}

// Compara contra el segmento y no contra la URL: la URL pública no incluye /dashboard.
function ActiveItem({ href, segment, children }: Props) {
  return (
    <Item href={href} active={useSelectedLayoutSegment() === segment}>
      {children}
    </Item>
  );
}

export function NavLink({ href, segment, children }: Props) {
  return (
    <Suspense
      fallback={
        <Item href={href} active={false}>
          {children}
        </Item>
      }
    >
      <ActiveItem href={href} segment={segment}>
        {children}
      </ActiveItem>
    </Suspense>
  );
}
