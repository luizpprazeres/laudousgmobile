/**
 * LAUDO LIVRE ROTEADO — contrato do roteador, do writer OpenAI e do
 * metadata auditável. Sem rede: o cliente OpenAI é substituído por fakes.
 *
 *   tsx --tsconfig apps/api/tsconfig.json apps/api/src/server/pipeline/__tests__/livreRouter.manual.ts
 */
import assert from "node:assert/strict";
import OpenAI from "openai";
import {
  assertLivreProviderConfigured,
  LivreRoutingError,
} from "../../ai/livreProvider";
import { streamOpenAILivreWriter } from "../../ai/writerClient";
import { resolveGenerationPath } from "../generationPathResolver";
import { resolveLivreWriterModel, resolveWriterModel } from "../modelResolver";
import {
  buildLivreRoutingMetadata,
  buildRouterSystemPrompt,
  eligibleRouterCategories,
  interpretRouterOutput,
  LIVRE_ROUTED_GENERATION_PATH,
  readPersistedLivreRouting,
  routedCategoryIncompatible,
  routerJsonSchema,
  routingFailure,
  runLivreRouter,
  shouldRouteFreeCategory,
} from "../livreRouter";

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed += 1;
  console.log(`✓ ${name}`);
}
async function rejectsWith(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (err: unknown) => err instanceof LivreRoutingError && err.code === code);
}

const routerConfig = {
  OPENAI_API_KEY: "sk-test",
  LIVRE_OPENAI_MODEL: "gpt-6-luna",
  LIVRE_OPENAI_REASONING_EFFORT: "none" as const,
  LIVRE_ROUTER_MIN_CONFIDENCE: 0.8,
};
const labels = new Map([
  ["ABDOMEN_TOTAL", "Abdome total"],
  ["ABDOMEN_SUPERIOR", "Abdome superior"],
  ["TIREOIDE", "Tireoide"],
  ["DOPPLER_RENAL", "Doppler renal"],
  ["LIVRE", "Livre"],
  ["TESTE", "Teste"],
  ["MUSCULOESQUELETICO_RARAS", "MSK raras"],
]);
const categories = eligibleRouterCategories(labels.keys(), labels);
const eligible = new Set(categories.map((c) => c.code));

type ChatCompletion = OpenAI.Chat.Completions.ChatCompletion;

