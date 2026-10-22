import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createHash, generateKeyPairSync } from "node:crypto";
import { gzipSync } from "node:zlib";
import { PGlite } from "@electric-sql/pglite";
import {
  executarApple,
  PEDIDO_ANALYTICS,
  type RepositorioApple,
  type LoteApple,
  type LogApple,
} from "../src/lib/asc/diario-job";
import {
  parseSales,
  parseAnalytics,
  RELATORIOS,
  type RegistroApple,
} from "../src/lib/asc/diario-parser";
import { criarCronApple } from "../src/lib/asc/diario-servidor";
import { transporteApple, type TransporteApple } from "../src/lib/asc/diario-http";
import {
  montarDiaria,
  valorSerie,
  type FonteDiaria,
} from "../src/lib/data/fonte-diaria";
const fixture = (s: string) =>
  readFileSync(new URL(`./fixtures/apple/${s}.tsv`, import.meta.url), "utf8");
const sales = parseSales("SALES", fixture("sales"), "2026-10-21", "6770609540");
test("schemas oficiais: SALES 1_0, SUBSCRIPTION/EVENT 1_3; cada parser lê arquivo sintético", () => {
  assert.deepEqual(RELATORIOS, {
    SALES: "1_0",
    SUBSCRIPTION: "1_3",
    SUBSCRIPTION_EVENT: "1_3",
  });
  assert.equal(sales.length, 2);
  assert.equal(sales[0]!.units, 5);
  assert.equal(
    parseSales(
      "SUBSCRIPTION",
      fixture("subscription"),
      "2026-10-21",
      "6770609540",
    )[0]!.paid,
    6,
  );
  assert.equal(
    parseSales(
      "SUBSCRIPTION_EVENT",
      fixture("subscription-event"),
      "2026-10-21",
      "6770609540",
    )[0]!.quantity,
    2,
  );
  for (const [file, report, count] of [
    ["downloads", "App Store Downloads Standard", 5],
    ["discovery", "App Store Discovery and Engagement Standard", 10],
    ["sessions", "App Sessions Standard", 8],
    ["crashes", "App Crashes", 2],
  ] as const) {
    const r = parseAnalytics(report, [fixture(file)], "6770609540");
    assert.equal(r[0]!.counts, count);
    assert.ok(!JSON.stringify(r).includes("DO NOT SAVE"));
  }
  assert.throws(() =>
    parseSales("SALES", "Wrong\tHeader\n1\t2", "2026-10-21", "6770609540"),
  );
  assert.throws(() =>
    parseAnalytics(
      "App Sessions Detailed",
      [fixture("sessions")],
      "6770609540",
    ),
  );
  assert.equal(
    parseAnalytics(
      "App Store Downloads Standard",
      [fixture("downloads"), fixture("downloads")],
      "6770609540",
    )[0]!.counts,
    10,
  );
});
test("cron sem segredo/configuração nunca autentica, só Bearer exato; sem cookie/sessão", async () => {
  let calls = 0;
  const executar = async () => {
    calls++;
    return { ok: 1 };
  };
  for (const env of [{}, { CRON_SECRET: "secret" }]) {
    const handler = criarCronApple({ env, executar });
    for (const auth of [undefined, "Bearer wrong", "bearer secret"])
      assert.equal(
        (
          await handler(
            new Request("https://admin/admin/api/cron/apple", {
              headers: auth ? { Authorization: auth } : { cookie: "SESSION" },
            }),
          )
        ).status,
        404,
      );
  }
  assert.equal(calls, 0);
  assert.equal(
    (
      await criarCronApple({ env: { CRON_SECRET: "secret" }, executar })(
        new Request("https://admin/admin/api/cron/apple", {
          headers: { Authorization: "Bearer secret" },
        }),
      )
    ).status,
    200,
  );
  assert.equal(calls, 1);
});
async function banco() {
  const db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls;",
  );
  for (const file of [
    "20261022173915_admin_landing_daily.sql",
    "20261022173940_admin_apple_daily.sql",
  ])
    await db.exec(
      readFileSync(
        new URL(`../../../supabase/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
  return db;
}
async function salvar(db: PGlite, l: LoteApple) {
  await db.query(
    "select public.apple_store_batch($1,$2,$3,$4,$5::jsonb,$6,$7)",
    [
      l.source,
      l.report_key,
      l.day,
      l.status,
      JSON.stringify(l.rows),
      l.report_name ?? "",
      l.error_code ?? null,
    ],
  );
}
test("SQL real local: grants, RLS sem policies, incremento atômico e restatement Analytics", async () => {
  const db = await banco();
  try {
    const perms = await db.query<{
      relname: string;
      relrowsecurity: boolean;
      anon: boolean;
      authenticated: boolean;
    }>(
      "select c.relname,c.relrowsecurity,has_table_privilege('anon',c.oid,'SELECT') anon,has_table_privilege('authenticated',c.oid,'SELECT') authenticated from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'",
    );
    assert.equal(perms.rows.length, 6);
    for (const p of perms.rows) {
      assert.equal(p.relrowsecurity, true);
      assert.equal(p.anon, false);
      assert.equal(p.authenticated, false);
    }
    assert.equal(
      (await db.query("select * from pg_policies where schemaname='public'"))
        .rows.length,
      0,
    );
    assert.equal(
      (
        await db.query<{ v: boolean }>(
          "select has_function_privilege('authenticated','public.landing_increment(date,text,text,text,text,text,text,text)','EXECUTE') v",
        )
      ).rows[0]!.v,
      false,
    );
    await db.exec("set role service_role");
    await db.exec(
      "select public.landing_increment('2026-10-21','/','view','','','','','iphone'); select public.landing_increment('2026-10-21','/','view','','','','','iphone');",
    );
    assert.equal(
      Number(
        (
          await db.query<{ count: string }>(
            "select count from public.landing_daily",
          )
        ).rows[0]!.count,
      ),
      2,
    );
    const analytics = parseAnalytics(
      "App Store Downloads Standard",
      [fixture("downloads")],
      "6770609540",
    );
    const lote: LoteApple = {
      source: "analytics",
      report_key: "instance1",
      day: "2026-10-22",
      status: "ok",
      rows: [...analytics, ...analytics.map(r => ({...r,country:"PRT",counts:3}))],
      report_name: "App Store Downloads Standard",
    };
    await salvar(db, lote);
    await salvar(db, lote);
    await salvar(db, {
      ...lote,
      report_key: "instance2",
      day: "2026-10-23",
      rows: analytics.map((r) => ({ ...r, counts: 7 })),
    });
    await salvar(db, lote); // older late worker cannot replace the newer complete partition
    assert.equal(
      Number(
        (
          await db.query<{ n: string }>(
            "select sum(counts) n from public.apple_analytics_daily",
          )
        ).rows[0]!.n,
      ),
      7,
    );
    assert.equal(
      (await db.query("select * from public.apple_analytics_daily")).rows
        .length,
      1,
    );
    await salvar(db, {
      ...lote,
      status: "error",
      rows: [],
      error_code: "fetch_failed",
    });
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from public.apple_fetch_log where report_key='instance1'",
        )
      ).rows[0]!.status,
      "ok",
    );
  } finally {
    await db.close();
  }
});
test("cron duas vezes: SQL local não duplica; 404 pendente é repetido sem fabricar zeros", async () => {
  const db = await banco();
  let salesCalls = 0,
    segmentCalls = 0;
  const repo: RepositorioApple = {
    logs: async () =>
      (
        await db.query<LogApple>(
          "select source,report_key,day::text,status,fetched_at::text from public.apple_fetch_log",
        )
      ).rows,
    salvar: (l) => salvar(db, l),
  };
  const transporte: TransporteApple = {
    lista: async (path) =>
      path.includes("/reports?")
        ? [
            {
              id: "report1",
              attributes: { name: "App Store Downloads Standard" },
            },
            {
              id: "detailed",
              attributes: { name: "App Store Downloads Detailed" },
            },
          ]
        : path.includes("/instances?")
          ? [
              {
                id: "instance1",
                attributes: {
                  granularity: "DAILY",
                  processingDate: "2026-10-22",
                },
              },
            ]
          : [
              { id: "s1", attributes: {} },
              { id: "s2", attributes: {} },
            ],
    segmento: async () => {
      segmentCalls++;
      return fixture("downloads");
    },
    sales: async (q) => {
      salesCalls++;
      assert.equal(
        q.get("filter[version]"),
        q.get("filter[reportType]") === "SALES" ? "1_0" : "1_3",
      );
      return q.get("filter[reportType]") === "SALES"
        ? { status: 200, tsv: fixture("sales") }
        : { status: 404 };
    },
  };
  const op = {
    transporte,
    repo,
    appId: "6770609540",
    vendor: "94347559",
    requestId: PEDIDO_ANALYTICS,
    agora: new Date("2026-10-22T12:00:00Z"),
    deadline: Date.now() + 50_000,
  };
  try {
    assert.deepEqual(await executarApple(op), {
      ok: 2,
      pending: 2,
      errors: 0,
      budget_exhausted: false,
    });
    assert.deepEqual(await executarApple(op), {
      ok: 0,
      pending: 2,
      errors: 0,
      budget_exhausted: false,
    });
    assert.equal(salesCalls, 5);
    assert.equal(segmentCalls, 2);
    assert.equal(
      Number(
        (
          await db.query<{ n: string }>(
            "select sum(units) n from public.apple_sales_daily",
          )
        ).rows[0]!.n,
      ),
      7,
    );
    assert.equal(
      Number(
        (
          await db.query<{ n: string }>(
            "select sum(counts) n from public.apple_analytics_daily",
          )
        ).rows[0]!.n,
      ),
      10,
    );
    assert.equal(
      (await db.query("select * from public.apple_subscription_daily")).rows
        .length,
      0,
    );
  } finally {
    await db.close();
  }
});
test("segmento faltante não grava lote parcial; orçamento interrompe trabalho", async () => {
  const lotes: LoteApple[] = [];
  let segments = 0;
  const transporte: TransporteApple = {
    lista: async (p) =>
      p.includes("/reports?")
        ? [{ id: "r", attributes: { name: "App Sessions Standard" } }]
        : p.includes("/instances?")
          ? [
              {
                id: "i",
                attributes: {
                  granularity: "DAILY",
                  processingDate: "2026-10-22",
                },
              },
            ]
          : [
              { id: "a", attributes: {} },
              { id: "b", attributes: {} },
            ],
    segmento: async () => {
      if (++segments === 2) throw new Error("signed URL private");
      return fixture("sessions");
    },
    sales: async () => ({ status: 404 }),
  };
  const repo = {
    logs: async () => [],
    salvar: async (l: LoteApple) => {
      lotes.push(l);
    },
  };
  await executarApple({
    transporte,
    repo,
    appId: "6770609540",
    vendor: "1",
    requestId: "request",
    agora: new Date("2026-10-22"),
    deadline: Date.now() + 50_000,
  });
  assert.equal(lotes[0]!.status, "error");
  assert.deepEqual(lotes[0]!.rows, []);
  assert.ok(!JSON.stringify(lotes).includes("signed URL private"));
  lotes.length = 0;
  const result = await executarApple({
    transporte,
    repo,
    appId: "6770609540",
    vendor: "1",
    requestId: "request",
    agora: new Date("2026-10-22"),
    deadline: 0,
  });
  assert.equal(result.budget_exhausted, true);
  assert.equal(lotes.length, 0);
});
test("painel: vazio mantém exemplo; dia pendente é —; Analytics não usa denominador Sales", () => {
  const f: FonteDiaria = {
    landing: [],
    sales: [],
    subscriptions: [],
    events: [],
    analytics: [],
    logs: [],
  };
  assert.deepEqual(montarDiaria(f, ["2026-10-21", "2026-10-22"]), {
    aquisicao: {},
    assinaturas: {},
  });
  f.sales = sales;
  f.logs = [
    {
      source: "sales",
      report_key: "SALES",
      day: "2026-10-21",
      status: "ok",
      fetched_at: "",
    },
  ];
  f.analytics = parseAnalytics(
    "App Store Downloads Standard",
    [fixture("downloads")],
    "6770609540",
  );
  const { aquisicao: a } = montarDiaria(f, ["2026-10-21", "2026-10-22"]);
  assert.equal(valorSerie(a.instalacoes!.v, "today"), null);
  assert.equal(valorSerie(a.instalacoes!.v, "d7"), 5);
  assert.equal(a.apple_dias!.v[1]!.primeiras, null);
  assert.deepEqual(a.apple_origens!.v, [["App Store search", 5]]);
});

test("HTTP Apple: paginação, gzip/MD5 e URL assinada sem JWT; rejeita host externo e tamanho excessivo", async () => {
  const {privateKey} = generateKeyPairSync("ec",{namedCurve:"P-256"});
  const cred = {keyId:"synthetic",issuerId:"synthetic",chave:privateKey};
  const bytes = gzipSync(fixture("downloads"));
  const calls:{url:string;auth:boolean}[]=[];
  const http:typeof fetch = async (input, options) => {
    const url=String(input); const headers=new Headers(options?.headers);
    calls.push({url,auth:headers.has("authorization")});
    assert.equal(options?.method,"GET"); assert.equal(options?.redirect,"error");
    if (url.includes("amazonaws.com")) return new Response(bytes);
    return Response.json({data:[{id:url.includes("page=2")?"b":"a",attributes:{}}],links:{next:url.includes("page=2")?null:"https://api.appstoreconnect.apple.com/v1/example?page=2"}});
  };
  const transport=transporteApple(cred,Date.now()+50_000,http);
  assert.deepEqual((await transport.lista("/v1/example")).map(i=>i.id),["a","b"]);
  assert.equal(await transport.segmento({id:"s",attributes:{url:"https://example.s3.amazonaws.com/segment.gz?signature=synthetic",sizeInBytes:bytes.length,checksum:createHash("md5").update(bytes).digest("hex")}}),fixture("downloads"));
  assert.deepEqual(calls.map(c=>c.auth),[true,true,false]);
  await assert.rejects(()=>transport.segmento({id:"s",attributes:{url:"https://attacker.example/x.gz"}}),/invalid_segment_url/);
  await assert.rejects(()=>transport.segmento({id:"s",attributes:{url:"https://example.s3.amazonaws.com/x.gz",checksum:"0".repeat(32)}}),/segment_checksum/);
  const overflow=transporteApple(cred,Date.now()+50_000,async()=>new Response("",{headers:{"content-length":String(21*1024*1024)}}));
  await assert.rejects(()=>overflow.sales(new URLSearchParams()),/report_too_large/);
  const unsafe=transporteApple(cred,Date.now()+50_000,async()=>Response.json({data:[],links:{next:"https://attacker.example/v1/leak"}}));
  await assert.rejects(()=>unsafe.lista("/v1/example"),/invalid_pagination/);
});

test("dia omitido em Analytics deixa o período indisponível, não soma zero implícito", () => {
  const f:FonteDiaria = {landing:[],sales:[],subscriptions:[],events:[],logs:[],analytics:parseAnalytics("App Store Discovery and Engagement Standard",[fixture("discovery")],"6770609540")};
  const a=montarDiaria(f,["2026-10-21","2026-10-22","2026-10-23"]).aquisicao;
  assert.equal(valorSerie(a.visitas_pagina_loja!.v,"today"),null);
  assert.equal(valorSerie(a.visitas_pagina_loja!.v,"d7"),null);
  assert.equal(valorSerie(a.visitas_pagina_loja!.v,"d30"),null);
});
