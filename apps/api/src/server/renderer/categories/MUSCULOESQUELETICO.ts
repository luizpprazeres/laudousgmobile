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
 *
 * BIBLIOTECA DE MORFOLOGIA CANÔNICA (2026-07-01): em MSK o médico MUITO comumente
 * dita SÓ o diagnóstico ("tendinopatia da pata de ganso", "fasciite plantar") sem
 * descrever a morfologia. Antes, o LLM ecoava o diagnóstico no CORPO (defeito de
 * raiz — corpo≠conclusão violado no conteúdo). Agora, quando o médico não descreve
 * a morfologia (`descricao_livre` = null), o código injeta a descrição ECOGRÁFICA
 * canônica do achado (`ACHADOS_CANONICOS`). Quando descreve, preserva a redação.
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
  /** Chave da estrutura do roteiro afetada (ver ROTEIRO). Define a POSIÇÃO da
   *  linha no corpo. Se não casar com o roteiro, entra como linha adicional. */
  estrutura: z.string(),
  /** Slug do achado na biblioteca de morfologia canônica (ACHADOS_CANONICOS).
   *  Quando o médico dita SÓ o diagnóstico (descricao_livre = null), o código usa
   *  a descrição canônica deste achado no corpo. Use "outro" se não houver. */
  achado_tipo: z.string(),
  /** Morfologia DITADA pelo médico para o CORPO (preservar a redação). `null`
   *  quando ele ditou só o diagnóstico — aí o corpo vem de ACHADOS_CANONICOS. */
  descricao_livre: z.string().nullable(),
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

type Alteracao = MusculoesqueleticoFindings["laudos"][number]["alteracoes"][number];

// ───────────── Biblioteca de morfologia canônica (diagnóstico → corpo) ─────────────

type AchadoCanonico = {
  /** Descrição ECOGRÁFICA para o CORPO. MEASUREMENT-FREE e sem afirmar
   *  manobra/achado associado NÃO ditado (review dex1: não asseverar o que o
   *  médico não descreveu). Só morfologia qualitativa inerente ao diagnóstico. */
  corpo: string;
  /** Diagnóstico base para a CONCLUSÃO (sem lateralidade; fallback se o LLM não
   *  fornecer `diagnostico_conclusao`). */
  conclusao: string;
  /** Segmentos onde este achado é válido (guard de compatibilidade). */
  segmentos: Segmento[];
  /** Chaves de estrutura do roteiro onde é válido. Vazio = só checa segmento
   *  (achados que entram como linha extra, sem chave de roteiro). */
  estruturas?: string[];
};

/**
 * Semente curada (~18 achados MSK mais ditados). Cresce por telemetria de
 * `achado_tipo` desconhecido. Curadoria revisada pelo Dr. Domingos/Dr. Luiz.
 * NUNCA medida/manobra/achado associado inventado (só morfologia qualitativa).
 */
