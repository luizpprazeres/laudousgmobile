import { env } from "../env";
import { openai } from "../ai/openai";
import {
  runRendererExtraction,
  type RendererExtractionResult,
} from "../renderer/extraction";
import {
  ABDOMEN_ORGAN_KEYS,
  type AbdomenFinding,
  type AbdomenOrganKey,
} from "../renderer/findingsSchemas/ABDOMEN_TOTAL";
import {
  renderOrgan,
  renderExtraAbdominal,
  CONCLUSAO_TODOS_NORMAIS,
  CONCLUSAO_FECHAMENTO,
} from "../renderer/phrases/ABDOMEN_TOTAL";
import {
  renderObstetrica,
  type ObstetricaFindings,
} from "../renderer/categories/OBSTETRICA";
import {
  renderMorfologico,
  type MorfologicoFindings,
} from "../renderer/categories/MORFOLOGICO";
import {
  renderTireoide,
  type TireoideFindings,
  type TireoidePreferences,
} from "../renderer/categories/TIREOIDE";
import {
  renderMamaria,
  type MamariaFindings,
} from "../renderer/categories/MAMARIA";

/**
 * DET-5 — RENDERER: máscara (template_body com slots) + achados tipados →
 * laudo com estrutura garantida POR CONSTRUÇÃO. O LLM:
 * - extrai dados (extraction.ts, temp 0, schema strict da categoria);
 * - redige SÓ frases de achados fora do catálogo ("outro"), dentro de slot
 *   delimitado — nunca cabeçalhos, ordem ou numeração.
 *
 * Interface idêntica ao runWriterStream: AsyncGenerator que YIELDa texto e
 * retorna métricas — o route troca a função sem mudar o SSE.
 *
 * Sintaxe do template_body:
 *   {{orgao:<chave>|<linha(s) normal default>}}
 *   {{extra_abdominais}}
 *   {{conclusao}}
 */

export const RENDERER_VERSION = "renderer/v1";

/** Toggles do renderer (estrutural; cada categoria usa só as chaves que entende). */
export type RendererPreferences = {
  show_domingos_score?: boolean;
  show_conduct_recommendation?: boolean;
};

const ORGAN_SLOT_RE = /\{\{orgao:([a-z_]+)\|([\s\S]*?)\}\}/g;

type FreeSlotItem = {
  organ: string;
  finding: AbdomenFinding;
};

type FreeSlotRendered = { corpo: string; conclusao: string | null };

const FREE_SLOT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["itens"],
  properties: {
    itens: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["corpo", "conclusao"],
        properties: {
          corpo: { type: "string" },
          conclusao: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

/**
 * LLM secundário: redige UMA frase de corpo (e opcionalmente um item de
 * conclusão) por achado fora do catálogo. Temp 0; entrada mínima; proibido
 * inventar medidas/diagnósticos.
 */
async function renderFreeSlots(
  items: FreeSlotItem[],
  signal?: AbortSignal,
): Promise<{ rendered: FreeSlotRendered[]; inputTokens: number; outputTokens: number }> {
  if (items.length === 0)
    return { rendered: [], inputTokens: 0, outputTokens: 0 };
  const e = env();
  const lista = items
    .map(
      (it, i) =>
        `${i + 1}. estrutura: ${it.organ}; dados: ${JSON.stringify(it.finding)}`,
    )
    .join("\n");
  const res = await openai().chat.completions.create(
    {
      model: e.OPENAI_MODEL_WRITER,
      temperature: 0.0,
      max_tokens: 2000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "FreeSlots",
          strict: true,
          schema: FREE_SLOT_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Você redige FRASES ISOLADAS de laudo de ultrassonografia abdominal, em português médico formal.\n" +
            "Para cada achado da lista, devolva: corpo = UMA frase descritiva para o corpo do laudo; " +
            "conclusao = item curto de conclusão diagnóstica, ou null se o achado não merece conclusão própria.\n" +
            "REGRAS: use SOMENTE os dados fornecidos (descricao_livre são as palavras do médico). " +
            "NUNCA invente medidas, graus ou diagnósticos. Medida ausente → use ____. " +
            "Sem cabeçalhos, sem numeração, sem markdown. Uma entrada de saída por achado, na MESMA ordem.",
        },
        { role: "user", content: lista },
      ],
    },
    { signal },
  );
  const raw = res.choices[0]?.message?.content;
  if (!raw) throw new Error("renderer free-slot: resposta vazia");
  const parsed = JSON.parse(raw) as { itens: FreeSlotRendered[] };
  if (!Array.isArray(parsed.itens) || parsed.itens.length !== items.length) {
    throw new Error(
      `renderer free-slot: esperado ${items.length} itens, veio ${parsed.itens?.length ?? 0}`,
    );
  }
  return {
    rendered: parsed.itens,
    inputTokens: res.usage?.prompt_tokens ?? 0,
    outputTokens: res.usage?.completion_tokens ?? 0,
  };
}

