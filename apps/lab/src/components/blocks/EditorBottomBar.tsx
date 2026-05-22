import type { BlockContent } from "@/lib/mock/blocks";

export function EditorBottomBar({ block }: { block: BlockContent }) {
  return (
    <div className="flex flex-shrink-0 items-center justify-between border-t border-stone-200 bg-stone-50/60 px-6 py-2.5">
      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-stone-500">
        <span>v{block.version}</span>
        <span className="text-stone-300">·</span>
        <span>último edit: {block.lastEditBy} · {block.lastEditAt}</span>
        <span className="text-stone-300">·</span>
        <span>
          git: <span className="text-stone-900">{block.gitHash}</span>
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="font-mono text-stone-500">edits recentes</span>
        {block.edits.map((d) => (
          <button
            key={d}
            aria-label={`Diff em ${d} (em breve)`}
            className="cursor-not-allowed rounded border border-stone-200 bg-white px-1.5 py-0.5 font-mono text-stone-500"
            disabled
            type="button"
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
