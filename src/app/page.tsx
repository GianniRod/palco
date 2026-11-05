import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { LotsPanel } from "@/components/lots-panel";
import { CheckoutFlow } from "@/components/checkout-flow";
import { DoorScanner } from "@/components/door-scanner";
import { RotatingChip } from "@/components/rotating-chip";
import { SiteBuilder } from "@/components/site-builder";
import { Reveal } from "@/components/reveal";
import { Logo } from "@/components/logo";
import { DemoDialog } from "@/components/demo-dialog";
import { AudienceGate } from "@/components/audience-gate";
import { SegmentSwitch } from "@/components/segment-switch";
import { OwlPeek } from "@/components/owl-peek";
import { PalcoMemorial } from "@/components/palco-memorial";
import { contactHref, demoHref, site } from "@/lib/site";

const nav = [
  { label: "Editor", href: "#editor" },
  { label: "Venta", href: "#venta" },
  { label: "Puerta", href: "#acceso" },
  { label: "Preguntas", href: "#preguntas" },
];

const nightFeatures = [
  {
    title: "Lotes que se abren solos",
    text: "Cuando se agota Preventa 1 arranca Preventa 2 con su precio. Nadie tiene que tocar nada a las 2 de la mañana.",
  },
  {
    title: "Un link por RRPP",
    text: "Cada RRPP vende con su propio link y ves en el panel cuánto vendió cada uno.",
  },
  {
    title: "Pista, VIP y boxes",
    text: "Vendé entradas generales, sectores VIP y mesas con cupo de personas en el mismo lugar.",
  },
  {
    title: "White label: tu web, tu marca",
    text: "La venta queda en tuboliche.com/tickets, con tu logo y tus colores. Tu público nunca sale de tu sitio.",
  },
];

const faqs = [
  {
    q: "¿Nightowl es una ticketera?",
    a: "No. Somos una plataforma white label: no vendemos entradas a nuestro nombre, ponemos la tecnología para que vos vendas con tu marca y te quedes con tu público.",
  },
  {
    q: "¿Qué significa que sea white label?",
    a: "Que la tecnología es nuestra pero la marca es tuya. Tu público ve tu logo, tus colores y tu dominio en la web, el pago, la entrada y los emails.",
  },
  {
    q: "¿Puedo vender desde mi propia web?",
    a: "Sí, esa es la idea. Conectamos Nightowl a tu sitio y vendés en tuboliche.com/tickets, con un widget o en un subdominio tuyo. Si todavía no tenés web, arrancás con una página en palcotickets.com.",
  },
  {
    q: "¿Quién cobra?",
    a: "Vos. Tu público paga con tarjeta de crédito o débito, o con Mercado Pago, y el dinero se acredita en tu cuenta.",
  },
  {
    q: "¿Mis RRPP pueden seguir vendiendo?",
    a: "Sí. Cada RRPP tiene su link de venta y vos ves en tiempo real cuántas entradas vendió cada uno.",
  },
  {
    q: "¿Sirve para fiestas que cambian de lugar?",
    a: "Sí. Productoras y fiestas itinerantes cargan cada lugar con su capacidad, sus sectores y sus lotes.",
  },
];

