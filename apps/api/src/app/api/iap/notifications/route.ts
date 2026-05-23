import { eq } from "drizzle-orm";
import { getDbClient, schema } from "@laudousg/db";
import { decodeJws } from "@/server/iap/jws";
import {
  AppleNotificationPayloadSchema,
  isIntroOffer,
  parseProductId,
  type AppleSignedTransactionPayload,
  type SubscriptionStatus,
} from "@/server/iap/types";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { signedPayload?: unknown };
    if (typeof body.signedPayload !== "string") {
      console.log("[iap] notification missing signedPayload");
      return json({ ok: true });
    }

    const notificationRaw = decodeJws<unknown>(body.signedPayload);
    const notification = AppleNotificationPayloadSchema.safeParse(notificationRaw);
    if (!notification.success) {
      console.log("[iap] invalid notification payload", notification.error.format());
      return json({ ok: true });
    }

    const tx = decodeJws<AppleSignedTransactionPayload>(
      notification.data.data.signedTransactionInfo,
    );
    const product = parseProductId(tx.productId);
    if (!product) {
      console.log("[iap] notification invalid product", tx.productId);
      return json({ ok: true });
    }

    await handleNotification({
      notificationType: notification.data.notificationType,
      tx,
      tier: product.tier,
      period: product.period,
    });

    return json({ ok: true });
  } catch (error) {
    console.log("[iap] notification failure", error);
    return json({ ok: true });
  }
}

async function handleNotification(args: {
  notificationType: string;
  tx: AppleSignedTransactionPayload;
  tier: "essencial" | "pro";
  period: "monthly" | "yearly";
}) {
  switch (args.notificationType) {
    case "SUBSCRIBED":
    case "DID_RENEW":
      await upsertKnownSubscription(args, "active");
      break;
    case "EXPIRED":
    case "DID_FAIL_TO_RENEW":
      await updateKnownSubscription(args.tx.originalTransactionId, "expired");
      break;
    case "REFUND":
      await updateKnownSubscription(args.tx.originalTransactionId, "refunded", true);
      break;
    case "GRACE_PERIOD_EXPIRED":
      await updateKnownSubscription(args.tx.originalTransactionId, "grace");
      break;
    case "DID_CHANGE_RENEWAL_PREF":
    case "DID_CHANGE_RENEWAL_STATUS":
    case "PRICE_INCREASE":
      console.log("[iap] notification log only", args.notificationType);
      break;
    default:
      console.log("[iap] notification ignored", args.notificationType);
  }
}

async function upsertKnownSubscription(
  args: {
    tx: AppleSignedTransactionPayload;
    tier: "essencial" | "pro";
    period: "monthly" | "yearly";
  },
  status: SubscriptionStatus,
) {
  const db = getDbClient();
  const [existing] = await db
    .select()
    .from(schema.subscriptions)
    .where(
      eq(
        schema.subscriptions.appleOriginalTxId,
        args.tx.originalTransactionId,
      ),
    )
    .limit(1);

  if (!existing) {
    console.log("[iap] notification for unknown subscription", args.tx.originalTransactionId);
    return;
  }

  await db
    .update(schema.subscriptions)
    .set({
      productId: args.tx.productId,
      tier: args.tier,
      period: args.period,
      appleLatestTxId: args.tx.transactionId,
      expiresAt: new Date(args.tx.expiresDate),
      isTrial: isIntroOffer(args.tx.offerType),
      status,
      updatedAt: new Date(),
    })
    .where(eq(schema.subscriptions.id, existing.id));

  if (status === "active") {
    await db
      .update(schema.profiles)
      .set({ plan: args.tier, updatedAt: new Date() })
      .where(eq(schema.profiles.id, existing.userId));
  }
}

async function updateKnownSubscription(
  originalTransactionId: string,
  status: SubscriptionStatus,
  downgradeProfile = false,
) {
  const db = getDbClient();
  const [subscription] = await db
    .update(schema.subscriptions)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.subscriptions.appleOriginalTxId, originalTransactionId))
    .returning();

  if (!subscription) {
    console.log("[iap] status for unknown subscription", originalTransactionId);
    return;
  }

  if (downgradeProfile) {
    await db
      .update(schema.profiles)
      .set({ plan: "free", updatedAt: new Date() })
      .where(eq(schema.profiles.id, subscription.userId));
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
