import { getDbClient, schema } from "@laudousg/db";

export type ProductEventSurface = "web" | "ios" | "watch";
export type ProductEventName =
  | "user.signup"
  | "user.first_login"
  | "report.created"
  | "report.edited"
  | "report.deleted";

export function surfaceFromRequest(
  req: Request,
  fallback: ProductEventSurface = "web",
): ProductEventSurface {
  const header = req.headers.get("x-laudousg-surface");
  if (header === "web" || header === "ios" || header === "watch") return header;
  return fallback;
}

export async function recordProductEvent(args: {
  userId: string;
  surface: ProductEventSurface;
  eventName: ProductEventName;
  step?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await getDbClient()
      .insert(schema.productEvents)
      .values({
        userId: args.userId,
        surface: args.surface,
        eventName: args.eventName,
        step: args.step ?? null,
        sessionId: args.sessionId ?? null,
        metadata: args.metadata ?? {},
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error("[events] insert failed:", error);
  }
}
