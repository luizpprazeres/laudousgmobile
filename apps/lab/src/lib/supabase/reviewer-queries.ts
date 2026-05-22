import "server-only";
import type { ReviewerBlock } from "@/lib/mock/reviewer";
import {
  buildSections,
  computeCoverage,
  tierOf,
  type BuiltSection,
  type RetrievedBlock,
} from "@/lib/reviewer/segment-builder";
import { createServerSupabaseClient } from "./server";

export type ReviewerData = {
  meta: {
    id: string;
    shortId: string;
    category: string;
    time: string;
    checksum: string;
    contract: string;
    promptVersion: string;
    pipeline: string;
    retrievedTotal: number;
    usedTotal: number;
    skippedTotal: number;
    coverage: number;
  };
  sections: BuiltSection[];
  blocks: Record<string, ReviewerBlock>;
  coverage: {
    universal: { count: number; pct: number };
    contextual: { count: number; pct: number };
    optional: { count: number; pct: number };
    llmPure: { count: number; pct: number };
  };
  usedBlocks: Array<{ priority: number; slug: string; similarity: number; tier: "universal" | "contextual" | "optional" }>;
  suggestions: Array<{
    id: number;
    tone: "warning" | "info";
    title: string;
    detail: string;
    action?: { label: string; href: string };
  }>;
};

const TIME_FMT = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

function blockRecord(retrieved: RetrievedBlock[], llmTextById: Map<string, string>): Record<string, ReviewerBlock> {
  const rec: Record<string, ReviewerBlock> = {};
  for (const b of retrieved) {
    const priority = b.priority ?? 0;
    const tier = tierOf(priority);
    rec[b.id] = {
      id: b.id,
      slug: b.title ?? b.id.slice(0, 8),
      priority,
      similarity: b.similarity ?? 0,
      tier,
      note: tier === "universal" ? "universal" : tier === "contextual" ? "contextual" : "opcional",
    };
  }
  for (const [id] of llmTextById) {
    rec[id] = {
      id,
      slug: "(LLM puro)",
      priority: 0,
      similarity: 0,
      tier: "llm-pure",
      note: "sem source · gerado pelo LLM",
    };
  }
  return rec;
}

function deriveSuggestions(
  skippedCount: number,
  llmPureCount: number,
  unusedRetrievedCount: number,
): ReviewerData["suggestions"] {
  const list: ReviewerData["suggestions"] = [];
  let i = 1;

  if (skippedCount > 5) {
    list.push({
      id: i++,
      tone: "warning",
      title: `${skippedCount} blocks foram cortados por quota`,
      detail: 'Considere fundir variantes em 1 bloco; ou aumentar quota do kind correspondente.',
      action: { label: "Abrir blocks →", href: "/blocks" },
    });
  }

  if (unusedRetrievedCount > 3) {
    list.push({
      id: i++,
      tone: "warning",
      title: `${unusedRetrievedCount} blocks entraram mas não foram usados`,
      detail: "Investigar relevância — pode ser ruído no embedding ou contexto fora de escopo.",
    });
  }

  if (llmPureCount > 0) {
    list.push({
      id: i++,
      tone: "info",
      title: `${llmPureCount} ${llmPureCount === 1 ? "trecho" : "trechos"} sem correspondência clara em block`,
      detail: "Considere criar block dedicado para reduzir alucinação e ganhar previsibilidade.",
    });
  }

  if (list.length === 0) {
    list.push({
      id: 1,
      tone: "info",
      title: "Geração sem sinais de alerta",
      detail: "Cobertura alta, sem skipped significativo, sem trechos órfãos. Configuração atual está performando.",
    });
  }

  return list;
}

export async function getReviewerData(id: string): Promise<ReviewerData | null> {
  const supa = createServerSupabaseClient();
  const { data, error } = await supa
    .from("generation_audit")
    .select(
      "id, category, raw_input, output_text, created_at, prompt_version, pipeline_version, contract_hash, rag_blocks_retrieved, rag_blocks_skipped",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getReviewerData: ${error.message}`);
  if (!data) return null;

  const retrieved = (data.rag_blocks_retrieved ?? []) as RetrievedBlock[];
  const skipped = (data.rag_blocks_skipped ?? []) as RetrievedBlock[];
  const outputText = (data.output_text ?? "").trim();

  const sections = buildSections(outputText, retrieved);
  const cov = computeCoverage(sections);
  const total = Math.max(1, cov.totalSegments);

  const coverageRatio = total === 0 ? 0 : 1 - cov.llmPure / total;
  const usedBlockIds = cov.uniqueBlocks;
  const unusedRetrievedCount = retrieved.filter((b) => !usedBlockIds.has(b.id)).length;

  const llmTextById = new Map<string, string>();
  for (const sec of sections) {
    for (const para of [...(sec.paragraphs ?? []), ...(sec.list ?? [])]) {
      for (const seg of para) {
        if (seg.type === "block" && seg.tier === "llm-pure") {
          llmTextById.set(seg.blockId, seg.text);
        }
      }
    }
  }

  const blocks = blockRecord(retrieved, llmTextById);

  const usedBlocks: ReviewerData["usedBlocks"] = retrieved
    .filter((b) => usedBlockIds.has(b.id))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, 8)
    .map((b) => {
      const tier = tierOf(b.priority ?? 0);
      return {
        priority: b.priority ?? 0,
        slug: b.title ?? b.id.slice(0, 8),
        similarity: b.similarity ?? 0,
        tier: tier === "llm-pure" ? "optional" : tier,
      };
    });

  const contract = data.contract_hash
    ? `${data.contract_hash.slice(0, 5)}…${data.contract_hash.slice(-3)}`
    : "—";

  return {
    meta: {
      id: data.id,
      shortId: data.id.slice(0, 8),
      category: data.category,
      time: TIME_FMT.format(new Date(data.created_at)),
      checksum: data.id.slice(0, 7),
      contract,
      promptVersion: data.prompt_version ?? "—",
      pipeline: data.pipeline_version ?? "—",
      retrievedTotal: retrieved.length,
      usedTotal: usedBlockIds.size,
      skippedTotal: skipped.length,
      coverage: coverageRatio,
    },
    sections,
    blocks,
    coverage: {
      universal: { count: cov.universal, pct: cov.universal / total },
      contextual: { count: cov.contextual, pct: cov.contextual / total },
      optional: { count: cov.optional, pct: cov.optional / total },
      llmPure: { count: cov.llmPure, pct: cov.llmPure / total },
    },
    usedBlocks,
    suggestions: deriveSuggestions(skipped.length, cov.llmPure, unusedRetrievedCount),
  };
}

export async function getMostRecentAuditId(): Promise<string | null> {
  const supa = createServerSupabaseClient();
  const { data, error } = await supa
    .from("generation_audit")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data?.id ?? null;
}