export const ACHADOS_CANONICOS: Readonly<Record<string, AchadoCanonico>> = {
  // Joelho
  tendinopatia_pata_de_ganso: {
    corpo: "Tendões da pata de ganso (grácil, sartório e semitendíneo) com espessamento e redução difusa da ecogenicidade, com perda do padrão fibrilar, junto à inserção na face medial da tíbia proximal.",
    conclusao: "Tendinopatia da pata de ganso",
    segmentos: ["joelho"], estruturas: ["pata_de_ganso"],
  },
  bursite_anserina: {
    corpo: "Distensão da bursa anserina, com conteúdo líquido, junto à inserção da pata de ganso.",
    conclusao: "Bursite anserina",
    segmentos: ["joelho"], estruturas: ["pata_de_ganso"],
  },
  tendinopatia_patelar: {
    corpo: "Tendão patelar com espessamento e áreas de redução da ecogenicidade, com perda do padrão fibrilar, mais evidente na sua origem no polo inferior da patela.",
    conclusao: "Tendinopatia patelar",
    segmentos: ["joelho"], estruturas: ["patelar"],
  },
  tendinopatia_quadricipital: {
    corpo: "Tendão quadricipital com espessamento e heterogeneidade ecotextural, com perda do padrão fibrilar, junto à inserção no polo superior da patela.",
    conclusao: "Tendinopatia quadricipital",
    segmentos: ["joelho"], estruturas: ["quadricipital"],
  },
  cisto_de_baker: {
    corpo: "Formação cística anecoica na fossa poplítea, na topografia da bursa gastrocnêmio-semimembranosa, de contornos definidos (cisto de Baker).",
    conclusao: "Cisto de Baker",
    segmentos: ["joelho"], estruturas: ["baker"],
  },
  // Pé / tornozelo
  fasciite_plantar: {
    corpo: "Fáscia plantar espessada na sua origem calcânea, com redução da ecogenicidade e perda do padrão fibrilar habitual.",
    conclusao: "Fasciite plantar",
    segmentos: ["pe"], estruturas: ["fascia_plantar"],
  },
  neuroma_de_morton: {
    corpo: "Formação nodular hipoecoica no espaço intermetatarsal, compatível com neuroma de Morton.",
    conclusao: "Neuroma de Morton",
    segmentos: ["pe"],
  },
  tendinopatia_aquileu: {
    corpo: "Tendão calcâneo (de Aquiles) com espessamento fusiforme e áreas de redução da ecogenicidade, com perda do padrão fibrilar.",
    conclusao: "Tendinopatia do tendão calcâneo (Aquiles)",
    segmentos: ["tornozelo"], estruturas: ["aquiles"],
  },
  // Ombro
  tendinopatia_supraespinhal: {
    corpo: "Tendão supraespinhal com espessamento e heterogeneidade ecotextural, sem solução de continuidade evidente.",
    conclusao: "Tendinopatia do supraespinhal",
    segmentos: ["ombro"], estruturas: ["supraespinhal"],
  },
  ruptura_parcial_supraespinhal: {
    corpo: "Tendão supraespinhal com afilamento e foco de solução de continuidade das fibras, compatível com ruptura parcial.",
    conclusao: "Ruptura parcial do supraespinhal",
    segmentos: ["ombro"], estruturas: ["supraespinhal"],
  },
  bursite_subacromial: {
    corpo: "Distensão e espessamento da bursa subacromial-subdeltoidea, com conteúdo líquido.",
    conclusao: "Bursite subacromial-subdeltoidea",
    segmentos: ["ombro"], estruturas: ["bursa"],
  },
  tendinopatia_cabo_longo_biceps: {
    corpo: "Cabo longo do bíceps com espessamento e heterogeneidade ecotextural, tópico.",
    conclusao: "Tendinopatia do cabo longo do bíceps",
    segmentos: ["ombro"], estruturas: ["biceps"],
  },
  // Cotovelo
  epicondilite_lateral: {
    corpo: "Tendão extensor comum (epicôndilo lateral) com espessamento e redução da ecogenicidade, com perda do padrão fibrilar.",
    conclusao: "Epicondilite lateral",
    segmentos: ["cotovelo"], estruturas: ["extensores"],
  },
  epicondilite_medial: {
    corpo: "Tendão flexor comum (epicôndilo medial) com espessamento e redução da ecogenicidade, com perda do padrão fibrilar.",
    conclusao: "Epicondilite medial",
    segmentos: ["cotovelo"], estruturas: ["flexores"],
  },
  // Punho / mão
  tenossinovite_de_quervain: {
    corpo: "Espessamento sinovial e halo hipoecoico ao redor dos tendões do primeiro compartimento extensor (abdutor longo e extensor curto do polegar).",
    conclusao: "Tenossinovite de De Quervain",
    segmentos: ["punho"], estruturas: ["extensores"],
  },
  dedo_em_gatilho: {
    corpo: "Espessamento da polia A1 com tenossinovite dos tendões flexores.",
    conclusao: "Dedo em gatilho (tenossinovite da polia A1)",
    segmentos: ["mao"], estruturas: ["polias"],
  },
  cisto_sinovial: {
    corpo: "Formação cística anecoica de contornos definidos, compatível com cisto sinovial (gânglio).",
    conclusao: "Cisto sinovial (gânglio)",
    segmentos: ["punho", "mao"],
  },
  sindrome_tunel_carpo: {
    corpo: "Nervo mediano com aumento da área de secção transversa na entrada do túnel do carpo.",
    conclusao: "Síndrome do túnel do carpo",
    segmentos: ["punho"], estruturas: ["nervo_mediano"],
  },
  // Quadril
  bursite_trocanterica: {
    corpo: "Distensão da bursa trocantérica, com conteúdo líquido.",
    conclusao: "Bursite trocantérica",
    segmentos: ["quadril"], estruturas: ["bursa_trocanterica"],
  },
};

/** Slugs canônicos + "outro" — usado no enum do schema de extração. */
export const ACHADO_TIPOS = [...Object.keys(ACHADOS_CANONICOS), "outro"] as const;

/** Frase neutra quando não há morfologia ditada nem canônico compatível — NUNCA
 *  ecoa o diagnóstico no corpo nem injeta morfologia possivelmente errada. */
const FRASE_NEUTRA_ALTERACAO =
  "Alteração ecográfica na topografia avaliada, detalhada na conclusão.";

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

/**
 * Achado canônico SÓ se for compatível com o segmento/estrutura da alteração
 * (guard determinístico, review dex1): se o LLM mapear um slug que não bate com a
 * estrutura (ex.: `pata_de_ganso` + `tendinopatia_patelar`), NÃO injeta a
 * morfologia — evita descrever a estrutura errada no corpo.
 */
function canonCompativel(a: Alteracao, segmento: Segmento): AchadoCanonico | undefined {
  const c = ACHADOS_CANONICOS[a.achado_tipo];
  if (!c) return undefined;
  if (!c.segmentos.includes(segmento)) return undefined;
  if (c.estruturas && c.estruturas.length > 0 && !c.estruturas.includes(a.estrutura)) {
    return undefined;
  }
  return c;
}

