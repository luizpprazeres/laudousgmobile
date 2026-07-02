import { env } from "../env";
import { normalizeAsrClinical } from "../pipeline/asrClinical";
import { openai } from "../ai/openai";
import {
  ABDOMEN_TOTAL_FINDINGS_JSON_SCHEMA,
  AbdomenTotalFindingsSchema,
  type AbdomenTotalFindings,
} from "./findingsSchemas/ABDOMEN_TOTAL";
import {
  OBSTETRICA_JSON_SCHEMA,
  OBSTETRICA_EXTRACTION_PROMPT,
  ObstetricaFindingsSchema,
} from "./categories/OBSTETRICA";
import {
  MORFOLOGICO_JSON_SCHEMA,
  MORFOLOGICO_EXTRACTION_PROMPT,
  MorfologicoFindingsSchema,
} from "./categories/MORFOLOGICO";
import {
  TIREOIDE_JSON_SCHEMA,
  TIREOIDE_EXTRACTION_PROMPT,
  TireoideFindingsSchema,
} from "./categories/TIREOIDE";
import {
  MAMARIA_JSON_SCHEMA,
  MAMARIA_EXTRACTION_PROMPT,
  MamariaFindingsSchema,
} from "./categories/MAMARIA";
import {
  PARTES_MOLES_JSON_SCHEMA,
  PARTES_MOLES_EXTRACTION_PROMPT,
  PartesMolesFindingsSchema,
} from "./categories/PARTES_MOLES";
import {
  CERVICAL_JSON_SCHEMA,
  CERVICAL_EXTRACTION_PROMPT,
  CervicalFindingsSchema,
} from "./categories/CERVICAL";
import {
  PELVE_FEMININA_JSON_SCHEMA,
  PELVE_FEMININA_EXTRACTION_PROMPT,
  PelveFemininaFindingsSchema,
} from "./categories/PELVE_FEMININA";
import {
  ABDOMEN_SUPERIOR_JSON_SCHEMA,
  ABDOMEN_SUPERIOR_EXTRACTION_PROMPT,
  AbdomenSuperiorFindingsSchema,
} from "./categories/ABDOMEN_SUPERIOR";
import {
  VIAS_URINARIAS_JSON_SCHEMA,
  VIAS_URINARIAS_EXTRACTION_PROMPT,
  ViasUrinariasFindingsSchema,
} from "./categories/VIAS_URINARIAS";
import {
  MUSCULOESQUELETICO_JSON_SCHEMA,
  MUSCULOESQUELETICO_EXTRACTION_PROMPT,
  parseMusculoesqueletico,
} from "./categories/MUSCULOESQUELETICO";
import {
  PROSTATA_SUPRAPUBICA_JSON_SCHEMA,
  PROSTATA_SUPRAPUBICA_EXTRACTION_PROMPT,
  ProstataSuprapubicaFindingsSchema,
} from "./categories/PROSTATA_SUPRAPUBICA";
import {
  DOPPLER_OBSTETRICO_JSON_SCHEMA,
  DOPPLER_OBSTETRICO_EXTRACTION_PROMPT,
  DopplerObstetricoFindingsSchema,
} from "./categories/DOPPLER_OBSTETRICO";
import {
  CERVICOMETRIA_JSON_SCHEMA,
  CERVICOMETRIA_EXTRACTION_PROMPT,
  CervicometriaFindingsSchema,
} from "./categories/CERVICOMETRIA";

/**
 * DET-5 — Extração tipada por categoria para o caminho RENDERER.
 *
 * Diferente do structurer geral (achados como JSON livre), aqui o schema é
 * FECHADO e específico da categoria: o LLM só preenche dados; quem escreve o
 * laudo é o renderer (código). Temp 0 + structured outputs strict.
 *
 * Registry abaixo: cada categoria suportada tem schema strict + prompt + parse.
 */

type Extractor = {
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  prompt: string;
  parse: (raw: unknown) => unknown;
};

/**
 * Categorias cujo render é PROGRAMÁTICO (montam o laudo em código, sem
 * template_body com slots). Entram no renderer mesmo sem template no catálogo.
 */
export const RENDERER_PROGRAMMATIC_CATEGORIES = new Set([
  "OBSTETRICA",
  "MORFOLOGICO",
  "TIREOIDE",
  "MAMARIA",
  "PARTES_MOLES",
  "CERVICAL",
  "PELVE_FEMININA",
  "ABDOMEN_SUPERIOR",
  "VIAS_URINARIAS",
  "MUSCULOESQUELETICO_V2",
  "PROSTATA_SUPRAPUBICA",
  "DOPPLER_OBSTETRICO",
  "CERVICOMETRIA",
]);

