export type AuditStatus = "ok" | "warning" | "error";

export type AuditCompactBlock = {
  kind: string;
  priority: number;
  similarity: number;
  slug: string;
  tier: "universal" | "contextual" | "optional" | "skipped";
};

export type AuditRow = {
  id: string;
  shortId: string;
  category: string;
  time: string;
  durationMs: number;
  blocksUsed: number;
  blocksSkipped: number;
  status: AuditStatus;
  badge?: string;
  inputPreview: string;
};

export type AuditDetail = AuditRow & {
  pipeline: string;
  promptVersion: string;
  contract: string;
  writingStyle: string;
  inputFull: string;
  retrieved: AuditCompactBlock[];
  skipped: AuditCompactBlock[];
  warning?: { title: string; message: string };
};

export const AUDIT_ROWS: AuditRow[] = [
  {
    id: "b968d77e-3a14-4c91-9d52-fc1a8e2b9d40",
    shortId: "b968d77e",
    category: "ABDOMEN_TOTAL",
    time: "17:14",
    durationMs: 23400,
    blocksUsed: 26,
    blocksSkipped: 7,
    status: "warning",
    badge: "⚡ skipped alto",
    inputPreview: "Fígado de aspecto normal. Vesícula com cálculo de 1.2 cm…",
  },
  {
    id: "3c1f9e2a-aa11-4be0-9c12-22f50a1d2030",
    shortId: "3c1f9e2a",
    category: "DOPPLER_OBSTETRICO",
    time: "16:49",
    durationMs: 12100,
    blocksUsed: 20,
    blocksSkipped: 0,
    status: "ok",
    inputPreview: "32 semanas. Feto único cefálico. AU 1.34. Ducto venoso onda A presente…",
  },
  {
    id: "7a48b1d0-cc55-49e7-9001-aa11bb22cc33",
    shortId: "7a48b1d0",
    category: "MAMARIA",
    time: "16:47",
    durationMs: 8200,
    blocksUsed: 22,
    blocksSkipped: 0,
    status: "warning",
    badge: "sanity 2",
    inputPreview: "Cisto simples mama direita 0,8 cm QSL. BI-RADS 2…",
  },
  {
    id: "15c9e2af-1aab-43e0-9c92-fbeefa01bb22",
    shortId: "15c9e2af",
    category: "OBSTETRICA",
    time: "15:11",
    durationMs: 9800,
    blocksUsed: 24,
    blocksSkipped: 2,
    status: "ok",
    inputPreview: "30 semanas. Feto único cefálico. BCF 142. DBP 7,5 cm…",
  },
  {
    id: "98d4ce11-aabb-4ee0-9c00-33ffaa221100",
    shortId: "98d4ce11",
    category: "PELVE_FEMININA",
    time: "14:34",
    durationMs: 400,
    blocksUsed: 0,
    blocksSkipped: 0,
    status: "error",
    badge: "rag_empty",
    inputPreview: "Útero de tamanho aumentado, miomas múltiplos…",
  },
  {
    id: "aa12f3b8-9001-4444-aaaa-bbbbccccdddd",
    shortId: "aa12f3b8",
    category: "TIREOIDE",
    time: "13:22",
    durationMs: 11300,
    blocksUsed: 21,
    blocksSkipped: 0,
    status: "ok",
    inputPreview: "Lobo direito com nódulo isoecoico Nota 3, TI-RADS 3…",
  },
  {
    id: "fb31e0c1-5050-4001-9876-aaffbbccddee",
    shortId: "fb31e0c1",
    category: "ABDOMEN_TOTAL",
    time: "12:08",
    durationMs: 14200,
    blocksUsed: 25,
    blocksSkipped: 3,
    status: "ok",
    inputPreview: "Esteatose hepática moderada. Rim direito com cisto simples…",
  },
];

export const AUDIT_DETAIL: AuditDetail = {
  ...AUDIT_ROWS[0]!,
  pipeline: "v1",
  promptVersion: "1.2",
  contract: "a3b2d…fc1",
  writingStyle: "CLÁSSICO_COMPLETO",
  inputFull:
    "Fígado de aspecto normal, contornos regulares. Vesícula biliar com imagem hiperecoica móvel de 1,2 cm com sombra acústica. Rim direito com cisto simples 2,3 x 1,4 x 1,8 cm…",
  warning: {
    title: "7 blocks cortados por quota",
    message: 'Considere revisar quota de "frase" (8 → 10) ou fundir variantes de "Cisto hepático".',
  },
  retrieved: [
    { kind: "modelo", priority: 100, similarity: 0.755, slug: "template-padrao", tier: "universal" },
    { kind: "regra", priority: 99, similarity: 0.641, slug: "ordem-secoes", tier: "universal" },
    { kind: "regra", priority: 93, similarity: 0.612, slug: "unidades-biometria", tier: "universal" },
    { kind: "regra", priority: 75, similarity: 0.583, slug: "figado-variantes", tier: "contextual" },
    { kind: "frase", priority: 75, similarity: 0.71, slug: "vesicula-variantes", tier: "contextual" },
    { kind: "frase", priority: 75, similarity: 0.682, slug: "rins-variantes", tier: "contextual" },
    { kind: "—", priority: 0, similarity: 0, slug: "+ 20 outros…", tier: "optional" },
  ],
  skipped: [
    { kind: "modelo", priority: 88, similarity: 0.655, slug: "modelo-alternativo", tier: "skipped" },
    { kind: "frase", priority: 80, similarity: 0.527, slug: "cisto-hepatico-conclusao", tier: "skipped" },
    { kind: "regra", priority: 75, similarity: 0.498, slug: "pancreas-variantes", tier: "skipped" },
    { kind: "regra", priority: 70, similarity: 0.461, slug: "baço-variantes", tier: "skipped" },
    { kind: "regra", priority: 70, similarity: 0.412, slug: "aorta-padrao", tier: "skipped" },
    { kind: "regra", priority: 70, similarity: 0.388, slug: "retroperitoneo", tier: "skipped" },
    { kind: "regra", priority: 65, similarity: 0.371, slug: "incidental-findings", tier: "skipped" },
  ],
};
