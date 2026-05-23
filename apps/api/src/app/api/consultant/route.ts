import type OpenAI from "openai";
import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { OPTIONS } from "@/server/cors";
import { CONSULTANT_SYSTEM_PROMPT } from "@/server/ai/consultantPrompt";
import {
  ConsultantRequestBodySchema,
  type ConsultantSSEEvent,
} from "@/server/ai/consultantTypes";
import { openai } from "@/server/ai/openai";
import { env } from "@/server/env";
import { nowIso, sseResponse } from "@/server/sse/stream";
import type { GenerateSSEEvent } from "@laudousg/shared";

export { OPTIONS };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const rateMap = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const recent = (rateMap.get(userId) ?? []).filter(
    (timestamp) => now - timestamp <= 60_000,
  );
  if (recent.length >= 10) {
    rateMap.set(userId, recent);
    return false;
  }
  recent.push(now);
  rateMap.set(userId, recent);
  return true;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function toGenerateEvent(event: ConsultantSSEEvent): GenerateSSEEvent {
  return event as unknown as GenerateSSEEvent;
}

// gpt-5*/o-series aceitam reasoning_effort; gpt-4.x/gpt-4o não.
function supportsReasoningEffort(model: string): boolean {
  return /^(gpt-5|o\d)/.test(model);
}

async function createConsultantStream(args: {
  model: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  signal: AbortSignal;
}) {
  const base: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
    model: args.model,
    messages: args.messages,
    temperature: 0.3,
    max_tokens: 4000,
    stream: true,
  };
  const params = supportsReasoningEffort(args.model)
    ? { ...base, reasoning_effort: "medium" as const }
    : base;
  return openai().chat.completions.create(params, { signal: args.signal });
}

export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const parsed = ConsultantRequestBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonResponse(
      { error: "invalid_body", issues: parsed.error.format() },
      400,
    );
  }

  if (!checkRateLimit(user.id)) {
    return jsonResponse({ error: "rate_limit_exceeded" }, 429);
  }

  const e = env();
  const primaryModel = e.OPENAI_MODEL_CONSULTANT;
  const fallbackModel = e.OPENAI_MODEL_CONSULTANT_FALLBACK;
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: CONSULTANT_SYSTEM_PROMPT },
    ...parsed.data.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

  return sseResponse(async ({ emit }, signal) => {
    try {
      let stream: Awaited<ReturnType<typeof createConsultantStream>>;
      try {
        stream = await createConsultantStream({
          model: primaryModel,
          messages,
          signal,
        });
      } catch (primaryError) {
        console.log("[consultant] primary model failed", primaryError);
        stream = await createConsultantStream({
          model: fallbackModel,
          messages,
          signal,
        });
      }

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (!text) continue;
        emit(toGenerateEvent({ type: "content", text, ts: nowIso() }));
      }

      emit(toGenerateEvent({ type: "done", ts: nowIso() }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido.";
      console.log("[consultant] failure", error);
      emit(toGenerateEvent({ type: "error", message, ts: nowIso() }));
    }
  });
}
