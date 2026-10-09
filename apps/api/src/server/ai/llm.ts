/**
 * MOTOR DE IA — uma porta só para extração, escrita e sanity.
 *
 * Produção usa Claude Haiku 5.5 (`claude-haiku-5-5`) pela API Anthropic em
 * todos os papéis. O provedor sai do NOME do modelo configurado: `claude-*` →
 * Anthropic; qualquer outro → OpenAI. Esse é o caminho de rollback por env
 * (ex.: `LLM_WRITER_MODEL=gpt-5.4-mini`), sem deploy de código.
 *
 * A família gpt-4.1 sai da API da OpenAI em 14/10/2026. Nenhuma configuração
 * pode cair nela: um valor antigo esquecido numa env vira Haiku com aviso no log
 * (preferimos laudo saindo a laudo quebrando por uma env velha).
 *
 * Haiku 5.5 (ver skill claude-api): sem `temperature` (400), thinking adaptativo
 * por padrão, esforço em `output_config.effort`, sem prefill, recusa
 * (`stop_reason: "refusal"`) sem fallback de servidor. Toda chamada vai por
 * streaming e checa `stop_reason` antes de devolver qualquer coisa.
 */

import Anthropic from "@anthropic-ai/sdk";
import type OpenAI from "openai";
import { env } from "../env";
import { anthropic } from "./anthropic";
import { openai } from "./openai";
import {
  fillOmittedNullables,
  fitsAnthropicStrictLimits,
  toAnthropicStrictSchema,
  toolNameFor,
} from "./structuredSchema";

export const HAIKU_MODEL = "claude-haiku-5-5";

export type LlmProvider = "anthropic" | "openai";
export type LlmTarget = { provider: LlmProvider; model: string; effort: string };
export type LlmUsage = { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number };
export type LlmMessage = {
  role: "user" | "assistant";
  content: string;
  /** Só visão (leitura de telas do aparelho). */
  image?: { base64: string; mediaType: "image/jpeg" | "image/png" };
};
type AnthropicClient = Pick<Anthropic, "messages">;
type OpenAIClient = Pick<OpenAI, "chat">;

export type LlmFailureCode =
  | "LLM_PROVIDER_NOT_CONFIGURED"
  | "LLM_REFUSED"
  | "LLM_TRUNCATED"
  | "LLM_STOPPED"
  | "LLM_EMPTY"
  | "LLM_NO_STRUCTURED_OUTPUT";

/** Falha explícita do modelo. A rota decide o fallback por categoria (fail-closed nas clínicas). */
export class LlmOutputError extends Error {
  constructor(
    readonly code: LlmFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "LlmOutputError";
  }
}

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const RETIRED_MODEL_RE = /^gpt-4\.1(?:$|-)/i;

export function isRetiredModel(model: string): boolean {
  return RETIRED_MODEL_RE.test(model.trim());
}

export function providerForModel(model: string): LlmProvider {
  return /^claude-/i.test(model.trim()) ? "anthropic" : "openai";
}

/** Modelo configurado → alvo. Vazio ou aposentado vira Haiku 5.5. */
export function llmTarget(model: string | undefined, effort: string, label = "llm"): LlmTarget {
  let m = (model ?? "").trim() || HAIKU_MODEL;
  if (isRetiredModel(m)) {
    console.warn(`[${label}] modelo ${m} aposentado (sai da API em 14/10/2026); usando ${HAIKU_MODEL}.`);
    m = HAIKU_MODEL;
  }
  return { provider: providerForModel(m), model: m, effort: effort.trim() || "medium" };
}

type TargetEnv = Pick<
  ReturnType<typeof env>,
  | "LLM_EXTRACTION_MODEL"
  | "LLM_EXTRACTION_EFFORT"
  | "LLM_WRITER_MODEL"
  | "LLM_WRITER_EFFORT"
  | "LLM_SANITY_MODEL"
  | "LLM_SANITY_EFFORT"
>;

/** Extração estruturada (renderer, structurer, interpretador de comandos, esquemas). */
export function extractionTarget(config: Pick<TargetEnv, "LLM_EXTRACTION_MODEL" | "LLM_EXTRACTION_EFFORT"> = env()): LlmTarget {
  return llmTarget(config.LLM_EXTRACTION_MODEL, config.LLM_EXTRACTION_EFFORT, "extraction");
}

