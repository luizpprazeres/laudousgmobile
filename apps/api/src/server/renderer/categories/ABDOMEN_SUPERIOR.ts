import { z } from "zod";
import {
  CONCLUSAO_FECHAMENTO,
  CONCLUSAO_TODOS_NORMAIS,
  renderOrgan,
  type OrganRender,
} from "../phrases/ABDOMEN_TOTAL";
import type {
  AbdomenFinding,
  AbdomenOrganKey,
  AbdomenOrganState,
} from "../findingsSchemas/ABDOMEN_TOTAL";

/**
 * DET-5 — Renderer de ULTRASSONOGRAFIA DO ABDOME SUPERIOR (render PROGRAMÁTICO,
 * sem template_body), estilo CLÁSSICO.
 *
 * É o abdome total SEM a parte inferior (rins, bexiga). Os MESMOS órgãos do
 * abdome superior compartilham a clínica do ABDOMEN_TOTAL (fígado, veia porta,
 * vesícula com lógica de litíase completa, vias biliares, baço, pâncreas, aorta,
 * veia cava inferior). Portanto este módulo REUSA as frases/builders por órgão de
 * `renderer/phrases/ABDOMEN_TOTAL.ts` (renderOrgan) — sem tocá-lo (está LIVE) — e
 * apenas monta no estilo CLÁSSICO com o subconjunto de órgãos do andar superior.
 *
 * Cabeçalhos (Clássico):
 *   TÍTULO
 *   COMENTÁRIOS:
 *   OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
 *   CONCLUSÃO:
 *
 * Fonte clínica:
 *  - modelo CLÁSSICO validado no DB (knowledge_blocks, category_code
 *    ABDOMEN_SUPERIOR, writing_style_id 11111111-1111-4111-8111-111111111111):
 *    estrutura + frases normais e ordem de órgãos;
 *  - renderer/phrases/ABDOMEN_TOTAL.ts (lógica clínica por órgão, reusada);
 *  - docs/catalogo-clinico-exames.md (seção ABDOMEN_TOTAL) e
 *    /tmp/nreport/captures/abdome-superior.txt.
 *
 * Regras: silêncio → normalidade (NUNCA inventa achado); medida não ditada →
 * null (renderer emite ____ via helpers do ABDOMEN_TOTAL); o LLM só extrai
 * dados tipados — o código redige.
 */

// ---------------------------------------------------------------------------
// Órgãos do ABDOME SUPERIOR (subconjunto do abdome total; SEM rins e bexiga)
// ---------------------------------------------------------------------------

export const ABDOMEN_SUPERIOR_ORGAN_KEYS = [
  "figado",
  "veia_porta",
  "vesicula",
  "vias_biliares",
  "baco",
  "pancreas",
  "aorta",
  "veia_cava",
] as const;

export type AbdomenSuperiorOrganKey = (typeof ABDOMEN_SUPERIOR_ORGAN_KEYS)[number];

// ---------------------------------------------------------------------------
// Schema de achados (zod). Mesma forma de achado/órgão do ABDOMEN_TOTAL, mas só
// com os órgãos do andar superior. Tipos de achado limitados aos relevantes ao
// abdome superior (sem volume_pre_miccional/derrame_pleural — sem bexiga/tórax).
// ---------------------------------------------------------------------------

const FINDING_TIPOS = [
  "esteatose",
  "cisto_simples",
  "imagem_cistica_complexa",
  "litiase",
  "parede_espessada",
  "ateromatose",
  "outro",
] as const;

const FindingSchema = z.object({
  tipo: z.enum(FINDING_TIPOS),
  grau: z.enum(["leve", "moderado", "acentuado"]).nullable(),
  quantidade: z.enum(["unica", "multiplas"]).nullable(),
  lateralidade: z.enum(["direita", "esquerda", "bilateral"]).nullable(),
  mobilidade: z.enum(["movel", "imovel"]).nullable(),
  localizacao: z.string().nullable(),
  medidas_cm: z.array(z.number()).nullable(),
  valor_ml: z.number().nullable(),
  termo_do_medico: z.string().nullable(),
  descricao_livre: z.string().nullable(),
});

