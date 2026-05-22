"use client";

import { useId } from "react";
import type { BlockContent } from "@/lib/mock/blocks";
import { cn } from "@/lib/utils";

const TIER_CHIP: Record<BlockContent["priority_tier"], string> = {
  universal: "bg-emerald-100 text-emerald-800",
  contextual: "bg-sky-100 text-sky-800",
  optional: "bg-stone-100 text-stone-700",
};

export function FrontmatterForm({ block }: { block: BlockContent }) {
  const ids = {
    id: useId(),
    cat: useId(),
    kind: useId(),
    prio: useId(),
  };

  return (
    <div className="border-b border-stone-200 bg-stone-50/50 px-6 py-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 lg:grid-cols-4">
        <Field htmlFor={ids.id} label="id">
          <input
            id={ids.id}
            className="rounded border-stone-200 bg-white px-2 py-1 font-mono text-[11px] text-stone-700 focus:border-brand-500 focus:ring-brand-500"
            defaultValue={block.id}
            readOnly
            type="text"
          />
        </Field>
        <Field htmlFor={ids.cat} label="category">
          <select
            id={ids.cat}
            className="rounded border-stone-200 bg-white px-2 py-1 font-mono text-[11px] text-stone-900 focus:border-brand-500 focus:ring-brand-500"
            defaultValue={block.category}
          >
            <option>{block.category}</option>
          </select>
        </Field>
        <Field htmlFor={ids.kind} label="kind">
          <select
            id={ids.kind}
            className="rounded border-stone-200 bg-white px-2 py-1 font-mono text-[11px] text-stone-900 focus:border-brand-500 focus:ring-brand-500"
            defaultValue={block.kind}
          >
            <option>modelo</option>
            <option>regra</option>
            <option>frase</option>
            <option>conclusao</option>
            <option>excecao</option>
          </select>
        </Field>
        <Field htmlFor={ids.prio} label="priority">
          <div className="flex items-center gap-1">
            <input
              id={ids.prio}
              className="w-16 rounded border-stone-200 bg-white px-2 py-1 font-mono text-[11px] text-stone-900 focus:border-brand-500 focus:ring-brand-500"
              defaultValue={block.priority}
              max={100}
              min={0}
              type="number"
            />
            <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold", TIER_CHIP[block.priority_tier])}>
              {block.priority_tier}
            </span>
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field({ htmlFor, label, children }: { htmlFor: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
        {label}
      </label>
      {children}
    </div>
  );
}
