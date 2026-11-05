import type { CSSProperties, ReactNode } from "react";
import { AtSign, CalendarDays, Globe, Mail, MapPin, Phone } from "lucide-react";

// Las tres plantillas de la página pública. El mismo componente pinta la página real y la
// vista previa del editor, por eso los cortes son por ancho del contenedor y no de la pantalla.

export type SiteContent = {
  template: "dividida" | "portada" | "cartelera";
  displayName: string;
  logo: string;
  cover: string;
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

export type SiteEvent = {
  id: string;
  title: string;
  startsAt: Date | string;
  venue: string;
  image?: string | null;
  moreDates?: number;
  fromPrice?: number | null;
};

const priceFormat = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
export const formatPrice = (price: number) => priceFormat.format(price);

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const longDate = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
});
const cardDate = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
});
const dayNumber = new Intl.DateTimeFormat("es-AR", { day: "numeric", timeZone: TIME_ZONE });
const monthName = new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: TIME_ZONE });

const formatLong = (event: SiteEvent) => longDate.format(new Date(event.startsAt)).replace(/,/g, " ·");
const formatCard = (event: SiteEvent) => cardDate.format(new Date(event.startsAt)).replace(/,/g, " ·");

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function themeStyle(site: SiteContent) {
  const dark = site.background === "oscuro";
  const light = luminance(site.primaryColor);
  const fg = dark ? "#f5f5f7" : "#16161a";
  // Un color muy oscuro sobre fondo oscuro (o muy claro sobre fondo claro) no se leería como texto.
  const legible = dark ? light > 0.08 : light < 0.45;
  return {
    "--site-bg": dark ? "#0d0d10" : "#f6f6f7",
    "--site-surface": dark ? "#18181d" : "#ffffff",
    "--site-fg": fg,
    "--site-muted": dark ? "#a6a6b0" : "#5f5f68",
    "--site-line": dark ? "#2b2b32" : "#e5e5e8",
    "--site-accent": site.primaryColor,
    // Blanco o negro, el que más contraste tenga contra el color que eligió el cliente.
    "--site-on-accent": light > 0.179 ? "#111111" : "#ffffff",
    "--site-accent-text": legible ? site.primaryColor : fg,
    "--site-shadow": dark ? "0 10px 30px rgba(0,0,0,.45)" : "0 10px 30px rgba(22,22,26,.08)",
    backgroundColor: "var(--site-bg)",
    color: "var(--site-fg)",
  } as CSSProperties;
}

const titleFont = (site: SiteContent) =>
  site.titleFont === "clasica" ? "font-serif font-semibold" : "font-sans font-extrabold tracking-tight";
const heroCase = (site: SiteContent) => (site.titleFont === "moderna" ? "uppercase" : "");

const WRAP = "mx-auto w-full max-w-6xl px-5 @3xl:px-8";

type Props = { site: SiteContent; events: SiteEvent[]; linkEvents?: boolean };

// Lleva a la página del evento. En la vista previa del editor es solo un dibujo.
function EventButton({
  event,
  link,
  size = "md",
  inverted = false,
}: {
  event: SiteEvent;
  link?: boolean;
  size?: "sm" | "md";
  inverted?: boolean;
}) {
  const className = `inline-block rounded-md font-bold ${size === "sm" ? "px-3.5 py-2 text-sm" : "px-6 py-3 text-base"}`;
  const style = inverted
    ? { background: "var(--site-on-accent)", color: "var(--site-accent)" }
    : { background: "var(--site-accent)", color: "var(--site-on-accent)" };
  return link ? (
    <a href={`/eventos/${event.id}`} aria-label={`Ver ${event.title}`} className={className} style={style}>Ver evento</a>
  ) : (
    <span className={className} style={style}>Ver evento</span>
  );
}

