// Datos de contacto y textos globales del sitio.
// TODO: cambiar a una casilla @palcotickets.com cuando esté creada.
export const site = {
  name: "Palco",
  url: "https://www.palcotickets.com",
  description:
    "Plataforma de venta de entradas y control de acceso para teatros, salas y productoras. Vendé con tu propia marca, con butacas numeradas o ubicación general.",
  contactEmail: "giancarlorodriguezbollati@gmail.com",
} as const;

export const contactHref = `mailto:${site.contactEmail}?subject=${encodeURIComponent(
  "Quiero conocer Palco",
)}`;
