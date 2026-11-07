"use client";

import { useCallback, useState } from "react";
import { QrCode } from "lucide-react";
import { CheckoutHeading } from "@/components/checkout-heading";
import { CheckoutScene, type CheckoutSeat, type CheckoutSector } from "@/components/checkout-scene";
import { SiteFrame, type SiteContent } from "@/components/public-site";
import { TicketCard } from "@/components/ticket-card";
import { titleFont } from "@/components/public-site";
import type { VenueMapData } from "@/components/venue-map";

// Solo para la vista previa de Mi página: una sala de ejemplo que se puede tocar.
const SAMPLE_MAP: VenueMapData = {
  sectors: [
    { key: "esc", kind: "stage", name: "Escenario", x: 25, y: 3, w: 50, h: 12 },
    { key: "platea", kind: "numbered", name: "Platea", x: 15, y: 20, w: 70, h: 46, rows: [8, 10, 12, 12, 12], aisles: [6] },
    { key: "campo", kind: "general", name: "Campo", capacity: 200, x: 15, y: 72, w: 70, h: 24 },
  ],
};
const SAMPLE_SECTORS: CheckoutSector[] = [
  { id: "platea", mapKey: "platea", name: "Platea", kind: "numbered", price: 22000, remaining: null },
  { id: "campo", mapKey: "campo", name: "Campo", kind: "general", price: 15000, remaining: 200 },
];
const SAMPLE_SEATS: CheckoutSeat[] = (SAMPLE_MAP.sectors[1].rows ?? []).flatMap((count, row) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${row}-${index}`,
    sectorId: "platea",
    row: "ABCDE"[row],
    number: index + 1,
    available: (row * 7 + index * 3) % 9 !== 0,
  })),
);

export function CheckoutPreview({ site }: { site: SiteContent }) {
  const [activeId, setActiveId] = useState("platea");
  const [picked, setPicked] = useState(["2-4", "2-5"]);
  const [places, setPlaces] = useState<Record<string, number>>({});
  const toggle = useCallback((id: string) => {
    setPicked((current) => (current.includes(id) ? current.filter((seat) => seat !== id) : [...current, id]));
  }, []);
  const count = picked.length + Object.values(places).reduce((total, quantity) => total + quantity, 0);

  return (
    <SiteFrame site={site} className="min-h-[640px]">
      <section className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-5 py-8 @3xl:px-8">
        <div><CheckoutHeading site={site} eventTitle="Fiesta de ejemplo" /></div>
        <CheckoutScene
          map={SAMPLE_MAP}
          sectors={SAMPLE_SECTORS}
          seats={SAMPLE_SEATS}
          activeId={activeId}
          selected={new Set(picked)}
          places={places}
          count={count}
          max={8}
          shape={site.seatShape}
          onSelectSector={setActiveId}
          onToggleSeat={toggle}
          onChangePlaces={(sector, delta) =>
            setPlaces((current) => ({ ...current, [sector.id]: Math.max(0, (current[sector.id] ?? 0) + delta) }))
          }
        />
        <TicketCard
          style={site.ticketStyle}
          titleClass={titleFont(site)}
          kicker="Entrada 1 de 2"
          title="Fiesta de ejemplo"
          date="Sábado, 12 de diciembre, 23:30"
          venue="Tu sala"
          place="Platea, fila C, butaca 5"
          qr={
            <div style={{ width: 176, height: 176 }} className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-white text-black/40">
              <QrCode className="size-20" strokeWidth={1.25} aria-hidden />
              <span className="mt-1 text-xs">El QR va acá</span>
            </div>
          }
        />
      </section>
    </SiteFrame>
  );
}
