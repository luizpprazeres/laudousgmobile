import { AlertTriangle, Check, X } from "lucide-react";
import type { AuditStatus } from "@/lib/mock/audit";
import { cn } from "@/lib/utils";

export function StatusIcon({ status, size = "md" }: { status: AuditStatus; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const icon = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  if (status === "ok") {
    return (
      <span className={cn("grid place-items-center rounded-full bg-emerald-100 text-emerald-700", dim)}>
        <Check strokeWidth={3} className={icon} />
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className={cn("grid place-items-center rounded-full bg-amber-100 text-amber-700", dim)}>
        <AlertTriangle fill="currentColor" className={icon} />
      </span>
    );
  }
  return (
    <span className={cn("grid place-items-center rounded-full bg-rose-100 text-rose-700", dim)}>
      <X strokeWidth={3} className={icon} />
    </span>
  );
}
