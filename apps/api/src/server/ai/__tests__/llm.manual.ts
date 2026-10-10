/* eslint-disable @typescript-eslint/no-explicit-any -- fakes de teste */
/**
 * Motor de IA (ai/llm.ts) com clientes FALSOS — nenhuma chamada de rede.
 *
 * Rodar (de apps/api):
 *   pnpm exec tsx --env-file=../../.env src/server/ai/__tests__/llm.manual.ts
 */
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import type OpenAI from "openai";
import {
  dedicatedWriterTarget,
  EXTRACTION_TEXT_RULE,
  HAIKU_MODEL,
  writerModelOverrides,
  writerTargetForCategory,
  llmJson,
  llmParsed,
  llmTarget,
  llmText,
  LlmOutputError,
  providerForModel,
  type LlmTarget,
} from "../llm";
import {
  fillOmittedNullables,
  fitsAnthropicStrictLimits,
  strictSchemaComplexity,
  toAnthropicStrictSchema,
  toolNameFor,
} from "../structuredSchema";
import { EXTRACTORS } from "../../renderer/extraction";

let passed = 0;
let failed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}\n  ${err instanceof Error ? err.message : String(err)}`);
  }
}
async function rejectsWith(p: Promise<unknown>, code: string) {
  await assert.rejects(p, (err: unknown) => err instanceof LlmOutputError && err.code === code);
}

// ---------------------------------------------------------------------------
// Cliente Anthropic roteirizado: cada chamada consome um "turno".
// ---------------------------------------------------------------------------
type Turn =
  | { error: unknown }
  | {
      events?: unknown[];
      content: unknown[];
      stop_reason?: string;
      stop_details?: unknown;
    };

function scripted(turns: Turn[]) {
  const calls: any[] = [];
  const client = {
    messages: {
      stream: (params: Record<string, any>) => {
        calls.push(structuredClone(params));
        const turn = turns.shift();
        if (!turn) throw new Error("fake: turno inesperado");
        if ("error" in turn) throw turn.error;
        return {
          async *[Symbol.asyncIterator]() {
            for (const e of turn.events ?? []) yield e;
          },
          finalMessage: async () => ({
            content: turn.content,
            stop_reason: turn.stop_reason ?? "end_turn",
            stop_details: turn.stop_details ?? null,
            usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 0 },
          }),
        };
      },
    },
  } as unknown as Pick<Anthropic, "messages">;
  return { client, calls };
}

const textTurn = (text: string, stop_reason = "end_turn"): Turn => ({
  events: [{ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } }],
  content: [{ type: "thinking", thinking: "", signature: "sig" }, { type: "text", text }],
  stop_reason,
});
function toolTurn(name: string, input: unknown, id = "toolu_1"): Turn {
  const json = JSON.stringify(input);
  return {
    events: [
      { type: "content_block_start", index: 1, content_block: { type: "tool_use", id, name, input: {} } },
      { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: json.slice(0, 5) } },
      { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: json.slice(5) } },
    ],
    content: [{ type: "thinking", thinking: "", signature: "sig" }, { type: "tool_use", id, name, input }],
    stop_reason: "tool_use",
  };
}

const HAIKU: LlmTarget = { provider: "anthropic", model: HAIKU_MODEL, effort: "medium" };

const SMALL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["nome", "idade"],
  properties: {
    nome: { type: "string", minLength: 1, maxLength: 40 },
    idade: { type: ["number", "null"], minimum: 0 },
  },
};

/** 20 campos anuláveis: passa do limite de 16 uniões do modo estrito. */
const BIG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: Array.from({ length: 20 }, (_, i) => `campo_${i}`),
  properties: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`campo_${i}`, { type: ["string", "null"] }])),
};

async function main() {
  // ---------------- Configuração ----------------
  await check("provedor pelo nome do modelo", () => {
    assert.equal(providerForModel("claude-haiku-5-5"), "anthropic");
    assert.equal(providerForModel("gpt-5.4-mini"), "openai");
  });
  await check("gpt-4.1* nunca é alvo: vira Haiku 5.5", () => {
    for (const m of ["gpt-4.1-mini", "gpt-4.1", "GPT-4.1-nano"]) {
      const t = llmTarget(m, "medium", "teste");
      assert.equal(t.model, HAIKU_MODEL);
      assert.equal(t.provider, "anthropic");
    }
    assert.equal(llmTarget("gpt-4o-mini", "low").model, "gpt-4o-mini");
    assert.equal(llmTarget("", "").effort, "medium");
  });

  // ---------------- Schema ----------------
  await check("modo estrito: remove restrições não suportadas e fecha objetos", () => {
    const strict = toAnthropicStrictSchema({
      type: "object",
      properties: {
        n: { type: "integer", minimum: 0, maximum: 9 },
        s: { type: "string", format: "date", maxLength: 3 },
        f: { type: "string", format: "cpf" },
        a: { type: "array", items: { type: "object", properties: { x: { type: "string" } } }, minItems: 2, maxItems: 4 },
        u: { oneOf: [{ type: "string" }, { type: "null" }] },
        minimum: { type: "string" },
      },
      required: ["n", "minimum"],
    });
    const props = strict.properties as Record<string, Record<string, unknown>> & { a: Record<string, unknown>; u: Record<string, unknown> };
    assert.deepEqual(props.n, { type: "integer" });
    assert.deepEqual(props.s, { type: "string", format: "date" });
    assert.deepEqual(props.f, { type: "string" });
    assert.equal("minItems" in props.a, false);
    assert.equal("maxItems" in props.a, false);
    assert.equal((props.a.items as Record<string, unknown>).additionalProperties, false);
    assert.ok(Array.isArray(props.u.anyOf));
    assert.deepEqual(props.minimum, { type: "string" }, "propriedade chamada 'minimum' é preservada");
    assert.equal(strict.additionalProperties, false);
    assert.deepEqual(strict.required, ["n", "minimum"]);
  });
  await check("complexidade: conta uniões e opcionais", () => {
    assert.deepEqual(strictSchemaComplexity(SMALL_SCHEMA), { unionParams: 1, optionalParams: 0 });
    assert.equal(fitsAnthropicStrictLimits(SMALL_SCHEMA), true);
    assert.equal(fitsAnthropicStrictLimits(BIG_SCHEMA), false);
    const opt = { type: "object", properties: Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`o${i}`, { type: "string" }])) };
    assert.equal(fitsAnthropicStrictLimits(opt), false);
  });
  await check("extratores clínicos grandes caem no caminho por ferramenta; os pequenos, no estrito", () => {
    assert.equal(fitsAnthropicStrictLimits(EXTRACTORS.OBSTETRICA!.jsonSchema), false);
    assert.equal(fitsAnthropicStrictLimits(EXTRACTORS.ABDOMEN_TOTAL!.jsonSchema), false);
    assert.equal(fitsAnthropicStrictLimits(EXTRACTORS.CERVICOMETRIA!.jsonSchema), true);
    assert.equal(fitsAnthropicStrictLimits(EXTRACTORS.DOPPLER_RENAL!.jsonSchema), true);
  });
  await check("anuláveis omitidos viram null; valor presente nunca muda", () => {
    const schema = {
      type: "object",
      required: ["a", "b", "c", "lista"],
      properties: {
        a: { type: ["number", "null"] },
        b: { type: "string" },
        c: { anyOf: [{ type: "object", required: ["x"], properties: { x: { type: ["string", "null"] } } }, { type: "null" }] },
        lista: { type: "array", items: { type: "object", required: ["k"], properties: { k: { type: ["integer", "null"] } } } },
      },
    };
    assert.deepEqual(fillOmittedNullables({ b: "s", c: {}, lista: [{}, { k: 3 }] }, schema), {
      b: "s",
      c: { x: null },
      lista: [{ k: null }, { k: 3 }],
      a: null,
    });
    assert.deepEqual(fillOmittedNullables({ a: 1, b: "s", c: null, lista: [] }, schema), { a: 1, b: "s", c: null, lista: [] });
  });
  await check("nome de ferramenta válido", () => {
    assert.equal(toolNameFor("Hepatic Doppler/Evidence"), "Hepatic_Doppler_Evidence");
  });

  // ---------------- JSON: modo estrito ----------------
  await check("estrito: output_config.format, thinking adaptativo, esforço, sem temperature", async () => {
    const { client, calls } = scripted([textTurn('{"nome":"x","idade":null}')]);
    const partials: string[] = [];
    const r = await llmJson({
      target: HAIKU,
      system: "sys",
      messages: [{ role: "user", content: "u" }],
      schemaName: "Pequeno",
      schema: SMALL_SCHEMA,
      anthropicClient: client,
      onPartialJson: (acc) => partials.push(acc),
    });
    assert.equal(r.mode, "strict");
    assert.equal(r.raw, '{"nome":"x","idade":null}');
    assert.deepEqual(partials, ['{"nome":"x","idade":null}']);
    const p = calls[0]!;
    assert.equal(p.model, "claude-haiku-5-5");
    assert.deepEqual(p.thinking, { type: "adaptive" });
    assert.equal(p.output_config.effort, "medium");
    assert.equal(p.output_config.format.type, "json_schema");
    assert.equal("minLength" in p.output_config.format.schema.properties.nome, false);
    assert.equal("temperature" in p, false);
    assert.equal("tools" in p, false);
    assert.deepEqual(p.system[0].cache_control, { type: "ephemeral" });
    assert.equal(r.usage.inputTokens, 100);
  });
  await check("estrito: recusa e truncamento falham explicitamente", async () => {
    const opts = { target: HAIKU, system: "s", messages: [{ role: "user" as const, content: "u" }], schemaName: "P", schema: SMALL_SCHEMA };
    await rejectsWith(llmJson({ ...opts, anthropicClient: scripted([{ ...textTurn("{"), stop_reason: "refusal", stop_details: { category: "bio" } }]).client }), "LLM_REFUSED");
    await rejectsWith(llmJson({ ...opts, anthropicClient: scripted([textTurn('{"nome":', "max_tokens")]).client }), "LLM_TRUNCATED");
    await rejectsWith(llmJson({ ...opts, anthropicClient: scripted([textTurn("x", "pause_turn")]).client }), "LLM_STOPPED");
    await rejectsWith(llmJson({ ...opts, anthropicClient: scripted([textTurn("  ")]).client }), "LLM_EMPTY");
  });
  await check("estrito recusado pela API (schema complexo) → ferramenta, e lembra", async () => {
    const tooComplex = new Anthropic.BadRequestError(
      400,
      { type: "error", error: { type: "invalid_request_error", message: "Schema is too complex for compilation." } },
      "Schema is too complex for compilation.",
      new Headers(),
    );
    const { client, calls } = scripted([{ error: tooComplex }, toolTurn("Lembrado", { nome: "a", idade: 1 }), toolTurn("Lembrado", { nome: "b", idade: 2 })]);
    const opts = { target: HAIKU, system: "s", messages: [{ role: "user" as const, content: "u" }], schemaName: "Lembrado", schema: SMALL_SCHEMA, anthropicClient: client };
    const r1 = await llmJson(opts);
    assert.equal(r1.mode, "tool");
    const r2 = await llmJson(opts);
    assert.equal(r2.mode, "tool");
    assert.equal(calls.length, 3, "a segunda chamada vai direto à ferramenta");
    assert.ok(calls[2]!.tools);
  });
  await check("estrito: outros 400 sobem como estão", async () => {
    const other = new Anthropic.BadRequestError(400, {}, "max_tokens: too large", new Headers());
    const { client } = scripted([{ error: other }]);
    await assert.rejects(
      llmJson({ target: HAIKU, system: "s", messages: [{ role: "user", content: "u" }], schemaName: "Outro", schema: SMALL_SCHEMA, anthropicClient: client }),
      (err: unknown) => err === other,
    );
  });

  // ---------------- JSON: ferramenta não estrita ----------------
  await check("ferramenta: schema original, tool_choice auto, input acumulado, anuláveis completados", async () => {
    const { client, calls } = scripted([toolTurn("Grande", { campo_0: "x" })]);
    const partials: string[] = [];
    const r = await llmJson({
      target: HAIKU,
      system: "sys",
      messages: [{ role: "user", content: "u" }],
      schemaName: "Grande",
      schema: BIG_SCHEMA,
      anthropicClient: client,
      onPartialJson: (acc) => partials.push(acc),
    });
    assert.equal(r.mode, "tool");
    const value = JSON.parse(r.raw);
    assert.equal(value.campo_0, "x");
    assert.equal(value.campo_19, null);
    assert.equal(partials.length, 2);
    const p = calls[0]!;
    assert.deepEqual(p.tools[0].input_schema, BIG_SCHEMA);
    assert.equal(p.tools[0].eager_input_streaming, true);
    assert.deepEqual(p.tool_choice, { type: "auto" });
    assert.equal("format" in p.output_config, false);
    assert.match(p.system[0].text, /chamando a ferramenta `Grande`/);
  });
  await check("ferramenta: reprovação no validador volta ao modelo uma vez (append-only, thinking preservado)", async () => {
    const { client, calls } = scripted([toolTurn("Grande", { campo_0: 7 }, "toolu_a"), toolTurn("Grande", { campo_0: "ok" }, "toolu_b")]);
    const { value } = await llmParsed({
      target: HAIKU,
      system: "sys",
      messages: [{ role: "user", content: "u" }],
      schemaName: "Grande",
      schema: BIG_SCHEMA,
      anthropicClient: client,
      parser: {
        parse: (v: unknown) => {
          const o = v as Record<string, unknown>;
          if (typeof o.campo_0 !== "string") throw new Error("campo_0 deve ser string");
          return o;
        },
      },
    });
    assert.equal((value as Record<string, unknown>).campo_0, "ok");
    assert.equal(calls.length, 2);
    const second = calls[1]!.messages as any[];
    assert.equal(second.length, 3);
    assert.equal(second[0].content, "u");
    const assistant = second[1].content;
    assert.equal(assistant[0].type, "thinking", "bloco de thinking devolvido sem alteração");
    const result = second[2].content[0];
    assert.equal(result.type, "tool_result");
    assert.equal(result.tool_use_id, "toolu_a");
    assert.equal(result.is_error, true);
    assert.match(String(result.content), /campo_0 deve ser string/);
  });
  await check("ferramenta: segunda reprovação devolve o JSON e o parser do chamador falha alto", async () => {
    const { client } = scripted([toolTurn("Grande", { campo_0: 1 }), toolTurn("Grande", { campo_0: 2 })]);
    await assert.rejects(
      llmParsed({
        target: HAIKU,
        system: "s",
        messages: [{ role: "user", content: "u" }],
        schemaName: "Grande",
        schema: BIG_SCHEMA,
        anthropicClient: client,
        parser: { parse: () => { throw new Error("schema reprovado"); } },
      }),
      /schema reprovado/,
    );
  });
  await check("ferramenta: JSON de objeto no texto vale (few-shots em JSON puro)", async () => {
    const { client } = scripted([textTurn('```json\n{"campo_0":"t"}\n```')]);
    const r = await llmJson({ target: HAIKU, system: "s", messages: [{ role: "user", content: "u" }], schemaName: "Grande", schema: BIG_SCHEMA, anthropicClient: client });
    assert.equal(JSON.parse(r.raw).campo_0, "t");
    assert.equal(JSON.parse(r.raw).campo_5, null);
  });
  await check("ferramenta: sem chamada nem JSON duas vezes → LLM_NO_STRUCTURED_OUTPUT", async () => {
    const { client, calls } = scripted([textTurn("não sei"), textTurn("ainda não")]);
    await rejectsWith(
      llmJson({ target: HAIKU, system: "s", messages: [{ role: "user", content: "u" }], schemaName: "Grande", schema: BIG_SCHEMA, anthropicClient: client }),
      "LLM_NO_STRUCTURED_OUTPUT",
    );
    assert.equal(calls.length, 2);
  });
  await check("ferramenta: truncamento falha explicitamente", async () => {
    const t = toolTurn("Grande", { campo_0: "x" });
    const { client } = scripted([{ ...t, stop_reason: "max_tokens" }]);
    await rejectsWith(
      llmJson({ target: HAIKU, system: "s", messages: [{ role: "user", content: "u" }], schemaName: "Grande", schema: BIG_SCHEMA, anthropicClient: client }),
      "LLM_TRUNCATED",
    );
  });

  await check("regra comum de extração anexada a toda chamada JSON (estrito e ferramenta); sanity desliga", async () => {
    const strict = scripted([textTurn('{"nome":"x","idade":1}')]);
    await llmJson({ target: HAIKU, system: "PROMPT DA CATEGORIA", messages: [{ role: "user", content: "u" }], schemaName: "Regra1", schema: SMALL_SCHEMA, anthropicClient: strict.client });
    assert.ok(strict.calls[0].system[0].text.startsWith("PROMPT DA CATEGORIA\n\nCAMPOS DE TEXTO LIVRE"));
    assert.ok(strict.calls[0].system[0].text.endsWith(EXTRACTION_TEXT_RULE));
    const tool = scripted([toolTurn("Regra2", { campo_0: "x" })]);
    await llmJson({ target: HAIKU, system: "PROMPT", messages: [{ role: "user", content: "u" }], schemaName: "Regra2", schema: BIG_SCHEMA, anthropicClient: tool.client });
    assert.ok(tool.calls[0].system[0].text.includes(EXTRACTION_TEXT_RULE));
    const off = scripted([textTurn('{"nome":"x","idade":1}')]);
    await llmJson({ target: HAIKU, system: "SANITY", messages: [{ role: "user", content: "u" }], schemaName: "Regra3", schema: SMALL_SCHEMA, reportText: false, anthropicClient: off.client });
    assert.equal(off.calls[0].system[0].text, "SANITY");
    assert.match(EXTRACTION_TEXT_RULE, /Conclusão do médico:/);
    // A13: ruído sai; dado clínico incerto é preservado e marcado, nunca apagado em silêncio.
    assert.equal(EXTRACTION_TEXT_RULE.includes("deixe de fora, sem comentar"), false);
    assert.match(EXTRACTION_TEXT_RULE, /preserve a parte compreensível, não adivinhe/);
    assert.match(EXTRACTION_TEXT_RULE, /\[REVISAR: motivo curto\]/);
    assert.match(EXTRACTION_TEXT_RULE, /não transforme a incerteza em normalidade/);
  });

  // ---------------- Texto ----------------
  await check("texto: streaming, usage e mensagens com few-shots", async () => {
    const { client, calls } = scripted([textTurn("LAUDO")]);
    const r = await llmText({
      target: HAIKU,
      system: "sys",
      messages: [
        { role: "user", content: "ex" },
        { role: "assistant", content: "laudo ex" },
        { role: "user", content: "ditado" },
      ],
      anthropicClient: client,
      openaiTemperature: 0.2,
    });
    assert.equal(r.text, "LAUDO");
    assert.equal(r.usage.outputTokens, 20);
    assert.equal(calls[0].messages.length, 3);
    assert.equal("temperature" in calls[0], false, "temperature nunca vai ao Haiku");
    assert.equal(calls[0].max_tokens, 32000);
  });
  await check("texto: imagem vira bloco image base64 antes do texto", async () => {
    const { client, calls } = scripted([textTurn("{}")]);
    await llmText({
      target: HAIKU,
      system: "s",
      messages: [{ role: "user", content: "leia", image: { base64: "AAAA", mediaType: "image/png" } }],
      anthropicClient: client,
    });
    const content = calls[0].messages[0].content;
    assert.equal(content[0].type, "image");
    assert.equal(content[0].source.media_type, "image/png");
    assert.equal(content[1].text, "leia");
  });
  await check("texto: recusa, truncamento e vazio falham", async () => {
    const base = { target: HAIKU, system: "s", messages: [{ role: "user" as const, content: "u" }] };
    await rejectsWith(llmText({ ...base, anthropicClient: scripted([{ ...textTurn("x"), stop_reason: "refusal" }]).client }), "LLM_REFUSED");
    await rejectsWith(llmText({ ...base, anthropicClient: scripted([textTurn("x", "max_tokens")]).client }), "LLM_TRUNCATED");
    await rejectsWith(llmText({ ...base, anthropicClient: scripted([textTurn(" ")]).client }), "LLM_EMPTY");
  });

  // ---------------- Sonnet 5.5 por categoria ----------------
  const BASE = { LLM_WRITER_MODEL: "claude-haiku-5-5", LLM_WRITER_EFFORT: "medium" };
  await check("modelo por categoria: pelve e carótidas no Sonnet 5.5 por default; MSK e demais no Haiku", () => {
    assert.equal(writerTargetForCategory("DOPPLER_CAROTIDAS", BASE).model, "claude-sonnet-5-5");
    assert.equal(writerTargetForCategory("ABDOMEN_TOTAL", BASE).model, "claude-haiku-5-5");
    assert.equal(dedicatedWriterTarget("claude-haiku-5-5", "msk", BASE, "MUSCULOESQUELETICO_V2").model, "claude-haiku-5-5", "MSK no Haiku desde 10/10");
    assert.equal(writerModelOverrides({ LLM_WRITER_MODEL_BY_CATEGORY: undefined }).has("MUSCULOESQUELETICO_V2"), false);
    assert.equal(dedicatedWriterTarget("claude-haiku-5-5", "pelve", BASE, "PELVE_FEMININA").model, "claude-sonnet-5-5");
    assert.equal(dedicatedWriterTarget("claude-haiku-5-5", "renal", BASE, "DOPPLER_RENAL").model, "claude-haiku-5-5");
  });
  await check("modelo por categoria: env troca sem deploy (modelo e esforço); vazia = sem exceções", () => {
    const env1 = { ...BASE, LLM_WRITER_MODEL_BY_CATEGORY: "MUSCULOESQUELETICO_V2=claude-sonnet-5-5, PELVE_FEMININA=claude-sonnet-5-5:high" };
    assert.equal(dedicatedWriterTarget("x", "msk", env1, "MUSCULOESQUELETICO_V2").model, "claude-sonnet-5-5", "MSK volta ao Sonnet só por env");
    const pelve = dedicatedWriterTarget("x", "pelve", env1, "PELVE_FEMININA");
    assert.equal(pelve.model, "claude-sonnet-5-5");
    assert.equal(pelve.effort, "high");
    assert.equal(writerTargetForCategory("DOPPLER_CAROTIDAS", env1).model, "claude-haiku-5-5");
    assert.equal(writerModelOverrides({ LLM_WRITER_MODEL_BY_CATEGORY: "" }).size, 0);
    assert.equal(writerTargetForCategory("DOPPLER_CAROTIDAS", { ...BASE, LLM_WRITER_MODEL_BY_CATEGORY: "" }).model, "claude-haiku-5-5");
  });
  await check("Sonnet 5.5: fallback de recusa do servidor (beta) e modelo efetivo devolvido", async () => {
    const calls: any[] = [];
    const betaCalls: any[] = [];
    const final = (model: string, iterations: unknown[]) => ({
      content: [{ type: "text", text: "LAUDO" }],
      stop_reason: "end_turn",
      stop_details: null,
      model,
      usage: { input_tokens: 50, output_tokens: 10, cache_read_input_tokens: 0, iterations },
    });
    const streamOf = (msg: unknown) => ({
      async *[Symbol.asyncIterator]() {
        yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "LAUDO" } };
      },
      finalMessage: async () => msg,
    });
    const client = {
      messages: { stream: (p: any) => (calls.push(p), streamOf(final(p.model, []))) },
      beta: { messages: { stream: (p: any) => (betaCalls.push(p), streamOf(final("claude-sonnet-5", [{ type: "message" }, { type: "fallback_message" }]))) } },
    } as any;
    const sonnet = await llmText({ target: { provider: "anthropic", model: "claude-sonnet-5-5", effort: "medium" }, system: "s", messages: [{ role: "user", content: "u" }], anthropicClient: client });
    assert.equal(betaCalls.length, 1);
    assert.deepEqual(betaCalls[0].betas, ["server-side-fallback-2026-07-01"]);
    assert.equal(betaCalls[0].fallbacks, "default");
    assert.equal("temperature" in betaCalls[0], false);
    assert.deepEqual(betaCalls[0].thinking, { type: "adaptive" });
    assert.equal(sonnet.usage.model, "claude-sonnet-5");
    assert.equal(sonnet.usage.fallback, true);
    const haiku = await llmText({ target: HAIKU, system: "s", messages: [{ role: "user", content: "u" }], anthropicClient: client });
    assert.equal(calls.length, 1, "Haiku não tem fallback de servidor: chamada normal");
    assert.equal("fallbacks" in calls[0], false);
    assert.equal(haiku.usage.model, "claude-haiku-5-5");
    assert.equal(haiku.usage.fallback, undefined);
  });

  // ---------------- Rollback OpenAI ----------------
  const fakeOpenAI = (seen: any[], content: string) =>
    ({
      chat: {
        completions: {
          create: async (params: Record<string, any>) => {
            seen.push(params);
            return (async function* () {
              yield { choices: [{ delta: { content }, finish_reason: null }] };
              yield { choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 5, completion_tokens: 3 } };
            })();
          },
        },
      },
    }) as unknown as Pick<OpenAI, "chat">;
  await check("rollback OpenAI reasoning: reasoning_effort, sem temperature, json_schema strict", async () => {
    const seen: any[] = [];
    const r = await llmJson({
      target: llmTarget("gpt-5.4-mini", "low"),
      system: "s",
      messages: [{ role: "user", content: "u" }],
      schemaName: "Pequeno",
      schema: SMALL_SCHEMA,
      openaiClient: fakeOpenAI(seen, '{"nome":"x","idade":1}'),
    });
    assert.equal(r.mode, "openai");
    assert.equal(seen[0].reasoning_effort, "low");
    assert.equal("temperature" in seen[0], false);
    assert.equal(seen[0].response_format.json_schema.strict, true);
    assert.equal(seen[0].messages[0].role, "system");
  });
  await check("rollback OpenAI clássico: temperature e max_tokens", async () => {
    const seen: any[] = [];
    const r = await llmText({
      target: llmTarget("gpt-4o-mini", "medium"),
      system: "s",
      messages: [{ role: "user", content: "u" }],
      openaiTemperature: 0.2,
      openaiClient: fakeOpenAI(seen, "TEXTO"),
    });
    assert.equal(r.text, "TEXTO");
    assert.equal(seen[0].temperature, 0.2);
    assert.equal(seen[0].max_tokens, 2500);
  });

  console.log(`\nllm: ${passed}/${passed + failed} passed`);
  if (failed > 0) process.exit(1);
}

void main();
