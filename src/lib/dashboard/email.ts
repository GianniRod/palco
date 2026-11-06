import "server-only";
import { DASHBOARD_URL } from "./config";

// Remitente de un dominio verificado en Resend, igual que el formulario de demo.
const DEFAULT_FROM = "Nightowl <no-responder@palcotickets.com>";

// Lleva a la orden, donde están las entradas con su QR. No manda los QR adjuntos para no duplicarlos.
export async function sendTicketsEmail(email: string, { title, siteName, link }: { title: string; siteName: string; link: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[compra] Entradas de ${email}: ${link}`);
      return;
    }
    console.error("[compra] Falta RESEND_API_KEY: no se pudieron enviar las entradas.");
    return;
  }

  const safe = (text: string) => text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.DASHBOARD_FROM || DEFAULT_FROM,
      to: [email],
      subject: `Tus entradas para ${title}`,
      text: `¡Listo! Tu compra en ${siteName} está confirmada. Mostrá el QR en la entrada:\n\n${link}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#111;max-width:560px">
          <h2 style="margin:0 0 16px">Tus entradas para ${safe(title)}</h2>
          <p>Tu compra en ${safe(siteName)} está confirmada. Mostrá el QR en la entrada.</p>
          <p style="margin:24px 0"><a href="${link}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Ver mis entradas</a></p>
        </div>`,
    }),
  });
  if (!res.ok) console.error("[compra] Resend respondió", res.status, await res.text().catch(() => ""));
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${DASHBOARD_URL}/restablecer?token=${encodeURIComponent(token)}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[dashboard] Link de recupero para ${email}: ${link}`);
      return;
    }
    console.error("[dashboard] Falta RESEND_API_KEY: no se puede enviar el email de recupero.");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.DASHBOARD_FROM || DEFAULT_FROM,
      to: [email],
      subject: "Restablecer tu contraseña de Nightowl",
      text: `Para elegir una contraseña nueva entrá a este link (vence en una hora):\n\n${link}\n\nSi no lo pediste, ignorá este mail.`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#1f030a;max-width:560px">
          <h2 style="color:#480a17;margin:0 0 16px">Restablecer tu contraseña</h2>
          <p>Para elegir una contraseña nueva hacé clic acá. El link vence en una hora.</p>
          <p style="margin:24px 0"><a href="${link}" style="background:#480a17;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Elegir contraseña nueva</a></p>
          <p style="font-size:12px;color:#888">Si no lo pediste, ignorá este mail.</p>
        </div>`,
    }),
  });

  if (!res.ok) {
    console.error("[dashboard] Resend respondió", res.status, await res.text().catch(() => ""));
  }
}
