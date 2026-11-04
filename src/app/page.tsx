import Image from "next/image";
import {
  ArrowRight,
  Armchair,
  BarChart3,
  CreditCard,
  Palette,
  QrCode,
  Theater,
  Music,
  Users,
  WifiOff,
} from "lucide-react";
import { SeatMap } from "@/components/seat-map";
import { contactHref, site } from "@/lib/site";

const features = [
  {
    icon: Palette,
    title: "Tu marca, no la nuestra",
    text: "Tu logo, tus colores y tu dominio. El público compra en tu sitio y recibe las entradas a tu nombre.",
  },
  {
    icon: Armchair,
    title: "Butacas numeradas o general",
    text: "Armá el plano de tu sala con plateas, pullman y palcos, o vendé por sector con capacidad general.",
  },
  {
    icon: CreditCard,
    title: "Cobro con Mercado Pago",
    text: "El dinero entra directo a tu cuenta. Sin intermediarios reteniendo tu recaudación.",
  },
  {
    icon: QrCode,
    title: "Entradas con QR",
    text: "Cada entrada tiene un código único que se valida una sola vez. Adiós a las entradas duplicadas.",
  },
  {
    icon: WifiOff,
    title: "Control de acceso sin señal",
    text: "La app de puerta sigue validando aunque se caiga internet en la sala, y sincroniza al volver.",
  },
  {
    icon: BarChart3,
    title: "Ventas en tiempo real",
    text: "Ocupación por función, recaudación y asistencia, en un panel claro para vos y tu equipo.",
  },
];

const audiences = [
  {
    icon: Theater,
    title: "Teatros y salas",
    text: "Temporadas con muchas funciones, planos de butacas y abonos.",
  },
  {
    icon: Users,
    title: "Productoras",
    text: "Varias salas y giras, con un mismo panel y equipos con distintos permisos.",
  },
  {
    icon: Music,
    title: "Boliches y fiestas",
    text: "Lotes de preventa, listas y control rápido en la puerta.",
  },
];

const steps = [
  {
    title: "Configuramos tu sala",
    text: "Cargamos tu plano, sectores y precios, y aplicamos tu identidad visual.",
  },
  {
    title: "Publicás tus funciones",
    text: "Creás fechas y lotes desde el panel y compartís el link de venta.",
  },
  {
    title: "Vendés y controlás",
    text: "El público compra, recibe su QR y tu equipo lo valida en la entrada.",
  },
];

const faqs = [
  {
    q: "¿Palco es una ticketera?",
    a: "No vendemos entradas a nuestro nombre. Palco es la tecnología: vos vendés con tu marca y mantenés la relación con tu público.",
  },
  {
    q: "¿Quién cobra el dinero de las entradas?",
    a: "Vos. Los pagos se procesan con tu propia cuenta de Mercado Pago y el dinero se acredita ahí.",
  },
  {
    q: "¿Sirve para salas chicas?",
    a: "Sí. Palco está pensado para teatros, salas independientes y productoras, desde unas decenas hasta miles de localidades.",
  },
  {
    q: "¿Cómo empiezo?",
    a: "Escribinos y coordinamos una demo. Te mostramos la plataforma con el plano de tu sala.",
  },
];

export default function Home() {
  return (
    <>
      <header className="absolute inset-x-0 top-0 z-20">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="#" aria-label="Palco, inicio">
            <Image
              src="/logo-palco.png"
              alt="Palco"
              width={906}
              height={264}
              priority
              className="h-8 w-auto"
            />
          </a>
          <div className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <a href="#funciones" className="transition hover:text-white">
              Funciones
            </a>
            <a href="#como-funciona" className="transition hover:text-white">
              Cómo funciona
            </a>
            <a href="#preguntas" className="transition hover:text-white">
              Preguntas
            </a>
          </div>
          <a
            href={contactHref}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-palco-900 transition hover:bg-crema"
          >
            Pedir demo
          </a>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-palco-800 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(217,178,111,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.35),transparent_60%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-36 lg:grid-cols-[1.1fr_1fr] lg:pb-32 lg:pt-44">
            <div>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-dorado" />
                Para teatros, salas y productoras
              </p>
              <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Vendé tus entradas con tu propia marca.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
                Palco es la plataforma de venta de entradas y control de acceso
                para que tu público compre en tu sitio, elija su butaca y entre
                con un QR. Sin ticketeras de por medio.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a
                  href={contactHref}
                  className="group inline-flex items-center gap-2 rounded-full bg-dorado px-6 py-3 font-medium text-palco-950 transition hover:brightness-110"
                >
                  Pedir una demo
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </a>
                <a
                  href="#funciones"
                  className="inline-flex items-center rounded-full border border-white/20 px-6 py-3 font-medium text-white transition hover:bg-white/10"
                >
                  Ver funciones
                </a>
              </div>
            </div>
            <SeatMap />
          </div>
        </section>

        {/* Para quién */}
        <section className="border-b border-palco-100 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-3">
            {audiences.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-palco-50 text-palco-700">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-palco-950/60">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Funciones */}
        <section id="funciones" className="scroll-mt-10">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-palco-600">
                Funciones
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Todo lo que necesitás para llenar la sala.
              </h2>
              <p className="mt-4 text-lg text-palco-950/60">
                Desde que publicás la función hasta que el último espectador
                cruza la puerta.
              </p>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-palco-100 bg-palco-100 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, text }) => (
                <div key={title} className="bg-white p-8">
                  <Icon className="h-6 w-6 text-palco-700" />
                  <h3 className="mt-5 font-display text-lg font-semibold">
                    {title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-palco-950/60">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="scroll-mt-10 bg-palco-900 text-white">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <p className="text-sm font-semibold uppercase tracking-widest text-dorado">
              Cómo funciona
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              De la cartelera a la puerta, en tres pasos.
            </h2>
            <ol className="mt-14 grid gap-6 md:grid-cols-3">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-8"
                >
                  <span className="font-display text-4xl font-semibold text-dorado">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-6 font-display text-xl font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-white/65">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Preguntas */}
        <section id="preguntas" className="scroll-mt-10">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-palco-600">
                Preguntas frecuentes
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Lo que nos suelen preguntar.
              </h2>
            </div>
            <div className="divide-y divide-palco-100 border-y border-palco-100">
              {faqs.map(({ q, a }) => (
                <details key={q} className="group py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-lg font-medium">
                    {q}
                    <span className="text-2xl leading-none text-palco-500 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-palco-950/65">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="px-6 pb-24">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-palco-800 px-8 py-16 text-center text-white sm:px-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(217,178,111,0.22),transparent_60%)]" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Que la próxima función se venda con tu nombre.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/70">
                Contanos sobre tu sala y te mostramos cómo se vería Palco con tu
                marca.
              </p>
              <a
                href={contactHref}
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-dorado px-7 py-3.5 font-medium text-palco-950 transition hover:brightness-110"
              >
                Pedir una demo
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-palco-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-palco-950/50 sm:flex-row">
          <p>© <CurrentYear /> {site.name}. Venta de entradas con tu marca.</p>
          <a href={contactHref} className="transition hover:text-palco-800">
            {site.contactEmail}
          </a>
        </div>
      </footer>
    </>
  );
}

// Se calcula al generar el sitio (se actualiza con cada deploy).
async function CurrentYear() {
  "use cache";
  return new Date().getFullYear();
}
