import {
  StructuredFindingsSchema,
  type StructuredFindings,
} from "@laudousg/shared";
import { z } from "zod";
import { env } from "../env";
import { openai } from "../ai/openai";
import { STRUCTURED_FINDINGS_JSON_SCHEMA } from "../ai/jsonSchema";

/**
 * Etapa 1 — Structurer (gpt-4.1-mini com Structured Outputs strict).
 *
 * Recebe input bruto + hint de categoria e produz StructuredFindings:
 * categoria detectada, tipo_exame, achados (registro), comandos do médico,
 * trechos confusos, nivel_de_confianca.
 *
 * Esta etapa NÃO redige laudo.
 *
 * Workaround: o campo `achados` viaja como STRING JSON-encoded para satisfazer
 * Structured Outputs (ver ai/jsonSchema.ts). Re-parseamos aqui.
 */

const STRUCTURER_SYSTEM_PROMPT = `Você é a etapa estruturadora do LaudoUSG Mobile.
Sua única tarefa é organizar o que o médico disse em JSON estruturado.
NÃO redija laudo. NÃO adicione informação que o médico não disse.

Regras:
- "categoria_detectada": SCREAMING_SNAKE_CASE (ex: ABDOMEN_TOTAL, PELVE_FEMININA, MAMARIA, TIREOIDE).
- "tipo_exame": frase curta em português (ex: "Ultrassonografia do abdome total").
- "achados": JSON ESTRUTURADO codificado como STRING (vai ser re-parseado). Use chaves em snake_case por estrutura/órgão.
  REGRA OBRIGATÓRIA DE MEDIDAS — pra não quebrar o JSON parser:
  * TODA medida com vírgula decimal DEVE ser STRING entre aspas: "67,4" ✓ (válido), 67,4 ✗ (INVÁLIDO em JSON).
  * Arrays de medidas: ["35,4", "30,3", "28,4"] ✓ (válido), [35,4, 30,3, 28,4] ✗ (INVÁLIDO em JSON).
  * Números inteiros sem decimais podem ficar como número: "frequencia_cardiaca_bpm": 150 ✓.
  * Em dúvida → use string com aspas. Preserva a vírgula decimal como o médico ditou, sem quebrar parser.
- "comandos_do_medico": frases do médico que ditam estrutura do laudo final. Inclui:
   * IMPERATIVAS: "acrescente...", "compare com...", "remova...", "use a frase Y".
   * POSICIONAIS: "item 1 da conclusão = ...", "no final coloque...", "antes de Z escreva W".
   * DESCRITIVAS COM ALVO EXPLÍCITO: "na conclusão, X", "para o título use Y".
   * CLASSIFICAÇÕES RADS/FIGO/Domingos DITADAS COM NÚMERO: "BI-RADS 2", "TI-RADS 3",
     "O-RADS 4", "Domingos 5", "FIGO IIIB" — SEMPRE extrair como comando, mesmo
     que apareça embutido em frase descritiva (ex: "na conclusão, cisto simples,
     BI-RADS 2" → comando com texto preservado integral). Reproduzir o número
     EXATO no campo texto. NUNCA repita esses textos em "achados".
- "trechos_confusos": apenas se o input tiver ambiguidade real.
- "nivel_de_confianca": baixa / media / alta.
- "datas_referidas": datas mencionadas em formato como falado (string array). Use [] se nenhuma.
- "lateralidades_mencionadas": ["direito"|"esquerdo"|"bilateral"|"nao_aplicavel"]. Use [] se inaplicável.
- NUNCA invente. NUNCA calcule volumes nem classificações (BI-RADS, TI-RADS, O-RADS, FIGO, Domingos).
- Se o médico falar APENAS um número de líquido amniótico sem ILA/MBV, deixe para a etapa seguinte resolver.

Exemplo crítico:
Input: "imagem anecoica de mama direita 0,8 x 0,7 x 1,0 cm. na conclusao, cisto simples de mama direita, BI-RADS 2"
→ achado: { mama_direita: { nodulo: { tipo: "anecoico", medidas_cm: ["0,8", "0,7", "1,0"], ... } } }
→ comandos_do_medico: [{ tipo: "adicionar_conclusao_final", texto: "na conclusão: cisto simples de mama direita, BI-RADS 2", trecho_original: "na conclusao, cisto simples de mama direita, BI-RADS 2" }]`;

/**
 * Schema interno do structurer: aceita `achados` como string e faz parse.
 * Depois re-valida contra StructuredFindings (com `achados` como objeto).
 */
const StructurerRawOutputSchema = z.object({
  schema_version: z.string(),
  categoria_detectada: z.string(),
  tipo_exame: z.string(),
  achados: z.string(),
  comandos_do_medico: z.array(
    z.object({
      tipo: z.string(),
      texto: z.string(),
      trecho_original: z.string().nullable(),
    }),
  ),
  trechos_confusos: z.array(
    z.object({ trecho: z.string(), motivo: z.string() }),
  ),
  nivel_de_confianca: z.enum(["baixa", "media", "alta"]),
  datas_referidas: z.array(z.string()).nullable(),
  lateralidades_mencionadas: z
    .array(z.enum(["direito", "esquerdo", "bilateral", "nao_aplicavel"]))
    .nullable(),
});