const OrganStateSchema = z.object({
  status: z.enum([
    "normal",
    "alterado",
    "nao_avaliado_gases",
    "ausente_cirurgico",
  ]),
  achados: z.array(FindingSchema),
});

export const AbdomenSuperiorFindingsSchema = z.object({
  orgaos: z.object({
    figado: OrganStateSchema,
    veia_porta: OrganStateSchema,
    vesicula: OrganStateSchema,
    vias_biliares: OrganStateSchema,
    baco: OrganStateSchema,
    pancreas: OrganStateSchema,
    aorta: OrganStateSchema,
    veia_cava: OrganStateSchema,
  }),
  observacoes_do_medico: z.string().nullable(),
});

export type AbdomenSuperiorFindings = z.infer<typeof AbdomenSuperiorFindingsSchema>;

// ---------------------------------------------------------------------------
// JSON Schema strict p/ OpenAI structured outputs (todos required,
// additionalProperties false, nullable via union de tipos).
// ---------------------------------------------------------------------------

const FINDING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "tipo",
    "grau",
    "quantidade",
    "lateralidade",
    "mobilidade",
    "localizacao",
    "medidas_cm",
    "valor_ml",
    "termo_do_medico",
    "descricao_livre",
  ],
  properties: {
    tipo: { type: "string", enum: [...FINDING_TIPOS] },
    grau: { type: ["string", "null"], enum: ["leve", "moderado", "acentuado", null] },
    quantidade: { type: ["string", "null"], enum: ["unica", "multiplas", null] },
    lateralidade: {
      type: ["string", "null"],
      enum: ["direita", "esquerda", "bilateral", null],
    },
    mobilidade: { type: ["string", "null"], enum: ["movel", "imovel", null] },
    localizacao: { type: ["string", "null"] },
    medidas_cm: { type: ["array", "null"], items: { type: "number" } },
    valor_ml: { type: ["number", "null"] },
    termo_do_medico: { type: ["string", "null"] },
    descricao_livre: { type: ["string", "null"] },
  },
} as const;

const ORGAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["status", "achados"],
  properties: {
    status: {
      type: "string",
      enum: ["normal", "alterado", "nao_avaliado_gases", "ausente_cirurgico"],
    },
    achados: { type: "array", items: FINDING_JSON_SCHEMA },
  },
} as const;

export const ABDOMEN_SUPERIOR_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["orgaos", "observacoes_do_medico"],
  properties: {
    orgaos: {
      type: "object",
      additionalProperties: false,
      required: [...ABDOMEN_SUPERIOR_ORGAN_KEYS],
      properties: Object.fromEntries(
        ABDOMEN_SUPERIOR_ORGAN_KEYS.map((k) => [k, ORGAN_JSON_SCHEMA]),
      ),
    },
    observacoes_do_medico: { type: ["string", "null"] },
  },
} as const;

// ---------------------------------------------------------------------------
// Prompt de extração
// ---------------------------------------------------------------------------

export const ABDOMEN_SUPERIOR_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA DO ABDOME SUPERIOR (caminho determinístico).
Sua única tarefa: organizar o ditado do médico no JSON tipado. Você NÃO redige laudo.
Você NÃO adiciona nada que o médico não disse. O abdome superior NÃO inclui rins
nem bexiga — ignore qualquer menção a rins/bexiga (não há campo para eles aqui).

ÓRGÃOS (apenas estes): figado, veia_porta, vesicula, vias_biliares, baco,
pancreas, aorta (abdominal), veia_cava (inferior).

REGRAS OBRIGATÓRIAS:
1. Órgão não mencionado OU dito normal ("demais órgãos sem alterações",
   "restante normal", "exame normal") → status "normal", achados [].
2. NUNCA invente achado, medida, grau ou localização. Medida não ditada →
   medidas_cm null (NUNCA [] com números inventados).
3. Medidas: converta "2,1 por 1,8" → [2.1, 1.8] (números JSON com ponto).
4. "termo_do_medico": o substantivo clínico EXATO que o médico usou quando
   relevante (ex: "cálculo", "concreção", "imagem hiperecoica"). Verbatim.
