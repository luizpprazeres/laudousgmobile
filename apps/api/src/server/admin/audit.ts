import { getServiceClient } from "@/server/supabaseService";

export type AuditStatus = "success" | "concerns" | "error";

export type GenerationAuditRow = {
  id: string;
  report_id: string | null;
  user_id: string | null;
  category: string;
  writing_style_id: string | null;
  raw_input: string | null;
  category_hint: string | null;
  structured_output: unknown | null;
  validator_result: unknown | null;
  rag_blocks_retrieved: unknown | null;
  system_message_full: string | null;
  output_text: string | null;
  sanity_result: unknown | null;
  total_duration_ms: number | null;
  structurer_duration_ms: number | null;
  validator_duration_ms: number | null;
  rag_duration_ms: number | null;
  writer_duration_ms: number | null;
  sanity_duration_ms: number | null;
  openai_input_tokens: number | null;
  openai_output_tokens: number | null;
  openai_cost_usd: number | string | null;
  model_writer: string | null;
  model_structurer: string | null;
  error_code: string | null;
  error_message: string | null;
  error_stage: string | null;
  prompt_version: string;
  pipeline_version: string;
  contract_hash: string;
  created_at: string | null;
};

export type AuditFilters = {
  category?: string;
  errorsOnly?: boolean;
  from?: string;
  to?: string;
  page: number;
};

export const AUDIT_PAGE_SIZE = 50;

export async function listAuditRows(filters: AuditFilters): Promise<{
  rows: GenerationAuditRow[];
  total: number;
}> {
  const sb = getServiceClient();
  const fromIndex = (filters.page - 1) * AUDIT_PAGE_SIZE;
  const toIndex = fromIndex + AUDIT_PAGE_SIZE - 1;
  let query = sb
    .from("generation_audit")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(fromIndex, toIndex);

  query = applyFilters(query, filters);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return {
    rows: (data ?? []) as GenerationAuditRow[],
    total: count ?? 0,
  };
}

export async function getAuditRow(id: string): Promise<GenerationAuditRow | null> {
  const { data, error } = await getServiceClient()
    .from("generation_audit")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as GenerationAuditRow | null;
}

export async function listAuditCategories(): Promise<string[]> {
  const { data, error } = await getServiceClient()
    .from("generation_audit")
    .select("category")
    .order("category", { ascending: true });
  if (error) throw new Error(error.message);
  return Array.from(new Set((data ?? []).map((row) => row.category).filter(Boolean)));
}

export function auditStatus(row: GenerationAuditRow): AuditStatus {
  if (row.error_code) return "error";
  const verdict = sanityVerdict(row.sanity_result);
  if (verdict && verdict !== "ok") return "concerns";
  return "success";
}

export function sanityVerdict(sanity: unknown): string | null {
  if (!isRecord(sanity)) return null;
  const verdict = sanity.verdict;
  return typeof verdict === "string" ? verdict : null;
}

export function sanityIssues(sanity: unknown): unknown[] {
  if (!isRecord(sanity)) return [];
  return Array.isArray(sanity.issues) ? sanity.issues : [];
}

export function validatorOk(validator: unknown): boolean | null {
  if (!isRecord(validator)) return null;
  return typeof validator.ok === "boolean" ? validator.ok : null;
}

export function validatorIssues(validator: unknown): unknown[] {
  if (!isRecord(validator)) return [];
  if (Array.isArray(validator.issues)) return validator.issues;
  if (Array.isArray(validator.questions)) return validator.questions;
  return [];
}

export function ragBlocks(value: unknown): RagBlockView[] {
  if (!Array.isArray(value)) return [];
  return value.map((block) => {
    if (!isRecord(block)) return {};
    return {
      id: stringValue(block.id),
      kind: stringValue(block.kind),
      title: stringValue(block.title),
      priority: numberValue(block.priority),
      score: numberValue(block.score),
      content: stringValue(block.content),
    };
  });
}

