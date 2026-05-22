"use client";

import { FileText, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  status: "idle" | "running" | "done" | "error";
  meta?: { reportId: string | null };
};

function copy(text: string) {
  if (typeof navigator === "undefined") return;
  navigator.clipboard?.writeText(text).catch(() => {});
}

export function LaudoOutput({ text, status, meta }: Props) {
  const isRunning = status === "running";
  const empty = text.length === 0;
  const paragraphs = text.split("\n").filter((p) => p.length > 0);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-card lg:col-span-3">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-50 text-brand-700">
            <FileText aria-hidden className="h-4 w-4" />
          </span>
          <h2 className="font-display text-base font-semibold text-stone-900">Laudo gerado</h2>
          <StatusBadge status={status} />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium",
              empty ? "cursor-not-allowed text-stone-400" : "text-stone-700 hover:bg-stone-50",
            )}
            disabled={empty}
            onClick={() => copy(text)}
            type="button"
          >
            <Copy aria-hidden className="h-3.5 w-3.5" />
            Copiar
          </button>
          {meta?.reportId && (
            <a
              className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
              href={`/reviewer/${meta.reportId}`}
            >
              Reviewer →
            </a>
          )}
        </div>
      </div>
      <article className="min-h-[300px] px-6 py-6 font-sans text-[15px] leading-7 text-stone-800">
        {empty && status === "idle" && (
          <p className="text-stone-400">
            Cole ou dite um input acima e clique em <span className="font-semibold">Gerar laudo</span>.
          </p>
        )}
        {empty && isRunning && (
          <p className="text-stone-400">
            <span className="font-mono text-[11px] uppercase tracking-widest text-brand-700">aguardando structurer…</span>
          </p>
        )}
        {!empty && (
          <>
            {paragraphs.map((p, i) => (
              <p key={i} className="mb-2">
                {p}
                {isRunning && i === paragraphs.length - 1 && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-stone-400 align-middle" aria-hidden />}
              </p>
            ))}
            {isRunning && paragraphs.length === 0 && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-stone-400 align-middle" aria-hidden />}
          </>
        )}
      </article>
    </div>
  );
}

function StatusBadge({ status }: { status: Props["status"] }) {
  if (status === "running") {
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-amber-700">
        ● streaming
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-emerald-700">
        ✓ done
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-rose-700">
        ✗ erro
      </span>
    );
  }
  return (
    <span className="rounded-full border border-stone-200 bg-white px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-stone-500">
      idle
    </span>
  );
}
