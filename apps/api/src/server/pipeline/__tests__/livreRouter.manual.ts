/**
 * LAUDO LIVRE ROTEADO — contrato do roteador, do writer Anthropic e do
 * metadata auditável. Sem rede: o cliente Anthropic é substituído por fakes.
 *
 *   tsx --tsconfig apps/api/tsconfig.json apps/api/src/server/pipeline/__tests__/livreRouter.manual.ts
 */
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import {
  assertLivreProviderConfigured,
  effortParam,
  LivreRoutingError,
} from "../../ai/anthropic";
import { streamAnthropicWriter, writerClient } from "../../ai/writerClient";
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
  ANTHROPIC_API_KEY: "sk-ant-test",
  LIVRE_ANTHROPIC_MODEL: "claude-sonnet-5-5",
  LIVRE_ROUTER_EFFORT: "low" as const,
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

function fakeCreate(response: Partial<Anthropic.Message>, seen?: { params?: unknown }) {
  return {
    messages: {
      create: async (params: unknown) => {
        if (seen) seen.params = params;
        return {
          stop_reason: "end_turn",
          content: [],
          usage: { input_tokens: 10, output_tokens: 5 },
          ...response,
        };
      },
    },
  } as unknown as Pick<Anthropic, "messages">;
}
function jsonText(value: unknown): Partial<Anthropic.Message> {
  return { content: [{ type: "text", text: JSON.stringify(value) } as Anthropic.TextBlock] };
}

