import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@backend/db.mjs";
import { getPublicSite } from "@backend/sites.mjs";
import { PublicSite } from "@/components/public-site";

type Props = PageProps<"/sites/[slug]">;

// Sin "use cache": publicar, despublicar o suspender se tiene que ver enseguida.
const loadSite = cache((slug: string) => getPublicSite(getDb(), slug));

// Marca blanca: acá no aparece el título ni la URL canónica de Nightowl.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await loadSite(slug);
  if (!site) return { title: "Página no encontrada", robots: { index: false } };

  const { displayName, tagline, logo } = site.content;
  return {
    title: { absolute: displayName },
    description: tagline || undefined,
    alternates: { canonical: null },
    openGraph: { title: displayName, description: tagline || undefined, siteName: displayName, url: null },
    icons: logo ? { icon: logo } : undefined,
  };
}

async function Content({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const site = await loadSite(slug);
  if (!site) notFound();
  return <PublicSite site={site.content} events={site.events} linkEvents className="min-h-screen" />;
}

export default function SitePage({ params }: Props) {
  return (
    <Suspense>
      <Content params={params} />
    </Suspense>
  );
}
