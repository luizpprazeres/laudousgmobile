import { NextResponse } from "next/server";
import {
  deleteBlock,
  promotedRelPath,
  readBlock,
  rootExists,
  updateBlockStatus,
  writeBlock,
} from "@/lib/knowledge/fs";
import {
  commitFile,
  deleteFile,
  isGitHubConfigured,
} from "@/lib/knowledge/github-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GH_PATH_PREFIX = "packages/knowledge/snippets";

/**
 * POST /api/blocks/promote
 * Body: { path: string }
 *
 * Promove um block do status:draft pro status:published. Se o arquivo
 * está sob __rev__/, move pro KIND pai junto com o update do frontmatter.
 *
 * Estratégia dual (igual ao PUT /api/blocks/file):
 *  - Dev local (filesystem writable): write + (se isRev) unlink old
 *  - Prod (Vercel): commit no GitHub + (se isRev) delete old
 *
 * GitHub move = 2 commits separados (PUT novo + DELETE old). Não-atômico,
 * mas seguro: se DELETE falhar após PUT, arquivo fica duplicado e operador
 * pode limpar manualmente. PUT-first garante que o conteúdo já está vivo.
 */
export async function POST(req: Request) {
  let body: { path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "json inválido" }, { status: 400 });
  }

  if (!body.path || typeof body.path !== "string") {
    return NextResponse.json({ error: "path obrigatório" }, { status: 400 });
  }

  const block = readBlock(body.path);
  if (!block) {
    return NextResponse.json({ error: "block não encontrado" }, { status: 404 });
  }

  const targetPath = promotedRelPath(body.path);
  const isMove = targetPath !== body.path;

  const statusUpdate = updateBlockStatus(body.path, "published");
  if (!statusUpdate.ok || !statusUpdate.raw) {
    return NextResponse.json(
      { error: statusUpdate.error ?? "falha ao atualizar frontmatter" },
      { status: 500 },
    );
  }

  const root = rootExists();
  const useFs = root.writable;

  if (useFs) {
    // Filesystem path (dev local)
    const writeResult = writeBlock(targetPath, statusUpdate.raw);
    if (!writeResult.ok) {
      // Se o write falhou por arquivo destino não existir (caso isMove), criar
      // não é responsabilidade desse path. Reportar erro.
      if (isMove) {
        return NextResponse.json(
          {
            error: `write destino falhou: ${writeResult.error}. Crie ${targetPath} primeiro ou copie manualmente.`,
          },
          { status: 500 },
        );
      }
      return NextResponse.json({ error: writeResult.error }, { status: 500 });
    }
    if (isMove) {
      const delResult = deleteBlock(body.path);
      if (!delResult.ok) {
        return NextResponse.json(
          {
            ok: true,
            target: "filesystem",
            newPath: targetPath,
            warning: `arquivo movido pra ${targetPath}, mas falhou ao remover ${body.path}: ${delResult.error}`,
          },
        );
      }
    }
    return NextResponse.json({ ok: true, target: "filesystem", newPath: targetPath });
  }

  if (!isGitHubConfigured()) {
    return NextResponse.json(
      {
        error: "filesystem read-only e GitHub não configurado. Configure GITHUB_TOKEN+OWNER+REPO.",
      },
      { status: 400 },
    );
  }

  // GitHub path (prod)
  try {
    const commitMessage = isMove
      ? `promote(blocks): ${body.path} → ${targetPath}\n\nstatus draft → published + move pra fora de __rev__\nvia LaudoUSG.lab`
      : `promote(blocks): ${body.path}\n\nstatus draft → published\nvia LaudoUSG.lab`;

    const putCommit = await commitFile({
      repoPath: `${GH_PATH_PREFIX}/${targetPath}`,
      content: statusUpdate.raw,
      message: commitMessage,
    });

    if (isMove) {
      try {
        const delCommit = await deleteFile({
          repoPath: `${GH_PATH_PREFIX}/${body.path}`,
          message: `cleanup(blocks): remove ${body.path} após promote\n\nvia LaudoUSG.lab`,
        });
        return NextResponse.json({
          ok: true,
          target: "github",
          newPath: targetPath,
          commits: { put: putCommit, delete: delCommit },
        });
      } catch (delErr) {
        // PUT funcionou, DELETE falhou. Arquivo está duplicado em ambos paths.
        const msg = delErr instanceof Error ? delErr.message : "delete falhou";
        return NextResponse.json({
          ok: true,
          target: "github",
          newPath: targetPath,
          warning: `arquivo criado em ${targetPath} mas falhou ao remover ${body.path}: ${msg}. Limpe manualmente.`,
          commits: { put: putCommit },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      target: "github",
      newPath: targetPath,
      commits: { put: putCommit },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "github commit falhou";
    const status = msg.includes("conflict") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