/** Escritor (writer completo, free-slots, edição incremental). */
export function writerTarget(config: Pick<TargetEnv, "LLM_WRITER_MODEL" | "LLM_WRITER_EFFORT"> = env()): LlmTarget {
  return llmTarget(config.LLM_WRITER_MODEL, config.LLM_WRITER_EFFORT, "writer");
}

/** Writer dedicado (MSK, pelve, partes moles, Doppler…): modelo próprio, esforço do writer. */
export function dedicatedWriterTarget(model: string, label: string, config: Pick<TargetEnv, "LLM_WRITER_EFFORT"> = env()): LlmTarget {
  return llmTarget(model, config.LLM_WRITER_EFFORT, label);
}

/** Sanity por IA (observacional, roda depois do `done`). */
export function sanityTarget(config: Pick<TargetEnv, "LLM_SANITY_MODEL" | "LLM_SANITY_EFFORT"> = env()): LlmTarget {
  return llmTarget(config.LLM_SANITY_MODEL, config.LLM_SANITY_EFFORT, "sanity");
}

function anthropicEffort(effort: string): "low" | "medium" | "high" | "xhigh" | "max" {
  return effort === "low" || effort === "high" || effort === "xhigh" || effort === "max" ? effort : "medium";
}

function isOpenAIReasoningModel(model: string): boolean {
  return /^(gpt-5|gpt-6|o\d)/i.test(model) && !/chat-latest/i.test(model);
}

function ensureAnthropicConfigured(client?: AnthropicClient): AnthropicClient {
  if (client) return client;
  if (!env().ANTHROPIC_API_KEY.trim()) {
    throw new LlmOutputError(
      "LLM_PROVIDER_NOT_CONFIGURED",
      "ANTHROPIC_API_KEY ausente: o motor Haiku 5.5 não pode ser chamado.",
    );
  }
  return anthropic();
}

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------

function anthropicMessages(messages: LlmMessage[]): Anthropic.MessageParam[] {
  return messages.map((m) =>
    m.image
      ? {
          role: m.role,
          content: [
            { type: "image", source: { type: "base64", media_type: m.image.mediaType, data: m.image.base64 } },
            { type: "text", text: m.content },
          ],
        }
      : { role: m.role, content: m.content },
  );
}

function anthropicUsage(message: Anthropic.Message): LlmUsage {
  return {
    inputTokens:
      message.usage.input_tokens +
      (message.usage.cache_creation_input_tokens ?? 0) +
      (message.usage.cache_read_input_tokens ?? 0),
    outputTokens: message.usage.output_tokens,
    cachedInputTokens: message.usage.cache_read_input_tokens ?? undefined,
  };
}

