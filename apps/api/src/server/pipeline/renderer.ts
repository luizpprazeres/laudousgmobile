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
  assembleAbdomenObjetivo,
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
import { renderPartesMoles } from "../renderer/categories/PARTES_MOLES";
import { renderCervical } from "../renderer/categories/CERVICAL";
import { renderPelveFeminina, mergeMenopausaPelve, mergePelveLiquidoLivre } from "../renderer/categories/PELVE_FEMININA";
import { renderAbdomenSuperior } from "../renderer/categories/ABDOMEN_SUPERIOR";
import { renderViasUrinarias } from "../renderer/categories/VIAS_URINARIAS";
import { renderProstataSuprapubica } from "../renderer/categories/PROSTATA_SUPRAPUBICA";
import type { ProstataSuprapubicaFindings } from "../renderer/categories/PROSTATA_SUPRAPUBICA";
import {
  renderMusculoesqueletico,
  isPreformattedMskReport,
  mskPassthrough,
} from "../renderer/categories/MUSCULOESQUELETICO";
import { runMskWriterStream } from "./mskWriter";
import { runPartesMolesWriterStream } from "./partesMolesWriter";
import {
  renderDopplerObstetrico,
  mergeStructuredIg,
  type DopplerObstetricoFindings,
} from "../renderer/categories/DOPPLER_OBSTETRICO";

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

/** Writing style IDs conhecidos (fonte: writing_styles seed). */
export const WRITING_STYLE_CLASSICO_ID = "11111111-1111-4111-8111-111111111111";
export const WRITING_STYLE_OBJETIVO_ID = "44444444-4444-4444-8444-444444444444";

