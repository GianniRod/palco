// Sin dependencias del servidor: esto también lo usa src/proxy.ts.
const isProduction = process.env.NODE_ENV === "production";

export const DASHBOARD_HOSTS = ["dashboard.palcotickets.com", "dashboard.localhost"];

export const DASHBOARD_URL = isProduction ? "https://dashboard.palcotickets.com" : "http://dashboard.localhost:3000";

// __Host- obliga a Secure y a que la cookie no se comparta con los subdominios de los clientes.
export const SESSION_COOKIE = isProduction ? "__Host-palco_session" : "palco_session";

export const PUBLIC_PATHS = ["/login", "/olvide-contrasena", "/restablecer"];
