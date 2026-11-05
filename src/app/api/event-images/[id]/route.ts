import { getDb } from "@backend/db.mjs";
import { getPublicEventImage } from "@backend/events.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// El flyer se sirve aparte para no meter imágenes pesadas dentro de cada página.
// La URL lleva ?v=<fecha de edición>, así que se puede guardar en caché un buen rato.
export async function GET(_: Request, { params }: RouteContext<"/api/event-images/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response(null, { status: 404 });

  const image = await getPublicEventImage(getDb(), id);
  if (!image) return new Response(null, { status: 404 });

  return new Response(image.bytes, {
    headers: {
      "Content-Type": image.type,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
