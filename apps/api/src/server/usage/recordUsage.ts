import { AsyncLocalStorage } from "node:async_hooks";
import { after } from "next/server";
import { getServiceClient } from "../supabaseService";
import { usageContext, type UsageContext } from "./context";
import {
  calculateCost,
  priceFor,
  type Meter,
  type ModelPrice,
} from "./pricing";
export type UsageEvent = Meter & {
  provider: string;
  model: string;
  stage: string;
  ok?: boolean;
  errorCode?: "provider_error" | "aborted" | "invalid_output";
  durationMs?: number;
};
export type UsageDependencies = {
  prices: () => Promise<ModelPrice[]>;
  insert: (row: Record<string, unknown>) => Promise<void>;
};
const scopedStorage = new AsyncLocalStorage<UsageDependencies>();
/** Inject local storage in synthetic tests, isolated from concurrent requests. */
export function withUsageStorage<T>(deps: UsageDependencies, run: () => T): T {
  return scopedStorage.run(deps, run);
}
let cache: { prices: ModelPrice[]; until: number } | undefined;
const dependencies: UsageDependencies = {
  async prices() {
    if (cache && cache.until > Date.now()) return cache.prices;
    const { data, error } = await getServiceClient()
      .from("ai_model_prices")
      .select("*")
      .abortSignal(AbortSignal.timeout(3000));
    if (error) throw new Error("price_lookup_failed");
    const prices = (data ?? []) as ModelPrice[];
    cache = { prices, until: Date.now() + 60_000 };
    return prices;
  },
  async insert(row) {
    const { error } = await getServiceClient()
      .from("ai_usage_events")
      .insert(row)
      .abortSignal(AbortSignal.timeout(3000));
    if (error) throw new Error("usage_insert_failed");
  },
};
/** Whitelisted metadata only: never prompts, responses, transcripts, headers, keys or exception messages. */
export async function persistUsage(
  event: UsageEvent,
  context: UsageContext,
  deps = dependencies,
  at = new Date(),
): Promise<void> {
  try {
    let prices: ModelPrice[] = [];
    try {
      prices = await deps.prices();
    } catch {
      /* Still store unpriced usage if catalog is unavailable. */
    }
    const price = priceFor(
      prices,
      event.provider,
      event.model,
      at,
      event.inputTokens,
    );
    const meter: Meter = {
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      cachedInputTokens: event.cachedInputTokens,
      cacheWriteInputTokens: event.cacheWriteInputTokens,
      audioSeconds: event.audioSeconds,
    };
    const cost = calculateCost(price, meter);
    await deps.insert({
      user_id: context.userId ?? null,
      route: context.route,
      stage: event.stage,
      provider: event.provider,
      model: event.model,
      input_tokens: event.inputTokens ?? null,
      output_tokens: event.outputTokens ?? null,
      cached_input_tokens: event.cachedInputTokens ?? null,
      cache_write_input_tokens: event.cacheWriteInputTokens ?? null,
      audio_seconds: event.audioSeconds ?? null,
      cost_usd: cost,
      price_version: cost === null ? null : price!.version,
      measurement:
        cost !== null
          ? "priced"
          : event.audioSeconds === undefined &&
              (event.inputTokens === undefined ||
                event.outputTokens === undefined)
            ? "unmeasured"
            : "unpriced",
      surface: context.surface,
      request_id: context.requestId,
      created_at: at.toISOString(),
      duration_ms: event.durationMs ?? null,
      ok: event.ok ?? true,
      error_code: event.errorCode ?? null,
    });
  } catch {
    console.warn("[usage] storage_unavailable");
  }
}
/** Nonblocking. Next after() keeps the write alive after normal/SSE responses. */
export function recordUsage(event: UsageEvent): void {
  const context = usageContext();
  if (!context?.userId) return; // No benchmark/service traffic attributed to a real user.
  const snapshot = { ...context };
  const deps = scopedStorage.getStore() ?? dependencies;
  const at = new Date();
  const task = () => persistUsage(event, snapshot, deps, at);
  try {
    after(task);
  } catch {
    void task();
  } // Unit tests / non-Next runtimes.
}
