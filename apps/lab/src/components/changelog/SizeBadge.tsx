import type { ChangelogSize } from "@/lib/changelog/types";
import { cn } from "@/lib/utils";

const CLASSES: Record<ChangelogSize, string> = {
  small: "bg-stone-100 text-stone-700",
  medium: "bg-sky-100 text-sky-800",
  large: "bg-violet-100 text-violet-800",
  epic: "bg-amber-100 text-amber-800",
};

export function SizeBadge({ size }: { size: ChangelogSize }) {
  return (
    <span className={cn("rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider", CLASSES[size])}>
      {size}
    </span>
  );
}
