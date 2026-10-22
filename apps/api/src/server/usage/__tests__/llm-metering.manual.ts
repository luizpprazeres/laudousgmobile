import assert from "node:assert/strict";
import type Anthropic from "@anthropic-ai/sdk";
import { llmJson, llmText } from "../../ai/llm";
import { withUsageRequest, setUsageUser } from "../context";
import { withUsageStorage, type UsageDependencies } from "../recordUsage";
import { PRICE_SEED } from "../pricing";
async function main() {
  const rows: Record<string, unknown>[] = [];
  const deps: UsageDependencies = {
    prices: async () => PRICE_SEED,
    insert: async (row) => {
      rows.push(row);
    },
  };
  const target = {
    provider: "anthropic" as const,
    model: "claude-haiku-5-5",
    effort: "medium",
    thinking: "disabled" as const,
  };
  // Large schema selects the tool path; no tool on first turn forces one real repair attempt.
  const schema = {
    type: "object",
    properties: Object.fromEntries(
      Array.from({ length: 40 }, (_, i) => [`field${i}`, { type: "string" }]),
    ),
    required: [],
    additionalProperties: false,
  };
  let calls = 0;
  const client = {
    messages: {
      stream: () => {
        const n = ++calls;
        const message = {
          model: target.model,
          stop_reason: n === 1 ? "end_turn" : "tool_use",
          content:
            n === 1
              ? []
              : [{ type: "tool_use", name: "Repair", id: "tool1", input: {} }],
          usage: {
            input_tokens: 100,
            output_tokens: 10,
            cache_creation_input_tokens: 20,
            cache_read_input_tokens: 30,
          },
        };
        return {
          async *[Symbol.asyncIterator]() {
            if (n > 1)
              yield {
                type: "content_block_start",
                index: 0,
                content_block: message.content[0],
              };
          },
          finalMessage: async () => message,
        };
      },
    },
  } as unknown as Pick<Anthropic, "messages">;
  await withUsageStorage(deps, () =>
    withUsageRequest(
      new Request("https://synthetic.invalid", {
        headers: { "user-agent": "LaudoUSG/18 CFNetwork/3860 Darwin/25" },
      }),
      "generate",
      async () => {
        setUsageUser("00000000-0000-4000-8000-000000000001");
        await llmJson({
          target,
          system: "SYNTHETIC PRIVATE SYSTEM",
          messages: [{ role: "user", content: "SYNTHETIC PRIVATE INPUT" }],
          schemaName: "Repair",
          schema,
          anthropicClient: client,
        });
        // An interrupted provider fails, but the event write must not affect the original exception.
        await assert.rejects(
          () =>
            llmText({
              target,
              system: "private",
              messages: [],
              anthropicClient: {
                messages: {
                  stream: () => {
                    throw Error("provider unavailable");
                  },
                },
              } as unknown as Pick<Anthropic, "messages">,
            }),
          /provider unavailable/,
        );
      },
    ),
  );
  // after() has no Next request here; fallback schedules caught async writes.
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(calls, 2);
  assert.equal(rows.length, 3);
  assert.equal(
    rows.filter((r) => r.input_tokens === 150).length,
    2,
    "each physical repair call metered exactly once; no aggregate duplicate",
  );
  assert.equal(rows[0]?.cached_input_tokens, 30);
  assert.equal(rows[0]?.cache_write_input_tokens, 20);
  assert.equal(rows[0]?.surface, "ios");
  assert.equal(rows[0]?.request_id, rows[1]?.request_id);
  assert.equal(rows[2]?.ok, false);
  assert.equal(rows[2]?.cost_usd, null);
  assert.equal(JSON.stringify(rows).includes("PRIVATE"), false);
  // Telemetry database failure must preserve successful provider output.
  const textClient = {
    messages: {
      stream: () => ({
        async *[Symbol.asyncIterator]() {
          yield {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "OK" },
          };
        },
        finalMessage: async () => ({
          model: target.model,
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
          content: [],
        }),
      }),
    },
  } as unknown as Pick<Anthropic, "messages">;
  const result = await withUsageStorage(
    {
      ...deps,
      insert: async () => {
        throw Error("db unavailable");
      },
    },
    () =>
      withUsageRequest(
        new Request("https://synthetic.invalid"),
        "edit",
        async () => {
          setUsageUser("00000000-0000-4000-8000-000000000001");
          return llmText({
            target,
            system: "private",
            messages: [],
            anthropicClient: textClient,
            label: "editReport",
          });
        },
      ),
  );
  assert.equal(result.text, "OK");
  await new Promise((resolve) => setTimeout(resolve, 10));
  console.log(
    "LLM metering: physical retries, failures, nonblocking storage, privacy, surface and request correlation passed",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
