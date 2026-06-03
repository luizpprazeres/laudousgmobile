import "server-only";
import type { AuditDetail, AuditRow, AuditStatus, AuditCompactBlock } from "@/lib/mock/audit";
import { createServerSupabaseClient } from "./server";

const TIME_FMT = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

const WRITING_STYLE_LABELS: Record<string, string> = {
  "11111111-1111-4111-8111-111111111111": "CLÁSSICO_COMPLETO",
  "22222222-2222-4222-8222-222222222222": "DIRETO_OBJETIVO",
  "33333333-3333-4333-8333-333333333333": "DETALHADO_PROTOCOLAR",
  "44444444-4444-4444-8444-444444444444": "OBJETIVO",
};

type AuditRowDB = {
  id: string;
  category: string;
  writing_style_id: string;
  raw_input: string | null;
  created_at: string;
  total_duration_ms: number | null;
  error_code: string | null;
  error_message: string | null;
  rag_blocks_retrieved: unknown[] | null;
  rag_blocks_skipped: unknown[] | null;
  sanity_result: { issues?: unknown[] } | null;
};

type AuditDetailDB = AuditRowDB & {
  raw_input: string | null;
  output_text: string | null;
  prompt_version: string | null;
  pipeline_version: string | null;
  contract_hash: string | null;
  openai_cost_usd: number | null;
  openai_input_tokens: number | null;
  openai_output_tokens: number | null;
};

type RawRagBlock = {
  id?: string;
  kind?: string;
  title?: string;
  priority?: number;
  similarity?: number;
  category_code?: string;
};

function deriveStatus(row: Pick<AuditRowDB, "error_code" | "sanity_result" | "rag_blocks_retrieved">): AuditStatus {
  if (row.error_code) return "error";
  const sanityCount = row.sanity_result?.issues?.length ?? 0;
  const retrievedCount = row.rag_blocks_retrieved?.length ?? 0;
  if (retrievedCount === 0) return "error";
  if (sanityCount > 0) return "warning";
  return "ok";
}

function deriveBadge(row: AuditRowDB): string | undefined {
  if (row.error_code) return row.error_code.toLowerCase();
  const retrievedCount = row.rag_blocks_retrieved?.length ?? 0;
  if (retrievedCount === 0) return "rag_empty";
  const skippedCount = row.rag_blocks_skipped?.length ?? 0;
  if (skippedCount > 5) return "⚡ skipped alto";
  const sanityCount = row.sanity_result?.issues?.length ?? 0;
  if (sanityCount > 0) return `sanity ${sanityCount}`;
  return undefined;
}

function compactBlock(raw: RawRagBlock, fallbackTier: AuditCompactBlock["tier"] = "optional"): AuditCompactBlock {
  const priority = typeof raw.priority === "number" ? raw.priority : 0;
  const similarity = typeof raw.similarity === "number" ? raw.similarity : 0;
  let tier: AuditCompactBlock["tier"];
  if (fallbackTier === "skipped") tier = "skipped";
  else if (priority >= 90) tier = "universal";
  else if (priority >= 75) tier = "contextual";
  else tier = "optional";
  return {
    kind: raw.kind ?? "—",
    priority,
    similarity,
    slug: raw.title ?? raw.id ?? "—",
    tier,
  };
}

