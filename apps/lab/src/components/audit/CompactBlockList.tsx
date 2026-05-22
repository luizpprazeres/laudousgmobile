import { Check, X } from "lucide-react";
import type { AuditCompactBlock } from "@/lib/mock/audit";
import { cn } from "@/lib/utils";

type Tone = "retrieved" | "skipped";

const TONES = {
  retrieved: {
    box: "border-stone-200 bg-white",
    headerBorder: "border-stone-100",
    headerText: "text-emerald-700",
    listDivide: "divide-stone-100",
  },
  skipped: {
    box: "border-rose-200 bg-rose-50/30",
    headerBorder: "border-rose-200",
    headerText: "text-rose-700",
    listDivide: "divide-rose-100",
  },
} as const;

const CHIP_TIER = {
  universal: "bg-emerald-100 text-emerald-800",
  contextual: "bg-sky-100 text-sky-800",
  optional: "bg-stone-100 text-stone-700",
  skipped: "bg-rose-100 text-rose-700",
} as const;

type Props = {
  tone: Tone;
  label: string;
  blocks: AuditCompactBlock[];
};

export function CompactBlockList({ tone, label, blocks }: Props) {
  const t = TONES[tone];
  const Icon = tone === "retrieved" ? Check : X;

  return (
    <div className={cn("rounded-lg border", t.box)}>
      <div className={cn("border-b px-3 py-2", t.headerBorder)}>
        <p className={cn("flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest", t.headerText)}>
          <Icon strokeWidth={3} className="h-3 w-3" />
          {label}
        </p>
      </div>
      <ul className={cn("px-2 py-1", t.listDivide, "divide-y")}>
        {blocks.map((b, i) => (
          <li key={i} className="px-1 py-1.5 text-[11px]">
            {b.priority > 0 && (
              <span className={cn("rounded px-1 font-mono text-[9px] font-semibold", CHIP_TIER[b.tier])}>
                p{b.priority}
              </span>
            )}{" "}
            <span
              className={cn(
                "font-mono",
                tone === "skipped" ? "text-stone-700 line-through decoration-rose-300" : b.priority === 0 ? "text-stone-400" : "text-stone-900",
              )}
            >
              {b.slug}
            </span>{" "}
            {b.priority > 0 && <span className="font-mono text-stone-500">{b.similarity.toFixed(3).replace(/^0/, "")}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