5. Segmentos hepáticos: normalize para romano em "localizacao"
   ("segmento sete" → "segmento VII").
6. Colecistectomia / ausência da vesícula → vesicula.status "ausente_cirurgico".
7. Órgão não avaliável por gases → status "nao_avaliado_gases".
8. Achado que não casa com nenhum tipo do catálogo → tipo "outro" +
   descricao_livre com as PALAVRAS DO MÉDICO (sem floreio).
9. Tipos e onde usar:
   - esteatose (fígado; grau leve/moderado/acentuado)
   - cisto_simples (fígado; medidas, localizacao)
   - imagem_cistica_complexa (fígado; descreva calcificações/septações em descricao_livre)
   - litiase (vesicula; quantidade unica/multiplas; medidas; localizacao;
     mobilidade "movel"/"imovel" quando o médico disser se os cálculos se movem
     à mudança de decúbito — senão deixe mobilidade null)
   - parede_espessada (vesicula; espessura da parede em medidas_cm[0] em cm)
   - ateromatose (aorta)
   - outro (qualquer outra coisa)
   "mobilidade" só se aplica a litíase de vesícula; deixe null nos demais.
   GATILHOS CANÔNICOS (da biblioteca curada — o médico raramente fala o nome
   do diagnóstico; classifique pelo padrão descrito):
   - vesícula + "imagem(ns) hiperecoica(s)" móvel(is) / sombra acústica → litiase
   - aorta + "imagens hiperecoicas aderidas às paredes" / "placas" → ateromatose
   - fígado + "aumento da ecogenicidade" → esteatose (discreto → leve;
     difuso/atenuação sonora → moderado)
   - fígado + "imagem anecoica homogênea" → cisto_simples
