/**
 * CORTESIA — Pro liberado por convite (painel /admin), fora da App Store.
 *
 * Mesma ideia da assinatura Apple: não escreve `profiles.plan`; o plano efetivo
 * é resolvido em LEITURA como o maior entre o plano do site, a assinatura Apple
 * vigente e a cortesia vigente. Quando a cortesia vence, o perfil volta sozinho
 * ao que era — nada para desfazer.
 *
 * A leitura do banco é fail-soft (igual `loadAssinatura`): entre o deploy e a
 * migração `20261023120000_cortesias` a tabela não existe, e o perfil segue
 * sem cortesia em vez de quebrar.
 */

import { eq } from "drizzle-orm";
import { getDbClient, schema } from "@laudousg/db";
import type { SubscriptionTier } from "./types";

export type CortesiaOrigem = "convite" | "cortesia";

export type CortesiaRecord = {
  tier: SubscriptionTier;
  origem: CortesiaOrigem;
  inicio: Date;
  /** null = sem prazo */
  fim: Date | null;
  revogadaEm: Date | null;
};

export type CortesiaOut = { tier: SubscriptionTier; fim: string | null; origem: CortesiaOrigem };

const RANK: Record<SubscriptionTier, number> = { essencial: 1, pro: 2 };

export function cortesiaValeAgora(c: CortesiaRecord, now: Date): boolean {
  return c.revogadaEm === null && c.inicio.getTime() <= now.getTime() && (c.fim === null || c.fim.getTime() > now.getTime());
}

/** A cortesia que vale hoje: maior tier; empate, a que vence mais tarde (sem prazo vence por último). */
export function cortesiaVigente(rows: CortesiaRecord[], now: Date): CortesiaRecord | null {
  let best: CortesiaRecord | null = null;
  const fimDe = (c: CortesiaRecord) => c.fim?.getTime() ?? Number.POSITIVE_INFINITY;
  for (const c of rows) {
    if (!cortesiaValeAgora(c, now)) continue;
    if (!best || RANK[c.tier] > RANK[best.tier] || (RANK[c.tier] === RANK[best.tier] && fimDe(c) > fimDe(best))) best = c;
  }
  return best;
}

/** Maior tier entre Apple e cortesia (entra no `resolveEffectivePlan` como o tier Apple). */
export function maiorTier(...tiers: (SubscriptionTier | null | undefined)[]): SubscriptionTier | null {
  let best: SubscriptionTier | null = null;
  for (const t of tiers) if (t && (!best || RANK[t] > RANK[best])) best = t;
  return best;
}

export function cortesiaOut(c: CortesiaRecord | null): CortesiaOut | null {
  return c ? { tier: c.tier, fim: c.fim?.toISOString() ?? null, origem: c.origem } : null;
}

function rowToRecord(row: typeof schema.cortesias.$inferSelect): CortesiaRecord | null {
  if (row.tier !== "essencial" && row.tier !== "pro") return null;
  if (row.origem !== "convite" && row.origem !== "cortesia") return null;
  return { tier: row.tier, origem: row.origem, inicio: row.inicio, fim: row.fim, revogadaEm: row.revogadaEm };
}

/** Cortesia vigente do usuário, ou null (inclusive se a tabela ainda não existir). */
export async function loadCortesia(userId: string, now = new Date()): Promise<CortesiaOut | null> {
  try {
    const rows = await getDbClient().select().from(schema.cortesias).where(eq(schema.cortesias.userId, userId));
    return cortesiaOut(cortesiaVigente(rows.map(rowToRecord).filter((r): r is CortesiaRecord => r !== null), now));
  } catch (erro) {
    console.warn(
      JSON.stringify({
        evento: "CORTESIA_INDISPONIVEL",
        motivo: erro instanceof Error ? erro.message : String(erro),
        efeito: "perfil devolvido sem cortesia",
      }),
    );
    return null;
  }
}
