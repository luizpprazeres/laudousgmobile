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
import { clinicalRendererFallbackBlocked } from "../fallbackPolicy";

const routePath = resolve(process.cwd(), "apps/api/src/app/api/generate/route.ts");
const compiled = ts.transpileModule(readFileSync(routePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const category = "ABDOMEN_TOTAL_DOPPLER";
const incompleteAbdomen = { ...shared.createInitialClinicalModelInput(category), abdomenReport: "" };
const incompletePortal = shared.createInitialClinicalModelInput(category);
const completeAbdomen = { ...incompletePortal, portalVein: { caliberCm: 1.2, velocityCms: 20, flow: "hepatopetal" } };
type Event = { type: string; code?: string; message?: string; final_text?: string };
type Scenario = { category?: string; detectedCategory?: string; rendererCategories?: string; hard?: boolean; fast?: boolean; extracted?: unknown; writerV2?: boolean; knownStructured?: boolean };

async function execute(scenario: Scenario) {
  const selected = scenario.category ?? category;
  const detected = scenario.detectedCategory ?? selected;
  const config = { RENDERER_CATEGORIES: scenario.rendererCategories ?? category,
    DOPPLER_STANDALONE_V2: "false", HARD_MODE_ENABLED: "true", FAST_PATH_DEFAULT: "false",
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
      getKnownCategories: async () => ({ codes: new Set([...(scenario.knownStructured === false ? [] : [category]), "ABDOMEN_TOTAL", "LIVRE", "TESTE"]), labels: new Map() }),
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
    "@/server/clinicalReports/fallbackPolicy": { clinicalRendererFallbackBlocked },
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
  const module = { exports: {} as { POST: (req: Request) => Promise<Response> } };
  runInNewContext(compiled, { module, exports: module.exports, Request, Response, AbortController, crypto, console: { log() {}, warn() {}, error(...args: unknown[]) { errors.push(args.map(String).join(" ")); } },
    require: (id: string) => new Proxy(mocks[id] ?? {}, { get(target, property: string) {
      if (property in target) return target[property];
      if (property === "__esModule") return true;
      if (identities.has(property)) return (text: string) => text;
      return () => { throw new Error(`Unexpected harness dependency: ${id}.${property}`); };
    } }),
  }, { filename: routePath });
  await module.exports.POST(new Request("http://localhost/api/generate", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ category_hint: selected, raw_input: "Synthetic dictated examination", mode: scenario.hard ? "hard" : "standard",
      fast_path: scenario.fast ?? false, writing_style_id: "11111111-1111-4111-8111-111111111111" }),
  }));
  return { events, statuses, writerCalls, writerV2Calls, rendererCalls, errors };
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
  for (const scenario of [{ rendererCategories: "" }, { hard: true }, { detectedCategory: "ABDOMEN_TOTAL" }]) {
    const result = await execute(scenario);
    assert.equal(result.rendererCalls, 0);
    assert.equal(result.writerCalls, 0);
    assert(result.events.some(e => e.type === "error" && /free writer blocked/.test(e.message ?? "")));
    assert(!result.events.some(e => e.type === "token" || e.type === "done"));
    assert(!result.statuses.includes("generated"));
    checks++;
  }
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
  console.log(`✓ generate fail-closed: ${checks}/${checks} route scenarios passed (local DB/LLM doubles)`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