export type RendererStreamResult = {
  fullText: string;
  latencyMs: number;
  systemMessage: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  extraction: RendererExtractionResult;
  freeSlotCount: number;
};

export async function* runRendererStream(args: {
  categoryCode: string;
  rawInput: string;
  templateBody: string;
  signal?: AbortSignal;
  onSystemMessage?: (message: string) => void;
  /** DET-5 ONDA 2 — toggles do renderer da conta (TIREOIDE: Domingos; MAMARIA:
   * conduta). Tipo comum (estrutural) por categoria — review dex2 #9. */
  rendererPreferences?: RendererPreferences | null;
}): AsyncGenerator<string, RendererStreamResult, void> {
  const t0 = Date.now();

  // 1. Extração tipada (única chamada LLM obrigatória do caminho).
  const extraction = await runRendererExtraction({
    categoryCode: args.categoryCode,
    rawInput: args.rawInput,
    signal: args.signal,
  });

  // Categorias com render programático auto-contido (sem slots de órgão nem
  // free-slot LLM) — laudo 100% determinístico a partir dos achados tipados.
  if (
    args.categoryCode === "OBSTETRICA" ||
    args.categoryCode === "MORFOLOGICO" ||
    args.categoryCode === "TIREOIDE" ||
    args.categoryCode === "MAMARIA"
  ) {
    const fullText =
      args.categoryCode === "OBSTETRICA"
        ? renderObstetrica(extraction.findings as ObstetricaFindings)
        : args.categoryCode === "MORFOLOGICO"
          ? renderMorfologico(extraction.findings as MorfologicoFindings)
          : args.categoryCode === "TIREOIDE"
            ? renderTireoide(
                extraction.findings as TireoideFindings,
                args.rendererPreferences,
              )
            : renderMamaria(
                extraction.findings as MamariaFindings,
                args.rendererPreferences,
              );
    const systemMessage = `[${RENDERER_VERSION}] render programático determinístico (${args.categoryCode})`;
    args.onSystemMessage?.(systemMessage);
    yield fullText;
    return {
      fullText,
      latencyMs: Date.now() - t0,
      systemMessage,
      inputTokens: extraction.inputTokens,
      outputTokens: extraction.outputTokens,
      cachedInputTokens: undefined,
      extraction,
      freeSlotCount: 0,
    };
  }

  const findings = extraction.findings as import("../renderer/findingsSchemas/ABDOMEN_TOTAL").AbdomenTotalFindings;

  // 2. Render por órgão (determinístico) + coleta de slots livres.
  const organRenders = new Map<AbdomenOrganKey, ReturnType<typeof renderOrgan>>();
  const freeItems: FreeSlotItem[] = [];
  for (const organ of ABDOMEN_ORGAN_KEYS) {
    const r = renderOrgan(organ, findings.orgaos[organ]);
    organRenders.set(organ, r);
    for (const f of r.freeSlotFindings) freeItems.push({ organ, finding: f });
  }
  const extraRenders = findings.achados_extra_abdominais.map((f) => {
    const r = renderExtraAbdominal(f);
    for (const ff of r.freeSlotFindings)
      freeItems.push({ organ: "extra_abdominal", finding: ff });
    return r;
  });

  // 3. LLM secundário só se houver achado fora do catálogo. O retorno é
  // alinhado por índice com freeItems; agrupamos POR ÓRGÃO — a ordem dos
  // slots no template pode diferir da ordem de coleta (ex: variante doppler
  // tem pâncreas antes do baço).
  const freeSlots = await renderFreeSlots(freeItems, args.signal);
  const freeByOrgan = new Map<string, FreeSlotRendered[]>();
  freeItems.forEach((item, i) => {
    const rendered = freeSlots.rendered[i];
    if (!rendered) return; // length validada em renderFreeSlots
    const list = freeByOrgan.get(item.organ) ?? [];
    list.push(rendered);
    freeByOrgan.set(item.organ, list);
  });

  // 4. Conclusão coletada NA ORDEM DOS SLOTS DO TEMPLATE (= ordem do corpo),
  // antes da substituição — itens de conclusão seguem a ordem de leitura.
  const slotOrder = [...args.templateBody.matchAll(ORGAN_SLOT_RE)].map(
    (m) => m[1] as AbdomenOrganKey,
  );
  const conclusaoItens: string[] = [];
  const organFinalText = new Map<string, string>();
  for (const organKey of slotOrder) {
    const r = organRenders.get(organKey);
    if (!r) continue;
    const free = freeByOrgan.get(organKey) ?? [];
    const freeBodies = free.map((x) => x.corpo).filter((s) => s.trim() !== "");
    conclusaoItens.push(
      ...r.conclusao,
      ...free.map((x) => x.conclusao).filter((c): c is string => !!c),
    );
    if (r.body !== null || freeBodies.length > 0) {
      organFinalText.set(
        organKey,
        [r.body, ...freeBodies].filter((s): s is string => !!s).join("\n"),
      );
    }
  }

  // Salvaguarda: órgão com achados mas SEM slot neste template (não acontece
  // nos templates do piloto, que têm os 11 órgãos) — conclusão nunca se perde;
  // o corpo vai para as linhas extras.
  const extraLines: string[] = [];
  for (const organ of ABDOMEN_ORGAN_KEYS) {
    if (slotOrder.includes(organ)) continue;
    const r = organRenders.get(organ);
    if (!r) continue;
    const free = freeByOrgan.get(organ) ?? [];
    if (r.body) extraLines.push(r.body);
    extraLines.push(
      ...free.map((x) => x.corpo).filter((s) => s.trim() !== ""),
    );
    conclusaoItens.push(
      ...r.conclusao,
      ...free.map((x) => x.conclusao).filter((c): c is string => !!c),
    );
  }

  const extraFree = freeByOrgan.get("extra_abdominal") ?? [];
  for (const r of extraRenders) {
    if (r.body) extraLines.push(r.body);
    conclusaoItens.push(...r.conclusao);
  }
  for (const x of extraFree) {
    if (x.corpo.trim() !== "") extraLines.push(x.corpo);
    if (x.conclusao) conclusaoItens.push(x.conclusao);
  }

  // 5. Conclusão por construção (regra curada de fechamento).
  const conclusao =
    conclusaoItens.length === 0
      ? `1. ${CONCLUSAO_TODOS_NORMAIS}`
      : [...conclusaoItens, CONCLUSAO_FECHAMENTO]
          .map((item, i) => `${i + 1}. ${item}`)
          .join("\n");

  // 6. Substituição em PASSO ÚNICO: conteúdo dinâmico inserido nunca é
  // re-escaneado — ditado contendo "{{conclusao}}" não causa replace duplo.
  const COMBINED_RE =
    /\{\{orgao:([a-z_]+)\|([\s\S]*?)\}\}|\{\{extra_abdominais\}\}\n?|\{\{conclusao\}\}/g;
  const body = args.templateBody.replace(
    COMBINED_RE,
    (match, organKey: string | undefined, defaultText: string | undefined) => {
      if (organKey !== undefined) {
        return organFinalText.get(organKey) ?? defaultText ?? "";
      }
      if (match.startsWith("{{extra_abdominais}}")) {
        return extraLines.length > 0 ? `${extraLines.join("\n")}\n` : "";
      }
      return conclusao;
    },
  );

  const fullText = body.trim();
  const systemMessage = `[${RENDERER_VERSION}] template+findings determinístico (${args.categoryCode})`;
  args.onSystemMessage?.(systemMessage);

  // Mantém o contrato de streaming do SSE (token único com o laudo completo —
  // o app já lida com chunks de qualquer tamanho).
  yield fullText;

  return {
    fullText,
    latencyMs: Date.now() - t0,
    systemMessage,
    inputTokens: (extraction.inputTokens ?? 0) + freeSlots.inputTokens,
    outputTokens: (extraction.outputTokens ?? 0) + freeSlots.outputTokens,
    cachedInputTokens: undefined,
    extraction,
    freeSlotCount: freeItems.length,
  };
}
