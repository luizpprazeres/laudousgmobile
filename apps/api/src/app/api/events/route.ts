import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import {
  recordProductEvent,
  surfaceFromRequest,
} from "@/server/db/productEventsRepo";
import { z } from "zod";

export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EventBodySchema = z.object({
  event_name: z.enum([
    "user.signup",
    "user.first_login",
    "report.created",
    "report.edited",
    "report.deleted",
  ]),
  step: z.string().trim().min(1).max(120).optional(),
  session_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const parsed = EventBodySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "invalid_body", issues: parsed.error.format() }, 400);
  }

  await recordProductEvent({
    userId: user.id,
    surface: surfaceFromRequest(req),
    eventName: parsed.data.event_name,
    step: parsed.data.step,
    sessionId: parsed.data.session_id,
    metadata: parsed.data.metadata,
  });

  return json({ ok: true }, 202);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
