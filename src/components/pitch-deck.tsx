"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Check,
  Clock,
  Globe,
  Maximize2,
  Palette,
  Percent,
  QrCode,
  Scale,
  ShieldCheck,
  Ticket,
  Users,
  Wallet,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { FakeQr } from "@/components/qr";
import { site } from "@/lib/site";

/* ------------------------------------------------------------------ */
/* Piezas visuales                                                     */
/* ------------------------------------------------------------------ */

/** Aparece con un pequeño retraso (se reinicia en cada diapositiva porque se remonta). */
function In({ d = 0, className = "", children }: { d?: number; className?: string; children: ReactNode }) {
  return (
    <div className={`subir ${className}`} style={{ animationDelay: `${d}s` } as CSSProperties}>
      {children}
    </div>
  );
}

function Eyebrow({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <p className={`text-xs uppercase tracking-[0.3em] sm:text-sm ${dark ? "text-white/45" : "text-black/40"}`}>
      {children}
    </p>
  );
}

function H({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`text-[clamp(2rem,4.6vw,4.2rem)] font-semibold leading-[1.05] tracking-tight ${className}`}>
      {children}
    </h2>
  );
}

/** Número que cuenta desde 0 hasta `to` al aparecer. */
function CountUp({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  ms = 1400,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  ms?: number;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    // Con movimiento reducido, el número aparece directo
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now() - (instant ? ms : 0);
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return (
    <span className="tabular-nums">
      {prefix}
      {v.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/** Barra horizontal que crece hasta `pct`. */
function Bar({ pct, className, delay = 0 }: { pct: number; className: string; delay?: number }) {
  return (
    <div className="h-full w-full overflow-hidden rounded-full">
      <div
        className={`h-full origin-left rounded-full ${className}`}
        style={{ width: `${pct}%`, animation: `crecer 1.2s cubic-bezier(0.2,0.7,0.2,1) ${delay}s both` }}
      />
    </div>
  );
}

/** Navegador de mentira con la URL del cliente. */
function BrowserMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black shadow-[0_40px_80px_-30px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-2 border-b border-black/10 bg-[#fafafa] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
        <span className="ml-3 flex-1 rounded-md bg-black/5 px-3 py-1 text-center text-xs text-black/60">
          🔒 tuboliche.com<b className="text-black">/tickets</b>
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black uppercase tracking-tight">Tu Boliche</span>
          <span className="text-black/45">Eventos · Contacto</span>
        </div>
        <div
          className="mt-4 rounded-xl px-5 py-6 text-center text-white"
          style={{
            background:
              "linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55)), radial-gradient(circle at 22% 28%, rgba(255,255,255,0.75), transparent 30%), radial-gradient(circle at 78% 62%, rgba(190,190,200,0.55), transparent 38%), linear-gradient(135deg, #0b0b0d, #3f3f46)",
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/70">Sáb 19 de septiembre · 00:30</p>
          <p className="mt-1 text-2xl font-black uppercase tracking-tight">Fiesta Aniversario</p>
          <span className="mt-3 inline-block rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black">
            Comprar entradas
          </span>
        </div>
        <div className="mt-4 space-y-1.5 text-xs">
          {[
            ["Preventa 2", "$ 11.000"],
            ["General", "$ 15.000"],
            ["Mesa para 6", "$ 180.000"],
          ].map(([a, b]) => (
            <div key={a} className="flex justify-between border-b border-black/10 pb-1.5">
              <span>{a}</span>
              <span className="tabular-nums">{b}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-[10px] text-black/35">Venta de entradas con tecnología de Nightowl</p>
      </div>
    </div>
  );
}

/** Celular de mentira con la app de entradas para el público. */
function PhoneMock() {
  const tickets = [
    { e: "Fiesta Aniversario", v: "Tu Boliche", d: "Sáb 19 sep · 00:30", tr: true },
    { e: "Función de gala", v: "Tu Teatro", d: "Sáb 14 mar · 21:00", tr: false },
    { e: "Jueves universitario", v: "Otro Boliche", d: "Jue 24 sep · 01:00", tr: true },
  ];
  return (
    <div className="w-[270px] rounded-[2.4rem] bg-black p-2.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)]">
      <div className="overflow-hidden rounded-[1.9rem] bg-[#fafafa] text-black">
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <Logo className="h-4" color="#09090b" />
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-[11px] font-semibold text-white">
            M
          </span>
        </div>
        <p className="px-5 text-lg font-semibold tracking-tight">Mis entradas</p>

        {/* Entrada abierta */}
        <div className="mx-4 mt-3 rounded-2xl bg-black p-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">{tickets[0].v}</p>
              <p className="mt-0.5 font-semibold">{tickets[0].e}</p>
              <p className="text-[11px] text-white/55">{tickets[0].d}</p>
            </div>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-medium">Transferible</span>
          </div>
          <div className="mx-auto mt-3 w-28 rounded-lg bg-white p-2 text-black">
            <FakeQr seed={7} className="h-full w-full" />
          </div>
          <span className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-white py-2 text-xs font-semibold text-black">
            <ArrowLeftRight className="h-3.5 w-3.5" /> Transferir
          </span>
        </div>

        {/* Otras entradas */}
        <div className="space-y-2 px-4 pb-5 pt-3">
          {tickets.slice(1).map((t) => (
            <div key={t.e} className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold">{t.e}</p>
                <p className="text-[10px] text-black/45">
                  {t.v} · {t.d}
                </p>
              </div>
              <span
                className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-medium ${
                  t.tr ? "bg-black text-white" : "bg-black/5 text-black/45"
                }`}
              >
                {t.tr ? "Transferible" : "No transferible"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Diapositivas                                                        */
/* ------------------------------------------------------------------ */

type Slide = { dark?: boolean; render: () => ReactNode };

const ejemplo = { entradasNoche: 800, noches: 2, precio: 15000, comision: 0.08 };
const entradasMes = Math.round(ejemplo.entradasNoche * ejemplo.noches * (52 / 12));
const ventaMes = entradasMes * ejemplo.precio;
const nightowlMes = Math.round(ventaMes * ejemplo.comision);

// Presupuesto de salida a mercado (assets/NIGHTOWL_Presupuesto_Salida_a_Mercado.xlsx).
// Montos en pesos: mínimo, base y máximo. Dólar de referencia del Excel: $1.570.
const presupuesto = {
  dolar: 1570,
  // Referencia: lo que se lleva Nightowl (8%) por cada noche de un boliche. Sale de generales de
  // $8.000 a $14.000 según la tanda y VIP de $35.000 a $50.000 (parte del VIP se vende por RRPP).
  nightowlPorNoche: 819_000,
  get gmvPorEvento() {
    return this.nightowlPorNoche / 0.08;
  },
  eventosPorMes: 8,
  categorias: [
    { t: "Tecnología y seguridad", x: "Auditoría de código y seguridad (25 h de un ingeniero Sr.) e infraestructura del mes 1", min: 1_410_000, base: 1_996_250, max: 2_585_000 },
    { t: "Legal y societario", x: "SAS en CABA, marca en el INPI (clases 41 y 42) y contratos con boliches y público", min: 1_310_000, base: 1_550_000, max: 1_790_000 },
    { t: "Impositivo y contable", x: "Alta en ARCA y AGIP, libros y contabilidad del mes de lanzamiento", min: 270_000, base: 370_000, max: 470_000 },
    { t: "Comercial y operativo", x: "Compras reales de prueba en producción y movilidad para demos", min: 150_000, base: 225_750, max: 314_000 },
  ],
};
const total = (k: "min" | "base" | "max") => presupuesto.categorias.reduce((sum, c) => sum + c[k], 0);
const usd = (ars: number) => Math.round(ars / presupuesto.dolar);
const eventosParaRecuperar = (ars: number) => ars / ejemplo.comision / presupuesto.gmvPorEvento;
// Meses para recuperar la inversión con un solo boliche.
const meses = (ars: number) => {
  const m = Math.round((eventosParaRecuperar(ars) / presupuesto.eventosPorMes) * 10) / 10;
  if (m < 1) return "menos de 1 mes";
  return m === 1 ? "≈ 1 mes" : `≈ ${m.toLocaleString("es-AR")} meses`;
};
const pesos = (n: number) => `$ ${n.toLocaleString("es-AR")}`;
const millones = (n: number) => `$ ${(n / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;

const slides: Slide[] = [
  // 1. Portada
  {
    dark: true,
    render: () => (
      <div className="flex flex-col items-center text-center">
        <In>
          <Logo className="h-[clamp(3rem,9vw,7rem)]" color="#ffffff" />
        </In>
        <In d={0.25}>
          <p className="mt-10 max-w-3xl text-[clamp(1.4rem,3vw,2.4rem)] font-medium leading-tight text-white/85">
            Venta de entradas <span className="text-white">white label</span> para boliches y fiestas.
          </p>
        </In>
        <In d={0.45}>
          <p className="mt-5 text-white/45">Tu público compra en tu web. Nosotros ponemos la tecnología.</p>
        </In>
        <In d={0.7}>
          <p className="mt-16 text-xs uppercase tracking-[0.3em] text-white/30">Presentación para inversores · 2026</p>
        </In>
      </div>
    ),
  },

  // 2. Problema
  {
    render: () => (
      <div>
        <In>
          <Eyebrow>El problema</Eyebrow>
        </In>
        <In d={0.1}>
          <H className="mt-4 max-w-4xl">Los boliches venden con la marca de otro.</H>
        </In>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            {
              Icon: Percent,
              t: "Comisiones altas",
              x: "El cargo de servicio de las ticketeras ronda el 15% por entrada. Lo paga el público o se lo descuentan al boliche.",
            },
            {
              Icon: Users,
              t: "El público no es suyo",
              x: "La compra pasa en la web de la ticketera, con su marca. Los datos de los compradores quedan del otro lado.",
            },
            {
              Icon: Clock,
              t: "Sin control",
              x: "Diseño genérico, poca flexibilidad para lotes, mesas y RRPP, y depender de los tiempos de un tercero.",
            },
          ].map(({ Icon, t, x }, i) => (
            <In key={t} d={0.25 + i * 0.12}>
              <div className="h-full rounded-2xl border border-black/10 bg-white p-6">
                <Icon className="h-7 w-7" strokeWidth={1.6} />
                <p className="mt-5 text-xl font-semibold tracking-tight">{t}</p>
                <p className="mt-2 leading-relaxed text-black/55">{x}</p>
              </div>
            </In>
          ))}
        </div>
      </div>
    ),
  },

  // 3. Solución
  {
    dark: true,
    render: () => (
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <In>
            <Eyebrow dark>La solución</Eyebrow>
          </In>
          <In d={0.1}>
            <H className="mt-4">
              La venta queda en <span className="whitespace-nowrap">su web.</span>
            </H>
          </In>
          <In d={0.25}>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/60">
              Nightowl es la tecnología detrás: el boliche vende en <b className="text-white">tuboliche.com/tickets</b>,
              con su logo, sus colores y su público. Nosotros resolvemos la web, el cobro, las entradas y la puerta.
            </p>
          </In>
          <In d={0.4}>
            <ul className="mt-8 space-y-3 text-white/80">
              {["Marca 100% del cliente", "La plata entra directo en su cuenta", "Los datos del público son suyos"].map(
                (x) => (
                  <li key={x} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {x}
                  </li>
                ),
              )}
            </ul>
          </In>
        </div>
        <In d={0.3}>
          <BrowserMock />
        </In>
      </div>
    ),
  },

  // 4. Producto
  {
    render: () => (
      <div>
        <In>
          <Eyebrow>El producto</Eyebrow>
        </In>
        <In d={0.1}>
          <H className="mt-4">De la web a la puerta, en una plataforma.</H>
        </In>
        <div className="relative mt-14 grid gap-6 md:grid-cols-4">
          <span className="absolute left-0 right-0 top-7 hidden h-px bg-black/15 md:block" aria-hidden>
            <span className="block h-full origin-left bg-black" style={{ animation: "crecer 1.8s ease-out 0.4s both" }} />
          </span>
          {[
            {
              Icon: Palette,
              t: "Arma su web",
              x: "3 diseños con su logo y colores, o una web a medida hecha por nuestro equipo (costo adicional).",
            },
            { Icon: Ticket, t: "Vende", x: "Lotes de preventa que se abren solos y un link por cada RRPP." },
            { Icon: Wallet, t: "Cobra", x: "Tarjeta de crédito, débito o Mercado Pago, directo a su cuenta." },
            { Icon: QrCode, t: "Valida en la puerta", x: "QR de un solo uso. Funciona aunque se caiga la señal." },
          ].map(({ Icon, t, x }, i) => (
            <In key={t} d={0.35 + i * 0.18}>
              <div className="relative">
                <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
                  <Icon className="h-6 w-6" strokeWidth={1.7} />
                </span>
                <p className="mt-6 text-xs tabular-nums text-black/35">0{i + 1}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight">{t}</p>
                <p className="mt-2 leading-relaxed text-black/55">{x}</p>
              </div>
            </In>
          ))}
        </div>
        <In d={1.2}>
          <p className="mt-14 flex items-center gap-2 text-sm text-black/45">
            <WifiOff className="h-4 w-4" /> La app de puerta sigue validando sin internet y sincroniza cuando vuelve.
          </p>
        </In>
      </div>
    ),
  },

  // 5. Comparación de precio
  {
    dark: true,
    render: () => (
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <In>
            <Eyebrow dark>Diferencial</Eyebrow>
          </In>
          <In d={0.1}>
            <H className="mt-4">Más barato para el público.</H>
          </In>
          <In d={0.25}>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/60">
              Cobramos un <b className="text-white">8%</b> de cargo de servicio, contra un 15% de referencia en las
              ticketeras del mercado. Entrada de $15.000:
            </p>
          </In>
        </div>
        <div className="space-y-6">
          {[
            { n: "Nightowl", pay: 16200, pct: 0.08, ours: true },
            { n: "Passline", pay: 17250, pct: 0.15, logo: { src: "/presentacion/passline.png", ratio: "690 / 136" } },
            { n: "Passify", pay: 17250, pct: 0.15, logo: { src: "/presentacion/passify.png", ratio: "475 / 141" } },
          ].map((r, i) => (
            <In key={r.n} d={0.3 + i * 0.15}>
              <div className="flex items-baseline justify-between">
                {r.ours ? (
                  <Logo className="h-6" color="#ffffff" />
                ) : r.logo ? (
                  // Logo de la otra ticketera, en blanco para que combine con el resto
                  <span
                    role="img"
                    aria-label={r.n}
                    className="inline-block h-6 bg-white/70"
                    style={{
                      WebkitMask: `url(${r.logo.src}) left center / contain no-repeat`,
                      mask: `url(${r.logo.src}) left center / contain no-repeat`,
                      aspectRatio: r.logo.ratio,
                    }}
                  />
                ) : (
                  <span className="text-lg font-semibold text-white/70">{r.n}</span>
                )}
                <span className={`text-2xl font-semibold tabular-nums ${r.ours ? "text-white" : "text-white/60"}`}>
                  $ {r.pay.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="mt-2 h-3">
                <Bar pct={(r.pay / 17250) * 100} delay={0.4 + i * 0.15} className={r.ours ? "bg-white" : "bg-white/25"} />
              </div>
              <p className="mt-1.5 text-xs text-white/40">Cargo de servicio del {Math.round(r.pct * 100)}%</p>
            </In>
          ))}
          <In d={0.9}>
            <p className="text-xs leading-relaxed text-white/30">
              15% de referencia para Passline y Passify; puede variar según el acuerdo de cada productor.
            </p>
          </In>
        </div>
      </div>
    ),
  },

  // 6. Modelo de negocio
  {
    render: () => (
      <div>
        <In>
          <Eyebrow>Modelo de negocio</Eyebrow>
        </In>
        <In d={0.1}>
          <H className="mt-4 max-w-4xl">Ganamos un 8% por cada entrada vendida.</H>
        </In>
        <div className="mt-14 grid items-center gap-6 md:grid-cols-[1fr_auto_1.2fr]">
          <In d={0.3}>
            <div className="rounded-2xl border border-black/10 bg-white p-6 text-center">
              <p className="text-sm text-black/45">El público paga</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">$ 16.200</p>
              <p className="mt-1 text-xs text-black/40">Entrada $15.000 + cargo 8%</p>
            </div>
          </In>
          <In d={0.5}>
            <div className="flex flex-col items-center text-black/40">
              <span className="rounded-full border border-black/15 px-3 py-1 text-xs">Mercado Pago · split</span>
              <ArrowRight className="mt-2 hidden h-6 w-6 md:block" />
            </div>
          </In>
          <div className="space-y-3">
            <In d={0.7}>
              <div className="flex items-center justify-between rounded-2xl bg-black p-5 text-white">
                <span>Cuenta del boliche</span>
                <span className="text-2xl font-semibold tabular-nums">$ 15.000</span>
              </div>
            </In>
            <In d={0.85}>
              <div className="flex items-center justify-between rounded-2xl border border-black/15 bg-white p-5">
                <Logo className="h-5" color="#09090b" />
                <span className="text-2xl font-semibold tabular-nums">$ 1.200</span>
              </div>
            </In>
          </div>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Nunca tocamos la plata de las entradas: Mercado Pago la reparte en el momento.",
            "Sin costo fijo para el boliche: el cargo lo paga el público, o se reparte.",
            "Ingresos que crecen con cada boliche y cada noche, sin vender más horas de trabajo.",
            "Ingreso extra: desarrollo de webs a medida por nuestro equipo, con costo adicional.",
          ].map((x, i) => (
            <In key={x} d={1 + i * 0.12}>
              <p className="border-t border-black/15 pt-4 leading-relaxed text-black/60">{x}</p>
            </In>
          ))}
        </div>
      </div>
    ),
  },

  // 7. Números de un boliche (ejemplo)
  {
    dark: true,
    render: () => (
      <div>
        <In>
          <Eyebrow dark>Un boliche, en números</Eyebrow>
        </In>
        <In d={0.1}>
          <H className="mt-4 max-w-4xl">Cada cliente es un ingreso recurrente.</H>
        </In>
        <In d={0.25}>
          <p className="mt-5 text-white/50">
            Ejemplo: {ejemplo.entradasNoche} entradas por noche, {ejemplo.noches} noches por semana, entrada de $
            {ejemplo.precio.toLocaleString("es-AR")}.
          </p>
        </In>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            { l: "Entradas por mes", v: <CountUp to={entradasMes} prefix="≈ " /> },
            { l: "Venta del boliche por mes", v: <CountUp to={Math.round(ventaMes / 1e6)} prefix="≈ $ " suffix=" M" /> },
            {
              l: "Ingreso de Nightowl por mes",
              v: <CountUp to={Math.round(nightowlMes / 1e5) / 10} decimals={1} prefix="≈ $ " suffix=" M" />,
              hi: true,
            },
          ].map((c, i) => (
            <In key={c.l} d={0.35 + i * 0.15}>
              <div className={`rounded-2xl p-7 ${c.hi ? "bg-white text-black" : "border border-white/15"}`}>
                <p className={`text-sm ${c.hi ? "text-black/50" : "text-white/45"}`}>{c.l}</p>
                <p className="mt-3 text-[clamp(2rem,4vw,3.2rem)] font-semibold tracking-tight">{c.v}</p>
              </div>
            </In>
          ))}
        </div>
        <In d={1}>
          <p className="mt-10 text-lg text-white/70">
            Con 10 boliches así: <b className="text-white">≈ $ {Math.round((nightowlMes * 10) / 1e6)} M por mes.</b>
          </p>
          <p className="mt-2 text-xs text-white/30">Números ilustrativos para mostrar la mecánica, no proyecciones.</p>
        </In>
      </div>
    ),
  },

  // 8. Cómo llegamos al mercado
  {
    render: () => (
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <In>
            <Eyebrow>Salida al mercado</Eyebrow>
          </In>
          <In d={0.1}>
            <H className="mt-4">Venta directa, boliche por boliche.</H>
          </In>
          <In d={0.25}>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-black/55">
              Contactamos a los dueños cara a cara. En la noche todos se conocen: cada boliche que vende con
              Nightowl muestra la marca en su web y en cada entrada, y eso trae al siguiente.
            </p>
          </In>
        </div>
        <div className="space-y-3">
          {[
            { t: "Boliches de Buenos Aires", x: "Primer foco. Pilotos con condiciones especiales.", w: 100 },
            { t: "Teatros y salas", x: "Mismo producto con butacas numeradas: ya está diseñado.", w: 78 },
            { t: "Productoras y fiestas itinerantes", x: "Varios lugares y eventos por cuenta.", w: 60 },
            { t: "Otras ciudades de Argentina", x: "Con casos de éxito para mostrar.", w: 44 },
          ].map((s, i) => (
            <In key={s.t} d={0.3 + i * 0.15}>
              <div
                className="rounded-2xl bg-black p-5 text-white"
                style={{ width: `${s.w}%`, minWidth: "min(100%, 18rem)", opacity: 1 - i * 0.15 }}
              >
                <p className="text-xs tabular-nums text-white/40">Fase {i + 1}</p>
                <p className="mt-1 font-semibold">{s.t}</p>
                <p className="mt-1 text-sm text-white/55">{s.x}</p>
              </div>
            </In>
          ))}
        </div>
      </div>
    ),
  },

  // 9. Dónde estamos
  {
    dark: true,
    render: () => (
      <div>
        <In>
          <Eyebrow dark>Dónde estamos</Eyebrow>
        </In>
        <In d={0.1}>
          <H className="mt-4">Estamos en la etapa 2 de 5.</H>
        </In>
        <div className="relative mt-14">
          <span className="absolute left-0 right-0 top-[11px] hidden h-px bg-white/15 md:block" aria-hidden />
          <div className="grid gap-8 md:grid-cols-5">
            {[
              { t: "Hecho", x: "Web con demo del producto, formulario de demos y marca.", s: "done" },
              {
                t: "En curso",
                x: "Base del sistema y panel: salas, eventos, butacas, reservas sin sobreventa, login y roles.",
                s: "now",
              },
              { t: "Próximo", x: "Cobro con Mercado Pago, entradas con QR y app de puerta.", s: "next" },
              { t: "Próximo", x: "Auditoría profesional de los sistemas y primeros pilotos en boliches.", s: "next" },
              { t: "Después", x: "App de Nightowl para el público: todas sus entradas en un lugar.", s: "next" },
            ].map((m, i) => (
              <In key={m.x} d={0.3 + i * 0.18}>
                <div className="relative">
                  <span
                    className={`relative block h-[23px] w-[23px] rounded-full border-2 ${
                      m.s === "done"
                        ? "border-white bg-white"
                        : m.s === "now"
                          ? "border-white bg-black"
                          : "border-white/30 bg-black"
                    }`}
                  >
                    {m.s === "now" && <span className="absolute inset-1 animate-ping rounded-full bg-white/60" />}
                  </span>
                  <p className="mt-5 text-xs tabular-nums text-white/40">Etapa {i + 1}</p>
                  <p className={`mt-0.5 text-sm font-semibold ${m.s === "next" ? "text-white/45" : "text-white"}`}>
                    {m.t}
                  </p>
                  <p className="mt-2 leading-relaxed text-white/55">{m.x}</p>
                </div>
              </In>
            ))}
          </div>
        </div>
        <In d={1.1}>
          <p className="mt-14 flex items-center gap-2 text-white/45">
            <Globe className="h-4 w-4 shrink-0" /> En {site.url.replace("https://", "")} hay una demo animada del producto, de referencia: el producto final puede variar.
          </p>
        </In>
      </div>
    ),
  },

  // 10. Lo que viene: la app para el público
  {
    render: () => (
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <In>
            <Eyebrow>Lo que viene · Etapa 5</Eyebrow>
          </In>
          <In d={0.1}>
            <H className="mt-4">Una app con todas sus entradas.</H>
          </In>
          <In d={0.25}>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-black/55">
              El público inicia sesión con su cuenta y tiene a mano los QR de todos los eventos que usan
              tecnología Nightowl, de cualquier boliche o teatro.
            </p>
          </In>
          <div className="mt-8 space-y-3">
            {[
              { Icon: QrCode, t: "Todas las entradas juntas", x: "Sin buscar mails: cada QR queda en su cuenta." },
              {
                Icon: ArrowLeftRight,
                t: "Transferencias",
                x: "Pasar una entrada a un amigo, si el organizador del evento lo permite.",
              },
              { Icon: Users, t: "Un público que vuelve", x: "La app conecta a la gente con los próximos eventos de la red." },
            ].map(({ Icon, t, x }, i) => (
              <In key={t} d={0.4 + i * 0.12}>
                <div className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                    <Icon className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm leading-relaxed text-black/55">{x}</p>
                  </div>
                </div>
              </In>
            ))}
          </div>
        </div>
        <In d={0.3} className="flex justify-center">
          <PhoneMock />
        </In>
      </div>
    ),
  },

  // 11. Equipo
  {
    render: () => (
      <div>
        <In>
          <Eyebrow>Equipo</Eyebrow>
        </In>
        <In d={0.1}>
          <H className="mt-4">Dos fundadores, negocio y tecnología.</H>
        </In>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {[
            { n: "Gianni", r: "Cofundador · Producto y ventas", x: "Arma el producto y la web, y sale a vender a los boliches." },
            { n: "Lorenzo", r: "Cofundador · Tecnología", x: "Construye la plataforma: base de datos, panel y pagos." },
          ].map((p, i) => (
            <In key={p.n} d={0.3 + i * 0.15}>
              <div className="flex items-center gap-6 rounded-2xl border border-black/10 bg-white p-7">
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-black text-3xl font-semibold text-white">
                  {p.n[0]}
                </span>
                <div>
                  <p className="text-2xl font-semibold tracking-tight">{p.n}</p>
                  <p className="text-sm text-black/45">{p.r}</p>
                  <p className="mt-2 leading-relaxed text-black/60">{p.x}</p>
                </div>
              </div>
            </In>
          ))}
        </div>
      </div>
    ),
  },

  // 12. Qué buscamos
  {
    dark: true,
    render: () => (
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <In>
            <Eyebrow dark>Qué buscamos</Eyebrow>
          </In>
          <In d={0.1}>
            <H className="mt-4">Capital para salir al mercado.</H>
          </In>
          <In d={0.25}>
            <p className="mt-6 text-[clamp(2.4rem,5vw,4rem)] font-semibold tracking-tight">
              USD <CountUp to={usd(total("base"))} />
            </p>
            <p className="mt-1 text-white/55">
              ≈ {millones(total("base"))} · escenario base para salir a mercado
            </p>
          </In>
        </div>
        <div className="space-y-3">
          {[
            { Icon: Ticket, t: "Terminar el producto", x: "Cobro con Mercado Pago, entradas con QR y app de puerta." },
            {
              Icon: ShieldCheck,
              t: "Auditoría profesional",
              x: "Un ingeniero especializado revisa seguridad, pagos y control de acceso para asegurar que los sistemas funcionen antes de salir al mercado.",
            },
            { Icon: Users, t: "Pilotos y ventas", x: "Salir a vender y acompañar a los primeros boliches." },
            { Icon: Scale, t: "Marca y legal", x: "Registro de marca, sociedad y facturación." },
          ].map(({ Icon, t, x }, i) => (
            <In key={t} d={0.35 + i * 0.12}>
              <div className="flex gap-4 rounded-2xl border border-white/15 p-4 sm:p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black">
                  <Icon className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/55">{x}</p>
                </div>
              </div>
            </In>
          ))}
          <In d={0.9}>
            <p className="pt-1 text-xs text-white/30">
              Rango según el escenario: USD {usd(total("min")).toLocaleString("es-AR")} a USD {usd(total("max")).toLocaleString("es-AR")}.
              El detalle, en la próxima diapositiva.
            </p>
          </In>
        </div>
      </div>
    ),
  },

  // 13. Presupuesto y recupero
  {
    render: () => (
      <div>
        <In>
          <Eyebrow>Presupuesto de salida a mercado</Eyebrow>
        </In>
        <In d={0.1}>
          <H className="mt-4 max-w-4xl">En qué se usa y cuándo vuelve.</H>
        </In>
        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1.35fr_1fr]">
          <div className="space-y-5">
            {presupuesto.categorias.map((c, i) => (
              <In key={c.t} d={0.25 + i * 0.12}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-semibold">{c.t}</p>
                  <p className="shrink-0 font-semibold tabular-nums">
                    {pesos(c.base)} <span className="text-sm font-normal text-black/40">· {Math.round((c.base / total("base")) * 100)}%</span>
                  </p>
                </div>
                <div className="mt-2 h-2.5">
                  <Bar pct={(c.base / presupuesto.categorias[0].base) * 100} delay={0.35 + i * 0.12} className="bg-black" />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-black/50">{c.x}</p>
              </In>
            ))}
            <In d={0.8}>
              <div className="flex items-baseline justify-between gap-4 border-t border-black/15 pt-4">
                <p className="font-semibold">Total (escenario base)</p>
                <p className="text-right font-semibold tabular-nums">
                  {pesos(total("base"))}
                  <span className="block text-sm font-normal text-black/45">≈ USD {usd(total("base")).toLocaleString("es-AR")}</span>
                </p>
              </div>
            </In>
          </div>

          <In d={0.5}>
            <div className="rounded-2xl bg-black p-7 text-white">
              <p className="text-sm text-white/50">Se recupera con</p>
              <p className="mt-2 text-[clamp(2.4rem,5vw,3.6rem)] font-semibold leading-none tracking-tight">
                <CountUp to={Math.ceil(eventosParaRecuperar(total("base")))} /> noches
              </p>
              <p className="mt-2 text-white/60">
                de un solo boliche: {meses(total("base"))} con {presupuesto.eventosPorMes} eventos por mes.
              </p>
              <dl className="mt-6 space-y-2 border-t border-white/15 pt-5 text-sm">
                {(
                  [
                    ["Nightowl por noche (8%)", pesos(presupuesto.nightowlPorNoche)],
                    ["Venta de entradas para recuperarlo", millones(total("base") / ejemplo.comision)],
                    ["Escenario mínimo", `${Math.ceil(eventosParaRecuperar(total("min")))} noches · USD ${usd(total("min")).toLocaleString("es-AR")}`],
                    ["Escenario máximo", `${Math.ceil(eventosParaRecuperar(total("max")))} noches · USD ${usd(total("max")).toLocaleString("es-AR")}`],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-white/50">{k}</dt>
                    <dd className="text-right font-medium tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </In>
        </div>
        <In d={1}>
          <p className="mt-10 text-xs leading-relaxed text-black/35">
            Referencia: Nightowl se lleva {pesos(presupuesto.nightowlPorNoche)} por noche de boliche, el 8% de ≈{" "}
            {millones(presupuesto.gmvPorEvento)} en entradas (generales de $ 8.000 a $ 14.000 según la tanda y VIP de $ 35.000 a
            $ 50.000). Dólar de referencia $
            {presupuesto.dolar.toLocaleString("es-AR")}. No incluye 6 meses de mantenimiento. El capital social de la SAS ($
            797.600) no es un gasto: queda en la sociedad para pagar estos mismos costos.
          </p>
        </In>
      </div>
    ),
  },

  // 14. Cierre
  {
    dark: true,
    render: () => (
      <div className="flex flex-col items-center text-center">
        <In>
          <Logo className="h-[clamp(2.5rem,7vw,5rem)]" color="#ffffff" />
        </In>
        <In d={0.25}>
          <p className="mt-10 text-[clamp(1.6rem,3.4vw,2.8rem)] font-semibold tracking-tight">Gracias.</p>
        </In>
        <In d={0.4}>
          <p className="mt-4 text-white/55">{site.contactEmail}</p>
          <p className="mt-1 text-white/35">{site.url.replace("https://", "")}</p>
        </In>
      </div>
    ),
  },
];

/* ------------------------------------------------------------------ */
/* Presentación                                                        */
/* ------------------------------------------------------------------ */

/**
 * Hace entrar la diapositiva entera en el espacio disponible: si es más alta, la achica
 * (y la ensancha en la misma proporción para que el texto use todo el ancho).
 */
function FitToScreen({ children, slideKey }: { children: ReactNode; slideKey: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const o = outer.current;
    const el = inner.current;
    if (!o || !el) return;
    const fit = () => {
      const W = o.clientWidth;
      const H = o.clientHeight;
      let scale = 1;
      for (let k = 0; k < 5; k++) {
        el.style.width = `${W / scale}px`;
        const next = Math.min(1, H / el.offsetHeight);
        if (Math.abs(next - scale) < 0.005) break;
        scale = next;
      }
      el.style.width = `${W / scale}px`;
      el.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [slideKey]);

  return (
    <div ref={outer} className="relative h-full w-full">
      <div ref={inner} className="absolute left-1/2 top-1/2 origin-center" style={{ transform: "translate(-50%, -50%)" }}>
        {children}
      </div>
    </div>
  );
}

export function PitchDeck() {
  const [i, setI] = useState(0);
  const n = slides.length;
  const go = useCallback((d: number) => setI((v) => Math.min(n - 1, Math.max(0, v + d))), [n]);
  const [askFullscreen, setAskFullscreen] = useState(false);

  // Al entrar, sugerir pantalla completa (solo si el navegador la permite y no está activa)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de APIs del navegador, solo al montar
    if (document.fullscreenEnabled && !document.fullscreenElement) setAskFullscreen(true);
  }, []);

  // La diapositiva actual queda en la URL (#3), así se puede compartir o recargar
  useEffect(() => {
    const k = Number(window.location.hash.slice(1));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de la URL al montar
    if (k >= 1 && k <= n) setI(k - 1);
  }, [n]);
  useEffect(() => {
    window.history.replaceState(null, "", `#${i + 1}`);
  }, [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        go(1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Home") setI(0);
      else if (e.key === "End") setI(n - 1);
      else if (e.key.toLowerCase() === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, n]);

  const slide = slides[i];
  const dark = !!slide.dark;

  // Tocar a los costados: el tercio izquierdo vuelve, el resto avanza (como las historias)
  function onTap(e: MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("a, button")) return;
    const x = e.clientX / window.innerWidth;
    go(x < 1 / 3 ? -1 : 1);
  }

  return (
    <div
      className={`relative flex h-dvh w-full select-none flex-col overflow-hidden transition-[background-color] duration-500 ${
        dark ? "bg-[#050505] text-white" : "bg-[#f4f4f5] text-[#09090b]"
      }`}
      onClick={onTap}
    >
      {askFullscreen && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="subir w-full max-w-sm rounded-2xl bg-white p-6 text-center text-[#09090b] shadow-2xl">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
              <Maximize2 className="h-5 w-5" />
            </span>
            <p className="mt-4 text-lg font-semibold tracking-tight">Mirala en pantalla completa</p>
            <p className="mt-1.5 text-sm leading-relaxed text-black/55">
              Recomendamos usar la pantalla completa para una mejor experiencia.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setAskFullscreen(false);
                  document.documentElement.requestFullscreen?.();
                }}
                className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-black/80"
              >
                Pantalla completa
              </button>
              <button
                type="button"
                onClick={() => setAskFullscreen(false)}
                className="rounded-full px-5 py-2.5 text-sm text-black/55 transition hover:text-black"
              >
                Seguir así
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progreso */}
      <div className={`h-[3px] w-full ${dark ? "bg-white/10" : "bg-black/10"}`}>
        <div
          className={`h-full transition-[width] duration-500 ${dark ? "bg-white" : "bg-black"}`}
          style={{ width: `${((i + 1) / n) * 100}%` }}
        />
      </div>

      {/* Barra superior */}
      <div className="flex items-center justify-between px-6 py-4 sm:px-10">
        <Logo className={`h-5 transition-opacity ${i === 0 || i === n - 1 ? "opacity-0" : ""}`} color={dark ? "#ffffff" : "#09090b"} />
        <div className={`flex items-center gap-1 ${dark ? "text-white/50" : "text-black/45"}`}>
          <span className="mr-2 text-xs tabular-nums">
            {i + 1} / {n}
          </span>
          <button type="button" onClick={toggleFullscreen} aria-label="Pantalla completa" className="rounded-md p-2 transition hover:opacity-60">
            <Maximize2 className="h-4 w-4" />
          </button>
          <Link href="/" aria-label="Salir" className="rounded-md p-2 transition hover:opacity-60">
            <X className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Diapositiva: siempre entra entera, sin scroll */}
      <main className="min-h-0 flex-1 px-5 pb-14 sm:px-10 sm:pb-24">
        <FitToScreen slideKey={i}>
          <div key={i} className="mx-auto w-full max-w-6xl py-2">
            {slide.render()}
          </div>
        </FitToScreen>
      </main>

      {/* Navegación */}
      {i === 0 && (
        <p className="pointer-events-none absolute inset-x-0 bottom-12 text-center text-xs text-white/35 sm:hidden">
          Tocá a los costados para avanzar o volver
        </p>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center px-6 pb-5 sm:justify-between sm:px-10 sm:pb-6">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={i === 0}
          aria-label="Anterior"
          className={`hidden h-11 w-11 items-center justify-center rounded-full border transition disabled:opacity-0 sm:flex ${
            dark ? "border-white/20 hover:bg-white hover:text-black" : "border-black/15 hover:bg-black hover:text-white"
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-1.5">
          {slides.map((_, k) => (
            <button
              key={k}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Ir a la diapositiva ${k + 1}`}
              className={`h-1.5 rounded-full transition-all ${k === i ? "w-6" : "w-1.5"} ${
                dark ? (k === i ? "bg-white" : "bg-white/25") : k === i ? "bg-black" : "bg-black/20"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={i === n - 1}
          aria-label="Siguiente"
          className={`hidden h-11 w-11 items-center justify-center rounded-full transition disabled:opacity-0 sm:flex ${
            dark ? "bg-white text-black hover:bg-white/80" : "bg-black text-white hover:bg-black/80"
          }`}
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}
