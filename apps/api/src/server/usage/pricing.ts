/** Prices observed 2026-10-21; standard synchronous API, USD. No alias/family fallback. */
export type ModelPrice = {
  provider: string;
  model: string;
  version: string;
  effective_from: string;
  effective_to?: string | null;
  min_input_tokens: number;
  input_per_million: number | null;
  output_per_million: number | null;
  cached_per_million: number | null;
  cache_write_per_million: number | null;
  audio_per_minute: number | null;
  audio_input_per_million: number | null;
  source_url: string;
  checked_on: string;
};
export type Meter = {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  cacheWriteInputTokens?: number;
  audioSeconds?: number;
  audioInputTokens?: number;
  textInputTokens?: number;
};
const openai = "https://developers.openai.com/api/docs/models/";
const claude = "https://platform.claude.com/docs/en/about-claude/pricing";
function token(
  provider: string,
  model: string,
  input: number,
  output: number,
  cached: number | null,
  write: number | null,
  source: string,
  min = 0,
): ModelPrice {
  return {
    provider,
    model,
    version: `observed-2026-10-21-${min}`,
    effective_from: "2026-10-21T00:00:00Z",
    min_input_tokens: min,
    input_per_million: input,
    output_per_million: output,
    cached_per_million: cached,
    cache_write_per_million: write,
    audio_per_minute: null,
    audio_input_per_million: null,
    source_url: source,
    checked_on: "2026-10-21",
  };
}
export const PRICE_SEED: ModelPrice[] = [
  token("openai", "gpt-5", 1.25, 10, 0.125, null, openai + "gpt-5"),
  token("openai", "gpt-5-2025-08-07", 1.25, 10, 0.125, null, openai + "gpt-5"),
  {
    ...token(
      "openai",
      "gpt-4o-transcribe",
      2.5,
      10,
      null,
      null,
      "https://developers.openai.com/cookbook/examples/realtime_out_of_band_transcription",
    ),
    audio_input_per_million: 6,
  },
  token(
    "openai",
    "gpt-4o-mini-transcribe",
    1.25,
    5,
    null,
    null,
    openai + "gpt-4o-mini-transcribe",
  ),
  {
    ...token("openai", "whisper-1", 0, 0, 0, null, openai + "whisper-1"),
    input_per_million: null,
    output_per_million: null,
    cached_per_million: null,
    audio_per_minute: 0.006,
  },
  token("openai", "gpt-6-luna", 0.1, 0.5, 0.01, null, openai + "gpt-6-luna"),
  token(
    "openai",
    "gpt-6-luna",
    0.2,
    0.75,
    0.02,
    null,
    openai + "gpt-6-luna",
    272001,
  ),
  token(
    "openai",
    "gpt-5.4-mini",
    0.75,
    4.5,
    0.075,
    null,
    openai + "gpt-5.4-mini",
  ),
  token("openai", "gpt-5.4", 2.5, 15, 0.25, null, openai + "gpt-5.4"),
  token("openai", "gpt-5.4", 5, 22.5, 0.5, null, openai + "gpt-5.4", 272001),
  token("anthropic", "claude-haiku-5-5", 0.1, 0.5, 0.01, 0.125, claude),
  token("anthropic", "claude-haiku-5-5", 0.5, 2.5, 0.05, 0.625, claude, 100001),
  token("anthropic", "claude-sonnet-5-5", 2, 10, 0.1, 2.5, claude),
  token("anthropic", "claude-opus-5-5", 4, 20, 0.2, 5, claude),
];
// Only snapshots explicitly listed on the cited official model pages. Materialize
// independent exact-model rows; never strip a suffix from an unknown model at runtime.
for (const [alias, snapshot] of [
  ["gpt-5.4", "gpt-5.4-2026-03-05"],
  ["gpt-5.4-mini", "gpt-5.4-mini-2026-03-17"],
] as const) {
  PRICE_SEED.push(
    ...PRICE_SEED.filter((p) => p.model === alias).map((p) => ({
      ...p,
      model: snapshot,
    })),
  );
}

export function priceFor(
  prices: ModelPrice[],
  provider: string,
  model: string,
  at: Date,
  input = 0,
): ModelPrice | undefined {
  return prices
    .filter(
      (p) =>
        p.provider === provider &&
        p.model === model &&
        p.min_input_tokens <= input &&
        Date.parse(p.effective_from) <= at.getTime() &&
        (!p.effective_to || at.getTime() < Date.parse(p.effective_to)),
    )
    .sort(
      (a, b) =>
        Date.parse(b.effective_from) - Date.parse(a.effective_from) ||
        b.min_input_tokens - a.min_input_tokens,
    )[0];
}
export function calculateCost(
  price: ModelPrice | undefined,
  meter: Meter,
): number | null {
  if (!price) return null;
  const values = Object.values(meter).filter((v) => v !== undefined);
  if (values.some((v) => !Number.isFinite(v) || v! < 0)) return null;
  if (meter.audioSeconds !== undefined)
    return price.audio_per_minute === null
      ? null
      : (meter.audioSeconds / 60) * price.audio_per_minute;
  if (meter.inputTokens === undefined || meter.outputTokens === undefined)
    return null;
  // ASR's input_tokens mixes audio and text. Never apply the text rate to that total,
  // including during a rollout where the stored price row lacks the new audio field.
  const mixedAudio =
    price.provider === "openai" &&
    /^gpt-4o(?:-mini)?-transcribe(?:-|$)/.test(price.model);
  if (
    mixedAudio ||
    meter.audioInputTokens !== undefined ||
    meter.textInputTokens !== undefined
  ) {
    const audio = meter.audioInputTokens,
      text = meter.textInputTokens;
    if (
      audio === undefined ||
      text === undefined ||
      audio + text !== meter.inputTokens ||
      (meter.cachedInputTokens ?? 0) !== 0 ||
      (meter.cacheWriteInputTokens ?? 0) !== 0 ||
      price.input_per_million == null ||
      price.output_per_million == null ||
      (audio > 0 && price.audio_input_per_million == null)
    )
      return null;
    return (
      (audio * (price.audio_input_per_million ?? 0) +
        text * price.input_per_million +
        meter.outputTokens * price.output_per_million) /
      1e6
    );
  }
  const cached = meter.cachedInputTokens ?? 0,
    write = meter.cacheWriteInputTokens ?? 0;
  if (
    cached + write > meter.inputTokens ||
    price.input_per_million === null ||
    price.output_per_million === null ||
    (cached > 0 && price.cached_per_million === null) ||
    (write > 0 && price.cache_write_per_million === null)
  )
    return null;
  return (
    ((meter.inputTokens - cached - write) * price.input_per_million +
      meter.outputTokens * price.output_per_million +
      cached * (price.cached_per_million ?? 0) +
      write * (price.cache_write_per_million ?? 0)) /
    1e6
  );
}
