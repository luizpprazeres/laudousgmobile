"use client";

import { Eye, FileText, RotateCcw, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  filename: string;
  path: string;
  modified: boolean;
  writable: boolean;
  saving?: boolean;
  onSave?: () => void;
  onRevert?: () => void;
};

export function EditorHeader({ filename, path, modified, writable, saving, onSave, onRevert }: Props) {
  const canSave = modified && writable && !saving;
  const saveLabel = saving ? "Salvando…" : "Salvar";

  return (
    <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <FileText aria-hidden className="h-4 w-4 text-stone-400" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-stone-900">{filename}</span>
            {modified && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-amber-800">
                ★ modified
              </span>
            )}
            {!writable && (
              <span
                className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-stone-600"
                title="Filesystem read-only — rode dev local pra editar"
              >
                read-only
              </span>
            )}
          </div>
          <p className="font-mono text-[11px] text-stone-500">{path}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
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
          title={!writable ? "Filesystem read-only" : undefined}
          type="button"
        >
          <Save aria-hidden className="h-3.5 w-3.5" />
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
