import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { SeatMap } from "@/components/seat-map";
import { BrandTicket } from "@/components/brand-ticket";
import { CheckoutFlow } from "@/components/checkout-flow";
import { DoorScanner } from "@/components/door-scanner";
import { RotatingChip } from "@/components/rotating-chip";
import { SiteBuilder } from "@/components/site-builder";
import { Reveal } from "@/components/reveal";
import { Logo } from "@/components/logo";
import { DemoDialog } from "@/components/demo-dialog";
import { contactHref, demoHref, site } from "@/lib/site";

const nav = [
  { label: "Editor", href: "#editor" },
  { label: "Marca propia", href: "#marca" },
  { label: "Venta", href: "#venta" },
  { label: "Acceso", href: "#acceso" },
  { label: "Preguntas", href: "#preguntas" },
];

const cinta = [
  "Platea",
  "Pullman",
  "Palcos",
  "Campo general",
  "Preventas",
  "Entradas con QR",
  "Mercado Pago",
  "Control de acceso",
  "Tu marca",
];

const faqs = [
  {
    q: "¿Palco es una ticketera?",
    a: "No. No vendemos entradas a nuestro nombre: ponemos la tecnología para que vos vendas con tu marca y te quedes con la relación con tu público.",
  },
  {
    q: "¿Quién cobra?",
    a: "Vos. Los pagos se procesan con tu propia cuenta de Mercado Pago y el dinero se acredita ahí.",
  },
  {
    q: "¿Sirve para una sala chica?",
    a: "Sí. Está pensado para teatros, salas independientes, productoras y boliches, desde unas decenas hasta miles de localidades.",
  },
  {
    q: "¿Y si mi sala tiene un plano raro?",
    a: "Mejor. Cargamos tu plano tal cual es: plateas, pullman, palcos, pasillos, ubicaciones sin visión o campo general.",
  },
];

