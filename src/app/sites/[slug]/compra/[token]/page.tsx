import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, MapPin } from "lucide-react";
import QRCode from "qrcode";
import { getDb } from "@backend/db.mjs";
import { getOrderByToken } from "@backend/checkout.mjs";
import { getPublicSite } from "@backend/sites.mjs";
import { formatPrice, SiteFrame } from "@/components/public-site";
import { isMercadoPagoConfigured } from "@backend/mercadopago.mjs";
import { checkoutEnabled } from "@/lib/checkout";
import { cancelAction } from "./actions";
import { Countdown, PayForm } from "./_pay";

// El link de la orden es privado: no se indexa ni se manda como referencia a otros sitios.
export const metadata: Metadata = {
  title: { absolute: "Tu compra" },
  robots: { index: false, follow: false },
  alternates: { canonical: null },
  referrer: "no-referrer",
};

type Props = PageProps<"/sites/[slug]/compra/[token]">;
type Item = {
  id: string;
  unitPrice: number;
  sector: string;
  row: string | null;
  number: number | null;
  lot: string | null;
  code: string | null;
  checkedInAt: Date | null;
};

const dateFormat = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Argentina/Buenos_Aires",
});

const itemLabel = (item: Item) => (item.row ? `${item.sector}, fila ${item.row}, butaca ${item.number}` : `${item.sector}, ubicación general`);

async function Ticket({ item, title, date }: { item: Item; title: string; date: string }) {
  const svg = await QRCode.toString(item.code!, { type: "svg", margin: 1, width: 176, errorCorrectionLevel: "M" });
  return (
    <li className="grid items-center gap-5 overflow-hidden rounded-xl bg-[var(--site-surface)] p-5 [box-shadow:var(--site-shadow)] @xl:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--site-accent-text)]">{item.sector}</p>
        <p className="mt-1 text-xl font-extrabold tracking-tight">{title}</p>
        <p className="mt-1 text-[var(--site-muted)] first-letter:uppercase">{date}</p>
        <p className="mt-1 text-[var(--site-muted)]">{itemLabel(item)}</p>
        {item.checkedInAt && <p className="mt-2 text-sm font-semibold">Esta entrada ya se usó.</p>}
      </div>
      {/* Blanco siempre: un QR sobre fondo oscuro cuesta más de leer en la puerta. */}
      <div
        role="img"
        aria-label={`Código QR de ${itemLabel(item)}`}
        style={{ width: 176, height: 176 }}
        className="mx-auto shrink-0 overflow-hidden rounded-lg bg-white"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </li>
  );
}

function Message({ title, children, eventId }: { title: string; children: string; eventId: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-xl bg-[var(--site-surface)] p-8 text-center [box-shadow:var(--site-shadow)]">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-[var(--site-muted)]">{children}</p>
      <a href={`/eventos/${eventId}`} className="mt-5 inline-block rounded-md bg-[var(--site-accent)] px-5 py-3 font-bold text-[var(--site-on-accent)]">Volver al evento</a>
    </div>
  );
}

// Lo que trae la vuelta de Mercado Pago (src/app/api/mercadopago/vuelta).
const NOTICES: Record<string, string> = {
  rechazado: "Mercado Pago no aprobó el pago. Podés probar con otra tarjeta mientras la reserva siga vigente.",
  confirmando: "Estamos confirmando tu pago con Mercado Pago. Si ya pagaste, en unos segundos vas a ver tus entradas.",
};

async function Content({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  const [{ slug, token }, query] = await Promise.all([params, searchParams]);
  const notice = typeof query.pago === "string" ? NOTICES[query.pago] : undefined;
  const db = getDb();
  const [order, site] = await Promise.all([getOrderByToken(db, slug, token), getPublicSite(db, slug)]);
  if (!order || !site) notFound();
  const items: Item[] = order.items;
  const date = dateFormat.format(new Date(order.startsAt));

  return (
    <SiteFrame site={site.content} className="min-h-screen" homeHref="/">
      <section className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 @3xl:px-8 @3xl:py-12">
        {order.status === "paid" && (
          <>
            <div className="mb-6 flex items-start gap-3">
              <CheckCircle2 className="mt-1 size-7 shrink-0 text-[var(--site-accent-text)]" aria-hidden />
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">¡Listo, {order.buyerName}!</h1>
                <p className="mt-1 text-[var(--site-muted)]">Te mandamos las entradas a {order.buyerEmail}. Mostrá el QR en la entrada; cada uno sirve una sola vez.</p>
              </div>
            </div>
            <p className="mb-5 flex items-center gap-2 text-[var(--site-muted)]">
              <MapPin className="size-4 shrink-0" aria-hidden />
              {order.venue}{order.address ? ` · ${order.address}` : ""}
            </p>
            <ul className="space-y-4">
              {items.map((item) => <Ticket key={item.id} item={item} title={order.title} date={date} />)}
            </ul>
          </>
        )}

        {order.status === "pending" && (checkoutEnabled ? (
          <div className="mx-auto max-w-xl rounded-xl bg-[var(--site-surface)] p-6 [box-shadow:var(--site-shadow)]">
            <h1 className="text-2xl font-extrabold tracking-tight">Confirmá tu compra</h1>
            <p className="mt-1 font-semibold">{order.title}</p>
            <p className="text-[var(--site-muted)] first-letter:uppercase">{date}</p>
            <div className="mt-3"><Countdown expiresAt={new Date(order.expiresAt).toISOString()} /></div>
            {notice && <p role="status" className="mt-3 rounded-md bg-[var(--site-line)] px-3 py-2 text-sm font-medium">{notice}</p>}
            <ul className="mt-4 divide-y divide-[var(--site-line)] border-y border-[var(--site-line)] text-sm">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 py-2.5">
                  <span>{itemLabel(item)}{item.lot ? ` · ${item.lot}` : ""}</span>
                  <span className="tabular-nums">{formatPrice(item.unitPrice)}</span>
                </li>
              ))}
            </ul>
            <div className="my-4 flex items-baseline justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold tabular-nums">{formatPrice(order.total)}</span>
            </div>
            <PayForm slug={slug} token={token} mercadoPago={isMercadoPagoConfigured()} />
            <form action={cancelAction} className="mt-3 text-center">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="text-sm text-[var(--site-muted)] underline">Cancelar y liberar las entradas</button>
            </form>
          </div>
        ) : (
          <Message title="Reserva pendiente" eventId={order.eventId}>Todavía no se puede pagar en esta página.</Message>
        ))}

        {order.status === "expired" && <Message title="La reserva venció" eventId={order.eventId}>Se te pasaron los 10 minutos y liberamos las entradas. Podés volver a elegirlas.</Message>}
        {order.status === "cancelled" && <Message title="Compra cancelada" eventId={order.eventId}>Liberamos tus entradas. No se te cobró nada.</Message>}
        {order.status === "refund_pending" && <Message title="No pudimos confirmar tu compra" eventId={order.eventId}>Tu pago llegó cuando la reserva ya había vencido y esas entradas se vendieron. Te vamos a devolver el dinero.</Message>}
      </section>
    </SiteFrame>
  );
}

export default function OrderPage({ params, searchParams }: Props) {
  return (
    <Suspense>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}
