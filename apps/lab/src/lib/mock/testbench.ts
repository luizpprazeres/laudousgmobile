export type Tier = "universal" | "contextual" | "optional" | "skipped";
export type BlockKind = "modelo" | "regra" | "frase" | "conclusao" | "excecao" | "comentario_tecnico" | "exemplo";

export type SourceBlock = {
  id: string;
  slug: string;
  kind: BlockKind;
  priority: number;
  similarity: number;
  tier: Tier;
  note?: string;
  skippedReason?: string;
};

export type Quota = {
  kind: BlockKind;
  short: string;
  used: number;
  max: number;
};

export const DEFAULT_INPUT =
  "30 semanas. Feto único cefálico. BCF 142. Dorso à esquerda. DBP 7,5 cm. CC 27,3 cm. CA 23,0 cm. CF 5,4 cm. Peso estimado 1240g. Líquido amniótico normal. Placenta corpórea anterior, grau I.";

export const QUOTAS: Quota[] = [
  { kind: "modelo", short: "modelo", used: 2, max: 2 },
  { kind: "regra", short: "regra", used: 7, max: 10 },
  { kind: "frase", short: "frase", used: 4, max: 8 },
  { kind: "conclusao", short: "concl.", used: 3, max: 3 },
  { kind: "excecao", short: "exce.", used: 1, max: 3 },
  { kind: "comentario_tecnico", short: "com.t.", used: 1, max: 3 },
  { kind: "exemplo", short: "exemp.", used: 1, max: 2 },
];

export const SOURCE_BLOCKS: SourceBlock[] = [
  { id: "template-padrao", slug: "template-padrao-obstetrico", kind: "modelo", priority: 100, similarity: 0.78, tier: "universal", note: "⚡ key match" },
  { id: "template-inicial", slug: "template-inicial-gestacao", kind: "modelo", priority: 100, similarity: 0.45, tier: "universal", note: "universal · não usado" },
  { id: "ordem-secoes", slug: "ordem-secoes", kind: "regra", priority: 99, similarity: 0.42, tier: "universal", note: "universal" },
  { id: "peso-fetal-percentil", slug: "peso-fetal-percentil", kind: "regra", priority: 75, similarity: 0.71, tier: "contextual", note: "⚡ key match" },
  { id: "liquido-amniotico", slug: "liquido-amniotico-sempre-incluir", kind: "regra", priority: 95, similarity: 0.58, tier: "universal", note: "universal" },
  { id: "dias-da-ig", slug: "dias-da-ig-omitir-zero", kind: "regra", priority: 96, similarity: 0.51, tier: "universal", note: "universal" },
  { id: "preservar-terminologia", slug: "preservar-terminologia", kind: "regra", priority: 94, similarity: 0.39, tier: "universal", note: "universal" },
  { id: "unidades-biometria", slug: "unidades-biometria-fetal", kind: "regra", priority: 93, similarity: 0.36, tier: "universal", note: "universal" },
  { id: "apresentacao-fetal", slug: "apresentacao-fetal-cefalica", kind: "regra", priority: 75, similarity: 0.62, tier: "contextual", note: "contextual" },
  { id: "biometria-fetal", slug: "biometria-fetal-formato", kind: "frase", priority: 75, similarity: 0.67, tier: "contextual", note: "contextual" },
  { id: "placenta", slug: "placenta-localizacao-grau", kind: "frase", priority: 75, similarity: 0.55, tier: "contextual", note: "contextual" },
  { id: "liquido-conclusao", slug: "liquido-amniotico-conclusao", kind: "frase", priority: 80, similarity: 0.61, tier: "contextual", note: "contextual" },
  { id: "ig-clinica", slug: "ig-clinica-conclusao", kind: "conclusao", priority: 90, similarity: 0.59, tier: "universal", note: "universal" },
  { id: "conduta-pig", slug: "conduta-pig-doppler", kind: "conclusao", priority: 80, similarity: 0.64, tier: "contextual", note: "contextual" },
  { id: "skip-1", slug: "cisto-hepatico-simples", kind: "frase", priority: 70, similarity: 0.62, tier: "skipped", skippedReason: "quota frase=8" },
  { id: "skip-2", slug: "doppler-alternativo-esplancnico", kind: "regra", priority: 70, similarity: 0.55, tier: "skipped", skippedReason: "quota regra=10" },
  { id: "skip-3", slug: "morfologico-secundario", kind: "modelo", priority: 88, similarity: 0.41, tier: "skipped", skippedReason: "quota modelo=2" },
];

export type LaudoSegment =
  | { type: "block"; blockId: string; text: string }
  | { type: "placeholder"; text: string }
  | { type: "text"; text: string };

export const LAUDO_SECTIONS: Array<{
  heading: string;
  paragraphs: LaudoSegment[][];
  list?: LaudoSegment[][];
}> = [
  {
    heading: "COMENTÁRIOS:",
    paragraphs: [
      [{ type: "block", blockId: "template-padrao", text: "Exame realizado com transdutor convexo de 4.0 MHz, com paciente em decúbito dorsal, em condições técnicas adequadas." }],
    ],
  },
  {
    heading: "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    paragraphs: [
      [
        { type: "block", blockId: "apresentacao-fetal", text: "Feto único, em apresentação cefálica, com dorso à esquerda materna, batimentos cardiofetais presentes, regulares, com frequência de 142 bpm." },
        { type: "text", text: " " },
        { type: "block", blockId: "biometria-fetal", text: "DBP de 7,5 cm. CC de 27,3 cm. CA de 23,0 cm. CF de 5,4 cm. Peso fetal estimado de aproximadamente 1240g." },
        { type: "text", text: " " },
        { type: "block", blockId: "liquido-amniotico", text: "Líquido amniótico em quantidade adequada para a idade gestacional." },
        { type: "text", text: " " },
        { type: "block", blockId: "placenta", text: "Placenta de inserção corpórea anterior, grau I de Grannum, sem evidências de descolamento." },
      ],
    ],
  },
  {
    heading: "CONCLUSÃO:",
    paragraphs: [],
    list: [
      [
        { type: "block", blockId: "ig-clinica", text: "Gestação tópica, em torno de " },
        { type: "placeholder", text: "30 semanas" },
        { type: "text", text: "." },
      ],
      [{ type: "block", blockId: "liquido-conclusao", text: "Líquido amniótico em quantidade normal." }],
      [{ type: "block", blockId: "peso-fetal-percentil", text: "O peso fetal encontra-se abaixo do percentil 10 para a idade gestacional, sugerindo PIG (pequeno para a idade gestacional)." }],
      [{ type: "block", blockId: "conduta-pig", text: "Convém, a critério clínico, avaliação Doppler obstétrico e seguimento ultrassonográfico seriado." }],
    ],
  },
];

export const STATS = {
  total: "8,3",
  structurer: "2,1",
  writer: "5,8",
  tokens: "2,3k",
  firstToken: "4,2",
  cost: "$0,012",
};

export const META = {
  checksum: "4f2c1a8",
  contract: "a3b2d…fc1",
  promptVersion: "1.2",
  retrieved: 26,
  skipped: 7,
};
