// Sin dependencias del servidor: esto también lo usa src/proxy.ts.
const isProduction = process.env.NODE_ENV === "production";

// Dominio de Nightowl. El anterior (palcotickets.com) redirige acá: ver legacyRedirectHost.
export const ROOT_DOMAIN = "nightowl.com.ar";
const LEGACY_DOMAIN = "palcotickets.com";

export const DASHBOARD_HOSTS = [`dashboard.${ROOT_DOMAIN}`, "dashboard.localhost"];

export const DASHBOARD_URL = isProduction ? `https://dashboard.${ROOT_DOMAIN}` : "http://dashboard.localhost:3000";

// El escáner de QR vive aparte, en su propio subdominio (src/app/scan). Tiene su propio login:
// la cookie __Host- no se comparte entre subdominios.
export const SCAN_HOSTS = [`scan.${ROOT_DOMAIN}`, "scan.localhost"];
export const SCAN_URL = isProduction ? `https://scan.${ROOT_DOMAIN}` : "http://scan.localhost:3000";
export const SCAN_PUBLIC_PATHS = ["/login"];

// __Host- obliga a Secure y a que la cookie no se comparta con los subdominios de los clientes.
export const SESSION_COOKIE = isProduction ? "__Host-nightowl_session" : "nightowl_session";

export const PUBLIC_PATHS = ["/login", "/olvide-contrasena", "/restablecer"];

// El anterior sigue acá para la vuelta de Mercado Pago de compras empezadas antes de mudarnos
// (las páginas del dominio anterior las redirige el proxy antes de llegar a esto).
const SITE_ROOT_DOMAINS = [ROOT_DOMAIN, LEGACY_DOMAIN, "localhost"];
const OUR_SUBDOMAINS = ["www", "dashboard", "scan"];

// "teatro-colon.nightowl.com.ar" → "teatro-colon". Null si no es la página de un cliente.
export function siteSlugFromHost(host: string) {
  for (const root of SITE_ROOT_DOMAINS) {
    if (!host.endsWith(`.${root}`)) continue;
    const subdomain = host.slice(0, -root.length - 1);
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(subdomain) && !OUR_SUBDOMAINS.includes(subdomain) ? subdomain : null;
  }
  return null;
}

export const publicSiteUrl = (slug: string) =>
  isProduction ? `https://${slug}.${ROOT_DOMAIN}` : `http://${slug}.localhost:3000`;

// Dónde se ve la página de un cliente, para mostrar en el panel ("moscu.nightowl.com.ar").
export const publicSiteHost = (slug: string) => `${slug}.${ROOT_DOMAIN}`;

// "moscu.palcotickets.com" → "moscu.nightowl.com.ar"; "palcotickets.com" → "www.nightowl.com.ar".
// Null si el host no es del dominio anterior.
export function legacyRedirectHost(host: string) {
  if (host === LEGACY_DOMAIN) return `www.${ROOT_DOMAIN}`;
  if (host.endsWith(`.${LEGACY_DOMAIN}`)) return `${host.slice(0, -LEGACY_DOMAIN.length)}${ROOT_DOMAIN}`;
  return null;
}