// El flyer del evento o, si todavía no subieron uno, un afiche con el color de la marca.
function Poster({ event, index = 0, large = false }: { event: SiteEvent; index?: number; large?: boolean }) {
  if (event.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- el flyer se sirve desde nuestra API.
      <img src={event.image} alt="" className={`w-full object-cover ${large ? "aspect-[4/3] rounded-2xl" : "aspect-[16/9]"}`} />
    );
  }
  const date = new Date(event.startsAt);
  const shade = [0, 22, 38][index % 3];
  return (
    <div
      className={`relative flex overflow-hidden text-[var(--site-on-accent)] ${large ? "aspect-[4/3] rounded-2xl" : "aspect-[16/9]"}`}
      style={{ background: `color-mix(in srgb, var(--site-accent) ${100 - shade}%, #000000)` }}
    >
      <span
        aria-hidden
        className="absolute -right-[12%] -top-[35%] aspect-square w-3/4 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,.28), rgba(255,255,255,0) 68%)" }}
      />
      <span aria-hidden className="absolute bottom-0 right-0 h-1/2 w-2/5 -skew-x-12 translate-x-6 bg-black/10" />
      <div className="relative mt-auto flex items-end gap-3 p-5">
        <span className={`font-black leading-none ${large ? "text-8xl" : "text-6xl"}`}>{dayNumber.format(date)}</span>
        <span className="pb-1 text-sm font-bold uppercase tracking-widest">{monthName.format(date).replace(".", "")}</span>
      </div>
    </div>
  );
}

function EventCard({ site, event, index, link }: { site: SiteContent; event: SiteEvent; index: number; link?: boolean }) {
  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-[var(--site-surface)] [box-shadow:var(--site-shadow)]">
      <Poster event={event} index={index} />
      <div className="flex flex-1 flex-col items-start p-5">
        <h3 className={`text-xl leading-snug ${titleFont(site)}`}>{event.title}</h3>
        <p className="mt-1 text-[15px] capitalize text-[var(--site-muted)]">{formatCard(event)}</p>
        <p className="text-[15px] text-[var(--site-muted)]">{event.venue}</p>
        {Boolean(event.moreDates) && <p className="text-[15px] text-[var(--site-muted)]">Y {event.moreDates} {event.moreDates === 1 ? "fecha más" : "fechas más"}</p>}
        {typeof event.fromPrice === "number" && <p className="mt-2 font-semibold">Desde {formatPrice(event.fromPrice)}</p>}
        <div className="mt-4"><EventButton event={event} link={link} size="sm" /></div>
      </div>
    </li>
  );
}

function EventSection({ site, events, title, linkEvents }: Props & { title: string }) {
  return (
    <section id="eventos" className={`${WRAP} scroll-mt-24 py-10 @3xl:py-14`}>
      <h2 className={`mb-6 text-xl uppercase tracking-tight @3xl:text-2xl ${titleFont(site)}`}>{title}</h2>
      {events.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl bg-[var(--site-surface)] px-6 py-14 text-center [box-shadow:var(--site-shadow)]">
          <CalendarDays className="size-9 text-[var(--site-accent-text)]" aria-hidden />
          <p className="mt-3 text-lg font-semibold">Estamos preparando las próximas fechas</p>
          <p className="mt-1 text-[var(--site-muted)]">Muy pronto vas a poder ver los eventos acá.</p>
        </div>
      ) : (
        <ul className="grid gap-6 @xl:grid-cols-2 @4xl:grid-cols-3">
          {events.map((event, index) => <EventCard key={event.id} site={site} event={event} index={index} link={linkEvents} />)}
        </ul>
      )}
    </section>
  );
}

function AboutSection({ site }: { site: SiteContent }) {
  if (!site.about) return null;
  return (
    <section className="border-t border-[var(--site-line)] bg-[var(--site-surface)]">
      <div className={`${WRAP} py-10 @3xl:py-14`}>
        <h2 className={`text-xl uppercase tracking-tight @3xl:text-2xl ${titleFont(site)}`}>Sobre {site.displayName}</h2>
        <p className="mt-4 max-w-3xl whitespace-pre-line text-lg leading-relaxed text-[var(--site-muted)]">{site.about}</p>
      </div>
    </section>
  );
}

function CoverImage({ site }: { site: SiteContent }) {
  // eslint-disable-next-line @next/next/no-img-element -- la portada es una data URL guardada con el sitio.
  return <img src={site.cover} alt="" className="absolute inset-0 size-full object-cover" />;
}