/** `stop_reason` aceitável → segue; qualquer outro → erro explícito. */
function assertAnthropicStop(message: Anthropic.Message, accepted: readonly string[], what: string): void {
  const stop = message.stop_reason;
  if (stop && accepted.includes(stop)) return;
  if (stop === "refusal") {
    const category = message.stop_details?.category ?? "sem categoria";
    throw new LlmOutputError("LLM_REFUSED", `${what}: o modelo recusou a solicitação (${category}).`);
  }
  if (stop === "max_tokens" || stop === "model_context_window_exceeded") {
    throw new LlmOutputError("LLM_TRUNCATED", `${what}: resposta truncada (${stop}).`);
  }
  throw new LlmOutputError("LLM_STOPPED", `${what}: término inesperado (${stop ?? "sem motivo"}).`);
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/** Schemas que a API recusou compilar no modo estrito nesta instância. */
const strictRejected = new Set<string>();

async function anthropicJson(opts: LlmJsonOptions, client: AnthropicClient): Promise<LlmJsonResult> {
  const base = {
    model: opts.target.model,
    max_tokens: opts.maxTokens ?? 16000,
    thinking: { type: "adaptive" as const },
    system: [{ type: "text" as const, text: opts.system, cache_control: { type: "ephemeral" as const } }],
    messages: anthropicMessages(opts.messages),
  };
  const what = opts.schemaName;
  const requestOptions = { signal: opts.signal, timeout: 180_000 };

  if (!strictRejected.has(opts.schemaName) && fitsAnthropicStrictLimits(opts.schema)) {
    try {
      const stream = client.messages.stream(
        {
          ...base,
          output_config: {
            effort: anthropicEffort(opts.target.effort),
            format: { type: "json_schema", schema: toAnthropicStrictSchema(opts.schema) },
          },
        },
        requestOptions,
      );
      let acc = "";
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          acc += event.delta.text;
          opts.onPartialJson?.(acc);
        }
      }
      const message = await stream.finalMessage();
      assertAnthropicStop(message, ["end_turn"], what);
      const raw = textOf(message);
      if (!raw.trim()) throw new LlmOutputError("LLM_EMPTY", `${what}: resposta vazia.`);
      return { raw, usage: anthropicUsage(message), mode: "strict" };
    } catch (err) {
      // Schema que passa nos limites declarados ainda pode estourar a gramática
      // ("Schema is too complex for compilation"): segue pela ferramenta.
      if (err instanceof Anthropic.BadRequestError && /schema|grammar|complex/i.test(err.message)) {
        console.warn(`[llm] ${what}: modo estrito recusado (${err.message.slice(0, 160)}); usando ferramenta.`);
        strictRejected.add(opts.schemaName);
      } else {
        throw err;
      }
    }
  }

  // Ferramenta NÃO estrita: o schema original vai como input_schema; a validação
  // é o Zod de quem chama. tool_choice "auto" mantém o thinking (o forçado o pula).
  const toolName = toolNameFor(opts.schemaName);
  const params = {
    ...base,
    system: [
      {
        type: "text" as const,
        text:
          `${opts.system}\n\nENTREGA: responda chamando a ferramenta \`${toolName}\` exatamente uma vez, ` +
          "com o resultado completo. Não escreva o resultado em texto.",
        cache_control: { type: "ephemeral" as const },
      },
    ],
    output_config: { effort: anthropicEffort(opts.target.effort) },
    tools: [
      {
        name: toolName,
        description: "Registra o resultado estruturado da tarefa. Chame uma única vez, com todos os campos do schema.",
        input_schema: opts.schema as Anthropic.Tool.InputSchema,
        eager_input_streaming: true,
      },
    ],
    tool_choice: { type: "auto" as const },
  };
  // Fora da gramática estrita o schema não é imposto na geração. Anuláveis
  // omitidos viram null (fillOmittedNullables) e o que ainda reprovar no
  // validador de quem chama volta ao modelo UMA vez como tool_result de erro —
  // o mesmo ciclo validar→corrigir do `claude -p --json-schema` da bancada.
  let messages: Anthropic.MessageParam[] = base.messages;
  let usage: LlmUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
  let missingCalls = 0;
  let repairs = 0;
  for (;;) {
    const stream = client.messages.stream({ ...params, messages }, requestOptions);
    let acc = "";
    let toolIndex: number | null = null;
    for await (const event of stream) {
      if (
        toolIndex === null &&
        event.type === "content_block_start" &&
        event.content_block.type === "tool_use" &&
        event.content_block.name === toolName
      ) {
        toolIndex = event.index;
      } else if (
        event.type === "content_block_delta" &&
        event.index === toolIndex &&
        event.delta.type === "input_json_delta"
      ) {
        acc += event.delta.partial_json;
        opts.onPartialJson?.(acc);
      }
    }
    const message = await stream.finalMessage();
    usage = addUsage(usage, anthropicUsage(message));
    assertAnthropicStop(message, ["tool_use", "end_turn"], what);
    const call = toolIndex === null ? undefined : message.content[toolIndex];
    // Few-shots com resposta em JSON puro às vezes levam o modelo a responder
    // em texto: JSON de objeto válido no texto vale como a saída (e passa pela
    // mesma validação).
    const textJson = call?.type === "tool_use" ? null : jsonObjectInText(textOf(message));
    if (textJson !== null) {
      const value = fillOmittedNullables(textJson, opts.schema);
      opts.validate?.(value);
      return { raw: JSON.stringify(value), usage, mode: "tool" };
    }
    if (call?.type !== "tool_use") {
      missingCalls += 1;
      console.warn(`[llm] ${what}: o modelo não chamou a ferramenta (tentativa ${missingCalls}).`);
      if (missingCalls >= 2) {
        throw new LlmOutputError("LLM_NO_STRUCTURED_OUTPUT", `${what}: o modelo não devolveu a saída estruturada.`);
      }
      continue;
    }
    // Com eager_input_streaming o SDK monta o input de forma tolerante; o texto
    // acumulado é a fonte fiel quando existe.
    let raw = acc.trim() ? acc : JSON.stringify(call.input);
    let problem: string | null = null;
    try {
      const value = fillOmittedNullables(JSON.parse(raw), opts.schema);
      raw = JSON.stringify(value);
      opts.validate?.(value);
    } catch (err) {
      problem = err instanceof Error ? err.message : String(err);
    }
    if (!problem || repairs >= 1) return { raw, usage, mode: "tool" };
    repairs += 1;
    console.warn(`[llm] ${what}: saída fora do schema; pedindo correção (${problem.slice(0, 160)}).`);
    const toolUses = message.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    messages = [
      ...messages,
      { role: "assistant", content: message.content as Anthropic.ContentBlockParam[] },
      {
        role: "user",
        content: toolUses.map((b) => ({
          type: "tool_result" as const,
          tool_use_id: b.id,
          is_error: true,
          content:
            b.id === call.id
              ? `A saída não passou na validação do schema. Corrija e chame \`${toolName}\` de novo com o resultado completo.\nErro: ${problem.slice(0, 2000)}`
              : "Ignorada: chame a ferramenta uma única vez.",
        })),
      },
    ];
  }
}

