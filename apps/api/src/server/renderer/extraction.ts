import { env } from "../env";
import { openai } from "../ai/openai";
import {
  ABDOMEN_TOTAL_FINDINGS_JSON_SCHEMA,
  AbdomenTotalFindingsSchema,
  type AbdomenTotalFindings,
} from "./findingsSchemas/ABDOMEN_TOTAL";

/**
 * DET-5 — Extração tipada por categoria para o caminho RENDERER.
 *
 * Diferente do structurer geral (achados como JSON livre), aqui o schema é
 * FECHADO e específico da categoria: o LLM só preenche dados; quem escreve o
 * laudo é o renderer (código). Temp 0 + structured outputs strict.
 *
 * Categorias suportadas: registro abaixo (piloto: ABDOMEN_TOTAL).
 */

/**
 * Categorias com schema de extração registrado. O route SÓ entra no caminho
 * renderer se a categoria estiver aqui — flag ligada + template_body sem
 * schema NUNCA pode derrubar a geração (fallback writer, nunca throw).
 */
export const RENDERER_SUPPORTED_CATEGORIES = new Set(["ABDOMEN_TOTAL"]);

export type RendererExtractionResult = {
  findings: AbdomenTotalFindings;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
};

const ABDOMEN_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG (caminho determinístico).
Sua única tarefa: organizar o ditado do médico no JSON tipado de ABDOME TOTAL.
Você NÃO redige laudo. Você NÃO adiciona nada que o médico não disse.

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
9. Derrame pleural → achados_extra_abdominais (tipo "derrame_pleural",
   grau e lateralidade quando ditos).
10. Tipos e onde usar:
   - esteatose (fígado; grau leve/moderado/acentuado)
   - cisto_simples (fígado ou rins; medidas, localizacao)
   - imagem_cistica_complexa (rins; descreva calcificações etc em descricao_livre)
   - litiase (vesicula ou rins; quantidade unica/multiplas; medidas; localizacao)
   - ateromatose (aorta)
   - derrame_pleural (extra abdominal)
   - volume_pre_miccional (bexiga; valor_ml)
   - outro (qualquer outra coisa)
   GATILHOS CANÔNICOS (da biblioteca curada — o médico raramente fala o nome
   do diagnóstico; classifique pelo padrão descrito):
   - rim + "imagem hiperecoica" (sem aspecto cístico/anecoico) → litiase
   - rim + "imagem anecoica homogênea" / "cisto" margem regular → cisto_simples
   - rim + cístico COM calcificação/septação/irregularidade → imagem_cistica_complexa
     (descricao_livre OBRIGATÓRIA = a característica de complexidade nas
     palavras EXATAS do médico, ex: "calcificação periférica puntiforme")
   - vesícula + "imagem(ns) hiperecoica(s)" móvel(is) / sombra acústica → litiase
   - aorta + "imagens hiperecoicas aderidas às paredes" / "placas" → ateromatose
   - fígado + "aumento da ecogenicidade" → esteatose (discreto → leve;
     difuso/atenuação sonora → moderado)
   - fígado + "imagem anecoica homogênea" → cisto_simples
11. "observacoes_do_medico": instruções do médico sobre o laudo (ex: "inclua a
    tabela do Doppler") — texto corrido ou null.`;

/**
 * Normalização determinística pós-parse (reviews dex1+dex2): o structured
 * output garante FORMA, não coerência clínica entre campos. Coerções:
 * - órgão com achados mas status "normal"/"nao_avaliado" → status "alterado"
 *   (achado NUNCA se perde silenciosamente);
 * - achado tipo "outro" sem descricao_livre → preenche com termo_do_medico/
 *   localizacao; sem nada utilizável → vira placeholder explícito p/ revisão
 *   (jamais inventa conteúdo).
 */
function normalizeFindings(f: AbdomenTotalFindings): AbdomenTotalFindings {
  const fixFinding = (a: AbdomenTotalFindings["achados_extra_abdominais"][number]) => {
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
  ) as AbdomenTotalFindings["orgaos"];
  return {
    orgaos,
    achados_extra_abdominais: f.achados_extra_abdominais.map(fixFinding),
    observacoes_do_medico: f.observacoes_do_medico,
  };
}

export async function runRendererExtraction(args: {
  categoryCode: string;
  rawInput: string;
  signal?: AbortSignal;
}): Promise<RendererExtractionResult> {
  if (args.categoryCode !== "ABDOMEN_TOTAL") {
    throw new Error(
      `renderer extraction: categoria sem schema registrado: ${args.categoryCode}`,
    );
  }
  const t0 = Date.now();
  const e = env();

  const res = await openai().chat.completions.create(
    {
      model: e.OPENAI_MODEL_STRUCTURER,
      temperature: 0.0,
      max_tokens: 8000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "AbdomenTotalFindings",
          strict: true,
          schema: ABDOMEN_TOTAL_FINDINGS_JSON_SCHEMA as unknown as Record<
            string,
            unknown
          >,
        },
      },
      messages: [
        { role: "system", content: ABDOMEN_EXTRACTION_PROMPT },
        { role: "user", content: `Ditado do médico:\n${args.rawInput}` },
      ],
    },
    { signal: args.signal },
  );

  const raw = res.choices[0]?.message?.content;
  if (!raw) throw new Error("renderer extraction: resposta vazia");
  const findings = normalizeFindings(
    AbdomenTotalFindingsSchema.parse(JSON.parse(raw)),
  );

  return {
    findings,
    latencyMs: Date.now() - t0,
    inputTokens: res.usage?.prompt_tokens,
    outputTokens: res.usage?.completion_tokens,
  };
}
