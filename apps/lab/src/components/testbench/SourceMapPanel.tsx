"use client";

import { Search } from "lucide-react";
import { type SourceBlock } from "@/lib/mock/testbench";
import { BlockRow } from "./BlockRow";

type KindKey = string;

type Props = {
  blocks: SourceBlock[];
  totalRetrieved: number;
  totalSkipped: number;
};

export function SourceMapPanel({ blocks, totalRetrieved, totalSkipped }: Props) {
  const retrieved = blocks.filter((b) => b.tier !== "skipped");
  const skipped = blocks.filter((b) => b.tier === "skipped");

  const grouped = new Map<KindKey, SourceBlock[]>();
  for (const b of retrieved) {
    const key = b.kind ?? "—";
    const arr = grouped.get(key) ?? [];
    arr.push(b);
    grouped.set(key, arr);
  }

  return (
    <aside className="rounded-2xl border border-stone-200 bg-white shadow-card lg:col-span-2">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-violet-50 text-violet-700">
            <Search aria-hidden className="h-4 w-4" />
          </span>
          <h2 className="font-display text-base font-semibold text-stone-900">Source map</h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
          {totalRetrieved} retrieved · {totalSkipped} skipped
        </span>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {retrieved.length === 0 && skipped.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-stone-500">
            Sem blocks retrieved ainda. Roda uma geração pra preencher.
          </div>
        )}

        {Array.from(grouped.entries()).map(([kind, items]) => (
          <div key={kind}>
            <div className="border-b border-stone-100 px-5 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                {kind} · {items.length}
              </p>
            </div>
            {items.map((b) => (
              <BlockRow key={b.id} block={b} />
            ))}
          </div>
        ))}

        {skipped.length > 0 && (
          <>
            <div className="border-b border-stone-100 bg-rose-50/40 px-5 py-2.5">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-rose-700">
                cortados por quota · {skipped.length}
              </p>
            </div>
            {skipped.map((b) => (
              <BlockRow key={b.id} block={b} />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
