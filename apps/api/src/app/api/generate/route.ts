import { GenerateRequestSchema } from "@laudousg/shared";
import { after } from "next/server";
import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { sseResponse, nowIso } from "@/server/sse/stream";
import { getServiceClient } from "@/server/supabaseService";
export { OPTIONS } from "@/server/cors";
import OpenAI from "openai";
import { runStructurer } from "@/server/pipeline/structurer";
import { runValidator } from "@/server/pipeline/validator";
import { loadDeterministicBundle } from "@/server/pipeline/bundleLoader";
import { loadSpecV2 } from "@/server/pipeline/writerV2/loadSpec";
import { runWriterV2 } from "@/server/pipeline/writerV2/runWriterV2";
import { resolveMorfologicoCategory } from "@/server/pipeline/morfologicoRouteSelection";
import { normalizeCategoryCode } from "@/server/pipeline/categoryNormalization";
import {
  extractDopplerData,
  applyDopplerOverlay,
  correctDopplerConclusion,
} from "@/server/pipeline/dopplerOverlay";
import { ensurePesoFetalConclusion } from "@/server/pipeline/pesoFetalGuard";
import { applyVolumePolicy } from "@/server/pipeline/volumeGuard";
import { applyDsmPolicy } from "@/server/pipeline/dsmGuard";
import { applyCommandGuard } from "@/server/pipeline/commandGuard";
import { applyCommandOperations } from "@/server/pipeline/commandOperations";
import { removeEmptyConclusionItems } from "@/server/pipeline/emptyConclusionItemsGuard";
import { normalizeSectionSpacing } from "@/server/pipeline/sectionSpacingGuard";
import { sanitizeDictationArtifacts } from "@/server/pipeline/dictationSanitizer";
import { flagImplausibleMeasures } from "@/server/pipeline/measureSanity";
import { normalizeMeasures } from "@/server/pipeline/measureNormalizer";
import { normalizeAsrTranscript } from "@/server/asr/transcriptNormalizer";
import { stripInvalidDumLines } from "@/server/pipeline/dumValidation";
import {
  enforceStatedAmnioticClass,
  ensureAmnioticConclusionLine,
} from "@/server/pipeline/amnioticFluidGuard";
import { stripSpuriousMagnitudeFlags } from "@/server/pipeline/magnitudeGuard";
import { applyCervicalLevelSuggestions } from "@/server/pipeline/cervicalLevelGuard";
import { stripObservationNarration } from "@/server/pipeline/cervicalNarrationGuard";
import { isCompleteFinishReason, runWriterStream } from "@/server/pipeline/writer";
import { resolveWriterModel } from "@/server/pipeline/modelResolver";
import { resolveGenerationPath } from "@/server/pipeline/generationPathResolver";
import { runSanityCheck } from "@/server/pipeline/sanityCheck";
import {
  runDeterministicSanity,
  type DeterministicIssue,
} from "@/server/pipeline/deterministicSanity";
import {
  insertDraftReport,
  updateReportStructured,
  updateReportRagBlocks,
  finalizeReport,
  markReportStatus,
  loadReportForResume,
} from "@/server/db/reportsRepo";
import {
  recordProductEvent,
  surfaceFromRequest,
} from "@/server/db/productEventsRepo";
import { applyClarifyAnswers } from "@/server/pipeline/clarifyMerge";
import type {
  RagBlockForPrompt,
  SanityIssue,
  SanityResult,
  StructuredFindings,
} from "@laudousg/shared";
import {
  insertOpenRun,
  updateRunAfterStructurer,
  updateRunAfterRetriever,
  updateRunAfterWriter,
  updateRunAfterSanity,
  finalizeRun,
  countRunsByReport,
} from "@/server/db/runsRepo";
import {
  getKnownCategories,
  getWritingStyleById,
  getVariantTemplateBody,
  resolveAccountReportPreference,
} from "@/server/db/lookups";
import { runRendererStream } from "@/server/pipeline/renderer";
import {
  RENDERER_SUPPORTED_CATEGORIES,
  RENDERER_PROGRAMMATIC_CATEGORIES,
  runRendererExtraction,
} from "@/server/renderer/extraction";
import { env } from "@/server/env";
import { extractVenousMap } from "@/server/vascular/venousMapService";
import {
  estimateCost,
  persistAudit,
  type GenerationAuditStage,
  type GenerationAuditState,
} from "@/server/db/auditRepo";
import {
  contractHashFor,
  PROMPT_VERSION,
} from "@/server/prompts/version";

// Recomendações do codex já incorporadas:
//  - runtime "nodejs" (NÃO edge — gpt streaming + postgres + ws Deepgram)
//  - maxDuration alto para acomodar o pipeline completo
//  - persistência incremental em generation_runs
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function formatObjectiveEnumerations(text: string) {
  return text
    .replace(/([^\n])\s+(\d+[-)]\s)/g, "$1\n$2")
    .split("\n")
    .filter((line) => !line.includes("____"))
    .filter(
      (line) =>
        !/Breast Imaging Reporting|Domingos Correia da Rocha|American College of Radiology/i.test(
          line,
        ),
    )
    .join("\n");
}

/**
 * Resolve a categoria EFETIVA em 2 passos determinísticos:
 *  1. Guard morfológico (morfológico+Doppler → MORFOLOGICO).
 *  2. Normalização contra a lista de categorias válidas (clampa códigos
 *     não-canônicos inventados pelo structurer → código real; evita crash de FK).
 * Loga override e normalização pra auditoria em prod. Devolve só a categoria.
 */
function resolveEffectiveCategory(
  detectedCategory: string,
  rawText: string,
  reportId: string,
  knownCodes: Set<string>,
  categoryHint?: string,
): string {
  const morf = resolveMorfologicoCategory(detectedCategory, rawText);
  if (morf.overridden) {
    console.warn(
      `[generate ${reportId}] category_override: ${detectedCategory} -> ${morf.category} (reason=${morf.reason})`,
    );
  }
  const norm = normalizeCategoryCode(
    morf.category,
    knownCodes,
    rawText,
    categoryHint,
  );
  if (norm.normalized) {
    console.warn(
      `[generate ${reportId}] category_normalized: ${morf.category} -> ${norm.category}`,
    );
  }
  return norm.category;
}

