import { createHmac, timingSafeEqual } from "node:crypto";
import { ingestSingleBlock, parseMarkdownBlock } from "@/server/admin/knowledgeIngest";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // up to 60s in Vercel pro plan; pra Hobby usa 10s padrão e mitigamos via paralelismo

const KNOWLEDGE_PREFIX = "packages/knowledge/snippets/";

type PushCommit = {
  added?: string[];
  modified?: string[];
  removed?: string[];
};

type PushPayload = {
  ref?: string;
  repository?: { full_name?: string; default_branch?: string };
  commits?: PushCommit[];
  head_commit?: PushCommit;
};

/**
 * POST /api/admin/github-webhook
 *
 * Endpoint chamado pelo GitHub quando há push no repo. Identifica .md files
 * alterados em packages/knowledge/snippets/** e dispara re-ingest no Supabase.
 *
 * Auth: HMAC-SHA256 do body com GITHUB_WEBHOOK_SECRET no header X-Hub-Signature-256.
 *
 * Não responde em <= 10s se houver muitos arquivos — mitigar com paralelismo + ajustar
 * maxDuration. Pra Hobby plan, limitamos a 5 arquivos por request (overflow é raro).
 */
export async function POST(req: Request) {
  const signature = req.headers.get("x-hub-signature-256");
  const event = req.headers.get("x-github-event");
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    return json({ error: "github_webhook_not_configured" }, 503);
  }
  if (!signature) {
    return json({ error: "missing_signature" }, 401);
  }
  if (event !== "push") {
    // ping (test no GitHub) ou outros eventos — aceitar 200 sem processar
    return json({ ok: true, ignored: event ?? "unknown" });
  }

  const rawBody = await req.text();
  if (!verifyHmac(rawBody, signature, secret)) {
    return json({ error: "invalid_signature" }, 401);
  }

  let payload: PushPayload;
  try {
    payload = JSON.parse(rawBody) as PushPayload;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const branch = payload.ref?.replace("refs/heads/", "") ?? "main";
  const repoFullName = payload.repository?.full_name;
  if (!repoFullName) {
    return json({ error: "missing_repository" }, 400);
  }

  const changedFiles = collectChangedKnowledgeFiles(payload);
  if (changedFiles.length === 0) {
    return json({ ok: true, processed: 0, message: "nenhum .md em packages/knowledge/snippets/" });
  }

  // Limit pra serverless timeout — em batch grande, processar via lote dedicado
  const MAX = 5;
  const filesToProcess = changedFiles.slice(0, MAX);
  const overflow = changedFiles.length - filesToProcess.length;

  const results: Array<{
    path: string;
    ok: boolean;
    blockId?: string;
    writingStylesUpserted?: number;
    error?: string;
  }> = [];

  // paraleliza com Promise.allSettled — falha em 1 não derruba o resto
  const settled = await Promise.allSettled(
    filesToProcess.map((relPath) => processFile(repoFullName, branch, relPath)),
  );

  for (let i = 0; i < settled.length; i++) {
    const path = filesToProcess[i]!;
    const result = settled[i]!;
    if (result.status === "fulfilled") {
      results.push({ path, ok: true, ...result.value });
    } else {
      results.push({
        path,
        ok: false,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  }

  return json({
    ok: true,
    processed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    overflow,
    results,
  });
}

function verifyHmac(payload: string, signature: string, secret: string): boolean {
  const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}

function collectChangedKnowledgeFiles(payload: PushPayload): string[] {
  const set = new Set<string>();
  const allCommits = payload.commits ?? [];
  if (payload.head_commit) allCommits.push(payload.head_commit);

  for (const commit of allCommits) {
    for (const list of [commit.added, commit.modified]) {
      if (!list) continue;
      for (const file of list) {
        // Filtros:
        //  - Path canônico packages/knowledge/snippets/...
        //  - Apenas .md
        //  - Pula arquivos com prefixo underline (convenção drafts/auxiliares: `_*.md`)
        //  - Pula tudo sob `/__rev__/` (S26: blocks em revisão NÃO vão pra produção
        //    até serem promovidos via /api/blocks/promote no Lab)
        if (
          file.startsWith(KNOWLEDGE_PREFIX) &&
          file.endsWith(".md") &&
          !file.includes("/_") &&
          !file.includes("/__rev__/")
        ) {
          set.add(file);
        }
      }
    }
  }

  return Array.from(set).sort();
}

async function processFile(
  repoFullName: string,
  branch: string,
  relPath: string,
): Promise<{ blockId: string; writingStylesUpserted: number }> {
  const content = await fetchRawFromGitHub(repoFullName, branch, relPath);
  const block = parseMarkdownBlock(content, relPath);
  const results = await ingestSingleBlock(block);
  return {
    blockId: block.frontmatter.id,
    writingStylesUpserted: results.length,
  };
}

async function fetchRawFromGitHub(repoFullName: string, branch: string, relPath: string): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN ausente — necessário pra repo privado");

  const url = `https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(relPath).replace(/%2F/g, "/")}?ref=${branch}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3.raw",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GitHub fetch ${relPath} → ${res.status}: ${detail.slice(0, 200)}`);
  }
  return await res.text();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
