import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const KNOWLEDGE_ROOT = path.join(process.cwd(), "..", "..", "packages", "knowledge", "snippets");

/**
 * Subdiretório opcional dentro de cada KIND pra blocks em revisão (drafts).
 * Ex: snippets/PARTES_MOLES/regra/__rev__/novo.md
 *
 * Backend ingest IGNORA arquivos sob __rev__/ (não vão pra produção).
 * Lab UI lista esses arquivos junto com os do KIND pai mas com badge "REV".
 * Promote-action move arquivo de __rev__/ pro KIND pai + atualiza status:published.
 */
const REV_DIR_NAME = "__rev__";

export type BlockStatus = "published" | "draft" | "deprecated";

export type FsBlock = {
  slug: string;
  filename: string;
  relPath: string;
  kind: string;
  category: string;
  priority: number;
  priorityTier: string;
  status: BlockStatus;
  version: string;
  modified: boolean;
  isRev: boolean;
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

function normalizeStatus(value: unknown): BlockStatus {
  if (value === "draft" || value === "deprecated") return value;
  return "published";
}

function parseFile(
  absPath: string,
  category: string,
  kind: string,
  isRev: boolean,
): FsBlock | null {
  try {
    const raw = fs.readFileSync(absPath, "utf-8");
    const parsed = matter(raw);
    const fm = parsed.data as Record<string, unknown>;
    const stat = fs.statSync(absPath);
    const slugFromName = path.basename(absPath, ".md");
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    const filename = path.basename(absPath);
    const relPath = isRev
      ? `${category}/${kind}/${REV_DIR_NAME}/${filename}`
      : `${category}/${kind}/${filename}`;
    return {
      slug: typeof fm.id === "string" ? fm.id.split("-").slice(-3).join("-") || slugFromName : slugFromName,
      filename,
      relPath,
      kind,
      category,
      priority: typeof fm.priority === "number" ? fm.priority : 0,
      priorityTier: typeof fm.priority_tier === "string" ? fm.priority_tier : derivedTier(fm.priority),
      status: normalizeStatus(fm.status),
      version: typeof fm.version === "string" ? fm.version : "—",
      modified: stat.mtimeMs > fiveDaysAgo,
      isRev,
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

function listMdFiles(dirAbsPath: string): string[] {
  try {
    return fs
      .readdirSync(dirAbsPath)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  } catch {
    return [];
  }
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
      const blocks: FsBlock[] = [];

      // Arquivos do KIND pai (status published por default)
      for (const file of listMdFiles(kindPath)) {
        const block = parseFile(path.join(kindPath, file), catDir.name, kindDir.name, false);
        if (block) blocks.push(block);
      }

      // Subdir __rev__ se existir — blocks em revisão (draft proposed)
      const revPath = path.join(kindPath, REV_DIR_NAME);
      if (safeExists(revPath) && fs.statSync(revPath).isDirectory()) {
        for (const file of listMdFiles(revPath)) {
          const block = parseFile(path.join(revPath, file), catDir.name, kindDir.name, true);
          if (block) blocks.push(block);
        }
      }

      blocks.sort((a, b) => {
        // REV primeiro (chama atenção pra revisar), depois por priority desc
        if (a.isRev !== b.isRev) return a.isRev ? -1 : 1;
        return b.priority - a.priority || a.filename.localeCompare(b.filename);
      });
      kinds.push({ kind: kindDir.name, blocks });
      totalBlocks += blocks.length;
    }

    kinds.sort((a, b) => a.kind.localeCompare(b.kind));
    categories.push({ slug: catDir.name, kinds, totalBlocks });
  }

  categories.sort((a, b) => a.slug.localeCompare(b.slug));
  return categories;
}

export type DraftCategoryStat = {
  slug: string;
  draftCount: number;
  lastUpdated: string; // ISO
  blocks: Array<{ relPath: string; filename: string; mtime: string; isRev: boolean }>;
};

/**
 * Retorna categorias que têm blocks com status:draft (incluindo arquivos
 * sob __rev__/, que sempre são considerados draft mesmo se frontmatter omitir).
 * Ordenado por mais recente atualização primeiro.
 */
export function listDraftsByCategory(): DraftCategoryStat[] {
  const cats = listCategories();
  const result: DraftCategoryStat[] = [];

  for (const cat of cats) {
    const drafts: DraftCategoryStat["blocks"] = [];
    let lastMtime = "";
    for (const kind of cat.kinds) {
      for (const block of kind.blocks) {
        const treatAsDraft = block.status === "draft" || block.isRev;
        if (!treatAsDraft) continue;
        drafts.push({
          relPath: block.relPath,
          filename: block.filename,
          mtime: block.stat.mtime,
          isRev: block.isRev,
        });
        if (block.stat.mtime > lastMtime) lastMtime = block.stat.mtime;
      }
    }
    if (drafts.length > 0) {
      drafts.sort((a, b) => b.mtime.localeCompare(a.mtime));
      result.push({
        slug: cat.slug,
        draftCount: drafts.length,
        lastUpdated: lastMtime,
        blocks: drafts,
      });
    }
  }

  result.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
  return result;
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
  if (!category || !kind) return null;
  const isRev = segments.length >= 4 && segments[2] === REV_DIR_NAME;
  const meta = parseFile(abs, category, kind, isRev);
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

/**
 * Atualiza o frontmatter `status:` do arquivo preservando todo o resto
 * (incluindo whitespace e formatação do corpo). Usa gray-matter pra parse/stringify.
 */
export function updateBlockStatus(
  relPath: string,
  newStatus: BlockStatus,
): { ok: boolean; raw?: string; error?: string } {
  const abs = safeRelPath(relPath);
  if (!abs || !safeExists(abs)) {
    return { ok: false, error: "arquivo não existe" };
  }
  try {
    const raw = fs.readFileSync(abs, "utf-8");
    const parsed = matter(raw);
    const nextData = { ...(parsed.data as Record<string, unknown>), status: newStatus };
    const next = matter.stringify(parsed.content, nextData);
    return { ok: true, raw: next };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "parse falhou" };
  }
}

/**
 * Computa novo relPath ao promover um block de __rev__/ pro KIND pai.
 * Se o block não está em __rev__, retorna o mesmo relPath.
 */
export function promotedRelPath(relPath: string): string {
  const segments = relPath.split("/");
  if (segments.length >= 4 && segments[2] === REV_DIR_NAME) {
    return [segments[0], segments[1], ...segments.slice(3)].join("/");
  }
  return relPath;
}

export function deleteBlock(relPath: string): { ok: boolean; error?: string } {
  if (!isWritable()) return { ok: false, error: "filesystem read-only" };
  const abs = safeRelPath(relPath);
  if (!abs) return { ok: false, error: "path inválido" };
  if (!safeExists(abs)) return { ok: false, error: "arquivo não existe" };
  try {
    fs.unlinkSync(abs);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "delete falhou" };
  }
}
