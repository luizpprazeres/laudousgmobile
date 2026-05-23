import { eq } from "drizzle-orm";
import { getDbClient, schema } from "@laudousg/db";
import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { decodeJws } from "@/server/iap/jws";
import {
  isIntroOffer,
  parseProductId,
  ValidateReceiptRequestSchema,
  type AppleSignedTransactionPayload,
  type SubscriptionStatusOut,
} from "@/server/iap/types";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const parsed = ValidateReceiptRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "invalid_body", issues: parsed.error.format() }, 400);
  }

  let payload: AppleSignedTransactionPayload;
  try {
    payload = decodeJws<AppleSignedTransactionPayload>(
      parsed.data.signedTransactionJwt,
    );
  } catch (error) {
    console.log("[iap] invalid transaction jws", error);
    return json({ error: "invalid_jws" }, 400);
  }

  const product = parseProductId(payload.productId);
  if (!product) return json({ error: "invalid_product" }, 400);

  const db = getDbClient();
  const expiresAt = new Date(payload.expiresDate);
  const isTrial = isIntroOffer(payload.offerType);

  const [subscription] = await db
    .insert(schema.subscriptions)
    .values({
      userId: user.id,
      productId: payload.productId,
      tier: product.tier,
      period: product.period,
      appleOriginalTxId: payload.originalTransactionId,
      appleLatestTxId: payload.transactionId,
      expiresAt,
      isTrial,
      status: "active",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.subscriptions.appleOriginalTxId,
      set: {
        userId: user.id,
        productId: payload.productId,
        tier: product.tier,
        period: product.period,
        appleLatestTxId: payload.transactionId,
        expiresAt,
        isTrial,
        status: "active",
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!subscription) return json({ error: "subscription_upsert_failed" }, 500);

  await db
    .update(schema.profiles)
    .set({ plan: product.tier, updatedAt: new Date() })
    .where(eq(schema.profiles.id, user.id));

  return json({
    ok: true,
    subscription: toStatusOut(subscription),
  });
}

function toStatusOut(row: typeof schema.subscriptions.$inferSelect): SubscriptionStatusOut {
  return {
    tier: row.tier as SubscriptionStatusOut["tier"],
    period: row.period as SubscriptionStatusOut["period"],
    expires_at: row.expiresAt.toISOString(),
    is_trial: row.isTrial,
    status: row.status as SubscriptionStatusOut["status"],
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
