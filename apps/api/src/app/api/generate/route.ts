import { GenerateRequestSchema } from "@laudousg/shared";
import { after } from "next/server";
import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { sseResponse, nowIso } from "@/server/sse/stream";
import { getServiceClient } from "@/server/supabaseService";
export { OPTIONS } from "@/server/cors";
import { runStructurer } from "@/server/pipeline/structurer";
import { runValidator } from "@/server/pipeline/validator";
import { runRetriever } from "@/server/pipeline/retriever";
import { runWriterStream } from "@/server/pipeline/writer";
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
import { applyClarifyAnswers } from "@/server/pipeline/clarifyMerge";
import type {
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
} from "@/server/db/lookups";
import { env } from "@/server/env";
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

  const reqInput = parsed.data;
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

      let findings: StructuredFindings;

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
        auditState.category = findings.categoria_detectada;
        auditState.contractHash = contractHashFor(
          findings.categoria_detectada,
          effectiveWritingStyleId,
        );
        auditState.structuredOutput = findings;
        // Registra na run que veio de resume + os findings aplicados (auditoria)
        await updateRunAfterStructurer({
          runId,
          structured: findings,
          latencyMs: 0, // resume não tem structurer
        });
        await updateReportStructured({
          reportId,
          structured: findings,
          categoryCode: findings.categoria_detectada,
        });
        await markReportStatus({ reportId, status: "draft" });
        emit({ type: "structured", ts: nowIso(), payload: findings });
      } else {
        // FLUXO NORMAL: persistir report=draft + run inicial + structurer
        await insertDraftReport({
          id: reportId,
          userId: user.id,
          categoryCode: reqInput.category_hint ?? "ABDOMEN_TOTAL",
          writingStyleId: reqInput.writing_style_id,
          rawInput: reqInput.raw_input,
          consolidatedTranscript: reqInput.consolidated_transcript ?? null,
        });
        runId = await insertOpenRun({
          reportId,
          rawInputForRagQuery:
            reqInput.consolidated_transcript ?? reqInput.raw_input,
        });
        auditState.reportId = reportId;

        // ----- 1. Structurer -----
        currentStage = "structurer";
        const structured = await runStructurer({
          rawInput: reqInput.consolidated_transcript ?? reqInput.raw_input,
          categoryHint: reqInput.category_hint,
          signal,
        });
        findings = structured.findings;
        auditState.category = findings.categoria_detectada;
        auditState.contractHash = contractHashFor(
          findings.categoria_detectada,
          effectiveWritingStyleId,
        );
        auditState.structuredOutput = findings;
        auditState.structurerDurationMs = structured.latencyMs;
        auditState.openaiInputTokens =
          (auditState.openaiInputTokens ?? 0) + (structured.inputTokens ?? 0);
        auditState.openaiOutputTokens =
          (auditState.openaiOutputTokens ?? 0) + (structured.outputTokens ?? 0);
        await updateRunAfterStructurer({
          runId,
          structured: findings,
          latencyMs: structured.latencyMs,
        });
        await updateReportStructured({
          reportId,
          structured: findings,
          categoryCode: findings.categoria_detectada,
        });
        emit({ type: "structured", ts: nowIso(), payload: findings });
      }

      // ----- 2. Validator -----
      // Fix codex #2: passar categorias conhecidas do DB (não Set vazio).
      currentStage = "validator";
      const validatorT0 = Date.now();
      const validator = runValidator({
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

      // ----- 3. Retriever -----
      currentStage = "retriever";
      const ragT0 = Date.now();
      const { blocks, skipped, queryText, warning } = await runRetriever({
        findings,
        categoryCode: findings.categoria_detectada,
        writingStyleId: effectiveWritingStyleId,
        signal,
      });
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
        blocks_used: blocks.map((b) => b.id),
        blocks_summary: blocks.map((b) => ({
          id: b.id,
          kind: b.kind,
          title: b.title,
          priority: b.priority,
        })),
      });

      // Fix codex T7 MÉDIO #2: emitir warning como SSE event E persistir
      // em report.generation_metadata pra auditoria.
      // (Em prod, podemos endurecer aqui — categoria-piloto sem RAG é red flag.)
      const pipelineWarnings: { code: string; message: string }[] = [];
      if (warning) {
        console.warn(`[generate ${reportId}] ${warning.code}: ${warning.message}`);
        emit({
          type: "warning",
          ts: nowIso(),
          code: warning.code,
          message: warning.message,
        });
        pipelineWarnings.push(warning);
      }

      // ----- 4. Writer (stream) -----
      // Fix codex #4: resolver writing_style code + category label do DB.
      currentStage = "writer";
      const writerGen = runWriterStream({
        findings,
        ragBlocks: blocks,
        writingStyleCode: styleRow.code,
        categoryLabel:
          categoriesInfo.labels.get(findings.categoria_detectada) ??
          findings.categoria_detectada,
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
          }
        | undefined;
      while (true) {
        const next = await writerGen.next();
        if (next.done) {
          writerResult = next.value;
          break;
        }
        finalText += next.value;
        emit({ type: "token", ts: nowIso(), delta: next.value });
      }
      finalText = writerResult?.fullText ?? finalText;
      auditState.outputText = finalText;
      auditState.writerDurationMs = writerResult?.latencyMs ?? 0;
      auditState.systemMessageFull =
        writerResult?.systemMessage ?? auditState.systemMessageFull;
      auditState.openaiInputTokens =
        (auditState.openaiInputTokens ?? 0) + (writerResult?.inputTokens ?? 0);
      auditState.openaiOutputTokens =
        (auditState.openaiOutputTokens ?? 0) +
        (writerResult?.outputTokens ?? 0);
      await updateRunAfterWriter({
        runId,
        latencyMs: writerResult?.latencyMs ?? 0,
        tokensInput: writerResult?.inputTokens,
        tokensOutput: writerResult?.outputTokens,
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
      });
      const deterministicOnlySanity =
        sanityResultFromDeterministic(deterministicSanity);

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
      emit({
        type: "done",
        ts: nowIso(),
        report_id: reportId,
        final_text: finalText,
      });

      // Apple Watch / clientes "publicação direta" — toca updated_at do report
      // para empurrar pro topo do feed da Sala do Auxiliar imediatamente após
      // o "done", antes da sanity check assíncrona. Trade-off conhecido: laudo
      // pode ser visível na Sala e DEPOIS receber sanity:critical — aceitável
      // no MVP pois a Sala é canal informativo (auxiliar pode aguardar
      // confirmação verbal do médico antes de imprimir).
      if (reqInput.auto_push_to_sala === true) {
        try {
          await getServiceClient()
            .from("reports")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", reportId);
        } catch (pushErr) {
          console.error("[generate] auto_push_to_sala failed:", pushErr);
        }
      }

      try {
        const { result: aiSanity, latencyMs: sanityMs } = await runSanityCheck({
          findings,
          finalText,
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