10. "observacoes_do_medico": instruções do médico sobre o laudo — texto corrido
    ou null.`;

// ---------------------------------------------------------------------------
// Normalização determinística pós-parse (espelha ABDOMEN_TOTAL): órgão com
// achados não pode ficar com status "normal"/"nao_avaliado" (achado nunca se
// perde); "outro" sem descricao_livre recebe fallback explícito p/ revisão.
// ---------------------------------------------------------------------------

export function normalizeAbdomenSuperior(
  f: AbdomenSuperiorFindings,
): AbdomenSuperiorFindings {
  const fixFinding = (a: z.infer<typeof FindingSchema>) => {
    if (a.tipo === "outro" && (!a.descricao_livre || a.descricao_livre.trim() === "")) {
      const fallback = [a.termo_do_medico, a.localizacao]
        .filter((s): s is string => !!s && s.trim() !== "")
        .join(", ");
      return {
        ...a,
        descricao_livre:
          fallback !== "" ? fallback : "achado referido pelo médico (revisar: ____)",
      };
    }
    return a;
  };
  const orgaos = Object.fromEntries(
    Object.entries(f.orgaos).map(([k, o]) => [
      k,
      {
        status:
          o.achados.length > 0 && o.status !== "ausente_cirurgico"
            ? ("alterado" as const)
            : o.status,
        achados: o.achados.map(fixFinding),
      },
    ]),
  ) as AbdomenSuperiorFindings["orgaos"];
  return { orgaos, observacoes_do_medico: f.observacoes_do_medico };
}

// ---------------------------------------------------------------------------
// Frases fixas (Clássico) — transcritas do modelo CLÁSSICO validado no DB.
// ---------------------------------------------------------------------------

const TITULO = "ULTRASSONOGRAFIA DO ABDOME SUPERIOR";

const COMENTARIOS =
  "COMENTÁRIOS:\nExame realizado com transdutor de 4.0 MHz, com paciente em jejum. Foram realizados múltiplos cortes do andar superior do abdome, em decúbito dorsal e laterais. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";

/** Frase NORMAL de cada órgão (modelo CLÁSSICO ABDOME SUPERIOR — DB). */
const ORGAO_NORMAL_CLASSICO: Record<AbdomenSuperiorOrganKey, string> = {
  figado:
    "Fígado de dimensões normais, contornos regulares e ecotextura homogênea.\nOs vasos intra-hepáticos são bem visíveis e de calibre anatômico.",
  veia_porta: "Veia porta de calibre normal.",
  vesicula: "Vesícula biliar de topografia usual e de parede fina, sem cálculo.",
  vias_biliares: "Canal hepático e canal colédoco de calibre normal.",
  pancreas:
    "Pâncreas de ecotextura habitual para a faixa etária. A cabeça, o corpo e a cauda apresentam dimensões normais.",
  baco: "Baço de dimensões normais e ecotextura sólida e homogênea.",
  aorta: "Aorta abdominal de calibre e contornos normais.",
  veia_cava: "Veia cava inferior de calibre e contornos normais.",
};

/** Ordem fixa dos órgãos no corpo (modelo CLÁSSICO do DB). */
const ORGAO_ORDEM: AbdomenSuperiorOrganKey[] = [
  "figado",
  "veia_porta",
  "vesicula",
  "vias_biliares",
  "pancreas",
  "baco",
  "aorta",
  "veia_cava",
];

// ---------------------------------------------------------------------------
// Render — dispatcher (Clássico default; Objetivo via opts)
// ---------------------------------------------------------------------------

/**
 * Dispatcher fino: escolhe o estilo de redação. Clássico (default) preserva 100%
 * o comportamento anterior (LIVE-adjacente); objetivo usa TÉCNICA/ACHADOS/IMPRESSÃO
 * reusando a MESMA clínica por órgão (renderOrgan do ABDOMEN_TOTAL), sem rins/bexiga.
 */
export function renderAbdomenSuperior(
  f: AbdomenSuperiorFindings,
  opts?: { objetivo?: boolean },
): string {
  if (opts?.objetivo) return renderAbdomenSuperiorObjetivo(f);
  return renderAbdomenSuperiorClassico(f);
}

// ---------------------------------------------------------------------------
// Render (Clássico)
// ---------------------------------------------------------------------------

export function renderAbdomenSuperiorClassico(f: AbdomenSuperiorFindings): string {
  const aspectos: string[] = [];
  const conclusaoItens: string[] = [];

  for (const organ of ORGAO_ORDEM) {
    const state = f.orgaos[organ] as AbdomenOrganState | undefined;
    if (!state) {
      aspectos.push(ORGAO_NORMAL_CLASSICO[organ]);
      continue;
    }
    // Reusa a lógica clínica por órgão do ABDOMEN_TOTAL (frases byte-a-byte,
    // litíase/esteatose/ateromatose/cisto/parede espessada/colecistectomia/gases).
    const rendered: OrganRender = renderOrgan(organ as AbdomenOrganKey, state);
    const base = rendered.body !== null ? rendered.body : ORGAO_NORMAL_CLASSICO[organ];
    aspectos.push(base);
    conclusaoItens.push(...rendered.conclusao);
    // Achados fora do catálogo determinístico (free-slot): no caminho clássico
    // determinístico (sem LLM secundário) preservamos o termo do médico no corpo
    // para não perder o achado silenciosamente.
    for (const fs of rendered.freeSlotFindings) {
      const txt = fs.descricao_livre ?? fs.termo_do_medico;
      if (txt && txt.trim() !== "") {
        aspectos.push(`${txt.trim().replace(/\.+$/, "")}.`);
      }
    }
  }

  // ----- CONCLUSÃO -----
  let conclusaoTxt: string;
  if (conclusaoItens.length === 0) {
    conclusaoTxt = CONCLUSAO_TODOS_NORMAIS;
  } else {
    const itens = [...conclusaoItens, CONCLUSAO_FECHAMENTO];
    conclusaoTxt = itens.map((it, i) => `${i + 1}. ${it}`).join("\n");
  }

  const corpo = [
    TITULO,
    "",
    COMENTARIOS,
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    aspectos.join("\n"),
    "",
    "CONCLUSÃO:",
    conclusaoTxt,
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}

// ===========================================================================
// ESTILO OBJETIVO — TÉCNICA / ACHADOS / IMPRESSÃO
// ===========================================================================
//
// O objetivo monta o laudo PROGRAMATICAMENTE no estilo TÉCNICA/ACHADOS/IMPRESSÃO,
// SEM depender do template_body (clássico). A clínica por órgão é a MESMA do
// clássico: para órgãos alterados/gases/colecistectomia reusa o `body` produzido
// por renderOrgan (ABDOMEN_TOTAL, LIVE — não tocado); para órgãos normais usa a
// frase normal abaixo (transcrita do modelo "Abdome Superior" do nReport —
// /tmp/nreport/captures/abdome-superior.txt). A conclusão (renderOrgan.conclusao)
// vira a IMPRESSÃO. É o abdome total objetivo SEM rins/bexiga (mesmo subconjunto
// de órgãos do andar superior do estilo clássico). Não toca o caminho clássico.

const TITULO_OBJETIVO = "ULTRASSONOGRAFIA DE ABDOME SUPERIOR";

const TECNICA_OBJETIVO = "Exame realizado com transdutor convexo multifrequencial.";

/** Frase NORMAL de cada órgão (modelo Abdome Superior — nReport). */
const ORGAO_NORMAL_OBJETIVO: Record<AbdomenSuperiorOrganKey, string> = {
  figado:
    "Fígado com forma, dimensões e contornos preservados. Parênquima hepático com ecotextura homogênea. Os vasos intra-hepáticos são bem visíveis e de calibre anatômico.",
  veia_porta: "Veia porta pérvia, de calibre preservado.",
  vesicula:
    "Vesícula biliar de topografia usual e parede fina, com conteúdo anecoico. Não há imagens sugestivas de cálculos no seu interior.",
  vias_biliares: "Vias biliares intra e extra-hepáticas sem sinais de dilatação.",
  pancreas: "Pâncreas com morfologia e ecotextura normais.",
  baco:
    "Baço com forma, dimensões e contornos preservados. Ecotextura esplênica homogênea.",
  aorta: "Aorta com trajeto, calibre e contornos preservados.",
  veia_cava: "Veia cava inferior de calibre normal.",
};

/** Ordem fixa dos órgãos no ACHADOS objetivo (clínica, modelo nReport). */
const ORGAO_ORDEM_OBJETIVO: AbdomenSuperiorOrganKey[] = [
  "figado",
  "veia_porta",
  "vias_biliares",
  "vesicula",
  "pancreas",
  "baco",
  "aorta",
  "veia_cava",
];

export function renderAbdomenSuperiorObjetivo(f: AbdomenSuperiorFindings): string {
  const achadosLinhas: string[] = [];
  const impressaoItens: string[] = [];

  for (const organ of ORGAO_ORDEM_OBJETIVO) {
    const state = f.orgaos[organ] as AbdomenOrganState | undefined;
    if (!state) {
      achadosLinhas.push(ORGAO_NORMAL_OBJETIVO[organ]);
      continue;
    }
    // Reusa a clínica por órgão do ABDOMEN_TOTAL (frases byte-a-byte; mesmas do
    // clássico). Órgão normal → frase normal objetiva (nReport).
    const rendered: OrganRender = renderOrgan(organ as AbdomenOrganKey, state);
    const base = rendered.body !== null ? rendered.body : ORGAO_NORMAL_OBJETIVO[organ];
    achadosLinhas.push(base);
    impressaoItens.push(...rendered.conclusao);
    // Achados fora do catálogo determinístico (free-slot): preserva o termo do
    // médico no corpo para não perder o achado silenciosamente (espelha o clássico).
    for (const fs of rendered.freeSlotFindings) {
      const txt = fs.descricao_livre ?? fs.termo_do_medico;
      if (txt && txt.trim() !== "") {
        achadosLinhas.push(`${txt.trim().replace(/\.+$/, "")}.`);
      }
    }
  }

  const impressao =
    impressaoItens.length === 0
      ? "Estudo ultrassonográfico do abdome superior sem alterações significativas."
      : impressaoItens.length === 1
        ? (impressaoItens[0] as string)
        : impressaoItens.map((it, i) => `${i + 1}. ${it}`).join("\n");

  const corpo = [
    TITULO_OBJETIVO,
    "",
    "TÉCNICA:",
    TECNICA_OBJETIVO,
    "",
    "ACHADOS:",
    achadosLinhas.join("\n"),
    "",
    "IMPRESSÃO:",
    impressao,
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}