function Portada({ site, events, linkEvents }: Props) {
  const [next, ...rest] = events;
  const hasCover = Boolean(site.cover);
  return (
    <>
      <section
        className={`relative flex min-h-[440px] overflow-hidden @3xl:min-h-[520px] ${hasCover ? "text-white" : "text-[var(--site-on-accent)]"}`}
        style={hasCover ? undefined : { background: "var(--site-accent)" }}
      >
        {hasCover ? (
          <>
            <CoverImage site={site} />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
          </>
        ) : (
          <span
            aria-hidden
            className="absolute -right-[10%] -top-[60%] aspect-square w-2/3 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,.22), rgba(255,255,255,0) 68%)" }}
          />
        )}
        <div className={`${WRAP} relative mt-auto py-10 @3xl:py-14`}>
          {next && <p className="text-sm font-bold uppercase tracking-[0.14em] opacity-90">{formatLong(next)}</p>}
          <h1 className={`mt-3 max-w-4xl text-5xl leading-[1.02] text-balance @3xl:text-7xl ${titleFont(site)} ${heroCase(site)}`}>
            {next?.title ?? (site.tagline || site.displayName)}
          </h1>
          {next && site.tagline && <p className="mt-4 max-w-2xl text-lg opacity-90 @3xl:text-xl">{site.tagline}</p>}
          {next && <div className="mt-6"><EventButton event={next} link={linkEvents} inverted={!hasCover} /></div>}
        </div>
      </section>
      {(!next || rest.length > 0) && <EventSection site={site} events={next ? rest : []} title={next ? "Más fechas" : "Próximos eventos"} linkEvents={linkEvents} />}
      <AboutSection site={site} />
    </>
  );
}

function Dividida({ site, events, linkEvents }: Props) {
  const [next, ...rest] = events;
  return (
    <>
      <section className="border-b border-[var(--site-line)] bg-[var(--site-surface)]">
        <div className={`${WRAP} grid items-center gap-8 py-10 @3xl:grid-cols-2 @3xl:gap-12 @3xl:py-14`}>
          <div className="min-w-0">
            {site.cover ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl"><CoverImage site={site} /></div>
            ) : next ? (
              <Poster event={next} large />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-[var(--site-accent)] p-8 text-center text-[var(--site-on-accent)]">
                <span className={`text-4xl ${titleFont(site)}`}>{site.displayName}</span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            {next && <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--site-accent-text)]">{formatLong(next)}</p>}
            <h1 className={`mt-3 text-4xl leading-[1.05] text-balance @3xl:text-6xl ${titleFont(site)} ${heroCase(site)}`}>
              {next?.title ?? (site.tagline || site.displayName)}
            </h1>
            {next && <p className="mt-4 flex items-center gap-2 text-[var(--site-muted)]"><MapPin className="size-4 shrink-0" aria-hidden />{next.venue}</p>}
            {next && site.tagline && <p className="mt-4 text-lg leading-relaxed text-[var(--site-muted)]">{site.tagline}</p>}
            {next && <div className="mt-6"><EventButton event={next} link={linkEvents} /></div>}
          </div>
        </div>
      </section>
      {(!next || rest.length > 0) && <EventSection site={site} events={next ? rest : []} title={next ? "Más fechas" : "Próximos eventos"} linkEvents={linkEvents} />}
      <AboutSection site={site} />
    </>
  );
}

function Cartelera({ site, events, linkEvents }: Props) {
  return (
    <>
      {site.cover && (
        <section className="relative h-56 overflow-hidden @3xl:h-80">
          <CoverImage site={site} />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {site.tagline && (
            <div className={`${WRAP} absolute inset-x-0 bottom-0 pb-6`}>
              <h1 className={`text-3xl text-white @3xl:text-5xl ${titleFont(site)} ${heroCase(site)}`}>{site.tagline}</h1>
            </div>
          )}
        </section>
      )}
      {!site.cover && site.tagline && (
        <section className="border-b border-[var(--site-line)] bg-[var(--site-surface)]">
          <div className={`${WRAP} py-8 @3xl:py-10`}>
            <h1 className={`text-3xl text-balance @3xl:text-5xl ${titleFont(site)} ${heroCase(site)}`}>{site.tagline}</h1>
          </div>
        </section>
      )}
      <EventSection site={site} events={events} title="Próximos eventos" linkEvents={linkEvents} />
      <AboutSection site={site} />
    </>
  );
}

const TEMPLATES = { dividida: Dividida, portada: Portada, cartelera: Cartelera };

