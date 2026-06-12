import { z } from "zod";

/**
 * DET-5 — Schema de achados tipados de ABDOMEN_TOTAL (piloto do renderer).
 *
 * O structurer estendido (extraction.ts) extrai o ditado para ESTE shape com
 * structured outputs strict (temp 0). O renderer monta o laudo a partir dele
 * — o LLM nunca escreve estrutura, só dados.
 *
 * Regras espelhadas das regras curadas do bundle (fonte viva):
 * - medida não ditada → null (JAMAIS inventar; renderer emite ____)
 * - termo do médico preservado verbatim (cálculo vs concreção)
 * - catálogo de tipos fechado; o que foge cai em "outro" + descricao_livre
 */

export const ABDOMEN_ORGAN_KEYS = [
  "figado",
  "veia_porta",
  "vesicula",
  "vias_biliares",
  "baco",
  "pancreas",
  "rim_direito",
  "rim_esquerdo",
  "veia_cava",
  "aorta",
  "bexiga",
] as const;

export type AbdomenOrganKey = (typeof ABDOMEN_ORGAN_KEYS)[number];

const FindingSchema = z.object({
  tipo: z.enum([
    "esteatose",
    "cisto_simples",
    "imagem_cistica_complexa",
    "litiase",
    "ateromatose",
    "derrame_pleural",
    "volume_pre_miccional",
    "outro",
  ]),
  grau: z.enum(["leve", "moderado", "acentuado"]).nullable(),
  quantidade: z.enum(["unica", "multiplas"]).nullable(),
  lateralidade: z.enum(["direita", "esquerda", "bilateral"]).nullable(),
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

export const AbdomenTotalFindingsSchema = z.object({
  orgaos: z.object({
    figado: OrganStateSchema,
    veia_porta: OrganStateSchema,
    vesicula: OrganStateSchema,
    vias_biliares: OrganStateSchema,
    baco: OrganStateSchema,
    pancreas: OrganStateSchema,
    rim_direito: OrganStateSchema,
    rim_esquerdo: OrganStateSchema,
    veia_cava: OrganStateSchema,
    aorta: OrganStateSchema,
    bexiga: OrganStateSchema,
  }),
  achados_extra_abdominais: z.array(FindingSchema),
  observacoes_do_medico: z.string().nullable(),
});

export type AbdomenFinding = z.infer<typeof FindingSchema>;
export type AbdomenOrganState = z.infer<typeof OrganStateSchema>;
export type AbdomenTotalFindings = z.infer<typeof AbdomenTotalFindingsSchema>;

// ---------------------------------------------------------------------------
// JSON Schema p/ OpenAI structured outputs strict: todos os campos required,
// additionalProperties false, nullable via union de tipos.
// ---------------------------------------------------------------------------

const FINDING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "tipo",
    "grau",
    "quantidade",
    "lateralidade",
    "localizacao",
    "medidas_cm",
    "valor_ml",
    "termo_do_medico",
    "descricao_livre",
  ],
  properties: {
    tipo: {
      type: "string",
      enum: [
        "esteatose",
        "cisto_simples",
        "imagem_cistica_complexa",
        "litiase",
        "ateromatose",
        "derrame_pleural",
        "volume_pre_miccional",
        "outro",
      ],
    },
    grau: { type: ["string", "null"], enum: ["leve", "moderado", "acentuado", null] },
    quantidade: { type: ["string", "null"], enum: ["unica", "multiplas", null] },
    lateralidade: {
      type: ["string", "null"],
      enum: ["direita", "esquerda", "bilateral", null],
    },
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

export const ABDOMEN_TOTAL_FINDINGS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["orgaos", "achados_extra_abdominais", "observacoes_do_medico"],
  properties: {
    orgaos: {
      type: "object",
      additionalProperties: false,
      required: [...ABDOMEN_ORGAN_KEYS],
      properties: Object.fromEntries(
        ABDOMEN_ORGAN_KEYS.map((k) => [k, ORGAN_JSON_SCHEMA]),
      ),
    },
    achados_extra_abdominais: { type: "array", items: FINDING_JSON_SCHEMA },
    observacoes_do_medico: { type: ["string", "null"] },
  },
} as const;
