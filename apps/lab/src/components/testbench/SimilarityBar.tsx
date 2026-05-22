import { cn } from "@/lib/utils";

type Props = {
  value: number;
  tier?: "universal" | "contextual" | "optional" | "skipped";
  className?: string;
  width?: string;
};

const TIER_FILL = {
  universal: "bg-emerald-500",
  contextual: "bg-sky-500",
  optional: "bg-stone-400",
  skipped: "bg-rose-400",
} as const;

export function SimilarityBar({ value, tier = "universal", className, width = "w-24" }: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const display = value.toFixed(2).replace(/^0/, "");
  return (
    <div className={cn("flex items-center gap-1.5", width, className)}>
      <div className="h-1 flex-1 rounded-full bg-stone-100">
        <div className={cn("h-1 rounded-full", TIER_FILL[tier])} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[10px] text-stone-600">{display}</span>
    </div>
  );
}
