// Sin dependencias del servidor: esto también lo usa src/proxy.ts.
const isProduction = process.env.NODE_ENV === "production";

export const DASHBOARD_HOSTS = ["dashboard.palcotickets.com", "dashboard.localhost"];

export const DASHBOARD_URL = isProduction ? "https://dashboard.palcotickets.com" : "http://dashboard.localhost:3000";

// __Host- obliga a Secure y a que la cookie no se comparta con los subdominios de los clientes.
export const SESSION_COOKIE = isProduction ? "__Host-palco_session" : "palco_session";

export const PUBLIC_PATHS = ["/login", "/olvide-contrasena", "/restablecer"];

const SITE_ROOT_DOMAINS = ["palcotickets.com", "localhost"];
const OUR_SUBDOMAINS = ["www", "dashboard"];

// "teatro-colon.palcotickets.com" → "teatro-colon". Null si no es la página de un cliente.
export function siteSlugFromHost(host: string) {
  for (const root of SITE_ROOT_DOMAINS) {
    if (!host.endsWith(`.${root}`)) continue;
    const subdomain = host.slice(0, -root.length - 1);
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(subdomain) && !OUR_SUBDOMAINS.includes(subdomain) ? subdomain : null;
  }
  return null;
}

export const publicSiteUrl = (slug: string) =>
  isProduction ? `https://${slug}.palcotickets.com` : `http://${slug}.localhost:3000`;