export default function Home() {
  return (
    <>
      <main className="flex-1">
        {/* ---------------- Hero ---------------- */}
        <section className="relative overflow-hidden bg-palco-900 text-white">
          <div className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-palco-600/30 blur-3xl" />

          <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 pt-8">
            <a href="#" aria-label="Palco, inicio">
              <Logo className="h-7 sm:h-8" />
            </a>
            <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
              {nav.map((n) => (
                <a key={n.href} href={n.href} className="transition hover:text-white">
                  {n.label}
                </a>
              ))}
            </nav>
            <a
              href={demoHref}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-palco-900 transition hover:bg-dorado"
            >
              Pedir demo
            </a>
          </header>

          <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
            <h1 className="subir text-[clamp(2.1rem,5vw,4rem)] font-semibold leading-[1.12] tracking-tight">
              Tu público elige <RotatingChip />, paga en tu sitio y entra con un
              QR.
            </h1>

            <div
              className="subir mt-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
              style={{ animationDelay: "0.15s" }}
            >
              <p className="max-w-xl text-lg leading-relaxed text-white/65">
                Palco es la plataforma de venta de entradas con marca propia
                para teatros, salas y productoras. El dinero va directo a tu
                Mercado Pago.
              </p>
              <a
                href={demoHref}
                className="group inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-dorado px-6 py-3 font-medium text-palco-950 transition hover:bg-white md:self-auto"
              >
                Pedir una demo
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </a>
            </div>

            <div className="subir mt-14" style={{ animationDelay: "0.3s" }}>
              <SeatMap />
            </div>
          </div>
        </section>

        {/* ---------------- Cinta ---------------- */}
        <div className="overflow-hidden border-y border-palco-950 bg-palco-800 py-3.5 text-dorado">
          <div className="cinta flex w-max">
            {[0, 1].map((dup) => (
              <div key={dup} aria-hidden={dup === 1} className="flex shrink-0 items-center">
                {cinta.map((w) => (
                  <span key={w} className="flex items-center text-lg font-medium">
                    <span className="px-7">{w}</span>
                    <span className="text-xs text-dorado/40">●</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ---------------- Editor ---------------- */}
        <section id="editor" className="papel scroll-mt-4">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <SectionTitle eyebrow="Editor" title="Tu web de venta, armada por vos.">
              Elegí uno de los tres diseños y ponele tus colores, tu
              tipografía y tu logo. Dibujá el plano con tu campo, tribunas o
              plateas, cargá los precios y publicá. Sin programadores.
            </SectionTitle>
            <Reveal className="mt-16">
              <SiteBuilder />
            </Reveal>
          </div>
        </section>

        {/* ---------------- Marca propia ---------------- */}
        <section id="marca" className="scroll-mt-4 border-t border-tinta/10 papel">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <SectionTitle eyebrow="Marca propia" title="Tu marca en cada entrada.">
              El público compra en tu sitio, con tus colores y tu logo. La entrada
              que recibe es tuya, no de una ticketera.
            </SectionTitle>
            <Reveal className="mt-16">
              <BrandTicket />
            </Reveal>
          </div>
        </section>

        {/* ---------------- Venta ---------------- */}
        <section id="venta" className="scroll-mt-4 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <SectionTitle eyebrow="Venta" title="Comprar lleva un minuto.">
              Tres pasos para tu público, sin salir de tu marca. El dinero va
              directo a tu cuenta de Mercado Pago.
            </SectionTitle>
            <Reveal className="mt-16">
              <CheckoutFlow />
            </Reveal>
          </div>
        </section>

        {/* ---------------- Acceso ---------------- */}
        <section id="acceso" className="scroll-mt-4 bg-tinta text-white">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <SectionTitle eyebrow="Control de acceso" title="Cada QR entra una sola vez." dark>
              Y si se corta internet en la sala, la puerta sigue funcionando: el
              teléfono valida solo y sincroniza cuando vuelve la señal.
            </SectionTitle>
            <Reveal className="mt-16">
              <DoorScanner />
            </Reveal>
          </div>
        </section>

        {/* ---------------- Preguntas ---------------- */}
        <section id="preguntas" className="papel scroll-mt-4">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <SectionTitle eyebrow="Preguntas" title="Lo que nos suelen preguntar." />
            <dl className="mt-14 grid gap-x-16 md:grid-cols-2">
              {faqs.map(({ q, a }, i) => (
                <Reveal key={q} delay={(i % 2) * 120} className="border-t border-tinta/15 py-8">
                  <dt className="text-xl font-semibold tracking-tight">{q}</dt>
                  <dd className="mt-3 leading-relaxed text-tinta/70">{a}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------------- Cierre: entrada para la demo ---------------- */}
        <section className="papel px-6 pb-28">
          <Reveal>
            <a
              href={demoHref}
              className="group mx-auto flex max-w-4xl drop-shadow-[0_30px_40px_rgba(31,3,10,0.3)]"
            >
              <div className="ticket-izq flex-1 rounded-l-3xl bg-palco-800 p-8 text-white sm:p-12">
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                  Demo personalizada
                </p>
                <p className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                  Veamos Palco con el plano de <span className="text-dorado">tu sala.</span>
                </p>
                <p className="mt-5 max-w-md text-white/65">
                  Escribinos, contanos cómo es tu sala y te armamos una demo con
                  tu marca.
                </p>
              </div>
              <div className="ticket-der talon relative flex w-32 flex-col items-center justify-center gap-3 rounded-r-3xl bg-dorado p-4 text-palco-950 sm:w-48">
                <span className="troquel absolute inset-y-6 left-0 w-0.5 text-palco-950/40" />
                <span className="text-center text-lg font-semibold sm:text-xl">Pedir demo</span>
                <ArrowRight className="h-6 w-6 transition group-hover:translate-x-1" />
              </div>
            </a>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-tinta/10 bg-papel">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 py-10 text-sm text-tinta/55 sm:flex-row">
          <Logo className="h-6" color="var(--color-palco-800)" />
          <div className="text-center sm:text-right">
            <a href={contactHref} className="transition hover:text-palco-800">
              {site.contactEmail}
            </a>
            <p className="text-xs">
              © <CurrentYear /> {site.name}
            </p>
          </div>
        </div>
      </footer>

      <DemoDialog />
    </>
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
        <p
          className={`text-sm font-semibold uppercase tracking-widest ${dark ? "text-dorado" : "text-palco-600"}`}
        >
          {eyebrow}
        </p>
        <h2 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          {title}
        </h2>
      </div>
      {children && (
        <p className={`max-w-md text-lg leading-relaxed ${dark ? "text-white/65" : "text-tinta/70"}`}>
          {children}
        </p>
      )}
    </Reveal>
  );
}

// Se calcula al generar el sitio (se actualiza con cada deploy).
async function CurrentYear() {
  "use cache";
  return new Date().getFullYear();
}