export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "invalid_body",
        issues: parsed.error.format(),
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  // Normaliza apenas transformações determinísticas antes de persistir e antes
  // de qualquer LLM. O transcript Whisper já chega normalizado, mas esta camada
  // também cobre o Deepgram direto do iOS e clientes antigos.
  const reqInput = {
    ...parsed.data,
    raw_input: normalizeAsrTranscript(parsed.data.raw_input),
    consolidated_transcript:
      parsed.data.consolidated_transcript === undefined
        ? undefined
        : normalizeAsrTranscript(parsed.data.consolidated_transcript),
  };
  const generationMode = reqInput.mode;
  const initialGenerationPath = resolveGenerationPath({
    mode: generationMode,
    categoryCode: reqInput.category_hint ?? "ABDOMEN_TOTAL",
  });
  // FAST-PATH: o request pode pedir explicitamente; senão usa o default do
  // servidor (env FAST_PATH_DEFAULT, "true" = ligado pra todos). Revert via env.
  const fastPath =
    initialGenerationPath.guardsMode === "advisory-only" ||
    (reqInput.fast_path ?? env().FAST_PATH_DEFAULT === "true");
  const eventSurface = surfaceFromRequest(
    req,
    reqInput.source === "watch"
      ? "watch"
      : reqInput.source === "iphone"
        ? "ios"
        : "web",
  );
  const e = env();
  const auditEnabled = e.GENERATION_AUDIT_ENABLED === "true";
  const isResume = !!reqInput.resume_from_report_id;
  // Quando resume, reutiliza o mesmo report_id pra ter UMA timeline de auditoria.
  // Novo report_id apenas em fluxo normal.
  const reportId = isResume
    ? (reqInput.resume_from_report_id as string)
    : crypto.randomUUID();
  const t0 = Date.now();
  const initialCategory = reqInput.category_hint ?? "ABDOMEN_TOTAL";
  const auditState: GenerationAuditState = {
    reportId: null,
    userId: user.id,
    category: initialCategory,
    writingStyleId: reqInput.writing_style_id,
    rawInput: reqInput.raw_input,
    categoryHint: reqInput.category_hint ?? null,
    structuredOutput: null,
    validatorResult: null,
    ragBlocksRetrieved: null,
    ragBlocksSkipped: null,
    systemMessageFull: null,
    outputText: null,
    sanityResult: null,
    totalDurationMs: null,
    structurerDurationMs: null,
    validatorDurationMs: null,
    ragDurationMs: null,
    writerDurationMs: null,
    sanityDurationMs: null,
    openaiInputTokens: null,
    openaiOutputTokens: null,
    openaiCostUsd: null,
    modelWriter: e.OPENAI_MODEL_WRITER,
    modelStructurer: e.OPENAI_MODEL_STRUCTURER,
    errorCode: null,
    errorMessage: null,
    errorStage: null,
    promptVersion: PROMPT_VERSION,
    pipelineVersion: "v1",
    contractHash: contractHashFor(initialCategory, reqInput.writing_style_id),
  };

  return sseResponse(async ({ emit }, signal) => {
    let runId: string | null = null;
    let outcome: "success" | "clarify" | "blocked" | "error" | "aborted" =
      "error";
    let errorMessage: string | undefined;
    let currentStage: GenerationAuditStage = "request";

    try {
      emit({ type: "open", ts: nowIso(), report_id: reportId });

      // Resolver writing_style_id → code/name antes (fix codex #4).
      // Carregar categorias conhecidas pro validator (fix codex #2).
      currentStage = "lookups";
      let effectiveWritingStyleId = reqInput.writing_style_id;
      let [styleRow, categoriesInfo] = await Promise.all([
        getWritingStyleById(reqInput.writing_style_id),
        getKnownCategories(),
      ]);
      if (!styleRow) {
        outcome = "error";
        errorMessage = `writing_style_id ${reqInput.writing_style_id} não existe`;
        auditState.errorCode = "INVALID_WRITING_STYLE";
        auditState.errorMessage = errorMessage;
        auditState.errorStage = currentStage;
        emit({
          type: "error",
          ts: nowIso(),
          code: "INVALID_WRITING_STYLE",
          message: errorMessage,
        });
        return;
      }
      // Saneamento writing styles: estilo desativado (ex: DIRETO_OBJETIVO /
      // DETALHADO_PROTOCOLAR) → cai no CLÁSSICO (cinto de segurança; hoje 0
      // perfis usam esses, mas evita gerar com estilo aposentado).
      if (!styleRow.active) {
        const CLASSICO_ID = "11111111-1111-4111-8111-111111111111";
        effectiveWritingStyleId = CLASSICO_ID;
        styleRow = (await getWritingStyleById(CLASSICO_ID)) ?? styleRow;
      }

      let findings: StructuredFindings;
      // Categoria EFETIVA para roteamento (retriever/writer/persistência). Pode
      // divergir de findings.categoria_detectada quando o guard morfológico
      // sobrescreve. Computada em cada branch ANTES da 1ª persistência, pois o
      // structurer pode emitir códigos não-canônicos (que quebrariam a FK de
      // reports.category_code se gravados crus). Ver morfologicoRouteSelection.
      let effectiveCategory = "";

      if (isResume) {
        currentStage = "resume";
        // RESUME: carregar report existente, pular structurer.
        // Fix codex T-D #3: exigir pelo menos UMA answer com texto.
        const validAnswers = (reqInput.clarify_answers ?? []).filter(
          (a) => a.answer && a.answer.trim().length > 0,
        );
        if (validAnswers.length === 0) {
          outcome = "error";
          errorMessage =
            "Resume requer pelo menos uma clarify_answer não-vazia. Sem isso o pipeline geraria as mesmas perguntas de novo.";
          auditState.errorCode = "RESUME_EMPTY_ANSWERS";
          auditState.errorMessage = errorMessage;
          auditState.errorStage = currentStage;
          emit({
            type: "error",
            ts: nowIso(),
            code: "RESUME_EMPTY_ANSWERS",
            message: errorMessage,
          });
          return;
        }

        const existing = await loadReportForResume({
          reportId,
          userId: user.id,
        });
        if (!existing) {
          outcome = "error";
          errorMessage = `Report ${reportId} não encontrado ou sem permissão.`;
          auditState.errorCode = "RESUME_NOT_FOUND";
          auditState.errorMessage = errorMessage;
          auditState.errorStage = currentStage;
          emit({
            type: "error",
            ts: nowIso(),
            code: "RESUME_NOT_FOUND",
            message: errorMessage,
          });
          return;
        }
        auditState.reportId = reportId;
        if (!existing.structuredFindings) {
          outcome = "error";
          errorMessage = `Report ${reportId} não tem structured_findings — não pode resumir.`;
          auditState.errorCode = "RESUME_NO_FINDINGS";
          auditState.errorMessage = errorMessage;
          auditState.errorStage = currentStage;
          emit({
            type: "error",
            ts: nowIso(),
            code: "RESUME_NO_FINDINGS",
            message: errorMessage,
          });
          return;
        }

        // Fix codex T-D resumo: usar writing_style_id PERSISTIDO no report
        // (não o do request — pode ter sido alterado entre clarify e resume).
        // Sobrescreve styleRow se necessário.
        if (
          existing.writingStyleId &&
          existing.writingStyleId !== reqInput.writing_style_id
        ) {
          const persistedStyle = await getWritingStyleById(
            existing.writingStyleId,
          );
          if (persistedStyle) {
            effectiveWritingStyleId = existing.writingStyleId;
            styleRow = persistedStyle;
            auditState.writingStyleId = effectiveWritingStyleId;
          }
        }

        // Fix codex T-D #2: limite de 2 resumes por report (proteção contra
        // loop infinito teórico de clarify).
        const previousRuns = await countRunsByReport(reportId);
        if (previousRuns >= 3) {
          outcome = "error";
          errorMessage =
            "Limite de retomadas atingido (3 tentativas). Recomece do zero ou ajuste o input.";
          auditState.errorCode = "RESUME_LIMIT_REACHED";
          auditState.errorMessage = errorMessage;
          auditState.errorStage = currentStage;
          emit({
            type: "error",
            ts: nowIso(),
            code: "RESUME_LIMIT_REACHED",
            message: errorMessage,
          });
          return;
        }

        // Nova run pra auditar a retomada
        runId = await insertOpenRun({
          reportId,
          rawInputForRagQuery:
            existing.consolidatedTranscript ?? existing.rawInput,
        });
        // Aplica clarify_answers nos findings persistidos
        findings = applyClarifyAnswers(
          existing.structuredFindings,
          validAnswers,
        );
        auditState.reportId = reportId;
        effectiveCategory = resolveEffectiveCategory(
          findings.categoria_detectada,
          reqInput.consolidated_transcript ?? reqInput.raw_input,
          reportId,
          categoriesInfo.codes,
          reqInput.category_hint,
        );
        auditState.category = effectiveCategory;
        auditState.contractHash = contractHashFor(
          effectiveCategory,
          effectiveWritingStyleId,
        );
        auditState.structuredOutput = findings;
        // Registra na run que veio de resume + os findings aplicados (auditoria).
        // Antes da mutação → preserva a categoria CRUA na run.
        await updateRunAfterStructurer({
          runId,
          structured: findings,
          latencyMs: 0, // resume não tem structurer
        });
        // Normaliza a categoria efetiva no findings (ver branch normal).
        findings.categoria_detectada = effectiveCategory;
        await updateReportStructured({
          reportId,
          structured: findings,
          categoryCode: effectiveCategory,
        });
        await markReportStatus({ reportId, status: "draft" });
        emit({ type: "structured", ts: nowIso(), payload: findings });
      } else {
        // FLUXO NORMAL: persistir report=draft + run inicial + structurer.
        // Clampa o category_hint do client a um código VÁLIDO — hint inválido
        // quebraria a FK reports.category_code já no insert do rascunho, antes
        // do structurer/normalizador.
        const draftCategory =
          reqInput.category_hint && categoriesInfo.codes.has(reqInput.category_hint)
            ? reqInput.category_hint
            : "ABDOMEN_TOTAL";
        await insertDraftReport({
          id: reportId,
          userId: user.id,
          categoryCode: draftCategory,
          writingStyleId: reqInput.writing_style_id,
          rawInput: reqInput.raw_input,
          consolidatedTranscript: reqInput.consolidated_transcript ?? null,
        });
        await recordProductEvent({
          userId: user.id,
          surface: eventSurface,
          eventName: "report.created",
          metadata: {
            report_id: reportId,
            category_code: draftCategory,
            writing_style_id: reqInput.writing_style_id,
          },
        });
        runId = await insertOpenRun({
          reportId,
          rawInputForRagQuery:
            reqInput.consolidated_transcript ?? reqInput.raw_input,
        });
        auditState.reportId = reportId;

        // ----- WRITER V2 (experimental, opt-in por conta/param) -----
        // Motor plano+montagem+auditoria (writerV2). Fail-closed: só ativa p/ o
        // user_id autorizado OU param writer_variant=v2, nas categorias com spec
        // (WRITER_V2_CATEGORIES). QUALQUER erro → fallback pro caminho normal
        // abaixo (o route NÃO quebra).
        const writerV2Categories = env()
          .WRITER_V2_CATEGORIES.split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        const useWriterV2 =
          // O modo experimental tem que passar reto por aqui. O writerV2 usa o
          // OPENAI_MODEL_WRITER fixo e retorna ANTES do resolveWriterModel — ou
          // seja, ignoraria o provider alternativo e, pior, contornaria a
          // rejeição de usuário não autorizado, que só é avaliada lá adiante.
          generationMode !== "experimental" &&
          writerV2Categories.includes(draftCategory) &&
          env().WRITER_V2_USER_ID !== "" &&
          (user.id === env().WRITER_V2_USER_ID ||
            reqInput.writer_variant === "v2");
        if (useWriterV2) {
          try {
            currentStage = "writer";
            const specV2 = loadSpecV2(draftCategory);
            if (specV2) {
              const v2 = await runWriterV2({
                openai: new OpenAI({ apiKey: env().OPENAI_API_KEY }),
                model: env().OPENAI_MODEL_WRITER,
                ditadoCru: reqInput.consolidated_transcript ?? reqInput.raw_input,
                spec: specV2,
              });
              emit({ type: "token", ts: nowIso(), delta: v2.laudo });
              try {
                await updateRunAfterWriter({ runId, latencyMs: 0, modelWriter: "writerV2" });
              } catch {
                /* fechamento do run é cosmético — não bloqueia */
              }
              outcome = "success";
              await finalizeReport({
                reportId,
                status: "generated",
                generatedOutput: v2.laudo,
                sanityResult: null,
                metadata: {
                  writer_v2: true,
                  writer_v2_reparou: v2.reparou,
                  writer_v2_divergencias: v2.divergencias.length,
                },
              });
              emit({ type: "done", ts: nowIso(), report_id: reportId, final_text: v2.laudo });
              return;
            }
          } catch (writerV2Error) {
            console.error(
              `[generate ${reportId}] writerV2 falhou, fallback pro caminho normal:`,
              writerV2Error,
            );
            // NÃO return → segue o fluxo normal abaixo (fail-safe).
          }
        }

        // ----- 1. Structurer (ou FAST-PATH determinístico) -----
        currentStage = "structurer";
        if (fastPath) {
          // FAST-PATH: a categoria vem do hint (98,5% dos requests trazem; em
          // 99,5% bate com a detecção do structurer). Pula a chamada do
          // structurer (~4,8s) — o writer escreve direto do ditado cru e os
          // guards pós-writer protegem as regras. effectiveCategory já é válido
          // (draftCategory foi clampado a um código conhecido).
          effectiveCategory = resolveEffectiveCategory(
            draftCategory,
            reqInput.consolidated_transcript ?? reqInput.raw_input,
            reportId,
            categoriesInfo.codes,
            reqInput.category_hint,
          );
          findings = {
            schema_version: "v1",
            categoria_detectada: effectiveCategory,
            tipo_exame:
              categoriesInfo.labels.get(effectiveCategory) ?? effectiveCategory,
            achados: {},
            comandos_do_medico: [],
            trechos_confusos: [],
            nivel_de_confianca: "alta",
          } as StructuredFindings;
          auditState.category = effectiveCategory;
          auditState.contractHash = contractHashFor(
            effectiveCategory,
            effectiveWritingStyleId,
          );
          auditState.structuredOutput = findings;
          await updateReportStructured({
            reportId,
            structured: findings,
            categoryCode: effectiveCategory,
          });
          emit({ type: "structured", ts: nowIso(), payload: findings });
        } else {
        const structured = await runStructurer({
          rawInput: reqInput.consolidated_transcript ?? reqInput.raw_input,
          categoryHint: reqInput.category_hint,
          knownCategories: [...categoriesInfo.codes],
          signal,
        });
        findings = structured.findings;
        // Roteamento determinístico de categoria (morfológico+Doppler + clamp
        // pra código válido). Computa a categoria EFETIVA ANTES de persistir — o
        // structurer pode emitir um código não-canônico que quebraria a FK.
        effectiveCategory = resolveEffectiveCategory(
          findings.categoria_detectada,
          reqInput.consolidated_transcript ?? reqInput.raw_input,
          reportId,
          categoriesInfo.codes,
          reqInput.category_hint,
        );
        auditState.category = effectiveCategory;
        auditState.contractHash = contractHashFor(
          effectiveCategory,
          effectiveWritingStyleId,
        );
        auditState.structuredOutput = findings;
        auditState.structurerDurationMs = structured.latencyMs;
        auditState.openaiInputTokens =
          (auditState.openaiInputTokens ?? 0) + (structured.inputTokens ?? 0);
        auditState.openaiOutputTokens =
          (auditState.openaiOutputTokens ?? 0) + (structured.outputTokens ?? 0);
        // updateRunAfterStructurer roda ANTES da mutação → preserva a categoria
        // CRUA detectada pelo structurer em generation_runs (auditoria honesta
        // do que o LLM inferiu, mesmo quando não-canônica).
        await updateRunAfterStructurer({
          runId,
          structured: findings,
          latencyMs: structured.latencyMs,
        });
        // Defesa final: NUNCA persistir categoria inválida (quebraria a FK
        // reports.category_code). Se a resolução não chegou num código válido,
        // bloqueia com erro controlado em vez de derrubar o pipeline com
        // PIPELINE_FAILURE de FK. (A run acima já preservou o cru pra auditoria.)
        if (!categoriesInfo.codes.has(effectiveCategory)) {
          outcome = "blocked";
          const reason = `Não foi possível identificar a categoria do exame (detectado: ${findings.categoria_detectada}).`;
          auditState.errorCode = "CATEGORY_UNRESOLVED";
          auditState.errorMessage = reason;
          auditState.errorStage = currentStage;
          await finalizeReport({
            reportId,
            status: "blocked",
            generatedOutput: "",
            sanityResult: null,
            metadata: { detected_category: findings.categoria_detectada },
          });
          emit({
            type: "error",
            ts: nowIso(),
            code: "CATEGORY_UNRESOLVED",
            message: reason,
          });
          return;
        }
        // Normaliza a categoria efetiva no findings: todo o downstream
        // (validator, retriever, writer, sanity) passa a ler a categoria
        // canônica/roteada, sem threading vaso-a-vaso. O cru fica na run acima.
        findings.categoria_detectada = effectiveCategory;
        await updateReportStructured({
          reportId,
          structured: findings,
          categoryCode: effectiveCategory,
        });
        emit({ type: "structured", ts: nowIso(), payload: findings });
        }
      }

      // ----- 2. Validator -----
      // Fix codex #2: passar categorias conhecidas do DB (não Set vazio).
      currentStage = "validator";
      const validatorT0 = Date.now();
      // FAST-PATH não tem achados estruturados pra validar (o writer lê o cru);
      // categoria já é válida (clampada). Pula o validator pra não gerar clarify.
      const validator = fastPath
        ? { ok: true as const, questions: [], issues: [] }
        : runValidator({
            findings,
            knownCategoryCodes: categoriesInfo.codes,
          });
      auditState.validatorDurationMs = Date.now() - validatorT0;
      auditState.validatorResult = validator;
      emit({
        type: "validator",
        ts: nowIso(),
        ok: validator.ok,
        issues_count: validator.issues.length,
      });

      if (!validator.ok && validator.questions.length > 0) {
        outcome = "clarify";
        await markReportStatus({ reportId, status: "awaiting_clarify" });
        emit({
          type: "clarify",
          ts: nowIso(),
          questions: validator.questions,
        });
        return;
      }

      // Fix codex #3: validator.ok=false sem questions = blocker real, parar.
      if (!validator.ok) {
        const blocker = validator.issues.find((i) => i.severity === "blocker");
        const reason =
          blocker?.message ?? "Validação determinística falhou sem detalhe.";
        outcome = "blocked";
        auditState.errorCode = "VALIDATOR_BLOCKED";
        auditState.errorMessage = reason;
        auditState.errorStage = currentStage;
        await finalizeReport({
          reportId,
          status: "blocked",
          generatedOutput: "",
          sanityResult: null,
          metadata: { validator_issues: validator.issues },
        });
        emit({
          type: "error",
          ts: nowIso(),
          code: "VALIDATOR_BLOCKED",
          message: reason,
        });
        return;
      }

      const generationPath = resolveGenerationPath({
        mode: generationMode,
        categoryCode: effectiveCategory,
      });
      const modelConfig = resolveWriterModel({
        mode: generationMode,
        categoryCode: effectiveCategory,
        userId: user.id,
      });
      auditState.modelWriter = modelConfig.model;
      console.log(
        `[generate ${reportId}] model resolved: provider=${modelConfig.provider} model=${modelConfig.model} credential=${modelConfig.credentialRef}`,
      );
      // Categorias de writer PURO (LIVRE/TESTE): usam o prompt geral da casa
      // (LIVRE_SYSTEM_PROMPT), NÃO o template curado do bundle. Logo, um
      // bundle.error (BUNDLE_EMPTY — sem biblioteca) NÃO deve bloquear, e o
      // writer escreve direto do ditado cru (rawUserMessage), sem structurer.
      const isFreeWriterCategory =
        effectiveCategory === "LIVRE" || effectiveCategory === "TESTE";

      // ----- 3. BUNDLE determinístico (caminho ÚNICO) -----
      // DET-2 final: o retriever vetorial foi APOSENTADO. Toda categoria carrega
      // TODOS os blocos validados por chave fixa (categoria × estilo) — sem
      // embedding, sem quota, sem RPC. Mesmo input → mesmo bundle → prefixo de
      // prompt estável (prompt caching). A seleção de variante de máscara é
      // determinística por gatilho (ver bundleLoader MODEL_VARIANT_SELECTORS).
      currentStage = "retriever";
      const ragT0 = Date.now();
      const skipped: RagBlockForPrompt[] = [];
      const queryText = "[deterministic_bundle]";
      // DET-3 + DET-5 ONDA 2: numa única query, a variante preferida pela conta
      // (usada só quando o ditado não decide por contexto) E os toggles do
      // renderer (consumidos no caminho renderer, mais abaixo).
      const { variantKey: accountVariantKey, rendererPreferences } =
        await resolveAccountReportPreference(user.id, effectiveCategory);
      const bundle = await loadDeterministicBundle({
        categoryCode: effectiveCategory,
        writingStyleId: effectiveWritingStyleId,
        rawInput: reqInput.consolidated_transcript ?? reqInput.raw_input,
        accountVariantKey,
      });
      // Categorias renderer PROGRAMÁTICO (PELVE, OBSTETRICA, MORFOLOGICO...) montam
      // o laudo 100% em código a partir da extração e NÃO usam o modelo do bundle.
      // Um erro de bundle/variante (ex.: ASR sujo "transaginal" que não resolve
      // TA/TV) NÃO deve bloquear — o renderer gera mesmo assim. (Boletim 2026-06-17:
      // PELVE bloqueava 10×/dia exatamente por isso, antes de chegar ao renderer.)
      const rendererCatsEarly = env()
        .RENDERER_CATEGORIES.split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "");
      const isProgrammaticRenderer =
        generationPath.path === "renderer" &&
        rendererCatsEarly.includes(effectiveCategory) &&
        RENDERER_SUPPORTED_CATEGORIES.has(effectiveCategory) &&
        RENDERER_PROGRAMMATIC_CATEGORIES.has(effectiveCategory);
      if (bundle.error && isProgrammaticRenderer) {
        console.warn(
          `[generate ${reportId}] bundle ${bundle.error.code} ignorado: ${effectiveCategory} é renderer programático (monta em código). Segue p/ o renderer.`,
        );
      }
      // Bundle inválido = erro ALTO e CLARO (laudo médico NUNCA sai sem
      // estrutura). Gates (reviews dex1/dex2):
      //  - BUNDLE_EMPTY: nenhum bloco validado pra (categoria × estilo) —
      //    categoria sem biblioteca curada (ex: ainda não saneada)
      //  - BUNDLE_NO_TEMPLATE: há blocos mas nenhum kind=modelo
      //  - BUNDLE_VARIANT_EMPTY: a variante escolhida não tem modelo
      //  - BUNDLE_MODEL_AMBIGUOUS: >1 modelo após seleção (falta seletor/tag)
      if (bundle.error && !isProgrammaticRenderer && !isFreeWriterCategory) {
        outcome = "blocked";
        const reason =
          bundle.error.code === "BUNDLE_VARIANT_EMPTY"
            ? `A variante de modelo solicitada (${bundle.error.variantTag}) não está disponível para ${effectiveCategory}. Geração bloqueada por segurança.`
            : bundle.error.code === "BUNDLE_MODEL_AMBIGUOUS"
              ? `Mais de uma máscara aplicável para ${effectiveCategory} sem desambiguação. Geração bloqueada por segurança.`
              : `A categoria ${effectiveCategory} ainda não tem biblioteca de laudo curada. Geração bloqueada por segurança — avise o suporte.`;
        auditState.errorCode = bundle.error.code;
        auditState.errorMessage = reason;
        auditState.errorStage = currentStage;
        console.error(
          `[generate ${reportId}] ${bundle.error.code}: categoria=${effectiveCategory} writing_style_id=${effectiveWritingStyleId}.`,
        );
        await finalizeReport({
          reportId,
          status: "blocked",
          generatedOutput: "",
          sanityResult: null,
          metadata: {
            bundle_error: {
              code: bundle.error.code,
              category_code: effectiveCategory,
              writing_style_id: effectiveWritingStyleId,
            },
          },
        });
        emit({
          type: "error",
          ts: nowIso(),
          code: bundle.error.code,
          message: reason,
        });
        return;
      }
      // bundle.blocks pode vir vazio quando ignoramos um bundle.error de renderer
      // programático acima — o renderer não usa o bundle, então [] é seguro.
      const loadedBlocks = bundle.blocks ?? [];
      const blocks = generationPath.ragFewShots
        ? loadedBlocks
        : loadedBlocks.filter((block) => block.kind === "modelo");
      auditState.ragDurationMs = Date.now() - ragT0;
      auditState.ragBlocksRetrieved = blocks;
      auditState.ragBlocksSkipped = skipped;
      await updateRunAfterRetriever({
        runId,
        ragBlockIds: blocks.map((b) => b.id),
        ragQueryText: queryText,
      });
      await updateReportRagBlocks({
        reportId,
        blockIds: blocks.map((b) => b.id),
      });
      emit({
        type: "rag",
        ts: nowIso(),
        // Prova explícita do caminho usado (review dex1) — o runner golden
        // exige "deterministic_bundle" pra evitar falso-verde contra o RAG.
        source: "deterministic_bundle",
        blocks_used: blocks.map((b) => b.id),
        blocks_summary: blocks.map((b) => ({
          id: b.id,
          kind: b.kind,
          title: b.title,
          priority: b.priority,
        })),
      });

      // Bundle determinístico não tem warning de recall (sem retriever).
      // Mantido como array vazio para compat com a auditoria/metadata abaixo.
      const pipelineWarnings: { code: string; message: string }[] = [];

      // ----- 4. Writer (stream) OU Renderer (DET-5) -----
      // Fix codex #4: resolver writing_style code + category label do DB.
      currentStage = "writer";
      // DET-5: caminho RENDERER quando a categoria está na flag E a variante
      // resolvida tem template_body. Qualquer outra condição → writer
      // (fallback automático; rollback trivial = tirar da flag).
      const rendererCategories = env()
        .RENDERER_CATEGORIES.split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "");
      const rendererEligible =
        generationPath.path === "renderer" &&
        rendererCategories.includes(effectiveCategory) &&
        RENDERER_SUPPORTED_CATEGORIES.has(effectiveCategory);
      // Categorias programáticas (ex: OBSTETRICA) montam o laudo em código e não
      // precisam de template_body; as demais (ABDOMEN_TOTAL) exigem o template.
      const programmatic =
        rendererEligible && RENDERER_PROGRAMMATIC_CATEGORIES.has(effectiveCategory);
      let rendererTemplateBody: string | null = null;
      if (rendererEligible && !programmatic) {
        rendererTemplateBody = await getVariantTemplateBody({
          categoryCode: effectiveCategory,
          writingStyleId: effectiveWritingStyleId,
          variantKey: (bundle.error ? null : bundle.variantKey) ?? "padrao",
        });
      }
      // `let` (não const): no fallback gracioso abaixo, se o RENDERER falhar
      // (ex.: extração não valida o schema), cai para o writer e marca como writer.
      let useRenderer = programmatic || rendererTemplateBody !== null;
      // UX (flag RENDERER_PROGRESS): emite progresso da extração via SSE para o
      // app mostrar status em vez de tela muda. OFF = sem stage events.
      const progressEnabled = env().RENDERER_PROGRESS === "true";
      const writerGen = useRenderer
        ? runRendererStream({
            categoryCode: effectiveCategory,
            rawInput: reqInput.consolidated_transcript ?? reqInput.raw_input,
            templateBody: rendererTemplateBody ?? "",
            signal,
            // DET-5 ONDA 2 — toggles resolvidos junto da variante (sem 2ª query).
            rendererPreferences,
            // Sprint 1 — estilo de redação despacha clássico vs objetivo (TIREOIDE).
            writingStyleId: effectiveWritingStyleId,
            onProgress: progressEnabled
              ? (e) => emit({ type: "stage", ts: nowIso(), stage: e.stage, label: e.label })
              : undefined,
            onSystemMessage: (message) => {
              auditState.systemMessageFull = message;
            },
          })
        : runWriterStream({
            findings,
            ragBlocks: blocks,
            writingStyleCode: styleRow.code,
            categoryCode: effectiveCategory,
            categoryLabel:
              categoriesInfo.labels.get(effectiveCategory) ?? effectiveCategory,
            // FAST-PATH: writer escreve direto do ditado cru (sem achados estruturados).
            // LIVRE/TESTE são SEMPRE writer puro do ditado (não dependem do fastPath).
            rawUserMessage: (fastPath || isFreeWriterCategory)
              ? reqInput.consolidated_transcript ?? reqInput.raw_input
              : undefined,
            sourceTranscript:
              reqInput.consolidated_transcript ?? reqInput.raw_input,
            modelConfig,
            signal,
            onSystemMessage: (message) => {
              auditState.systemMessageFull = message;
            },
          });

      let finalText = "";
      let writerResult:
        | {
            fullText: string;
            latencyMs: number;
            systemMessage: string;
            inputTokens?: number;
            outputTokens?: number;
            cachedInputTokens?: number;
            finishReason?: string;
          }
        | undefined;
      try {
        while (true) {
          const next = await writerGen.next();
          if (next.done) {
            writerResult = next.value;
            break;
          }
          finalText += next.value;
          emit({ type: "token", ts: nowIso(), delta: next.value });
        }
      } catch (rendererErr) {
        // NEVER-BLOCK (graceful degradation): se o RENDERER falhar (ex.: a extração
        // não validou o schema — caso Pelve/0 fetos) ANTES de emitir o laudo, cai
        // no writer em vez de bloquear a geração. Só o caminho renderer; só se nada
        // do laudo saiu ainda (a extração é a 1ª etapa, então no erro finalText="").
        if (!useRenderer || finalText !== "") throw rendererErr;
        console.error(
          `[generate ${reportId}] renderer falhou (${(rendererErr as Error).message}); fallback → writer.`,
        );
        useRenderer = false; // pós-processadores + auditoria tratam como writer
        emit({
          type: "warning",
          ts: nowIso(),
          code: "RENDERER_FALLBACK",
          message: "Estrutura determinística indisponível para este ditado; gerando pelo modo padrão.",
        });
        const fallbackGen = runWriterStream({
          findings,
          ragBlocks: blocks,
          writingStyleCode: styleRow.code,
          categoryCode: effectiveCategory,
          categoryLabel: categoriesInfo.labels.get(effectiveCategory) ?? effectiveCategory,
          rawUserMessage: reqInput.consolidated_transcript ?? reqInput.raw_input,
          sourceTranscript:
            reqInput.consolidated_transcript ?? reqInput.raw_input,
          modelConfig,
          signal,
          onSystemMessage: (message) => {
            auditState.systemMessageFull = message;
          },
        });
        for (;;) {
          const next = await fallbackGen.next();
          if (next.done) {
            writerResult = next.value;
            break;
          }
          finalText += next.value;
          emit({ type: "token", ts: nowIso(), delta: next.value });
        }
      }
      finalText = writerResult?.fullText ?? finalText;

      // GUARD: só persiste laudo que o modelo terminou de escrever.
      //
      // Cancelamento do cliente vem PRIMEIRO e independe do conteúdo. O SDK da
      // OpenAI lança `APIUserAbortError`, cujo `name` é "Error" — o catch lá
      // embaixo só reconhece "AbortError", então sem isto desistir da geração
      // no meio seria auditado como falha do writer.
      if (signal.aborted) {
        const abortErr = new Error("client disconnected");
        abortErr.name = "AbortError";
        throw abortErr;
      }

      // Vazio: o modelo de raciocínio gastou TODO o `max_tokens` pensando e não
      // emitiu uma palavra. O stream fecha limpo, então nada acusa erro. Sem o
      // guard, gravava `generated_output = ''` com `outcome = 'success'` e o
      // médico via tela em branco. Produção 09/08 (deepseek-v4-flash): duas de
      // três gerações bateram no teto e voltaram vazias.
      if (finalText.trim() === "") {
        throw new Error(
          `Writer não produziu texto (model=${modelConfig.model}, ` +
            `tokens_out=${writerResult?.outputTokens ?? "?"}, ` +
            `finish_reason=${writerResult?.finishReason ?? "?"}). ` +
            `Causa provável: o orçamento de tokens acabou no raciocínio.`,
        );
      }

      // TRUNCADO — o caso PIOR, e o que este bloco existe para pegar.
      //
      // Quando o orçamento acaba durante a escrita (finish_reason="length"), o
      // texto sai cortado no meio e PARECE um laudo bom. Diferente do vazio, que
      // é óbvio, este passa despercebido — e a frase que morre no meio pode ser
      // uma medida ou uma lateralidade. Nunca persistir.
      if (!isCompleteFinishReason(writerResult?.finishReason)) {
        throw new Error(
          `Laudo incompleto: o modelo parou por "${writerResult?.finishReason}" ` +
            `(model=${modelConfig.model}, tokens_out=${writerResult?.outputTokens ?? "?"}). ` +
            `O texto foi descartado por estar truncado.`,
        );
      }
      // DET-5: no caminho RENDERER os post-processors NÃO rodam — a estrutura
      // (cabeçalhos, ordem, numeração, placeholders) é garantida por
      // construção; os guards existem pra consertar o que o writer LLM quebra.
      if (generationPath.guardsMode === "full" && !useRenderer) {
      if (styleRow.code === "OBJETIVO") {
        finalText = formatObjectiveEnumerations(finalText);
      }
      // Morfológico: garante a frase de líquido na conclusão (item 2). A regra
      // do banco manda SEMPRE incluir, mas o LLM omite — determinístico vence.
      if (effectiveCategory === "MORFOLOGICO") {
        finalText = ensureAmnioticConclusionLine(finalText);
      }
      // Guard determinístico: respeita a quantidade de líquido amniótico
      // declarada pelo médico (nunca contradizê-la) — ver amnioticFluidGuard.ts.
      // Usa o transcript consolidado (áudio) quando houver — o médico pode ter
      // ditado a classe ali e não no raw_input (F5a, review dex1).
      finalText = enforceStatedAmnioticClass(
        finalText,
        reqInput.consolidated_transcript ?? reqInput.raw_input,
      );
      // Remove flags "[REVISAR — magnitude]" espúrios em biometria dentro da
      // faixa fisiológica (LLM super-flagava valores normais a termo).
      finalText = stripSpuriousMagnitudeFlags(finalText);
      // Política de VOLUME: padrão é NUNCA calcular (o LLM auto-calculava sem
      // ser pedido). Só calcula quando o médico pede explicitamente; senão zera
      // volumes inventados pra placeholder. Ver volumeGuard.ts.
      finalText = applyVolumePolicy(
        finalText,
        reqInput.consolidated_transcript ?? reqInput.raw_input,
      );
      // DSM (Diâmetro Médio do Saco Gestacional): mesma política — só calcula
      // quando o médico pede ("calcule o DSM"). Ver dsmGuard.ts.
      finalText = applyDsmPolicy(
        finalText,
        reqInput.consolidated_transcript ?? reqInput.raw_input,
      );
      // COMANDOS: garante que diretivas explícitas do médico pra conclusão ("na
      // conclusão recomendar X", "recomende Y") entrem no laudo se o LLM ignorou.
      // Roda por último — comandos entram ao final da conclusão. Ver commandGuard.
      // DET-6: a flag COMMAND_OPERATIONS roteia pelo aplicador de operações.
      finalText = applyConfiguredCommands(
        finalText,
        reqInput.consolidated_transcript ?? reqInput.raw_input,
      );
      // CERVICAL: (3) remove narração de observação vazada ("estou vendo...") que
      // o LLM transcreveu literal em vez de interpretar; (2) sugere o nível Robbins
      // de referência anatômica inequívoca (ângulo mandíbula→IB, supraclavicular→VB),
      // marcando com [REVISAR] pra o médico confirmar. Ver cervical*Guard.
      if (effectiveCategory === "CERVICAL") {
        finalText = stripObservationNarration(finalText);
        finalText = applyCervicalLevelSuggestions(finalText);
      }
      // Guard determinístico de PESO FETAL: o LLM descarta o item de conclusão
      // do peso (<P10/P.I.G., <P3+Gratacós, >P95/G.I.G.) mesmo capturado pelo
      // structurer. Roda APÓS o líquido e ANTES do Doppler (ordem da conclusão:
      // IG, líquido, peso, Doppler).
      const dopplerInput =
        reqInput.consolidated_transcript ?? reqInput.raw_input;
      if (
        effectiveCategory === "DOPPLER_OBSTETRICO" ||
        effectiveCategory === "OBSTETRICA" ||
        effectiveCategory === "MORFOLOGICO"
      ) {
        finalText = ensurePesoFetalConclusion(finalText, dopplerInput);
      }
      // Overlay Doppler determinístico (morfológico+Doppler): insere a seção
      // DOPPLERVELOCIMETRIA + itens de conclusão a partir dos valores ditados,
      // seguindo o spec (umbilical/ACM manual, uterinas auto, perfil=1/RCP).
      // Roda APÓS a linha de líquido pra os itens Doppler virem na sequência.
      if (effectiveCategory === "MORFOLOGICO" && /\bdoppler\b/i.test(dopplerInput)) {
        finalText = applyDopplerOverlay(finalText, extractDopplerData(dopplerInput));
      } else if (effectiveCategory === "DOPPLER_OBSTETRICO") {
        // Fix B (bug D2): a seção já vem do template; só corrige a conclusão
        // pra o vaso certo (umbilical/ACM manual, uterinas auto, perfil=1/RCP).
        finalText = correctDopplerConclusion(finalText, extractDopplerData(dopplerInput));
      }
      // Guard transversal: remove itens numerados de conclusão cujo conteúdo é
      // só placeholder ("____"). Preserva placeholders dentro de itens reais.
      finalText = removeEmptyConclusionItems(finalText);
      // Fase 3 (determinismo): normaliza o espaçamento de seções do MSK — quebra
      // simples entre achados, linha em branco só antes de cabeçalhos/títulos.
      // Garante por construção o formato que o writer LLM não entrega de forma
      // consistente (ver sectionSpacingGuard.ts).
      if (effectiveCategory === "MUSCULOESQUELETICO_V2") {
        finalText = normalizeSectionSpacing(finalText);
      }
      } else if (generationPath.guardsMode === "full") {
        // RENDERER (DET-5): único guard que roda é o de COMANDOS do médico —
        // diretivas explícitas ("na conclusão recomendar X") precisam entrar
        // até o DET-6 tratar comandos como operações (review dex1). É
        // determinístico: não quebra a byte-stability (mesmo input → mesmo
        // comando → mesmo texto). DET-6: COMMAND_OPERATIONS roteia pelas ops.
        finalText = applyConfiguredCommands(
          finalText,
          reqInput.consolidated_transcript ?? reqInput.raw_input,
        );
      }
      // Guard de sanitização (universal): remove artefatos de ditado/ASR que
      // vazaram para o texto clínico — "vírgula" falada, "Você vai escrever ...",
      // "Item dos ovários:", despedidas. Preserva conteúdo + placeholders ____.
      // (Boletim 2026-06-17: garble em renderer/v1 e writer.)
      if (generationPath.guardsMode === "full") {
      finalText = sanitizeDictationArtifacts(finalText);
      // Normalização determinística de medidas (universal): abrevia
      // "centímetros"→"cm" / "milímetros"→"mm" e junta dimensões "A por B"→
      // "A x B". Conservador: não força separador decimal. Roda ANTES do sanity
      // de medidas para o flag ver unidades já normalizadas.
      finalText = normalizeMeasures(finalText);
      // Rede de segurança: remove linhas "DUM:" com valor inválido (literal
      // "null", data impossível, IG roteada por engano). O médico apagava.
      finalText = stripInvalidDumLines(finalText);
      // Sanity de medidas: sinaliza [REVISAR] em valores fisiologicamente
      // improváveis (CCN 0,1mm, resíduo 1019ml, dimensão 0,0cm) sem bloquear nem
      // alterar o valor — o médico revisa. (Boletim 2026-06-17.)
      finalText = flagImplausibleMeasures(finalText);
      }
      auditState.outputText = finalText;
      auditState.writerDurationMs = writerResult?.latencyMs ?? 0;
      auditState.systemMessageFull =
        writerResult?.systemMessage ?? auditState.systemMessageFull;
      auditState.openaiInputTokens =
        (auditState.openaiInputTokens ?? 0) + (writerResult?.inputTokens ?? 0);
      auditState.openaiOutputTokens =
        (auditState.openaiOutputTokens ?? 0) +
        (writerResult?.outputTokens ?? 0);
      // DET-1 critério de aceite: confirmar prompt caching ativo via logs.
      // cached_tokens cresce quando o prefixo (system message estável do
      // bundle) é reaproveitado entre requests da mesma categoria/estilo.
      console.log(
        `[generate ${reportId}] writer usage: input=${writerResult?.inputTokens ?? "?"} cached=${writerResult?.cachedInputTokens ?? 0} output=${writerResult?.outputTokens ?? "?"}`,
      );
      await updateRunAfterWriter({
        runId,
        latencyMs: writerResult?.latencyMs ?? 0,
        tokensInput: writerResult?.inputTokens,
        tokensOutput: writerResult?.outputTokens,
        // DET-5: prova de rollout/auditoria — qual caminho montou o laudo
        // (review dex2). O modelo da extração continua em model_structurer.
        modelWriter: useRenderer ? "renderer/v1" : modelConfig.model,
      });

      // ----- 5. Sanity check (observabilidade, NÃO bloqueia) -----
      // Decisão consolidada (commit 9045a09): sanity NÃO bloqueia a entrega.
      // Apenas registra inconsistências em generation_runs pra correção
      // preventiva via prompts. Bloqueio = UX confusa.
      // S21: roda APÓS emit done — usuário não espera os ~2-5s da sanity IA.
      currentStage = "sanity";
      const deterministicSanity = runDeterministicSanity({
        findings,
        finalText,
        // Ditado cru como fonte de input — sem ele, achados vazios (fast-path
        // e pipelines writer/renderer) geram falso "medida não encontrada" e
        // falso critical de RADS (review adversarial 06/07).
        rawInput: reqInput.consolidated_transcript ?? reqInput.raw_input,
      });
      const deterministicOnlySanity =
        sanityResultFromDeterministic(deterministicSanity);
      const postValidatorCriticalIssues = deterministicSanity.issues.filter(
        (issue) =>
          issue.severity === "critical" &&
          (issue.type === "vitalidade_fetal_divergente" ||
            issue.type === "liquido_amniotico_divergente" ||
            issue.type === "metacomando_residual"),
      );
      if (
        env().POST_VALIDATOR_MODE === "block_critical" &&
        postValidatorCriticalIssues.length > 0
      ) {
        throw new Error(
          `POST_VALIDATOR_BLOCKED: ${postValidatorCriticalIssues
            .map((issue) => issue.type)
            .join(",")}`,
        );
      }

      outcome = "success";
      await finalizeReport({
        reportId,
        status: "generated",
        generatedOutput: finalText,
        sanityResult: deterministicOnlySanity,
        metadata:
          pipelineWarnings.length > 0
            ? { pipeline_warnings: pipelineWarnings }
            : undefined,
      });
      // Apple Watch / clientes "publicação direta" — toca updated_at do report
      // para empurrar pro topo do feed da Sala do Auxiliar antes do "done" e da
      // sanity check assíncrona. Trade-off conhecido: laudo
      // pode ser visível na Sala e DEPOIS receber sanity:critical — aceitável
      // no MVP pois a Sala é canal informativo (auxiliar pode aguardar
      // confirmação verbal do médico antes de imprimir).
      if (reqInput.auto_push_to_sala === true) {
        try {
          const { error: pushError } = await getServiceClient()
            .from("reports")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", reportId);
          if (pushError) {
            console.error("[generate] auto_push_to_sala failed:", pushError);
          }
        } catch (pushErr) {
          console.error("[generate] auto_push_to_sala failed:", pushErr);
        }
      }

      emit({
        type: "done",
        ts: nowIso(),
        report_id: reportId,
        final_text: finalText,
      });

      // Esquema visual venoso (side-channel) — roda APÓS o "done", então NÃO
      // atrasa o laudo; fail-safe (extractVenousMap nunca lança). Emite o evento
      // SSE "scheme" com o MapaVenoso; o cliente renderiza o desenho (recolor).
      // O TEXTO do laudo já foi entregue pelo writer — aqui só o DESENHO.
      // Flag VENOUS_SCHEME_MAP (default OFF).
      if (
        env().VENOUS_SCHEME_MAP === "true" &&
        effectiveCategory === "DOPPLER_VENOSO_MMII"
      ) {
        const venousMap = await extractVenousMap(
          reqInput.consolidated_transcript ?? reqInput.raw_input,
          (categoryCode, rawInput, sig) =>
            runRendererExtraction({ categoryCode, rawInput, signal: sig }),
          signal,
        );
        if (venousMap) {
          emit({
            type: "scheme",
            ts: nowIso(),
            exam_type: "VENOSO_MMII",
            // 4 vistas (recolorVenousPixels4) quando a flag liga; senão vista única.
            asset_version:
              env().VENOUS_SCHEME_4VIEW === "true"
                ? "venous-4view-1"
                : "venoso-anterior-1",
            map: venousMap,
          });
        }
      }

      if (modelConfig.provider === "openai") {
        try {
        const { result: aiSanity, latencyMs: sanityMs } = await runSanityCheck({
          findings,
          finalText,
          // Ditado cru = fonte de verdade primária: evita falso "achado
          // inventado" quando o structurer devolve achados vazios mas o
          // writer gera direto do ditado (falso positivo Luiz 06/07).
          rawInput: reqInput.consolidated_transcript ?? reqInput.raw_input,
        });
        const sanity = mergeSanityResults(aiSanity, deterministicSanity);
        auditState.sanityDurationMs = sanityMs;
        auditState.sanityResult = sanity;
        await updateRunAfterSanity({ runId, sanity, latencyMs: sanityMs });
        await finalizeReport({
          reportId,
          status: "generated",
          generatedOutput: finalText,
          sanityResult: sanity,
          metadata:
            pipelineWarnings.length > 0
              ? { pipeline_warnings: pipelineWarnings }
              : undefined,
        });
        emit({ type: "sanity", ts: nowIso(), result: sanity });
        if (sanity.verdict !== "ok") {
          emit({
            type: "sanity_warning",
            ts: nowIso(),
            issues: sanity.issues,
            severity: sanity.verdict === "critical" ? "blocker" : "warning",
          });
        }
        } catch (e) {
          console.error("runSanityCheck failed after done:", e);
        }
      }
    } catch (err) {
      // AbortError vem quando cliente fecha conexão
      if ((err as Error).name === "AbortError") {
        outcome = "aborted";
        errorMessage = "client disconnected";
        auditState.errorCode = "ABORTED";
        auditState.errorMessage = errorMessage;
        auditState.errorStage = currentStage;
      } else {
        outcome = "error";
        errorMessage = err instanceof Error ? err.message : String(err);
        auditState.errorCode = "PIPELINE_FAILURE";
        auditState.errorMessage = errorMessage;
        auditState.errorStage = currentStage;
        emit({
          type: "error",
          ts: nowIso(),
          code: "PIPELINE_FAILURE",
          message: errorMessage,
        });
        // O report foi inserido como `draft` no começo do pipeline. Falhando
        // aqui, ele ficava `draft` PARA SEMPRE — indistinguível de um rascunho
        // legítimo, e contando como laudo criado nas métricas. Produção tinha 29
        // linhas assim em 10/08.
        //
        // `discarded` já existe no enum `report_status`, então não há migration.
        // A `generation_run` continua sendo finalizada no `finally` com
        // `outcome='error'` — a auditoria do porquê não se perde.
        //
        // De propósito FORA do ramo AbortError: cancelar não é descartar. O
        // médico pode retomar depois (ver `loadReportForResume`), e marcar o
        // report como descartado mataria essa retomada.
        try {
          await markReportStatus({ reportId, status: "discarded" });
        } catch (e) {
          // Best-effort: se o banco caiu, o erro original é o que importa
          // reportar. Engolir aqui evita mascarar a causa raiz com um segundo
          // erro de persistência.
          console.error("markReportStatus(discarded) failed:", e);
        }
      }
    } finally {
      auditState.totalDurationMs = Date.now() - t0;
      auditState.openaiCostUsd = estimateCost(
        auditState.openaiInputTokens ?? 0,
        auditState.openaiOutputTokens ?? 0,
      );
      // Sempre fechar a generation_run pra ter auditoria
      if (runId) {
        try {
          currentStage = "finalize";
          await finalizeRun({
            runId,
            outcome,
            latencyMsTotal: Date.now() - t0,
            errorMessage,
          });
        } catch (e) {
          console.error("finalizeRun failed:", e);
        }
      }
      if (auditEnabled) {
        scheduleAuditPersist(auditState);
      }
    }
  });
}

