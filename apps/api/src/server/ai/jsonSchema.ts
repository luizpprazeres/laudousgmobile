/**
 * JSON Schema strict — escritos À MÃO conforme as restrições do
 * OpenAI Structured Outputs (https://platform.openai.com/docs/guides/structured-outputs).
 *
 * Restrições críticas (recomendação do codex, validadas):
 *  - root deve ser type: "object"
 *  - SEM anyOf/oneOf/discriminated union no root
 *  - TODOS os campos em "required"
 *  - additionalProperties: false em TODO objeto
 *  - opcionais viram type: ["foo", "null"]
 *  - profundidade máxima de schema permitida (ver doc OpenAI)
 *
 * Snapshot test em apps/api/src/server/ai/__tests__/jsonSchema.test.ts
 * (futuro) garante que mudanças no Zod não quebrem o schema OpenAI.
 *
 * IMPORTANTE: o `achados` em StructuredFindings é deliberadamente um objeto
 * livre (additionalProperties:true seria ideal, mas Structured Outputs exige
 * additionalProperties:false). Workaround: removemos restrição em `achados`
 * e validamos o conteúdo POST-completion via Zod no adapter.
 */

export const STRUCTURED_FINDINGS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "schema_version",
    "categoria_detectada",
    "tipo_exame",
    "achados",
    "comandos_do_medico",
    "trechos_confusos",
    "nivel_de_confianca",
    "datas_referidas",
    "lateralidades_mencionadas",
  ],
  properties: {
    schema_version: { type: "string" },
    categoria_detectada: {
      type: "string",
      description:
        "Code da categoria em SCREAMING_SNAKE_CASE (ex: ABDOMEN_TOTAL, PELVE_FEMININA).",
    },
    tipo_exame: { type: "string" },
    achados: {
      // Workaround para Structured Outputs: aceitar como STRING JSON-encoded.
      // O adapter (parseStructuredFindings) faz JSON.parse() e valida com Zod.
      // Razão: Structured Outputs não permite Record<string, unknown> livre.
      type: "string",
      description:
        "JSON SERIALIZADO (string) com os achados estruturados por estrutura anatômica. Cada categoria define seus campos. Será re-parseado no servidor.",
    },
    comandos_do_medico: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tipo", "texto", "trecho_original"],
        properties: {
          tipo: {
            type: "string",
            enum: [
              "adicionar_conclusao_final",
              "comparar_com_exame_anterior",
              "incluir_recomendacao",
              "remover_secao",
              "destacar_achado",
              "usar_terminologia",
              "outro",
            ],
          },
          texto: { type: "string" },
          trecho_original: { type: ["string", "null"] },
        },
      },
    },
    trechos_confusos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["trecho", "motivo"],
        properties: {
          trecho: { type: "string" },
          motivo: { type: "string" },
        },
      },
    },
    nivel_de_confianca: { type: "string", enum: ["baixa", "media", "alta"] },
    datas_referidas: {
      type: ["array", "null"],
      items: { type: "string" },
    },
    lateralidades_mencionadas: {
      type: ["array", "null"],
      items: {
        type: "string",
        enum: ["direito", "esquerdo", "bilateral", "nao_aplicavel"],
      },
    },
  },
} as const;

export const SANITY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "summary", "issues"],
  properties: {
    verdict: { type: "string", enum: ["ok", "warning", "critical"] },
    summary: { type: "string" },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "severity", "detail", "trecho_laudo", "campo_achado"],
        properties: {
          type: {
            type: "string",
            enum: [
              "medida_divergente",
              "lateralidade_divergente",
              "achado_omitido",
              "achado_inventado",
              "comando_ignorado",
              "categoria_divergente",
              "conclusao_inconsistente",
              "data_divergente",
              "formato_quebrado",
              "outro",
            ],
          },
          severity: { type: "string", enum: ["info", "warning", "critical"] },
          detail: { type: "string" },
          trecho_laudo: { type: ["string", "null"] },
          campo_achado: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;
