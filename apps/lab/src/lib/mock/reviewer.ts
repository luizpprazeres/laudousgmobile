export type TrechoTier = "universal" | "contextual" | "optional" | "llm-pure";

export type ReviewerBlock = {
  id: string;
  slug: string;
  priority: number;
  similarity: number;
  tier: TrechoTier;
  note?: string;
};

export type ReviewerSegment =
  | { type: "block"; blockId: string; tier: TrechoTier; text: string }
  | { type: "text"; text: string };

export type ReviewerSection = {
  heading: string;
  paragraphs?: ReviewerSegment[][];
  list?: ReviewerSegment[][];
};

export const REVIEWER_META = {
  id: "b968d77e",
  category: "ABDOMEN_TOTAL",
  time: "17:14",
  checksum: "5b1d8f3",
  contract: "a3b2d…fc1",
  promptVersion: "1.2",
  pipeline: "v1",
  retrievedTotal: 26,
  usedTotal: 7,
  skippedTotal: 7,
  coverage: 0.96,
};

export const REVIEWER_SECTIONS: ReviewerSection[] = [
  {
    heading: "COMENTÁRIOS:",
    paragraphs: [
      [
        { type: "block", blockId: "template-padrao", tier: "universal", text: "Exame realizado com transdutor convexo de 4.0 MHz, com paciente em decúbito dorsal, em condições técnicas adequadas." },
      ],
    ],
  },
  {
    heading: "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    paragraphs: [
      [
        { type: "block", blockId: "figado-variantes", tier: "contextual", text: "Fígado de dimensões normais, contornos regulares, ecogenicidade preservada, sem evidências de lesões focais ao método." },
        { type: "text", text: " " },
        { type: "block", blockId: "vesicula-variantes", tier: "contextual", text: "Vesícula biliar com paredes finas, contendo imagem hiperecoica, móvel, medindo 1,2 cm no seu maior eixo, ocasionando sombra acústica posterior." },
        { type: "text", text: " " },
        { type: "block", blockId: "vias-biliares", tier: "contextual", text: "Vias biliares intra e extra-hepáticas de calibre normal." },
        { type: "text", text: " " },
        { type: "block", blockId: "pancreas-variantes", tier: "contextual", text: "Pâncreas de morfologia e ecogenicidade habituais, ducto pancreático principal de calibre normal." },
        { type: "text", text: " " },
        { type: "block", blockId: "rins-variantes", tier: "contextual", text: "Rim direito com imagem anecoica de paredes finas, medindo 2,3 x 1,4 x 1,8 cm, em terço médio, compatível com cisto simples." },
        { type: "text", text: " " },
        { type: "block", blockId: "rim-esquerdo", tier: "universal", text: "Rim esquerdo de aspecto preservado." },
        { type: "text", text: " " },
        { type: "block", blockId: "aorta-baco-llm", tier: "llm-pure", text: "Baço, aorta abdominal e veia cava inferior sem alterações." },
        { type: "text", text: " " },
        { type: "block", blockId: "bexiga-padrao", tier: "optional", text: "Bexiga em repleção parcial, sem alterações." },
      ],
    ],
  },
  {
    heading: "CONCLUSÃO:",
    list: [
      [{ type: "block", blockId: "colelitiase-conclusao", tier: "contextual", text: "Colelitíase única, sem sinais de complicação ao método." }],
      [{ type: "block", blockId: "cisto-renal-conclusao", tier: "contextual", text: "Rim direito apresentando cisto simples cortical em terço médio." }],
      [{ type: "block", blockId: "fechamento-padrao", tier: "universal", text: "Demais órgãos abdominais avaliados sem alterações ao método." }],
    ],
  },
];

