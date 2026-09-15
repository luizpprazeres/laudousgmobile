/**
 * Repositório em memória com a MESMA semântica do Drizzle: UNIQUE em
 * `apple_original_tx_id` (lança SubscriptionConflictError) e `user_id`
 * imutável no update.
 */

import {
  SubscriptionConflictError,
  type NewSubscription,
  type SubscriptionPatch,
  type SubscriptionRecord,
  type SubscriptionRepo,
} from "../entitlement";

export class MemorySubscriptionRepo implements SubscriptionRepo {
  rows: SubscriptionRecord[] = [];
  profiles = new Set<string>();
  private seq = 0;
  /** Gancho para simular corrida: roda antes de cada insert. */
  beforeInsert: ((values: NewSubscription) => Promise<void>) | null = null;
  beforeUpdate: ((patch: SubscriptionPatch) => Promise<void>) | null = null;

  async findByOriginalTxId(id: string): Promise<SubscriptionRecord | null> {
    return this.rows.find((r) => r.appleOriginalTxId === id) ?? null;
  }

  async insert(values: NewSubscription): Promise<SubscriptionRecord> {
    if (this.beforeInsert) await this.beforeInsert(values);
    if (this.rows.some((r) => r.appleOriginalTxId === values.appleOriginalTxId)) {
      throw new SubscriptionConflictError(values.appleOriginalTxId);
    }
    const row: SubscriptionRecord = { id: `sub-${++this.seq}`, revision: 0, ...values };
    this.rows.push(row);
    return { ...row };
  }

  async update(id: string, patch: SubscriptionPatch, expectedRevision: number): Promise<SubscriptionRecord | null> {
    if (this.beforeUpdate) await this.beforeUpdate(patch);
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error(`sem linha ${id}`);
    const atual = this.rows[idx]!;
    if (atual.revision !== expectedRevision) return null;
    const proximo: SubscriptionRecord = {
      ...atual,
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
      // imutáveis — mesmo que alguém passe por engano
      id: atual.id,
      userId: atual.userId,
      appleOriginalTxId: atual.appleOriginalTxId,
      revision: atual.revision + 1,
    };
    this.rows[idx] = proximo;
    return { ...proximo };
  }

  async listForUser(userId: string): Promise<SubscriptionRecord[]> {
    return this.rows.filter((r) => r.userId === userId).map((r) => ({ ...r }));
  }

  async profileExists(userId: string): Promise<boolean> {
    return this.profiles.has(userId.toLowerCase());
  }
}
