import assert from "node:assert/strict";
import { calculateCost, PRICE_SEED, priceFor } from "../pricing";
import {
  inferSurface,
  setUsageUser,
  usageContext,
  withUsageRequest,
} from "../context";
import { persistUsage } from "../recordUsage";
import { estimateCost } from "../../db/auditRepo";
const now = new Date("2026-10-21T12:00:00Z");
let checks = 0;
function check(name: string, fn: () => void) {
  fn();
  checks++;
  console.log(`✓ ${name}`);
}
async function main() {
  const price = (model: string, input = 0) =>
    priceFor(
      PRICE_SEED,
      model.startsWith("claude") ? "anthropic" : "openai",
      model,
      now,
      input,
    );
  check("correct GPT-5.4 and mini prices, no 4.1 fallback", () => {
    assert.equal(
      calculateCost(price("gpt-5.4-mini"), {
        inputTokens: 1e6,
        outputTokens: 1e6,
      }),
      5.25,
    );
    assert.equal(
      calculateCost(price("gpt-5.4"), {
        inputTokens: 1000,
        outputTokens: 1000,
      }),
      0.0175,
    );
    assert.equal(estimateCost(1000, 1000, "unknown-model"), null);
  });
  check(
    "ASR splits audio/text input and refuses incomplete modality counters",
    () => {
      const measured = {
        inputTokens: 1100,
        audioInputTokens: 1000,
        textInputTokens: 100,
        outputTokens: 100,
      };
      assert.equal(
        calculateCost(price("gpt-4o-transcribe"), measured),
        0.00725,
      );
      assert.equal(
        calculateCost(price("gpt-4o-transcribe"), {
          inputTokens: 1100,
          outputTokens: 100,
        }),
        null,
      );
      assert.equal(
        calculateCost(price("gpt-4o-transcribe"), {
          ...measured,
          textInputTokens: 99,
        }),
        null,
      );
      assert.equal(
        calculateCost(price("gpt-4o-transcribe"), {
          ...measured,
          cachedInputTokens: 1,
        }),
        null,
      );
      assert.equal(
        calculateCost(
          { ...price("gpt-4o-transcribe")!, audio_input_per_million: null },
          measured,
        ),
        null,
      );
      assert.equal(
        calculateCost(price("gpt-4o-mini-transcribe"), measured),
        null,
        "unknown official mini audio rate never silently uses its text rate",
      );
    },
  );
  check("Luna and Opus have explicit prices", () => {
    assert.equal(price("gpt-6-luna")?.cache_write_per_million, null);
    assert.equal(price("gpt-6-luna", 272001)?.cache_write_per_million, null);
    assert.equal(
      calculateCost(price("gpt-6-luna"), {
        inputTokens: 1000,
        outputTokens: 1000,
      }),
      0.0006,
    );
    assert.equal(
      calculateCost(price("claude-opus-5-5"), {
        inputTokens: 1000,
        outputTokens: 1000,
      }),
      0.024,
    );
  });
  check(
    "Anthropic cache read/write subtract from total input, not double billed",
    () => {
      assert.equal(
        calculateCost(price("claude-sonnet-5-5"), {
          inputTokens: 1000,
          outputTokens: 100,
          cachedInputTokens: 600,
          cacheWriteInputTokens: 200,
        }),
        0.00196,
      );
    },
  );
  check("tier boundaries are strict and apply to full input", () => {
    assert.equal(price("claude-haiku-5-5", 100000)?.input_per_million, 0.1);
    assert.equal(price("claude-haiku-5-5", 100001)?.input_per_million, 0.5);
    assert.equal(price("gpt-5.4", 272000)?.input_per_million, 2.5);
    assert.equal(price("gpt-5.4", 272001)?.output_per_million, 22.5);
  });
  check("version effective interval, exact provider/model only", () => {
    assert.equal(
      priceFor(PRICE_SEED, "openai", "gpt-5.4-mini", new Date("2026-10-20")),
      undefined,
    );
    assert.equal(
      priceFor(PRICE_SEED, "anthropic", "gpt-5.4-mini", now),
      undefined,
    );
    assert.equal(price("gpt-5.4-mini-unknown-snapshot"), undefined);
    const p = price("gpt-5")!;
    assert.equal(
      priceFor(
        [{ ...p, effective_to: now.toISOString() }],
        "openai",
        "gpt-5",
        now,
      ),
      undefined,
    );
  });
  check(
    "missing counters, invalid cache, missing price never become free",
    () => {
      assert.equal(calculateCost(price("gpt-5"), {}), null);
      assert.equal(
        calculateCost(undefined, { inputTokens: 0, outputTokens: 0 }),
        null,
      );
      assert.equal(
        calculateCost(price("gpt-5"), {
          inputTokens: 1,
          outputTokens: 0,
          cachedInputTokens: 2,
        }),
        null,
      );
      assert.equal(
        calculateCost(price("gpt-5"), { inputTokens: NaN, outputTokens: 1 }),
        null,
      );
      assert.equal(
        calculateCost(price("gpt-5"), { inputTokens: 0, outputTokens: 0 }),
        0,
      );
    },
  );
  check("Deepgram TTL is not audio; Whisper needs measured duration", () => {
    assert.equal(calculateCost(undefined, {}), null);
    assert.equal(
      calculateCost(price("whisper-1"), { audioSeconds: 60 }),
      0.006,
    );
    assert.equal(calculateCost(price("whisper-1"), {}), null);
  });
  check(
    "explicit surface wins, Swift UA inferred, unknown remains unknown",
    () => {
      const swift = "LaudoUSG/18 CFNetwork/3860 Darwin/25.0";
      assert.equal(
        inferSurface(
          new Request("https://test", { headers: { "user-agent": swift } }),
        ),
        "ios",
      );
      assert.equal(
        inferSurface(
          new Request("https://test", {
            headers: { "user-agent": swift, "x-laudousg-surface": "watch" },
          }),
        ),
        "watch",
      );
      assert.equal(
        inferSurface(
          new Request("https://test", {
            headers: { "user-agent": "Mozilla/5.0" },
          }),
        ),
        "web",
      );
      assert.equal(
        inferSurface(
          new Request("https://test", {
            headers: { "x-laudousg-surface": "malicious" },
          }),
        ),
        "unknown",
      );
    },
  );
  await Promise.all(
    ["a", "b"].map((user) =>
      withUsageRequest(new Request("https://test"), "test", async () => {
        setUsageUser(user);
        await new Promise((resolve) => setTimeout(resolve, 2));
        assert.equal(usageContext()?.userId, user);
      }),
    ),
  );
  checks++;
  console.log("✓ concurrent request identities stay isolated");
  const ctx = {
    userId: "00000000-0000-4000-8000-000000000001",
    route: "generate",
    surface: "ios" as const,
    requestId: "00000000-0000-4000-8000-000000000002",
  };
  let rows: Record<string, unknown>[] = [];
  const deps = {
    prices: async () => PRICE_SEED,
    insert: async (row: Record<string, unknown>) => {
      rows.push(row);
    },
  };
  await persistUsage(
    {
      provider: "openai",
      model: "gpt-5",
      stage: "writer",
      inputTokens: 1000,
      outputTokens: 100,
    },
    ctx,
    deps,
  );
  check(
    "stored priced event has version, metadata whitelist, no clinical payload",
    () => {
      assert.equal(rows[0]?.cost_usd, 0.00225);
      assert.match(String(rows[0]?.price_version), /^observed-/);
      assert.equal(rows[0]?.user_id, ctx.userId);
      assert.equal("prompt" in rows[0]!, false);
    },
  );
  for (const modalities of [
    { audioInputTokens: 1000, textInputTokens: 99 },
    { audioInputTokens: 1000 },
    { textInputTokens: 100 },
  ]) {
    rows = [];
    await persistUsage({
      provider: "openai", model: "gpt-4o-transcribe", stage: "transcription",
      inputTokens: 1100, outputTokens: 100, ...modalities,
    }, ctx, {
      ...deps,
      insert: async row => {
        // Simulate the SQL CHECK: a divergent pair would reject and lose this event.
        if (row.audio_input_tokens != null && row.text_input_tokens != null) {
          assert.equal(Number(row.audio_input_tokens) + Number(row.text_input_tokens), row.input_tokens);
        }
        rows.push(row);
      },
    });
    check("inconsistent/incomplete modality row is stored unpriced with both detail fields omitted", () => {
      assert.equal(rows.length, 1);
      assert.equal(rows[0]?.input_tokens, 1100);
      assert.equal(rows[0]?.output_tokens, 100);
      assert.equal("audio_input_tokens" in rows[0]!, false);
      assert.equal("text_input_tokens" in rows[0]!, false);
      assert.equal(rows[0]?.cost_usd, null);
      assert.equal(rows[0]?.price_version, null);
      assert.equal(rows[0]?.measurement, "unpriced");
    });
  }
  rows = [];
  await persistUsage(
    { provider: "deepgram", model: "nova-3", stage: "token_grant" },
    ctx,
    deps,
  );
  check("unmeasured grant persisted without fake seconds or cost", () => {
    assert.equal(rows[0]?.audio_seconds, null);
    assert.equal(rows[0]?.cost_usd, null);
  });
  rows = [];
  await persistUsage(
    {
      provider: "openai",
      model: "gpt-5",
      stage: "writer",
      inputTokens: 10,
      outputTokens: 10,
    },
    ctx,
    {
      ...deps,
      prices: async () => {
        throw Error("down");
      },
    },
  );
  check("catalog failure still records unknown cost", () => {
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.cost_usd, null);
  });
  await persistUsage(
    { provider: "openai", model: "gpt-5", stage: "writer" },
    ctx,
    {
      ...deps,
      insert: async () => {
        throw Error("sensitive error MUST NOT be logged");
      },
    },
  );
  checks++;
  console.log("✓ storage failure does not reject");
  console.log(`${checks} usage checks passed`);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
