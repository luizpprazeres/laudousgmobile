/**
 * MUSCULOESQUELETICO_V2 — renderer determinístico (fase 3b).
 *
 * Estratégia híbrida (decisão Luiz/Dr. Domingos): o CÓDIGO monta a parte
 * determinística por construção — título, técnica fixa, cobertura de TODAS as
 * estruturas do roteiro do segmento (normais com frase canônica), fechamento de
 * normalidade e o FORMATO (uma linha por item, linha em branco só entre seções,
 * multi-laudo). O LLM (extração) só fornece as ALTERAÇÕES, preservando a redação
 * do médico: para cada estrutura alterada, a descrição morfológica (corpo) e o
 * diagnóstico (conclusão).
 *
 * Garante por construção o que o writer não entregava de forma consistente:
 * cobertura completa, corpo≠conclusão, segmento normal descrito no corpo,
 * nomenclatura e espaçamento.
 */
import { z } from "zod";

// ───────────────────────── Schema de extração ─────────────────────────

export const SEGMENTOS = [
  "ombro",
  "joelho",
  "pe",
  "mao",
  "punho",
  "cotovelo",
  "tornozelo",
  "quadril",
] as const;
export type Segmento = (typeof SEGMENTOS)[number];

export const MusculoesqueleticoAlteracaoSchema = z.object({
  /** Chave da estrutura do roteiro afetada (ver ROTEIRO). Se não casar com o
   *  roteiro, a alteração entra como linha adicional no corpo. */
  estrutura: z.string(),
  /** Descrição morfológica para o CORPO (preservar a redação do médico). */
  descricao_corpo: z.string(),
  /** Diagnóstico sintético para a CONCLUSÃO. */
  diagnostico_conclusao: z.string(),
});

export const MusculoesqueleticoLaudoSchema = z.object({
  segmento: z.enum(SEGMENTOS),
  lado: z.enum(["direito", "esquerdo"]),
  alteracoes: z.array(MusculoesqueleticoAlteracaoSchema),
});

export const MusculoesqueleticoFindingsSchema = z.object({
  laudos: z.array(MusculoesqueleticoLaudoSchema),
});
export type MusculoesqueleticoFindings = z.infer<
  typeof MusculoesqueleticoFindingsSchema
>;

// ───────────────────────── Roteiro determinístico ─────────────────────────

type EstruturaRoteiro = { chave: string; normal: string };
type SegmentoRoteiro = {
  titulo: string; // "DO OMBRO", "DO JOELHO", "DA MÃO"...
  estruturas: EstruturaRoteiro[];
  fechamentoNormal: (lado: string) => string;
};

const TECNICA =
  "Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";

