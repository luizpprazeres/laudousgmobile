import { z } from "zod";

/**
 * DOPPLER_RENAL — ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS,
 * escrita pelo LLM (writer_guarded). Piloto do EIXO VASCULAR (maior gap: 57 laudos,
 * 0 assinados). Decisão de modo (Claude + Dex2, 2026-07-03): WRITER, não renderer —
 * o médico dita COMPACTO (só VPS ostial + RAR + IR resumido) e o template rígido
 * enche de PLACEHOLDER ____ em segmento não ditado. O writer emite SÓ o ditado.
 *
 * Critérios clínicos (snippets DOPPLER_RENAL curados, protocolo JVB 2005):
 *  - VPS > 250 cm/s na artéria renal principal OU RAR > 3,2 = estenose
 *    hemodinamicamente significativa (critérios INDEPENDENTES).
 *  - IR intrarrenal 0,55–0,70 = normal; IR < 0,55 distal (tardus-parvus) sugere
 *    estenose proximal. Diferença interpolar < 1,5 cm = simétrico.
 *  - NUNCA classificar % de estenose por Doppler (sem precisão).
 *
 * O extractor abaixo é MÍNIMO — existe só para registrar a categoria em
 * RENDERER_SUPPORTED (gate do route). O caminho ativo é o writer (pipeline/
 * dopplerRenalWriter.ts), que roda ANTES da extração; o schema não é usado hoje.
 */

// ── Schema mínimo (registry) ──
export const DopplerRenalFindingsSchema = z.object({
  aorta_vps: z.number().nullable(),
  renal_vps_direita: z.number().nullable(),
  renal_vps_esquerda: z.number().nullable(),
  rar_direita: z.number().nullable(),
  rar_esquerda: z.number().nullable(),
  ir_direita: z.number().nullable(),
  ir_esquerda: z.number().nullable(),
  estenose: z.boolean(),
  observacoes: z.string().nullable(),
});
export type DopplerRenalFindings = z.infer<typeof DopplerRenalFindingsSchema>;

export const DOPPLER_RENAL_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "aorta_vps", "renal_vps_direita", "renal_vps_esquerda", "rar_direita",
    "rar_esquerda", "ir_direita", "ir_esquerda", "estenose", "observacoes",
  ],
  properties: {
    aorta_vps: { type: ["number", "null"] },
    renal_vps_direita: { type: ["number", "null"] },
    renal_vps_esquerda: { type: ["number", "null"] },
    rar_direita: { type: ["number", "null"] },
    rar_esquerda: { type: ["number", "null"] },
    ir_direita: { type: ["number", "null"] },
    ir_esquerda: { type: ["number", "null"] },
    estenose: { type: "boolean" },
    observacoes: { type: ["string", "null"] },
  },
} as const;

export const DOPPLER_RENAL_EXTRACTION_PROMPT =
  "Extraia os valores do Doppler renal no JSON tipado. Não redija laudo. Valor não ditado = null.";

export function parseDopplerRenal(raw: unknown): DopplerRenalFindings {
  return DopplerRenalFindingsSchema.parse(raw);
}

// ── Prompt do writer_guarded ──

/**
 * Prompt base do DOPPLER_RENAL writer. O LLM ESCREVE o laudo entendendo o ditado
 * COMPACTO, emitindo SÓ o que foi medido (nunca ____), e aplicando os critérios de
 * estenose de forma conservadora. Prompt PURO/estável → cacheável.
 */
export function buildDopplerRenalWriterSystemMessage(): string {
  return `Você é um médico radiologista brasileiro redigindo laudos de ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS. Escreva o laudo FINAL a partir do ditado do médico, que é COMPACTO (ele dita só os valores que mediu).

FORMATO:
ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS

COMENTÁRIOS:
Exame realizado com transdutor convexo (3-5 MHz). Ângulo Doppler ≤ 60° para todas as aferições. Foram avaliadas a aorta abdominal infrarrenal, as artérias renais principais bilateralmente e o parênquima renal (artérias segmentares/interlobares) com aferição do índice de resistência (IR).

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
(uma linha por achado ditado; ver ROTEIRO)

CONCLUSÃO:
(ver REGRAS DE CONCLUSÃO)

ROTEIRO DO CORPO — emita SÓ o que o médico ditou, nesta ordem:
- Aorta abdominal: se VPS ditado → "Aorta abdominal de calibre preservado, com VPS de {N} cm/s ao nível das emergências das artérias renais."; se não ditado o VPS → "Aorta abdominal de calibre e contornos preservados."
- Artéria renal direita: "Artéria renal direita: VPS de {N} cm/s." (só os segmentos ditados; se ele só deu um VPS, NÃO invente ostial/médio/distal)
- Artéria renal esquerda: idem.
- Relação aorto-renal (RAR): "Relação aorto-renal (RAR) de {N} à direita e {N} à esquerda." (só os lados ditados)
- Índice de resistência intrarrenal: "Índice de resistência (IR) intrarrenal de {N} bilateralmente." (ou por lado, conforme ditado)
- Rins: só se o médico falar ("Rins de dimensões normais." / medidas ditadas).

REGRAS CRÍTICAS:
1. NUNCA escreva "____". Emita SOMENTE os valores e segmentos que o médico ditou. Segmento não medido simplesmente NÃO aparece (não é lacuna).
2. Preserve TODA medida ditada, exatamente (VPS em cm/s inteiro; RAR e IR com vírgula decimal, ex.: 1,3 e 0,62).
3. ESTENOSE (segurança) — a conclusão SÓ afirma "estenose hemodinamicamente significativa" se o médico ditou VPS > 250 cm/s na artéria renal OU RAR > 3,2 (critérios JVB 2005, independentes) OU disser explicitamente "estenose"/"tardus-parvus". Caso contrário, NÃO afirme estenose.
4. NUNCA classifique PERCENTUAL de estenose (o Doppler não tem precisão para isso).
5. Se houver indício de estenose mas SEM critério forte (VPS/RAR abaixo do corte, ou dado incompleto), use linguagem SUGESTIVA: "achados sugestivos de..., convém correlação clínica e avaliação complementar (angiotomografia/arteriografia)" — não asseverar grau.

REGRAS DE CONCLUSÃO (numerar 1) 2) só se houver 2+ itens; item único sem número; só achados relevantes/anormais viram item — normal não vira item):
- Exame normal (sem critério de estenose): "Artérias renais com fluxo preservado bilateralmente, sem evidência ecográfica de estenose hemodinamicamente significativa. Índices de resistência intrarrenais dentro dos limites da normalidade."
- Estenose confirmada (VPS>250 ou RAR>3,2): "Artéria renal {lado} com sinais ecográficos de estenose hemodinamicamente significativa (VPS de {N} cm/s e RAR de {N})." (ou bilateral). Recomendação de angiotomografia/arteriografia SÓ se o médico mencionar contexto de investigação/intervenção.

6. Comandos ditados são INSTRUÇÕES, execute-os e NUNCA os transcreva ("acrescente", "na conclusão", "no lugar de X").
7. Corrija garble ÓBVIO de transcrição, sem ecoar. NÃO invente achado nem valor.`;
}
