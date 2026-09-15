/** T34 — mocks somente, sem env-file, banco, rede ou credenciais reais.
 * pnpm exec tsx src/server/health/__tests__/health.manual.ts
 */
import assert from "node:assert/strict";
import { createHealthHandler, HEALTH_TIMEOUT_MS, type HealthDependencies } from "../probes";

const SECRET = "synthetic-secret-never-publish";
const CONFIG = {
  DATABASE_URL: "postgres://synthetic:synthetic@invalid/health",
  DEEPGRAM_API_KEY: SECRET,
  OPENAI_API_KEY: SECRET,
};
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function clock() {
  let now = 0;
  let next = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  return {
    schedule(callback: () => void, ms: number) {
      const id = ++next;
      timers.set(id, { at: now + ms, callback });
      return () => { timers.delete(id); };
    },
    advance(ms: number) {
      now += ms;
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now && timers.delete(id)) timer.callback();
      }
    },
    pending: () => timers.size,
  };
}
type Provider = "supabase" | "deepgram" | "openai";
function setup(options: {
  fail?: Provider;
  bodyStalls?: "deepgram" | "openai";
  sqlStalls?: boolean;
  malformed?: "deepgram" | "openai";
  throwFetch?: boolean;
  closeFails?: boolean;
  missing?: keyof typeof CONFIG;
  expiresIn?: unknown;
  omitExpiry?: boolean;
} = {}) {
  const time = clock();
  const sqlResult = deferred<unknown>();
  let clients = 0;
  let closes = 0;
  let open = false;
  const requests: Array<{ url: string; options: RequestInit }> = [];
  const deps: HealthDependencies = {
    config: () => ({ ...CONFIG, ...(options.missing ? { [options.missing]: undefined } : {}) }),
    schedule: time.schedule,
    sql: () => {
      clients++;
      open = true;
      return {
        query: () => options.sqlStalls ? sqlResult.promise : options.fail === "supabase"
          ? Promise.reject(new Error(SECRET)) : Promise.resolve([{ ok: 1 }]),
        close: async () => {
          closes++;
          open = false;
          if (options.sqlStalls) sqlResult.reject(new Error(SECRET));
          if (options.closeFails) throw new Error(SECRET);
        },
      };
    },
    fetch: async (url, init) => {
      const provider = String(url).includes("deepgram") ? "deepgram" : "openai";
      requests.push({ url: String(url), options: init! });
      if (options.throwFetch) throw new Error(SECRET);
      if (options.fail === provider) return new Response(SECRET, { status: 401 });
      if (options.bodyStalls === provider) {
        return { ok: true, json: () => new Promise(() => {}) } as unknown as Response;
      }
      if (options.malformed === provider) return new Response("not-json");
      if (provider === "deepgram" && options.expiresIn === Infinity) {
        return new Response(`{"access_token":"${SECRET}","expires_in":1e999}`);
      }
      return Response.json(provider === "deepgram"
        ? { access_token: SECRET, ...(options.omitExpiry ? {} : { expires_in: "expiresIn" in options ? options.expiresIn : 60 }) }
        : { object: "list", data: [{ id: SECRET }] });
    },
  };
  return {
    handler: createHealthHandler(deps), deps, time, requests, sqlResult,
    clients: () => clients, closes: () => closes, open: () => open,
  };
}
async function report(response: Response) {
  const text = await response.text();
  assert.ok(!text.includes(SECRET), "não expor chave/token/lista/erro externo");
  assert.ok(!text.includes(CONFIG.DATABASE_URL), "não expor conexão SQL");
  assert.equal(response.headers.get("cache-control"), "no-store");
  return JSON.parse(text) as {
    ok: boolean; service: string; ts: string; checks: Record<Provider, { ok: boolean; code?: string }>;
  };
}

