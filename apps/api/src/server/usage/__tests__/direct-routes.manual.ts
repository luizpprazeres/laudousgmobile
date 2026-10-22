/** Real route handlers; synthetic auth, providers, SSE and local usage storage only. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as context from "../context";
import * as recorder from "../recordUsage";
import { PRICE_SEED } from "../pricing";
import * as consultantTypes from "../../ai/consultantTypes";
const uid = "00000000-0000-4000-8000-000000000001";
function route(
  name: string,
  mocks: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) {
  const compiled = ts.transpileModule(
    readFileSync(resolve(`apps/api/src/app/api/${name}/route.ts`), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const commonJsModule = {
    exports: {} as { POST: (req: Request) => Promise<Response> },
  };
  const common: Record<string, unknown> = {
    "@/server/usage/context": context,
    "@/server/usage/recordUsage": recorder,
    "@/server/auth/verifyJwt": {
      verifyJwt: async () => {
        context.setUsageUser(uid);
        return { id: uid };
      },
      unauthorized: () => new Response(null, { status: 401 }),
    },
    "@/server/cors": { OPTIONS: () => new Response() },
    ...mocks,
  };
  runInNewContext(compiled, {
    module: commonJsModule,
    exports: commonJsModule.exports,
    URL,
    Request,
    Response,
    File,
    FormData,
    AbortController,
    process: { env: {} },
    console: { log() {}, error() {}, warn() {} },
    require: (id: string) => {
      assert.ok(id in common, `unexpected route import: ${id}`);
      return common[id];
    },
    ...extra,
  });
  return commonJsModule.exports.POST;
}
async function main() {
  const rows: Record<string, unknown>[] = [];
  const deps = {
    prices: async () => PRICE_SEED,
    insert: async (row: Record<string, unknown>) => {
      rows.push(row);
    },
  };
  await recorder.withUsageStorage(deps, async () => {
    let format: unknown;
    const transcribe = route("transcribe", {
      "@/server/ai/openai": {
        openai: () => ({
          audio: {
            transcriptions: {
              create: async (params: Record<string, unknown>) => {
                format = params.response_format;
                return { text: "Texto fictício", duration: 12.5 };
              },
            },
          },
        }),
      },
      "@/server/asr/medicalGlossary": { ALL_MEDICAL_ASR_KEYTERMS: [] },
      "@/server/asr/transcriptNormalizer": {
        normalizeAsrTranscript: (text: string) => text,
      },
      "@/server/env": { env: () => ({ ASR_REPARO_NUMEROS: "false" }) },
    });
    const form = new FormData();
    form.set(
      "audio",
      new File(["synthetic-audio"], "synthetic.wav", { type: "audio/wav" }),
    );
    const res = await transcribe(
      new Request("https://synthetic.invalid/api/transcribe", {
        method: "POST",
        body: form,
        headers: { "user-agent": "LaudoUSG/18 CFNetwork/3860 Darwin/25" },
      }),
    );
    assert.equal(format, "verbose_json");
    assert.deepEqual(await res.json(), {
      transcript: "Texto fictício",
      language: "pt",
    });
    const consultant = route("consultant", {
      "@/server/ai/consultantPrompt": {
        CONSULTANT_SYSTEM_PROMPT: "PRIVATE SYSTEM",
      },
      "@/server/ai/consultantTypes": consultantTypes,
      "@/server/ai/llm": { isRetiredModel: () => false },
      "@/server/env": {
        env: () => ({
          OPENAI_MODEL_CONSULTANT: "gpt-5",
          OPENAI_MODEL_CONSULTANT_FALLBACK: "gpt-5.4-mini",
        }),
      },
      "@/server/sse/stream": {
        nowIso: () => "synthetic",
        sseResponse: async (
          fn: (
            sink: { emit: (event: unknown) => void },
            signal: AbortSignal,
          ) => Promise<void>,
        ) => {
          const events: unknown[] = [];
          await fn(
            { emit: (event) => events.push(event) },
            new AbortController().signal,
          );
          return new Response(JSON.stringify(events));
        },
      },
      "@/server/ai/openai": {
        openai: () => ({
          chat: {
            completions: {
              create: async (params: Record<string, unknown>) => {
                assert.equal(
                  (params.stream_options as { include_usage: boolean })
                    .include_usage,
                  true,
                );
                if (params.model === "gpt-5")
                  throw Error("synthetic primary unavailable");
                return (async function* () {
                  yield {
                    model: "gpt-5.4-mini",
                    choices: [{ delta: { content: "ANSWER" } }],
                  };
                  yield {
                    model: "gpt-5.4-mini",
                    choices: [],
                    usage: {
                      prompt_tokens: 1000,
                      completion_tokens: 100,
                      prompt_tokens_details: { cached_tokens: 100 },
                    },
                  };
                })();
              },
            },
          },
        }),
      },
    });
    const consult = await consultant(
      new Request("https://synthetic.invalid/api/consultant", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "PRIVATE QUESTION" }],
        }),
        headers: { "content-type": "application/json" },
      }),
    );
    assert.equal(consult.status, 200);
    assert.match(await consult.text(), /ANSWER/);
    let ttl: unknown;
    const deepgram = route(
      "deepgram/token",
      {
        "@/server/env": {
          env: () => ({
            DEEPGRAM_MODEL: "nova-3",
            DEEPGRAM_LANGUAGE: "pt-BR",
            DEEPGRAM_API_KEY: "synthetic-key",
          }),
        },
        "@/server/asr/medicalGlossary": {
          medicalAsrKeytermsForCategory: () => [],
          medicalAsrKeytermsW11: () => [],
          keytermsW11Ativo: () => false,
        },
      },
      {
        fetch: async (_url: unknown, init: { body: string }) => {
          ttl = JSON.parse(init.body).ttl_seconds;
          return Response.json({
            access_token: "SYNTHETIC SECRET",
            expires_in: 60,
          });
        },
      },
    );
    assert.equal(
      (
        await deepgram(
          new Request("https://synthetic.invalid/api/deepgram/token", {
            method: "POST",
          }),
        )
      ).status,
      200,
    );
    assert.equal(ttl, 60);
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(rows.length, 4);
  const asr = rows.find((row) => row.stage === "transcription")!;
  assert.equal(asr.audio_seconds, 12.5);
  assert.equal(asr.surface, "ios");
  assert.equal(asr.cost_usd, (12.5 / 60) * 0.006);
  assert.equal(rows.filter((row) => row.stage === "consultant").length, 2);
  assert.equal(
    rows.find((row) => row.stage === "consultant" && row.ok === false)
      ?.cost_usd,
    null,
  );
  assert.equal(
    rows.find((row) => row.stage === "consultant" && row.ok === true)?.model,
    "gpt-5.4-mini",
  );
  const grant = rows.find((row) => row.stage === "token_grant")!;
  assert.equal(grant.audio_seconds, null);
  assert.equal(grant.cost_usd, null);
  assert.equal(grant.measurement, "unmeasured");
  assert.equal(JSON.stringify(rows).includes("PRIVATE"), false);
  assert.equal(JSON.stringify(rows).includes("SECRET"), false);
  assert.equal(JSON.stringify(rows).includes("Texto"), false);
  console.log(
    "Direct routes: Whisper duration/contract, consultant fallback/final usage-only chunk, Deepgram TTL and privacy passed",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
