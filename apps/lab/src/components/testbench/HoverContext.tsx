"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Ctx = {
  hovered: string | null;
  setHovered: (id: string | null) => void;
};

const HoverCtx = createContext<Ctx | null>(null);

export function HoverProvider({ children }: { children: ReactNode }) {
  const [hovered, setHovered] = useState<string | null>(null);
  return <HoverCtx.Provider value={{ hovered, setHovered }}>{children}</HoverCtx.Provider>;
}

export function useHover() {
  const ctx = useContext(HoverCtx);
  if (!ctx) throw new Error("useHover must be used within HoverProvider");
  return ctx;
}
