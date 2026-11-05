import type { CSSProperties, ReactNode } from "react";

// Las tres plantillas de la página pública, con el estilo de la animación del Editor de la landing
// (components/site-builder.tsx). El mismo componente pinta la página real y la vista previa del
// editor, por eso los cortes son por ancho del contenedor (@md) y no de la pantalla.

export type SiteContent = {
  template: "dividida" | "portada" | "cartelera";
  displayName: string;
  logo: string;
  primaryColor: string;
  background: "claro" | "oscuro";
  titleFont: "clasica" | "moderna";
  tagline: string;
  about: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
};

export type SiteEvent = { id: string; title: string; startsAt: Date | string; venue: string };

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const fullDate = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
});
const shortDate = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: TIME_ZONE,
});

const formatDate = (event: SiteEvent) => fullDate.format(new Date(event.startsAt)).replaceAll(",", " ·");
const formatShortDate = (event: SiteEvent) => shortDate.format(new Date(event.startsAt));

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function themeStyle(site: SiteContent) {
  const dark = site.background === "oscuro";
  return {
    "--site-bg": dark ? "#0E0C14" : "#FAF8F4",
    "--site-fg": dark ? "#F5F3FA" : "#16141C",
    "--site-muted": dark ? "rgba(245,243,250,0.6)" : "rgba(22,20,28,0.6)",
    "--site-line": dark ? "rgba(245,243,250,0.14)" : "rgba(22,20,28,0.12)",
    "--site-accent": site.primaryColor,
    "--site-on-accent": luminance(site.primaryColor) > 0.45 ? "#111111" : "#FFFFFF",
    backgroundColor: "var(--site-bg)",
    color: "var(--site-fg)",
  } as CSSProperties;
}

const titleClass = (site: SiteContent) =>
  site.titleFont === "clasica" ? "font-serif" : "font-sans font-black uppercase tracking-tight";

const softBlock = { background: "color-mix(in srgb, var(--site-fg) 6%, transparent)" };
const EYEBROW = "text-[11px] uppercase tracking-[0.2em]";

type Props = { site: SiteContent; events: SiteEvent[] };

// Todavía no se venden entradas desde la página: se avisa en lugar de mostrar un botón que no hace nada.
function SoonPill({ inverted = false }: { inverted?: boolean }) {
  return (
    <span
      className="inline-block rounded-full px-5 py-2 text-sm font-semibold"
      style={
        inverted
          ? { background: "var(--site-on-accent)", color: "var(--site-accent)" }
          : { background: "var(--site-accent)", color: "var(--site-on-accent)" }
      }
    >
      Entradas muy pronto
    </span>
  );
}

function EventRows({ events, empty }: { events: SiteEvent[]; empty: string }) {
  if (events.length === 0) return <p className="text-sm text-[var(--site-muted)]">{empty}</p>;
  return (
    <ul className="space-y-2 text-sm">
      {events.map((event) => (
        <li key={event.id} className="flex items-baseline justify-between gap-3 border-b border-[var(--site-line)] pb-2">
          <span className="min-w-0">{event.title}</span>
          <span className="shrink-0 text-xs capitalize text-[var(--site-muted)]">{formatShortDate(event)}</span>
        </li>
      ))}
    </ul>
  );
}

function About({ site }: { site: SiteContent }) {
  if (!site.about) return null;
  return <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--site-muted)]">{site.about}</p>;
}

function Dividida({ site, events }: Props) {
  const [next, ...rest] = events;
  return (
    <div className="grid gap-6 px-5 pb-8 pt-4 @md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex min-w-0 flex-col">
        <p className={`${EYEBROW} text-[var(--site-accent)]`}>{next ? formatDate(next) : "Próximamente"}</p>
        <h1 className={`mt-2 text-3xl leading-[1.05] text-balance @lg:text-4xl ${titleClass(site)}`}>
          {next?.title ?? (site.tagline || site.displayName)}
        </h1>
        {next && site.tagline && <p className="mt-3 text-sm text-[var(--site-muted)]">{site.tagline}</p>}
        <div className="mt-5"><SoonPill /></div>
        {site.about && <div className="mt-6"><About site={site} /></div>}
      </div>
      <section id="eventos" style={softBlock} className="min-w-0 self-start rounded-lg p-5">
        <h2 className={`${EYEBROW} mb-3 text-[var(--site-muted)]`}>{next ? "Otras fechas" : "Próximas fechas"}</h2>
        <EventRows events={rest} empty={next ? "Por ahora, esta es la próxima fecha." : "Pronto vas a ver las fechas acá."} />
      </section>
    </div>
  );
}

