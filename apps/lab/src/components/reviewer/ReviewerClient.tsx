"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReviewerData } from "@/lib/supabase/reviewer-queries";
import { CoverageCard } from "./CoverageCard";
import { LaudoForensic } from "./LaudoForensic";
import { LegendBar } from "./LegendBar";
import { SuggestionsCard } from "./SuggestionsCard";
import { UsedBlocksList } from "./UsedBlocksList";

type Props = {
  data: ReviewerData;
  prevId: string | null;
  nextId: string | null;
};

export function ReviewerClient({ data, prevId, nextId }: Props) {
  const firstBlockId = Object.keys(data.blocks)[0] ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(firstBlockId);

  const coveragePct = Math.round(data.meta.coverage * 100);

  const breakdown = [
    { label: "Universal", color: "bg-brand-500", count: data.coverage.universal.count, pct: data.coverage.universal.pct },
    { label: "Contextual", color: "bg-sky-500", count: data.coverage.contextual.count, pct: data.coverage.contextual.pct },
    { label: "Opcional", color: "bg-stone-400", count: data.coverage.optional.count, pct: data.coverage.optional.pct },
    { label: "LLM puro", color: "bg-violet-500", count: data.coverage.llmPure.count, pct: data.coverage.llmPure.pct },
  ];

  return (
    <div className="px-6 py-6 lg:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">forensic reviewer</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-stone-900">
            Laudo <span className="font-mono">{data.meta.shortId}</span>
          </h1>
          <p className="mt-0.5 text-sm text-stone-600">
            <span className="font-mono">{data.meta.category}</span> · {data.meta.time} · Cobertura{" "}
            <span className="font-semibold text-stone-900">{coveragePct}%</span> de blocks identificados (heurística por overlap de tokens).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {prevId ? (
            <a
              className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
              href={`/reviewer/${prevId}`}
            >
              <ChevronLeft aria-hidden className="h-3.5 w-3.5" />
              Anterior
            </a>
          ) : (
            <button
              aria-label="Sem geração anterior"
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-400"
              disabled
              type="button"
            >
              <ChevronLeft aria-hidden className="h-3.5 w-3.5" />
              Anterior
            </button>
          )}
          {nextId ? (
            <a
              className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
              href={`/reviewer/${nextId}`}
            >
              Próximo
              <ChevronRight aria-hidden className="h-3.5 w-3.5" />
            </a>
          ) : (
            <button
              aria-label="Sem próxima geração"
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-400"
              disabled
              type="button"
            >
              Próximo
              <ChevronRight aria-hidden className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <LegendBar />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <LaudoForensic
          category={data.meta.category}
          retrievedTotal={data.meta.retrievedTotal}
          usedTotal={data.meta.usedTotal}
          skippedTotal={data.meta.skippedTotal}
          checksum={data.meta.checksum}
          contract={data.meta.contract}
          promptVersion={data.meta.promptVersion}
          pipeline={data.meta.pipeline}
          sections={data.sections}
          blocks={data.blocks}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <aside className="space-y-5 lg:col-span-2">
          <CoverageCard
            coveragePct={coveragePct}
            breakdown={breakdown}
            retrievedTotal={data.meta.retrievedTotal}
            usedTotal={data.meta.usedTotal}
            skippedTotal={data.meta.skippedTotal}
          />
          <SuggestionsCard suggestions={data.suggestions} />
          <UsedBlocksList items={data.usedBlocks} auditId={data.meta.id} />
        </aside>
      </div>
    </div>
  );
}
