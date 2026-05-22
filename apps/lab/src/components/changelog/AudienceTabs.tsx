"use client";

import { useState } from "react";
import { Stethoscope, Code2, Briefcase } from "lucide-react";
import type { ChangelogBody } from "@/lib/changelog/types";
import { cn } from "@/lib/utils";
import { MarkdownBody } from "./MarkdownBody";

type TabId = "medico" | "tecnico";

const TABS: Array<{
  id: TabId;
  label: string;
  description: string;
  icon: typeof Code2;
}> = [
  {
    id: "medico",
    label: "Médico & Negócios",
    description: "Linguagem clínica para colegas + revisão de impacto",
    icon: Stethoscope,
  },
  {
    id: "tecnico",
    label: "Técnico",
    description: "Arquitetura, decisões, código",
    icon: Code2,
  },
];

export function AudienceTabs({ body }: { body: ChangelogBody }) {
  const [active, setActive] = useState<TabId>("medico");
  const activeTab = TABS.find((t) => t.id === active)!;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-card">
      <div role="tablist" aria-label="Audiência" className="flex border-b border-stone-100">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-panel-${tab.id}`}
              id={`tab-${tab.id}`}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-brand-600 bg-brand-50/30 text-brand-800"
                  : "border-transparent text-stone-500 hover:bg-stone-50 hover:text-stone-900",
              )}
              onClick={() => setActive(tab.id)}
              type="button"
            >
              <Icon aria-hidden className="h-4 w-4" strokeWidth={1.8} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="border-b border-stone-100 px-6 py-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">{activeTab.description}</p>
      </div>

      <div id={`tab-panel-${active}`} role="tabpanel" aria-labelledby={`tab-${active}`} className="px-6 py-6">
        {active === "medico" ? (
          <>
            <MarkdownBody>{body.leigo}</MarkdownBody>
            {body.impacto && <BusinessReview text={body.impacto} />}
          </>
        ) : (
          <MarkdownBody>{body.tecnico}</MarkdownBody>
        )}
      </div>
    </div>
  );
}

function BusinessReview({ text }: { text: string }) {
  return (
    <aside
      aria-label="Business review"
      className="mt-6 rounded-xl border border-amber-200 bg-amber-50/40 p-4"
    >
      <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-800">
        <Briefcase aria-hidden className="h-3 w-3" />
        business review
      </p>
      <div className="[&_p]:text-[14px] [&_p]:leading-6 [&_p]:text-stone-700">
        <MarkdownBody>{text}</MarkdownBody>
      </div>
    </aside>
  );
}
