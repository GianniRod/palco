import type { ReactNode } from "react";
import { MadeByNightowl } from "@/components/made-by";
import type { SiteContent } from "@/components/public-site";

// La entrada ya comprada. El QR va siempre sobre blanco: sobre otro color cuesta más leerlo en la puerta.
export function TicketCard({
  style,
  titleClass,
  kicker,
  title,
  date,
  venue,
  place,
  note,
  qr,
}: {
  style: SiteContent["ticketStyle"];
  titleClass: string;
  kicker: string;
  title: string;
  date: string;
  venue: string;
  place: string;
  note?: string;
  qr: ReactNode;
}) {
  const brand = style === "marca";
  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--site-surface)] [box-shadow:var(--site-shadow)]">
      <div className="grid @xl:grid-cols-[minmax(0,1fr)_auto]">
        <div
          className="flex min-w-0 flex-col p-6"
          style={brand ? { background: "var(--site-accent)", color: "var(--site-on-accent)" } : undefined}
        >
          <p className={`text-xs font-bold uppercase tracking-[0.18em] ${brand ? "" : "text-[var(--site-accent-text)]"}`}>{kicker}</p>
          <p className={`mt-2 text-2xl leading-tight ${titleClass}`}>{title}</p>
          <p className={`mt-2 first-letter:uppercase ${brand ? "opacity-80" : "text-[var(--site-muted)]"}`}>{date}</p>
          <p className={brand ? "opacity-80" : "text-[var(--site-muted)]"}>{venue}</p>
          <p className="mt-3 font-semibold">{place}</p>
          {note && <p className="mt-2 text-sm font-semibold">{note}</p>}
          <div className="mt-auto pt-5"><MadeByNightowl /></div>
        </div>
        <div className="relative flex items-center justify-center border-t-2 border-dashed border-[var(--site-line)] p-6 @xl:border-l-2 @xl:border-t-0">
          <span aria-hidden className="absolute -left-2.5 -top-2.5 size-5 rounded-full bg-[var(--site-bg)]" />
          <span aria-hidden className="absolute -bottom-2.5 -left-2.5 hidden size-5 rounded-full bg-[var(--site-bg)] @xl:block" />
          <span aria-hidden className="absolute -right-2.5 -top-2.5 size-5 rounded-full bg-[var(--site-bg)] @xl:hidden" />
          {qr}
        </div>
      </div>
    </div>
  );
}
