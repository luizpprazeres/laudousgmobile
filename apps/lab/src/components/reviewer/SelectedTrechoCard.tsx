"use client";

import Link from "next/link";
import type { ReviewerBlock } from "@/lib/mock/reviewer";
import { cn } from "@/lib/utils";

const TIER_CHIP: Record<ReviewerBlock["tier"], string> = {
  universal: "bg-emerald-100 text-emerald-800",
  contextual: "bg-sky-100 text-sky-800",
  optional: "bg-stone-100 text-stone-700",
  "llm-pure": "bg-violet-100 text-violet-800",
};

const TIER_BAR: Record<ReviewerBlock["tier"], string> = {
  universal: "bg-emerald-500",
  contextual: "bg-sky-500",
  optional: "bg-stone-400",
  "llm-pure": "bg-violet-500",
};

type Props = {
  block: ReviewerBlock;
  sectionLabel: string;
};

export function SelectedTrechoCard({ block, sectionLabel }: Props) {
  const isLLM = block.tier === "llm-pure";
  return (
    <div className="mt-6 inline-block max-w-md rounded-xl border border-stone-200 bg-white p-4 shadow-pop">
      <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
        trecho selecionado · {sectionLabel}
      </p>
      <div className="mt-2 flex items-start gap-2">
        <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold", TIER_CHIP[block.tier])}>
          {isLLM ? "—" : `p${block.priority}`}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-xs font-medium text-stone-900">{block.slug}</p>
          {block.note && <p className="font-mono text-[11px] text-stone-500">{block.note}</p>}
        </div>
      </div>
      {!isLLM && (
        <div className="mt-3 flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-stone-500">sim</span>
            <div className="h-1 w-20 rounded-full bg-stone-100">
              <div className={cn("h-1 rounded-full", TIER_BAR[block.tier])} style={{ width: `${block.similarity * 100}%` }} />
            </div>
            <span className="font-mono text-stone-700">{block.similarity.toFixed(3).replace(/^0/, "")}</span>
          </div>
        </div>
      )}
      <div className="mt-3 flex items-center gap-1.5">
        {!isLLM ? (
          <>
            <Link
              className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-700"
              href="/blocks"
            >
              Abrir no editor →
            </Link>
            <button
              aria-label="Ver histórico (em breve)"
              className="cursor-not-allowed rounded-md border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-400"
              disabled
              type="button"
            >
              Ver histórico
            </button>
          </>
        ) : (
          <p className="text-[11px] italic text-stone-500">
            Trecho sem block correspondente. Veja sugestões à direita pra criar.
          </p>
        )}
      </div>
    </div>
  );
}
