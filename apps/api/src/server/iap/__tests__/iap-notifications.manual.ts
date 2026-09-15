/**
 * GATE — App Store Server Notifications v2 (processamento pós-verificação):
 * renovação, expiração, reembolso, grace, "webhook antes do app" e
 * notificação para assinatura de outra conta.
 *
 *   tsx --tsconfig apps/api/tsconfig.json apps/api/src/server/iap/__tests__/iap-notifications.manual.ts
 */

import type {
  JWSRenewalInfoDecodedPayload,
  JWSTransactionDecodedPayload,
  ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import { applyTransaction, bestEntitledTier, resolveEffectivePlan } from "../entitlement";
import { processNotification } from "../notifications";
import { check, finish, section } from "./harness";
import { APP_APPLE_ID, BUNDLE_ID, DAY, HOUR, USER_A, USER_B, renewal, tx } from "./fixtures";
import { MemorySubscriptionRepo } from "./memoryRepo";

/**
 * Sem rede nem openssl aqui: a verificação criptográfica tem gate próprio
 * (iap-jws). Este injeta "verificadores" que só decodificam — o contrato do
 * processNotification é receber payloads JÁ verificados.
 */
function encode(obj: unknown): string {
  return `h.${Buffer.from(JSON.stringify(obj)).toString("base64url")}.s`;
}
function decode<T>(jws: string): T {
  return JSON.parse(Buffer.from(jws.split(".")[1]!, "base64url").toString("utf8")) as T;
}
const verifyTransaction = async (jws: string) => decode<JWSTransactionDecodedPayload>(jws);
const verifyRenewalInfo = async (jws: string) => decode<JWSRenewalInfoDecodedPayload>(jws);

function envelope(
  notificationType: string,
  transaction: JWSTransactionDecodedPayload,
  opts: { subtype?: string; renewal?: JWSRenewalInfoDecodedPayload } = {},
): ResponseBodyV2DecodedPayload {
  return {
    notificationType,
    subtype: opts.subtype,
    notificationUUID: `uuid-${notificationType}`,
    version: "2.0",
    signedDate: Date.now(),
    data: {
      appAppleId: APP_APPLE_ID,
      bundleId: BUNDLE_ID,
      environment: "Sandbox",
      signedTransactionInfo: encode(transaction),
      signedRenewalInfo: opts.renewal ? encode(opts.renewal) : undefined,
    },
  };
}

async function main() {
  const now = Date.now();
  const agora = new Date(now);
  const base = { environment: "Sandbox", verifyTransaction, verifyRenewalInfo, now: agora };

  section("TEST e envelopes sem transação");
  const repo0 = new MemorySubscriptionRepo();
  const t = await processNotification({ ...base, repo: repo0, payload: { notificationType: "TEST" } });
  check("TEST ⇒ test", t.kind === "test");
  const semTx = await processNotification({ ...base, repo: repo0, payload: { notificationType: "DID_CHANGE_RENEWAL_STATUS", data: { bundleId: BUNDLE_ID } } });
  check("sem signedTransactionInfo ⇒ ignored", semTx.kind === "ignored");

  section("Assinatura conhecida (registrada pelo app)");
  const repo = new MemorySubscriptionRepo();
  repo.profiles.add(USER_A);
  const compra = tx(now);
  await applyTransaction({ repo, userId: USER_A, tx: compra, environment: "Sandbox", now: agora });

  const renov = tx(now, { transactionId: "2000000900000002", expiresDate: now + 60 * DAY, transactionReason: "RENEWAL" });
  const renewedEnvelope = envelope("DID_RENEW", renov, { renewal: renewal(now) });
  const n1 = await processNotification({ ...base, repo, payload: renewedEnvelope });
  check("DID_RENEW ⇒ processed/applied", n1.kind === "processed" && n1.apply.kind === "applied" && n1.apply.changed);
  check("expires avançou", repo.rows[0]!.expiresAt.getTime() === now + 60 * DAY && repo.rows[0]!.status === "active");

  const n1b = await processNotification({ ...base, repo, payload: renewedEnvelope });
  check("DID_RENEW reentregue ⇒ applied/changed=false (idempotente)", n1b.kind === "processed" && n1b.apply.kind === "applied" && !n1b.apply.changed);

  const n2 = await processNotification({ ...base, repo, payload: envelope("DID_CHANGE_RENEWAL_STATUS", renov, { subtype: "AUTO_RENEW_DISABLED", renewal: renewal(now, { autoRenewStatus: 0 }) }) });
  check("cancelou a renovação ⇒ continua active até expirar", n2.kind === "processed" && repo.rows[0]!.status === "active");

  const depois = new Date(now + 61 * DAY);
  const n3 = await processNotification({ ...base, now: depois, repo, payload: envelope("EXPIRED", renov, { subtype: "VOLUNTARY" }) });
  check("EXPIRED ⇒ expired", n3.kind === "processed" && repo.rows[0]!.status === "expired");
  check("sem acesso após EXPIRED", bestEntitledTier(await repo.listForUser(USER_A), depois) === null);
  check("plano web 'pro' intacto após EXPIRED", resolveEffectivePlan("pro", bestEntitledTier(await repo.listForUser(USER_A), depois)) === "pro");

  section("Grace period via DID_FAIL_TO_RENEW");
  const repoG = new MemorySubscriptionRepo();
  await applyTransaction({ repo: repoG, userId: USER_A, tx: compra, environment: "Sandbox", now: agora });
  const venc = new Date(now + 30 * DAY + HOUR);
  const g1 = await processNotification({ ...base, now: venc, repo: repoG, payload: envelope("DID_FAIL_TO_RENEW", compra, { subtype: "GRACE_PERIOD", renewal: renewal(now, { isInBillingRetryPeriod: true, gracePeriodExpiresDate: now + 46 * DAY }) }) });
  check("DID_FAIL_TO_RENEW/GRACE_PERIOD ⇒ grace", g1.kind === "processed" && repoG.rows[0]!.status === "grace");
  check("grace mantém acesso", bestEntitledTier(await repoG.listForUser(USER_A), venc) === "pro");
  const g2 = await processNotification({ ...base, now: new Date(now + 47 * DAY), repo: repoG, payload: envelope("GRACE_PERIOD_EXPIRED", compra, { renewal: renewal(now, { gracePeriodExpiresDate: now + 46 * DAY }) }) });
  check("GRACE_PERIOD_EXPIRED ⇒ expired", g2.kind === "processed" && repoG.rows[0]!.status === "expired");

  section("Reembolso e revogação");
  const repoR = new MemorySubscriptionRepo();
  await applyTransaction({ repo: repoR, userId: USER_A, tx: compra, environment: "Sandbox", now: agora });
  const r1 = await processNotification({ ...base, repo: repoR, payload: envelope("REFUND", tx(now, { revocationDate: now, revocationReason: 0 })) });
  check("REFUND ⇒ refunded", r1.kind === "processed" && repoR.rows[0]!.status === "refunded");
  check("plano web 'clinic' intacto após REFUND", resolveEffectivePlan("clinic", bestEntitledTier(await repoR.listForUser(USER_A), agora)) === "clinic");
  const repoV = new MemorySubscriptionRepo();
  await applyTransaction({ repo: repoV, userId: USER_A, tx: compra, environment: "Sandbox", now: agora });
  const v1 = await processNotification({ ...base, repo: repoV, payload: envelope("REVOKE", tx(now, { revocationDate: now })) });
  check("REVOKE ⇒ refunded", v1.kind === "processed" && repoV.rows[0]!.status === "refunded");

  section("Webhook ANTES do app (app sem rede na compra)");
  const repoW = new MemorySubscriptionRepo();
  repoW.profiles.add(USER_A);
  const w1 = await processNotification({ ...base, repo: repoW, payload: envelope("SUBSCRIBED", compra, { subtype: "INITIAL_BUY" }) });
  check("SUBSCRIBED desconhecida com token de perfil existente ⇒ criada para o dono", w1.kind === "processed" && repoW.rows.length === 1 && repoW.rows[0]!.userId === USER_A);
  const w2 = await processNotification({ ...base, repo: new MemorySubscriptionRepo(), payload: envelope("SUBSCRIBED", compra) });
  check("token sem perfil correspondente ⇒ unassigned (200, sem linha)", w2.kind === "unassigned");
  const w3 = await processNotification({ ...base, repo: new MemorySubscriptionRepo(), payload: envelope("SUBSCRIBED", tx(now, { appAccountToken: undefined })) });
  check("sem token e desconhecida ⇒ unassigned", w3.kind === "unassigned");

  section("Posse no webhook");
  const repoP = new MemorySubscriptionRepo();
  repoP.profiles.add(USER_A);
  repoP.profiles.add(USER_B);
  await applyTransaction({ repo: repoP, userId: USER_A, tx: compra, environment: "Sandbox", now: agora });
  const p1 = await processNotification({ ...base, repo: repoP, payload: envelope("DID_RENEW", tx(now, { transactionId: "2000000900000009", expiresDate: now + 90 * DAY, appAccountToken: USER_B })) });
  check("renovação da assinatura de A com token de B ⇒ rejected, linha intacta",
    p1.kind === "processed" && p1.apply.kind === "rejected" && repoP.rows[0]!.userId === USER_A && repoP.rows[0]!.expiresAt.getTime() === now + 30 * DAY);

  finish();
}

main().catch((e) => {
  console.error("✗ gate abortou:", e);
  process.exit(1);
});
