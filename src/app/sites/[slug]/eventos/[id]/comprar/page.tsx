import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@backend/db.mjs";
import { getCheckout } from "@backend/checkout.mjs";
import { SiteFrame } from "@/components/public-site";
import { checkoutEnabled } from "@/lib/checkout";
import { TicketPicker } from "./_picker";

export const metadata: Metadata = {
  title: { absolute: "Comprar entradas" },
  robots: { index: false },
  alternates: { canonical: null },
};

type Props = PageProps<"/sites/[slug]/eventos/[id]/comprar">;
type Performance = { id: string; startsAt: Date };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const dateFormat = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Argentina/Buenos_Aires",
});

async function Content({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  const { slug, id } = await params;
  const { funcion } = await searchParams;
  if (!checkoutEnabled || !UUID.test(id)) notFound();
  const requested = typeof funcion === "string" && UUID.test(funcion) ? funcion : undefined;
  const data = await getCheckout(getDb(), slug, id, requested);
  if (!data) notFound();
  const { content: site, event, performance, sectors, seats } = data;
  const performances: Performance[] = event.performances;

  return (
    <SiteFrame site={site} className="min-h-screen" homeHref="/">
      <section className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 @3xl:px-8 @3xl:py-12">
        <p className="text-sm">
          <a href={`/eventos/${id}`} className="text-[var(--site-muted)] hover:underline">← {event.title}</a>
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight @3xl:text-4xl">Elegí tus entradas</h1>

        <nav aria-label="Función" className="mt-5 mb-6 flex flex-wrap gap-2">
          {performances.map((item) => {
            const active = item.id === performance.id;
            return (
              <a
                key={item.id}
                href={`/eventos/${id}/comprar?funcion=${item.id}`}
                aria-current={active ? "true" : undefined}
                style={active ? { background: "var(--site-accent)", color: "var(--site-on-accent)", borderColor: "var(--site-accent)" } : undefined}
                className="rounded-md border border-[var(--site-line)] bg-[var(--site-surface)] px-4 py-2 text-sm font-semibold capitalize"
              >
                {dateFormat.format(new Date(item.startsAt))}
              </a>
            );
          })}
        </nav>

        <TicketPicker key={performance.id} performanceId={performance.id} sectors={sectors} seats={seats} />
      </section>
    </SiteFrame>
  );
}

export default function BuyPage({ params, searchParams }: Props) {
  return (
    <Suspense>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}
