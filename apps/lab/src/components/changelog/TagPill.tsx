export function TagPill({ tag }: { tag: string }) {
  return (
    <span className="rounded-full bg-stone-100 px-2 py-0.5 font-mono text-[10px] font-medium text-stone-600">
      {tag}
    </span>
  );
}
