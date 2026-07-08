import { z } from "zod";

/**
 * Fundação do eixo vascular — Schema de achados tipados de DOPPLER_VENOSO_MMII.
 *
 * É o CONTRATO estruturado por-segmento que alimenta (a) o futuro renderer
 * determinístico vascular (fase 2 do plano-motor-doppler-vascular) e (b) o motor
 * de composição do esquema visual (cartografia venosa) — ambos consomem o MESMO
 * objeto: `{ lado → segmentos[] + perfurantes[] }`.
 *
 * Regras (espelham os snippets curados `packages/knowledge/snippets/DOPPLER_VENOSO_MMII*`):
 * - Só o que foi DITADO entra; segmento não avaliado/normal NÃO vira achado (o
 *   renderer preenche a normalidade por construção; nunca `____`).
 * - Refluxo patológico: > 1,0 s nas troncais profundas; > 0,5 s nas superficiais/
 *   tibiais/perfurantes. Perfurante incompetente: refluxo > 0,5 s E diâmetro > 3,5 mm.
 * - TVP: incompressibilidade + material trombótico + ausência de fluxo/fasicidade.
 * - Ids de segmento = nomenclatura canônica dos protótipos e a reconciliar com o
 *   `VenousSegmentCatalog.swift` (18 segmentos) na integração iOS.
 */

// Sistema profundo, superficial, junções (a reconciliar 1:1 com VenousSegmentCatalog).
export const SEGMENTOS_VENOSOS = [
  // profundo
  "femoral_comum",
  "femoral",
  "femoral_profunda",
  "poplitea",
  "tibial_posterior",
  "tibial_anterior",
  "fibular",
  "gastrocnemias",
  "soleares",
  // superficial
  "safena_magna",
  "safena_parva",
  "safena_acessoria_anterior",
  "giacomini",
  // junções
  "jsf",
  "jsp",
] as const;

export type SegmentoVenoso = (typeof SEGMENTOS_VENOSOS)[number];

export const LADOS = ["direito", "esquerdo"] as const;
export type LadoVenoso = (typeof LADOS)[number];

/** Achado por segmento — só entra o que foi ditado como alterado. */
const SegmentoFindingSchema = z.object({
  segmento: z.enum(SEGMENTOS_VENOSOS),
  tipo: z.enum([
    "refluxo",
    "trombose",
    "varicosidade",
    "recanalizacao",
    "outro",
  ]),
  // Refluxo: tempo em segundos (patológico por segmento — ver regras).
  refluxo_tempo_s: z.number().nullable(),
  // Trombose: extensão e idade (quando ditadas).
  trombose_extensao: z.enum(["oclusiva", "parcial"]).nullable(),
  trombose_idade: z
    .enum(["aguda", "cronica", "recanalizada", "indeterminada"])
    .nullable(),
  // Calibre do segmento em mm (relevante p/ safenas / MEDIDAS).
  calibre_mm: z.number().nullable(),
  // Termo verbatim do médico e descrição livre (never-drop do inusitado).
  termo_do_medico: z.string().nullable(),
  descricao_livre: z.string().nullable(),
});

/** Perfurante incompetente — nomeada por topografia (não por epônimo isolado). */
const PerfuranteFindingSchema = z.object({
  topografia: z.enum(["coxa", "joelho", "perna_medial", "panturrilha"]),
  competente: z.boolean(),
  diametro_mm: z.number().nullable(),
  refluxo_tempo_s: z.number().nullable(),
});

/** Estado de uma perna. `avaliado=false` → perna não estudada (renderer omite). */
const LadoStateSchema = z.object({
  avaliado: z.boolean(),
  // Resumo do sistema profundo quando ditado globalmente (pérvio/compressível).
  profundo_pervio: z.boolean().nullable(),
  compressibilidade_profunda: z.enum(["normal", "reduzida"]).nullable(),
  segmentos: z.array(SegmentoFindingSchema),
  perfurantes: z.array(PerfuranteFindingSchema),
});

export const VenosoMMIIFindingsSchema = z.object({
  lados: z.object({
    direito: LadoStateSchema,
    esquerdo: LadoStateSchema,
  }),
  // Presença global de TVP (o segmento específico vem em `segmentos[].tipo=trombose`).
  tvp_presente: z.boolean(),
  observacoes_do_medico: z.string().nullable(),
});

export type SegmentoVenosoFinding = z.infer<typeof SegmentoFindingSchema>;
export type PerfuranteFinding = z.infer<typeof PerfuranteFindingSchema>;
export type LadoVenosoState = z.infer<typeof LadoStateSchema>;
export type VenosoMMIIFindings = z.infer<typeof VenosoMMIIFindingsSchema>;

// ---------------------------------------------------------------------------
// JSON Schema p/ OpenAI structured outputs strict: todos os campos required,
// additionalProperties false, nullable via union de tipos + null no enum.
// ---------------------------------------------------------------------------

