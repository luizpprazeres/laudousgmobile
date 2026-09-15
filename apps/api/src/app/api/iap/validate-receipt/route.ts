/**
 * POST /api/iap/validate-receipt — o app entrega o JWS da transação StoreKit 2.
 *
 * Contrato com o iOS (StoreManager.syncTransactionWithBackend):
 *   2xx  { ok: true, ... }         → o app dá `finish()` na transação.
 *   4xx  { error, retryable:false } → recusa definitiva (JWS inválido, produto
 *                                    desconhecido, posse de outra conta). O
 *                                    app NÃO finaliza; ressincroniza no próximo
 *                                    login/restore.
 *   503  { error, retryable:true }  → banco ou OCSP indisponível. O app NÃO
 *                                    finaliza e tenta de novo.
 *
 * A transação é verificada com a biblioteca oficial da Apple (assinatura,
 * cadeia até a raiz Apple, bundle, ambiente). A posse é provada pelo
 * `appAccountToken` = id do usuário autenticado. `profiles.plan` NÃO é
 * escrito: o plano efetivo é resolvido em leitura (ver entitlement.ts).
 */

import { eq } from "drizzle-orm";
import { getDbClient, schema } from "@laudousg/db";
import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import {
  applyTransaction,
  bestEntitledTier,
  resolveEffectivePlan,
  type ApplyRejection,
  type ProfilePlan,
  type SubscriptionRecord,
} from "@/server/iap/entitlement";
import { getSubscriptionRepo } from "@/server/iap/repo";
import { AppleVerificationError, getAppleVerifier } from "@/server/iap/verifier";
import { ValidateReceiptRequestSchema, type SubscriptionStatusOut } from "@/server/iap/types";
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

  let verified;
  try {
    verified = await getAppleVerifier().verifyTransaction(parsed.data.signedTransactionJwt);
  } catch (error) {
    if (error instanceof AppleVerificationError) {
      console.warn(
        JSON.stringify({
          evento: "IAP_JWS_RECUSADO",
          userId: user.id,
          code: error.code,
          status: error.status,
        }),
      );
      if (error.retryable) {
        return json({ error: "verification_unavailable", retryable: true }, 503);
      }
      return json({ error: error.code, retryable: false }, 422);
    }
    console.error("[iap] falha inesperada ao configurar o verificador", error);
    return json({ error: "verifier_unavailable", retryable: true }, 503);
  }

  const repo = getSubscriptionRepo();
  try {
    const outcome = await applyTransaction({
      repo,
      userId: user.id,
      tx: verified.payload,
      environment: verified.environment,
    });

    if (outcome.kind === "rejected") {
      console.warn(
        JSON.stringify({
          evento: "IAP_TRANSACAO_RECUSADA",
          userId: user.id,
          motivo: outcome.reason,
          originalTransactionId: verified.payload.originalTransactionId ?? null,
        }),
      );
      return json({ error: outcome.reason, retryable: false }, httpFor(outcome.reason));
    }

    const [profile] = await getDbClient()
      .select({ plan: schema.profiles.plan })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, user.id))
      .limit(1);
    const now = new Date();
    const appleTier = bestEntitledTier(await repo.listForUser(user.id), now);
    const plan = resolveEffectivePlan((profile?.plan ?? "free") as ProfilePlan, appleTier);

    return json({
      ok: true,
      outcome: outcome.kind,
      changed: outcome.kind === "applied" ? outcome.changed : false,
      subscription: toStatusOut(outcome.subscription),
      plan,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        evento: "IAP_PERSISTENCIA_INDISPONIVEL",
        userId: user.id,
        motivo: error instanceof Error ? error.message : String(error),
      }),
    );
    return json({ error: "storage_unavailable", retryable: true }, 503);
  }
}

function httpFor(reason: ApplyRejection): number {
  switch (reason) {
    case "owned_by_other_account":
      return 409;
    case "missing_app_account_token":
    case "app_account_token_mismatch":
      return 403;
    case "invalid_product":
    case "invalid_transaction":
      return 400;
  }
}

function toStatusOut(row: SubscriptionRecord): SubscriptionStatusOut {
  return {
    tier: row.tier,
    period: row.period,
    expires_at: row.expiresAt.toISOString(),
    is_trial: row.isTrial,
    status: row.status,
    environment: row.environment,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