export const ROTEIRO: Record<Segmento, SegmentoRoteiro> = {
  ombro: {
    titulo: "DO OMBRO",
    estruturas: [
      { chave: "supraespinhal", normal: "Tendão supraespinhal de espessura, continuidade e ecotextura preservadas." },
      { chave: "infraespinhal", normal: "Tendão infraespinhal de espessura, continuidade e ecotextura preservadas." },
      { chave: "subescapular", normal: "Tendão subescapular de espessura, continuidade e ecotextura preservadas." },
      { chave: "biceps", normal: "Cabo longo do bíceps tópico, de espessura e ecotextura preservadas." },
      { chave: "bursa", normal: "Bursa subacromial-subdeltoidea sem distensão." },
      { chave: "acromioclavicular", normal: "Articulação acromioclavicular de aspecto preservado." },
      { chave: "derrame", normal: "Não há sinais de derrame articular significativo." },
    ],
    fechamentoNormal: (l) => `Ombro ${l} sem alterações ecográficas relevantes.`,
  },
  joelho: {
    titulo: "DO JOELHO",
    estruturas: [
      { chave: "quadricipital", normal: "Tendão quadricipital de espessura, continuidade e ecotextura preservadas." },
      { chave: "patelar", normal: "Tendão patelar de espessura, continuidade e ecotextura preservadas." },
      { chave: "pata_de_ganso", normal: "Tendões da pata de ganso de espessura e ecotextura preservadas." },
      { chave: "derrame", normal: "Ausência de derrame articular significativo." },
      { chave: "baker", normal: "Fossa poplítea sem coleções ou cisto de Baker." },
      { chave: "partes_moles", normal: "Planos musculares e subcutâneos avaliados sem alterações relevantes." },
    ],
    fechamentoNormal: (l) => `Joelho ${l} ecograficamente normal.`,
  },
  pe: {
    titulo: "DO PÉ",
    estruturas: [
      { chave: "fascia_plantar", normal: "Fáscia plantar com espessura e ecotextura preservadas." },
      { chave: "tendoes", normal: "Estruturas tendíneas avaliadas com espessura, continuidade e ecotextura preservadas." },
      { chave: "geral", normal: "Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado." },
    ],
    fechamentoNormal: (l) => `Pé ${l} ecograficamente normal.`,
  },
  mao: {
    titulo: "DA MÃO",
    estruturas: [
      { chave: "flexores_extensores", normal: "Tendões flexores e extensores dos quirodáctilos com espessura, continuidade e ecotextura preservadas." },
      { chave: "polias", normal: "Polias digitais sem espessamento sinovial." },
      { chave: "geral", normal: "Não foram evidenciadas coleções, lesões expansivas ou roturas tendíneas no segmento avaliado." },
    ],
    fechamentoNormal: (l) => `Mão ${l} ecograficamente normal.`,
  },
  punho: {
    titulo: "DO PUNHO",
    estruturas: [
      { chave: "flexores", normal: "Tendões flexores e retináculo dos flexores de aspecto preservado." },
      { chave: "extensores", normal: "Compartimentos extensores de aspecto preservado." },
      { chave: "nervo_mediano", normal: "Nervo mediano de calibre e ecotextura preservados ao nível do túnel do carpo." },
      { chave: "geral", normal: "Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado." },
    ],
    fechamentoNormal: (l) => `Punho ${l} ecograficamente normal.`,
  },
  cotovelo: {
    titulo: "DO COTOVELO",
    estruturas: [
      { chave: "extensores", normal: "Tendões extensores comuns (epicôndilo lateral) de espessura e ecotextura preservadas." },
      { chave: "flexores", normal: "Tendões flexores comuns (epicôndilo medial) de espessura e ecotextura preservadas." },
      { chave: "biceps_triceps", normal: "Tendões distais do bíceps e do tríceps de aspecto preservado." },
      { chave: "derrame", normal: "Ausência de derrame articular ou coleções." },
    ],
    fechamentoNormal: (l) => `Cotovelo ${l} ecograficamente normal.`,
  },
  tornozelo: {
    titulo: "DO TORNOZELO",
    estruturas: [
      { chave: "aquiles", normal: "Tendão calcâneo (de Aquiles) de espessura, continuidade e ecotextura preservadas." },
      { chave: "tibial_posterior", normal: "Tendão tibial posterior de espessura e ecotextura preservadas." },
      { chave: "fibulares", normal: "Tendões fibulares de espessura e ecotextura preservadas." },
      { chave: "tibial_anterior", normal: "Tendão tibial anterior de espessura e ecotextura preservadas." },
      { chave: "recesso", normal: "Recesso articular tibiotalar sem coleções ou derrame." },
      { chave: "geral", normal: "Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado." },
    ],
    fechamentoNormal: (l) => `Tornozelo ${l} ecograficamente normal.`,
  },
  quadril: {
    titulo: "DO QUADRIL",
    estruturas: [
      { chave: "coxofemoral", normal: "Articulação coxofemoral sem derrame ou coleções." },
      { chave: "gluteos", normal: "Tendões glúteo médio e mínimo de espessura e ecotextura preservadas." },
      { chave: "bursa_trocanterica", normal: "Bursa trocantérica sem distensão." },
      { chave: "iliopsoas", normal: "Tendão iliopsoas de aspecto preservado." },
    ],
    fechamentoNormal: (l) => `Quadril ${l} ecograficamente normal.`,
  },
};

/** Segmentos já cobertos pelo renderer determinístico (têm roteiro). */
export function temRoteiro(seg: Segmento): boolean {
  return ROTEIRO[seg].estruturas.length > 0;
}

// ───────────────────────── Montagem ─────────────────────────

const ladoFmt = (l: string) => (l === "direito" ? "direito" : "esquerdo");

/**
 * Normaliza nomenclatura MSK por construção (determinístico) — corrige os erros
 * que o LLM comete nas descrições/diagnósticos das alterações:
 *  - polias: "polia a 2" / "polia a2" / "polia A 2" → "polia A2";
 *  - "quirodáctilo" sempre minúsculo (exceto início de frase).
 */
export function normalizeNomenclatura(s: string): string {
  return s
    .replace(/\bpolias?\s+a\s*(\d)/gi, (_m, n) => `polia A${n}`)
    .replace(/(\S\s)(Quirod[áa]ctilos?)/g, (_m, pre, w) => `${pre}${w.toLowerCase()}`)
    // Dr. Domingos: nunca "artrose" isolada (preserva "Rizartrose", termo válido).
    .replace(/\bartrose\b/gi, "alterações degenerativas");
}

