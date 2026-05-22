"use client";

import { FileText } from "lucide-react";
import type { ReviewerBlock } from "@/lib/mock/reviewer";
import type { BuiltSection, BuiltSegment } from "@/lib/reviewer/segment-builder";
import { TrechoTiered } from "./TrechoTiered";
import { SelectedTrechoCard } from "./SelectedTrechoCard";

type Props = {
  category: string;
  retrievedTotal: number;
  usedTotal: number;
  skippedTotal: number;
  checksum: string;
  contract: string;
  promptVersion: string;
  pipeline: string;
  sections: BuiltSection[];
  blocks: Record<string, ReviewerBlock>;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function renderSegments(segments: BuiltSegment[], selectedId: string | null, onSelect: (id: string) => void) {
  return segments.map((seg, i) => {
    if (seg.type === "block") {
      return (
        <TrechoTiered
          key={`${seg.blockId}-${i}`}
          blockId={seg.blockId}
          tier={seg.tier}
          selected={selectedId === seg.blockId}
          onSelect={onSelect}
        >
          {seg.text}
        </TrechoTiered>
      );
    }
    return <span key={i}>{seg.text}</span>;
  });
}

function findSection(blockId: string, sections: BuiltSection[]): string {
  for (const section of sections) {
    if (section.paragraphs) {
      for (const para of section.paragraphs) {
        if (para.some((s) => s.type === "block" && s.blockId === blockId)) return section.heading.replace(":", "");
      }
    }
    if (section.list) {
      for (const item of section.list) {
        if (item.some((s) => s.type === "block" && s.blockId === blockId)) return section.heading.replace(":", "");
      }
    }
  }
  return "—";
}

function categoryHeadline(category: string): string {
  return `ULTRASSONOGRAFIA · ${category.replace(/_/g, " ")}`;
}

export function LaudoForensic({
  category,
  retrievedTotal,
  usedTotal,
  skippedTotal,
  checksum,
  contract,
  promptVersion,
  pipeline,
  sections,
  blocks,
  selectedId,
  onSelect,
}: Props) {
  const selectedBlock = selectedId ? blocks[selectedId] : null;
  const sectionLabel = selectedId ? findSection(selectedId, sections) : "";

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-card lg:col-span-3">
      <div className="border-b border-stone-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-50 text-brand-700">
            <FileText aria-hidden className="h-4 w-4" />
          </span>
          <h2 className="font-display text-base font-semibold text-stone-900">Laudo</h2>
          <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-stone-400">
            {retrievedTotal} retrieved · {usedTotal} usados · {skippedTotal} skipped
          </span>
        </div>
      </div>

      <article className="px-6 py-6 font-sans text-[15px] leading-7 text-stone-800">
        <h3 className="mb-4 font-display text-base font-bold tracking-tight text-brand-800">{categoryHeadline(category)}</h3>

        {sections.length === 0 ? (
          <p className="text-stone-500">Sem laudo gerado (output vazio).</p>
        ) : (
          sections.map((section, idx) => (
            <div key={idx} className="mb-3">
              {section.list && section.list.length > 0 ? (
                <>
                  <p className="mb-1.5">
                    <span className="font-semibold text-stone-900">{section.heading}</span>
                  </p>
                  <ol className="ml-5 list-decimal space-y-1.5 marker:font-semibold marker:text-stone-500">
                    {section.list.map((item, i) => (
                      <li key={i}>{renderSegments(item, selectedId, onSelect)}</li>
                    ))}
                  </ol>
                </>
              ) : section.paragraphs && section.paragraphs.length > 0 ? (
                section.paragraphs.map((segs, i) => (
                  <p key={i} className="mb-1.5">
                    {i === 0 && section.heading && (
                      <>
                        <span className="font-semibold text-stone-900">{section.heading}</span>{" "}
                      </>
                    )}
                    {renderSegments(segs, selectedId, onSelect)}
                  </p>
                ))
              ) : (
                <p className="font-semibold text-stone-900">{section.heading}</p>
              )}
            </div>
          ))
        )}

        {selectedBlock && <SelectedTrechoCard block={selectedBlock} sectionLabel={sectionLabel} />}

        <p className="mt-5 text-xs text-stone-400">
          <span className="font-mono">
            checksum {checksum} · contract {contract} · prompt v{promptVersion} · pipeline {pipeline}
          </span>
        </p>
      </article>
    </div>
  );
}