export type RagBlockView = {
  id?: string;
  kind?: string;
  title?: string;
  priority?: number;
  score?: number;
  content?: string;
};

export function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Maceio",
  }).format(new Date(value));
}

export function formatMs(value: number | null): string {
  if (value == null) return "-";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${value}ms`;
}

export function formatUsd(value: number | string | null): string {
  if (value == null) return "-";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "-";
  return `$${n.toFixed(6)}`;
}

export function shortId(value: string | null | undefined, size = 8): string {
  if (!value) return "-";
  return value.slice(0, size);
}

export function prettyJson(value: unknown): string {
  if (value == null) return "";
  return JSON.stringify(value, null, 2);
}

export function markdownForAudit(row: GenerationAuditRow): string {
  const blocks = ragBlocks(row.rag_blocks_retrieved).sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );
  const status = auditStatus(row);
  const blockLines = blocks.length
    ? blocks.map((block, index) => {
        return `${index + 1}. **${block.title ?? "Sem título"}** (kind=${block.kind ?? "-"}, priority=${block.priority ?? "-"}) — id: ${shortId(block.id)}`;
      })
    : ["Nenhum bloco registrado."];

  return [
    `# Laudo #${shortId(row.id)}`,
    "",
    `**Categoria:** ${row.category}`,
    `**Gerado em:** ${formatDate(row.created_at)}`,
    `**Prompt version:** ${row.prompt_version}`,
    `**Contract hash:** ${shortId(row.contract_hash, 12)}`,
    `**Modelo:** ${row.model_writer ?? "-"}`,
    `**Custo:** ${formatUsd(row.openai_cost_usd)}`,
    `**Status:** ${status}`,
    "",
    "## Input do médico",
    "```",
    row.raw_input ?? "",
    "```",
    "",
    "## Output gerado",
    "```",
    row.output_text ?? "",
    "```",
    "",
    "## System message completo (injetado no writer)",
    "```",
    row.system_message_full ?? "",
    "```",
    "",
    "## RAG blocks retrievados (ordenados por priority)",
    ...blockLines,
    "",
    "## Structured output",
    "```json",
    prettyJson(row.structured_output),
    "```",
    "",
    "## Validator",
    `- ok: ${String(validatorOk(row.validator_result))}`,
    `- issues: ${prettyJson(validatorIssues(row.validator_result))}`,
    "",
    "## Sanity check",
    `- verdict: ${sanityVerdict(row.sanity_result) ?? "-"}`,
    `- issues: ${prettyJson(sanityIssues(row.sanity_result))}`,
    "",
    "## Performance",
    `- Total: ${row.total_duration_ms ?? "-"}ms`,
    `- Structurer: ${row.structurer_duration_ms ?? "-"}ms`,
    `- Validator: ${row.validator_duration_ms ?? "-"}ms`,
    `- RAG retriever: ${row.rag_duration_ms ?? "-"}ms`,
    `- Writer: ${row.writer_duration_ms ?? "-"}ms`,
    `- Sanity: ${row.sanity_duration_ms ?? "-"}ms`,
    "",
    "## Tokens & custo",
    `- Input: ${row.openai_input_tokens ?? "-"}`,
    `- Output: ${row.openai_output_tokens ?? "-"}`,
    `- Custo estimado: ${formatUsd(row.openai_cost_usd)}`,
    "",
    "---",
    "",
    "[campo livre pro user adicionar pergunta]",
    "",
  ].join("\n");
}

function applyFilters<T extends { eq: Function; not: Function; gte: Function; lte: Function }>(
  query: T,
  filters: AuditFilters,
): T {
  let next = query;
  if (filters.category) next = next.eq("category", filters.category);
  if (filters.errorsOnly) next = next.not("error_code", "is", null);
  if (filters.from) next = next.gte("created_at", `${filters.from}T00:00:00.000Z`);
  if (filters.to) next = next.lte("created_at", `${filters.to}T23:59:59.999Z`);
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}