/** Estilo OBJETIVO (TÉCNICA/ACHADOS/IMPRESSÃO + ACR TI-RADS)? */
export function isEstiloObjetivo(writingStyleId?: string | null): boolean {
  return writingStyleId === WRITING_STYLE_OBJETIVO_ID;
}

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
  /** MSK passthrough: o texto é o laudo do médico preservado — o route deve PULAR
   *  guards que alteram conteúdo (applyDoctorCommands, COMMAND_INTERPRETER). */
  passthrough?: boolean;
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
  /** Estilo de redação (writing_style). Despacha clássico vs objetivo por
   * categoria. Atualmente só a TIREOIDE tem caminho objetivo (Sprint 1). */
  writingStyleId?: string;
  /** UX (flag RENDERER_PROGRESS): recebe os eventos de progresso da extração
   * (interpretando → achado → montando) para o route emitir via SSE. Quando
   * presente, a extração é STREAMADA. */
  onProgress?: (e: { stage: "interpretando" | "achado" | "calculando" | "montando"; label: string }) => void;
}): AsyncGenerator<string, RendererStreamResult, void> {
  const t0 = Date.now();

  // MSK passthrough (flag MSK_PASSTHROUGH): quando o input JÁ é um laudo formatado
  // (colado pronto), preserva o texto do médico em vez de regerar a partir da
  // extração — regerar perderia formatação, ordem e COMENTÁRIOS. Rota explícita
  // ANTES da extração: uma vez pelo LLM, a garantia de preservação já se perde. (dex1)
  if (
    args.categoryCode === "MUSCULOESQUELETICO_V2" &&
    env().MSK_PASSTHROUGH === "true" &&
    isPreformattedMskReport(args.rawInput)
  ) {
    const fullText = mskPassthrough(args.rawInput);
    const systemMessage = `[${RENDERER_VERSION}] MSK passthrough (input pré-formatado)`;
    args.onSystemMessage?.(systemMessage);
    yield fullText;
    return {
      fullText,
      latencyMs: Date.now() - t0,
      systemMessage,
      inputTokens: undefined,
      outputTokens: undefined,
      cachedInputTokens: undefined,
      extraction: { findings: null, latencyMs: 0 },
      freeSlotCount: 0,
      passthrough: true,
    };
  }

  // MSK writer_guarded (flag MSK_WRITER, piloto arquitetura 2 modos): MSK é categoria
  // ABERTA → o LLM ESCREVE o laudo (entende multi-segmento/garble/comandos), guiado
  // pelo roteiro da casa. Rota explícita ANTES da extração (não usa o schema rígido).
  // passthrough=true: o texto do writer é final; o route pula os mutadores de conteúdo
  // (o writer já tratou comandos). Fact-audit + rerun entram numa fatia seguinte.
  if (
    args.categoryCode === "MUSCULOESQUELETICO_V2" &&
    env().MSK_WRITER === "true"
  ) {
    args.onProgress?.({ stage: "interpretando", label: "Escrevendo o laudo…" });
    const res = yield* runMskWriterStream({
      rawInput: args.rawInput,
      signal: args.signal,
    });
    // Observabilidade (dex1): modelo, TTFT, audit pass/fail + fatos que falharam.
    const a = res.audit;
    const auditMsg = a.ok
      ? "audit=ok"
      : `audit=FAIL(medidas:${a.missingMeasures.join("/") || "-"};lados:${a.missingSides.join("/") || "-"};extra:${a.extraStructures.join("/") || "-"})`;
    const systemMessage = `[${RENDERER_VERSION}] MSK writer_guarded (${res.model}, ttft=${res.ttftMs}ms, ${res.outputTokens ?? "?"}tok, ${auditMsg})`;
    args.onSystemMessage?.(systemMessage);
    return {
      fullText: res.fullText,
      latencyMs: res.latencyMs,
      systemMessage,
      inputTokens: undefined,
      outputTokens: res.outputTokens,
      cachedInputTokens: undefined,
      extraction: { findings: null, latencyMs: 0 },
      freeSlotCount: 0,
      passthrough: true,
    };
  }

  // PARTES_MOLES writer_guarded (flag PARTES_MOLES_WRITER, 2ª categoria aberta —
  // mesma receita do MSK): lesão de qualquer tipo/topografia → o LLM ESCREVE o laudo
  // (entende garble/comandos/correções), guiado pelo roteiro da casa. Rota explícita
  // ANTES da extração (não usa o schema rígido). passthrough=true: o texto do writer
  // é final; o route pula os mutadores de conteúdo (o writer já tratou comandos).
  if (
    args.categoryCode === "PARTES_MOLES" &&
    env().PARTES_MOLES_WRITER === "true"
  ) {
    args.onProgress?.({ stage: "interpretando", label: "Escrevendo o laudo…" });
    const res = yield* runPartesMolesWriterStream({
      rawInput: args.rawInput,
      signal: args.signal,
    });
    // Observabilidade (mesma linha do MSK): modelo, TTFT, audit pass/fail + fatos.
    const a = res.audit;
    const auditMsg = a.ok
      ? "audit=ok"
      : `audit=FAIL(medidas:${a.missingMeasures.join("/") || "-"};lados:${a.missingSides.join("/") || "-"};extra:${a.extraStructures.join("/") || "-"};placeholder:${a.placeholder ? "sim" : "-"};doppler:${a.dopplerInventado ? "inventado" : "-"})`;
    const systemMessage = `[${RENDERER_VERSION}] PARTES_MOLES writer_guarded (${res.model}, ttft=${res.ttftMs}ms, ${res.outputTokens ?? "?"}tok, ${auditMsg})`;
    args.onSystemMessage?.(systemMessage);
    return {
      fullText: res.fullText,
      latencyMs: res.latencyMs,
      systemMessage,
      inputTokens: undefined,
      outputTokens: res.outputTokens,
      cachedInputTokens: undefined,
      extraction: { findings: null, latencyMs: 0 },
      freeSlotCount: 0,
      passthrough: true,
    };
  }

  // 1. Extração tipada (única chamada LLM obrigatória do caminho).
  args.onProgress?.({ stage: "interpretando", label: "Interpretando o ditado…" });
  const extraction = await runRendererExtraction({
    categoryCode: args.categoryCode,
    rawInput: args.rawInput,
    signal: args.signal,
    stream: !!args.onProgress,
    onProgress: args.onProgress,
  });
  args.onProgress?.({ stage: "montando", label: "Montando o laudo…" });

  // Categorias com render programático auto-contido (sem slots de órgão nem
  // free-slot LLM) — laudo 100% determinístico a partir dos achados tipados.
  if (
    args.categoryCode === "OBSTETRICA" ||
    args.categoryCode === "MORFOLOGICO" ||
    args.categoryCode === "TIREOIDE" ||
    args.categoryCode === "MAMARIA" ||
    args.categoryCode === "PARTES_MOLES" ||
    args.categoryCode === "CERVICAL" ||
    args.categoryCode === "PELVE_FEMININA" ||
    args.categoryCode === "ABDOMEN_SUPERIOR" ||
    args.categoryCode === "VIAS_URINARIAS" ||
    args.categoryCode === "MUSCULOESQUELETICO_V2" ||
    args.categoryCode === "PROSTATA_SUPRAPUBICA" ||
    args.categoryCode === "DOPPLER_OBSTETRICO"
  ) {
    const objetivo = isEstiloObjetivo(args.writingStyleId);
    // Épico IG determinística (Domingos) — atrás de flag (default OFF).
    const igCorrection = env().IG_REFERENCE_CORRECTION === "true";
    // Camada flexível (itens livres na conclusão) — atrás de flag (default OFF).
    const flexivel = env().FLEXIBLE_CONCLUSION === "true";
    const fnd = extraction.findings;
    let fullText: string;
    switch (args.categoryCode) {
      case "OBSTETRICA":
        fullText = renderObstetrica(fnd as ObstetricaFindings, null, { objetivo, igCorrection, flexivel });
        break;
      case "MORFOLOGICO":
        fullText = renderMorfologico(fnd as MorfologicoFindings, null, { objetivo, igCorrection });
        break;
      case "TIREOIDE":
        fullText = renderTireoide(fnd as TireoideFindings, args.rendererPreferences, { objetivo });
        break;
      case "MAMARIA":
        fullText = renderMamaria(fnd as MamariaFindings, args.rendererPreferences, { objetivo });
        break;
      // Categorias clássico-só (Sprint clássico 2026-06-15) — sem variante objetivo ainda.
      case "PARTES_MOLES":
        fullText = renderPartesMoles(fnd as Parameters<typeof renderPartesMoles>[0], { objetivo });
        break;
      case "CERVICAL":
        fullText = renderCervical(fnd as Parameters<typeof renderCervical>[0], { objetivo });
        break;
      case "PELVE_FEMININA": {
        // Override determinístico de menopausa ("só falar menopausa" → ajustes
        // automáticos nos ovários + endométrio). Vale p/ TA e TV.
        // Menopausa (override determinístico) + anti-alucinação de líquido livre
        // (coleção ovariana duplicada como líquido livre — laudo 900c411c).
        const pelveFnd = mergePelveLiquidoLivre(
          mergeMenopausaPelve(
            fnd as Parameters<typeof renderPelveFeminina>[0],
            args.rawInput,
          ),
        );
        fullText = renderPelveFeminina(pelveFnd, { objetivo });
        break;
      }
      case "ABDOMEN_SUPERIOR":
        fullText = renderAbdomenSuperior(fnd as Parameters<typeof renderAbdomenSuperior>[0], { objetivo });
        break;
      case "MUSCULOESQUELETICO_V2":
        // Fase 3b: parte normal montada por construção; LLM extrai só alterações.
        fullText = renderMusculoesqueletico(fnd as Parameters<typeof renderMusculoesqueletico>[0]);
        break;
      case "PROSTATA_SUPRAPUBICA":
        // S6: peso por fórmula + IPP por grau (A10). category_code = alias.
        fullText = renderProstataSuprapubica(fnd as ProstataSuprapubicaFindings);
        break;
      case "DOPPLER_OBSTETRICO": {
        // Renderer determinístico (IG Domingos + percentis do input + boilerplate
        // Doppler). Reusa o corpo obstétrico de OBSTETRICA. Gated por RENDERER_CATEGORIES.
        // mergeStructuredIg: sobrescreve a IG com o bloco estruturado do app (segurança).
        const dfnd = mergeStructuredIg(fnd as DopplerObstetricoFindings, args.rawInput);
        fullText = renderDopplerObstetrico(dfnd, null, { objetivo, igCorrection });
        break;
      }
      default:
        fullText = renderViasUrinarias(fnd as Parameters<typeof renderViasUrinarias>[0], { objetivo });
        break;
    }
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

  // 3b. ESTILO OBJETIVO (ABDOMEN_TOTAL) — monta TÉCNICA/ACHADOS/IMPRESSÃO
  // PROGRAMATICAMENTE, sem o template_body (que é clássico). Reusa o texto por
  // órgão de renderOrgan (alterado) ou a frase normal (objetivo), os free-slots
  // já renderizados e os itens de conclusão (→ IMPRESSÃO). O caminho clássico
  // abaixo (template_body) fica INTACTO — só este `return` antecipado muda.
  if (isEstiloObjetivo(args.writingStyleId)) {
    const fullTextObj = assembleAbdomenObjetivo({
      organRenders,
      freeByOrgan,
      extraRenders,
      allOrganKeys: ABDOMEN_ORGAN_KEYS,
    });

    const systemMessageObj = `[${RENDERER_VERSION}] render objetivo determinístico (${args.categoryCode})`;
    args.onSystemMessage?.(systemMessageObj);
    yield fullTextObj;
    return {
      fullText: fullTextObj,
      latencyMs: Date.now() - t0,
      systemMessage: systemMessageObj,
      inputTokens: (extraction.inputTokens ?? 0) + freeSlots.inputTokens,
      outputTokens: (extraction.outputTokens ?? 0) + freeSlots.outputTokens,
      cachedInputTokens: undefined,
      extraction,
      freeSlotCount: freeItems.length,
    };
  }

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