export type RendererExtractionResult = {
  findings: unknown;
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
   - litiase (vesicula ou rins; quantidade unica/multiplas; medidas; localizacao;
     mobilidade "movel"/"imovel" quando o médico disser se os cálculos se movem
     à mudança de decúbito — senão deixe mobilidade null)
   - parede_espessada (vesicula; espessura da parede em medidas_cm[0] em cm)
   - ateromatose (aorta)
   - derrame_pleural (extra abdominal)
   - volume_pre_miccional (bexiga; valor_ml)
   - outro (qualquer outra coisa)
   "mobilidade" só se aplica a litíase de vesícula; deixe null nos demais.
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

export const EXTRACTORS: Record<string, Extractor> = {
  ABDOMEN_TOTAL: {
    schemaName: "AbdomenTotalFindings",
    jsonSchema: ABDOMEN_TOTAL_FINDINGS_JSON_SCHEMA as unknown as Record<string, unknown>,
    prompt: ABDOMEN_EXTRACTION_PROMPT,
    parse: (raw) => normalizeFindings(AbdomenTotalFindingsSchema.parse(raw)),
  },
  OBSTETRICA: {
    schemaName: "ObstetricaFindings",
    jsonSchema: OBSTETRICA_JSON_SCHEMA as unknown as Record<string, unknown>,
    prompt: OBSTETRICA_EXTRACTION_PROMPT,
    parse: (raw) => ObstetricaFindingsSchema.parse(raw),
  },
  MORFOLOGICO: {
    schemaName: "MorfologicoFindings",
    jsonSchema: MORFOLOGICO_JSON_SCHEMA as unknown as Record<string, unknown>,
    prompt: MORFOLOGICO_EXTRACTION_PROMPT,
    parse: (raw) => MorfologicoFindingsSchema.parse(raw),
  },
  TIREOIDE: {
    schemaName: "TireoideFindings",
    jsonSchema: TIREOIDE_JSON_SCHEMA as unknown as Record<string, unknown>,
    prompt: TIREOIDE_EXTRACTION_PROMPT,
    parse: (raw) => TireoideFindingsSchema.parse(raw),
  },
  MAMARIA: {
    schemaName: "MamariaFindings",
    jsonSchema: MAMARIA_JSON_SCHEMA as unknown as Record<string, unknown>,
    prompt: MAMARIA_EXTRACTION_PROMPT,
    parse: (raw) => MamariaFindingsSchema.parse(raw),
  },
  PARTES_MOLES: {
    schemaName: "PartesMolesFindings",
    jsonSchema: PARTES_MOLES_JSON_SCHEMA as unknown as Record<string, unknown>,
    prompt: PARTES_MOLES_EXTRACTION_PROMPT,
    parse: (raw) => PartesMolesFindingsSchema.parse(raw),
  },
  CERVICAL: {
    schemaName: "CervicalFindings",
    jsonSchema: CERVICAL_JSON_SCHEMA as unknown as Record<string, unknown>,
    prompt: CERVICAL_EXTRACTION_PROMPT,
    parse: (raw) => CervicalFindingsSchema.parse(raw),
  },
  PELVE_FEMININA: {
    schemaName: "PelveFemininaFindings",
    jsonSchema: PELVE_FEMININA_JSON_SCHEMA as unknown as Record<string, unknown>,
    prompt: PELVE_FEMININA_EXTRACTION_PROMPT,
    parse: (raw) => PelveFemininaFindingsSchema.parse(raw),
  },
  ABDOMEN_SUPERIOR: {
    schemaName: "AbdomenSuperiorFindings",
    jsonSchema: ABDOMEN_SUPERIOR_JSON_SCHEMA as unknown as Record<string, unknown>,
    prompt: ABDOMEN_SUPERIOR_EXTRACTION_PROMPT,
    parse: (raw) => AbdomenSuperiorFindingsSchema.parse(raw),
  },
  VIAS_URINARIAS: {
    schemaName: "ViasUrinariasFindings",
    jsonSchema: VIAS_URINARIAS_JSON_SCHEMA as unknown as Record<string, unknown>,
    prompt: VIAS_URINARIAS_EXTRACTION_PROMPT,
    parse: (raw) => ViasUrinariasFindingsSchema.parse(raw),
  },
  MUSCULOESQUELETICO_V2: {
    schemaName: "MusculoesqueleticoFindings",
    jsonSchema: MUSCULOESQUELETICO_JSON_SCHEMA as unknown as Record<string, unknown>,
    prompt: MUSCULOESQUELETICO_EXTRACTION_PROMPT,
    parse: (raw) => parseMusculoesqueletico(raw),
  },
  PROSTATA_SUPRAPUBICA: {
    schemaName: "ProstataSuprapubicaFindings",
    jsonSchema: PROSTATA_SUPRAPUBICA_JSON_SCHEMA as unknown as Record<string, unknown>,
    prompt: PROSTATA_SUPRAPUBICA_EXTRACTION_PROMPT,
    parse: (raw) => ProstataSuprapubicaFindingsSchema.parse(raw),
  },
  DOPPLER_OBSTETRICO: {
    schemaName: "DopplerObstetricoFindings",
    jsonSchema: DOPPLER_OBSTETRICO_JSON_SCHEMA as unknown as Record<string, unknown>,
    prompt: DOPPLER_OBSTETRICO_EXTRACTION_PROMPT,
    parse: (raw) => DopplerObstetricoFindingsSchema.parse(raw),
  },
  CERVICOMETRIA: {
    schemaName: "CervicometriaFindings",
    jsonSchema: CERVICOMETRIA_JSON_SCHEMA as unknown as Record<string, unknown>,
    prompt: CERVICOMETRIA_EXTRACTION_PROMPT,
    parse: (raw) => CervicometriaFindingsSchema.parse(raw),
  },
};

/**
 * Categorias com schema de extração registrado. O route SÓ entra no caminho
 * renderer se a categoria estiver aqui — flag ligada sem schema NUNCA pode
 * derrubar a geração (fallback writer, nunca throw).
 */
export const RENDERER_SUPPORTED_CATEGORIES = new Set(Object.keys(EXTRACTORS));

/**
 * Milestones de progresso (UX): quando o nome do campo aparece no JSON parcial
 * (streaming), emite "achado: <label>" para o app mostrar o que já foi entendido.
 * Heurístico e transversal às categorias — campo ausente simplesmente não dispara.
 */
const PROGRESS_MILESTONES: { field: string; label: string }[] = [
  { field: '"bcf_bpm"', label: "batimentos" },
  { field: '"dbp_mm"', label: "biometria fetal" },
  { field: '"peso_g"', label: "peso fetal" },
  { field: '"ig_semanas"', label: "idade gestacional" },
  { field: '"primeira_us_data"', label: "1ª ultrassonografia" },
  { field: '"prostata_d1_cm"', label: "medidas da próstata" },
  { field: '"ipp_cm"', label: "índice de protrusão" },
  { field: '"birads"', label: "categoria BI-RADS" },
  { field: '"tirads"', label: "categoria TI-RADS" },
  { field: '"achados_adicionais"', label: "observações" },
];

export async function runRendererExtraction(args: {
  categoryCode: string;
  rawInput: string;
  signal?: AbortSignal;
  /** UX: streama a extração e emite "achado" por campo que aparece (flag). */
  stream?: boolean;
  onProgress?: (e: { stage: "achado"; label: string }) => void;
}): Promise<RendererExtractionResult> {
  const extractor = EXTRACTORS[args.categoryCode];
  if (!extractor) {
    throw new Error(
      `renderer extraction: categoria sem schema registrado: ${args.categoryCode}`,
    );
  }
  const t0 = Date.now();
  const e = env();
  // Boletim 2026-06-30: normaliza garble de ASR clínico inequívoco ANTES da
  // extração (flag ASR_CLINICAL) — o LLM não ecoa/perde o dado. OFF = intocado.
  const rawInput =
    e.ASR_CLINICAL === "true"
      ? normalizeAsrClinical(args.rawInput, args.categoryCode)
      : args.rawInput;
  const base = {
    model: e.OPENAI_MODEL_STRUCTURER,
    temperature: 0.0,
    max_tokens: 8000,
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: extractor.schemaName,
        strict: true,
        schema: extractor.jsonSchema,
      },
    },
    messages: [
      { role: "system" as const, content: extractor.prompt },
      { role: "user" as const, content: `Ditado do médico:\n${rawInput}` },
    ],
  };

  let raw: string | undefined;
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  if (args.stream) {
    // STREAMING: acumula deltas, dispara milestones, parseia o JSON completo no
    // fim (resultado idêntico ao não-streaming, temp 0).
    const s = await openai().chat.completions.create(
      { ...base, stream: true, stream_options: { include_usage: true } },
      { signal: args.signal },
    );
    let acc = "";
    const seen = new Set<string>();
    for await (const chunk of s) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        acc += delta;
        for (const m of PROGRESS_MILESTONES) {
          if (!seen.has(m.label) && acc.includes(m.field)) {
            seen.add(m.label);
            args.onProgress?.({ stage: "achado", label: m.label });
          }
        }
      }
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens;
        outputTokens = chunk.usage.completion_tokens;
      }
    }
    raw = acc;
  } else {
    const res = await openai().chat.completions.create(base, { signal: args.signal });
    raw = res.choices[0]?.message?.content ?? undefined;
    inputTokens = res.usage?.prompt_tokens;
    outputTokens = res.usage?.completion_tokens;
  }

  if (!raw) throw new Error("renderer extraction: resposta vazia");
  const findings = extractor.parse(JSON.parse(raw));

  return { findings, latencyMs: Date.now() - t0, inputTokens, outputTokens };
}
