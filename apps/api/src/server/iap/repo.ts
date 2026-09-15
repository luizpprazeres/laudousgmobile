/**
 * Repositório Drizzle da tabela `subscriptions` — a única porta de escrita.
 *
 * A regra de posse é decidida em `entitlement.ts`; aqui só se garante que
 * `user_id` e `apple_original_tx_id` não entram em nenhum UPDATE, e que a
 * violação do UNIQUE em `apple_original_tx_id` vira `SubscriptionConflictError`
 * (para o domínio reavaliar a corrida em vez de sobrescrever).
 */

import { and, eq, sql } from "drizzle-orm";
import { getDbClient, schema } from "@laudousg/db";
import {
  SubscriptionConflictError,
  type NewSubscription,
  type SubscriptionPatch,
  type SubscriptionRecord,
  type SubscriptionRepo,
} from "./entitlement";
import type { SubscriptionPeriod, SubscriptionStatus, SubscriptionTier } from "./types";

type Row = typeof schema.subscriptions.$inferSelect;

export function rowToRecord(row: Row): SubscriptionRecord {
  return {
    id: row.id,
    userId: row.userId,
    productId: row.productId,
    tier: row.tier as SubscriptionTier,
    period: row.period as SubscriptionPeriod,
    appleOriginalTxId: row.appleOriginalTxId,
    appleLatestTxId: row.appleLatestTxId,
    expiresAt: row.expiresAt,
    isTrial: row.isTrial,
    status: row.status as SubscriptionStatus,
    appAccountToken: row.appAccountToken ?? null,
    environment: row.environment,
    applePurchaseDate: row.applePurchaseDate,
    appleSignedDate: row.appleSignedDate,
    revision: row.revision,
  };
}

function isUniqueViolation(error: unknown): boolean {
  const direct = (error as { code?: unknown } | null)?.code;
  if (direct === "23505") return true;
  const cause = (error as { cause?: { code?: unknown } } | null)?.cause;
  return cause?.code === "23505";
}

export class DrizzleSubscriptionRepo implements SubscriptionRepo {
  async findByOriginalTxId(appleOriginalTxId: string): Promise<SubscriptionRecord | null> {
    const db = getDbClient();
    const [row] = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.appleOriginalTxId, appleOriginalTxId))
      .limit(1);
    return row ? rowToRecord(row) : null;
  }

  async insert(values: NewSubscription): Promise<SubscriptionRecord> {
    const db = getDbClient();
    try {
      const [row] = await db
        .insert(schema.subscriptions)
        .values({
          userId: values.userId,
          productId: values.productId,
          tier: values.tier,
          period: values.period,
          appleOriginalTxId: values.appleOriginalTxId,
          appleLatestTxId: values.appleLatestTxId,
          expiresAt: values.expiresAt,
          isTrial: values.isTrial,
          status: values.status,
          appAccountToken: values.appAccountToken,
          environment: values.environment,
          applePurchaseDate: values.applePurchaseDate,
          appleSignedDate: values.appleSignedDate,
          updatedAt: new Date(),
        })
        .returning();
      if (!row) throw new Error("subscriptions insert sem retorno");
      return rowToRecord(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new SubscriptionConflictError(values.appleOriginalTxId);
      }
      throw error;
    }
  }

  async update(id: string, patch: SubscriptionPatch, expectedRevision: number): Promise<SubscriptionRecord | null> {
    const db = getDbClient();
    const [row] = await db
      .update(schema.subscriptions)
      .set({
        ...(patch.productId !== undefined ? { productId: patch.productId } : {}),
        ...(patch.tier !== undefined ? { tier: patch.tier } : {}),
        ...(patch.period !== undefined ? { period: patch.period } : {}),
        ...(patch.appleLatestTxId !== undefined ? { appleLatestTxId: patch.appleLatestTxId } : {}),
        ...(patch.expiresAt !== undefined ? { expiresAt: patch.expiresAt } : {}),
        ...(patch.isTrial !== undefined ? { isTrial: patch.isTrial } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.appAccountToken !== undefined ? { appAccountToken: patch.appAccountToken } : {}),
        ...(patch.environment !== undefined ? { environment: patch.environment } : {}),
        ...(patch.applePurchaseDate !== undefined ? { applePurchaseDate: patch.applePurchaseDate } : {}),
        ...(patch.appleSignedDate !== undefined ? { appleSignedDate: patch.appleSignedDate } : {}),
        revision: sql`${schema.subscriptions.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.subscriptions.id, id), eq(schema.subscriptions.revision, expectedRevision)))
      .returning();
    return row ? rowToRecord(row) : null;
  }

  async listForUser(userId: string): Promise<SubscriptionRecord[]> {
    const db = getDbClient();
    const rows = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, userId));
    return rows.map(rowToRecord);
  }

  async profileExists(userId: string): Promise<boolean> {
    const db = getDbClient();
    const [row] = await db
      .select({ id: schema.profiles.id })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, userId))
      .limit(1);
    return Boolean(row);
  }
}

let _repo: DrizzleSubscriptionRepo | null = null;
export function getSubscriptionRepo(): SubscriptionRepo {
  if (!_repo) _repo = new DrizzleSubscriptionRepo();
  return _repo;
}
