/** Executes the actual POST handler; DB/LLM/stream transport are local doubles. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as shared from "@laudousg/shared";
import * as requestedExam from "../../pipeline/requestedExam";
import { resolveEffectiveCategory } from "../../pipeline/effectiveCategory";
import { resolveGenerationPath, rendererCategoryEnabled } from "../../pipeline/generationPathResolver";
import { decidirDescarte } from "../../pipeline/descarteDecision";
import { loadSpecV2 } from "../../pipeline/writerV2/loadSpec";
import { CLINICAL_MODEL_EXTRACTORS } from "../../renderer/categories/CLINICAL_MODELS_V1";
import { RENDERER_SUPPORTED_CATEGORIES, RENDERER_PROGRAMMATIC_CATEGORIES } from "../../renderer/extraction";
import * as fallbackPolicy from "../fallbackPolicy";
import { isDopplerRenalAuditError } from "../../pipeline/dopplerRenalWriterAudit";

const routePath = resolve(process.cwd(), "apps/api/src/app/api/generate/route.ts");
const compiled = ts.transpileModule(readFileSync(routePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const category = "ABDOMEN_TOTAL_DOPPLER";
const incompleteAbdomen = { ...shared.createInitialClinicalModelInput(category), abdomenReport: "" };
const incompletePortal = shared.createInitialClinicalModelInput(category);
const completeAbdomen = { ...incompletePortal, portalVein: { caliberCm: 1.2, velocityCms: 20, flow: "hepatopetal" } };
type Event = { type: string; code?: string; message?: string; final_text?: string };
type Scenario = { category?: string | null; rawInput?: string; detectedCategory?: string; rendererCategories?: string; renalEnabled?: boolean; hard?: boolean; fast?: boolean; extracted?: unknown; writerV2?: boolean; knownStructured?: boolean };

async function execute(scenario: Scenario) {
  const selected = scenario.category === null ? undefined : scenario.category ?? category;
  const detected = scenario.detectedCategory ?? selected ?? "ABDOMEN_TOTAL";
  const config = { RENDERER_CATEGORIES: scenario.rendererCategories ?? category,
    DOPPLER_STANDALONE_V2: "false", DOPPLER_RENAL_WRITER_ENABLED: scenario.renalEnabled === false ? "false" : "true",
    HARD_MODE_ENABLED: "true", FAST_PATH_DEFAULT: "false",
    GENERATION_AUDIT_ENABLED: "false", WRITER_V2_CATEGORIES: scenario.writerV2 ? "ABDOMEN_TOTAL" : "", WRITER_V2_USER_ID: scenario.writerV2 ? "synthetic-user" : "",
    WRITER_V2_ABDOME_USER_ID: "", COMMAND_OPERATIONS: "false", OPENAI_MODEL_WRITER: "test" };
  const events: Event[] = [];
  const statuses: string[] = [];
  const errors: string[] = [];
  let writerCalls = 0;
  let writerV2Calls = 0;
  let rendererCalls = 0;
  const noOp = async () => undefined;
  const identities = new Set(["normalizeAsrTranscript", "enforceStatedAmnioticClass", "stripSpuriousMagnitudeFlags",
    "applyVolumePolicy", "applyDsmPolicy", "applyCommandGuard", "removeEmptyConclusionItems",
    "sanitizeDictationArtifacts", "normalizeMeasures", "stripInvalidDumLines", "flagImplausibleMeasures"]);
  const mocks: Record<string, Record<string, unknown>> = {
    openai: { default: class SyntheticOpenAI {} },
    "@laudousg/shared": shared,
    "@/server/env": { env: () => config },
    "@/server/auth/verifyJwt": { verifyJwt: async () => ({ id: "synthetic-user" }) },
    "@/server/sse/stream": { nowIso: () => "2026-10-02T15:00:00Z",
      sseResponse: async (callback: (writer: { emit: (event: Event) => void }, signal: AbortSignal) => Promise<void>) => {
        await callback({ emit: event => events.push(event) }, new AbortController().signal);
        return new Response(JSON.stringify(events));
      } },
    "@/server/pipeline/requestedExam": requestedExam,
    "@/server/pipeline/effectiveCategory": { resolveEffectiveCategory },
    "@/server/pipeline/generationPathResolver": {
      resolveGenerationPath: (ctx: Parameters<typeof resolveGenerationPath>[0]) => resolveGenerationPath(ctx, config),
      rendererCategoryEnabled: (code: string) => rendererCategoryEnabled(code, config),
    },
    "@/server/pipeline/structurer": { runStructurer: async () => ({ findings: {
      schema_version: "v1", categoria_detectada: detected, tipo_exame: detected, achados: scenario.extracted ?? incompleteAbdomen,
      comandos_do_medico: [], trechos_confusos: [], nivel_de_confianca: "alta",
    }, latencyMs: 0 }) },
    "@/server/pipeline/validator": { runValidator: () => ({ ok: true, questions: [], issues: [] }) },
    "@/server/pipeline/modelResolver": { resolveWriterModel: () => ({ model: "synthetic", provider: "test" }) },
    "@/server/pipeline/writerV2/loadSpec": { loadSpecV2 },
    "@/server/pipeline/writerV2/runWriterV2": { runWriterV2: async () => {
      writerV2Calls++;
      return { laudo: "Synthetic V2 output", reparou: false, divergencias: [] };
    } },
    "@/server/pipeline/bundleLoader": { loadDeterministicBundle: async () => ({ blocks: [], error: null }) },
    "@/server/db/lookups": {
      getWritingStyleById: async () => ({ active: true, code: "CLASSICO_COMPLETO" }),
      getKnownCategories: async () => ({ codes: new Set([...(scenario.knownStructured === false ? [] : [category, ...(selected ? [selected] : [])]), "ABDOMEN_TOTAL", "LIVRE", "TESTE"]), labels: new Map() }),
      resolveAccountReportPreference: async () => ({ rendererPreferences: {} }),
      getVariantTemplateBody: async () => "synthetic-template",
    },
    "@/server/db/reportsRepo": { insertDraftReport: noOp, updateReportStructured: noOp, updateReportRagBlocks: noOp,
      finalizeReport: async (args: { status: string }) => { statuses.push(args.status); },
      markReportStatus: async (args: { status: string }) => { statuses.push(args.status); } },
    "@/server/db/runsRepo": { insertOpenRun: async () => "synthetic-run", updateRunAfterStructurer: noOp,
      updateRunAfterRetriever: noOp, updateRunAfterWriter: noOp, finalizeRun: noOp },
    "@/server/db/productEventsRepo": { recordProductEvent: noOp, surfaceFromRequest: () => "web" },
    "@/server/db/auditRepo": { estimateCost: () => 0 },
    "@/server/prompts/version": { contractHashFor: () => "synthetic", PROMPT_VERSION: "test" },
    "@/server/prompts/obstetricaPlainPolicy": { obstetricaPlainConflictWarning: () => null, obstetricaPlainOutputWarning: () => null },
    "@/server/renderer/extraction": { RENDERER_SUPPORTED_CATEGORIES, RENDERER_PROGRAMMATIC_CATEGORIES },
    "@/server/renderer/catalog/registry": { ehDerivado: () => false },
    "@/server/customization/resolve": { resolverPersonalizacao: async () => ({ aplicar: false }) },
    "@/server/clinicalReports/fallbackPolicy": fallbackPolicy,
    "@/server/pipeline/dopplerRenalWriterAudit": { isDopplerRenalAuditError },
    "@/server/pipeline/descarteDecision": { decidirDescarte },
    "@/server/pipeline/renderer": { runRendererStream: async function* (args: { categoryCode: string }) {
      rendererCalls++;
      if (args.categoryCode !== category) throw new Error("Synthetic ordinary renderer failure");
      // Real extraction parser + clinical validator/renderer; no copied validation rule.
      const findings = CLINICAL_MODEL_EXTRACTORS[category]!.parse(scenario.extracted ?? incompleteAbdomen);
      const fullText = shared.renderClinicalModelReport(findings);
      yield fullText;
      return { fullText, latencyMs: 0, systemMessage: "synthetic-renderer" };
    } },
    "@/server/pipeline/writer": { runWriterStream: async function* () {
      writerCalls++;
      yield "Synthetic free writer output";
      return { fullText: "Synthetic free writer output", latencyMs: 0, systemMessage: "synthetic-writer" };
    } },
    "@/server/pipeline/deterministicSanity": { runDeterministicSanity: () => ({ issues: [], hardBlocked: false }) },
  };
  const commonJsModule = { exports: {} as { POST: (req: Request) => Promise<Response> } };
  runInNewContext(compiled, { module: commonJsModule, exports: commonJsModule.exports, Request, Response, AbortController, crypto, console: { log() {}, warn() {}, error(...args: unknown[]) { errors.push(args.map(String).join(" ")); } },
    require: (id: string) => new Proxy(mocks[id] ?? {}, { get(target, property: string) {
      if (property in target) return target[property];
      if (property === "__esModule") return true;
      if (identities.has(property)) return (text: string) => text;
      return () => { throw new Error(`Unexpected harness dependency: ${id}.${property}`); };
    } }),
  }, { filename: routePath });
  const body = JSON.stringify({ category_hint: selected, raw_input: scenario.rawInput ?? "Synthetic dictated examination", mode: scenario.hard ? "hard" : "standard",
    fast_path: scenario.fast ?? false, writing_style_id: "11111111-1111-4111-8111-111111111111" });
  await commonJsModule.exports.POST(new Request("http://localhost/api/generate", { method: "POST", headers: { "content-type": "application/json" },
    body,
  }));
  return { events, statuses, writerCalls, writerV2Calls, rendererCalls, errors, requestHadHint: Object.hasOwn(JSON.parse(body), "category_hint") };
}

async function main() {
  let checks = 0;
  for (const extracted of [incompleteAbdomen, incompletePortal]) {
    for (const fast of [false, true]) {
      const result = await execute({ extracted, fast });
      assert.equal(result.rendererCalls, 1, "real route must reach the structured renderer");
      assert.equal(result.writerCalls, 0, "incomplete extraction must never invoke free writer");
      assert(result.events.some(e => e.type === "error" && e.code === "PIPELINE_FAILURE" && /80 character|Veia porta exige/.test(e.message ?? "")));
      assert(!result.events.some(e => e.type === "token" || e.type === "done" || e.code === "RENDERER_FALLBACK"));
      assert(!result.statuses.includes("generated"));
      checks++;
    }
  }
  // Modelos aprovados não dependem mais da allowlist histórica, e o modo hard
  // não pode contornar o contrato estruturado.
  for (const scenario of [{ rendererCategories: "" }, { hard: true }]) {
    const result = await execute(scenario);
    assert.equal(result.rendererCalls, 1);
    assert.equal(result.writerCalls, 0);
    assert(result.events.some(e => e.type === "error" && /80 character|Veia porta exige/.test(e.message ?? "")));
    assert(!result.events.some(e => e.type === "token" || e.type === "done"));
    assert(!result.statuses.includes("generated"));
    checks++;
  }
  const renalRollback = await execute({
    category: "DOPPLER_RENAL",
    detectedCategory: "DOPPLER_RENAL",
    rendererCategories: "DOPPLER_RENAL",
    renalEnabled: false,
  });
  assert.equal(renalRollback.rendererCalls, 0, "rollback renal desliga o writer dedicado");
  assert.equal(renalRollback.writerCalls, 0, "rollback renal nunca abre o writer geral");
  assert(renalRollback.events.some(e => e.type === "error" && /free writer blocked/.test(e.message ?? "")));
  assert(!renalRollback.events.some(e => e.type === "token" || e.type === "done"));
  assert(!renalRollback.statuses.includes("generated"));
  checks++;
  const complete = await execute({ extracted: completeAbdomen });
  assert.equal(complete.rendererCalls, 1);
  assert.equal(complete.writerCalls, 0);
  assert(complete.events.some(e => e.type === "done" && /veia porta/i.test(e.final_text ?? "")));
  checks++;
  for (const selected of ["LIVRE", "TESTE", "ABDOMEN_TOTAL"]) {
    const result = await execute({ category: selected, rendererCategories: "" });
    assert.equal(result.writerCalls, 1, `${selected}: direct writer must remain available`);
    assert(result.events.some(e => e.type === "done"));
    checks++;
  }
  const fallback = await execute({ category: "ABDOMEN_TOTAL", rendererCategories: "ABDOMEN_TOTAL" });
  assert.equal(fallback.rendererCalls, 1);
  assert.equal(fallback.writerCalls, 1, "ordinary abdomen keeps its legitimate fallback");
  assert(fallback.events.some(e => e.code === "RENDERER_FALLBACK"));
  assert(fallback.events.some(e => e.type === "done"));
  checks++;
  const unavailable = await execute({ knownStructured: false, writerV2: true, fast: true });
  assert.equal(unavailable.writerV2Calls, 0, "clamping an unavailable structured hint to ordinary abdomen must not open writer V2");
  assert.equal(unavailable.writerCalls, 0);
  assert(unavailable.events.some(e => e.type === "error" && /free writer blocked/.test(e.message ?? "")));
  assert(!unavailable.events.some(e => e.type === "token" || e.type === "done"));
  checks++;
  const ordinaryV2 = await execute({ category: "ABDOMEN_TOTAL", writerV2: true });
  assert.equal(ordinaryV2.writerV2Calls, 1, `legitimate ordinary abdomen V2 must remain available: ${ordinaryV2.errors.join("\n")}`);
  assert(ordinaryV2.events.some(e => e.type === "done" && e.final_text === "Synthetic V2 output"));
  checks++;
  for (const hint of [null, "ABDOME_TOTAL_DOPPLER", category, "ABDOMEN_TOTAL"] as const) {
    for (const fast of [false, true]) {
      const result = await execute({ category: hint, rawInput: "Ultrassonografia de abdome total com Doppler. Dados incompletos.", detectedCategory: "ABDOMEN_TOTAL", writerV2: true, fast });
      assert.equal(result.requestHadHint, hint !== null, "null scenario must really omit category_hint from HTTP body");
      assert.equal(result.writerV2Calls, 0, `${hint}: no premature V2 before Doppler resolution`);
      assert.equal(result.writerCalls, 0, `${hint}: ordinary detection must not open writer or fallback`);
      assert.equal(result.rendererCalls, 1, "deterministic intent must preserve the structured renderer");
      assert(result.events.some(e => e.type === "error" && /80 character/.test(e.message ?? "")));
      assert(!result.events.some(e => e.type === "token" || e.type === "done" || e.code === "RENDERER_FALLBACK"));
      assert(!result.statuses.includes("generated"));
      checks++;
    }
  }
  for (const rendererCategories of [category, ""]) {
    const alias = await execute({ category: "ABDOME_TOTAL_DOPPLER", detectedCategory: "ABDOMEN_TOTAL", writerV2: true, rendererCategories });
    assert.equal(alias.writerV2Calls, 0);
    assert.equal(alias.writerCalls, 0, "alias alone preserves intent without an explicit title");
    assert(alias.events.some(e => e.type === "error"));
    assert(!alias.events.some(e => e.type === "token" || e.type === "done"));
    checks++;
  }
  for (const hint of [null, "ABDOME_TOTAL"] as const) {
    const ordinary = await execute({ category: hint, detectedCategory: "ABDOMEN_TOTAL", writerV2: true });
    assert.equal(ordinary.requestHadHint, hint !== null);
    assert.equal(ordinary.writerV2Calls, 0, "missing/aliased hint cannot opt into early V2 even for ordinary input");
    assert.equal(ordinary.writerCalls, 1, "ordinary input still reaches the legitimate writer after category resolution");
    assert(ordinary.events.some(e => e.type === "done"));
    checks++;
  }
  // Detector contextual: "abdômen" acentuado preserva o contrato; título negado ou
  // de exame anterior não sequestra um abdome total comum.
  for (const hint of [null, "ABDOMEN_TOTAL"] as const) {
    const accented = await execute({ category: hint, rawInput: "ULTRASSONOGRAFIA DO ABDÔMEN TOTAL COM DOPPLER. Dados incompletos.", detectedCategory: "ABDOMEN_TOTAL", writerV2: true });
    assert.equal(accented.writerCalls + accented.writerV2Calls, 0, `${hint}: abdômen com Doppler não abre writer`);
    assert.equal(accented.rendererCalls, 1, `${hint}: abdômen com Doppler chega ao renderer estruturado`);
    assert(!accented.events.some(e => e.type === "token" || e.type === "done"));
    checks++;
    for (const rawInput of [
      "Ultrassonografia de abdome total. Não foi realizado abdome total com Doppler.",
      "Ultrassonografia de abdome total. Exame anterior de abdome total com Doppler sem alterações.",
      "Abdome total. Comparado ao abdômen total com Doppler de 2024, fígado inalterado.",
    ]) {
      const ordinary = await execute({ category: hint, rawInput, detectedCategory: "ABDOMEN_TOTAL", rendererCategories: "" });
      assert.equal(ordinary.rendererCalls, 0, `${hint}: menção negada/anterior não força o contrato: ${rawInput}`);
      assert.equal(ordinary.writerCalls, 1, `${hint}: abdome total comum segue no writer legítimo: ${ordinary.errors.join("\n")}`);
      assert(ordinary.events.some(e => e.type === "done"));
      checks++;
    }
  }
  assert(fallbackPolicy.clinicalRendererFallbackBlocked("ABDOME_TOTAL_DOPPLER"));
  assert.equal(fallbackPolicy.earlyWriterV2Allowed(undefined, new Set(["ABDOMEN_TOTAL"])), false);
  assert.equal(fallbackPolicy.earlyWriterV2Allowed("ABDOMEN_TOTAL", new Set()), false);
  assert.equal(fallbackPolicy.earlyWriterV2Allowed("ABDOME_TOTAL", new Set(["ABDOME_TOTAL"])), false);
  assert.equal(fallbackPolicy.structuredClinicalIntent(undefined, "Abdome total sem Doppler"), undefined);
  assert.equal(fallbackPolicy.structuredClinicalIntent(undefined, "Avaliar Doppler da veia porta"), undefined);
  console.log(`✓ generate fail-closed: ${checks}/${checks} route scenarios passed (local DB/LLM doubles)`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
