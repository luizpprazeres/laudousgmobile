/**
 * App Store Server Notifications v2 — processamento de um payload JÁ
 * VERIFICADO. Sem banco nem rede diretos: recebe o repositório e as funções
 * de verificação por injeção, para o gate sintético rodar em memória.
 *
 * Quem é o dono da assinatura notificada? A ordem é:
 *   1. a linha existente com o mesmo `original_transaction_id` (posse já
 *      estabelecida pelo app);
 *   2. senão, o `appAccountToken` da transação, SE existir um perfil com esse
 *      id — cobre o caso em que o app não conseguiu chamar
 *      `/api/iap/validate-receipt` (sem rede na hora da compra) e a Apple
 *      avisa primeiro;
 *   3. senão, é uma assinatura que não conseguimos atribuir: registra e
 *      responde 200 (a Apple reentregaria 5 vezes e nada mudaria).
 *
 * A regra de posse do domínio continua valendo: token ≠ dono ⇒ recusa.
 */

import type { NotificationJournal } from "./notificationJournal";
import type {
  JWSRenewalInfoDecodedPayload,
  JWSTransactionDecodedPayload,
  ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import {
  applyTransaction,
  normalizeUuid,
  type ApplyOutcome,
  type SubscriptionRepo,
} from "./entitlement";

export type NotificationOutcome =
  | { kind: "test" }
  | { kind: "ignored"; reason: string }
  | { kind: "unassigned"; originalTransactionId: string }
  | { kind: "processed"; notificationType: string; apply: ApplyOutcome; userId: string };

export type ProcessNotificationArgs = {
  payload: ResponseBodyV2DecodedPayload;
  environment: string;
  repo: SubscriptionRepo;
  verifyTransaction: (jws: string) => Promise<JWSTransactionDecodedPayload>;
  verifyRenewalInfo: (jws: string) => Promise<JWSRenewalInfoDecodedPayload>;
  now?: Date;
  journal?: NotificationJournal;
};

export async function processNotification(args: ProcessNotificationArgs): Promise<NotificationOutcome> {
  const { payload } = args;
  const notificationType = String(payload.notificationType ?? "");
  async function journal(tx?: JWSTransactionDecodedPayload, renewal?: JWSRenewalInfoDecodedPayload | null, userId: string | null = null) {
    if (!args.journal) return;
    if (!payload.notificationUUID || !notificationType) throw new Error("iap_notification_missing_identity");
    const iso = (n?: number) => n != null && Number.isFinite(n) ? new Date(n).toISOString() : null;
    await args.journal.record({ notification_uuid: payload.notificationUUID, notification_type: notificationType,
      subtype: payload.subtype ? String(payload.subtype) : null, signed_date: iso(payload.signedDate),
      environment: args.environment, user_id: userId, original_tx_id: tx?.originalTransactionId ?? null,
      product_id: tx?.productId ?? null, offer_type: tx?.offerType ?? null, offer_discount_type: tx?.offerDiscountType ?? null,
      price_milli: tx?.price ?? null, currency: tx?.currency ?? null, auto_renew_status: renewal?.autoRenewStatus ?? null,
      expires_at: iso(tx?.expiresDate) });
  }
  async function done<T extends NotificationOutcome>(outcome: T): Promise<T> {
    if (args.journal) await args.journal.result(payload.notificationUUID!, outcome.kind === "processed" ? outcome.apply.kind : outcome.kind);
    return outcome;
  }
  if (notificationType === "TEST") { await journal(); return done({ kind: "test" }); }

  const signedTx = payload.data?.signedTransactionInfo;
  if (!signedTx) {
    await journal();
    return done({ kind: "ignored", reason: `sem signedTransactionInfo (${notificationType || "sem tipo"})` });
  }

  const tx = await args.verifyTransaction(signedTx);
  const renewal = payload.data?.signedRenewalInfo
    ? await args.verifyRenewalInfo(payload.data.signedRenewalInfo)
    : null;

  if (!tx.originalTransactionId) {
    await journal(tx, renewal);
    return done({ kind: "ignored", reason: "transação sem originalTransactionId" });
  }

  const existing = await args.repo.findByOriginalTxId(tx.originalTransactionId);
  let userId: string | null = existing?.userId ?? null;
  if (!userId) {
    const token = normalizeUuid(tx.appAccountToken);
    if (token && (await args.repo.profileExists(token))) userId = token;
  }
  await journal(tx, renewal, userId);
  if (!userId) {
    return done({ kind: "unassigned", originalTransactionId: tx.originalTransactionId });
  }

  try {
    const apply = await applyTransaction({
      repo: args.repo,
      userId,
      tx,
      renewal,
      environment: args.environment,
      now: args.now,
      eventSignedDate: payload.signedDate,
      hint: {
        notificationType,
        subtype: payload.subtype ? String(payload.subtype) : undefined,
      },
    });
    return await done({ kind: "processed", notificationType, apply, userId });
  } catch (error) {
    // Append delivery failure without editing the verified fact; Apple retries the domain operation.
    try { await args.journal?.result(payload.notificationUUID!, "error"); } catch { /* Preserve original failure. */ }
    throw error;
  }
}
