import { z } from "zod";

export const ValidateReceiptRequestSchema = z.object({
  signedTransactionJwt: z.string().min(50),
});

export type SubscriptionTier = "essencial" | "pro";
export type SubscriptionPeriod = "monthly" | "yearly";
/**
 * `cancelled` existe no CHECK do banco mas não é escrito por este código: uma
 * assinatura com auto-renovação desligada continua ATIVA até `expires_at`.
 * Quem dá acesso é o par (status ∈ {active, grace}) + `expires_at` no futuro.
 */
export type SubscriptionStatus =
  | "active"
  | "expired"
  | "grace"
  | "cancelled"
  | "refunded";

export type SubscriptionStatusOut = {
  tier: SubscriptionTier;
  period: SubscriptionPeriod;
  expires_at: string;
  is_trial: boolean;
  status: SubscriptionStatus;
  environment: string;
};

export function parseProductId(
  productId: string,
): { tier: SubscriptionTier; period: SubscriptionPeriod } | null {
  // IDs reais no App Store Connect: com.laudousg.LaudoUSG.<tier>.<period>
  // (tier em inglês "essential"). Legado aceito: laudousg.<tier>.<period> ("essencial").
  const match = productId.match(
    /^(?:com\.laudousg\.LaudoUSG|laudousg)\.(essential|essencial|pro)\.(monthly|yearly)$/,
  );
  if (!match) return null;
  const tier: SubscriptionTier =
    match[1] === "essential" ? "essencial" : (match[1] as SubscriptionTier);
  return {
    tier,
    period: match[2] as SubscriptionPeriod,
  };
}

export function isIntroOffer(offerType: number | string | undefined): boolean {
  return offerType === 1 || offerType === "INTRODUCTORY";
}
