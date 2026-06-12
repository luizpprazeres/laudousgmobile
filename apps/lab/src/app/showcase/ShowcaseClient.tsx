"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type ShowcaseSampleRow = {
  sample_key: string;
  category_code: string;
  variant_label: string;
  raw_input: string;
  laudo: string;
  model_writer: string | null;
  latency_ms: number | null;
  generated_at: string;
};

const COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 xl:grid-cols-2",
  4: "grid-cols-1 md:grid-cols-2 2xl:grid-cols-4",
};

export function ShowcaseClient({ samples }: { samples: ShowcaseSampleRow[] }) {
  const [cols, setCols] = useState<number>(4);
  const [rows, setRows] = useState(samples);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function regenerate(sampleKey: string) {
    setBusyKey(sampleKey);
    setError(null);
    try {
      const r = await fetch("/api/showcase/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample_key: sampleKey }),
      });
      const data = (await r.json()) as { sample?: ShowcaseSampleRow; error?: string };
      if (!r.ok || !data.sample) throw new Error(data.error ?? `HTTP ${r.status}`);
      setRows((prev) =>
        prev.map((row) => (row.sample_key === sampleKey ? data.sample! : row)),
      );
    } catch (err) {
      setError(
        `Falha ao regenerar ${sampleKey}: ${err instanceof Error ? err.message : err}`,
      );
    } finally {
      setBusyKey(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500 shadow-card">
        Nenhuma amostra ainda. Rode{" "}
        <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">
          pnpm tsx tests/showcase/generate-samples.ts
        </code>{" "}
        no monorepo para popular.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-stone-100 px-2.5 py-1 font-mono text-[11px] font-medium text-stone-600">
          {rows.length} amostras · dados fictícios
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-card">
          {[1, 2, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCols(n)}
              className={cn(
                "rounded-md px-3 py-1 font-mono text-xs font-semibold transition",
                cols === n
                  ? "bg-brand-600 text-white"
                  : "text-stone-500 hover:bg-stone-100",
              )}
            >
              {n}/linha
            </button>
          ))}
        </div>
      </div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          {error}
        </div>
      )}
      <div className={cn("grid gap-5", COLS[cols] ?? COLS[4])}>
        {rows.map((row) => (
          <article
            key={row.sample_key}
            className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card"
          >
            <header className="flex items-start justify-between gap-2 border-b border-stone-100 px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate font-display text-sm font-bold text-stone-900">
                  {row.category_code}
                </h2>
                <p className="truncate text-xs text-stone-500">{row.variant_label}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold",
                    row.model_writer === "renderer/v1"
                      ? "bg-brand-100 text-brand-800"
                      : "bg-amber-100 text-amber-800",
                  )}
                  title={
                    row.model_writer === "renderer/v1"
                      ? "Montado pelo renderer determinístico (DET-5)"
                      : "Escrito pelo writer LLM sobre o bundle determinístico"
                  }
                >
                  {row.model_writer === "renderer/v1" ? "renderer" : "writer"}
                </span>
                <button
                  type="button"
                  onClick={() => regenerate(row.sample_key)}
                  disabled={busyKey !== null}
                  aria-label={`Regenerar ${row.sample_key}`}
                  className="rounded-md p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-brand-700 disabled:opacity-40"
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", busyKey === row.sample_key && "animate-spin")}
                  />
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-auto bg-stone-50/60 p-4" style={{ maxHeight: cols === 1 ? "none" : "30rem" }}>
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-stone-800">
                {row.laudo}
              </pre>
            </div>
            <footer className="border-t border-stone-100 px-4 py-2">
              <details>
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-600">
                  ditado fictício · {new Date(row.generated_at).toLocaleString("pt-BR")}
                  {row.latency_ms ? ` · ${(row.latency_ms / 1000).toFixed(1)}s` : ""}
                </summary>
                <p className="mt-2 text-xs italic text-stone-600">{row.raw_input}</p>
              </details>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
