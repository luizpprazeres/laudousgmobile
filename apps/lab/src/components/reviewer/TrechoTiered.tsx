"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TrechoTier } from "@/lib/mock/reviewer";

const TIER_CLASSES: Record<TrechoTier, string> = {
  universal: "bg-brand-50 ring-1 ring-inset ring-brand-200",
  contextual: "bg-sky-50 ring-1 ring-inset ring-sky-200",
  optional: "bg-stone-100 ring-1 ring-inset ring-stone-200",
  "llm-pure": "bg-violet-50 ring-1 ring-inset ring-violet-200",
};

type Props = {
  blockId: string;
  tier: TrechoTier;
  selected: boolean;
  onSelect: (id: string) => void;
  children: ReactNode;
};

export function TrechoTiered({ blockId, tier, selected, onSelect, children }: Props) {
  return (
    <span
      className={cn(
        "rounded px-1 -mx-1 cursor-pointer transition-[filter] duration-100 hover:brightness-95",
        TIER_CLASSES[tier],
        selected && "outline outline-2 outline-offset-2 outline-brand-600",
      )}
      onClick={() => onSelect(blockId)}
    >
      {children}
    </span>
  );
}
