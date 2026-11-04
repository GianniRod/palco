// Datos de contacto y textos globales del sitio.
export const site = {
  name: "Palco",
  url: "https://www.palcotickets.com",
  description:
    "Plataforma de venta de entradas y control de acceso para teatros, salas y productoras. Vendé con tu propia marca, con butacas numeradas o ubicación general.",
  contactEmail: "contacto@palcotickets.com",
} as const;

export const contactHref = `mailto:${site.contactEmail}`;

/** Los botones "Pedir demo" abren el formulario (components/demo-dialog.tsx). */
export const demoHref = "#demo";
