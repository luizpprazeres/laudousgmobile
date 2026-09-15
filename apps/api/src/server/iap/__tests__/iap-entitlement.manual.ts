/**
 * GATE — domínio do IAP: posse, idempotência, expiração/revogação e plano
 * efetivo (o plano web NUNCA é sobrescrito).
 *
 *   tsx --tsconfig apps/api/tsconfig.json apps/api/src/server/iap/__tests__/iap-entitlement.manual.ts
 */

import {
  applyTransaction,
  bestEntitledTier,
  checkOwnership,
  deriveState,
  pickEntitledSubscription,
  resolveEffectivePlan,
  type ProfilePlan,
} from "../entitlement";
import type { SubscriptionTier } from "../types";
import { check, finish, section } from "./harness";
import { DAY, HOUR, USER_A, USER_B, renewal, tx } from "./fixtures";
import { MemorySubscriptionRepo } from "./memoryRepo";

async function main() {
  const now = Date.now();
  const agora = new Date(now);

  section("Plano efetivo = max(web, Apple) — web nunca é sobrescrito");
  const matriz: [ProfilePlan, SubscriptionTier | null, ProfilePlan][] = [
    ["free", null, "free"],
    ["free", "essencial", "essencial"],
    ["free", "pro", "clinic"],
    ["essencial", "essencial", "essencial"],
    ["essencial", "pro", "clinic"],
    ["pro", "essencial", "pro"], // 'pro' do site = Essencial; empate mantém o do site
    ["pro", "pro", "clinic"],
    ["clinic", "essencial", "clinic"],
    ["clinic", "pro", "clinic"],
    ["clinic", null, "clinic"],
    ["pro", null, "pro"],
  ];
  for (const [web, apple, esperado] of matriz) {
    const r = resolveEffectivePlan(web, apple);
    check(`web=${web} + apple=${apple ?? "—"} ⇒ ${esperado}`, r === esperado, r);
  }

  section("Posse (appAccountToken)");
  check("sem token ⇒ missing_app_account_token",
    checkOwnership({ tx: tx(now, { appAccountToken: undefined }), userId: USER_A, existing: null }) === "missing_app_account_token");
  check("token de A enviado por B ⇒ app_account_token_mismatch",
    checkOwnership({ tx: tx(now), userId: USER_B, existing: null }) === "app_account_token_mismatch");
  check("token igual ao usuário ⇒ ok",
    checkOwnership({ tx: tx(now), userId: USER_A, existing: null }) === null);
  check("token em MAIÚSCULAS ainda casa",
    checkOwnership({ tx: tx(now, { appAccountToken: USER_A.toUpperCase() }), userId: USER_A, existing: null }) === null);
  check("token que não é UUID ⇒ missing_app_account_token",
    checkOwnership({ tx: tx(now, { appAccountToken: "nao-e-uuid" }), userId: USER_A, existing: null }) === "missing_app_account_token");

  section("applyTransaction — compra, idempotência, transferência");
  const repo = new MemorySubscriptionRepo();
  const compra = tx(now);
  const r1 = await applyTransaction({ repo, userId: USER_A, tx: compra, environment: "Sandbox", now: agora });
  check("1ª compra ⇒ applied/changed", r1.kind === "applied" && r1.changed, r1);
  check("linha criada com posse", repo.rows.length === 1 && repo.rows[0]!.userId === USER_A && repo.rows[0]!.appAccountToken === USER_A);
  check("status active e tier pro", repo.rows[0]!.status === "active" && repo.rows[0]!.tier === "pro");

  const r2 = await applyTransaction({ repo, userId: USER_A, tx: compra, environment: "Sandbox", now: agora });
  check("reenvio idêntico (login/restore) ⇒ applied/changed=false", r2.kind === "applied" && !r2.changed, r2);
  check("reenvio não cria 2ª linha", repo.rows.length === 1);

  // B pega o JWS de A (mesmo appAccountToken=A) e tenta registrar na própria conta.
  const r3 = await applyTransaction({ repo, userId: USER_B, tx: compra, environment: "Sandbox", now: agora });
  check("B com JWS de A ⇒ rejected app_account_token_mismatch", r3.kind === "rejected" && r3.reason === "app_account_token_mismatch", r3);
  check("linha continua de A (sem transferência)", repo.rows[0]!.userId === USER_A);

  // B forja token=B na MESMA originalTransactionId de A (só possível com JWS forjado — mas o domínio também barra).
  const r4 = await applyTransaction({ repo, userId: USER_B, tx: tx(now, { appAccountToken: USER_B }), environment: "Sandbox", now: agora });
  check("mesma assinatura com token de B ⇒ rejected owned_by_other_account", r4.kind === "rejected" && r4.reason === "owned_by_other_account", r4);
  check("linha continua de A", repo.rows[0]!.userId === USER_A && repo.rows.length === 1);

  const r5 = await applyTransaction({ repo, userId: USER_A, tx: tx(now, { productId: "com.laudousg.LaudoUSG.desconhecido" }), environment: "Sandbox", now: agora });
  check("produto desconhecido ⇒ rejected invalid_product", r5.kind === "rejected" && r5.reason === "invalid_product");

  section("Renovação, reenvio atrasado (stale) e upgrade");
  const renov = tx(now, { transactionId: "2000000900000002", purchaseDate: now + 30 * DAY, expiresDate: now + 60 * DAY, transactionReason: "RENEWAL" });
  const r6 = await applyTransaction({ repo, userId: USER_A, tx: renov, environment: "Sandbox", now: agora });
  check("renovação ⇒ applied/changed com novo expires", r6.kind === "applied" && r6.changed && repo.rows[0]!.expiresAt.getTime() === now + 60 * DAY);
  check("appleLatestTxId avança", repo.rows[0]!.appleLatestTxId === "2000000900000002");
  const r7 = await applyTransaction({ repo, userId: USER_A, tx: compra, environment: "Sandbox", now: agora });
  check("reenvio da compra ORIGINAL depois da renovação ⇒ stale", r7.kind === "stale");
  check("stale não regride expires nem latestTx", repo.rows[0]!.expiresAt.getTime() === now + 60 * DAY && repo.rows[0]!.appleLatestTxId === "2000000900000002");

  // Upgrade Essencial → Pro: nova assinatura (outro originalTransactionId) e a antiga marcada isUpgraded.
  const repoUp = new MemorySubscriptionRepo();
  await applyTransaction({ repo: repoUp, userId: USER_A, environment: "Sandbox", now: agora,
    tx: tx(now, { originalTransactionId: "3000", transactionId: "3000", productId: "com.laudousg.LaudoUSG.essential.monthly" }) });
  await applyTransaction({ repo: repoUp, userId: USER_A, environment: "Sandbox", now: agora,
    tx: tx(now, { originalTransactionId: "3001", transactionId: "3001", productId: "com.laudousg.LaudoUSG.pro.monthly" }) });
  check("upgrade ⇒ tier efetivo pro", bestEntitledTier(await repoUp.listForUser(USER_A), agora) === "pro");
  check("melhor assinatura é a pro", pickEntitledSubscription(await repoUp.listForUser(USER_A), agora)?.appleOriginalTxId === "3001");

  section("Expiração — o plano web sobrevive");
  const repoExp = new MemorySubscriptionRepo();
  const vencida = tx(now, { purchaseDate: now - 40 * DAY, expiresDate: now - 10 * DAY });
  const r8 = await applyTransaction({ repo: repoExp, userId: USER_A, tx: vencida, environment: "Sandbox", now: agora });
  check("transação vencida ⇒ status expired", r8.kind === "applied" && r8.subscription.status === "expired");
  check("vencida não dá acesso", bestEntitledTier(await repoExp.listForUser(USER_A), agora) === null);
  check("web=clinic + apple expirada ⇒ clinic (intacto)", resolveEffectivePlan("clinic", bestEntitledTier(await repoExp.listForUser(USER_A), agora)) === "clinic");
  check("web=pro + apple expirada ⇒ pro (intacto)", resolveEffectivePlan("pro", null) === "pro");
  check("linha active mas relógio já passou de expires ⇒ sem acesso (decidido pelo relógio, não pelo status)",
    bestEntitledTier([{ ...repoExp.rows[0]!, status: "active" }], agora) === null);

  section("Grace period");
  const s1 = deriveState(vencida, renewal(now, { gracePeriodExpiresDate: now + 6 * DAY, isInBillingRetryPeriod: true }), agora);
  check("vencida + grace futuro ⇒ grace até o fim do grace", s1.status === "grace" && s1.expiresAt.getTime() === now + 6 * DAY);
  check("grace dá acesso", bestEntitledTier([{ ...repoExp.rows[0]!, status: s1.status, expiresAt: s1.expiresAt }], agora) === "pro");
  const s2 = deriveState(vencida, renewal(now, { gracePeriodExpiresDate: now - HOUR }), agora);
  check("grace já passado ⇒ expired", s2.status === "expired");
  const s3 = deriveState(vencida, renewal(now, { gracePeriodExpiresDate: now + 6 * DAY }), agora, { notificationType: "GRACE_PERIOD_EXPIRED" });
  check("GRACE_PERIOD_EXPIRED força expired mesmo com data futura", s3.status === "expired");

  section("Revogação / reembolso");
  const repoRef = new MemorySubscriptionRepo();
  await applyTransaction({ repo: repoRef, userId: USER_A, tx: compra, environment: "Sandbox", now: agora });
  const reembolsada = tx(now, { revocationDate: now - HOUR, revocationReason: 0 });
  const r9 = await applyTransaction({ repo: repoRef, userId: USER_A, tx: reembolsada, environment: "Sandbox", now: agora });
  check("revocationDate ⇒ refunded", r9.kind === "applied" && r9.subscription.status === "refunded");
  check("reembolsada não dá acesso", bestEntitledTier(await repoRef.listForUser(USER_A), agora) === null);
  check("web=essencial + apple reembolsada ⇒ essencial (intacto)", resolveEffectivePlan("essencial", null) === "essencial");
  await applyTransaction({ repo: repoRef, userId: USER_A, tx: compra, environment: "Sandbox", now: agora });
  check("replay do JWS anterior ao reembolso nao reativa", repoRef.rows[0]!.status === "refunded");
  await applyTransaction({ repo: repoRef, userId: USER_A, tx: tx(now, { signedDate: now + HOUR }), environment: "Sandbox", now: agora,
    hint: { notificationType: "REFUND_REVERSED" }, eventSignedDate: now + HOUR });
  check("reversao assinada posterior permite restaurar", repoRef.rows[0]!.status === "active");
  const s4 = deriveState(tx(now), null, agora, { notificationType: "REFUND" });
  check("hint REFUND força refunded mesmo sem revocationDate", s4.status === "refunded");
  // Reembolso de um período ANTERIOR não derruba o período vigente.
  const repoRefOld = new MemorySubscriptionRepo();
  await applyTransaction({ repo: repoRefOld, userId: USER_A, tx: compra, environment: "Sandbox", now: agora });
  await applyTransaction({ repo: repoRefOld, userId: USER_A, tx: renov, environment: "Sandbox", now: agora });
  const r10 = await applyTransaction({ repo: repoRefOld, userId: USER_A, tx: tx(now, { revocationDate: now }), environment: "Sandbox", now: agora });
  check("reembolso da transação ANTIGA ⇒ stale, vigente segue active", r10.kind === "stale" && repoRefOld.rows[0]!.status === "active");

  section("Trial");
  check("offerType=1 ⇒ isTrial", deriveState(tx(now, { offerType: 1, offerDiscountType: "FREE_TRIAL" }), null, agora).isTrial);
  check("sem oferta ⇒ !isTrial", !deriveState(tx(now), null, agora).isTrial);
  check("oferta introdutoria paga nao e trial", !deriveState(tx(now, { offerType: 1, offerDiscountType: "PAY_AS_YOU_GO" }), null, agora).isTrial);

  section("Eventos simultaneos e grace preservado no restore");
  const repoConcurrent = new MemorySubscriptionRepo();
  await applyTransaction({ repo: repoConcurrent, userId: USER_A, tx: compra, environment: "Sandbox", now: agora });
  const newest = tx(now, { transactionId: "newest", purchaseDate: now + 60 * DAY, expiresDate: now + 90 * DAY });
  repoConcurrent.beforeUpdate = async () => {
    repoConcurrent.beforeUpdate = null;
    await applyTransaction({ repo: repoConcurrent, userId: USER_A, tx: newest, environment: "Sandbox", now: agora });
  };
  await applyTransaction({ repo: repoConcurrent, userId: USER_A, tx: renov, environment: "Sandbox", now: agora });
  check("update atrasado nao sobrescreve renovacao concorrente", repoConcurrent.rows[0]!.appleLatestTxId === "newest");
  const repoGrace = new MemorySubscriptionRepo();
  await applyTransaction({ repo: repoGrace, userId: USER_A, tx: vencida, renewal: renewal(now, { gracePeriodExpiresDate: now + DAY }), environment: "Sandbox", now: agora });
  await applyTransaction({ repo: repoGrace, userId: USER_A, tx: vencida, environment: "Sandbox", now: agora });
  check("restore sem renewal info nao remove grace vigente", repoGrace.rows[0]!.status === "grace");
  const shortened = tx(now, { transactionId: "upgrade", purchaseDate: now + HOUR, expiresDate: now + DAY });
  const repoShort = new MemorySubscriptionRepo();
  await applyTransaction({ repo: repoShort, userId: USER_A, tx: compra, environment: "Sandbox", now: agora });
  await applyTransaction({ repo: repoShort, userId: USER_A, tx: shortened, environment: "Sandbox", now: agora });
  check("nova compra com periodo menor nao e descartada como antiga", repoShort.rows[0]!.appleLatestTxId === "upgrade");

  section("Corrida: duas chamadas inserindo a mesma assinatura");
  const repoRace = new MemorySubscriptionRepo();
  let disparou = false;
  repoRace.beforeInsert = async (values) => {
    if (disparou) return;
    disparou = true;
    repoRace.beforeInsert = null;
    // "Outra requisição" de A insere primeiro.
    await repoRace.insert({ ...values });
  };
  const r11 = await applyTransaction({ repo: repoRace, userId: USER_A, tx: compra, environment: "Sandbox", now: agora });
  check("conflito de insert reavaliado ⇒ applied sem 2ª linha", r11.kind === "applied" && repoRace.rows.length === 1, r11);
  const repoRace2 = new MemorySubscriptionRepo();
  disparou = false;
  repoRace2.beforeInsert = async (values) => {
    if (disparou) return;
    disparou = true;
    repoRace2.beforeInsert = null;
    await repoRace2.insert({ ...values, userId: USER_B, appAccountToken: USER_B });
  };
  const r12 = await applyTransaction({ repo: repoRace2, userId: USER_A, tx: compra, environment: "Sandbox", now: agora });
  check("conflito com linha de OUTRA conta ⇒ rejected owned_by_other_account", r12.kind === "rejected" && r12.reason === "owned_by_other_account" && repoRace2.rows[0]!.userId === USER_B);

  finish();
}

main().catch((e) => {
  console.error("✗ gate abortou:", e);
  process.exit(1);
});