function mergeSanityResults(
  aiSanity: SanityResult,
  deterministic: ReturnType<typeof runDeterministicSanity>,
): SanityResult {
  const deterministicIssues = deterministic.issues.map(toSanityIssue);
  const issues = [...aiSanity.issues, ...deterministicIssues];
  const verdict = deterministic.hardBlocked
    ? "critical"
    : issues.some((issue) => issue.severity === "critical")
      ? "critical"
      : issues.some((issue) => issue.severity === "warning")
        ? "warning"
        : aiSanity.verdict;

  const deterministicSummary =
    deterministicIssues.length > 0
      ? `Checks determinísticos: ${deterministicIssues.length} issue(s).`
      : "Checks determinísticos: sem divergências.";

  return {
    verdict,
    issues,
    summary: [aiSanity.summary, deterministicSummary].filter(Boolean).join(" "),
  };
}

function sanityResultFromDeterministic(
  deterministic: ReturnType<typeof runDeterministicSanity>,
): SanityResult {
  const issues = deterministic.issues.map(toSanityIssue);
  const verdict = deterministic.hardBlocked
    ? "critical"
    : issues.some((issue) => issue.severity === "warning")
      ? "warning"
      : "ok";

  return {
    verdict,
    issues,
    summary:
      issues.length > 0
        ? `Checks determinísticos: ${issues.length} issue(s).`
        : "Checks determinísticos: sem divergências.",
  };
}

