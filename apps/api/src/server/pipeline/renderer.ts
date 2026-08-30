import { env } from "../env";
import { aplicarFrasesPersonalizadas } from "./frasesPersonalizadas";
import { caminhoDeGeracao } from "./caminhoDeGeracao";
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
  igSanityAltera,
  renderObstetrica,
  type ObstetricaFindings,
} from "../renderer/categories/OBSTETRICA";
import { renderObstetricaCatalogo } from "../renderer/catalog/OBSTETRICA.render";
import { OBSTETRICA_CLASSICO } from "../renderer/catalog/OBSTETRICA.classico";
import { catalogEnabledFor } from "../renderer/catalog/engine";
import type { PersonalizacaoResolvida } from "../customization/resolve";
import {
  mergeBiometriaEstruturada,
  reconcileBiometriaUnidade,
} from "../renderer/categories/biometriaFetal";
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
import { runPelveWriterStream } from "./pelveWriter";
import { runDopplerRenalWriterStream } from "./dopplerRenalWriter";
import { runDopplerVenosoMmiiWriterStream } from "./dopplerVenosoMmiiWriter";
import {
  renderDopplerObstetrico,
  mergeStructuredIg,
  type DopplerObstetricoFindings,
} from "../renderer/categories/DOPPLER_OBSTETRICO";
import { detectGolfBall } from "../renderer/categories/golfBall";
import {
  renderCervicometria,
  type CervicometriaFindings,
} from "../renderer/categories/CERVICOMETRIA";

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

