import postgres from "postgres";
import { databaseSslOptions } from "@laudousg/db/supabase-tls";

export const HEALTH_TIMEOUT_MS = 2_000;
type Check = { ok: true } | { ok: false; code: "timeout" | "unavailable" | "misconfigured" | "invalid_response" };
type Config = { DATABASE_URL?: string; DEEPGRAM_API_KEY?: string; OPENAI_API_KEY?: string };
type SqlProbe = { query: () => PromiseLike<unknown>; close: () => Promise<void> };
export type HealthDependencies = {
  config: () => Config;
  fetch: typeof fetch;
  sql: (url: string) => SqlProbe;
  schedule: (callback: () => void, ms: number) => () => void;
};
type Report = {
  ok: boolean;
  service: "laudousg-api";
  ts: string;
  checks: { supabase: Check; deepgram: Check; openai: Check };
};

const defaults: HealthDependencies = {
  config: () => ({
    DATABASE_URL: process.env.DATABASE_URL,
    DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  }),
  fetch: (...args) => fetch(...args),
  sql: (url) => {
    // Pool exclusivo do probe: nunca fechar nem alterar o pool da aplicação.
    const client = postgres(url, {
      max: 1,
      prepare: false,
      // A CA pública oficial da Supabase permite TLS com validação completa.
      ssl: databaseSslOptions(url),
      connect_timeout: 2,
      // Sem GUC de sessão: DATABASE_URL pode apontar para transaction pooling.
      // O deadline aborta o probe e end({timeout:0}) destrói o cliente próprio.
      onnotice: () => {},
    });
    return {
      query: () => client`select 1 as ok`,
      // timeout zero destrói conexões e rejeita consultas ainda pendentes.
      close: () => client.end({ timeout: 0 }),
    };
  },
  schedule: (callback, ms) => {
    const timer = setTimeout(callback, ms);
    return () => clearTimeout(timer);
  },
};

class InvalidResponse extends Error {}

function bounded(probe: (signal: AbortSignal) => Promise<void>, deps: HealthDependencies): Promise<Check> {
  const controller = new AbortController();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: Check) => {
      if (settled) return;
      settled = true;
      cancelTimer();
      resolve(result);
    };
    const cancelTimer = deps.schedule(() => {
      // Além de responder timeout, interrompe fetch/body e fecha o SQL próprio.
      controller.abort();
      finish({ ok: false, code: "timeout" });
    }, HEALTH_TIMEOUT_MS);
    Promise.resolve().then(() => probe(controller.signal)).then(
      () => finish({ ok: true }),
      (error: unknown) => finish({
        ok: false,
        code: controller.signal.aborted ? "timeout" : error instanceof InvalidResponse ? "invalid_response" : "unavailable",
      }),
    );
  });
}

async function sqlProbe(url: string, signal: AbortSignal, deps: HealthDependencies): Promise<void> {
  signal.throwIfAborted();
  const client = deps.sql(url);
  let closing: Promise<void> | undefined;
  const close = () => {
    if (!closing) {
      try { closing = client.close(); }
      catch (error) { closing = Promise.reject(error); }
    }
    return closing;
  };
  const onAbort = () => { void close().catch(() => {}); };
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    signal.throwIfAborted();
    const rows = await client.query();
    if (!Array.isArray(rows) || rows[0]?.ok !== 1) throw new InvalidResponse();
  } finally {
    // Manter o listener durante cleanup também cobre close que não terminou.
    try { await close(); }
    finally { signal.removeEventListener("abort", onAbort); }
  }
}

function configuredUrl(value: string | undefined): value is string {
  if (!value) return false;
  try { return ["postgres:", "postgresql:"].includes(new URL(value).protocol); }
  catch { return false; }
}
function configuredKey(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length >= 20;
}

async function httpProbe(
  provider: "deepgram" | "openai", key: string, signal: AbortSignal, deps: HealthDependencies,
): Promise<void> {
  signal.throwIfAborted();
  const response = await deps.fetch(
    provider === "deepgram" ? "https://api.deepgram.com/v1/auth/grant" : "https://api.openai.com/v1/models",
    {
      method: provider === "deepgram" ? "POST" : "GET",
      headers: provider === "deepgram"
        ? { Authorization: `Token ${key}`, "Content-Type": "application/json" }
        : { Authorization: `Bearer ${key}` },
      ...(provider === "deepgram" ? { body: JSON.stringify({ ttl_seconds: 60 }) } : {}),
      signal,
      cache: "no-store",
      redirect: "error",
    },
  );
  if (!response.ok) {
    // Não ler nem registrar texto de erro do fornecedor.
    await response.body?.cancel();
    throw new Error();
  }
  let body: unknown;
  try { body = await response.json(); }
  catch { throw new InvalidResponse(); }
  if (!body || typeof body !== "object") throw new InvalidResponse();
  const payload = body as Record<string, unknown>;
  if (provider === "deepgram") {
    if (typeof payload.access_token !== "string" || payload.access_token.length < 20) throw new InvalidResponse();
    if (payload.expires_in !== undefined &&
        (typeof payload.expires_in !== "number" || !Number.isFinite(payload.expires_in) || payload.expires_in <= 0)) {
      throw new InvalidResponse();
    }
  } else if (payload.object !== "list" || !Array.isArray(payload.data)) {
    throw new InvalidResponse();
  }
}

/** Sem IO até o GET. Dependências injetáveis permitem gates sem rede/banco/env real. */
export function createHealthHandler(overrides: Partial<HealthDependencies> = {}): () => Promise<Response> {
  const deps = { ...defaults, ...overrides };
  let inFlight: Promise<Report> | undefined;
  const run = async (): Promise<Report> => {
    let config: Config;
    try { config = deps.config(); } catch { config = {}; }
    const missing: Check = { ok: false, code: "misconfigured" };
    const [supabase, deepgram, openai] = await Promise.all([
      configuredUrl(config.DATABASE_URL)
        ? bounded((signal) => sqlProbe(config.DATABASE_URL!, signal, deps), deps) : missing,
      configuredKey(config.DEEPGRAM_API_KEY)
        ? bounded((signal) => httpProbe("deepgram", config.DEEPGRAM_API_KEY!, signal, deps), deps) : missing,
      configuredKey(config.OPENAI_API_KEY)
        ? bounded((signal) => httpProbe("openai", config.OPENAI_API_KEY!, signal, deps), deps) : missing,
    ]);
    return {
      ok: supabase.ok && deepgram.ok && openai.ok,
      service: "laudousg-api",
      ts: new Date().toISOString(),
      checks: { supabase, deepgram, openai },
    };
  };
  return async () => {
    // Apenas chamadas simultâneas compartilham trabalho; nenhum resultado persiste.
    inFlight ??= run().finally(() => { inFlight = undefined; });
    const report = await inFlight;
    return new Response(JSON.stringify(report), {
      status: report.ok ? 200 : 503,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  };
}
