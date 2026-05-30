"use client";

import { CheckCircle2, Eye, FileText, RotateCcw, Save, Sparkles } from "lucide-react";
import type { BlockStatus } from "@/lib/knowledge/fs";
import { cn } from "@/lib/utils";

type Props = {
  filename: string;
  path: string;
  modified: boolean;
  writable: boolean;
  githubReady?: boolean;
  saving?: boolean;
  status?: BlockStatus;
  isRev?: boolean;
  promoting?: boolean;
  onSave?: () => void;
  onRevert?: () => void;
  onPromote?: () => void;
};

const STATUS_CHIP: Record<BlockStatus, { label: string; cls: string; title?: string }> = {
  published: {
    label: "published",
    cls: "bg-emerald-100 text-emerald-800",
    title: "Em produção: vai pro ingest do /api/generate",
  },
  draft: {
    label: "draft",
    cls: "bg-amber-100 text-amber-800",
    title: "Aguardando revisão: NÃO vai pra produção até promover",
  },
  deprecated: {
    label: "deprecated",
    cls: "bg-stone-200 text-stone-700",
    title: "Histórico: não vai pra produção",
  },
};

export function EditorHeader({
  filename,
  path,
  modified,
  writable,
  githubReady,
  saving,
  status = "published",
  isRev = false,
  promoting,
  onSave,
  onRevert,
  onPromote,
}: Props) {
  const canPersist = writable || githubReady;
  const canSave = modified && canPersist && !saving;
  const saveLabel = saving ? "Salvando…" : "Salvar";

  const showPromote = (status === "draft" || isRev) && !!onPromote;
  const canPromote = showPromote && canPersist && !promoting && !modified;
  const promoteLabel = promoting ? "Promovendo…" : isRev ? "Promover (move + publish)" : "Promover pra publicado";
  const promoteTitle = !canPersist
    ? "Filesystem read-only e GitHub não configurado"
    : modified
      ? "Salve alterações pendentes antes de promover"
      : isRev
        ? `Move ${filename} de __rev__/ pro KIND pai e seta status: published`
        : "Atualiza frontmatter status: draft → published";

  const statusChip = STATUS_CHIP[status];

  return (
    <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <FileText aria-hidden className="h-4 w-4 text-stone-400" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-medium text-stone-900">{filename}</span>
            <span
              className={cn("rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase", statusChip.cls)}
              title={statusChip.title}
            >
              {statusChip.label}
            </span>
            {isRev && (
              <span
                className="rounded bg-sky-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-sky-800"
                title="Arquivo sob __rev__/ — revisão proposta de um block existente. Backend ingest ignora até promover."
              >
                rev
              </span>
            )}
            {modified && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-amber-800">
                ★ modified
              </span>
            )}
            {!writable && githubReady && (
              <span
                className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-emerald-800"
                title="Save vai commitar direto no GitHub (main)"
              >
                via github
              </span>
            )}
            {!writable && !githubReady && (
              <span
                className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-stone-600"
                title="Filesystem read-only e GitHub não configurado"
              >
                read-only
              </span>
            )}
          </div>
          <p className="font-mono text-[11px] text-stone-500">{path}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {showPromote && (
          <button
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition",
              canPromote
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "cursor-not-allowed bg-emerald-200 text-emerald-700/60",
            )}
            disabled={!canPromote}
            onClick={onPromote}
            title={promoteTitle}
            type="button"
          >
            {promoting ? (
              <Sparkles aria-hidden className="h-3.5 w-3.5 animate-pulse" />
            ) : (
              <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
            )}
            {promoteLabel}
          </button>
        )}
        <button
          className={cn(
            "rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium",
            modified ? "text-stone-700 hover:bg-stone-50" : "cursor-not-allowed text-stone-400",
          )}
          disabled={!modified}
          onClick={onRevert}
          type="button"
        >
          <RotateCcw aria-hidden className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom" />
          Revert
        </button>
        <button
          aria-label="Visualizar como system message (em breve)"
          className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-400"
          disabled
          type="button"
        >
          <Eye aria-hidden className="h-3.5 w-3.5" />
          Visualizar
        </button>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition",
            canSave ? "bg-brand-600 text-white hover:bg-brand-700" : "cursor-not-allowed bg-stone-200 text-stone-500",
          )}
          disabled={!canSave}
          onClick={onSave}
          title={!canPersist ? "Filesystem read-only e GitHub não configurado" : undefined}
          type="button"
        >
          <Save aria-hidden className="h-3.5 w-3.5" />
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
