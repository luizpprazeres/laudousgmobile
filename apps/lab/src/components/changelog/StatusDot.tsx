import type { ChangelogStatus } from "@/lib/changelog/types";
import { cn } from "@/lib/utils";

const STATUS_CLASSES: Record<ChangelogStatus, string> = {
  shipped: "bg-brand-600",
  "in-progress": "bg-amber-500",
  planned: "bg-stone-400",
  paused: "bg-rose-500",
};

const STATUS_LABEL: Record<ChangelogStatus, string> = {
  shipped: "shipped",
  "in-progress": "em progresso",
  planned: "planejado",
  paused: "pausado",
};

const STATUS_RING: Record<ChangelogStatus, string> = {
  shipped: "ring-brand-100",
  "in-progress": "ring-amber-100",
  planned: "ring-stone-100",
  paused: "ring-rose-100",
};

export function StatusDot({ status, ring = true, size = "md" }: { status: ChangelogStatus; ring?: boolean; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";
  const ringDim = size === "sm" ? "ring-2" : "ring-4";
  return (
    <span
      aria-label={STATUS_LABEL[status]}
      className={cn("inline-block rounded-full", STATUS_CLASSES[status], dim, ring && `${ringDim} ${STATUS_RING[status]}`)}
    />
  );
}

export function StatusLabel({ status }: { status: ChangelogStatus }) {
  return <span>{STATUS_LABEL[status]}</span>;
}
