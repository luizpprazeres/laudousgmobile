import { NextResponse } from "next/server";
import { readBlock, rootExists, writeBlock } from "@/lib/knowledge/fs";
import { commitFile, isGitHubConfigured, repoSettings } from "@/lib/knowledge/github-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GH_PATH_PREFIX = "packages/knowledge/snippets";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const relPath = url.searchParams.get("path");
  if (!relPath) return NextResponse.json({ error: "path obrigatório" }, { status: 400 });
  const block = readBlock(relPath);
  if (!block) return NextResponse.json({ error: "block não encontrado" }, { status: 404 });
  const root = rootExists();
  const githubReady = isGitHubConfigured();
  return NextResponse.json({
    ...block,
    writable: root.writable,
    githubReady,
    repo: githubReady ? repoSettings() : null,
  });
}

export async function PUT(req: Request) {
  let body: { path?: string; content?: string; via?: "filesystem" | "github" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "json inválido" }, { status: 400 });
  }
  if (!body.path || typeof body.content !== "string") {
    return NextResponse.json({ error: "path e content obrigatórios" }, { status: 400 });
  }

  const root = rootExists();
  const preferGitHub = body.via === "github" || (!root.writable && isGitHubConfigured());

  if (!preferGitHub) {
    const fsResult = writeBlock(body.path, body.content);
    if (fsResult.ok) {
      return NextResponse.json({ ok: true, target: "filesystem" });
    }
    if (!isGitHubConfigured()) {
      return NextResponse.json(
        {
          error: fsResult.error ?? "save filesystem falhou",
          hint: "Configure GITHUB_TOKEN+OWNER+REPO pra usar fallback GitHub.",
        },
        { status: 400 },
      );
    }
  }

  try {
    const repoPath = `${GH_PATH_PREFIX}/${body.path}`;
    const commit = await commitFile({
      repoPath,
      content: body.content,
      message: `edit(blocks): ${body.path}\n\nvia LaudoUSG.lab`,
    });
    return NextResponse.json({ ok: true, target: "github", commit });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "github commit falhou";
    const status = msg.includes("conflict") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
