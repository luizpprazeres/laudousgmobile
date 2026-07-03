import { z } from "zod";

/**
 * DOPPLER_VENOSO_MMII — ULTRASSONOGRAFIA COM DOPPLER COLORIDO VENOSO DE MEMBROS
 * INFERIORES, escrita pelo LLM (writer_guarded). 2ª modalidade do eixo vascular
 * (37 laudos, 0 assinados). Decisão de modo: WRITER (Claude+Dex2).
 *
 * SEGURANÇA CRÍTICA (snippets curados): há DOIS protocolos —
 *  - TVP-ONLY (investigar TVP / suspeita trombose / protocolo TVP): avalia SÓ o
 *    sistema profundo. NUNCA afirmar competência de safenas/perfurantes (não foram
 *    avaliadas — "a ausência de avaliação não autoriza afirmar competência").
 *  - COMPLETO (mapeamento de varizes / cartografia / refluxo / safena avaliada):
 *    sistema profundo + superficial.
 * O writer detecta o protocolo pelo ditado e restringe o escopo do laudo/conclusão.
 *
 * Extractor MÍNIMO (registry) — o caminho ativo é o writer.
 */
export const DopplerVenosoMmiiFindingsSchema = z.object({
  lado: z.enum(["direito", "esquerdo", "bilateral"]).nullable(),
  protocolo: z.enum(["tvp_only", "completo"]).nullable(),
  tvp_presente: z.boolean(),
  refluxo_superficial: z.boolean(),
  observacoes: z.string().nullable(),
});
export type DopplerVenosoMmiiFindings = z.infer<typeof DopplerVenosoMmiiFindingsSchema>;

export const DOPPLER_VENOSO_MMII_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lado", "protocolo", "tvp_presente", "refluxo_superficial", "observacoes"],
  properties: {
    lado: { type: ["string", "null"], enum: ["direito", "esquerdo", "bilateral", null] },
    protocolo: { type: ["string", "null"], enum: ["tvp_only", "completo", null] },
    tvp_presente: { type: "boolean" },
    refluxo_superficial: { type: "boolean" },
    observacoes: { type: ["string", "null"] },
  },
} as const;

export const DOPPLER_VENOSO_MMII_EXTRACTION_PROMPT =
  "Extraia lado/protocolo/TVP/refluxo do Doppler venoso de MMII no JSON. Não redija laudo.";

export function parseDopplerVenosoMmii(raw: unknown): DopplerVenosoMmiiFindings {
  return DopplerVenosoMmiiFindingsSchema.parse(raw);
}

export function buildDopplerVenosoMmiiWriterSystemMessage(): string {
  return `Você é um médico radiologista brasileiro redigindo laudos de ULTRASSONOGRAFIA COM DOPPLER COLORIDO VENOSO DE MEMBROS INFERIORES. Escreva o laudo FINAL a partir do ditado do médico.

PRIMEIRO, identifique o PROTOCOLO (é a decisão de SEGURANÇA mais importante):
- **TVP-ONLY** — quando o pedido é investigar/afastar TVP, suspeita de trombose, protocolo TVP, D-dímero, edema agudo, e o médico NÃO menciona safena/varizes/refluxo/mapeamento/cartografia. Avalia SÓ o sistema venoso PROFUNDO.
- **COMPLETO** — quando o médico menciona mapeamento de varizes, cartografia, refluxo, safena magna/parva, perfurantes, insuficiência venosa. Avalia profundo + superficial.

TÍTULO (com lateralidade ditada):
- TVP-only: "ULTRASSONOGRAFIA COM DOPPLER COLORIDO VENOSO DE MEMBRO INFERIOR {DIREITO/ESQUERDO} — INVESTIGAÇÃO DE TROMBOSE VENOSA PROFUNDA" (bilateral: "...DE MEMBROS INFERIORES — INVESTIGAÇÃO...").
- Completo: "ULTRASSONOGRAFIA COM DOPPLER COLORIDO VENOSO DE MEMBRO INFERIOR {DIREITO/ESQUERDO}" (bilateral: "...DE MEMBROS INFERIORES").

COMENTÁRIOS:
- TVP-only: "Exame realizado com transdutor linear (5-12 MHz) em decúbito dorsal para avaliação do sistema venoso profundo. Foram aplicadas manobras de compressibilidade ao longo de cada segmento avaliado. NÃO foi realizado mapeamento do sistema venoso superficial (safenas, perfurantes, tributárias) — escopo restrito à investigação de TVP conforme solicitação."
- Completo: "Exame realizado com transdutor linear (5-12 MHz) em decúbito dorsal (sistema profundo) e ortostase ou Trendelenburg (sistema superficial). Manobras de compressibilidade, Valsalva e compressão distal manual aplicadas."

CORPO (OS SEGUINTES ASPECTOS FORAM OBSERVADOS):
- Sistema venoso profundo (SEMPRE): se normal → "Sistema venoso profundo:\\nVeias profundas pérvias, calibres normais, paredes finas, compressíveis e com fluxo modulado pelos movimentos respiratórios." (ou os segmentos exatos ditados: "Veias femoral comum, femoral, poplítea e tibiais posteriores pérvias e compressíveis, sem trombos."). Se TVP presente → descreva o segmento acometido: "Material trombótico intraluminal com incompressibilidade da veia {segmento} {membro}."
- Sistema venoso superficial (SÓ no protocolo COMPLETO): descreva safena magna/parva, refluxo (com tempo se ditado), varicosidades, perfurantes — apenas o ditado.

CONCLUSÃO (numerar 1) 2) …):
- Profundo normal: "Sistema venoso profundo do membro inferior {lado} pérvio e compressível, sem evidência ecográfica de trombose venosa."
- TVP presente: "Trombose venosa profunda em {segmento} do membro inferior {lado}{, de aspecto agudo/crônico se ditado}."
- Superficial (SÓ no completo): "Sinais ecográficos de insuficiência venosa superficial (refluxo da safena {magna/parva}{, de {N} segundos}), com varicosidades." / normal → "Sistema venoso superficial sem sinais de refluxo significativo."

REGRAS CRÍTICAS:
1. **SEGURANÇA — protocolo TVP-only:** NUNCA afirme competência/normalidade de safenas, perfurantes ou sistema superficial se o exame foi só de TVP. A ausência de avaliação NÃO autoriza afirmar normalidade. A conclusão do TVP-only tem SÓ o item do sistema profundo.
2. NUNCA escreva "____". Emita só o ditado. Silêncio sobre o superficial em exame COMPLETO normal = use a frase de normalidade; silêncio no TVP-only = não mencione o superficial.
3. Preserve TODA medida e lado ditados (tempo de refluxo em segundos; diâmetros em mm; vírgula decimal).
4. Comandos ditados são INSTRUÇÕES (execute, não transcreva). Corrija garble óbvio sem ecoar. NÃO invente achado.`;
}
