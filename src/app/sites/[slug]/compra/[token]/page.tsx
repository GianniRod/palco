import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@backend/db.mjs";
import { getOrderByToken } from "@backend/checkout.mjs";
import { isMercadoPagoConfigured } from "@backend/mercadopago.mjs";
import { getPublicSiteContent } from "@backend/sites.mjs";
import { CheckoutSteps } from "@/components/checkout-steps";
import { Owl } from "@/components/made-by";
import { formatPrice, formatPriceWithFee, SiteFrame, titleFont, type SiteContent } from "@/components/public-site";
import { TicketCard } from "@/components/ticket-card";
import { brandedQrSvg } from "@/lib/branded-qr";
import { checkoutEnabled } from "@/lib/checkout";
import { cancelAction } from "./actions";
import { testPayAdmin } from "@/lib/test-pay";
import { Countdown, PayForm, TestPayForm } from "./_pay";

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

const itemLabel = (item: Item) => (item.row ? `${item.sector}, fila ${item.row}, butaca ${item.number}` : item.sector);

function Ticket({ item, site, title, date, venue, index, count }: { item: Item; site: SiteContent; title: string; date: string; venue: string; index: number; count: number }) {
  // El mismo QR de Nightowl que /admin/puerta: módulos redondeados y búho en el medio.
  const svg = brandedQrSvg(item.code!);
  return (
    <li>
      <TicketCard
        style={site.ticketStyle}
        titleClass={titleFont(site)}
        kicker={`Entrada ${index + 1} de ${count}`}
        title={title}
        date={date}
        venue={venue}
        place={itemLabel(item)}
        note={item.checkedInAt ? "Esta entrada ya entró." : undefined}
        qr={
          <div
            role="img"
            aria-label={`Código QR de ${itemLabel(item)}`}
            style={{ width: 224, height: 224 }}
            className="shrink-0 overflow-hidden rounded-lg bg-white [&>svg]:size-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        }
      />
    </li>
  );
}

function Message({ title, children, eventId }: { title: string; children: string; eventId: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center rounded-2xl bg-[var(--site-surface)] p-8 text-center [box-shadow:var(--site-shadow)]">
      <Owl className="mb-3 h-12 text-[var(--site-accent-text)]" />
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
  const [order, site] = await Promise.all([getOrderByToken(db, slug, token), getPublicSiteContent(db, slug)]);
  if (!order || !site) notFound();
  const showTestPay = order.status === "pending" && (await testPayAdmin()) !== null;
  const items: Item[] = order.items;
  const date = dateFormat.format(new Date(order.startsAt));
  const venue = order.address ? `${order.venue} · ${order.address}` : order.venue;

  return (
    <SiteFrame site={site} className="min-h-screen" homeHref="/">
      <section className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 @3xl:px-8 @3xl:py-12">
        {order.status === "paid" && (
          <>
            <div className="mb-8"><CheckoutSteps current={2} /></div>
            <div className="mb-6">
              <div>
                <h1 className={`text-3xl ${titleFont(site)}`}>¡Ya estás adentro, {order.buyerName}!</h1>
                <p className="mt-1 text-[var(--site-muted)]">Te mandamos las entradas a {order.buyerEmail}. Mostrá el QR en la puerta: cada uno entra una sola vez. Nos vemos en la noche.</p>
              </div>
            </div>
            <ul className="space-y-4">
              {items.map((item, index) => <Ticket key={item.id} item={item} site={site} title={order.title} date={date} venue={venue} index={index} count={items.length} />)}
            </ul>
          </>
        )}

        {order.status === "pending" && (checkoutEnabled ? (
          <>
            <CheckoutSteps current={1} />
            <h1 className={`mt-6 mb-5 text-3xl @3xl:text-4xl ${titleFont(site)}`}>Ya casi estás adentro</h1>
            <div className="grid items-start gap-6 @3xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-2xl bg-[var(--site-surface)] [box-shadow:var(--site-shadow)]">
                <div className="p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--site-accent-text)]">Tu reserva</p>
                  <p className="mt-1 text-xl font-extrabold tracking-tight">{order.title}</p>
                  <p className="mt-1 text-sm text-[var(--site-muted)] first-letter:uppercase">{date}</p>
                  <p className="text-sm text-[var(--site-muted)]">{venue}</p>
                </div>
                <div aria-hidden className="relative h-0 border-t-2 border-dashed border-[var(--site-line)]">
                  <span className="absolute -left-2.5 -top-2.5 size-5 rounded-full bg-[var(--site-bg)]" />
                  <span className="absolute -right-2.5 -top-2.5 size-5 rounded-full bg-[var(--site-bg)]" />
                </div>
                <ul className="divide-y divide-[var(--site-line)] px-6 py-2 text-sm">
                  {items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3 py-3">
                      <span>{itemLabel(item)}{item.lot ? <span className="text-[var(--site-muted)]"> · {item.lot}</span> : null}</span>
                      <span className="font-semibold tabular-nums">{formatPriceWithFee(item.unitPrice, Number(order.commissionPercent))}</span>
                    </li>
                  ))}
                  {order.commissionAmount > 0 && (
                    <li className="flex justify-between gap-3 py-3">
                      <span>Tarifa de servicio</span>
                      <span className="font-semibold tabular-nums">{formatPrice(order.commissionAmount)}</span>
                    </li>
                  )}
                </ul>
                <div className="flex items-baseline justify-between border-t border-[var(--site-line)] px-6 py-4">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-extrabold tabular-nums">{formatPrice(order.amountDue)}</span>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl bg-[var(--site-surface)] p-6 [box-shadow:var(--site-shadow)]">
                <Countdown expiresAt={new Date(order.expiresAt).toISOString()} />
                {notice && <p role="status" className="rounded-lg bg-[var(--site-line)] px-3 py-2 text-sm font-medium">{notice}</p>}
                <PayForm slug={slug} token={token} total={formatPrice(order.amountDue)} mercadoPago={isMercadoPagoConfigured()} />
                {showTestPay && <TestPayForm slug={slug} token={token} />}
                <form action={cancelAction} className="text-center">
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="token" value={token} />
                  <button type="submit" className="text-sm text-[var(--site-muted)] underline">Soltar las entradas</button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <Message title="Reserva pendiente" eventId={order.eventId}>Todavía no se puede pagar en esta página.</Message>
        ))}

        {order.status === "expired" && <Message title="Se te fue la reserva" eventId={order.eventId}>Pasaron los 10 minutos y las entradas volvieron a la pista. Todavía podés elegirlas de nuevo.</Message>}
        {order.status === "cancelled" && <Message title="Listo, las soltamos" eventId={order.eventId}>Tus entradas volvieron a la pista. No se te cobró nada.</Message>}
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