const SEGMENTO_FINDING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "segmento",
    "tipo",
    "refluxo_tempo_s",
    "trombose_extensao",
    "trombose_idade",
    "calibre_mm",
    "termo_do_medico",
    "descricao_livre",
  ],
  properties: {
    segmento: { type: "string", enum: [...SEGMENTOS_VENOSOS] },
    tipo: {
      type: "string",
      enum: ["refluxo", "trombose", "varicosidade", "recanalizacao", "outro"],
    },
    refluxo_tempo_s: { type: ["number", "null"] },
    trombose_extensao: {
      type: ["string", "null"],
      enum: ["oclusiva", "parcial", null],
    },
    trombose_idade: {
      type: ["string", "null"],
      enum: ["aguda", "cronica", "recanalizada", "indeterminada", null],
    },
    calibre_mm: { type: ["number", "null"] },
    termo_do_medico: { type: ["string", "null"] },
    descricao_livre: { type: ["string", "null"] },
  },
} as const;

const PERFURANTE_FINDING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["topografia", "competente", "diametro_mm", "refluxo_tempo_s"],
  properties: {
    topografia: {
      type: "string",
      enum: ["coxa", "joelho", "perna_medial", "panturrilha"],
    },
    competente: { type: "boolean" },
    diametro_mm: { type: ["number", "null"] },
    refluxo_tempo_s: { type: ["number", "null"] },
  },
} as const;

const LADO_STATE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "avaliado",
    "profundo_pervio",
    "compressibilidade_profunda",
    "segmentos",
    "perfurantes",
  ],
  properties: {
    avaliado: { type: "boolean" },
    profundo_pervio: { type: ["boolean", "null"] },
    compressibilidade_profunda: {
      type: ["string", "null"],
      enum: ["normal", "reduzida", null],
    },
    segmentos: { type: "array", items: SEGMENTO_FINDING_JSON_SCHEMA },
    perfurantes: { type: "array", items: PERFURANTE_FINDING_JSON_SCHEMA },
  },
} as const;

export const DOPPLER_VENOSO_MMII_FINDINGS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lados", "tvp_presente", "observacoes_do_medico"],
  properties: {
    lados: {
      type: "object",
      additionalProperties: false,
      required: ["direito", "esquerdo"],
      properties: {
        direito: LADO_STATE_JSON_SCHEMA,
        esquerdo: LADO_STATE_JSON_SCHEMA,
      },
    },
    tvp_presente: { type: "boolean" },
    observacoes_do_medico: { type: ["string", "null"] },
  },
} as const;

export const DOPPLER_VENOSO_MMII_EXTRACTION_PROMPT = `Você é um EXTRATOR de achados de Doppler venoso dos membros inferiores. NÃO redija laudo — apenas extraia o que foi DITADO para o JSON tipado (strict).

REGRAS:
- Só inclua em "segmentos" o que o médico ditou como ALTERADO. Segmento normal/não avaliado NÃO entra (o renderer preenche a normalidade). NUNCA invente valor.
- "avaliado": true se a perna foi estudada; false se não mencionada.
- "profundo_pervio": true quando o médico disser o sistema profundo pérvio/compressível/sem trombose; null se não disser.
- Refluxo: preencha "refluxo_tempo_s" com o tempo em segundos quando ditado (ex.: "refluxo de 2,4 segundos" → 2.4). Patológico: > 1,0 s nas troncais profundas (femoral comum/femoral/poplítea); > 0,5 s nas superficiais (safenas), tibiais, femoral profunda e perfurantes. Não asservere patológico sem o tempo; registre o que foi dito.
- Trombose/TVP: "tipo"="trombose"; "trombose_extensao" (oclusiva|parcial) e "trombose_idade" (aguda|cronica|recanalizada|indeterminada) quando ditadas. Marque "tvp_presente"=true se houver qualquer trombose. Incompressibilidade → "compressibilidade_profunda"="reduzida".
- Varicosidades: "tipo"="varicosidade". Recanalização: "tipo"="recanalizacao".
- Calibre de segmento (mm) → "calibre_mm" quando ditado (ex.: safena magna de 5,5 mm → 5.5). Converta cm→mm se ditado em cm.
- Perfurantes: em "perfurantes" só as ditadas. "competente"=false quando incompetente/refluxante (critério: refluxo > 0,5 s E diâmetro > 3,5 mm). "topografia" por nível (coxa|joelho|perna_medial|panturrilha).
- Lateralidade: mapeie para "direito"/"esquerdo". Bilateral → preencha os dois lados.
- Preserve o termo do médico em "termo_do_medico" e o inusitado em "descricao_livre" (never-drop).
- Ids de segmento válidos: ${SEGMENTOS_VENOSOS.join(", ")}.
`;

export function parseVenosoMMIIFindings(raw: unknown): VenosoMMIIFindings {
  return VenosoMMIIFindingsSchema.parse(raw);
}
