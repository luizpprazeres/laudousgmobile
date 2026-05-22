"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHover } from "./HoverContext";
import { PriorityChip } from "./PriorityChip";
import { SimilarityBar } from "./SimilarityBar";
import type { SourceBlock } from "@/lib/mock/testbench";

export function BlockRow({ block }: { block: SourceBlock }) {
  const { hovered, setHovered } = useHover();
  const active = hovered === block.id;
  const isSkipped = block.tier === "skipped";

  return (
    <div
      className={cn(
        "flex cursor-pointer items-start gap-3 border-b border-stone-100 px-5 py-3 transition-colors",
        active ? "bg-brand-50/60 ring-1 ring-inset ring-brand-200" : "hover:bg-stone-50",
      )}
      onMouseEnter={() => setHovered(block.id)}
      onMouseLeave={() => setHovered(null)}
    >
      <span
        className={cn(
          "mt-0.5 grid h-5 w-5 place-items-center rounded-full",
          isSkipped ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700",
        )}
      >
        {isSkipped ? <X strokeWidth={3} className="h-3 w-3" /> : <Check strokeWidth={3} className="h-3 w-3" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate font-mono text-xs font-medium",
              isSkipped ? "text-stone-700 line-through decoration-rose-300" : "text-stone-900",
            )}
          >
            {block.slug}
          </span>
          <PriorityChip priority={block.priority} tier={block.tier} />
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <SimilarityBar value={block.similarity} tier={block.tier} />
          {block.note && (
            <span
              className={cn(
                "font-mono text-[10px] uppercase tracking-wider",
                block.note.includes("key match") ? "text-emerald-700" : block.tier === "universal" ? "text-emerald-700" : block.tier === "contextual" ? "text-sky-700" : "text-stone-400",
              )}
            >
              {block.note}
            </span>
          )}
          {block.skippedReason && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-rose-700">
              {block.skippedReason}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
