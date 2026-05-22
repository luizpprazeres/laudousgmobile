import { ChangelogTimeline } from "@/components/changelog/ChangelogTimeline";
import { HeroStats } from "@/components/changelog/HeroStats";
import { getAllChangelog } from "@/lib/changelog/loader";

export default function ChangelogPage() {
  const entries = getAllChangelog();

  return (
    <div className="px-6 py-6 lg:px-10">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">diário editorial</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-stone-900">Changelog</h1>
        <p className="mt-0.5 max-w-2xl text-sm text-stone-600">
          Cada marco em 3 lentes: médica, técnica, negócio. Clique pra abrir o detalhe e alternar entre as audiências.
        </p>
      </div>

      <div className="mb-8">
        <HeroStats entries={entries} />
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-10 text-center text-sm text-stone-500 shadow-card">
          Nenhum marco encontrado em <code className="font-mono text-xs">docs/changelog/</code>.
        </div>
      ) : (
        <ChangelogTimeline entries={entries} />
      )}
    </div>
  );
}
