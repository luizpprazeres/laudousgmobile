import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import postgres from "postgres";
import { WRITING_STYLE_IDS } from "@laudousg/db";

type KnowledgeKind =
  | "modelo"
  | "regra"
  | "frase"
  | "conclusao"
  | "excecao"
  | "comentario_tecnico"
  | "exemplo";

type Frontmatter = {
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

type KnowledgeBlock = {
  frontmatter: Frontmatter;
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

const WRITING_STYLE_IDS_FOR_INGEST = Object.values(WRITING_STYLE_IDS);
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const category = args.category;
  if (!category) {
    throw new Error("Uso: tsx apps/api/scripts/ingest-knowledge.ts --category OBSTETRICA [--dry-run]");
  }

  const dryRun = args.dryRun ?? process.env.NODE_ENV !== "production";
  const snippetsDir = path.join(ROOT_DIR, "packages/knowledge/snippets", category);
  const blocks = await readMarkdownBlocks(snippetsDir);

  if (dryRun) {
    printDryRun(blocks, category);
    return;
  }

  await ingestBlocks(blocks);
}

function parseArgs(argv: string[]) {
  const parsed: { category?: string; dryRun?: boolean } = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--category") parsed.category = argv[i + 1];
    if (arg === "--dry-run") parsed.dryRun = true;
  }
  return parsed;
}

async function readMarkdownBlocks(dir: string): Promise<KnowledgeBlock[]> {
  const files = await walkMarkdownFiles(dir);
  const blocks = await Promise.all(
    files.map(async (filePath) => {
      const raw = await readFile(filePath, "utf8");
      return parseMarkdownBlock(raw, filePath);
    }),
  );
  return blocks.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
}

async function walkMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walkMarkdownFiles(fullPath);
      if (entry.isFile() && entry.name.endsWith(".md")) return [fullPath];
      return [];
    }),
  );
  return nested.flat();
}

function parseMarkdownBlock(raw: string, filePath: string): KnowledgeBlock {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Frontmatter ausente em ${filePath}`);
  const frontmatter = parseFrontmatter(match[1] ?? "", filePath);
  const content = (match[2] ?? "").trim();
  if (!content) throw new Error(`Conteúdo vazio em ${filePath}`);
  return { frontmatter, content, filePath };
}

function parseFrontmatter(raw: string, filePath: string): Frontmatter {
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

function parseStatus(value: string | undefined): Frontmatter["status"] {
  if (value === "draft" || value === "archived") return value;
  return "published";
}

function printDryRun(blocks: KnowledgeBlock[], category: string) {
  const counts = countByKind(blocks);
  const tokenEstimate = blocks.reduce((sum, block) => sum + estimateTokens(block.content), 0);
  console.log(`dry-run: ${blocks.length} blocos para ${category}`);
  console.log(`dry-run: ${JSON.stringify(counts)}`);
  console.log(`dry-run: ~${tokenEstimate} tokens estimados para embeddings`);
  for (const block of blocks) {
    console.log(
      `- ${block.frontmatter.kind} ${block.frontmatter.id} priority=${block.frontmatter.priority} tokens≈${estimateTokens(block.content)}`,
    );
  }
}

function countByKind(blocks: KnowledgeBlock[]) {
  return blocks.reduce<Record<string, number>>((acc, block) => {
    acc[block.frontmatter.kind] = (acc[block.frontmatter.kind] ?? 0) + 1;
    return acc;
  }, {});
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

async function ingestBlocks(blocks: KnowledgeBlock[]) {
  const databaseUrl = process.env.DATABASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!databaseUrl) throw new Error("DATABASE_URL ausente");
  if (!apiKey) throw new Error("OPENAI_API_KEY ausente");

  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  const openai = new OpenAI({ apiKey });

  try {
    for (const block of blocks) {
      const embedding = await createEmbedding(openai, block.content);
      const embeddingLiteral = `[${embedding.join(",")}]`;
      for (const writingStyleId of WRITING_STYLE_IDS_FOR_INGEST) {
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
            ${sql.unsafe(embeddingLiteral)}::vector(1536)
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
        console.log(`upsert: ${block.frontmatter.id} style=${writingStyleId}`);
      }
    }
  } finally {
    await sql.end();
  }
}

async function createEmbedding(openai: OpenAI, content: string) {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: content,
  });
  const embedding = response.data[0]?.embedding;
  if (!embedding) throw new Error("embedding vazio");
  return embedding;
}

function toDbStatus(status: Frontmatter["status"]) {
  if (status === "archived") return "archived";
  if (status === "draft") return "draft";
  return "validated";
}

function versionToInteger(version: string) {
  const major = Number.parseInt(version.split(".")[0] ?? "1", 10);
  return Number.isFinite(major) ? major : 1;
}

function buildTags(block: KnowledgeBlock) {
  return [
    ...block.frontmatter.tags,
    block.frontmatter.source_path ? `source_path:${block.frontmatter.source_path}` : undefined,
    block.frontmatter.source_lines ? `source_lines:${block.frontmatter.source_lines}` : undefined,
  ].filter((value): value is string => Boolean(value));
}

function deterministicUuid(input: string) {
  const hex = createHash("sha256").update(input).digest("hex").slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
