"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useHover } from "./HoverContext";

export function Trecho({ blockId, children }: { blockId: string; children: ReactNode }) {
  const { hovered, setHovered } = useHover();
  const active = hovered === blockId;

  return (
    <span
      className={cn(
        "rounded px-1 -mx-1 transition-colors duration-150",
        active ? "bg-brand-50 ring-1 ring-inset ring-brand-200" : "hover:bg-stone-100",
      )}
      onMouseEnter={() => setHovered(blockId)}
      onMouseLeave={() => setHovered(null)}
    >
      {children}
    </span>
  );
}

export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-violet-100 px-1 font-medium text-violet-700">{children}</span>
  );
}
