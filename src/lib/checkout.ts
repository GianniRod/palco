// La compra está apagada en producción hasta que el cobro real esté probado.
// Para probar Mercado Pago en producción con el token de prueba: CHECKOUT_ENABLED=true en Vercel.
// Con esto en false, el público ve "Entradas muy pronto" y no se puede reservar nada.
export const checkoutEnabled = process.env.NODE_ENV !== "production" || process.env.CHECKOUT_ENABLED === "true";