function jsonObjectInText(text: string): Record<string, unknown> | null {
  const body = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  if (!body.startsWith("{")) return null;
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function addUsage(a: LlmUsage, b: LlmUsage): LlmUsage {
  return {
    inputTokens: (a.inputTokens ?? 0) + (b.inputTokens ?? 0),
    outputTokens: (a.outputTokens ?? 0) + (b.outputTokens ?? 0),
    cachedInputTokens: (a.cachedInputTokens ?? 0) + (b.cachedInputTokens ?? 0),
  };
}

async function* anthropicTextStream(opts: LlmTextOptions, client: AnthropicClient): AsyncGenerator<string, LlmUsage, void> {
  const stream = client.messages.stream(
    {
      model: opts.target.model,
      max_tokens: opts.maxTokens ?? 32000,
      thinking: { type: "adaptive" },
      output_config: { effort: anthropicEffort(opts.target.effort) },
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: anthropicMessages(opts.messages),
    },
    { signal: opts.signal, timeout: 180_000 },
  );
  let full = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      full += event.delta.text;
      yield event.delta.text;
    }
  }
  const message = await stream.finalMessage();
  assertAnthropicStop(message, ["end_turn"], opts.label ?? "writer");
  if (!full.trim()) throw new LlmOutputError("LLM_EMPTY", `${opts.label ?? "writer"}: texto vazio.`);
  return anthropicUsage(message);
}

// ---------------------------------------------------------------------------
// OpenAI (rollback por env)
// ---------------------------------------------------------------------------

function openaiMessages(system: string, messages: LlmMessage[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return [
    { role: "system", content: system },
    ...messages.map((m): OpenAI.Chat.Completions.ChatCompletionMessageParam =>
      m.image && m.role === "user"
        ? {
            role: "user",
            content: [
              { type: "text", text: m.content },
              { type: "image_url", image_url: { url: `data:${m.image.mediaType};base64,${m.image.base64}`, detail: "high" } },
            ],
          }
        : m.role === "assistant"
          ? { role: "assistant", content: m.content }
          : { role: "user", content: m.content },
    ),
  ];
}

function openaiSampling(target: LlmTarget, maxTokens: number, temperature: number): Record<string, unknown> {
  return isOpenAIReasoningModel(target.model)
    ? { max_completion_tokens: maxTokens, reasoning_effort: target.effort }
    : { temperature, max_tokens: maxTokens };
}

async function openaiJson(opts: LlmJsonOptions, client: OpenAIClient): Promise<LlmJsonResult> {
  const params = {
    model: opts.target.model,
    ...openaiSampling(opts.target, opts.openaiMaxTokens ?? 16000, 0),
    response_format: {
      type: "json_schema",
      json_schema: { name: toolNameFor(opts.schemaName), strict: true, schema: opts.schema },
    },
    messages: openaiMessages(opts.system, opts.messages),
    stream: true,
    stream_options: { include_usage: true },
  } as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming;
  const stream = await client.chat.completions.create(params, { signal: opts.signal });
  let acc = "";
  let usage: LlmUsage = {};
  let finish: string | null | undefined;
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      acc += delta;
      opts.onPartialJson?.(acc);
    }
    finish = chunk.choices[0]?.finish_reason ?? finish;
    if (chunk.usage) {
      usage = {
        inputTokens: chunk.usage.prompt_tokens,
        outputTokens: chunk.usage.completion_tokens,
        cachedInputTokens: chunk.usage.prompt_tokens_details?.cached_tokens,
      };
    }
  }
  if (finish === "length") throw new LlmOutputError("LLM_TRUNCATED", `${opts.schemaName}: resposta truncada.`);
  if (!acc.trim()) throw new LlmOutputError("LLM_EMPTY", `${opts.schemaName}: resposta vazia.`);
  return { raw: acc, usage, mode: "openai" };
}