export async function runStructurer(args: {
  rawInput: string;
  categoryHint?: string;
  /**
   * Lista de category_code VÁLIDOS (da tabela categories). Quando fornecida, o
   * structurer é instruído a escolher EXATAMENTE um deles — evita que o LLM
   * invente códigos não-canônicos (ex.: ULTRASSONOGRAFIA_FETAL) que quebram a
   * FK de reports.category_code. Defesa adicional: normalizeCategoryCode.
   */
  knownCategories?: string[];
  signal?: AbortSignal;
}): Promise<{
  findings: StructuredFindings;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}> {
  const t0 = Date.now();
  const e = env();

  // Restringe a categoria à lista canônica (tabela categories). Sem isso, o LLM
  // às vezes inventa códigos (ULTRASSONOGRAFIA_FETAL/OBSTETRICA) que quebram a FK.
  const categoryConstraint =
    args.knownCategories && args.knownCategories.length > 0
      ? `\n\nCATEGORIA — REGRA OBRIGATÓRIA:\n"categoria_detectada" DEVE ser EXATAMENTE um destes códigos canônicos (copie literal, sem inventar variações):\n${args.knownCategories.join(", ")}\nEscolha o mais adequado ao exame. Se nenhum servir perfeitamente, use o mais próximo da lista. NUNCA crie um código fora desta lista.`
      : "";
  const systemPrompt = STRUCTURER_SYSTEM_PROMPT + categoryConstraint;

  const userMessage = [
    args.categoryHint ? `Hint de categoria: ${args.categoryHint}` : "",
    "",
    "Input do médico:",
    args.rawInput,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  // gpt-4.1-mini suporta até 16k output tokens. Sem max_tokens explícito,
  // a API às vezes trunca outputs de json_schema strict no meio (especialmente
  // com `achados` aninhado como string JSON-encoded). Setamos 16k pra evitar.
  const callOpenAI = async (extraSystemNote?: string) => {
    return openai().chat.completions.create(
      {
        model: e.OPENAI_MODEL_STRUCTURER,
        temperature: 0.0,
        max_tokens: 16000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "StructuredFindings",
            strict: true,
            schema: STRUCTURED_FINDINGS_JSON_SCHEMA as Record<string, unknown>,
          },
        },
        messages: [
          {
            role: "system",
            content: extraSystemNote
              ? `${systemPrompt}\n\n${extraSystemNote}`
              : systemPrompt,
          },
          { role: "user", content: userMessage },
        ],
      },
      { signal: args.signal },
    );
  };

  const parseStructurerResponse = (raw: string | null | undefined) => {
    if (!raw) throw new Error("structurer: resposta vazia");
    let rawObj: unknown;
    try {
      rawObj = JSON.parse(raw);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(
        `structurer: resposta do LLM não é JSON válido (${detail}). Início: ${raw.slice(0, 200)}`,
      );
    }
    const validated = StructurerRawOutputSchema.parse(rawObj);
    let achados: Record<string, unknown>;
    try {
      achados = JSON.parse(validated.achados);
    } catch {
      throw new Error(
        `structurer: campo achados não é JSON válido: ${validated.achados.slice(0, 200)}`,
      );
    }
    return { validated, achados };
  };

  // 1ª tentativa
  let res = await callOpenAI();
  let parsedOutput: ReturnType<typeof parseStructurerResponse>;
  try {
    parsedOutput = parseStructurerResponse(res.choices[0]?.message?.content);
  } catch (firstErr) {
    // Retry 1x com instrução enfática. Cobre 2 modos de falha conhecidos:
    // (a) JSON truncado em inputs grandes (obstetrica com biometria completa)
    // (b) vírgula decimal brasileira fora de string (67,4 em vez de "67,4")
    const errMsg = firstErr instanceof Error ? firstErr.message : String(firstErr);
    const note =
      "ATENÇÃO: a resposta anterior falhou ao parse do campo `achados` " +
      `(erro: ${errMsg.slice(0, 200)}). ` +
      "Pontos de atenção pra esta tentativa:\n" +
      "1. TODA medida com vírgula decimal DEVE ser STRING com aspas. " +
      'Ex: "67,4" ✓ válido, 67,4 ✗ INVÁLIDO em JSON.\n' +
      '2. Arrays de medidas: ["35,4", "30,3", "28,4"] ✓ válido, [35,4, 30,3, 28,4] ✗ INVÁLIDO.\n' +
      "3. Seja CONCISO (use só chaves estritamente necessárias).\n" +
      "4. GARANTA fechar todas as chaves e colchetes.\n" +
      "O JSON DEVE estar 100% completo, válido e parseável.";
    res = await callOpenAI(note);
    parsedOutput = parseStructurerResponse(res.choices[0]?.message?.content);
  }
  const { validated, achados } = parsedOutput;

  const findings: StructuredFindings = StructuredFindingsSchema.parse({
    schema_version: validated.schema_version || e.FINDINGS_SCHEMA_VERSION,
    categoria_detectada: validated.categoria_detectada,
    tipo_exame: validated.tipo_exame,
    achados,
    comandos_do_medico: validated.comandos_do_medico.map((c) => ({
      tipo: c.tipo as never, // CommandKindSchema valida no parse final
      texto: c.texto,
      trecho_original: c.trecho_original ?? undefined,
    })),
    trechos_confusos: validated.trechos_confusos,
    nivel_de_confianca: validated.nivel_de_confianca,
    datas_referidas: validated.datas_referidas ?? undefined,
    lateralidades_mencionadas: validated.lateralidades_mencionadas ?? undefined,
  });

  return {
    findings,
    latencyMs: Date.now() - t0,
    inputTokens: res.usage?.prompt_tokens,
    outputTokens: res.usage?.completion_tokens,
  };
}
