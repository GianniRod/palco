// Los mails de Nightowl: mismo marco, misma voz y siempre la firma.
// Tablas y estilos en línea porque es lo único que respetan todos los clientes de correo.
import { site } from "../site";

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const SIGNATURE_TEXT = `\n\n--\nTecnología de Nightowl\n${site.url}`;

function layout({ preheader, body }: { preheader: string; body: string }) {
  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#09090b">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
        <tr><td style="background:#050505;padding:24px 28px">
          <img src="${site.url}/logo-nightowl.png" alt="Nightowl" width="150" style="display:block;width:150px;height:auto;border:0">
        </td></tr>
        <tr><td style="padding:32px 28px;font-size:16px;line-height:1.55">${body}</td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a">
          Tecnología de <a href="${site.url}" style="color:#09090b;font-weight:bold;text-decoration:none">Nightowl</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:28px 0"><a href="${href}" style="display:inline-block;background:#09090b;color:#ffffff;padding:14px 24px;border-radius:999px;font-weight:bold;text-decoration:none">${escape(label)}</a></p>`;

export function passwordResetEmail(link: string) {
  return {
    subject: "¿Te olvidaste la contraseña? Pasa en las mejores noches",
    text: `Elegí una contraseña nueva con este link. Vence en una hora:\n\n${link}\n\nSi no lo pediste, ignorá este mail y seguí con tu noche.${SIGNATURE_TEXT}`,
    html: layout({
      preheader: "Elegí una contraseña nueva. El link vence en una hora.",
      body: `
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2">A cualquiera le pasa.</h1>
        <p style="margin:0">Elegí una contraseña nueva con este botón. El link vence en una hora.</p>
        ${button(link, "Elegir contraseña nueva")}
        <p style="margin:0;font-size:13px;color:#71717a">Si no lo pediste, ignorá este mail y seguí con tu noche.</p>`,
    }),
  };
}

export type TicketsEmailData = {
  buyerName: string;
  siteName: string;
  title: string;
  date: string;
  venue: string;
  tickets: string[];
  link: string;
};

export function ticketsEmail({ buyerName, siteName, title, date, venue, tickets, link }: TicketsEmailData) {
  const count = tickets.length === 1 ? "tu entrada" : `tus ${tickets.length} entradas`;
  const rows = tickets
    .map((ticket) => `<li style="margin:4px 0">${escape(ticket)}</li>`)
    .join("");
  return {
    subject: `Ya estás adentro: ${title}`,
    text: `¡Ya estás adentro, ${buyerName}!\n\n${title}\n${date}\n${venue}\n\n${tickets.join("\n")}\n\nMirá ${count} y sus QR acá:\n${link}\n\nCada QR entra una sola vez. Nos vemos en la noche.\n\nComprado en ${siteName}.${SIGNATURE_TEXT}`,
    html: layout({
      preheader: `${title}: acá están ${count}.`,
      body: `
        <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2">¡Ya estás adentro, ${escape(buyerName)}!</h1>
        <p style="margin:0 0 20px">Tu compra en ${escape(siteName)} está confirmada.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border-radius:12px;color:#ffffff">
          <tr><td style="padding:20px 22px">
            <p style="margin:0;font-size:20px;font-weight:bold">${escape(title)}</p>
            <p style="margin:6px 0 0;font-size:14px;color:#d4d4d8">${escape(date)}</p>
            <p style="margin:2px 0 0;font-size:14px;color:#d4d4d8">${escape(venue)}</p>
            <ul style="margin:14px 0 0;padding-left:18px;font-size:14px">${rows}</ul>
          </td></tr>
        </table>
        ${button(link, "Ver mis entradas")}
        <p style="margin:0;font-size:14px;color:#52525b">Mostrá el QR en la puerta. Cada uno entra una sola vez. Nos vemos en la noche.</p>`,
    }),
  };
}