export const REVIEWER_BLOCKS: Record<string, ReviewerBlock> = {
  "template-padrao": { id: "template-padrao", slug: "template-padrao-abdomen", priority: 100, similarity: 0.755, tier: "universal", note: "universal · entrou sempre" },
  "figado-variantes": { id: "figado-variantes", slug: "figado-variantes", priority: 75, similarity: 0.583, tier: "contextual", note: "contextual" },
  "vesicula-variantes": { id: "vesicula-variantes", slug: "vesicula-variantes", priority: 75, similarity: 0.710, tier: "contextual", note: "contextual · key match" },
  "vias-biliares": { id: "vias-biliares", slug: "vias-biliares", priority: 75, similarity: 0.534, tier: "contextual", note: "contextual" },
  "pancreas-variantes": { id: "pancreas-variantes", slug: "pancreas-variantes", priority: 75, similarity: 0.521, tier: "contextual", note: "contextual" },
  "rins-variantes": { id: "rins-variantes", slug: "rins-variantes", priority: 75, similarity: 0.682, tier: "contextual", note: "contextual" },
  "rim-esquerdo": { id: "rim-esquerdo", slug: "rim-esquerdo-padrao", priority: 95, similarity: 0.598, tier: "universal", note: "universal" },
  "aorta-baco-llm": { id: "aorta-baco-llm", slug: "(LLM puro)", priority: 0, similarity: 0, tier: "llm-pure", note: "sem source · gerado pelo LLM" },
  "bexiga-padrao": { id: "bexiga-padrao", slug: "bexiga-padrao", priority: 65, similarity: 0.512, tier: "optional", note: "opcional" },
  "colelitiase-conclusao": { id: "colelitiase-conclusao", slug: "colelitiase-conclusao", priority: 80, similarity: 0.701, tier: "contextual", note: "contextual" },
  "cisto-renal-conclusao": { id: "cisto-renal-conclusao", slug: "cisto-renal-conclusao", priority: 80, similarity: 0.658, tier: "contextual", note: "contextual" },
  "fechamento-padrao": { id: "fechamento-padrao", slug: "fechamento-padrao", priority: 99, similarity: 0.641, tier: "universal", note: "universal" },
};

export const COVERAGE_BREAKDOWN = [
  { label: "Universal", color: "bg-brand-500", value: 0.38, blocks: 3 },
  { label: "Contextual", color: "bg-sky-500", value: 0.42, blocks: 3 },
  { label: "Opcional", color: "bg-stone-400", value: 0.16, blocks: 1 },
  { label: "LLM puro", color: "bg-violet-500", value: 0.04, blocks: 1 },
];

export type Suggestion = {
  id: number;
  tone: "warning" | "info";
  title: React.ReactNode;
  detail: string;
  action?: { label: string; href: string };
};

export const SUGGESTIONS: Suggestion[] = [
  {
    id: 1,
    tone: "warning",
    title: '"cisto-hepatico-simples" foi cortado (quota frase=8)',
    detail: 'Considere fundir variantes ("cisto único", "cistos múltiplos") em 1 bloco; ou aumentar quota.',
    action: { label: "Abrir block →", href: "/blocks" },
  },
  {
    id: 2,
    tone: "warning",
    title: "modelo-alternativo-doppler entrou com .655 mas não foi usado",
    detail: "Investigar relevância — pode ser ruído no embedding ou contexto fora de escopo.",
  },
  {
    id: 3,
    tone: "info",
    title: 'Trecho "Baço, aorta abdominal…" veio do LLM puro',
    detail: 'Considere criar block "aorta-baco-padrao" pra reduzir alucinação.',
  },
];

export const USED_BLOCKS_COMPACT = [
  { priority: 100, slug: "template-padrao-abdomen", similarity: 0.755, tier: "universal" as const },
  { priority: 99, slug: "ordem-secoes", similarity: 0.641, tier: "universal" as const },
  { priority: 75, slug: "vesicula-variantes", similarity: 0.710, tier: "contextual" as const },
  { priority: 75, slug: "rins-variantes", similarity: 0.682, tier: "contextual" as const },
  { priority: 75, slug: "figado-variantes", similarity: 0.583, tier: "contextual" as const },
  { priority: 65, slug: "bexiga-padrao", similarity: 0.512, tier: "optional" as const },
];
