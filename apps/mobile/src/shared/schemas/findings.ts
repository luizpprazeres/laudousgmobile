import { z } from "zod";
import { CategoryCodeSchema } from "./categories";

/**
 * Comando explícito do médico, extraído do input. Tem PRIORIDADE MÁXIMA na
 * geração — sobrepõe achados, RAG, estilo. Ver precedência em prompts/global.ts.
 */
export const CommandKindSchema = z.enum([
  "adicionar_conclusao_final",
  "comparar_com_exame_anterior",
  "incluir_recomendacao",
  "remover_secao",
  "destacar_achado",
  "usar_terminologia",
  "outro",
]);

export const CommandSchema = z.object({
  tipo: CommandKindSchema,
  texto: z.string().min(1),
  // Trecho original do input que originou o comando (auditável)
  trecho_original: z.string().optional(),
});

export type Command = z.infer<typeof CommandSchema>;

/**
 * Lateralidade detectada em achados que admitem (rim, mama, ovário, etc.)
 */
export const LateralitySchema = z.enum([
  "direito",
  "esquerdo",
  "bilateral",
  "nao_aplicavel",
]);

/**
 * Trecho do input que o structurer não conseguiu interpretar com confiança.
 * Vai para o validador determinístico decidir se pergunta ao usuário.
 */
export const ConfusingSnippetSchema = z.object({
  trecho: z.string().min(1),
  motivo: z.string(),
});

/**
 * Nível de confiança global da estruturação. Usado pelo validador
 * determinístico para decidir se vale perguntar ao usuário antes de gerar.
 */
export const ConfidenceLevelSchema = z.enum(["baixa", "media", "alta"]);

/**
 * StructuredFindings — saída da etapa Structurer.
 *
 * Importante: o objeto `achados` é deliberadamente FRACAMENTE TIPADO
 * (registro arbitrário) porque cada categoria tem campos diferentes.
 * O CONTRATO POR CATEGORIA (em prompts/contracts/<CATEGORIA>.ts) é que
 * define o schema estrito de `achados` para aquela categoria, e é
 * usado tanto no prompt do structurer (json_schema strict) quanto na
 * validação determinística pós-estruturação.
 */
export const StructuredFindingsSchema = z.object({
  schema_version: z.string(),
  categoria_detectada: CategoryCodeSchema,
  tipo_exame: z.string().min(2),
  achados: z.record(z.string(), z.unknown()),
  comandos_do_medico: z.array(CommandSchema),
  trechos_confusos: z.array(ConfusingSnippetSchema),
  nivel_de_confianca: ConfidenceLevelSchema,
  // Metadados extraídos quando presentes
  datas_referidas: z.array(z.string()).optional(),
  lateralidades_mencionadas: z.array(LateralitySchema).optional(),
});

export type StructuredFindings = z.infer<typeof StructuredFindingsSchema>;
