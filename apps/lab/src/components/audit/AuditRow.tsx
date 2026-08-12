"use client";

import type { AuditRow } from "@/lib/audit/types";
import { cn } from "@/lib/utils";
import { StatusIcon } from "./StatusIcon";

const FMT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type Props = {
  row: AuditRow;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function AuditRowItem({ row, selected, onSelect }: Props) {
  const secs = FMT.format(row.durationMs / 1000);

  return (
    <li
      className={cn(
        "relative cursor-pointer px-5 py-3.5 transition-colors",
        selected ? "bg-stone-50/70 ring-1 ring-inset ring-brand-100" : "hover:bg-stone-50/60",
      )}
      onClick={() => onSelect(row.id)}
    >
      {selected && <span aria-hidden className="absolute inset-y-0 left-0 w-1 rounded-r bg-brand-600" />}
      <div className="flex items-start gap-2">
        {!selected && <StatusIcon status={row.status} size="sm" />}
        {selected && <StatusIcon status={row.status} size="sm" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-stone-900">{row.category}</span>
            <span className="font-mono text-[10px] text-stone-400">{row.shortId}</span>
            {row.badge && (
              <span
                className={cn(
                  "ml-auto rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase",
                  row.status === "error" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800",
                )}
              >
                {row.badge}
              </span>
            )}
          </div>
          <p className="mt-1.5 truncate font-mono text-xs text-stone-600">{`"${row.inputPreview}"`}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-stone-500">
            <span>{row.quando}</span>
            <span className="text-stone-300">·</span>
            <span>{secs}s</span>
            {row.blocksUsed > 0 && (
              <>
                <span className="text-stone-300">·</span>
                <span>{row.blocksUsed} blocks</span>
              </>
            )}
            {row.medico && (
              <>
                <span className="text-stone-300">·</span>
                <span className="normal-case tracking-normal text-stone-600">{row.medico}</span>
              </>
            )}
            {row.modelo && (
              <>
                <span className="text-stone-300">·</span>
                <span className="normal-case tracking-normal">{row.modelo}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
