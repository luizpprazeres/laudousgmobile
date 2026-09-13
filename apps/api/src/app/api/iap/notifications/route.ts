/**
 * POST /api/iap/notifications — App Store Server Notifications v2.
 *
 * A Apple assina o `signedPayload` inteiro; sem verificar a assinatura,
 * qualquer um poderia expirar ou "renovar" assinaturas alheias com um POST.
 * Agora: `SignedDataVerifier` oficial (raízes Apple, bundle, appAppleId,
 * ambiente) e, dentro do payload, a transação e o renewal info são
 * verificados de novo, cada um com a própria assinatura.
 *
 * Códigos HTTP e reentrega da Apple (ela reenvia quando não recebe 200):
 *   200 — processada, ignorada, sem dono conhecido, ou TEST.
 *   400 — corpo sem `signedPayload`.
 *   401 — assinatura inválida / app ou ambiente errado. Definitivo; a Apple
 *         ainda reenviaria, e será recusado de novo, o que é o desejado.
 *   503 — OCSP ou banco indisponível. QUEREMOS a reentrega.
 *
 * `APPLE_NOTIFICATION_SECRET` (opcional): se definido, exige `?secret=` na
 * URL configurada no App Store Connect. Defesa extra contra ruído; a
 * autenticidade vem da assinatura.
 */

import { env } from "@/server/env";
import { processNotification } from "@/server/iap/notifications";
import { getSubscriptionRepo } from "@/server/iap/repo";
import { AppleVerificationError, getAppleVerifier } from "@/server/iap/verifier";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const secret = env().APPLE_NOTIFICATION_SECRET;
  if (secret) {
    const provided = new URL(req.url).searchParams.get("secret");
    if (provided !== secret) return json({ error: "unauthorized" }, 401);
  }

  let body: { signedPayload?: unknown };
  try {
    body = (await req.json()) as { signedPayload?: unknown };
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (typeof body.signedPayload !== "string" || body.signedPayload.length < 50) {
    return json({ error: "missing_signed_payload" }, 400);
  }

  let verifier;
  let verified;
  try {
    verifier = getAppleVerifier();
    verified = await verifier.verifyNotification(body.signedPayload);
  } catch (error) {
    if (error instanceof AppleVerificationError) {
      console.warn(
        JSON.stringify({ evento: "IAP_NOTIFICACAO_RECUSADA", code: error.code, status: error.status }),
      );
      return error.retryable
        ? json({ error: "verification_unavailable", retryable: true }, 503)
        : json({ error: error.code }, 401);
    }
    console.error("[iap] verificador indisponível", error);
    return json({ error: "verifier_unavailable", retryable: true }, 503);
  }

  const environment = verified.environment;
  try {
    const outcome = await processNotification({
      payload: verified.payload,
      environment,
      repo: getSubscriptionRepo(),
      verifyTransaction: async (jws) => (await verifier.verifyTransaction(jws)).payload,
      verifyRenewalInfo: (jws) => verifier.verifyRenewalInfo(jws, environment),
    });

    console.log(
      JSON.stringify({
        evento: "IAP_NOTIFICACAO",
        notificationUUID: verified.payload.notificationUUID ?? null,
        notificationType: verified.payload.notificationType ?? null,
        subtype: verified.payload.subtype ?? null,
        environment,
        resultado: outcome.kind,
        ...(outcome.kind === "processed"
          ? { userId: outcome.userId, apply: outcome.apply.kind }
          : {}),
        ...(outcome.kind === "unassigned"
          ? { originalTransactionId: outcome.originalTransactionId }
          : {}),
        ...(outcome.kind === "ignored" ? { motivo: outcome.reason } : {}),
      }),
    );
    return json({ ok: true, outcome: outcome.kind });
  } catch (error) {
    if (error instanceof AppleVerificationError) {
      // Transação/renewal dentro do envelope falhou na própria assinatura.
      console.warn(
        JSON.stringify({ evento: "IAP_NOTIFICACAO_CONTEUDO_RECUSADO", code: error.code, status: error.status }),
      );
      return error.retryable
        ? json({ error: "verification_unavailable", retryable: true }, 503)
        : json({ error: error.code }, 401);
    }
    console.error(
      JSON.stringify({
        evento: "IAP_NOTIFICACAO_FALHA",
        motivo: error instanceof Error ? error.message : String(error),
      }),
    );
    // 5xx de propósito: a Apple reentrega.
    return json({ error: "storage_unavailable", retryable: true }, 503);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
