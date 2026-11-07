import "server-only";
import { DASHBOARD_URL } from "./config";
import { passwordResetEmail, ticketsEmail, type TicketsEmailData } from "./email-templates";

// Remitente de un dominio verificado en Resend, igual que el formulario de demo.
const DEFAULT_FROM = "Nightowl <no-responder@palcotickets.com>";

async function send(to: string, { subject, text, html }: { subject: string; text: string; html: string }, tag: string, devNote: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[${tag}] ${devNote}`);
      return;
    }
    console.error(`[${tag}] Falta RESEND_API_KEY: no se pudo enviar el mail.`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.DASHBOARD_FROM || DEFAULT_FROM, to: [to], subject, text, html }),
  });
  if (!res.ok) console.error(`[${tag}] Resend respondió`, res.status, await res.text().catch(() => ""));
}

// Lleva a la orden, donde están las entradas con su QR. No manda los QR adjuntos para no duplicarlos.
export function sendTicketsEmail(email: string, data: TicketsEmailData) {
  return send(email, ticketsEmail(data), "compra", `Entradas de ${email}: ${data.link}`);
}

export function sendPasswordResetEmail(email: string, token: string) {
  const link = `${DASHBOARD_URL}/restablecer?token=${encodeURIComponent(token)}`;
  return send(email, passwordResetEmail(link), "dashboard", `Link de recupero para ${email}: ${link}`);
}
