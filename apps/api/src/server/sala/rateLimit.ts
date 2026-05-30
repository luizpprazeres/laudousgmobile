/**
 * Rate limiter in-memory por token, com janela deslizante de 60s.
 *
 * Limitações conhecidas:
 * - State não compartilhado entre instâncias Vercel (serverless multi-zone).
 *   Em prática, isso ainda mitiga burst de um cliente único contra uma única instância.
 *   Pra cross-instance robusto, migrar pra Upstash/Redis no futuro.
 * - Bucket cleanup periódico pra evitar leak de Map em long-running warm.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60_000;
const MAX_POSTS_PER_MINUTE = 10;
const MAX_DELETES_PER_MINUTE = 5;

const POST_BUCKETS = new Map<string, Bucket>();
const DELETE_BUCKETS = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number };

function check(
  buckets: Map<string, Bucket>,
  key: string,
  limit: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
}

export function checkAnnotationPostLimit(token: string): RateLimitResult {
  return check(POST_BUCKETS, token, MAX_POSTS_PER_MINUTE);
}

export function checkAnnotationDeleteLimit(token: string): RateLimitResult {
  return check(DELETE_BUCKETS, token, MAX_DELETES_PER_MINUTE);
}

// Cleanup periódico (warm execution apenas). unref pra não bloquear shutdown.
if (typeof setInterval !== "undefined") {
  const timer = setInterval(
    () => {
      const now = Date.now();
      for (const [k, v] of POST_BUCKETS) {
        if (v.resetAt <= now) POST_BUCKETS.delete(k);
      }
      for (const [k, v] of DELETE_BUCKETS) {
        if (v.resetAt <= now) DELETE_BUCKETS.delete(k);
      }
    },
    5 * 60_000,
  );
  (timer as unknown as { unref?: () => void }).unref?.();
}

export const ANNOTATION_LIMITS = {
  windowMs: WINDOW_MS,
  postsPerMinute: MAX_POSTS_PER_MINUTE,
  deletesPerMinute: MAX_DELETES_PER_MINUTE,
  maxPerReport: 30,
} as const;
