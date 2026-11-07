import { parseDemoRequest, type DemoRequest } from "@/lib/demo-request";

// Envía el pedido de demo por email usando la API de Resend (https://resend.com).
// Variables de entorno:
//   RESEND_API_KEY  (obligatoria)
//   DEMO_TO         destino, por defecto contacto@palcotickets.com
//   DEMO_FROM       remitente de un dominio verificado en Resend,
//                   por defecto "Nightowl Web <web@palcotickets.com>"

// Siguen en palcotickets.com hasta que nightowl.com.ar esté verificado en Resend y reciba mails.
const DEFAULT_TO = "contacto@palcotickets.com";
const DEFAULT_FROM = "Nightowl Web <web@palcotickets.com>";

// Límite simple por IP. En serverless vive por instancia: frena abusos básicos,
// no reemplaza un rate limit distribuido.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function rows(d: DemoRequest): [string, string][] {
  return [
    ["Nombre", d.name],
    ["Email", d.email],
    ["Teléfono / WhatsApp", d.phone],
    ["Sala o productora", d.venue],
    ["Tipo de espacio", d.venueType],
    ["Capacidad", d.capacity],
    ["Ubicaciones", d.seating],
    ["Eventos por mes", d.events],
    ["Ticketera actual", d.currentTicketing],
  ];
}

function renderEmail(d: DemoRequest) {
  const filled = rows(d).filter(([, v]) => v);
  const text =
    filled.map(([k, v]) => `${k}: ${v}`).join("\n") + (d.message ? `\n\nQué necesita:\n${d.message}` : "");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f030a;max-width:560px">
      <h2 style="color:#480a17;margin:0 0 16px">Nuevo pedido de demo</h2>
      <table style="border-collapse:collapse;width:100%">
        ${filled
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 12px 6px 0;color:#82263b;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 0">${escapeHtml(v)}</td></tr>`,
          )
          .join("")}
      </table>
      ${
        d.message
          ? `<p style="margin:20px 0 6px;color:#82263b">Qué necesita</p><p style="margin:0;white-space:pre-wrap">${escapeHtml(d.message)}</p>`
          : ""
      }
      <p style="margin-top:24px;font-size:12px;color:#888">Enviado desde el formulario de nightowl.com.ar. Respondé este mail para contestarle directamente.</p>
    </div>`;
  return { text, html };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Datos inválidos." }, { status: 400 });
  }

  // Trampa para bots: campo invisible que una persona no completa.
  if (typeof body === "object" && body !== null && (body as Record<string, unknown>).website) {
    return Response.json({ ok: true });
  }

  const parsed = parseDemoRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";
  if (rateLimited(ip)) {
    return Response.json(
      { error: "Recibimos varios pedidos seguidos. Probá de nuevo en unos minutos." },
      { status: 429 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[demo] Falta RESEND_API_KEY: no se puede enviar el pedido de demo.");
    return Response.json(
      { error: "No pudimos enviar el formulario. Escribinos a contacto@palcotickets.com." },
      { status: 503 },
    );
  }

  const d = parsed.data;
  const { text, html } = renderEmail(d);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.DEMO_FROM || DEFAULT_FROM,
      to: [process.env.DEMO_TO || DEFAULT_TO],
      reply_to: d.email,
      subject: `Pedido de demo: ${d.venue} (${d.venueType})`,
      text,
      html,
    }),
  });

  if (!res.ok) {
    console.error("[demo] Resend respondió", res.status, await res.text().catch(() => ""));
    return Response.json(
      { error: "No pudimos enviar el formulario. Probá de nuevo o escribinos a contacto@palcotickets.com." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