function fakeCreate(response: Partial<ChatCompletion>, seen?: { params?: unknown }) {
  return {
    chat: {
      completions: {
        create: async (params: unknown) => {
          if (seen) seen.params = params;
          return {
            id: "chatcmpl-test",
            object: "chat.completion",
            created: 0,
            model: "gpt-6-luna",
            choices: [{
              index: 0,
              finish_reason: "stop",
              logprobs: null,
              message: { role: "assistant", content: "", refusal: null, annotations: [] },
            }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            ...response,
          };
        },
      },
    },
  } as unknown as Pick<OpenAI, "chat">;
}
function jsonText(value: unknown): Partial<ChatCompletion> {
  return {
    choices: [{
      index: 0,
      finish_reason: "stop",
      logprobs: null,
      message: { role: "assistant", content: JSON.stringify(value), refusal: null, annotations: [] },
    }],
  };
}

function fakeStream(
  chunks: string[],
  final: { finishReason?: string; refusal?: boolean } = {},
  seen?: { params?: unknown },
) {
  return {
    chat: {
      completions: {
        create: async (params: unknown) => {
          if (seen) seen.params = params;
          return {
            async *[Symbol.asyncIterator]() {
              for (const text of chunks) {
                yield {
                  choices: [{ index: 0, finish_reason: null, delta: { content: text } }],
                  usage: null,
                };
              }
              yield {
                choices: [{
                  index: 0,
                  finish_reason: final.finishReason ?? "stop",
                  delta: final.refusal ? { refusal: "refused" } : {},
                }],
                usage: {
                  prompt_tokens: 100,
                  completion_tokens: 20,
                  total_tokens: 120,
                  prompt_tokens_details: { cached_tokens: 0 },
                },
              };
            },
          };
        },
      },
    },
  } as unknown as Pick<OpenAI, "chat">;
}
async function drain(gen: AsyncGenerator<string, unknown, void>) {
  let text = "";
  for (;;) {
    const next = await gen.next();
    if (next.done) return { text, result: next.value };
    text += next.value;
  }
}
const lunaConfig = {
  provider: "openai" as const,
  model: "gpt-6-luna",
  reasoningEffort: "none",
  credentialRef: "livre" as const,
};

async function main() {
  // ---------- Gate ----------
  await check("gate: só LIVRE original + campo true + flag true", () => {
    const base = {
      originalCategoryHint: "LIVRE",
      normalizedCategoryHint: "LIVRE",
      routeFreeCategory: true,
      enabledFlag: "true",
    };
    assert.equal(shouldRouteFreeCategory(base), true);
    assert.equal(shouldRouteFreeCategory({ ...base, enabledFlag: "false" }), false);
    assert.equal(shouldRouteFreeCategory({ ...base, enabledFlag: "" }), false);
    assert.equal(shouldRouteFreeCategory({ ...base, routeFreeCategory: false }), false);
    assert.equal(shouldRouteFreeCategory({ ...base, routeFreeCategory: undefined }), false);
    assert.equal(
      shouldRouteFreeCategory({ ...base, originalCategoryHint: "TIREOIDE", normalizedCategoryHint: "TIREOIDE" }),
      false,
    );
    // Guard clínico determinístico remapeou o LIVRE: ele vence.
    assert.equal(shouldRouteFreeCategory({ ...base, normalizedCategoryHint: "ABDOMEN_TOTAL_DOPPLER" }), false);
  });

  await check("flag OFF: LIVRE e categoria direta mantêm caminho e modelo atuais", () => {
    const pathEnv = { HARD_MODE_ENABLED: "false", RENDERER_CATEGORIES: "TIREOIDE", DOPPLER_STANDALONE_V2: "true" };
    assert.deepEqual(resolveGenerationPath({ mode: "standard", categoryCode: "LIVRE" }, pathEnv), {
      path: "writer-pure",
      ragFewShots: false,
      guardsMode: "advisory-only",
    });
    assert.equal(resolveGenerationPath({ mode: "standard", categoryCode: "TIREOIDE" }, pathEnv).path, "renderer");
    const openaiWriter = resolveWriterModel(
      { mode: "standard", categoryCode: "TIREOIDE" },
      {
        OPENAI_MODEL_WRITER: "gpt-4.1-mini",
        OPENAI_WRITER_REASONING_EFFORT: "none",
        HARD_MODE_ENABLED: "false",
        HARD_MODE_MODEL: "gpt-5.4",
        TESTE_CATEGORY_MODEL: "",
        TESTE_CATEGORY_BASE_URL: "",
        TESTE_CATEGORY_API_KEY: "",
        TESTE_REASONING_EFFORT: "low",
        TESTE_ALLOWED_USER_ID: "",
      },
    );
    assert.equal(openaiWriter.provider, "openai");
  });

  // ---------- Elegibilidade ----------
  await check("elegíveis excluem LIVRE, TESTE, experimentais e CSV extra", () => {
    const codes = categories.map((c) => c.code);
    assert.ok(!codes.includes("LIVRE") && !codes.includes("TESTE") && !codes.includes("MUSCULOESQUELETICO_RARAS"));
    assert.deepEqual(codes, ["ABDOMEN_SUPERIOR", "ABDOMEN_TOTAL", "DOPPLER_RENAL", "TIREOIDE"]);
    const extra = eligibleRouterCategories(labels.keys(), labels, " TIREOIDE ,");
    assert.ok(!extra.some((c) => c.code === "TIREOIDE"));
  });

  await check("schema estruturado restringe códigos ao enum elegível + NONE", () => {
    const schema = routerJsonSchema(categories) as {
      additionalProperties: boolean;
      properties: { category_code: { enum: string[] }; status: { enum: string[] } };
    };
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(schema.properties.status.enum, ["routed", "ambiguous", "unsupported", "multiple"]);
    assert.ok(schema.properties.category_code.enum.includes("NONE"));
    assert.ok(!schema.properties.category_code.enum.includes("LIVRE"));
    assert.ok(buildRouterSystemPrompt(categories).includes("NUNCA escolha a categoria \"mais próxima\""));
  });

  // ---------- Interpretação ----------
  const ok = { status: "routed", category_code: "TIREOIDE", candidates: [], confidence: 0.95, reason_code: "exam_named" };
  await check("routed válido", () => {
    const d = interpretRouterOutput(ok, eligible, 0.8);
    assert.equal(d.status, "routed");
    assert.equal(d.category, "TIREOIDE");
  });
  await check("routed abaixo do limiar vira ambiguous (nunca força)", () => {
    const d = interpretRouterOutput({ ...ok, confidence: 0.5 }, eligible, 0.8);
    assert.equal(d.status, "ambiguous");
    assert.equal(d.category, null);
    assert.equal(d.belowConfidence, true);
    assert.equal(routingFailure(d, labels).code, "LIVRE_ROUTE_AMBIGUOUS");
  });
  await check("routed com NONE, fora da lista ou formato inválido = erro explícito", () => {
    for (const bad of [
      { ...ok, category_code: "NONE" },
      { ...ok, category_code: "LIVRE" },
      { ...ok, status: "talvez" },
      { ...ok, confidence: "alta" },
      null,
    ]) {
      assert.throws(
        () => interpretRouterOutput(bad, eligible, 0.8),
        (err: unknown) => err instanceof LivreRoutingError && err.code === "LIVRE_ROUTER_INVALID_RESPONSE",
      );
    }
  });
  await check("ambiguous/multiple/unsupported preservados e mapeados", () => {
    const amb = interpretRouterOutput(
      { status: "ambiguous", category_code: "NONE", candidates: ["ABDOMEN_TOTAL", "ABDOMEN_SUPERIOR", "LIVRE"], confidence: 0.4, reason_code: "similar_categories" },
      eligible,
      0.8,
    );
    assert.deepEqual(amb.candidates, ["ABDOMEN_TOTAL", "ABDOMEN_SUPERIOR"]);
    assert.equal(routingFailure(amb, labels).code, "LIVRE_ROUTE_AMBIGUOUS");
    const mult = interpretRouterOutput({ ...ok, status: "multiple", category_code: "NONE", candidates: ["TIREOIDE", "ABDOMEN_TOTAL"], reason_code: "multiple_exams" }, eligible, 0.8);
    assert.equal(routingFailure(mult, labels).code, "LIVRE_ROUTE_MULTIPLE");
    const uns = interpretRouterOutput({ ...ok, status: "unsupported", category_code: "NONE", reason_code: "exam_not_in_list" }, eligible, 0.8);
    assert.equal(routingFailure(uns, labels).code, "LIVRE_ROUTE_UNSUPPORTED");
  });

  // ---------- Compatibilidade ----------
  await check("categorias de contrato fechado são incompatíveis com o writer genérico", () => {
    assert.equal(routedCategoryIncompatible("DOPPLER_RENAL", "DOPPLER_RENAL"), true);
    assert.equal(routedCategoryIncompatible("ABDOME_TOTAL_DOPPLER", "ABDOMEN_TOTAL_DOPPLER"), true);
    assert.equal(routedCategoryIncompatible("TIREOIDE", "ABDOMEN_TOTAL_DOPPLER"), true);
    assert.equal(routedCategoryIncompatible("TIREOIDE", "TIREOIDE"), false);
    assert.deepEqual(LIVRE_ROUTED_GENERATION_PATH, { path: "writer-pure", ragFewShots: true, guardsMode: "full" });
  });

  // ---------- Provedor / modelo ----------
  await check("provedor: chave ausente ou modelo diferente de GPT-6 Luna falham explicitamente", () => {
    const code = (fn: () => unknown) =>
      assert.throws(fn, (err: unknown) => err instanceof LivreRoutingError && err.code === "LIVRE_PROVIDER_NOT_CONFIGURED");
    code(() => assertLivreProviderConfigured({ OPENAI_API_KEY: "", LIVRE_OPENAI_MODEL: "gpt-6-luna" }));
    code(() => assertLivreProviderConfigured({ OPENAI_API_KEY: "k", LIVRE_OPENAI_MODEL: "gpt-4.1-mini" }));
    code(() => assertLivreProviderConfigured({ OPENAI_API_KEY: "k", LIVRE_OPENAI_MODEL: "" }));
    assert.equal(assertLivreProviderConfigured({ OPENAI_API_KEY: "k", LIVRE_OPENAI_MODEL: "gpt-6-luna" }), "gpt-6-luna");
  });
  await check("writer Livre = OpenAI GPT-6 Luna, sem fallback para o writer padrão", () => {
    const cfg = resolveLivreWriterModel({ OPENAI_API_KEY: "k", LIVRE_OPENAI_MODEL: "gpt-6-luna", LIVRE_OPENAI_REASONING_EFFORT: "none" });
    assert.deepEqual(cfg, lunaConfig);
  });

  // ---------- Roteador (cliente fake) ----------
  await check("roteador: chave ausente falha antes de chamar a API", async () => {
    let called = false;
    const client = {
      chat: { completions: { create: async () => { called = true; } } },
    } as unknown as Pick<OpenAI, "chat">;
    await rejectsWith(
      runLivreRouter({ transcript: "x", categories, config: { ...routerConfig, OPENAI_API_KEY: "" }, client }),
      "LIVRE_PROVIDER_NOT_CONFIGURED",
    );
    assert.equal(called, false);
  });
  await check("roteador: request com modelo, effort e json_schema; sem temperature", async () => {
    const seen: { params?: Record<string, unknown> } = {};
    const out = await runLivreRouter({
      transcript: "Tireoide de dimensões normais.",
      categories,
      config: routerConfig,
      client: fakeCreate(jsonText(ok), seen as { params?: unknown }),
    });
    assert.equal(out.decision.category, "TIREOIDE");
    assert.equal(out.model, "gpt-6-luna");
    const p = seen.params as Record<string, unknown> & {
      reasoning_effort: string;
      response_format: { type: string; json_schema: { name: string; strict: boolean } };
    };
    assert.equal(p.model, "gpt-6-luna");
    assert.equal(p.reasoning_effort, "none");
    assert.equal(p.response_format.type, "json_schema");
    assert.equal(p.response_format.json_schema.name, "livre_exam_route");
    assert.equal(p.response_format.json_schema.strict, true);
    assert.equal("temperature" in p, false);
  });
  await check("roteador: recusa, truncamento, stop inesperado e JSON inválido", async () => {
    const choice = (finishReason: string, content: string | null, refusal: string | null = null) => ({
      choices: [{
        index: 0,
        finish_reason: finishReason,
        logprobs: null,
        message: { role: "assistant", content, refusal, annotations: [] },
      }],
    }) as Partial<ChatCompletion>;
    await rejectsWith(runLivreRouter({ transcript: "x", categories, config: routerConfig, client: fakeCreate(choice("stop", null, "refused")) }), "LIVRE_ROUTER_REFUSED");
    await rejectsWith(runLivreRouter({ transcript: "x", categories, config: routerConfig, client: fakeCreate(choice("length", "{}")) }), "LIVRE_ROUTER_TRUNCATED");
    await rejectsWith(runLivreRouter({ transcript: "x", categories, config: routerConfig, client: fakeCreate(choice("tool_calls", "{}")) }), "LIVRE_ROUTER_INVALID_RESPONSE");
    await rejectsWith(
      runLivreRouter({ transcript: "x", categories, config: routerConfig, client: fakeCreate(choice("stop", "{")) }),
      "LIVRE_ROUTER_INVALID_RESPONSE",
    );
    await rejectsWith(runLivreRouter({ transcript: "x", categories: [], config: routerConfig, client: fakeCreate(jsonText(ok)) }), "LIVRE_ROUTE_UNSUPPORTED");
  });
  await check("roteador: erro HTTP vira falha explícita (sem fallback)", async () => {
    const client = {
      chat: {
        completions: {
          create: async () => {
            throw new OpenAI.NotFoundError(404, { error: { message: "model", type: "not_found_error" } }, "model not found", new Headers());
          },
        },
      },
    } as unknown as Pick<OpenAI, "chat">;
    await rejectsWith(runLivreRouter({ transcript: "x", categories, config: routerConfig, client }), "LIVRE_ROUTER_FAILED");
  });

  // ---------- Writer OpenAI (stream fake) ----------
  await check("writer: stream concluído devolve texto + usage", async () => {
    const seen: { params?: unknown } = {};
    const { text, result } = await drain(
      streamOpenAILivreWriter({ config: lunaConfig, systemMessage: "s", userMessage: "u", client: fakeStream(["ULTRASSONOGRAFIA ", "DA TIREOIDE"], {}, seen) }),
    );
    assert.equal(text, "ULTRASSONOGRAFIA DA TIREOIDE");
    assert.deepEqual(result, { inputTokens: 100, outputTokens: 20, cachedInputTokens: 0 });
    const p = seen.params as Record<string, unknown> & { reasoning_effort: string };
    assert.equal(p.reasoning_effort, "none");
    assert.equal("temperature" in p, false);
  });
  await check("writer: recusa, truncamento e vazio falham explicitamente", async () => {
    await rejectsWith(drain(streamOpenAILivreWriter({ config: lunaConfig, systemMessage: "s", userMessage: "u", client: fakeStream([], { refusal: true }) })), "LIVRE_WRITER_REFUSED");
    await rejectsWith(drain(streamOpenAILivreWriter({ config: lunaConfig, systemMessage: "s", userMessage: "u", client: fakeStream(["parcial"], { finishReason: "length" }) })), "LIVRE_WRITER_TRUNCATED");
    await rejectsWith(drain(streamOpenAILivreWriter({ config: lunaConfig, systemMessage: "s", userMessage: "u", client: fakeStream([]) })), "LIVRE_WRITER_EMPTY");
  });

  // ---------- Metadata ----------
  await check("metadata: campos auditáveis, sem PHI, ida e volta na retomada", () => {
    const decision = interpretRouterOutput(ok, eligible, 0.8);
    const meta = buildLivreRoutingMetadata({ decision, model: "gpt-6-luna" });
    assert.equal(meta.requested_category, "LIVRE");
    assert.equal(meta.routed_category, "TIREOIDE");
    assert.equal(meta.routing_status, "routed");
    assert.equal(meta.routing_confidence, 0.95);
    assert.equal(meta.routing_model, "gpt-6-luna");
    assert.equal(meta.writer_provider, "openai");
    assert.equal(meta.writer_model, "gpt-6-luna");
    // Só código/enum/número: nenhuma string livre do ditado.
    for (const value of Object.values(meta)) {
      if (typeof value === "string") assert.match(value, /^[A-Za-z0-9_.-]+$/);
    }
    const persisted = { pending_clarify: { contractVersion: 1, questions: [] }, ...meta };
    assert.equal(readPersistedLivreRouting(persisted)?.routed_category, "TIREOIDE");
    assert.equal(readPersistedLivreRouting({ ...meta, routing_status: "ambiguous" }), null);
    assert.equal(readPersistedLivreRouting({ ...meta, routed_category: "tireoide; drop" }), null);
    assert.equal(readPersistedLivreRouting({ pipeline_warnings: [] }), null);
    assert.equal(readPersistedLivreRouting(null), null);
    const failed = buildLivreRoutingMetadata({ decision: null, model: "gpt-6-luna", errorCode: "LIVRE_ROUTER_REFUSED" });
    assert.equal(failed.routing_status, "error");
    assert.equal(failed.routing_error_code, "LIVRE_ROUTER_REFUSED");
  });

  console.log(`livreRouter: ${passed}/${passed} passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
