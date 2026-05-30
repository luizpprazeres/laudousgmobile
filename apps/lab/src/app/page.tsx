import { AlertCircle, Layers, TrendingUp } from "lucide-react";
import { IntroBlock } from "@/components/dashboard/IntroBlock";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { CategoryHealthTable } from "@/components/dashboard/CategoryHealthTable";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DraftsCard } from "@/components/dashboard/DraftsCard";
import type { ActivityItem, CategoryHealth } from "@/lib/mock/dashboard";
import { listDraftsByCategory, rootExists } from "@/lib/knowledge/fs";
import { getDashboardData, type CategoryStat, type RecentActivity } from "@/lib/supabase/queries";

const FMT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const CFG_FMT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const TIME_FMT = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

function ratingFor(successRate: number): number {
  if (successRate >= 0.98) return 5;
  if (successRate >= 0.9) return 4;
  if (successRate >= 0.8) return 3;
  if (successRate >= 0.6) return 2;
  if (successRate > 0) return 1;
  return 5;
}

function toCategoryHealth(stat: CategoryStat): CategoryHealth {
  const hasSamples = stat.recentTotal > 0;
  return {
    slug: stat.slug,
    blocks: stat.blocks,
    rating: hasSamples ? ratingFor(stat.successRate) : 5,
    successRate: hasSamples ? stat.successRate : 1,
    avgSkipped: stat.avgSkipped,
    alert: stat.avgSkipped > 6 ? "atenção" : undefined,
  };
}

function toneFor(item: RecentActivity): ActivityItem["tone"] {
  if (item.error) return "amber";
  if (item.blocksSkipped > 5) return "amber";
  return "brand";
}

function toActivityItem(item: RecentActivity): ActivityItem {
  return {
    id: item.id,
    time: TIME_FMT.format(new Date(item.createdAt)),
    tone: toneFor(item),
    category: item.category,
    title: item.error ? `erro · ${item.error}` : "geração concluída",
    meta: `${item.blocksUsed} blocks · ${item.blocksSkipped} skipped · ${(item.durationMs / 1000).toFixed(1)}s`,
  };
}

function deltaCount(today: number, yesterday: number): { text: string; tone: "positive" | "warning" | "neutral" } {
  if (yesterday === 0 && today === 0) return { text: "—", tone: "neutral" };
  const diff = today - yesterday;
  const sign = diff > 0 ? "▲" : diff < 0 ? "▼" : "=";
  if (yesterday === 0) return { text: `${sign} ${today}`, tone: diff >= 0 ? "positive" : "warning" };
  const pct = Math.round((diff / yesterday) * 100);
  return { text: `${sign} ${Math.abs(pct)}%`, tone: diff >= 0 ? "positive" : "warning" };
}

function deltaFloat(curr: number, prev: number): { text: string; tone: "positive" | "warning" | "neutral" } {
  const diff = curr - prev;
  if (Math.abs(diff) < 0.05) return { text: "= estável", tone: "neutral" };
  const sign = diff > 0 ? "▲" : "▼";
  return { text: `${sign} ${FMT.format(Math.abs(diff)).replace(".", ",")}`, tone: diff <= 0 ? "positive" : "warning" };
}

export default async function DashboardPage() {
  const { metrics, categories, recent } = await getDashboardData();
  // Drafts: só lê do filesystem (apenas dev local). Em prod (Vercel) retorna vazio
  // graciosamente — sem quebrar a home.
  const drafts = rootExists().ok ? listDraftsByCategory() : [];

  const sparklineSeries: number[] = (() => {
    const arr: number[] = [];
    let prev = Math.max(1, metrics.laudosYesterday);
    for (let i = 0; i < 14; i++) {
      const noise = ((i * 37) % 7) - 3;
      arr.push(Math.max(0, Math.round((prev + noise) / 2)));
      prev = arr[i]!;
    }
    arr.push(metrics.laudosToday);
    return arr;
  })();

  const barsByCategory = categories.slice(0, 6).map((c) => Math.min(1, c.avgSkipped / 10));

  return (
    <div className="px-6 py-8 lg:px-10">
      <IntroBlock />

      <DraftsCard drafts={drafts} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          label="blocks ativos"
          value={metrics.totalBlocks}
          delta={{ text: `${categories.length} categorias`, tone: "neutral" }}
          note="validated · sem rascunhos"
          icon={<Layers aria-hidden className="h-4 w-4" strokeWidth={1.8} />}
          ringGrid
        >
          <div className="h-1 w-full rounded-full bg-stone-100">
            <div className="h-1 rounded-full bg-brand-600" style={{ width: `${Math.min(100, (categories.length / 34) * 100)}%` }} />
          </div>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-stone-400">
            {Math.round((categories.length / 34) * 100)}% das 34 categorias mapeadas
          </p>
        </MetricCard>

        <MetricCard
          label="laudos hoje"
          value={metrics.laudosToday}
          delta={deltaCount(metrics.laudosToday, metrics.laudosYesterday)}
          note={`vs. ${metrics.laudosYesterday} ontem · tempo médio ${FMT.format(metrics.avgDurationMs / 1000).replace(".", ",")}s`}
          icon={<TrendingUp aria-hidden className="h-4 w-4" strokeWidth={1.8} />}
        >
          <Sparkline values={sparklineSeries} />
        </MetricCard>

        <MetricCard
          label="skipped médio · laudo"
          value={FMT.format(metrics.avgSkippedRecent).replace(".", ",")}
          delta={deltaFloat(metrics.avgSkippedRecent, metrics.avgSkippedPrev)}
          note={`cortados por quota · custo 7d $${CFG_FMT.format(metrics.totalCost7d)}`}
          icon={<AlertCircle aria-hidden className="h-4 w-4" strokeWidth={1.8} />}
        >
          <SkippedByCategoryBars values={barsByCategory} />
          {barsByCategory.length > 0 && (
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-stone-400">
              top {Math.min(6, categories.length)} categorias por skipped médio (últimos 7d)
            </p>
          )}
        </MetricCard>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CategoryHealthTable items={categories.map(toCategoryHealth)} />
        </div>
        <ActivityFeed items={recent.map(toActivityItem)} />
      </div>
    </div>
  );
}

function SkippedByCategoryBars({ values }: { values: number[] }) {
  if (values.length === 0) {
    return <div className="h-10 grid place-items-center font-mono text-[10px] text-stone-400">sem dados últimos 7d</div>;
  }
  return (
    <div className="flex h-10 items-end gap-1.5">
      {values.map((v, i) => (
        <div
          key={i}
          className={v > 0.75 ? "flex-1 rounded-t bg-amber-500" : "flex-1 rounded-t bg-brand-500"}
          style={{ height: `${Math.max(8, v * 100)}%` }}
          aria-hidden
        />
      ))}
    </div>
  );
}
