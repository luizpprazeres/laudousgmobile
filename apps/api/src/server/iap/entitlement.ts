/**
 * DOMÍNIO DO IAP — decisões puras sobre assinaturas da App Store.
 *
 * Nada aqui toca banco nem rede: recebe um payload JÁ VERIFICADO
 * (`verifier.ts`) e um repositório abstrato, e decide. É o que os gates
 * sintéticos exercitam com um repositório em memória.
 *
 * As quatro regras que este módulo garante:
 *
 *  1. POSSE (ownership). Toda compra feita pelo app carrega
 *     `appAccountToken` = id do usuário Supabase (UUID) — definido no
 *     `product.purchase(options:)` do iOS e imutável pela vida da assinatura,
 *     inclusive renovações e restore em outro aparelho. Uma transação só é
 *     aceita para o usuário cujo id é igual ao token. Sem token: recusada. Já
 *     registrada para outra conta: recusada. Nunca se transfere uma
 *     assinatura entre contas — era exatamente o que o `onConflictDoUpdate`
 *     antigo fazia ao sobrescrever `user_id`.
 *
 *  2. IDEMPOTÊNCIA. A chave é `original_transaction_id`. Reenviar a mesma
 *     transação (login, restore, `Transaction.updates`, webhook) converge para
 *     o mesmo estado e responde igual. Uma transação MAIS ANTIGA que a já
 *     registrada (reenvio atrasado) não regride nada.
 *
 *  3. ESTADO derivado dos FATOS assinados, não do nome do evento:
 *     `revocationDate` → refunded; `expiresDate` no futuro → active; grace
 *     period vigente → grace; senão expired. O tipo da notificação só
 *     desempata (REFUND/REVOKE/GRACE_PERIOD_EXPIRED).
 *
 *  4. O PLANO WEB NUNCA É SOBRESCRITO. A Apple não escreve `profiles.plan`.
 *     O plano efetivo é resolvido em LEITURA: o maior entre o plano do site
 *     (`profiles.plan`, escrito pela AbacatePay) e a assinatura Apple vigente.
 *     Expirar ou reembolsar uma assinatura Apple só muda a linha dela — o que
 *     o médico comprou no site continua valendo.
 */

import type {
  JWSRenewalInfoDecodedPayload,
  JWSTransactionDecodedPayload,
} from "@apple/app-store-server-library";
import {
  parseProductId,
  type SubscriptionPeriod,
  type SubscriptionStatus,
  type SubscriptionTier,
} from "./types";

// ---------------------------------------------------------------------------
// Repositório (abstração sobre a tabela `subscriptions`)
// ---------------------------------------------------------------------------

export type SubscriptionRecord = {
  id: string;
  userId: string;
  productId: string;
  tier: SubscriptionTier;
  period: SubscriptionPeriod;
  appleOriginalTxId: string;
  appleLatestTxId: string;
  expiresAt: Date;
  isTrial: boolean;
  status: SubscriptionStatus;
  appAccountToken: string | null;
  environment: string;
  applePurchaseDate: Date | null;
  appleSignedDate: Date | null;
  revision: number;
};

export type NewSubscription = Omit<SubscriptionRecord, "id" | "revision">;

/** `userId` e `appleOriginalTxId` são imutáveis: posse não se edita. */
export type SubscriptionPatch = Partial<
  Omit<SubscriptionRecord, "id" | "userId" | "appleOriginalTxId" | "revision">
>;

/** Lançado por `insert` quando `apple_original_tx_id` já existe (corrida). */
export class SubscriptionConflictError extends Error {
  constructor(appleOriginalTxId: string) {
    super(`subscription já registrada: ${appleOriginalTxId}`);
    this.name = "SubscriptionConflictError";
  }
}

