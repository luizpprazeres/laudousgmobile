"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ClipboardCopy, Square } from "lucide-react";
import type { SourceBlock } from "@/lib/mock/testbench";
import { QUOTAS, DEFAULT_INPUT } from "@/lib/mock/testbench";
import { buildTestbenchMarkdown } from "@/lib/testbench/format";
import { useGenerate } from "@/lib/testbench/use-generate";
import type { RagBlockSummary } from "@/lib/testbench/sse-types";
import { HoverProvider } from "./HoverContext";
import { InputCard } from "./InputCard";
import { LaudoOutput } from "./LaudoOutput";
import { QuotaBars } from "./QuotaBars";
import { SourceMapPanel } from "./SourceMapPanel";
import { StatPill } from "./StatPill";
import { Toolbar } from "./Toolbar";

function tierFor(priority: number): SourceBlock["tier"] {
  if (priority >= 90) return "universal";
  if (priority >= 75) return "contextual";
  return "optional";
}

function adaptBlocks(retrieved: RagBlockSummary[]): SourceBlock[] {
  return retrieved.map((b) => {
    const priority = b.priority ?? 0;
    const tier = tierFor(priority);
    return {
      id: b.id,
      slug: b.title,
      kind: (b.kind ?? "—") as SourceBlock["kind"],
      priority,
      similarity: 0,
      tier,
      note: tier === "universal" ? "universal" : tier === "contextual" ? "contextual" : "opcional",
    };
  });
}

const FMT1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function TestbenchClient() {
  const [category, setCategory] = useState("OBSTETRICA");
  const [style, setStyle] = useState("CLÁSSICO_COMPLETO");
  const [lastInput, setLastInput] = useState<string>(DEFAULT_INPUT);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { state, run, reset, cancel } = useGenerate();

  const blocks = useMemo(() => adaptBlocks(state.retrieved), [state.retrieved]);

  const totalDurMs = state.finishedAt && state.startedAt ? state.finishedAt - state.startedAt : null;
  const firstTokenMs = state.firstTokenAt && state.startedAt ? state.firstTokenAt - state.startedAt : null;

  const stats = {
    total: totalDurMs ? FMT1.format(totalDurMs / 1000) : "—",
    firstToken: firstTokenMs ? FMT1.format(firstTokenMs / 1000) : "—",
    retrieved: state.retrieved.length,
    sanity: state.sanityIssuesCount,
    warning: state.warning?.code ?? "—",
    reportId: state.reportId ?? "—",
  };

  const isRunning = state.status === "running";
  const canCopyMarkdown = state.status === "done" || state.status === "error";

  const handleGenerate = (input: string) => {
    setLastInput(input);
    run({
      raw_input: input,
      category_hint: category,
      writing_style_code: style,
    });
  };

  const handleCopyMarkdown = async () => {
    const md = buildTestbenchMarkdown({ state, category, style, input: lastInput });
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copiar manualmente:", md);
    }
  };

  return (
    <div className="px-6 py-6 lg:px-10">
      <div className="mb-2 flex justify-end">
        <button
          aria-label="Copiar tudo como markdown (input + laudo + blocks + stats)"
          className={
            canCopyMarkdown
              ? "inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-card transition hover:bg-stone-50"
              : "inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-400"
          }
          disabled={!canCopyMarkdown}
          onClick={handleCopyMarkdown}
          title={canCopyMarkdown ? "Cola direto no terminal pra reportar bug ou pedir ajuste" : "Disponível após uma geração completar"}
          type="button"
        >
          {copied ? (
            <>
              <Check aria-hidden className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700">Copiado!</span>
            </>
          ) : (
            <>
              <ClipboardCopy aria-hidden className="h-3.5 w-3.5" />
              Copiar tudo como markdown
            </>
          )}
        </button>
      </div>

      <Toolbar category={category} style={style} onCategoryChange={setCategory} onStyleChange={setStyle} />

      <InputCard
        initial={DEFAULT_INPUT}
        onGenerate={handleGenerate}
        disabled={isRunning}
      />

      {state.error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-rose-700">{state.error.code}</p>
          <p className="mt-1 text-sm text-stone-900">{state.error.message}</p>
          <button
            className="mt-2 text-xs font-medium text-brand-700 hover:underline"
            onClick={reset}
            type="button"
          >
            Limpar
          </button>
        </div>
      )}

      {state.warning && !state.error && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-amber-800">⚠ {state.warning.code}</p>
          {state.warning.message && <p className="mt-0.5 text-xs text-amber-900">{state.warning.message}</p>}
        </div>
      )}

      {isRunning && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3 shadow-card">
          <p className="text-xs text-stone-600">
            <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-amber-500" />
            <span className="font-mono uppercase tracking-widest text-amber-700">streaming…</span>
          </p>
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
            onClick={cancel}
            type="button"
          >
            <Square aria-hidden className="h-3 w-3" fill="currentColor" />
            Cancelar
          </button>
        </div>
      )}

      <HoverProvider>
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-5">
          <LaudoOutput text={state.text} status={state.status} meta={{ reportId: state.reportId }} />
          <div className="space-y-4 lg:col-span-2">
            <SourceMapPanel
              blocks={blocks}
              totalRetrieved={state.retrieved.length}
              totalSkipped={0}
            />
            <QuotaBarsWrapper retrieved={state.retrieved.length} />
          </div>
        </div>
      </HoverProvider>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatPill label="tempo total" value={stats.total} unit="s" />
        <StatPill label="first-token" value={stats.firstToken} unit="s" />
        <StatPill label="retrieved" value={String(stats.retrieved)} />
        <StatPill label="sanity issues" value={String(stats.sanity)} />
        <StatPill label="warning" value={stats.warning} />
        <StatPill label="report id" value={stats.reportId.slice(0, 8)} />
      </div>
    </div>
  );
}

function QuotaBarsWrapper({ retrieved }: { retrieved: number }) {
  void retrieved;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-card">
      <QuotaBars quotas={QUOTAS} />
    </div>
  );
}
