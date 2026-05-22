import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const KNOWLEDGE_ROOT = path.join(process.cwd(), "..", "..", "packages", "knowledge", "snippets");

export type FsBlock = {
  slug: string;
  filename: string;
  relPath: string;
  kind: string;
  category: string;
  priority: number;
  priorityTier: string;
  version: string;
  modified: boolean;
  stat: { mtime: string; size: number };
};

export type FsCategory = {
  slug: string;
  kinds: Array<{ kind: string; blocks: FsBlock[] }>;
  totalBlocks: number;
};

export type FsBlockContent = FsBlock & {
  body: string;
  raw: string;
  modifiedRecent: boolean;
};

function safeExists(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function isWritable(): boolean {
  try {
    fs.accessSync(KNOWLEDGE_ROOT, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function parseFile(absPath: string, category: string, kind: string): FsBlock | null {
  try {
    const raw = fs.readFileSync(absPath, "utf-8");
    const parsed = matter(raw);
    const fm = parsed.data as Record<string, unknown>;
    const stat = fs.statSync(absPath);
    const slugFromName = path.basename(absPath, ".md");
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    return {
      slug: typeof fm.id === "string" ? fm.id.split("-").slice(-3).join("-") || slugFromName : slugFromName,
      filename: path.basename(absPath),
      relPath: `${category}/${kind}/${path.basename(absPath)}`,
      kind,
      category,
      priority: typeof fm.priority === "number" ? fm.priority : 0,
      priorityTier: typeof fm.priority_tier === "string" ? fm.priority_tier : derivedTier(fm.priority),
      version: typeof fm.version === "string" ? fm.version : "—",
      modified: stat.mtimeMs > fiveDaysAgo,
      stat: { mtime: stat.mtime.toISOString(), size: stat.size },
    };
  } catch {
    return null;
  }
}

function derivedTier(priority: unknown): string {
  const n = typeof priority === "number" ? priority : 0;
  if (n >= 90) return "universal";
  if (n >= 75) return "contextual";
  return "optional";
}

export function rootExists(): { ok: boolean; path: string; writable: boolean } {
  return { ok: safeExists(KNOWLEDGE_ROOT), path: KNOWLEDGE_ROOT, writable: isWritable() };
}

export function listCategories(): FsCategory[] {
  if (!safeExists(KNOWLEDGE_ROOT)) return [];

  const categories: FsCategory[] = [];
  const categoryDirs = fs.readdirSync(KNOWLEDGE_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const catDir of categoryDirs) {
    const catPath = path.join(KNOWLEDGE_ROOT, catDir.name);
    const kindDirs = fs.readdirSync(catPath, { withFileTypes: true }).filter((d) => d.isDirectory());
    const kinds: FsCategory["kinds"] = [];
    let totalBlocks = 0;

    for (const kindDir of kindDirs) {
      const kindPath = path.join(catPath, kindDir.name);
      const files = fs.readdirSync(kindPath).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
      const blocks: FsBlock[] = [];
      for (const file of files) {
        const block = parseFile(path.join(kindPath, file), catDir.name, kindDir.name);
        if (block) blocks.push(block);
      }
      blocks.sort((a, b) => b.priority - a.priority || a.filename.localeCompare(b.filename));
      kinds.push({ kind: kindDir.name, blocks });
      totalBlocks += blocks.length;
    }

    kinds.sort((a, b) => a.kind.localeCompare(b.kind));
    categories.push({ slug: catDir.name, kinds, totalBlocks });
  }

  categories.sort((a, b) => a.slug.localeCompare(b.slug));
  return categories;
}

function safeRelPath(relPath: string): string | null {
  const normalized = path.normalize(relPath);
  if (normalized.includes("..")) return null;
  const abs = path.join(KNOWLEDGE_ROOT, normalized);
  if (!abs.startsWith(KNOWLEDGE_ROOT)) return null;
  return abs;
}

export function readBlock(relPath: string): FsBlockContent | null {
  const abs = safeRelPath(relPath);
  if (!abs || !safeExists(abs)) return null;
  const segments = relPath.split("/");
  if (segments.length < 3) return null;
  const [category, kind] = segments;
  const meta = parseFile(abs, category!, kind!);
  if (!meta) return null;
  const raw = fs.readFileSync(abs, "utf-8");
  return {
    ...meta,
    raw,
    body: raw,
    modifiedRecent: meta.modified,
  };
}

export function writeBlock(relPath: string, content: string): { ok: boolean; error?: string } {
  if (!isWritable()) return { ok: false, error: "filesystem read-only (provavelmente prod). Rode em dev local pra editar." };
  const abs = safeRelPath(relPath);
  if (!abs) return { ok: false, error: "path inválido" };
  if (!safeExists(abs)) return { ok: false, error: "arquivo não existe" };
  try {
    fs.writeFileSync(abs, content, "utf-8");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write falhou" };
  }
}
