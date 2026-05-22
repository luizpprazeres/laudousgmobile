"use client";

import { useState } from "react";
import { ChevronRight, Folder, Plus, Search, Star } from "lucide-react";
import type { FsCategory } from "@/lib/knowledge/fs";
import { cn } from "@/lib/utils";

type Props = {
  categories: FsCategory[];
  selectedPath: string | null;
  onSelect: (relPath: string) => void;
  initialExpanded?: string;
};

export function BlockTree({ categories, selectedPath, onSelect, initialExpanded }: Props) {
  const [filter, setFilter] = useState("");
  const filterLower = filter.trim().toLowerCase();

  const filtered = categories
    .map((cat) => ({
      ...cat,
      kinds: cat.kinds
        .map((k) => ({
          ...k,
          blocks: k.blocks.filter((b) => !filterLower || b.filename.toLowerCase().includes(filterLower) || b.slug.toLowerCase().includes(filterLower)),
        }))
        .filter((k) => k.blocks.length > 0 || !filterLower),
    }))
    .filter((cat) => cat.kinds.length > 0 || !filterLower);

  return (
    <aside className="w-72 flex-shrink-0 overflow-y-auto border-r border-stone-200 bg-white">
      <div className="sticky top-0 z-10 border-b border-stone-100 bg-white p-3">
        <div className="relative">
          <Search aria-hidden className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            className="w-full rounded-md border-stone-200 bg-stone-50 py-1.5 pl-8 pr-3 text-xs placeholder-stone-400 focus:border-brand-500 focus:ring-brand-500"
            onChange={(e) => setFilter(e.target.value)}
            placeholder="filtrar blocks…"
            type="text"
            value={filter}
          />
        </div>
      </div>

      <nav className="px-2 py-2 text-sm">
        {filtered.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-stone-400">Nenhum block bate com "{filter}"</p>
        )}
        {filtered.map((cat) => {
          const isSelectedCat = selectedPath?.startsWith(cat.slug);
          const isOpenInitially = !!isSelectedCat || cat.slug === initialExpanded || filterLower.length > 0;
          return (
            <details key={cat.slug} className="group/cat" open={isOpenInitially}>
              <summary className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-stone-50 [&::-webkit-details-marker]:hidden">
                <ChevronRight aria-hidden className="h-3.5 w-3.5 text-stone-400 transition group-open/cat:rotate-90" />
                <Folder
                  aria-hidden
                  className={cn("h-3.5 w-3.5", isSelectedCat ? "text-amber-500" : "text-stone-400")}
                  fill={isSelectedCat ? "currentColor" : "none"}
                />
                <span className="font-mono text-xs font-semibold tracking-tight text-stone-900">{cat.slug}</span>
                <span className="ml-auto font-mono text-[10px] text-stone-400">{cat.totalBlocks}</span>
              </summary>
              <div className="ml-5 mt-0.5 space-y-0.5 border-l border-stone-100 pl-2">
                {cat.kinds.map((group) => {
                  const selectedInGroup = group.blocks.some((b) => b.relPath === selectedPath);
                  const groupOpen = selectedInGroup || filterLower.length > 0;
                  return (
                    <details key={group.kind} className="group/kind" open={groupOpen}>
                      <summary className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 hover:bg-stone-50 [&::-webkit-details-marker]:hidden">
                        <ChevronRight aria-hidden className="h-3 w-3 text-stone-400 transition group-open/kind:rotate-90" />
                        <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500">{group.kind}</span>
                        <span className="ml-auto font-mono text-[10px] text-stone-400">{group.blocks.length}</span>
                      </summary>
                      <ul className="mt-0.5 ml-3 space-y-0.5 text-xs">
                        {group.blocks.map((b) => {
                          const selected = b.relPath === selectedPath;
                          const displayName = b.filename.replace(/\.md$/, "");
                          return (
                            <li key={b.relPath}>
                              <button
                                className={cn(
                                  "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors",
                                  selected
                                    ? "bg-brand-50 font-semibold text-brand-800 ring-1 ring-inset ring-brand-100"
                                    : "text-stone-700 hover:bg-stone-50",
                                )}
                                onClick={() => onSelect(b.relPath)}
                                type="button"
                              >
                                {b.modified && <Star aria-hidden className="h-3 w-3 text-amber-500" fill="currentColor" />}
                                <span className="truncate font-mono">{displayName}</span>
                                {b.priority > 0 && (
                                  <span
                                    className={cn(
                                      "ml-auto rounded px-1 font-mono text-[9px] font-semibold",
                                      b.priority >= 90
                                        ? "bg-emerald-100 text-emerald-800"
                                        : b.priority >= 75
                                          ? "bg-sky-100 text-sky-800"
                                          : "bg-stone-100 text-stone-700",
                                    )}
                                  >
                                    p{b.priority}
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  );
                })}
              </div>
            </details>
          );
        })}

        <button
          aria-label="Novo block (em breve)"
          className="mt-3 inline-flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-dashed border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-400"
          disabled
          type="button"
        >
          <Plus aria-hidden className="h-3.5 w-3.5" />
          Novo block
        </button>
      </nav>
    </aside>
  );
}
