import { z } from "zod";

export const ValidateReceiptRequestSchema = z.object({
  signedTransactionJwt: z.string().min(50),
});

export type SubscriptionTier = "essencial" | "pro";
export type SubscriptionPeriod = "monthly" | "yearly";
export type SubscriptionStatus =
  | "active"
  | "expired"
  | "grace"
  | "cancelled"
  | "refunded";

export type AppleSignedTransactionPayload = {
  originalTransactionId: string;
  transactionId: string;
  productId: string;
  expiresDate: number;
  type?: string;
  offerType?: number | string;
};

export const AppleNotificationPayloadSchema = z.object({
  notificationType: z.string(),
  subtype: z.string().optional(),
  data: z.object({
    signedTransactionInfo: z.string(),
    signedRenewalInfo: z.string().optional(),
  }),
});

export type AppleNotificationPayload = z.infer<
  typeof AppleNotificationPayloadSchema
>;

export type SubscriptionStatusOut = {
  tier: SubscriptionTier;
  period: SubscriptionPeriod;
  expires_at: string;
  is_trial: boolean;
  status: SubscriptionStatus;
};

export function parseProductId(
  productId: string,
): { tier: SubscriptionTier; period: SubscriptionPeriod } | null {
  const match = productId.match(/^laudousg\.(essencial|pro)\.(monthly|yearly)$/);
  if (!match) return null;
  return {
    tier: match[1] as SubscriptionTier,
    period: match[2] as SubscriptionPeriod,
  };
}

export function isIntroOffer(offerType: number | string | undefined): boolean {
  return offerType === 1 || offerType === "INTRODUCTORY";
}