const tests: Array<[string, () => Promise<void>]> = [
  ["200 apenas com três checks saudáveis e cleanup SQL", async () => {
    const s = setup();
    const response = await s.handler();
    assert.equal(response.status, 200);
    const body = await report(response);
    assert.equal(body.ok, true);
    assert.equal(body.service, "laudousg-api");
    assert.ok(Number.isFinite(Date.parse(body.ts)));
    assert.deepEqual(body.checks, { supabase: { ok: true }, deepgram: { ok: true }, openai: { ok: true } });
    assert.equal(s.closes(), 1);
    assert.equal(s.open(), false);
    assert.equal(s.time.pending(), 0);
    assert.equal(s.requests.length, 2);
    const dg = s.requests.find((r) => r.url.includes("deepgram"))!;
    const oa = s.requests.find((r) => r.url.includes("openai"))!;
    assert.equal(dg.url, "https://api.deepgram.com/v1/auth/grant");
    assert.equal(dg.options.method, "POST");
    assert.deepEqual(JSON.parse(String(dg.options.body)), { ttl_seconds: 60 });
    assert.equal(oa.url, "https://api.openai.com/v1/models");
    assert.equal(oa.options.method, "GET");
    for (const r of s.requests) {
      assert.equal(r.options.cache, "no-store");
      assert.equal(r.options.redirect, "error");
      assert.ok(r.options.signal);
    }
  }],
  ...(["supabase", "deepgram", "openai"] as const).map((provider): [string, () => Promise<void>] => [
    `503 em falha isolada de ${provider}, preservando demais checks`, async () => {
      const s = setup({ fail: provider });
      const response = await s.handler();
      assert.equal(response.status, 503);
      const body = await report(response);
      assert.equal(body.ok, false);
      for (const name of ["supabase", "deepgram", "openai"] as const) {
        assert.equal(body.checks[name].ok, name !== provider);
      }
      assert.equal(body.checks[provider].code, "unavailable");
      assert.equal(s.closes(), 1);
      assert.equal(s.time.pending(), 0);
    },
  ]),
  ...(["deepgram", "openai"] as const).flatMap((provider): Array<[string, () => Promise<void>]> => [
    [`${provider}: deadline inclui corpo pendurado`, async () => {
      const s = setup({ bodyStalls: provider });
      let settled = false;
      const pending = s.handler().then((r) => { settled = true; return r; });
      await flush();
      s.time.advance(HEALTH_TIMEOUT_MS - 1);
      await flush();
      assert.equal(settled, false);
      s.time.advance(1);
      const response = await pending;
      assert.equal(response.status, 503);
      const body = await report(response);
      assert.equal(body.checks[provider].code, "timeout");
      assert.equal(s.requests.find((r) => r.url.includes(provider))!.options.signal!.aborted, true);
      assert.equal(s.time.pending(), 0);
    }],
    [`${provider}: JSON inválido não vira sucesso`, async () => {
      const s = setup({ malformed: provider });
      const response = await s.handler();
      assert.equal(response.status, 503);
      assert.equal((await report(response)).checks[provider].code, "invalid_response");
    }],
  ]),
  ["SQL pendurado fecha cliente próprio no deadline", async () => {
    const s = setup({ sqlStalls: true });
    const pending = s.handler();
    await flush();
    assert.equal(s.open(), true);
    s.time.advance(HEALTH_TIMEOUT_MS);
    const response = await pending;
    assert.equal(response.status, 503);
    assert.equal((await report(response)).checks.supabase.code, "timeout");
    await flush();
    assert.equal(s.closes(), 1);
    assert.equal(s.open(), false);
    assert.equal(s.time.pending(), 0);
  }],
  ["concorrência coalescida sem cache de resultado", async () => {
    const s = setup({ sqlStalls: true });
    const pending = Array.from({ length: 8 }, () => s.handler());
    await flush();
    assert.equal(s.clients(), 1);
    assert.equal(s.requests.length, 2);
    s.sqlResult.resolve([{ ok: 1 }]);
    for (const response of await Promise.all(pending)) assert.equal(response.status, 200);
    assert.equal(s.closes(), 1);
    assert.equal((await s.handler()).status, 200);
    assert.equal(s.clients(), 2);
    assert.equal(s.requests.length, 4);
    assert.equal(s.closes(), 2);
  }],
  ...(["DATABASE_URL", "DEEPGRAM_API_KEY", "OPENAI_API_KEY"] as const).map((key): [string, () => Promise<void>] => [
    `${key} ausente fica explícito sem impedir demais checks`, async () => {
      const s = setup({ missing: key });
      const response = await s.handler();
      assert.equal(response.status, 503);
      const body = await report(response);
      const provider = key === "DATABASE_URL" ? "supabase" : key === "DEEPGRAM_API_KEY" ? "deepgram" : "openai";
      assert.equal(body.checks[provider].code, "misconfigured");
      assert.equal(Object.values(body.checks).filter((c) => c.ok).length, 2);
      assert.equal(s.clients(), key === "DATABASE_URL" ? 0 : 1);
      assert.equal(s.requests.length, key === "DATABASE_URL" ? 2 : 1);
    },
  ]),
  ["erros de fetch e cleanup não vazam nem escapam como 500", async () => {
    const s = setup({ throwFetch: true, closeFails: true });
    const response = await s.handler();
    assert.equal(response.status, 503);
    assert.ok(Object.values((await report(response)).checks).every((c) => c.code === "unavailable"));
    assert.equal(s.closes(), 1);
  }],
  ["Deepgram aceita access_token válido sem expires_in opcional", async () => {
    const response = await setup({ omitExpiry: true }).handler();
    assert.equal(response.status, 200);
    assert.equal((await report(response)).checks.deepgram.ok, true);
  }],
  ...[0, -1, "60", null, Infinity].map((expiresIn): [string, () => Promise<void>] => [
    `Deepgram rejeita expires_in inválido (${String(expiresIn)})`, async () => {
      const response = await setup({ expiresIn }).handler();
      assert.equal(response.status, 503);
      assert.equal((await report(response)).checks.deepgram.code, "invalid_response");
    },
  ]),
];

async function main() {
  for (const [name, test] of tests) {
    await test();
    console.log(`✓ ${name}`);
  }
  console.log(`\n${tests.length} casos passaram; apenas dependências simuladas.`);
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