function Portada({ site, events }: Props) {
  const [next, ...rest] = events;
  return (
    <div className="pb-8">
      <section className="mx-5 mt-2 flex flex-col items-center rounded-xl bg-[var(--site-accent)] px-6 py-10 text-center text-[var(--site-on-accent)]">
        <p className={`${EYEBROW} opacity-75`}>{next ? formatDate(next) : "Próximamente"}</p>
        <h1 className={`mt-2 text-4xl leading-[1.05] text-balance @lg:text-5xl ${titleClass(site)}`}>
          {next?.title ?? (site.tagline || site.displayName)}
        </h1>
        {next && site.tagline && <p className="mt-3 text-sm opacity-85">{site.tagline}</p>}
        <div className="mt-5"><SoonPill inverted /></div>
      </section>
      <div className="mt-6 grid items-start gap-6 px-5 @md:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0"><About site={site} /></div>
        <section id="eventos" className="min-w-0">
          <h2 className={`${EYEBROW} mb-3 text-[var(--site-muted)]`}>{next ? "Otras fechas" : "Próximas fechas"}</h2>
          <EventRows events={rest} empty={next ? "Por ahora, esta es la próxima fecha." : "Pronto vas a ver las fechas acá."} />
        </section>
      </div>
    </div>
  );
}

function Cartelera({ site, events }: Props) {
  return (
    <div className="px-5 pb-8 pt-2">
      <h1 className={`${EYEBROW} text-[var(--site-muted)]`}>Cartelera</h1>
      {site.tagline && <p className={`mt-2 text-2xl leading-tight text-balance ${titleClass(site)}`}>{site.tagline}</p>}
      {events.length === 0 ? (
        <p style={softBlock} className="mt-4 rounded-lg p-5 text-sm text-[var(--site-muted)]">Pronto vas a ver las fechas acá.</p>
      ) : (
        <ul id="eventos" className="mt-4 grid grid-cols-2 gap-3 @md:grid-cols-3">
          {events.map((event, index) => (
            <li
              key={event.id}
              style={index === 0 ? undefined : softBlock}
              className={`flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-lg p-3 ${
                index === 0 ? "bg-[var(--site-accent)] text-[var(--site-on-accent)]" : ""
              }`}
            >
              <p className={`text-[10px] uppercase tracking-widest ${index === 0 ? "opacity-75" : "text-[var(--site-muted)]"}`}>
                {formatShortDate(event)}
              </p>
              <p className={`mt-1 text-sm leading-tight ${titleClass(site)}`}>{event.title}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5"><SoonPill /></div>
      {site.about && <div className="mt-6 max-w-2xl"><About site={site} /></div>}
    </div>
  );
}

const TEMPLATES = { dividida: Dividida, portada: Portada, cartelera: Cartelera };

function Brand({ site }: { site: SiteContent }) {
  if (site.logo) {
    // eslint-disable-next-line @next/next/no-img-element -- el logo es una data URL guardada con el sitio.
    return <img src={site.logo} alt={site.displayName} className="h-8 w-auto max-w-40 object-contain" />;
  }
  return <span className={`text-sm ${titleClass(site)}`}>{site.displayName}</span>;
}

// En la vista previa llega lo que se está escribiendo, así que puede ser una dirección a medias.
function parseWebsite(value: string) {
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function Contact({ site }: { site: SiteContent }) {
  const items: ReactNode[] = [];
  const website = site.website ? parseWebsite(site.website) : null;
  const instagram = site.instagram.replace(/^@/, "");
  if (site.address) items.push(<span key="address">{site.address}</span>);
  if (site.phone) items.push(<span key="phone">{site.phone}</span>);
  if (site.email) items.push(<a key="email" href={`mailto:${site.email}`} className="underline">{site.email}</a>);
  if (website) {
    items.push(
      <a key="website" href={website.href} target="_blank" rel="noopener noreferrer" className="underline">
        {website.hostname.replace(/^www\./, "")}
      </a>,
    );
  }
  if (instagram) {
    items.push(
      <a key="instagram" href={`https://instagram.com/${encodeURIComponent(instagram)}`} target="_blank" rel="noopener noreferrer" className="underline">
        @{instagram}
      </a>,
    );
  }
  if (items.length === 0) return null;
  return (
    <footer id="contacto" className="mt-auto flex flex-wrap gap-x-5 gap-y-1 border-t border-[var(--site-line)] px-5 py-4 text-xs text-[var(--site-muted)]">
      {items}
    </footer>
  );
}

export function PublicSite({ site, events, className = "" }: Props & { className?: string }) {
  const Template = TEMPLATES[site.template];
  const hasContact = Boolean(site.address || site.phone || site.email || site.website || site.instagram);
  return (
    <div style={themeStyle(site)} className={`@container flex flex-col font-sans ${className}`}>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-5 py-3 text-xs">
          <Brand site={site} />
          <span className="shrink-0 text-[var(--site-muted)]">Eventos{hasContact ? " · Contacto" : ""}</span>
        </header>
        <Template site={site} events={events} />
        <Contact site={site} />
      </div>
    </div>
  );
}