async function* openaiTextStream(opts: LlmTextOptions, client: OpenAIClient): AsyncGenerator<string, LlmUsage, void> {
  const params = {
    model: opts.target.model,
    ...openaiSampling(opts.target, opts.openaiMaxTokens ?? 2500, opts.openaiTemperature ?? 0.2),
    messages: openaiMessages(opts.system, opts.messages),
    stream: true,
    stream_options: { include_usage: true },
  } as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming;
  const stream = await client.chat.completions.create(params, { signal: opts.signal });
  let usage: LlmUsage = {};
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) yield delta;
    if (chunk.usage) {
      usage = {
        inputTokens: chunk.usage.prompt_tokens,
        outputTokens: chunk.usage.completion_tokens,
        cachedInputTokens: chunk.usage.prompt_tokens_details?.cached_tokens,
      };
    }
  }
  return usage;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export type LlmJsonOptions = {
  target: LlmTarget;
  system: string;
  messages: LlmMessage[];
  /** Nome estável do schema (vira nome da ferramenta e chave do cache de recusa). */
  schemaName: string;
  schema: Record<string, unknown>;
  /** Anthropic: teto que inclui o thinking. Default 16000. */
  maxTokens?: number;
  /** OpenAI (rollback): teto da saída visível. Default 16000. */
  openaiMaxTokens?: number;
  signal?: AbortSignal;
  /** JSON parcial acumulado — só para progresso de UX, nunca para parse. */
  onPartialJson?: (accumulated: string) => void;
  /**
   * Validador do chamador (lança com a mensagem do erro). No caminho por
   * ferramenta, uma reprovação volta ao modelo para UMA correção.
   */
  validate?: (value: unknown) => void;
  /** Só testes/bancada. */
  anthropicClient?: AnthropicClient;
  openaiClient?: OpenAIClient;
};

export type LlmJsonResult = { raw: string; usage: LlmUsage; mode: "strict" | "tool" | "openai" };

/** Chamada estruturada: devolve o JSON CRU; quem chama faz o parse com o próprio Zod. */
export async function llmJson(opts: LlmJsonOptions): Promise<LlmJsonResult> {
  return opts.target.provider === "anthropic"
    ? anthropicJson(opts, ensureAnthropicConfigured(opts.anthropicClient))
    : openaiJson(opts, opts.openaiClient ?? openai());
}

/** `llmJson` + `JSON.parse` + parser do chamador. */
export async function llmParsed<T>(
  opts: LlmJsonOptions & { parser: { parse: (input: unknown) => T } },
): Promise<{ value: T; usage: LlmUsage }> {
  const { raw, usage } = await llmJson({ ...opts, validate: (v) => void opts.parser.parse(v) });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${opts.schemaName}: resposta não é JSON válido. Início: ${raw.slice(0, 200)}`);
  }
  return { value: opts.parser.parse(parsed), usage };
}

export type LlmTextOptions = {
  target: LlmTarget;
  system: string;
  messages: LlmMessage[];
  /** Anthropic: teto que inclui o thinking. Default 32000. */
  maxTokens?: number;
  /** OpenAI (rollback): teto da saída visível. Default 2500. */
  openaiMaxTokens?: number;
  /** OpenAI não-reasoning (rollback): temperatura. Anthropic nunca recebe temperature. */
  openaiTemperature?: number;
  signal?: AbortSignal;
  /** Rótulo das mensagens de erro. */
  label?: string;
  anthropicClient?: AnthropicClient;
  openaiClient?: OpenAIClient;
};

/** Texto em streaming. Retorna o uso de tokens ao terminar. */
export async function* llmTextStream(opts: LlmTextOptions): AsyncGenerator<string, LlmUsage, void> {
  return opts.target.provider === "anthropic"
    ? yield* anthropicTextStream(opts, ensureAnthropicConfigured(opts.anthropicClient))
    : yield* openaiTextStream(opts, opts.openaiClient ?? openai());
}

/** Texto completo (sem streaming para quem chama). */
export async function llmText(opts: LlmTextOptions): Promise<{ text: string; usage: LlmUsage }> {
  let text = "";
  const gen = llmTextStream(opts);
  for (;;) {
    const next = await gen.next();
    if (next.done) return { text, usage: next.value };
    text += next.value;
  }
}
