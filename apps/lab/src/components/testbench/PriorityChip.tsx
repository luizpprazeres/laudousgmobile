import { cn } from "@/lib/utils";

type Props = {
  priority: number;
  tier: "universal" | "contextual" | "optional" | "skipped";
  className?: string;
};

const TIER_CLASSES = {
  universal: "bg-emerald-100 text-emerald-800",
  contextual: "bg-sky-100 text-sky-800",
  optional: "bg-stone-100 text-stone-700",
  skipped: "bg-rose-100 text-rose-700",
} as const;

export function PriorityChip({ priority, tier, className }: Props) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold",
        TIER_CLASSES[tier],
        className,
      )}
    >
      p{priority}
    </span>
  );
}