export default function Home() {
  return (
    <div className="minimal flex min-h-full flex-1 flex-col">
      <main className="flex-1">
        {/* ---------------- Hero ---------------- */}
        <section className="relative overflow-hidden bg-white text-tinta">
          <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 pt-8">
            <a href="#" aria-label="Nightowl, inicio">
              <Logo className="h-7 sm:h-8" color="var(--color-tinta)" />
            </a>
            <nav className="hidden items-center gap-8 text-sm text-tinta/55 md:flex">
              {nav.map((n) => (
                <a key={n.href} href={n.href} className="transition hover:text-tinta">
                  {n.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <SegmentSwitch current="boliche" tone="light" />
              {/* Al pasar el cursor, el búho se asoma por detrás del texto, de derecha a izquierda (solo en compu) */}
              <a
                href={demoHref}
                className="asoma relative hidden overflow-hidden rounded-full border border-tinta/20 px-4 py-2 text-sm font-medium transition-colors duration-300 hover:bg-tinta hover:text-white sm:inline-flex"
              >
                <OwlPeek className="-top-1 right-1 h-16 w-[46px] bg-white/40" />
                <span className="relative z-10">Pedir demo</span>
              </a>
            </div>
          </header>

          <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
            <p className="subir text-sm uppercase tracking-[0.25em] text-tinta/45">Entradas para boliches y fiestas</p>
            <h1
              className="subir mt-5 text-[clamp(2.1rem,5vw,4rem)] font-semibold leading-[1.12] tracking-tight"
              style={{ animationDelay: "0.05s" }}
            >
              Tu público compra{" "}
              <RotatingChip tone="dark" options={["Preventa 2", "General", "Entrada VIP", "Mesa para 6"]} />, paga en tu web y entra con un QR.
            </h1>

            <div
              className="subir mt-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
              style={{ animationDelay: "0.15s" }}
            >
              <p className="max-w-xl text-lg leading-relaxed text-tinta/60">
                Vendé desde tu propia web, con tus lotes, tus RRPP y tu marca. Cobrás con tarjeta o
                Mercado Pago, directo a tu cuenta.
              </p>
              <a
                href={demoHref}
                className="asoma group relative inline-flex shrink-0 items-center self-start overflow-hidden rounded-full bg-tinta px-6 py-3 font-medium text-white transition hover:bg-tinta/85 md:self-auto"
              >
                <OwlPeek className="top-0 right-2 h-20 w-[58px] bg-white/40" />
                <span className="relative z-10 inline-flex items-center gap-2">
                  Pedir una demo
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </a>
            </div>

            <div className="subir mt-14 rounded-2xl bg-palco-900" style={{ animationDelay: "0.3s" }}>
              <LotsPanel />
            </div>
          </div>
        </section>

        {/* ---------------- Editor ---------------- */}
        <section id="editor" className="papel scroll-mt-4 border-t border-tinta/10">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <SectionTitle eyebrow="Editor" title="Tu web de entradas, armada por vos.">
              Elegí uno de los tres diseños, poné tu logo y tus colores, armá la pista, el VIP y los
              boxes, cargá los precios y publicá. Queda en tuboliche.com/tickets.
            </SectionTitle>
            <Reveal className="mt-16">
              <SiteBuilder />
            </Reveal>
          </div>
        </section>

        {/* ---------------- Hecho para la noche ---------------- */}
        <section className="border-y border-tinta/10 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <SectionTitle eyebrow="Hecho para la noche" title="Lo que un boliche necesita, nada más." />
            <div className="mt-14 grid border-t border-tinta/10 sm:grid-cols-2">
              {nightFeatures.map((f, i) => (
                <Reveal
                  key={f.title}
                  delay={(i % 2) * 100}
                  className={`border-b border-tinta/10 py-8 sm:pr-10 ${i % 2 === 1 ? "sm:border-l sm:pl-10" : ""}`}
                >
                  <p className="text-xs tabular-nums text-tinta/40">0{i + 1}</p>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-2 max-w-md leading-relaxed text-tinta/60">{f.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Venta ---------------- */}
        <section id="venta" className="papel scroll-mt-4">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <SectionTitle eyebrow="Venta" title="Comprar lleva un minuto.">
              Elige el lote, paga con tarjeta de crédito, débito o Mercado Pago y recibe su QR. Sin salir
              de tu web.
            </SectionTitle>
            <Reveal className="mt-16">
              <CheckoutFlow />
            </Reveal>
          </div>
        </section>

        {/* ---------------- Puerta ---------------- */}
        <section id="acceso" className="scroll-mt-4 bg-palco-900 text-white">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <SectionTitle eyebrow="Puerta" title="La fila avanza." dark>
              Cada QR entra una sola vez. Y si se cae la señal adentro del boliche, la puerta sigue
              validando y sincroniza cuando vuelve.
            </SectionTitle>
            <Reveal className="mt-16">
              <DoorScanner />
            </Reveal>
          </div>
        </section>

        {/* ---------------- Preguntas ---------------- */}
        <section id="preguntas" className="scroll-mt-4 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <SectionTitle eyebrow="Preguntas" title="Lo que nos suelen preguntar." />
            <dl className="mt-14 grid gap-x-16 md:grid-cols-2">
              {faqs.map(({ q, a }, i) => (
                <Reveal key={q} delay={(i % 2) * 120} className="border-t border-tinta/10 py-8">
                  <dt className="text-lg font-semibold tracking-tight">{q}</dt>
                  <dd className="mt-3 leading-relaxed text-tinta/60">{a}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------------- Cierre ---------------- */}
        <section className="bg-white px-6 pb-28">
          <Reveal>
            <a href={demoHref} className="asoma group mx-auto flex max-w-4xl drop-shadow-[0_30px_40px_rgba(0,0,0,0.18)]">
              <div className="ticket-izq flex-1 rounded-l-3xl bg-palco-900 p-8 text-white sm:p-12">
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Demo personalizada</p>
                <p className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                  Veamos Nightowl con tu próxima fiesta.
                </p>
                <p className="mt-5 max-w-md text-white/55">
                  Contanos cómo vendés hoy y te armamos una demo con tu marca, tus lotes y tu web.
                </p>
              </div>
              <div className="ticket-der talon relative flex w-32 flex-col items-center justify-center gap-3 rounded-r-3xl bg-palco-200 p-4 text-black sm:w-48">
                <span className="troquel absolute inset-y-6 left-0 w-0.5 text-black/30" />
                <OwlPeek
                  className="bottom-0 right-0 h-40 w-[116px] bg-tinta/15"
                  from="translate(100%, 100%) rotate(25deg)"
                  to="translate(30%, 34%) rotate(-20deg)"
                />
                <span className="relative z-10 text-center text-lg font-semibold sm:text-xl">Pedir demo</span>
                <ArrowRight className="relative z-10 h-6 w-6 transition group-hover:translate-x-1" />
              </div>
            </a>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-tinta/10 bg-papel">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 py-10 text-sm text-tinta/50 sm:flex-row">
          <Logo className="h-6" color="var(--color-tinta)" />
          <div className="text-center sm:text-right">
            <a href={contactHref} className="transition hover:text-tinta">
              {site.contactEmail}
            </a>
            <p className="text-xs">
              © <CurrentYear /> {site.name}
            </p>
            {/* Temporal: sacar el día del lanzamiento */}
            <PalcoMemorial />
          </div>
        </div>
      </footer>

      <DemoDialog />
      <AudienceGate />
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  children,
  dark,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  dark?: boolean;
}) {
  return (
    <Reveal className="grid gap-6 md:grid-cols-2 md:items-end">
      <div>
        <p className={`text-sm uppercase tracking-[0.2em] ${dark ? "text-white/45" : "text-tinta/45"}`}>{eyebrow}</p>
        <h2 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">{title}</h2>
      </div>
      {children && (
        <p className={`max-w-md text-lg leading-relaxed ${dark ? "text-white/55" : "text-tinta/60"}`}>{children}</p>
      )}
    </Reveal>
  );
}

// Se calcula al generar el sitio (se actualiza con cada deploy).
async function CurrentYear() {
  "use cache";
  return new Date().getFullYear();
}
