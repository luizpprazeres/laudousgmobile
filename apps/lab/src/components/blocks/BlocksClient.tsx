"use client";

import { useEffect, useState } from "react";
import type { FsBlockContent, FsCategory } from "@/lib/knowledge/fs";
import { BlockTree } from "./BlockTree";
import { EditorBottomBar } from "./EditorBottomBar";
import { EditorHeader } from "./EditorHeader";
import { FrontmatterForm } from "./FrontmatterForm";
import { MarkdownEditor } from "./MarkdownEditor";

type BlockApiResponse = FsBlockContent & {
  writable: boolean;
  githubReady: boolean;
};

type Props = {
  categories: FsCategory[];
  writable: boolean;
  rootPath: string;
};

export function BlocksClient({ categories, writable, rootPath }: Props) {
  const firstPath = (() => {
    for (const cat of categories) {
      for (const kind of cat.kinds) {
        const b = kind.blocks[0];
        if (b) return b.relPath;
      }
    }
    return null;
  })();

  const [selectedPath, setSelectedPath] = useState<string | null>(firstPath);
  const [block, setBlock] = useState<FsBlockContent | null>(null);
  const [githubReady, setGithubReady] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPath) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/blocks/file?path=${encodeURIComponent(selectedPath)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return (await r.json()) as BlockApiResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setBlock(data);
        setGithubReady(!!data.githubReady);
        setContent(data.raw);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPath]);

  const dirty = block !== null && content !== block.raw;

  const handleSelect = (relPath: string) => {
    if (dirty && !window.confirm("Você tem alterações não salvas. Descartar?")) return;
    setSelectedPath(relPath);
  };

  const handleRevert = () => {
    if (block) setContent(block.raw);
  };

  const handleSave = async () => {
    if (!block || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/blocks/file", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: block.relPath, content }),
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        throw new Error((data.error as string | undefined) ?? `status ${res.status}`);
      }
      setBlock({ ...block, raw: content });
      const target = data.target as string | undefined;
      const commit = data.commit as { commitSha?: string; htmlUrl?: string } | undefined;
      if (target === "github" && commit?.htmlUrl) {
        window.alert(
          `Salvo via commit no GitHub.\n\nSHA: ${commit.commitSha?.slice(0, 7) ?? "?"}\nVer: ${commit.htmlUrl}\n\nVercel vai re-buildar o Lab em ~2min. Re-ingest no Supabase ainda é manual (P7.5.B.6 futuro).`,
        );
      } else {
        window.alert(`Salvo no filesystem local. Em prod (Vercel) cai no fallback GitHub.\n\nRe-ingest no Supabase ainda é manual (P7.5.B.6 futuro).`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "save falhou");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <BlockTree categories={categories} selectedPath={selectedPath} onSelect={handleSelect} />
      <section className="flex flex-1 flex-col overflow-hidden">
        {!selectedPath && (
          <EmptyState message="Selecione um block na árvore à esquerda." />
        )}
        {selectedPath && loading && !block && <EmptyState message="Carregando…" mono />}
        {selectedPath && error && !loading && (
          <EmptyState message={`Erro: ${error}`} tone="error" />
        )}
        {block && !loading && (
          <>
            <EditorHeader
              filename={block.filename}
              path={`${rootPath.split("/").slice(-3).join("/")}/${block.category}/${block.kind}/`}
              modified={dirty}
              writable={writable}
              githubReady={githubReady}
              saving={saving}
              onRevert={handleRevert}
              onSave={handleSave}
            />
            <FrontmatterForm block={mapToLegacy(block)} />
            <MarkdownEditor value={content} onChange={setContent} />
            <EditorBottomBar block={mapToLegacy(block)} />
            {error && (
              <div className="border-t border-rose-200 bg-rose-50/50 px-6 py-2 text-xs text-rose-700">{error}</div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function EmptyState({ message, mono, tone }: { message: string; mono?: boolean; tone?: "error" }) {
  return (
    <div className="grid flex-1 place-items-center bg-white">
      <div className="text-center">
        <p className={mono ? "font-mono text-[11px] uppercase tracking-widest text-brand-700" : ""}>
          {tone === "error" ? <span className="text-rose-700">{message}</span> : message}
        </p>
      </div>
    </div>
  );
}

type LegacyBlock = {
  id: string;
  slug: string;
  category: string;
  kind: "modelo" | "regra" | "frase" | "conclusao" | "excecao" | "comentario_tecnico" | "exemplo";
  priority: number;
  priority_tier: "universal" | "contextual" | "optional";
  version: string;
  modified: boolean;
  filename: string;
  path: string;
  body: string;
  edits: string[];
  gitHash: string;
  lastEditBy: string;
  lastEditAt: string;
};

function mapToLegacy(b: FsBlockContent): LegacyBlock {
  const tierValid = (b.priorityTier === "universal" || b.priorityTier === "contextual" || b.priorityTier === "optional")
    ? b.priorityTier
    : "optional";
  const kindValid = (
    ["modelo", "regra", "frase", "conclusao", "excecao", "comentario_tecnico", "exemplo"].includes(b.kind)
      ? b.kind
      : "regra"
  ) as LegacyBlock["kind"];
  const mtimeShort = b.stat.mtime.slice(0, 10);
  return {
    id: b.slug,
    slug: b.slug,
    category: b.category,
    kind: kindValid,
    priority: b.priority,
    priority_tier: tierValid,
    version: b.version,
    modified: b.modified,
    filename: b.filename,
    path: `${b.category}/${b.kind}/`,
    body: b.body,
    edits: [mtimeShort],
    gitHash: "—",
    lastEditBy: "filesystem",
    lastEditAt: b.stat.mtime.slice(0, 16).replace("T", " "),
  };
}
