import { createHash } from "node:crypto";
import OpenAI from "openai";
import postgres from "postgres";
import { WRITING_STYLE_IDS } from "@laudousg/db";

/**
 * Reusável: extraído de apps/api/scripts/ingest-knowledge.ts.
 * Usado tanto pelo CLI (ingest em lote por categoria) quanto pelo
 * webhook GitHub (re-ingest single-file ao receber push).
 */

export type KnowledgeKind =
  | "modelo"
  | "regra"
  | "frase"
  | "conclusao"
  | "excecao"
  | "comentario_tecnico"
  | "exemplo";

export type IngestFrontmatter = {
  id: string;
  category: string;
  kind: KnowledgeKind;
  tags: string[];
  priority: number;
  version: string;
  status: "published" | "draft" | "archived";
  source_path?: string;
  source_lines?: string;
};

export type IngestBlock = {
  frontmatter: IngestFrontmatter;
  content: string;
  filePath: string;
};

const VALID_KINDS = new Set<KnowledgeKind>([
  "modelo",
  "regra",
  "frase",
  "conclusao",
  "excecao",
  "comentario_tecnico",
  "exemplo",
]);

const DEFAULT_WRITING_STYLE_IDS = Object.values(WRITING_STYLE_IDS);

export function parseMarkdownBlock(raw: string, filePath: string): IngestBlock {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Frontmatter ausente em ${filePath}`);
  const frontmatter = parseFrontmatter(match[1] ?? "", filePath);
  const content = (match[2] ?? "").trim();
  if (!content) throw new Error(`Conteúdo vazio em ${filePath}`);
  return { frontmatter, content, filePath };
}

export function parseFrontmatter(raw: string, filePath: string): IngestFrontmatter {
  const values = new Map<string, string>();
  for (const line of raw.split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    values.set(line.slice(0, index).trim(), line.slice(index + 1).trim());
  }

  const id = required(values, "id", filePath);
  const category = required(values, "category", filePath);
  const kind = required(values, "kind", filePath) as KnowledgeKind;
  if (!VALID_KINDS.has(kind)) throw new Error(`kind inválido em ${filePath}: ${kind}`);

  return {
    id,
    category,
    kind,
    tags: parseTags(values.get("tags")),
    priority: Number.parseInt(values.get("priority") ?? "50", 10),
    version: values.get("version") ?? "1.0.0",
    status: parseStatus(values.get("status")),
    source_path: values.get("source_path"),
    source_lines: values.get("source_lines"),
  };
}

function required(values: Map<string, string>, key: string, filePath: string) {
  const value = values.get(key);
  if (!value) throw new Error(`${key} ausente em ${filePath}`);
  return value;
}

function parseTags(value: string | undefined) {
  if (!value) return [];
  return value
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseStatus(value: string | undefined): IngestFrontmatter["status"] {
  if (value === "draft" || value === "archived") return value;
  return "published";
}

export function toDbStatus(status: IngestFrontmatter["status"]) {
  if (status === "archived") return "archived";
  if (status === "draft") return "draft";
  return "validated";
}

export function versionToInteger(version: string) {
  const major = Number.parseInt(version.split(".")[0] ?? "1", 10);
  return Number.isFinite(major) ? major : 1;
}

export function buildTags(block: IngestBlock) {
  return [
    ...block.frontmatter.tags,
    block.frontmatter.source_path ? `source_path:${block.frontmatter.source_path}` : undefined,
    block.frontmatter.source_lines ? `source_lines:${block.frontmatter.source_lines}` : undefined,
  ].filter((value): value is string => Boolean(value));
}

export function deterministicUuid(input: string) {
  const hex = createHash("sha256").update(input).digest("hex").slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

export async function createEmbedding(openai: OpenAI, content: string, model?: string) {
  const response = await openai.embeddings.create({
    model: model ?? process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    input: content,
  });
  const embedding = response.data[0]?.embedding;
  if (!embedding) throw new Error("embedding vazio");
  return embedding;
}

export type IngestOptions = {
  writingStyleIds?: readonly string[];
  databaseUrl?: string;
  openaiKey?: string;
};

export type IngestResult = {
  blockId: string;
  writingStyleId: string;
  upserted: true;
};

/**
 * Upsert um único block (em todos os writing styles configurados).
 * Reusa connection postgres + OpenAI client passados, OU cria novos.
 *
 * Retorna lista de upserts (1 por writing_style_id).
 *
 * Side effects:
 * - Gera 1 embedding OpenAI por block (não por writing_style)
 * - UPSERT direto em public.knowledge_blocks com vector(1536)
 */
export async function ingestSingleBlock(
  block: IngestBlock,
  options: IngestOptions = {},
): Promise<IngestResult[]> {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  const openaiKey = options.openaiKey ?? process.env.OPENAI_API_KEY;
  if (!databaseUrl) throw new Error("DATABASE_URL ausente");
  if (!openaiKey) throw new Error("OPENAI_API_KEY ausente");

  const writingStyleIds = options.writingStyleIds ?? DEFAULT_WRITING_STYLE_IDS;
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  const openai = new OpenAI({ apiKey: openaiKey });

  try {
    const embedding = await createEmbedding(openai, block.content);
    const embeddingLiteral = `[${embedding.join(",")}]`;
    const results: IngestResult[] = [];

    for (const writingStyleId of writingStyleIds) {
      const id = deterministicUuid(`${block.frontmatter.id}:${writingStyleId}`);
      await sql`
        insert into public.knowledge_blocks (
          id,
          category_code,
          writing_style_id,
          kind,
          title,
          content,
          status,
          priority,
          version,
          tags,
          embedding
        )
        values (
          ${id}::uuid,
          ${block.frontmatter.category},
          ${writingStyleId}::uuid,
          ${block.frontmatter.kind}::rag_block_kind,
          ${block.frontmatter.id},
          ${block.content},
          ${toDbStatus(block.frontmatter.status)}::rag_block_status,
          ${block.frontmatter.priority},
          ${versionToInteger(block.frontmatter.version)},
          ${buildTags(block)},
          ${embeddingLiteral}::vector(1536)
        )
        on conflict (id) do update set
          category_code = excluded.category_code,
          writing_style_id = excluded.writing_style_id,
          kind = excluded.kind,
          title = excluded.title,
          content = excluded.content,
          status = excluded.status,
          priority = excluded.priority,
          version = excluded.version,
          tags = excluded.tags,
          embedding = excluded.embedding,
          updated_at = now()
      `;
      results.push({ blockId: id, writingStyleId, upserted: true });
    }

    return results;
  } finally {
    await sql.end();
  }
}

/**
 * Versão batch — reusa mesma conexão postgres pra múltiplos blocks.
 * Usada pelo CLI script de ingest em lote por categoria.
 */
export async function ingestBlocks(
  blocks: IngestBlock[],
  options: IngestOptions = {},
): Promise<IngestResult[]> {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  const openaiKey = options.openaiKey ?? process.env.OPENAI_API_KEY;
  if (!databaseUrl) throw new Error("DATABASE_URL ausente");
  if (!openaiKey) throw new Error("OPENAI_API_KEY ausente");

  const writingStyleIds = options.writingStyleIds ?? DEFAULT_WRITING_STYLE_IDS;
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  const openai = new OpenAI({ apiKey: openaiKey });
  const all: IngestResult[] = [];

  try {
    for (const block of blocks) {
      const embedding = await createEmbedding(openai, block.content);
      const embeddingLiteral = `[${embedding.join(",")}]`;
      for (const writingStyleId of writingStyleIds) {
        const id = deterministicUuid(`${block.frontmatter.id}:${writingStyleId}`);
        await sql`
          insert into public.knowledge_blocks (
            id,
            category_code,
            writing_style_id,
            kind,
            title,
            content,
            status,
            priority,
            version,
            tags,
            embedding
          )
          values (
            ${id}::uuid,
            ${block.frontmatter.category},
            ${writingStyleId}::uuid,
            ${block.frontmatter.kind}::rag_block_kind,
            ${block.frontmatter.id},
            ${block.content},
            ${toDbStatus(block.frontmatter.status)}::rag_block_status,
            ${block.frontmatter.priority},
            ${versionToInteger(block.frontmatter.version)},
            ${buildTags(block)},
            ${embeddingLiteral}::vector(1536)
          )
          on conflict (id) do update set
            category_code = excluded.category_code,
            writing_style_id = excluded.writing_style_id,
            kind = excluded.kind,
            title = excluded.title,
            content = excluded.content,
            status = excluded.status,
            priority = excluded.priority,
            version = excluded.version,
            tags = excluded.tags,
            embedding = excluded.embedding,
            updated_at = now()
        `;
        all.push({ blockId: id, writingStyleId, upserted: true });
      }
    }
    return all;
  } finally {
    await sql.end();
  }
}
