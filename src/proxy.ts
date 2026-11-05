import { NextResponse, type NextRequest } from "next/server";
import { DASHBOARD_HOSTS, PUBLIC_PATHS, SESSION_COOKIE, siteSlugFromHost } from "@/lib/dashboard/config";

// Decide qué sitio mostrar según el dominio. El panel vive en src/app/dashboard,
// pero desde afuera se ve en la raíz de dashboard.palcotickets.com.
export function proxy(request: NextRequest) {
  // x-forwarded-host primero: al redirigir desde una Server Action, Next pide la página destino
  // a su propio origen (Host: localhost) y el dominio real solo viaja en este header.
  const forwarded = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const host = forwarded.split(",")[0].trim().split(":")[0].toLowerCase();
  const { pathname } = request.nextUrl;

  if (!DASHBOARD_HOSTS.includes(host)) {
    // Cada cliente tiene su página en su subdominio, servida desde src/app/sites/[slug].
    const slug = siteSlugFromHost(host);
    if (slug) {
      const url = request.nextUrl.clone();
      url.pathname = `/sites/${slug}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
    }

    const isInternalPath = /^\/(dashboard|sites)(\/|$)/.test(pathname);
    return isInternalPath ? new NextResponse(null, { status: 404 }) : NextResponse.next();
  }

  // Solo evita pasos de más: quien tiene una cookie inválida lo frena la sesión al renderizar.
  if (!request.cookies.has(SESSION_COOKIE) && !PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = request.nextUrl.clone();
  url.pathname = `/dashboard${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Afuera quedan la API, los archivos internos de Next y todo lo que tenga extensión.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
