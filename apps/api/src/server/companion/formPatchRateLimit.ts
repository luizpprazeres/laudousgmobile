const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;
const rateMap = new Map<string, number[]>();

export function companionFormPatchRateAllowed(userId: string, now = Date.now()): boolean {
  const recent = (rateMap.get(userId) ?? []).filter(
    (timestamp) => now - timestamp <= RATE_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT) {
    rateMap.set(userId, recent);
    return false;
  }
  recent.push(now);
  rateMap.set(userId, recent);
  return true;
}

export function resetCompanionFormPatchRateLimitForTests(): void {
  if (process.env.NODE_ENV === "production") return;
  rateMap.clear();
}