export interface SubscriptionRepo {
  findByOriginalTxId(appleOriginalTxId: string): Promise<SubscriptionRecord | null>;
  insert(values: NewSubscription): Promise<SubscriptionRecord>;
  update(id: string, patch: SubscriptionPatch, expectedRevision: number): Promise<SubscriptionRecord | null>;
  listForUser(userId: string): Promise<SubscriptionRecord[]>;
  profileExists(userId: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Plano efetivo (web ∨ Apple)
// ---------------------------------------------------------------------------

export type ProfilePlan = "free" | "essencial" | "pro" | "clinic";

/**
 * Ordem do plano do SITE. `pro` aqui é o Essencial do site (a AbacatePay grava
 * `pro` para o Essencial e `clinic` para o Profissional — ver
 * apps/web/src/lib/planos.ts). Empate mantém o valor do site como está.
 */
const WEB_RANK: Record<ProfilePlan, number> = { free: 0, essencial: 1, pro: 1, clinic: 2 };
const APPLE_RANK: Record<SubscriptionTier, number> = { essencial: 1, pro: 2 };

/**
 * Como um tier Apple aparece no campo `plan` do perfil. Pro → `clinic`, o
 * mesmo valor que o site usa para o Profissional: assim o iOS (`hasPro`
 * aceita `clinic`/`pro`) e a web rotulam "Profissional" sem ambiguidade.
 */
export function projectApplePlan(tier: SubscriptionTier): ProfilePlan {
  return tier === "pro" ? "clinic" : "essencial";
}

export function resolveEffectivePlan(
  webPlan: ProfilePlan,
  appleTier: SubscriptionTier | null,
): ProfilePlan {
  if (!appleTier) return webPlan;
  return APPLE_RANK[appleTier] > WEB_RANK[webPlan] ? projectApplePlan(appleTier) : webPlan;
}

/** Dá acesso: ativa ou em grace period, e ainda não venceu. */
export function isEntitling(record: SubscriptionRecord, now: Date): boolean {
  return (
    (record.status === "active" || record.status === "grace") &&
    record.expiresAt.getTime() > now.getTime()
  );
}

/** A assinatura que vale hoje: maior tier; empate, a que vence mais tarde. */
export function pickEntitledSubscription(
  records: SubscriptionRecord[],
  now: Date,
): SubscriptionRecord | null {
  let best: SubscriptionRecord | null = null;
  for (const r of records) {
    if (!isEntitling(r, now)) continue;
    if (
      !best ||
      APPLE_RANK[r.tier] > APPLE_RANK[best.tier] ||
      (APPLE_RANK[r.tier] === APPLE_RANK[best.tier] &&
        r.expiresAt.getTime() > best.expiresAt.getTime())
    ) {
      best = r;
    }
  }
  return best;
}

export function bestEntitledTier(records: SubscriptionRecord[], now: Date): SubscriptionTier | null {
  return pickEntitledSubscription(records, now)?.tier ?? null;
}

// ---------------------------------------------------------------------------
// Posse
// ---------------------------------------------------------------------------

export type OwnershipRejection =
  | "missing_app_account_token"
  | "app_account_token_mismatch"
  | "owned_by_other_account";

export function normalizeUuid(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v) ? v : null;
}

export function checkOwnership(args: {
  tx: JWSTransactionDecodedPayload;
  userId: string;
  existing: SubscriptionRecord | null;
}): OwnershipRejection | null {
  const token = normalizeUuid(args.tx.appAccountToken);
  if (!token) return "missing_app_account_token";
  if (token !== normalizeUuid(args.userId)) return "app_account_token_mismatch";
  if (args.existing && normalizeUuid(args.existing.userId) !== token) {
    return "owned_by_other_account";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

export type NotificationHint = {
  notificationType?: string;
  subtype?: string;
};

export type DerivedState = {
  status: SubscriptionStatus;
  expiresAt: Date;
  isTrial: boolean;
};

export function deriveState(
  tx: JWSTransactionDecodedPayload,
  renewal: JWSRenewalInfoDecodedPayload | null | undefined,
  now: Date,
  hint: NotificationHint = {},
): DerivedState {
  const isTrial = tx.offerDiscountType === "FREE_TRIAL";
  // Auto-renovável sempre tem expiresDate. Se faltar, fail-closed: vencida.
  const expiresAt = tx.expiresDate != null ? new Date(tx.expiresDate) : new Date(now.getTime());

  if (
    tx.revocationDate != null ||
    hint.notificationType === "REFUND" ||
    hint.notificationType === "REVOKE"
  ) {
    return { status: "refunded", expiresAt, isTrial };
  }
  if (tx.isUpgraded) return { status: "cancelled", expiresAt, isTrial };
  if (expiresAt.getTime() > now.getTime()) {
    return { status: "active", expiresAt, isTrial };
  }
  const grace = renewal?.gracePeriodExpiresDate;
  if (
    hint.notificationType !== "GRACE_PERIOD_EXPIRED" &&
    typeof grace === "number" &&
    grace > now.getTime()
  ) {
    return { status: "grace", expiresAt: new Date(grace), isTrial };
  }
  return { status: "expired", expiresAt, isTrial };
}

// ---------------------------------------------------------------------------
// Aplicação (idempotente)
// ---------------------------------------------------------------------------

export type ApplyRejection = OwnershipRejection | "invalid_product" | "invalid_transaction";

export type ApplyOutcome =
  | { kind: "applied"; changed: boolean; subscription: SubscriptionRecord }
  | { kind: "stale"; subscription: SubscriptionRecord }
  | { kind: "rejected"; reason: ApplyRejection };

export type ApplyArgs = {
  repo: SubscriptionRepo;
  userId: string;
  tx: JWSTransactionDecodedPayload;
  renewal?: JWSRenewalInfoDecodedPayload | null;
  environment: string;
  now?: Date;
  hint?: NotificationHint;
  eventSignedDate?: number;
};

/**
 * Uma transação chegando de qualquer canal (app ou webhook) passa por aqui.
 * Reenvio é no-op; reenvio ATRASADO (transação mais antiga que a registrada)
 * é `stale` e não regride nada.
 */
export async function applyTransaction(args: ApplyArgs): Promise<ApplyOutcome> {
  // Compare-and-swap: re-read after a competing app/webhook write.
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await applyTransactionOnce(args);
    if (result) return result;
  }
  throw new Error("subscription_concurrent_update_retry");
}

async function applyTransactionOnce(args: ApplyArgs): Promise<ApplyOutcome | null> {
  const { repo, tx } = args;
  const now = args.now ?? new Date();
  const product = parseProductId(tx.productId ?? "");
  if (!product) return { kind: "rejected", reason: "invalid_product" };
  if (!tx.originalTransactionId || !tx.transactionId ||
      !Number.isFinite(tx.purchaseDate) || !Number.isFinite(tx.signedDate) ||
      !Number.isFinite(tx.expiresDate)) {
    return { kind: "rejected", reason: "invalid_transaction" };
  }

  let existing = await repo.findByOriginalTxId(tx.originalTransactionId);
  const ownership = checkOwnership({ tx, userId: args.userId, existing });
  if (ownership) return { kind: "rejected", reason: ownership };

  const state = deriveState(tx, args.renewal, now, args.hint);
  const token = normalizeUuid(tx.appAccountToken);
  const applePurchaseDate = new Date(tx.purchaseDate!);
  const appleSignedDate = new Date(Math.max(tx.signedDate!, args.renewal?.signedDate ?? 0, args.eventSignedDate ?? 0));

  if (!existing) {
    try {
      const inserted = await repo.insert({
        userId: args.userId,
        productId: tx.productId!,
        tier: product.tier,
        period: product.period,
        appleOriginalTxId: tx.originalTransactionId,
        appleLatestTxId: tx.transactionId,
        expiresAt: state.expiresAt,
        isTrial: state.isTrial,
        status: state.status,
        appAccountToken: token,
        environment: args.environment,
        applePurchaseDate,
        appleSignedDate,
      });
      return { kind: "applied", changed: true, subscription: inserted };
    } catch (error) {
      if (!(error instanceof SubscriptionConflictError)) throw error;
      // Corrida: outra chamada inseriu primeiro. Reavalia posse contra a linha
      // que venceu — nunca sobrescreve.
      existing = await repo.findByOriginalTxId(tx.originalTransactionId);
      if (!existing) throw error;
      if (normalizeUuid(existing.userId) !== normalizeUuid(args.userId)) {
        return { kind: "rejected", reason: "owned_by_other_account" };
      }
    }
  }

  if (isStale(existing, tx, appleSignedDate)) {
    return { kind: "stale", subscription: existing };
  }

  if (existing.appleLatestTxId === tx.transactionId) {
    // A cached transaction lacks newer refund/grace facts from notifications.
    if (existing.status === "refunded" && state.status !== "refunded" &&
        args.hint?.notificationType !== "REFUND_REVERSED") {
      return { kind: "stale", subscription: existing };
    }
    if (existing.status === "cancelled" && !tx.isUpgraded) {
      return { kind: "stale", subscription: existing };
    }
    if (existing.status === "grace" && existing.expiresAt > now &&
        !args.renewal && !args.hint?.notificationType && state.status === "expired") {
      return { kind: "stale", subscription: existing };
    }
  }

  const patch: SubscriptionPatch = {
    productId: tx.productId!,
    tier: product.tier,
    period: product.period,
    appleLatestTxId: tx.transactionId,
    expiresAt: state.expiresAt,
    isTrial: state.isTrial,
    status: state.status,
    appAccountToken: token,
    environment: args.environment,
    applePurchaseDate,
    appleSignedDate,
  };
  if (!differs(existing, patch)) {
    return { kind: "applied", changed: false, subscription: existing };
  }
  const updated = await repo.update(existing.id, patch, existing.revision);
  if (!updated) return null;
  return { kind: "applied", changed: true, subscription: updated };
}

/**
 * Transação DIFERENTE da última registrada e que vence ANTES dela: é um
 * reenvio atrasado (ou o reembolso de um período anterior). Ignorar.
 * A mesma transação (id igual) nunca é stale — é como o reembolso e a
 * revogação da última chegam.
 */
function isStale(existing: SubscriptionRecord, tx: JWSTransactionDecodedPayload, signedDate: Date): boolean {
  const previousPurchase = existing.applePurchaseDate?.getTime();
  if (previousPurchase != null && tx.purchaseDate !== previousPurchase) {
    return tx.purchaseDate! < previousPurchase;
  }
  if (existing.appleSignedDate && signedDate < existing.appleSignedDate) return true;
  if (previousPurchase == null && tx.transactionId !== existing.appleLatestTxId) {
    return (tx.expiresDate ?? 0) < existing.expiresAt.getTime();
  }
  return false;
}

function differs(existing: SubscriptionRecord, patch: SubscriptionPatch): boolean {
  return (
    existing.productId !== patch.productId ||
    existing.tier !== patch.tier ||
    existing.period !== patch.period ||
    existing.appleLatestTxId !== patch.appleLatestTxId ||
    existing.expiresAt.getTime() !== patch.expiresAt!.getTime() ||
    existing.isTrial !== patch.isTrial ||
    existing.status !== patch.status ||
    (existing.appAccountToken ?? null) !== (patch.appAccountToken ?? null) ||
    existing.environment !== patch.environment ||
    existing.applePurchaseDate?.getTime() !== patch.applePurchaseDate?.getTime() ||
    existing.appleSignedDate?.getTime() !== patch.appleSignedDate?.getTime()
  );
}