function renderLaudo(laudo: MusculoesqueleticoFindings["laudos"][number]): string {
  const rot = ROTEIRO[laudo.segmento];
  const lado = ladoFmt(laudo.lado);
  const titulo = `ULTRASSONOGRAFIA ${rot.titulo} ${lado.toUpperCase()}`;

  // Indexa alterações por chave de estrutura.
  const porChave = new Map<string, string>(); // chave -> descricao_corpo
  const extras: string[] = []; // alterações sem chave no roteiro
  for (const a of laudo.alteracoes) {
    const desc = normalizeNomenclatura(a.descricao_corpo);
    if (rot.estruturas.some((e) => e.chave === a.estrutura)) porChave.set(a.estrutura, desc);
    else extras.push(desc);
  }

  // CORPO: cada estrutura do roteiro (alterada → descrição; normal → frase canônica).
  const corpo: string[] = [];
  for (const e of rot.estruturas) {
    corpo.push(porChave.get(e.chave) ?? e.normal);
  }
  corpo.push(...extras);

  // CONCLUSÃO: diagnósticos das alterações; se nenhuma, fechamento de normalidade.
  let conclusao: string;
  if (laudo.alteracoes.length === 0) {
    conclusao = rot.fechamentoNormal(lado);
  } else if (laudo.alteracoes.length === 1) {
    conclusao = normalizeNomenclatura(laudo.alteracoes[0]!.diagnostico_conclusao);
  } else {
    conclusao = laudo.alteracoes
      .map((a, i) => `${i + 1}) ${normalizeNomenclatura(a.diagnostico_conclusao)}`)
      .join("\n");
  }

  return [
    titulo,
    "",
    "COMENTÁRIOS:",
    TECNICA,
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    ...corpo,
    "",
    "CONCLUSÃO:",
    conclusao,
  ].join("\n");
}

export function renderMusculoesqueletico(
  findings: MusculoesqueleticoFindings,
): string {
  return findings.laudos.map(renderLaudo).join("\n\n");
}

// ───────────────────────── Extração (LLM) ─────────────────────────

export const MUSCULOESQUELETICO_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["laudos"],
  properties: {
    laudos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["segmento", "lado", "alteracoes"],
        properties: {
          segmento: { type: "string", enum: [...SEGMENTOS] },
          lado: { type: "string", enum: ["direito", "esquerdo"] },
          alteracoes: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["estrutura", "descricao_corpo", "diagnostico_conclusao"],
              properties: {
                estrutura: { type: "string" },
                descricao_corpo: { type: "string" },
                diagnostico_conclusao: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

const CHAVES_POR_SEGMENTO = SEGMENTOS.filter(temRoteiro)
  .map((s) => `  - ${s}: ${ROTEIRO[s].estruturas.map((e) => e.chave).join(", ")}`)
  .join("\n");

export const MUSCULOESQUELETICO_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA MUSCULOESQUELÉTICA.
Organize o ditado no JSON tipado. NÃO redija o laudo nem as estruturas normais — o
CÓDIGO monta a técnica, as estruturas normais do roteiro, o fechamento e o formato.
Sua única função é separar os exames em laudos por segmento/lado e EXTRAIR as
ALTERAÇÕES (só o que está anormal), preservando a redação do médico.

REGRAS:
1. Um item em "laudos" para CADA segmento+lado examinado (é comum vários no mesmo
   exame: ombro direito, ombro esquerdo, mão, pé...). segmento ∈ ${SEGMENTOS.join(", ")}.
   lado ∈ direito | esquerdo.
2. Em "alteracoes" liste APENAS as estruturas ANORMAIS do segmento. Estrutura NORMAL
   NÃO entra (o código preenche a frase de normalidade). Se o segmento está todo
   normal, "alteracoes" é [] (lista vazia).
3. Para cada alteração:
   - estrutura: a CHAVE da estrutura do roteiro (lista abaixo). Use a chave exata.
     Se a estrutura alterada não estiver no roteiro do segmento, use uma chave
     descritiva curta (entrará como linha extra no corpo).
   - descricao_corpo: a descrição MORFOLÓGICA para o corpo (o que foi visto),
     preservando os termos/medidas do médico. NUNCA o diagnóstico ("Tendinopatia").
   - diagnostico_conclusao: o diagnóstico sintético para a conclusão (ex.:
     "Tendinopatia do tendão supraespinhal à direita.").
4. NÃO invente alterações. NÃO converta normalidade em alteração. Preserve medidas,
   lateralidade e nomenclatura (polias A1, A2, A3; "quirodáctilo").
5. NUNCA use a palavra "artrose". Para alterações degenerativas da articulação
   acromioclavicular: corpo = "irregularidade cortical e osteófitos marginais";
   conclusão = "Alterações degenerativas da articulação acromioclavicular".

CHAVES DE ESTRUTURA POR SEGMENTO (use a chave exata em "estrutura"):
${CHAVES_POR_SEGMENTO}`;

export function parseMusculoesqueletico(raw: unknown): MusculoesqueleticoFindings {
  return MusculoesqueleticoFindingsSchema.parse(raw);
}
