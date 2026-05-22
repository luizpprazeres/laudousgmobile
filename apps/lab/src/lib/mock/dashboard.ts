export type CategoryHealth = {
  slug: string;
  blocks: number;
  rating: number;
  successRate: number;
  avgSkipped: number;
  alert?: "atenção" | "atencao";
};

export type ActivityItem = {
  id: string;
  time: string;
  category?: string;
  tone: "brand" | "sky" | "stone" | "amber" | "neutral";
  title: string;
  meta: string;
};

export const dashboardMetrics = {
  activeBlocks: { value: 487, deltaText: "+12", note: "vs. 475 na semana anterior · 6 categorias com contracts", coverage: 0.62, coverageNote: "62% das 34 categorias mapeadas" },
  todayLaudos: { value: 23, deltaText: "▲ 18%", note: "vs. 19 ontem · tempo médio 9.4s", series: [30, 28, 25, 27, 20, 18, 22, 15, 12, 16, 10, 8, 5] },
  avgSkipped: { value: 4.2, deltaText: "▼ 1,3", note: "cortados por quota · objetivo ≤ 5", barsByCategory: [0.30, 0.55, 0.85, 0.42, 0.38, 0.25] },
};

export const categoryHealth: CategoryHealth[] = [
  { slug: "OBSTETRICA", blocks: 84, rating: 5, successRate: 1.0, avgSkipped: 2.4 },
  { slug: "PELVE_FEMININA", blocks: 99, rating: 4, successRate: 0.86, avgSkipped: 5.1 },
  { slug: "TIREOIDE", blocks: 66, rating: 5, successRate: 1.0, avgSkipped: 3.0 },
  { slug: "MAMARIA", blocks: 84, rating: 4, successRate: 0.92, avgSkipped: 3.8 },
  { slug: "DOPPLER_OBSTETRICO", blocks: 66, rating: 5, successRate: 1.0, avgSkipped: 2.1 },
  { slug: "ABDOMEN_TOTAL", blocks: 78, rating: 4, successRate: 0.85, avgSkipped: 8.1, alert: "atenção" },
];

export const activityFeed: ActivityItem[] = [
  { id: "1", time: "14:35 · agora", tone: "brand", category: "TIREOIDE", title: "geração concluída", meta: "24 blocks usados · 0 skipped · 8.1s" },
  { id: "2", time: "14:21", tone: "sky", category: "ABDOMEN", title: "edição em figado-variantes", meta: "re-ingestado · 1 row updated" },
  { id: "3", time: "13:58", tone: "stone", category: "OBSTETRICA", title: "novo teste no testbench", meta: "input curto · 31 blocks retrieved" },
  { id: "4", time: "13:42", tone: "amber", category: "MAMARIA", title: "warning RAG_EMPTY", meta: "corrigido em 4min · ingest aplicado" },
  { id: "5", time: "12:09", tone: "neutral", title: "deploy api@4f2c1a8", meta: "vercel · prod · 47s" },
];