function toSanityIssue(issue: DeterministicIssue): SanityIssue {
  return {
    type: mapDeterministicIssueType(issue.type),
    severity: issue.severity,
    detail: `[determinístico] ${issue.detail}`,
    trecho_laudo: issue.trecho_laudo,
    campo_achado: issue.campo_achado,
  };
}

function mapDeterministicIssueType(
  type: DeterministicIssue["type"],
): SanityIssue["type"] {
  if (type === "placeholder_vazado") return "formato_quebrado";
  // rads_divergente é semanticamente equivalente a comando_ignorado:
  // classificação ditada pelo médico foi substituída/inventada.
  // Detalhe completo preservado em `detail`.
  if (type === "rads_divergente") return "comando_ignorado";
  if (
    type === "vitalidade_fetal_divergente" ||
    type === "liquido_amniotico_divergente" ||
    type === "metacomando_residual"
  ) {
    return "outro";
  }
  if (type === "categoria_especifica") return "outro";
  return type;
}

function scheduleAuditPersist(state: GenerationAuditState) {
  try {
    after(() => persistAudit(state));
  } catch {
    void persistAudit(state);
  }
}

/**
 * DET-6 — roteia as diretivas de conclusão do médico pelo aplicador de
 * OPERAÇÕES tipadas quando a flag COMMAND_OPERATIONS está ligada; senão usa o
 * commandGuard legado. Drop-in determinístico (mesma assinatura).
 */
function applyConfiguredCommands(laudo: string, rawInput: string): string {
  return env().COMMAND_OPERATIONS === "true"
    ? applyCommandOperations(laudo, rawInput)
    : applyCommandGuard(laudo, rawInput);
}