// En la vista previa llega lo que se está escribiendo, así que puede ser una dirección a medias.
function parseWebsite(value: string) {
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function Brand({ site, footer = false }: { site: SiteContent; footer?: boolean }) {
  if (site.logo) {
    // eslint-disable-next-line @next/next/no-img-element -- el logo es una data URL guardada con el sitio.
    return <img src={site.logo} alt={site.displayName} className="h-12 w-auto max-w-56 object-contain" />;
  }
  return <span className={`${footer ? "text-xl" : "text-2xl"} ${titleFont(site)}`}>{site.displayName}</span>;
}

function FooterLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <li className="flex min-w-0 items-start gap-2 [overflow-wrap:anywhere]"><span className="mt-1 shrink-0">{icon}</span><span className="min-w-0">{children}</span></li>;
}

function Footer({ site }: { site: SiteContent }) {
  const website = site.website ? parseWebsite(site.website) : null;
  const instagram = site.instagram.replace(/^@/, "");
  const hasContact = Boolean(site.address || site.phone || site.email || website || instagram);
  const icon = "size-4";
  return (
    <footer id="contacto" className="mt-auto scroll-mt-24 border-t border-[var(--site-line)] bg-[var(--site-surface)]">
      <div className={`${WRAP} grid gap-8 py-10 @3xl:grid-cols-2`}>
        <div className="min-w-0">
          <Brand site={site} footer />
          {site.tagline && <p className="mt-3 max-w-md text-[var(--site-muted)]">{site.tagline}</p>}
        </div>
        {hasContact && (
          <div className="min-w-0">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em]">Contacto</h2>
            <ul className="mt-3 grid gap-2 text-[var(--site-muted)]">
              {site.address && <FooterLine icon={<MapPin className={icon} aria-hidden />}>{site.address}</FooterLine>}
              {site.phone && <FooterLine icon={<Phone className={icon} aria-hidden />}>{site.phone}</FooterLine>}
              {site.email && <FooterLine icon={<Mail className={icon} aria-hidden />}><a href={`mailto:${site.email}`} className="hover:underline">{site.email}</a></FooterLine>}
              {website && <FooterLine icon={<Globe className={icon} aria-hidden />}><a href={website.href} target="_blank" rel="noopener noreferrer" className="hover:underline">{website.hostname.replace(/^www\./, "")}</a></FooterLine>}
              {instagram && <FooterLine icon={<AtSign className={icon} aria-hidden />}><a href={`https://instagram.com/${encodeURIComponent(instagram)}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{instagram}</a></FooterLine>}
            </ul>
          </div>
        )}
      </div>
    </footer>
  );
}

// Barra superior, tema y pie: lo que comparten la portada del sitio y la página de cada evento.
export function SiteFrame({
  site,
  className = "",
  homeHref,
  children,
}: {
  site: SiteContent;
  className?: string;
  homeHref?: string;
  children: ReactNode;
}) {
  const hasContact = Boolean(site.address || site.phone || site.email || site.website || site.instagram);
  return (
    <div style={themeStyle(site)} className={`@container flex flex-col font-sans ${className}`}>
      <header className="sticky top-0 z-10 bg-[var(--site-surface)] shadow-sm">
        <div className={`${WRAP} flex min-h-20 items-center justify-between gap-4 py-3`}>
          {homeHref ? <a href={homeHref} aria-label={`Inicio de ${site.displayName}`}><Brand site={site} /></a> : <Brand site={site} />}
          <nav aria-label="Secciones" className="flex shrink-0 items-center gap-5 text-[15px] font-medium @3xl:gap-8 @3xl:text-lg">
            <a href={homeHref ? `${homeHref}#eventos` : "#eventos"} className="hover:underline">Eventos</a>
            {hasContact && <a href="#contacto" className="hover:underline">Contacto</a>}
          </nav>
        </div>
        <div
          aria-hidden
          className="h-1.5"
          style={{ background: "linear-gradient(90deg, var(--site-accent), color-mix(in srgb, var(--site-accent) 55%, #ffffff))" }}
        />
      </header>
      {children}
      <Footer site={site} />
    </div>
  );
}

export function PublicSite({ site, events, linkEvents, className = "" }: Props & { className?: string }) {
  const Template = TEMPLATES[site.template];
  return (
    <SiteFrame site={site} className={className}>
      <Template site={site} events={events} linkEvents={linkEvents} />
    </SiteFrame>
  );
}
