import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { getDb } from "@backend/db.mjs";
import { getPublicEvent } from "@backend/sites.mjs";
import { FIT, SiteFrame, formatPrice } from "@/components/public-site";
import { VenueMap } from "@/components/venue-map";
import { checkoutEnabled } from "@/lib/checkout";

type Props = PageProps<"/sites/[slug]/eventos/[id]">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const load = cache((slug: string, id: string) => (UUID.test(id) ? getPublicEvent(getDb(), slug, id) : null));

const dateFormat = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Argentina/Buenos_Aires",
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const data = await load(slug, id);
  if (!data) return { title: "Página no encontrada", robots: { index: false } };
  return {
    title: { absolute: `${data.event.title} · ${data.content.displayName}` },
    description: data.event.description.slice(0, 160) || undefined,
    alternates: { canonical: null },
    icons: data.content.logo ? { icon: data.content.logo } : undefined,
  };
}

type Sector = { mapKey: string; name: string; kind: string; price: number };
type Performance = { id: string; startsAt: Date };

async function Content({ params }: { params: Props["params"] }) {
  const { slug, id } = await params;
  const data = await load(slug, id);
  if (!data) notFound();
  const { content: site, event } = data;
  const dark = site.background === "oscuro";
  const sectors: Sector[] = event.sectors;
  const prices = Object.fromEntries(sectors.map((sector) => [sector.mapKey, formatPrice(sector.price)]));

  return (
    <SiteFrame site={site} className="min-h-screen" homeHref="/">
      <section className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 @3xl:px-8 @3xl:py-12">
        <div className="grid gap-8 @3xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="min-w-0">
            {event.image && (
              // eslint-disable-next-line @next/next/no-img-element -- el flyer se sirve desde nuestra API.
              <img src={event.image} alt={event.title} className="mb-6 aspect-video w-full rounded-2xl object-cover" />
            )}
            <h1 className={`text-[clamp(1.9rem,8.5cqi,3rem)] font-extrabold leading-tight tracking-tight text-balance @3xl:text-5xl ${FIT}`}>
              {event.title}
            </h1>
            <p className="mt-3 flex items-start gap-2 text-[var(--site-muted)]">
              <MapPin className="mt-1 size-4 shrink-0" aria-hidden />
              <span className={FIT}>{event.venue}{event.address ? ` · ${event.address}` : ""}</span>
            </p>
            {event.description && (
              <p className={`mt-6 whitespace-pre-line text-base leading-relaxed text-[var(--site-muted)] @md:text-lg ${FIT}`}>
                {event.description}
              </p>
            )}
          </div>

          <aside className="min-w-0 space-y-6">
            <div className="rounded-xl bg-[var(--site-surface)] p-5 [box-shadow:var(--site-shadow)]">
              <h2 className="flex items-center gap-2 font-bold"><CalendarDays className="size-4" aria-hidden /> Funciones</h2>
              <ul className="mt-3 divide-y divide-[var(--site-line)]">
                {event.performances.map((performance: Performance) => (
                  <li key={performance.id} className="py-2 first-letter:uppercase">{dateFormat.format(new Date(performance.startsAt))}</li>
                ))}
              </ul>
              {event.performances.length === 0 && <p className="mt-3 text-[var(--site-muted)]">No hay funciones próximas.</p>}
              <h2 className="mt-5 font-bold">Precios</h2>
              <ul className="mt-2 divide-y divide-[var(--site-line)]">
                {sectors.map((sector) => (
                  <li key={sector.mapKey} className="flex items-baseline justify-between gap-3 py-2">
                    <span className={FIT}>{sector.name}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatPrice(sector.price)}</span>
                  </li>
                ))}
              </ul>
              {checkoutEnabled && event.performances.length > 0 ? (
                <a href={`/eventos/${event.id}/comprar`} className="mt-4 block rounded-md bg-[var(--site-accent)] px-4 py-3 text-center font-bold text-[var(--site-on-accent)] transition hover:opacity-90">Comprar entradas</a>
              ) : (
                <p className="mt-4 rounded-md bg-[var(--site-accent)] px-4 py-3 text-center font-bold text-[var(--site-on-accent)]">Entradas muy pronto</p>
              )}
            </div>
            {/* Los eventos que se venden solo por ubicación no muestran plano */}
            {event.map?.display !== "list" && (
            <VenueMap
              map={event.map}
              prices={prices}
              accent={site.primaryColor}
              fg={dark ? "#f5f5f7" : "#16161a"}
              bg={dark ? "#0d0d10" : "#ffffff"}
            />
            )}
          </aside>
        </div>
      </section>
    </SiteFrame>
  );
}

export default function PublicEventPage({ params }: Props) {
  return (
    <Suspense>
      <Content params={params} />
    </Suspense>
  );
}
