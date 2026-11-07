import Link from "next/link";
import { CheckoutSteps } from "@/components/checkout-steps";
import { titleFont, type SiteContent } from "@/components/public-site";

export const DEFAULT_CHECKOUT_TITLE = "¿Dónde te ubicamos?";

// El encabezado de la compra sigue a la plantilla: Portada lleva una banda grande con el evento.
export function CheckoutHeading({
  site,
  eventTitle,
  image,
  backHref,
}: {
  site: SiteContent;
  eventTitle: string;
  image?: string | null;
  backHref?: string;
}) {
  const title = site.checkoutTitle || DEFAULT_CHECKOUT_TITLE;
  const back = backHref ? (
    <Link href={backHref} className="text-sm opacity-70 hover:underline">← {eventTitle}</Link>
  ) : (
    <p className="text-sm opacity-70">← {eventTitle}</p>
  );

  if (site.template === "portada") {
    return (
      <>
        <CheckoutSteps current={0} />
        <div
          className="relative mt-5 overflow-hidden rounded-2xl p-6 text-[var(--site-on-accent)] @3xl:p-10"
          style={{ background: "var(--site-accent)" }}
        >
          {image && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
              <span aria-hidden className="absolute inset-0 bg-black/60" />
            </>
          )}
          <div className={`relative ${image ? "text-white" : ""}`}>
            {back}
            <h1 className={`mt-2 text-3xl @3xl:text-5xl ${titleFont(site)}`}>{title}</h1>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <CheckoutSteps current={0} />
      <div className="mt-6">{back}</div>
      <h1 className={`mt-1 text-3xl @3xl:text-4xl ${titleFont(site)}`}>{title}</h1>
    </>
  );
}