function fakeStream(chunks: string[], final: Partial<Anthropic.Message>, seen?: { params?: unknown }) {
  return {
    messages: {
      stream: (params: unknown) => {
        if (seen) seen.params = params;
        return {
          async *[Symbol.asyncIterator]() {
            for (const text of chunks) {
              yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } };
            }
          },
          finalMessage: async () => ({
            stop_reason: "end_turn",
            usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 0 },
            ...final,
          }),
        };
      },
    },
  } as unknown as Pick<Anthropic, "messages">;
}
async function drain(gen: AsyncGenerator<string, unknown, void>) {
  let text = "";
  for (;;) {
    const next = await gen.next();
    if (next.done) return { text, result: next.value };
    text += next.value;
  }
}
const sonnetConfig = {
  provider: "anthropic" as const,
  model: "claude-sonnet-5-5",
  reasoningEffort: "medium",
  credentialRef: "anthropic" as const,
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
  await check("provedor: chave ausente ou modelo diferente de Sonnet 5.5 falham explicitamente", () => {
    const code = (fn: () => unknown) =>
      assert.throws(fn, (err: unknown) => err instanceof LivreRoutingError && err.code === "LIVRE_PROVIDER_NOT_CONFIGURED");
    code(() => assertLivreProviderConfigured({ ANTHROPIC_API_KEY: "", LIVRE_ANTHROPIC_MODEL: "claude-sonnet-5-5" }));
    code(() => assertLivreProviderConfigured({ ANTHROPIC_API_KEY: "k", LIVRE_ANTHROPIC_MODEL: "gpt-4.1-mini" }));
    code(() => assertLivreProviderConfigured({ ANTHROPIC_API_KEY: "k", LIVRE_ANTHROPIC_MODEL: "" }));
    assert.equal(assertLivreProviderConfigured({ ANTHROPIC_API_KEY: "k", LIVRE_ANTHROPIC_MODEL: "claude-sonnet-5-5" }), "claude-sonnet-5-5");
  });
  await check("writer Livre = Anthropic Sonnet 5.5, sem cliente OpenAI", () => {
    const cfg = resolveLivreWriterModel({ ANTHROPIC_API_KEY: "k", LIVRE_ANTHROPIC_MODEL: "claude-sonnet-5-5", LIVRE_WRITER_EFFORT: "medium" });
    assert.deepEqual(cfg, sonnetConfig);
    assert.throws(() => writerClient(cfg));
    assert.deepEqual(effortParam("low"), { effort: "low" });
    assert.equal(effortParam(""), undefined);
  });

  // ---------- Roteador (cliente fake) ----------
  await check("roteador: chave ausente falha antes de chamar a API", async () => {
    let called = false;
    const client = { messages: { create: async () => { called = true; } } } as unknown as Pick<Anthropic, "messages">;
    await rejectsWith(
      runLivreRouter({ transcript: "x", categories, config: { ...routerConfig, ANTHROPIC_API_KEY: "" }, client }),
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
    assert.equal(out.model, "claude-sonnet-5-5");
    const p = seen.params as Record<string, unknown> & { thinking: { type: string }; output_config: { effort: string; format: { type: string } } };
    assert.equal(p.model, "claude-sonnet-5-5");
    assert.equal(p.output_config.effort, "low");
    assert.equal(p.output_config.format.type, "json_schema");
    assert.equal(p.thinking.type, "between_tools");
    assert.equal("temperature" in p, false);
  });
  await check("roteador: recusa, truncamento, stop inesperado e JSON inválido", async () => {
    await rejectsWith(runLivreRouter({ transcript: "x", categories, config: routerConfig, client: fakeCreate({ stop_reason: "refusal" }) }), "LIVRE_ROUTER_REFUSED");
    await rejectsWith(runLivreRouter({ transcript: "x", categories, config: routerConfig, client: fakeCreate({ stop_reason: "max_tokens" }) }), "LIVRE_ROUTER_TRUNCATED");
    await rejectsWith(runLivreRouter({ transcript: "x", categories, config: routerConfig, client: fakeCreate({ stop_reason: "pause_turn" }) }), "LIVRE_ROUTER_INVALID_RESPONSE");
    await rejectsWith(
      runLivreRouter({ transcript: "x", categories, config: routerConfig, client: fakeCreate({ content: [{ type: "text", text: "{" } as Anthropic.TextBlock] }) }),
      "LIVRE_ROUTER_INVALID_RESPONSE",
    );
    await rejectsWith(runLivreRouter({ transcript: "x", categories: [], config: routerConfig, client: fakeCreate(jsonText(ok)) }), "LIVRE_ROUTE_UNSUPPORTED");
  });
  await check("roteador: erro HTTP vira falha explícita (sem fallback)", async () => {
    const client = {
      messages: {
        create: async () => {
          throw new Anthropic.NotFoundError(404, { type: "error", error: { type: "not_found_error", message: "model" } }, "model not found", new Headers());
        },
      },
    } as unknown as Pick<Anthropic, "messages">;
    await rejectsWith(runLivreRouter({ transcript: "x", categories, config: routerConfig, client }), "LIVRE_ROUTER_FAILED");
  });

  // ---------- Writer Anthropic (stream fake) ----------
  await check("writer: stream concluído devolve texto + usage", async () => {
    const seen: { params?: unknown } = {};
    const { text, result } = await drain(
      streamAnthropicWriter({ config: sonnetConfig, systemMessage: "s", userMessage: "u", client: fakeStream(["ULTRASSONOGRAFIA ", "DA TIREOIDE"], {}, seen) }),
    );
    assert.equal(text, "ULTRASSONOGRAFIA DA TIREOIDE");
    assert.deepEqual(result, { inputTokens: 100, outputTokens: 20, cachedInputTokens: 0 });
    const p = seen.params as Record<string, unknown> & { thinking: { type: string }; output_config: { effort: string } };
    assert.equal(p.thinking.type, "between_tools");
    assert.equal(p.output_config.effort, "medium");
    assert.equal("temperature" in p, false);
  });
  await check("writer: recusa, truncamento e vazio falham explicitamente", async () => {
    await rejectsWith(drain(streamAnthropicWriter({ config: sonnetConfig, systemMessage: "s", userMessage: "u", client: fakeStream(["parcial"], { stop_reason: "refusal" }) })), "LIVRE_WRITER_REFUSED");
    await rejectsWith(drain(streamAnthropicWriter({ config: sonnetConfig, systemMessage: "s", userMessage: "u", client: fakeStream(["parcial"], { stop_reason: "max_tokens" }) })), "LIVRE_WRITER_TRUNCATED");
    await rejectsWith(drain(streamAnthropicWriter({ config: sonnetConfig, systemMessage: "s", userMessage: "u", client: fakeStream(["  "], {}) })), "LIVRE_WRITER_EMPTY");
  });

  // ---------- Metadata ----------
  await check("metadata: campos auditáveis, sem PHI, ida e volta na retomada", () => {
    const decision = interpretRouterOutput(ok, eligible, 0.8);
    const meta = buildLivreRoutingMetadata({ decision, model: "claude-sonnet-5-5" });
    assert.equal(meta.requested_category, "LIVRE");
    assert.equal(meta.routed_category, "TIREOIDE");
    assert.equal(meta.routing_status, "routed");
    assert.equal(meta.routing_confidence, 0.95);
    assert.equal(meta.routing_model, "claude-sonnet-5-5");
    assert.equal(meta.writer_model, "claude-sonnet-5-5");
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
    const failed = buildLivreRoutingMetadata({ decision: null, model: "claude-sonnet-5-5", errorCode: "LIVRE_ROUTER_REFUSED" });
    assert.equal(failed.routing_status, "error");
    assert.equal(failed.routing_error_code, "LIVRE_ROUTER_REFUSED");
  });

  console.log(`livreRouter: ${passed}/${passed} passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
