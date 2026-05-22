import "server-only";
import { createServerSupabaseClient } from "./server";

export type DashboardMetrics = {
  totalBlocks: number;
  laudosToday: number;
  laudosYesterday: number;
  avgSkippedRecent: number;
  avgSkippedPrev: number;
  avgDurationMs: number;
  totalCost7d: number;
  byCategoryRecent: Record<string, { count: number; errors: number; avgSkipped: number }>;
};

export type CategoryStat = {
  slug: string;
  blocks: number;
  recentTotal: number;
  recentErrors: number;
  successRate: number;
  avgSkipped: number;
};

export type RecentActivity = {
  id: string;
  category: string;
  createdAt: string;
  durationMs: number;
  error: string | null;
  blocksUsed: number;
  blocksSkipped: number;
  rawInputPreview: string;
};

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

function fourteenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString();
}

export async function getDashboardData(): Promise<{
  metrics: DashboardMetrics;
  categories: CategoryStat[];
  recent: RecentActivity[];
}> {
  const supa = createServerSupabaseClient();

  const [blocksCountRes, blocksByCategoryRes, todayRes, yesterdayRes, last7dRes, prev7dRes, recentRes] = await Promise.all([
    supa.from("knowledge_blocks").select("id", { count: "exact", head: true }).eq("status", "validated"),
    supa.from("knowledge_blocks").select("category_code, status"),
    supa.from("generation_audit").select("id", { count: "exact", head: true }).gte("created_at", startOfToday()),
    supa
      .from("generation_audit")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfYesterday())
      .lt("created_at", startOfToday()),
    supa
      .from("generation_audit")
      .select("category, rag_blocks_skipped, rag_blocks_retrieved, total_duration_ms, openai_cost_usd, error_code")
      .gte("created_at", sevenDaysAgo()),
    supa
      .from("generation_audit")
      .select("rag_blocks_skipped")
      .gte("created_at", fourteenDaysAgo())
      .lt("created_at", sevenDaysAgo()),
    supa
      .from("generation_audit")
      .select("id, category, raw_input, created_at, total_duration_ms, error_code, rag_blocks_retrieved, rag_blocks_skipped")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const last7d = (last7dRes.data ?? []) as Array<{
    category: string;
    rag_blocks_skipped: unknown[];
    rag_blocks_retrieved: unknown[];
    total_duration_ms: number | null;
    openai_cost_usd: number | null;
    error_code: string | null;
  }>;
  const prev7d = (prev7dRes.data ?? []) as Array<{ rag_blocks_skipped: unknown[] }>;
  const blocksByCat = (blocksByCategoryRes.data ?? []) as Array<{ category_code: string; status: string }>;

  const avgSkippedRecent = last7d.length === 0 ? 0 : last7d.reduce((a, x) => a + (x.rag_blocks_skipped?.length ?? 0), 0) / last7d.length;
  const avgSkippedPrev = prev7d.length === 0 ? 0 : prev7d.reduce((a, x) => a + (x.rag_blocks_skipped?.length ?? 0), 0) / prev7d.length;
  const avgDurationMs = last7d.length === 0 ? 0 : last7d.reduce((a, x) => a + (x.total_duration_ms ?? 0), 0) / last7d.length;
  const totalCost7d = last7d.reduce((a, x) => a + (x.openai_cost_usd ?? 0), 0);

  const byCategoryRecent: Record<string, { count: number; errors: number; avgSkipped: number }> = {};
  for (const row of last7d) {
    if (!row.category) continue;
    const k = row.category;
    byCategoryRecent[k] ||= { count: 0, errors: 0, avgSkipped: 0 };
    byCategoryRecent[k].count++;
    if (row.error_code) byCategoryRecent[k].errors++;
    byCategoryRecent[k].avgSkipped += row.rag_blocks_skipped?.length ?? 0;
  }
  for (const k of Object.keys(byCategoryRecent)) {
    const cat = byCategoryRecent[k]!;
    cat.avgSkipped = cat.count === 0 ? 0 : cat.avgSkipped / cat.count;
  }

  const blocksCountByCat = new Map<string, number>();
  for (const r of blocksByCat) {
    if (r.status !== "validated") continue;
    blocksCountByCat.set(r.category_code, (blocksCountByCat.get(r.category_code) ?? 0) + 1);
  }

  const categories: CategoryStat[] = Array.from(blocksCountByCat.entries())
    .map(([slug, count]) => {
      const stat = byCategoryRecent[slug];
      const recentTotal = stat?.count ?? 0;
      const recentErrors = stat?.errors ?? 0;
      const successRate = recentTotal === 0 ? 1 : (recentTotal - recentErrors) / recentTotal;
      const avgSkipped = stat?.avgSkipped ?? 0;
      return { slug, blocks: count, recentTotal, recentErrors, successRate, avgSkipped };
    })
    .sort((a, b) => b.blocks - a.blocks);

  const recent: RecentActivity[] = (recentRes.data ?? []).map((r) => {
    const row = r as {
      id: string;
      category: string;
      raw_input: string;
      created_at: string;
      total_duration_ms: number | null;
      error_code: string | null;
      rag_blocks_retrieved: unknown[];
      rag_blocks_skipped: unknown[];
    };
    return {
      id: row.id,
      category: row.category,
      createdAt: row.created_at,
      durationMs: row.total_duration_ms ?? 0,
      error: row.error_code,
      blocksUsed: row.rag_blocks_retrieved?.length ?? 0,
      blocksSkipped: row.rag_blocks_skipped?.length ?? 0,
      rawInputPreview: (row.raw_input ?? "").replace(/\s+/g, " ").slice(0, 80),
    };
  });

  return {
    metrics: {
      totalBlocks: blocksCountRes.count ?? 0,
      laudosToday: todayRes.count ?? 0,
      laudosYesterday: yesterdayRes.count ?? 0,
      avgSkippedRecent,
      avgSkippedPrev,
      avgDurationMs,
      totalCost7d,
      byCategoryRecent,
    },
    categories,
    recent,
  };
}
