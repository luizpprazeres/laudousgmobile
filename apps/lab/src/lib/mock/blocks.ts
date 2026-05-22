export type BlockKind = "modelo" | "regra" | "frase" | "conclusao" | "excecao" | "comentario_tecnico" | "exemplo";

export type TreeBlock = {
  id: string;
  slug: string;
  modified?: boolean;
};

export type KindGroup = {
  kind: BlockKind;
  blocks: TreeBlock[];
};

export type CategoryNode = {
  slug: string;
  totalBlocks: number;
  groups: KindGroup[];
};

export type BlockContent = {
  id: string;
  slug: string;
  category: string;
  kind: BlockKind;
  priority: number;
  priority_tier: "universal" | "contextual" | "optional";
  version: string;
  modified: boolean;
  filename: string;
  path: string;
  body: string;
  edits: string[];
  gitHash: string;
  lastEditBy: string;
  lastEditAt: string;
};

export const TREE: CategoryNode[] = [
  {
    slug: "OBSTETRICA",
    totalBlocks: 84,
    groups: [
      {
        kind: "modelo",
        blocks: [
          { id: "obs-mod-1", slug: "template-padrao-obstetrico" },
          { id: "obs-mod-2", slug: "template-inicial-gestacao" },
        ],
      },
      {
        kind: "regra",
        blocks: [
          { id: "obs-reg-1", slug: "ordem-secoes" },
          { id: "obs-reg-2", slug: "preservar-terminologia" },
          { id: "obs-reg-3", slug: "dias-da-ig-omitir-zero" },
          { id: "obs-reg-4", slug: "unidades-biometria-fetal" },
          { id: "obs-reg-5", slug: "peso-fetal-percentil", modified: true },
          { id: "obs-reg-6", slug: "liquido-amniotico-sempre" },
          { id: "obs-reg-7", slug: "conduta-pig" },
          { id: "obs-reg-8", slug: "apresentacao-fetal" },
        ],
      },
      { kind: "frase", blocks: [] },
      { kind: "conclusao", blocks: [] },
      { kind: "excecao", blocks: [] },
    ],
  },
  { slug: "PELVE_FEMININA", totalBlocks: 99, groups: [] },
  { slug: "TIREOIDE", totalBlocks: 66, groups: [] },
  { slug: "MAMARIA", totalBlocks: 84, groups: [] },
  { slug: "DOPPLER_OBSTETRICO", totalBlocks: 66, groups: [] },
  {
    slug: "ABDOMEN_TOTAL",
    totalBlocks: 78,
    groups: [
      {
        kind: "modelo",
        blocks: [
          { id: "abd-mod-1", slug: "template-padrao-abdomen" },
          { id: "abd-mod-2", slug: "template-alternativo" },
        ],
      },
      {
        kind: "regra",
        blocks: [
          { id: "abd-reg-1", slug: "figado-variantes", modified: true },
          { id: "abd-reg-2", slug: "vesicula-e-vias-biliares" },
          { id: "abd-reg-3", slug: "rins-variantes" },
          { id: "abd-reg-4", slug: "pancreas-variantes" },
          { id: "abd-reg-5", slug: "baço-variantes" },
          { id: "abd-reg-6", slug: "aorta-padrao" },
          { id: "abd-reg-7", slug: "esteatose-graus" },
          { id: "abd-reg-8", slug: "colelitiase-medidas" },
          { id: "abd-reg-9", slug: "retroperitoneo" },
          { id: "abd-reg-10", slug: "incidental-findings" },
        ],
      },
    ],
  },
];

const FIGADO_BODY = `---
id: abdomen-total-regra-figado-variantes
category: ABDOMEN_TOTAL
kind: regra
priority: 75
priority_tier: contextual
tags: [esteatose, cisto-hepatico, area-poupada]
version: 1.2.0
---

GATILHOS DE APLICAÇÃO:
- esteatose
- doença hepática crônica
- área poupada
- cisto hepático

ESTEATOSE HEPÁTICA LEVE
Corpo: "Fígado de dimensões normais, com discreto aumento da
ecogenicidade hepática em relação aos rins, contornos regulares,
sem evidências de lesões focais ao método."

Conclusão: "Esteatose hepática, grau leve."

ESTEATOSE HEPÁTICA MODERADA
Corpo: "Fígado de dimensões normais, apresentando aumento difuso
da ecogenicidade, com discreta atenuação do feixe acústico em
planos profundos…"

Conclusão: "Esteatose hepática, grau moderado."

ESTEATOSE HEPÁTICA ACENTUADA
Corpo: "Fígado de dimensões normais, apresentando importante
aumento da ecogenicidade hepática, com acentuada atenuação do
feixe acústico em planos profundos, prejudicando a visualização
de estruturas posteriores."

Conclusão: "Esteatose hepática, grau acentuado."
`;

export const CURRENT_BLOCK: BlockContent = {
  id: "abdomen-total-regra-figado-variantes",
  slug: "figado-variantes",
  category: "ABDOMEN_TOTAL",
  kind: "regra",
  priority: 75,
  priority_tier: "contextual",
  version: "1.2.0",
  modified: true,
  filename: "figado-variantes.md",
  path: "packages/knowledge/snippets/ABDOMEN_TOTAL/regra/",
  body: FIGADO_BODY,
  edits: ["2026-05-21", "2026-05-19", "2026-05-12"],
  gitHash: "4f2c1a8",
  lastEditBy: "c1",
  lastEditAt: "2026-05-21 14:21",
};
