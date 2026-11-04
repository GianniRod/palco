import type { ReactNode } from "react";
import { ArrowRight, ArrowDown } from "lucide-react";
import { SeatMap } from "@/components/seat-map";
import { BrandTicket } from "@/components/brand-ticket";
import { CheckoutFlow } from "@/components/checkout-flow";
import { DoorScanner } from "@/components/door-scanner";
import { Reveal } from "@/components/reveal";
import { Logo } from "@/components/logo";
import { contactHref, site } from "@/lib/site";

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

const programa = [
  { acto: "Acto I", titulo: "La marca", href: "#marca" },
  { acto: "Acto II", titulo: "La venta", href: "#venta" },
  { acto: "Acto III", titulo: "La puerta", href: "#puerta" },
  { acto: "Entreacto", titulo: "Preguntas", href: "#preguntas" },
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
          <div className="foco pointer-events-none absolute inset-x-0 top-0 h-[70%]" />
          <div className="bambalina pointer-events-none absolute inset-x-0 top-0 z-30 h-6" />

          <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 pt-10">
            <a href="#" aria-label="Palco, inicio">
              <Logo className="h-7 sm:h-8" />
            </a>
            <nav className="hidden items-center gap-7 text-sm md:flex">
              {programa.slice(0, 3).map((p) => (
                <a key={p.href} href={p.href} className="group text-white/60 transition hover:text-white">
                  <span className="mr-1.5 font-serif italic text-dorado/80">{p.acto}</span>
                  {p.titulo}
                </a>
              ))}
            </nav>
            <a
              href={contactHref}
              className="rounded-full border border-white/30 px-4 py-2 text-sm transition hover:border-dorado hover:text-dorado"
            >
              Pedir demo
            </a>
          </header>

          <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-20 sm:pt-28">
            <h1 className="font-serif text-[clamp(3rem,9vw,7.5rem)] leading-[0.92] tracking-tight">
              <span className="subir block" style={{ animationDelay: "1.4s" }}>
                La sala es tuya.
              </span>
              <span className="subir block italic text-dorado" style={{ animationDelay: "1.65s" }}>
                Las entradas, también.
              </span>
            </h1>

            <div className="subir mt-10 grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-end" style={{ animationDelay: "1.9s" }}>
              <p className="max-w-xl text-lg leading-relaxed text-white/70">
                Palco es la plataforma para que teatros, salas y productoras
                vendan entradas con su propia marca: butacas numeradas, cobro
                con Mercado Pago y control de acceso con QR.
              </p>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <a
                  href={contactHref}
                  className="group inline-flex items-center gap-2 rounded-full bg-dorado px-6 py-3 font-medium text-palco-950 transition hover:bg-white"
                >
                  Pedir una demo
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </a>
                <a
                  href="#programa"
                  className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-white/70 transition hover:text-white"
                >
                  Ver el programa <ArrowDown className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="subir mx-auto mt-20 max-w-3xl" style={{ animationDelay: "2.2s" }}>
              <SeatMap />
            </div>
          </div>

          {/* Telón: se abre al cargar */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 flex">
            <div className="telon telon-izq h-full w-1/2 origin-left" />
            <div className="telon telon-der h-full w-1/2 origin-right" />
          </div>
        </section>

        {/* ---------------- Cinta ---------------- */}
        <div className="overflow-hidden border-y border-palco-950 bg-palco-800 py-4 text-dorado">
          <div className="cinta flex w-max">
            {[0, 1].map((dup) => (
              <div key={dup} aria-hidden={dup === 1} className="flex shrink-0 items-center">
                {cinta.map((w) => (
                  <span key={w} className="flex items-center font-serif text-2xl italic">
                    <span className="px-8">{w}</span>
                    <span className="text-sm not-italic text-dorado/50">✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ---------------- Programa ---------------- */}
        <section id="programa" className="papel scroll-mt-4">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-2">
            <Reveal>
              <p className="font-serif text-lg italic text-palco-600">Programa de mano</p>
              <h2 className="mt-3 font-serif text-5xl leading-[1.02] sm:text-6xl">
                Una plataforma,
                <br />
                <em className="text-palco-700">tres actos.</em>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-tinta/70">
                Desde que publicás la función hasta que el último espectador
                cruza la puerta, todo pasa con tu nombre.
              </p>
            </Reveal>
            <ol className="self-end">
              {programa.map((p, i) => (
                <Reveal as="li" key={p.href} delay={i * 120}>
                  <a href={p.href} className="group flex items-baseline gap-3 border-b border-tinta/15 py-5">
                    <span className="w-28 shrink-0 font-serif italic text-palco-600">{p.acto}</span>
                    <span className="font-serif text-3xl transition group-hover:translate-x-1 group-hover:text-palco-700">
                      {p.titulo}
                    </span>
                    <span className="mx-2 flex-1 border-b border-dotted border-tinta/30" />
                    <ArrowRight className="h-4 w-4 self-center text-tinta/40 transition group-hover:text-palco-700" />
                  </a>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------- Acto I: La marca ---------------- */}
        <section id="marca" className="papel scroll-mt-4 border-t border-tinta/10">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <ActTitle acto="Acto I" titulo="La marca">
              El público compra en tu sitio, con tus colores y tu logo. La entrada
              que recibe es tuya, no de una ticketera.
            </ActTitle>
            <Reveal className="mt-16">
              <BrandTicket />
            </Reveal>
          </div>
        </section>

        {/* ---------------- Acto II: La venta ---------------- */}
        <section id="venta" className="scroll-mt-4 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <ActTitle acto="Acto II" titulo="La venta">
              Tres pasos para tu público. Sin crear cuentas raras, sin salir de
              tu marca. El dinero va directo a tu Mercado Pago.
            </ActTitle>
            <Reveal className="mt-16">
              <CheckoutFlow />
            </Reveal>
          </div>
        </section>

        {/* ---------------- Acto III: La puerta ---------------- */}
        <section id="puerta" className="scroll-mt-4 bg-tinta text-white">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <ActTitle acto="Acto III" titulo="La puerta" dark>
              Cada QR entra una sola vez. Y si se corta internet en la sala, la
              puerta sigue funcionando: el teléfono valida solo y sincroniza al
              volver la señal.
            </ActTitle>
            <Reveal className="mt-16">
              <DoorScanner />
            </Reveal>
          </div>
        </section>

        {/* ---------------- Entreacto ---------------- */}
        <section id="preguntas" className="papel scroll-mt-4">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <ActTitle acto="Entreacto" titulo="Preguntas" />
            <dl className="mt-14 grid gap-x-16 md:grid-cols-2">
              {faqs.map(({ q, a }, i) => (
                <Reveal key={q} delay={(i % 2) * 120} className="border-t border-tinta/15 py-8">
                  <dt className="font-serif text-2xl italic">{q}</dt>
                  <dd className="mt-3 leading-relaxed text-tinta/70">{a}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------------- Final: entrada para la demo ---------------- */}
        <section className="papel px-6 pb-28">
          <Reveal>
            <a
              href={contactHref}
              className="group mx-auto flex max-w-4xl drop-shadow-[0_30px_40px_rgba(31,3,10,0.3)]"
            >
              <div className="ticket-izq flex-1 rounded-l-3xl bg-palco-800 p-8 text-white sm:p-12">
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                  Admite una sala · Función privada
                </p>
                <p className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">
                  Veamos Palco
                  <br />
                  <em className="text-dorado">con el plano de tu sala.</em>
                </p>
                <p className="mt-5 max-w-md text-white/65">
                  Escribinos, contanos cómo es tu sala y te armamos una demo con
                  tu marca.
                </p>
              </div>
              <div className="ticket-der talon relative flex w-32 flex-col items-center justify-center gap-3 rounded-r-3xl bg-dorado p-4 text-palco-950 sm:w-48">
                <span className="troquel absolute inset-y-6 left-0 w-0.5 text-palco-950/40" />
                <span className="font-serif text-lg italic sm:text-2xl">Pedir demo</span>
                <ArrowRight className="h-6 w-6 transition group-hover:translate-x-1" />
              </div>
            </a>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-tinta/10 bg-papel">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 py-10 text-sm text-tinta/55 sm:flex-row">
          <Logo className="h-6" color="var(--color-palco-800)" />
          <p className="font-serif italic">Fin del programa. Gracias por venir.</p>
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
    </>
  );
}

function ActTitle({
  acto,
  titulo,
  children,
  dark,
}: {
  acto: string;
  titulo: string;
  children?: ReactNode;
  dark?: boolean;
}) {
  return (
    <Reveal className="grid gap-6 md:grid-cols-[1fr_1fr] md:items-end">
      <div>
        <p className={`font-serif text-lg italic ${dark ? "text-dorado" : "text-palco-600"}`}>
          {acto}
        </p>
        <h2 className="mt-1 font-serif text-6xl leading-none sm:text-7xl">{titulo}</h2>
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
