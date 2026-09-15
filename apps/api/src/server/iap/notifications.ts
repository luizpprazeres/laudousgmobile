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
};

export async function processNotification(args: ProcessNotificationArgs): Promise<NotificationOutcome> {
  const { payload } = args;
  const notificationType = String(payload.notificationType ?? "");
  if (notificationType === "TEST") return { kind: "test" };

  const signedTx = payload.data?.signedTransactionInfo;
  if (!signedTx) {
    return { kind: "ignored", reason: `sem signedTransactionInfo (${notificationType || "sem tipo"})` };
  }

  const tx = await args.verifyTransaction(signedTx);
  const renewal = payload.data?.signedRenewalInfo
    ? await args.verifyRenewalInfo(payload.data.signedRenewalInfo)
    : null;

  if (!tx.originalTransactionId) {
    return { kind: "ignored", reason: "transação sem originalTransactionId" };
  }

  const existing = await args.repo.findByOriginalTxId(tx.originalTransactionId);
  let userId: string | null = existing?.userId ?? null;
  if (!userId) {
    const token = normalizeUuid(tx.appAccountToken);
    if (token && (await args.repo.profileExists(token))) userId = token;
  }
  if (!userId) {
    return { kind: "unassigned", originalTransactionId: tx.originalTransactionId };
  }

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
  return { kind: "processed", notificationType, apply, userId };
}
