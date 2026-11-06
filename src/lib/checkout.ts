// La compra está apagada en producción hasta que haya un cobro real (Mercado Pago, etapa 5).
// Con esto en false, el público ve "Entradas muy pronto" y no se puede reservar nada.
export const checkoutEnabled = process.env.NODE_ENV !== "production";
