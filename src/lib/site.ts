// Datos de contacto y textos globales del sitio.
export const site = {
  name: "Nightowl",
  url: "https://www.palcotickets.com",
  description:
    "Plataforma de entradas para boliches y fiestas. Vendé desde tu propia web, con lotes de preventa, links por RRPP, VIP y mesas, y control de acceso con QR.",
  contactEmail: "contacto@palcotickets.com",
} as const;

export const contactHref = `mailto:${site.contactEmail}`;

/** Los botones "Pedir demo" abren el formulario (components/demo-dialog.tsx). */
export const demoHref = "#demo";