const OBSTETRICA_CATALOG_ID = OBSTETRICA_CLASSICO.id;
const OBSTETRICA_CATALOG_VERSAO = OBSTETRICA_CLASSICO.versao;

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
  /**
   * Recebe os achados tipados assim que a extração termina, para o route
   * registrá-los na auditoria.
   *
   * Até aqui estes dados viviam só na memória do request: o renderer extraía,
   * montava o laudo e descartava. Sem eles não há como dizer de onde veio cada
   * trecho do laudo, nem como o sanity distinguir o que o médico ditou do que o
   * template preencheu — foi o que gerou os falsos "achado_inventado"
   * (docs/projeto-modelos/07-verificacao-achado-inventado.md).
   *
   * Puramente observacional: não altera o texto gerado.
   */
  onFindings?: (findings: unknown) => void;
  /**
   * Personalização do médico, JÁ RESOLVIDA e validada (item 7 do projeto
   * modelos). Vem como promessa para que a consulta ao banco corra em paralelo
   * com a extração do LLM, que é o custo dominante deste caminho.
   *
   * Nunca rejeita — `resolverPersonalizacao` devolve `aplicar: false` em
   * qualquer situação duvidosa, inclusive erro de banco. Ausente = laudo no
   * modelo-base, que é o comportamento de sempre.
   */
  personalizacao?: Promise<PersonalizacaoResolvida>;
  /**
   * A redação do médico nas categorias SEM catálogo estruturado — as doze que
   * hoje não têm slots a que ancorar uma operação.
   *
   * Chega como promessa pelo mesmo motivo da `personalizacao`: a consulta ao
   * banco corre em paralelo com a extração, que é o custo dominante. E, pelo
   * mesmo princípio, nunca rejeita.
   */
  frases?: Promise<import("../customization/resolveFrases").FrasesResolvidas>;
  /**
   * Qual modelo montou o laudo — para a auditoria (item 8). Emitido sempre que
   * o caminho do catálogo é usado, mesmo sem personalização: saber que um laudo
   * saiu do catálogo v1 já responde metade da pergunta "por que este texto?".
   * Observacional.
   */
  onModelo?: (m: {
    catalogId: string;
    catalogVersao: number;
    customizacaoVersao: number | null;
    motivoSemPersonalizacao?: string;
    /**
     * O motivo EM CÓDIGO. A rota decidia o aviso ao médico casando a string
     * ("mudou"), e a mensagem do catálogo obstétrico diz "o modelo-base hoje
     * é…": o aviso não saía (achado do Codex, 19/08).
     */
    motivoCodigo?: import("../customization/resolveFrases").MotivoTecnico;
    /**
     * O médico TINHA personalização publicada e válida, e mesmo assim o laudo
     * saiu com a redação padrão. É o único caso em que ele precisa ser avisado:
     * nos demais ("não publicou", "o modelo mudou") ou não há o que perder, ou
     * ele já sabe. Ver o fallback do catálogo, abaixo.
     */
    personalizacaoDescartada?: boolean;
  }) => void;
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
    caminhoDeGeracao(args.categoryCode, { objetivo: isEstiloObjetivo(args.writingStyleId) }) === "writer"
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
  // Estilo OBJETIVO fica no renderer (review dex1: o writer escreve o clássico da
  // casa; trocar TÉCNICA/ACHADOS/IMPRESSÃO sem aviso seria regressão p/ o usuário).
  if (
    args.categoryCode === "PARTES_MOLES" &&
    caminhoDeGeracao(args.categoryCode, { objetivo: isEstiloObjetivo(args.writingStyleId) }) === "writer"
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

  // PELVE writer_guarded (flag PELVE_WRITER, pedido Luiz 02/07): a pelve TA/TV tem
  // muitos detalhes que mudam → o LLM ESCREVE o laudo (entende comandos/garble),
  // guiado pelo roteiro da casa. Rota explícita ANTES da extração (não usa o schema
  // rígido). passthrough=true: o texto do writer é final; o route pula os mutadores
  // de conteúdo. Estilo objetivo fica no renderer (o writer escreve o clássico).
  if (
    args.categoryCode === "PELVE_FEMININA" &&
    caminhoDeGeracao(args.categoryCode, { objetivo: isEstiloObjetivo(args.writingStyleId) }) === "writer"
  ) {
    args.onProgress?.({ stage: "interpretando", label: "Escrevendo o laudo…" });
    const res = yield* runPelveWriterStream({
      rawInput: args.rawInput,
      signal: args.signal,
    });
    const a = res.audit;
    const auditMsg = a.ok
      ? "audit=ok"
      : `audit=FAIL(medidas:${a.missingMeasures.join("/") || "-"};menop:${a.menopausaSemMarca ? "sem-marca" : "-"};liqlivre:${a.liquidoLivreInventado ? "inventado" : "-"};placeholder:${a.placeholder ? "sim" : "-"})`;
    const systemMessage = `[${RENDERER_VERSION}] PELVE writer_guarded (${res.model}, ttft=${res.ttftMs}ms, ${res.outputTokens ?? "?"}tok, ${auditMsg})`;
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

  // DOPPLER_RENAL writer_guarded (piloto vascular, decisão Claude+Dex2). Gate =
  // membership em RENDERER_CATEGORIES (o route só chama runRendererStream se a
  // categoria está na env); aqui sempre roteia p/ o writer (não há renderer). O
  // médico dita compacto → o LLM emite só o ditado (nunca ____), com critérios JVB.
  // DOPPLER_VENOSO_MMII writer_guarded (2ª modalidade vascular). Gate = membership
  // em RENDERER_CATEGORIES. Segurança: TVP-only não afirma competência do superficial.
  if (args.categoryCode === "DOPPLER_VENOSO_MMII") {
    args.onProgress?.({ stage: "interpretando", label: "Escrevendo o laudo…" });
    const res = yield* runDopplerVenosoMmiiWriterStream({
      rawInput: args.rawInput,
      signal: args.signal,
    });
    const a = res.audit;
    const auditMsg = a.ok
      ? "audit=ok"
      : `audit=FAIL(placeholder:${a.placeholder ? "sim" : "-"};superf-tvp:${a.superficialEmTvpOnly ? "sim" : "-"};lado:${a.ladoAusente ? "ausente" : "-"})`;
    const systemMessage = `[${RENDERER_VERSION}] DOPPLER_VENOSO_MMII writer_guarded (${res.model}, ttft=${res.ttftMs}ms, ${res.outputTokens ?? "?"}tok, ${auditMsg})`;
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

  if (args.categoryCode === "DOPPLER_RENAL") {
    args.onProgress?.({ stage: "interpretando", label: "Escrevendo o laudo…" });
    const res = yield* runDopplerRenalWriterStream({
      rawInput: args.rawInput,
      signal: args.signal,
    });
    const a = res.audit;
    const auditMsg = a.ok
      ? "audit=ok"
      : `audit=FAIL(placeholder:${a.placeholder ? "sim" : "-"};pct:${a.percentEstenose ? "sim" : "-"};estenose-sem-criterio:${a.estenoseSemCriterio ? "sim" : "-"};medidas:${a.missingMeasures.join("/") || "-"})`;
    const systemMessage = `[${RENDERER_VERSION}] DOPPLER_RENAL writer_guarded (${res.model}, ttft=${res.ttftMs}ms, ${res.outputTokens ?? "?"}tok, ${auditMsg})`;
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
  // Nunca deixar a auditoria derrubar a geração de um laudo.
  try {
    args.onFindings?.(extraction.findings);
  } catch {
    /* observacional — ignora */
  }
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
    args.categoryCode === "DOPPLER_OBSTETRICO" ||
    args.categoryCode === "CERVICOMETRIA"
  ) {
    const objetivo = isEstiloObjetivo(args.writingStyleId);
    // Épico IG determinística (Domingos) — atrás de flag (default OFF).
    const igCorrection = env().IG_REFERENCE_CORRECTION === "true";
    // Camada flexível (itens livres na conclusão) — atrás de flag (default OFF).
    const flexivel = env().FLEXIBLE_CONCLUSION === "true";
    // Golf ball / foco ecogênico intracardíaco (auditoria gap #1) — atrás de flag
    // (default OFF). Detecção determinística no DITADO; o renderer injeta as frases
    // canônicas da casa (corpo + conclusão + recomendação de eco fetal ~28s).
    const golfBall =
      env().GOLF_BALL_SNIPPET === "true" ? detectGolfBall(args.rawInput) : null;
    // Feto único apenas (review dex1): no gemelar o snippet global não amarra o
    // achado ao Feto A/B. Nesse caso não detecta → sem strip → o texto do médico
    // é preservado literal em achados_adicionais (nunca dropa o achado).
    const golfBallSingle = (fndNumeroFetos: number | undefined) =>
      (fndNumeroFetos ?? 1) >= 2 ? null : golfBall;
    // Projeto modelos: categorias que montam o laudo a partir do catálogo.
    const usaCatalogo = (cat: string) => catalogEnabledFor(env().MODEL_CATALOG_CATEGORIES, cat);
    const fnd = extraction.findings;
    let fullText: string;
    // Anotação da personalização. Composta aqui e concatenada na systemMessage
    // abaixo — NÃO no route, porque `onSystemMessage` é emitido depois e a
    // sobrescreveria.
    let notaPersonalizacao = "";
    switch (args.categoryCode) {
      case "OBSTETRICA": {
        // Biometria determinística (flag OBST_BIOMETRIA_DET, boletim 02/07): o bloco
        // "Biometria fetal:" da calculadora do app + reconciliação cm→mm de voz
        // VENCEM a extração LLM (mesmo padrão do mergeStructuredIg do Doppler).
        const ofnd =
          env().OBST_BIOMETRIA_DET === "true"
            ? reconcileBiometriaUnidade(
                mergeBiometriaEstruturada(fnd as ObstetricaFindings, args.rawInput),
                args.rawInput,
              )
            : (fnd as ObstetricaFindings);
        const grannum = env().GRANNUM_PLACENTA === "true";
        const golfBallObst = golfBallSingle(ofnd.numero_fetos);
        const igSanity = env().OBST_IG_SANITY === "true";
        /**
         * A sanidade só EXCLUI o catálogo quando muda alguma coisa neste laudo.
         *
         * Antes bastava a flag estar ligada — e ela está —, o que bloqueava o
         * catálogo em 100% dos laudos e tornava MODEL_CATALOG_CATEGORIES
         * inócua. Mesmo defeito da biometria determinística (12/08), pego de
         * novo em produção no primeiro dia do catálogo (19/08): o Luiz ditou
         * "batimentos cardíacos fetais não visualizados" e recebeu
         * "Batimentos cardíacos ritmados (BCF = ____ bpm)".
         */
        const igSanityAtua = igSanity && igSanityAltera(ofnd, igCorrection);

        // O catálogo (projeto modelos) foi validado byte-a-byte contra o
        // renderer — 4320/4320 sintéticas e, com dado real de produção, 9/9.
        // Ele não assume nos casos que não sabe reproduzir.
        //
        // O que ele NÃO conhece são os dois PARÂMETROS que o renderer recebe e
        // ele não: golf ball e sanity de IG. Com qualquer um ativo, o laudo
        // perderia um recurso em silêncio — pior que não ter catálogo.
        //
        // A BIOMETRIA DETERMINÍSTICA saiu desta lista, e o motivo importa: ela
        // não é um recurso do renderer, é um PRÉ-PROCESSAMENTO dos achados
        // (`ofnd` acima). O catálogo recebe o mesmo `ofnd` já reconciliado, e
        // portanto produz o mesmo texto. Mantê-la aqui bloqueava o catálogo em
        // 100% dos laudos — a flag está ligada em produção —, o que tornava
        // MODEL_CATALOG_CATEGORIES inócua sem que nada indicasse isso.
        // Descoberto pelo harness contra laudos reais, 12/08.
        const catalogoCobreEsteCaso =
          !objetivo && golfBallObst === null && !igSanityAtua && !ofnd.doppler;

        if (usaCatalogo("OBSTETRICA") && catalogoCobreEsteCaso) {
          // Item 7: o overlay do médico entra aqui, e só aqui. Sem
          // personalização aplicável os três campos ficam undefined e vale o
          // catálogo-base — exatamente o caminho já validado.
          const p = await args.personalizacao;
          if (p?.aplicar) {
            notaPersonalizacao =
              ` | personalização v${p.versao}: ${p.operacoes} operação(ões) sobre ${p.catalogId} v${p.baseVersao}`;
          }
          /**
           * O catálogo LANÇA em situações legítimas: `interpolate` recusa
           * placeholder desconhecido (engine.ts), `applyCustomization` recusa
           * personalização de outra versão. Sem fallback, qualquer uma delas
           * derruba a GERAÇÃO — o médico dita e não recebe laudo nenhum.
           *
           * TRÊS DEGRAUS, do mais fiel ao mais seguro (desenho do Codex, 19/08).
           *
           *   catálogo + personalização → catálogo-base → renderer clássico
           *
           * Cair direto no clássico custava caro demais: ele não conhece os
           * achados que motivaram o catálogo — óbito fetal, ventriculomegalia,
           * hidropsia — e pode PERDER a patologia que o médico ditou. Se a
           * falha veio da redação do médico, o catálogo-base ainda monta o
           * laudo certo; só a redação se perde.
           *
           * Perder a patologia daquele laudo é o último recurso, e só existe
           * porque não entregar laudo nenhum é pior.
           */
          const montado = (() => {
            try {
              return {
                texto: renderObstetricaCatalogo({
                  findings: ofnd,
                  flags: { objetivo, igCorrection, flexivel, grannum },
                  ...(p?.aplicar
                    ? { catalog: p.catalog, customSlots: p.customSlots, extraConclusao: p.extraConclusao }
                    : {}),
                }),
                degrau: "catalogo" as const,
                erro: null as Error | null,
              };
            } catch (err) {
              const e1 = err instanceof Error ? err : new Error("erro no catálogo");
              if (p?.aplicar) {
                try {
                  return {
                    texto: renderObstetricaCatalogo({
                      findings: ofnd,
                      flags: { objetivo, igCorrection, flexivel, grannum },
                    }),
                    degrau: "catalogo_base" as const,
                    erro: e1,
                  };
                } catch (err2) {
                  console.warn("catálogo-base também falhou:", err2);
                }
              }
              return {
                texto: renderObstetrica(ofnd, null, {
                  objetivo, igCorrection, flexivel, grannum,
                  golfBall: golfBallObst, igSanity,
                  umbilicalSafety: true,
                  rawInput: args.rawInput,
                }),
                degrau: "classico" as const,
                erro: e1,
              };
            }
          })();

          fullText = montado.texto;
          const porque = montado.erro ? montado.erro.message.slice(0, 80) : "";
          /**
           * O DEGRAU FICA GRAVADO, e o descarte da redação também.
           *
           * O médico não tem como saber que este laudo saiu com a redação
           * padrão: para ele, a personalização está publicada e valendo. Sem
           * esta marca, "por que este laudo saiu diferente dos meus outros?"
           * não tem resposta na auditoria.
           */
          const perdeuRedacao = Boolean(p?.aplicar) && montado.degrau !== "catalogo";
          notaPersonalizacao +=
            montado.degrau === "catalogo"
              ? " | modelo: catálogo"
              : montado.degrau === "catalogo_base"
                ? ` | modelo: catálogo-base (a personalização falhou: ${porque})`
                : ` | modelo: clássico (catálogo falhou: ${porque})`;
          if (perdeuRedacao) notaPersonalizacao += " | ⚠️ PERSONALIZAÇÃO NÃO APLICADA";

          try {
            args.onModelo?.({
              catalogId: OBSTETRICA_CATALOG_ID,
              catalogVersao: OBSTETRICA_CATALOG_VERSAO,
              customizacaoVersao: montado.degrau === "catalogo" && p?.aplicar ? p.versao : null,
              ...(montado.degrau !== "catalogo"
                ? {
                    motivoSemPersonalizacao: `laudo montado pelo ${
                      montado.degrau === "catalogo_base" ? "catálogo-base" : "renderer clássico"
                    }: ${montado.erro?.message.slice(0, 120) ?? "erro"}`,
                  }
                : p && !p.aplicar
                  ? { motivoSemPersonalizacao: p.motivo, motivoCodigo: p.codigo }
                  : {}),
              ...(perdeuRedacao ? { personalizacaoDescartada: true } : {}),
            });
          } catch {
            /* observacional — nunca derruba a geração */
          }
        } else {
          /**
           * POR QUE o catálogo não montou este laudo — na systemMessage.
           *
           * Sem isto, o catálogo desligar-se por uma condição inesperada é
           * indistinguível de ele nunca ter sido ligado. Aconteceu duas vezes
           * (biometria em 12/08, sanidade de IG em 19/08), e nas duas a única
           * pista foi comparar textos à mão. Um laudo que não passou pelo
           * catálogo agora diz o motivo.
           */
          const porQueNao = !usaCatalogo("OBSTETRICA")
            ? "categoria fora de MODEL_CATALOG_CATEGORIES"
            : objetivo
              ? "estilo objetivo"
              : golfBallObst !== null
                ? "golf ball ditado"
                : "sanidade de IG atua neste laudo";
          notaPersonalizacao += ` | modelo: clássico (${porQueNao})`;
          fullText = renderObstetrica(ofnd, null, {
            objetivo, igCorrection, flexivel,
            // Grannum na placenta (grau parentético + inferência de textura) — flag OFF default.
            grannum,
            golfBall: golfBallObst,
            // Sanity de IG (flag OBST_IG_SANITY): divergência implausível ref×biometria
            // não vira correção absurda (boletim 04/07, 10813392).
            igSanity,
            umbilicalSafety: true,
            rawInput: args.rawInput,
          });
        }
        break;
      }
      case "MORFOLOGICO":
        fullText = renderMorfologico(fnd as MorfologicoFindings, null, {
          objetivo,
          igCorrection,
          golfBall,
          umbilicalSafety: true,
          rawInput: args.rawInput,
        });
        break;
      case "TIREOIDE":
        fullText = renderTireoide(fnd as TireoideFindings, args.rendererPreferences, {
          objetivo,
          // Gap #4 (flag TIREOIDE_PICO_OMIT): omitir linha de pico sem valor ditado.
          omitPicoNull: env().TIREOIDE_PICO_OMIT === "true",
        });
        break;
      case "MAMARIA":
        fullText = renderMamaria(fnd as MamariaFindings, args.rendererPreferences, {
          objetivo,
          // Gap #3 (flag MAMARIA_BIRADS_GUARD): só sinaliza [REVISAR], nunca rebaixa.
          biradsGuard: env().MAMARIA_BIRADS_GUARD === "true",
        });
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
        fullText = renderPelveFeminina(pelveFnd, {
          objetivo,
          // Gap #6 (flag PELVE_CONCL_DEDUP): remove itens de conclusão idênticos.
          dedup: env().PELVE_CONCL_DEDUP === "true",
        });
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
        // Exame Doppler isolado. Obstétrica e Morfológico compõem o mesmo módulo
        // dentro dos respectivos renderers, sem trocar a categoria-base.
        const dfnd = mergeStructuredIg(fnd as DopplerObstetricoFindings, args.rawInput);
        fullText = renderDopplerObstetrico(dfnd, null, {
          objetivo,
          // SEGURANÇA P0 do módulo v2: diástole zero/IP umbilical elevado nunca
          // vira "IP normal na umbilical" (boletim 03/07).
          umbilicalSafety: true,
          rawInput: args.rawInput,
        });
        break;
      }
      case "CERVICOMETRIA":
        // Cervicometria (ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL p/ medida do colo).
        // Exame simples e 100% determinístico. Sem variante objetivo (clássico só).
        fullText = renderCervicometria(fnd as CervicometriaFindings);
        break;
      default:
        fullText = renderViasUrinarias(fnd as Parameters<typeof renderViasUrinarias>[0], { objetivo });
        break;
    }
    /**
     * A REDAÇÃO DO MÉDICO nas categorias sem catálogo estruturado.
     *
     * Última camada, de propósito: o laudo acima é o do renderer de produção, e
     * esta passagem só troca linhas que reconhece. Se o exame tem um achado, a
     * frase de normalidade não está lá, nada casa, e o texto sai intocado — o
     * pior caso é a personalização não aplicar, nunca um laudo errado.
     *
     * Onde há catálogo (OBSTETRICA), a personalização já entrou lá em cima,
     * montando o laudo slot a slot; `frases` vem vazio e isto é um no-op.
     */
    const fr = await args.frases;
    if (fr?.aplicar) {
      const r = aplicarFrasesPersonalizadas(fullText, fr.frases);
      if (r.aplicadas > 0) {
        fullText = r.texto;
        notaPersonalizacao += ` [redação do médico v${fr.versao}: ${r.aplicadas} de ${fr.frases.length} frase(s)]`;
      } else {
        /**
         * Resolveu e não aplicou NENHUMA. É o caso legítimo — o exame tem
         * achado, a frase de normalidade não está no laudo —, mas do lado do
         * médico é indistinguível de "a personalização não funciona". Fica na
         * auditoria para que a pergunta tenha resposta.
         */
        notaPersonalizacao += ` [redação do médico v${fr.versao}: 0 de ${fr.frases.length} frase(s) — nenhuma âncora neste laudo]`;
      }
      /**
       * AUDITORIA DO CAMINHO DERIVADO (achado do Codex, 19/08).
       *
       * `onModelo` só era chamado no ramo do catálogo escrito. Doze das treze
       * categorias passam por aqui: o laudo saía personalizado sem nenhum
       * registro estruturado de qual modelo o assinou.
       */
      try {
        args.onModelo?.({
          catalogId: fr.catalogId,
          catalogVersao: fr.baseVersao,
          customizacaoVersao: fr.versao,
          ...(r.aplicadas === 0
            ? { motivoSemPersonalizacao: "nenhuma frase-âncora presente neste laudo" }
            : {}),
        });
      } catch {
        /* observacional — nunca derruba a geração */
      }
    } else if (fr && !fr.aplicar) {
      try {
        args.onModelo?.({
          catalogId: `${args.categoryCode}/derivado`,
          catalogVersao: 0,
          customizacaoVersao: null,
          motivoSemPersonalizacao: fr.motivo,
          motivoCodigo: fr.codigo,
        });
      } catch {
        /* observacional — nunca derruba a geração */
      }
    }

    const systemMessage = `[${RENDERER_VERSION}] render programático determinístico (${args.categoryCode})${notaPersonalizacao}`;
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

  // 5. Conclusão por construção (regra curada de fechamento). Item único
  // (caso todos-normais) sai sem numeração — numera-se apenas com 2+ itens,
  // como nas demais categorias.
  const conclusao =
    conclusaoItens.length === 0
      ? CONCLUSAO_TODOS_NORMAIS
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

  // Linha em branco antes de CONCLUSÃO: por construção — o template no banco
  // pode não trazê-la (e {{extra_abdominais}} consome a quebra quando vazio).
  const fullText = body.replace(/\n+(?=CONCLUSÃO:)/g, "\n\n").trim();
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