/**
 * Descrição do CORPO para uma alteração:
 *  1. morfologia DITADA pelo médico (`descricao_livre`) → preserva a redação;
 *  2. senão, morfologia CANÔNICA COMPATÍVEL (`canonCompativel`) — evita ecoar o
 *     diagnóstico no corpo quando o médico dita só-diagnóstico;
 *  3. fallback (sem morfologia e sem canônico compatível): frase NEUTRA — nunca
 *     ecoa o diagnóstico nem injeta morfologia possivelmente errada.
 */
function corpoDaAlteracao(a: Alteracao, segmento: Segmento): string {
  const livre = a.descricao_livre?.trim();
  if (livre) return normalizeNomenclatura(livre);
  const canon = canonCompativel(a, segmento);
  if (canon) return canon.corpo;
  return FRASE_NEUTRA_ALTERACAO;
}

/** Diagnóstico da CONCLUSÃO: o do LLM, ou o canônico como fallback. */
function conclusaoDaAlteracao(a: Alteracao): string {
  const diag = a.diagnostico_conclusao?.trim();
  if (diag) return normalizeNomenclatura(diag);
  return ACHADOS_CANONICOS[a.achado_tipo]?.conclusao ?? "";
}

function renderLaudo(laudo: MusculoesqueleticoFindings["laudos"][number]): string {
  const rot = ROTEIRO[laudo.segmento];
  const lado = ladoFmt(laudo.lado);
  const titulo = `ULTRASSONOGRAFIA ${rot.titulo} ${lado.toUpperCase()}`;

  // Indexa alterações por chave de estrutura.
  const porChave = new Map<string, string>(); // chave -> descricao do corpo
  const extras: string[] = []; // alterações sem chave no roteiro
  for (const a of laudo.alteracoes) {
    const desc = corpoDaAlteracao(a, laudo.segmento);
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
    conclusao = conclusaoDaAlteracao(laudo.alteracoes[0]!);
  } else {
    conclusao = laudo.alteracoes
      .map((a, i) => `${i + 1}) ${conclusaoDaAlteracao(a)}`)
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
              required: ["estrutura", "achado_tipo", "descricao_livre", "diagnostico_conclusao"],
              properties: {
                estrutura: { type: "string" },
                achado_tipo: { type: "string", enum: [...ACHADO_TIPOS] },
                descricao_livre: { type: ["string", "null"] },
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

const ACHADOS_TIPOS = Object.keys(ACHADOS_CANONICOS).join(", ");

export const MUSCULOESQUELETICO_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA MUSCULOESQUELÉTICA.
Organize o ditado no JSON tipado. NÃO redija o laudo nem as estruturas normais — o
CÓDIGO monta a técnica, as estruturas normais do roteiro, o fechamento, o formato e a
DESCRIÇÃO CANÔNICA do corpo quando o médico não a dita.
Sua função é separar os exames em laudos por segmento/lado e EXTRAIR as ALTERAÇÕES.

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
   - achado_tipo: o SLUG do achado na biblioteca canônica (lista abaixo) que melhor
     corresponde ao diagnóstico. Use "outro" se nenhum corresponder.
   - descricao_livre: a morfologia que o médico DESCREVEU (o que foi visto: espessura,
     ecogenicidade, medidas, características), preservando os termos dele. Se o médico
     ditou APENAS o diagnóstico (ex.: "tendinopatia da pata de ganso") SEM descrever a
     morfologia, use null — o código preenche a descrição canônica. NUNCA copie o
     diagnóstico para descricao_livre.
   - diagnostico_conclusao: o diagnóstico sintético para a conclusão, com lateralidade
     (ex.: "Tendinopatia da pata de ganso à direita.").
4. NÃO invente alterações. NÃO converta normalidade em alteração. Preserve medidas,
   lateralidade e nomenclatura (polias A1, A2, A3; "quirodáctilo").
5. NUNCA use a palavra "artrose". Para alterações degenerativas da articulação
   acromioclavicular: descricao_livre = "irregularidade cortical e osteófitos
   marginais"; conclusão = "Alterações degenerativas da articulação acromioclavicular".

EXEMPLOS (ditado só-diagnóstico → descricao_livre = null):
- "joelho direito com tendinopatia da pata de ganso" →
  { segmento: "joelho", lado: "direito", alteracoes: [{ estrutura: "pata_de_ganso",
    achado_tipo: "tendinopatia_pata_de_ganso", descricao_livre: null,
    diagnostico_conclusao: "Tendinopatia da pata de ganso à direita." }] }
- "pé esquerdo com fasciite plantar" →
  { segmento: "pe", lado: "esquerdo", alteracoes: [{ estrutura: "fascia_plantar",
    achado_tipo: "fasciite_plantar", descricao_livre: null,
    diagnostico_conclusao: "Fasciite plantar à esquerda." }] }

CHAVES DE ESTRUTURA POR SEGMENTO (use a chave exata em "estrutura"):
${CHAVES_POR_SEGMENTO}

SLUGS DE ACHADO CANÔNICO (use em "achado_tipo", ou "outro"):
${ACHADOS_TIPOS}`;

export function parseMusculoesqueletico(raw: unknown): MusculoesqueleticoFindings {
  return MusculoesqueleticoFindingsSchema.parse(raw);
}