function rowFromDB(r: AuditRowDB): AuditRow {
  return {
    id: r.id,
    shortId: r.id.slice(0, 8),
    category: r.category,
    time: TIME_FMT.format(new Date(r.created_at)),
    durationMs: r.total_duration_ms ?? 0,
    blocksUsed: r.rag_blocks_retrieved?.length ?? 0,
    blocksSkipped: r.rag_blocks_skipped?.length ?? 0,
    status: deriveStatus(r),
    badge: deriveBadge(r),
    inputPreview: (r.raw_input ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
  };
}

function deriveWarning(detail: AuditDetailDB): { title: string; message: string } | undefined {
  if (detail.error_code) {
    return {
      title: `Erro: ${detail.error_code}`,
      message: detail.error_message ?? "Sem mensagem detalhada.",
    };
  }
  const skippedCount = detail.rag_blocks_skipped?.length ?? 0;
  if (skippedCount > 5) {
    return {
      title: `${skippedCount} blocks cortados por quota`,
      message: "Considere revisar quotas de kind correspondente ou fundir variantes.",
    };
  }
  const sanityCount = detail.sanity_result?.issues?.length ?? 0;
  if (sanityCount > 0) {
    return {
      title: `${sanityCount} ${sanityCount === 1 ? "ponto" : "pontos"} a revisar no sanity`,
      message: "Veja os detalhes do laudo gerado no Reviewer.",
    };
  }
  const retrieved = detail.rag_blocks_retrieved?.length ?? 0;
  if (retrieved === 0) {
    return {
      title: "RAG empty",
      message: "Nenhum block foi retrieved. Categoria sem contracts ou similarity abaixo do threshold.",
    };
  }
  return undefined;
}

function detailFromDB(detail: AuditDetailDB): AuditDetail {
  const base = rowFromDB(detail);
  const retrieved = (detail.rag_blocks_retrieved ?? []) as RawRagBlock[];
  const skipped = (detail.rag_blocks_skipped ?? []) as RawRagBlock[];

  const retrievedCompact = retrieved.slice(0, 8).map((b) => compactBlock(b));
  if (retrieved.length > 8) {
    retrievedCompact.push({
      kind: "—",
      priority: 0,
      similarity: 0,
      slug: `+ ${retrieved.length - 8} outros…`,
      tier: "optional",
    });
  }

  const contractShort = detail.contract_hash
    ? `${detail.contract_hash.slice(0, 5)}…${detail.contract_hash.slice(-3)}`
    : "—";

  return {
    ...base,
    pipeline: detail.pipeline_version ?? "—",
    promptVersion: detail.prompt_version ?? "—",
    contract: contractShort,
    writingStyle: WRITING_STYLE_LABELS[detail.writing_style_id] ?? "—",
    inputFull: detail.raw_input ?? "",
    retrieved: retrievedCompact,
    skipped: skipped.map((b) => compactBlock(b, "skipped")),
    warning: deriveWarning(detail),
  };
}

export async function listAuditRows(limit = 50): Promise<AuditRow[]> {
  const supa = createServerSupabaseClient();
  const { data, error } = await supa
    .from("generation_audit")
    .select(
      "id, category, writing_style_id, raw_input, created_at, total_duration_ms, error_code, error_message, rag_blocks_retrieved, rag_blocks_skipped, sanity_result",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listAuditRows: ${error.message}`);
  return (data ?? []).map((r) => rowFromDB(r as AuditRowDB));
}

export async function getAuditDetail(id: string): Promise<AuditDetail | null> {
  const supa = createServerSupabaseClient();
  const { data, error } = await supa
    .from("generation_audit")
    .select(
      "id, category, writing_style_id, raw_input, output_text, created_at, total_duration_ms, error_code, error_message, rag_blocks_retrieved, rag_blocks_skipped, sanity_result, prompt_version, pipeline_version, contract_hash, openai_cost_usd, openai_input_tokens, openai_output_tokens",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getAuditDetail: ${error.message}`);
  if (!data) return null;
  return detailFromDB(data as AuditDetailDB);
}

export async function getAuditCounts(): Promise<{ today: number; total7d: number; totalAll: number }> {
  const supa = createServerSupabaseClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [todayRes, sevenRes, allRes] = await Promise.all([
    supa.from("generation_audit").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    supa.from("generation_audit").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString()),
    supa.from("generation_audit").select("id", { count: "exact", head: true }),
  ]);

  return {
    today: todayRes.count ?? 0,
    total7d: sevenRes.count ?? 0,
    totalAll: allRes.count ?? 0,
  };
}
